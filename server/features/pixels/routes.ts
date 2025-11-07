import type { Express } from "express";
import { pixelStorage } from "./storage";
import { userStorage } from "../users/storage";
import { transactionStorage } from "../transactions/storage";
import { broadcast } from "../shared/websocket";
import { calculateInfluence, getContrastingTextColor } from "../shared/utils";
import { getManhattanDistance, calculateTierFromDistance, getTierColor } from "@shared/canvas-utils";
import { DOB_COLORS, type TextColor } from "@shared/schema";
import { generatePixelDNA, createPixelDOBContent } from "@shared/dob-metadata";
import { log } from "../../vite";
import { randomUUID } from "crypto";
import { checkAndUnlockAchievements } from "../shared/achievements";
import { db } from "../../db";

export function registerPixelRoutes(app: Express) {
  // Get all pixels
  app.get("/api/pixels", async (req, res) => {
    try {
      const pixels = await pixelStorage.getAllPixels();
      res.json(pixels);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pixels" });
    }
  });

  // Get pixel transaction history (must come before /:x/:y route)
  app.get("/api/pixels/:pixelId/transactions", async (req, res) => {
    try {
      const { pixelId } = req.params;
      
      const pixel = await pixelStorage.getPixelById(pixelId);
      if (!pixel) {
        return res.status(404).json({ error: "Pixel not found" });
      }

      const transactions = await transactionStorage.getPixelTransactions(pixelId);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pixel transactions" });
    }
  });

  // Get pixel by coordinates
  app.get("/api/pixels/:x/:y", async (req, res) => {
    try {
      const x = parseInt(req.params.x);
      const y = parseInt(req.params.y);
      
      if (x < 0 || x >= 50 || y < 0 || y >= 50) {
        return res.status(400).json({ error: "Invalid coordinates" });
      }
      
      const pixel = await pixelStorage.getPixel(x, y);
      if (!pixel) {
        return res.status(404).json({ error: "Pixel not found" });
      }
      
      res.json(pixel);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pixel" });
    }
  });

  // Prepare claim: validate and generate DNA with real mint numbers
  app.post("/api/pixels/prepare-claim", async (req, res) => {
    try {
      const { x, y, userAddress } = req.body;
      
      // Validate coordinates
      if (x < 0 || x >= 50 || y < 0 || y >= 50) {
        return res.status(400).json({ error: "Invalid coordinates" });
      }
      
      // Validate required fields
      if (!userAddress) {
        return res.status(400).json({ error: "Wallet address is required" });
      }
      
      // Calculate tier-based color
      const distance = getManhattanDistance(x, y);
      const tier = calculateTierFromDistance(distance);
      const tierBasedColor = getTierColor(tier);
      
      // Validate the tier color is in DOB_COLORS
      if (!(DOB_COLORS as readonly string[]).includes(tierBasedColor)) {
        return res.status(500).json({ error: "Invalid tier color mapping" });
      }
      
      // Get or create user
      let user = await userStorage.getUserByAddress(userAddress);
      if (!user) {
        user = await userStorage.createUser({ address: userAddress, influence: 0, totalCkb: 0, pixelCount: 0 });
      }
      
      // Check if pixel is available
      const existingPixel = await pixelStorage.getPixel(x, y);
      if (!existingPixel) {
        return res.status(404).json({ error: "Pixel not found" });
      }
      
      if (existingPixel.claimed) {
        return res.status(400).json({ error: "Pixel already claimed" });
      }
      
      // Enforce 1-pixel-per-wallet restriction BEFORE reserving
      const hasAlreadyMinted = await pixelStorage.hasUserMintedAnyPixel(user.id);
      log(`[MINT CHECK] User ${userAddress.slice(0,10)}...${userAddress.slice(-6)} hasAlreadyMinted: ${hasAlreadyMinted}`);
      
      if (hasAlreadyMinted) {
        const mintedPixel = await pixelStorage.getUserMintedPixel(user.id);
        
        log(`[MINT CHECK] Blocking mint - user has claimed pixel at (${mintedPixel?.x}, ${mintedPixel?.y})`);
        
        return res.status(403).json({ 
          error: `You've already minted a pixel. Each wallet can only mint ONE pixel to ensure maximum decentralization (2,500 unique founders). You must melt your existing pixel to mint a different one, or you can acquire additional pixels through transfers.`,
          alreadyMinted: mintedPixel ? {
            x: mintedPixel.x,
            y: mintedPixel.y,
            tier: mintedPixel.tier,
            id: mintedPixel.id,
            claimed: mintedPixel.claimed,
            sporeId: mintedPixel.sporeId
          } : undefined
        });
      }
      
      log(`[MINT CHECK] User ${userAddress.slice(0,10)}...${userAddress.slice(-6)} eligible to mint - no claimed pixels found`);

      
      // Get contrasting text color for tier-based bgcolor
      const textColor = getContrastingTextColor(tierBasedColor as typeof DOB_COLORS[number]) as TextColor;
      
      // Atomically reserve pixel and get mint numbers
      // This prevents race conditions by locking the pixel row and incrementing counters in a single transaction
      // If same user re-prepares (e.g., wallet failed), existing reservation numbers are returned
      let tierMintNumber: number;
      let globalMintNumber: number;
      let wasReserved: boolean;
      
      try {
        const reservation = await pixelStorage.atomicReservePixel(existingPixel.id, user.id, tier);
        tierMintNumber = reservation.tierMintNumber;
        globalMintNumber = reservation.globalMintNumber;
        wasReserved = reservation.wasReserved;
        
        if (wasReserved) {
          log(`Pixel (${x},${y}) already reserved by ${userAddress}, reusing Tier #${tierMintNumber}, Global #${globalMintNumber}`);
        } else {
          log(`Pixel (${x},${y}) newly reserved by ${userAddress} with Tier #${tierMintNumber}, Global #${globalMintNumber}`);
        }
      } catch (error: any) {
        if (error.message === 'Pixel is currently reserved by another user') {
          return res.status(409).json({ 
            error: "Pixel is currently reserved by another user. Please try again in a few minutes." 
          });
        }
        throw error;
      }
      
      // Generate DOB/0 DNA for pixel NFT
      const pixelDNA = generatePixelDNA(
        tierBasedColor as typeof DOB_COLORS[number],
        textColor,
        tier,
        x,
        y,
        existingPixel.price,
        tierMintNumber,
        globalMintNumber
      );
      
      log(`Prepared claim for pixel (${x},${y}): DNA=${pixelDNA} [Tier #${tierMintNumber}, Global #${globalMintNumber}]`);
      
      // Create DOB/0 content for Spore NFT
      const dobContent = createPixelDOBContent(
        tierBasedColor as typeof DOB_COLORS[number],
        textColor,
        tier,
        x,
        y,
        existingPixel.price,
        tierMintNumber,
        globalMintNumber
      );
      
      // Return DNA to frontend for blockchain minting
      res.json({
        success: true,
        dna: dobContent.dna,
        dobContent,
        pixelData: {
          x,
          y,
          tier,
          price: existingPixel.price,
          bgcolor: tierBasedColor,
          textColor,
          tierMintNumber,
          globalMintNumber,
        }
      });
    } catch (error: any) {
      log(`Failed to prepare claim: ${error.message}`);
      res.status(500).json({ error: error.message || "Failed to prepare claim" });
    }
  });

  // Finalize claim: save pixel after successful blockchain mint
  app.post("/api/pixels/finalize-claim", async (req, res) => {
    try {
      const { x, y, userAddress, txHash, sporeId, tierMintNumber, globalMintNumber, referralCode } = req.body;
      
      // Validate required fields
      if (!userAddress || !txHash || !sporeId) {
        return res.status(400).json({ 
          error: "Required fields missing: userAddress, txHash, sporeId" 
        });
      }
      
      // Security Fix M-04: Check length before regex to prevent ReDoS
      // Validate transaction hash format (must be exactly 66 characters: 0x + 64 hex)
      if (txHash.length !== 66 || !txHash.match(/^0x[0-9a-fA-F]{64}$/)) {
        return res.status(400).json({ 
          error: "Invalid transaction hash format. Expected 0x followed by 64 hex characters" 
        });
      }
      
      // Validate spore ID format (max 200 characters)
      if (sporeId.length > 200 || !sporeId.match(/^0x[0-9a-fA-F]+$/)) {
        return res.status(400).json({ 
          error: "Invalid Spore ID format. Expected 0x followed by hex characters" 
        });
      }
      
      // Get user
      const user = await userStorage.getUserByAddress(userAddress);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Get pixel
      const existingPixel = await pixelStorage.getPixel(x, y);
      if (!existingPixel) {
        return res.status(404).json({ error: "Pixel not found" });
      }
      
      if (existingPixel.claimed) {
        return res.status(400).json({ error: "Pixel already claimed" });
      }
      
      // Verify the reservation exists and matches
      if (!existingPixel.reservedByUserId || !existingPixel.reservedAt) {
        return res.status(400).json({ 
          error: "No reservation found for this pixel. Please call prepare-claim first." 
        });
      }
      
      // Verify reservation is for the same user
      if (existingPixel.reservedByUserId !== user.id) {
        return res.status(403).json({ 
          error: "This pixel is reserved by a different user." 
        });
      }
      
      // Verify reservation hasn't expired (5 minutes TTL)
      const RESERVATION_TTL_MS = 5 * 60 * 1000;
      const reservationAge = Date.now() - existingPixel.reservedAt.getTime();
      if (reservationAge > RESERVATION_TTL_MS) {
        return res.status(410).json({ 
          error: "Reservation has expired. Please call prepare-claim again." 
        });
      }
      
      // CRITICAL: Verify mint numbers match the reservation
      // This prevents client tampering with mint numbers
      if (tierMintNumber !== existingPixel.reservedTierMintNumber || 
          globalMintNumber !== existingPixel.reservedGlobalMintNumber) {
        log(`ERROR: Mint number mismatch! Client sent (Tier #${tierMintNumber}, Global #${globalMintNumber}) but reservation has (Tier #${existingPixel.reservedTierMintNumber}, Global #${existingPixel.reservedGlobalMintNumber})`);
        return res.status(400).json({ 
          error: "Mint numbers do not match reservation. Possible tampering detected." 
        });
      }
      
      // Calculate tier-based color
      const distance = getManhattanDistance(x, y);
      const tier = calculateTierFromDistance(distance);
      const tierBasedColor = getTierColor(tier);
      const textColor = getContrastingTextColor(tierBasedColor as typeof DOB_COLORS[number]) as TextColor;
      
      log(`Finalizing claim for pixel (${x},${y}): Spore ID=${sporeId}, Tier #${tierMintNumber}, Global #${globalMintNumber}`);
      
      // Update pixel with blockchain data and clear reservation
      const now = new Date();
      const updatedPixel = await pixelStorage.updatePixel(existingPixel.id, {
        claimed: true,
        bgcolor: tierBasedColor,
        textColor,
        ownerId: user.id,
        minterId: user.id,
        ownerSince: now,
        sporeId,
        sporeTxHash: txHash,
        mintedAt: now,
        claimedAt: now,
        tierMintNumber,
        globalMintNumber,
        // Clear reservation fields
        reservedByUserId: null,
        reservedAt: null,
        reservedTierMintNumber: null,
        reservedGlobalMintNumber: null,
      });
      
      // Create transaction record
      await transactionStorage.createTransaction({
        pixelId: existingPixel.id,
        toUserId: user.id,
        type: 'mint',
        amount: existingPixel.price,
        txHash,
      });
      
      // Update user stats
      const userPixels = await pixelStorage.getUserPixels(user.id);
      const allPixels = await pixelStorage.getAllPixels();
      const newInfluence = calculateInfluence(userPixels, allPixels);
      const totalCkb = userPixels.reduce((sum, pixel) => sum + pixel.price, 0);
      const pixelCount = userPixels.length;
      
      await userStorage.updateUserStats(user.id, {
        influence: newInfluence,
        totalCkb,
        pixelCount
      });
      
      // Update founder status (user is now a founder after minting their first pixel)
      await userStorage.updateFounderStatus(user.id);
      
      // Check and unlock achievements
      const newAchievements = await checkAndUnlockAchievements(user.id);
      if (newAchievements.length > 0) {
        log(`User ${userAddress} unlocked achievements: ${newAchievements.join(', ')}`);
      }
      
      // Get updated user for response
      const updatedUser = await userStorage.getUser(user.id);
      
      // Handle referral code if provided
      let referralStatus: 'success' | 'invalid_code' | 'self_referral' | 'referrer_not_founder' | 'error' | null = null;
      let referralMessage: string | null = null;
      
      if (referralCode) {
        try {
          const referrer = await userStorage.getUserByReferralCode(referralCode);
          
          if (!referrer) {
            referralStatus = 'invalid_code';
            referralMessage = 'Invalid referral code';
            log(`Referral failed: invalid code ${referralCode}`);
          } else if (referrer.id === user.id) {
            referralStatus = 'self_referral';
            referralMessage = 'Cannot use your own referral code';
            log(`Referral failed: user tried to use their own code`);
          } else {
            // Ensure referrer has minted a pixel (only founders can refer)
            const referrerPixels = await pixelStorage.getUserPixels(referrer.id);
            const referrerHasMintedPixel = referrerPixels.some(p => p.minterId === referrer.id && p.claimed);
            
            if (!referrerHasMintedPixel) {
              referralStatus = 'referrer_not_founder';
              referralMessage = 'Referrer must be a founder (have minted a pixel)';
              log(`Referral failed: referrer ${referrer.id} is not a founder`);
            } else {
              // Create referral record
              const { referrals } = await import("@shared/schema");
              await db.insert(referrals).values({
                referrerId: referrer.id,
                refereeId: user.id,
              });
              
              // Apply boost: +20 points (0.2x) per referral, max 100 points (1.0x)
              await userStorage.applyReferralBoost(referrer.id, 20);
              
              referralStatus = 'success';
              referralMessage = 'Referral code applied! Your referrer received a governance boost.';
              log(`Referral successful: ${user.id} referred by ${referrer.id} (code: ${referralCode})`);
            }
          }
        } catch (referralError: any) {
          // Log referral errors but don't fail the claim
          referralStatus = 'error';
          referralMessage = 'Error processing referral code';
          log(`Referral error: ${referralError.message}`);
        }
      }
      
      // Broadcast update to all connected clients
      broadcast({
        type: 'pixelClaimed',
        pixel: updatedPixel,
        user: updatedUser
      });
      
      log(`Pixel (${x},${y}) claimed by ${userAddress} - Spore NFT: ${sporeId}`);
      
      res.json({ 
        success: true,
        pixel: updatedPixel, 
        user: updatedUser,
        referral: referralStatus ? { status: referralStatus, message: referralMessage } : undefined,
      });
    } catch (error: any) {
      // Handle database constraint violation for 1-pixel-per-wallet
      if (error.code === '23505' && error.constraint === 'one_pixel_per_wallet_mint_idx') {
        return res.status(403).json({ 
          error: `You've already minted a pixel. Each wallet can only mint ONE pixel to ensure maximum decentralization (2,500 unique founders). You can still acquire additional pixels through transfers.`
        });
      }
      
      log(`Failed to finalize claim: ${error.message}`);
      res.status(500).json({ error: error.message || "Failed to finalize claim" });
    }
  });

  // Claim pixel (mint Spore NFT) - DEPRECATED, kept for backward compatibility
  app.post("/api/pixels/claim", async (req, res) => {
    try {
      const { x, y, userAddress, txHash, sporeId } = req.body;
      
      // Validate coordinates
      if (x < 0 || x >= 50 || y < 0 || y >= 50) {
        return res.status(400).json({ error: "Invalid coordinates" });
      }
      
      // Validate required fields
      if (!userAddress) {
        return res.status(400).json({ error: "Wallet address is required" });
      }
      
      // Require blockchain transaction data
      const allowSimulated = process.env.NODE_ENV === "development";
      
      if (!allowSimulated && (!txHash || !sporeId)) {
        return res.status(400).json({ 
          error: "Blockchain transaction data required: txHash and sporeId must be provided" 
        });
      }
      
      // Security Fix M-04: Check length before regex to prevent ReDoS
      // Validate transaction hash format if provided (must be exactly 66 characters: 0x + 64 hex)
      if (txHash && (txHash.length !== 66 || !txHash.match(/^0x[0-9a-fA-F]{64}$/))) {
        return res.status(400).json({ 
          error: "Invalid transaction hash format. Expected 0x followed by 64 hex characters" 
        });
      }
      
      // Validate spore ID format if provided (max 200 characters)
      if (sporeId && (sporeId.length > 200 || !sporeId.match(/^0x[0-9a-fA-F]+$/))) {
        return res.status(400).json({ 
          error: "Invalid Spore ID format. Expected 0x followed by hex characters" 
        });
      }
      
      // Calculate tier-based color
      const distance = getManhattanDistance(x, y);
      const tier = calculateTierFromDistance(distance);
      const tierBasedColor = getTierColor(tier);
      
      // Validate the tier color is in DOB_COLORS
      if (!(DOB_COLORS as readonly string[]).includes(tierBasedColor)) {
        return res.status(500).json({ error: "Invalid tier color mapping" });
      }
      
      // Get or create user
      let user = await userStorage.getUserByAddress(userAddress);
      if (!user) {
        user = await userStorage.createUser({ address: userAddress, influence: 0, totalCkb: 0, pixelCount: 0 });
      }
      
      // Check if pixel is available
      const existingPixel = await pixelStorage.getPixel(x, y);
      if (!existingPixel) {
        return res.status(404).json({ error: "Pixel not found" });
      }
      
      if (existingPixel.claimed) {
        return res.status(400).json({ error: "Pixel already claimed" });
      }
      
      // Enforce 1-pixel-per-wallet restriction for maximum decentralization
      // This ensures exactly 2,500 unique founders can mint pixels
      // Users must MELT their pixel to free the slot (transferring does NOT free it)
      const hasAlreadyMinted = await pixelStorage.hasUserMintedAnyPixel(user.id);
      if (hasAlreadyMinted) {
        // Get the pixel they minted (by minterId, not ownerId)
        // This works even if they transferred it away
        const mintedPixel = await pixelStorage.getUserMintedPixel(user.id);
        
        return res.status(403).json({ 
          error: `You've already minted a pixel. Each wallet can only mint ONE pixel to ensure maximum decentralization (2,500 unique founders). You must melt your existing pixel to mint a different one, or you can acquire additional pixels through transfers.`,
          alreadyMinted: mintedPixel ? {
            x: mintedPixel.x,
            y: mintedPixel.y,
            tier: mintedPixel.tier,
            id: mintedPixel.id
          } : undefined
        });
      }
      
      // Get contrasting text color for tier-based bgcolor
      const textColor = getContrastingTextColor(tierBasedColor as typeof DOB_COLORS[number]) as TextColor;
      
      // Determine mint numbers using atomic counters
      // Tier mint number: Only assign if this pixel has never been minted before (permanent per coordinate)
      // Global mint number: Always increment (tracks total minting activity)
      let tierMintNumber = existingPixel.tierMintNumber;
      if (!tierMintNumber) {
        tierMintNumber = await pixelStorage.incrementTierMintNumber(tier);
      }
      const globalMintNumber = await pixelStorage.incrementGlobalMintNumber();
      
      // Generate DOB/0 DNA for pixel NFT
      const pixelDNA = generatePixelDNA(
        tierBasedColor as typeof DOB_COLORS[number],
        textColor,
        tier,
        x,
        y,
        existingPixel.price,
        tierMintNumber,
        globalMintNumber
      );
      
      log(`Generated DOB/0 DNA for pixel (${x},${y}): ${pixelDNA} [Tier #${tierMintNumber}, Global #${globalMintNumber}]`);
      
      // Create DOB/0 content for Spore NFT
      const dobContent = createPixelDOBContent(
        tierBasedColor as typeof DOB_COLORS[number],
        textColor,
        tier,
        x,
        y,
        existingPixel.price,
        tierMintNumber,
        globalMintNumber
      );
      
      // Use blockchain transaction data from frontend
      const finalSporeId = sporeId || `0x${randomUUID().replace(/-/g, '')}${randomUUID().replace(/-/g, '')}`.substring(0, 66);
      const finalTxHash = txHash || `0x${randomUUID().replace(/-/g, '')}${randomUUID().replace(/-/g, '')}`.substring(0, 66);
      
      log(`Pixel Spore NFT claimed - ID: ${finalSporeId}, DNA: ${dobContent.dna}`);
      
      // Update pixel with tier-based color and Spore NFT data
      const now = new Date();
      const updatedPixel = await pixelStorage.updatePixel(existingPixel.id, {
        claimed: true,
        bgcolor: tierBasedColor,
        textColor,
        ownerId: user.id,
        minterId: user.id, // Track original minter for governance points
        ownerSince: now, // Track when current owner acquired this pixel (for holder point calculation)
        sporeId: finalSporeId,
        sporeTxHash: finalTxHash,
        mintedAt: now,
        claimedAt: now,
        tierMintNumber, // Permanent tier sequence number
        globalMintNumber, // Incremental mint counter
      });
      
      // Create transaction record (DB unique constraint prevents duplicates)
      await transactionStorage.createTransaction({
        pixelId: existingPixel.id,
        toUserId: user.id,
        type: 'mint',
        amount: existingPixel.price,
        txHash: finalTxHash,
      });
      
      // Update user stats
      const userPixels = await pixelStorage.getUserPixels(user.id);
      const allPixels = await pixelStorage.getAllPixels();
      const newInfluence = calculateInfluence(userPixels, allPixels);
      const totalCkb = userPixels.reduce((sum, pixel) => sum + pixel.price, 0);
      const pixelCount = userPixels.length;
      
      await userStorage.updateUserStats(user.id, {
        influence: newInfluence,
        totalCkb,
        pixelCount
      });
      
      // Update founder status (user is now a founder after minting their first pixel)
      await userStorage.updateFounderStatus(user.id);
      
      // Check and unlock achievements
      const newAchievements = await checkAndUnlockAchievements(user.id);
      if (newAchievements.length > 0) {
        log(`User ${userAddress} unlocked achievements: ${newAchievements.join(', ')}`);
      }
      
      // Get updated user for response
      const updatedUser = await userStorage.getUser(user.id);
      
      // Broadcast update to all connected clients
      broadcast({
        type: 'pixelClaimed',
        pixel: updatedPixel,
        user: updatedUser
      });
      
      log(`Pixel (${x},${y}) claimed by ${userAddress} - Spore NFT: ${finalSporeId}`);
      
      res.json({ 
        pixel: updatedPixel, 
        user: updatedUser,
        sporeData: {
          sporeId: finalSporeId,
          txHash: finalTxHash,
          dna: dobContent.dna,
          contentType: "dob/0"
        }
      });
    } catch (error: any) {
      // Handle database constraint violation for 1-pixel-per-wallet
      if (error.code === '23505' && error.constraint === 'one_pixel_per_wallet_mint_idx') {
        return res.status(403).json({ 
          error: `You've already minted a pixel. Each wallet can only mint ONE pixel to ensure maximum decentralization (2,500 unique founders). You can still acquire additional pixels through transfers.`
        });
      }
      
      log(`Failed to claim pixel: ${error.message}`);
      res.status(500).json({ error: error.message || "Failed to claim pixel" });
    }
  });

  // Transfer pixel
  app.post("/api/pixels/transfer", async (req, res) => {
    try {
      const { pixelId, toAddress, fromAddress, txHash } = req.body;
      
      if (!txHash) {
        return res.status(400).json({ error: "Transaction hash is required" });
      }
      
      const pixel = await pixelStorage.getPixelById(pixelId);
      if (!pixel || !pixel.claimed) {
        return res.status(404).json({ error: "Pixel not found or not claimed" });
      }
      
      const fromUser = await userStorage.getUserByAddress(fromAddress);
      let toUser = await userStorage.getUserByAddress(toAddress);
      
      if (!fromUser || pixel.ownerId !== fromUser.id) {
        return res.status(403).json({ error: "Not authorized to transfer this pixel" });
      }
      
      if (!toUser) {
        toUser = await userStorage.createUser({ address: toAddress, influence: 0, totalCkb: 0, pixelCount: 0 });
      }
      
      // Update pixel ownership and sporeTxHash to track the transfer transaction
      const updatedPixel = await pixelStorage.updatePixel(pixelId, {
        ownerId: toUser.id,
        ownerSince: new Date(), // Track when new owner acquired this pixel (for holder point calculation)
        sporeTxHash: txHash,
      });
      
      // Create transaction record (DB unique constraint prevents duplicates)
      await transactionStorage.createTransaction({
        pixelId,
        fromUserId: fromUser.id,
        toUserId: toUser.id,
        type: 'transfer',
        amount: pixel.price,
        txHash,
      });
      
      // Recalculate influence for both users
      const fromUserPixels = await pixelStorage.getUserPixels(fromUser.id);
      const toUserPixels = await pixelStorage.getUserPixels(toUser.id);
      const allPixels = await pixelStorage.getAllPixels();
      
      await userStorage.updateUserInfluence(fromUser.id, calculateInfluence(fromUserPixels, allPixels));
      await userStorage.updateUserInfluence(toUser.id, calculateInfluence(toUserPixels, allPixels));
      
      // Update founder status for both users
      // Sender might lose founder status if they transferred their last minted pixel
      // Receiver might gain founder status if they're getting back a pixel they originally minted
      await userStorage.updateFounderStatus(fromUser.id);
      await userStorage.updateFounderStatus(toUser.id);
      
      broadcast({
        type: 'pixelTransferred',
        pixel: updatedPixel,
        fromUser: fromUser.address,
        toUser: toUser.address
      });
      
      res.json({ pixel: updatedPixel });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to transfer pixel" });
    }
  });

  // Burn pixel
  app.post("/api/pixels/burn", async (req, res) => {
    try {
      const { pixelId, userAddress, txHash } = req.body;
      
      if (!txHash) {
        return res.status(400).json({ error: "Transaction hash is required" });
      }
      
      const pixel = await pixelStorage.getPixelById(pixelId);
      if (!pixel || !pixel.claimed) {
        return res.status(404).json({ error: "Pixel not found or not claimed" });
      }
      
      const user = await userStorage.getUserByAddress(userAddress);
      if (!user || pixel.ownerId !== user.id) {
        return res.status(403).json({ error: "Not authorized to melt this pixel" });
      }
      
      // Reset pixel to unclaimed state
      const updatedPixel = await pixelStorage.updatePixel(pixelId, {
        claimed: false,
        bgcolor: null,
        textColor: null,
        ownerId: null,
        sporeId: null,
        sporeTxHash: null,
        claimedAt: null,
      });
      
      // Create transaction record with blockchain txHash (DB unique constraint prevents duplicates)
      await transactionStorage.createTransaction({
        pixelId,
        fromUserId: user.id,
        type: 'melt',
        amount: pixel.price,
        txHash,
      });
      
      // Recalculate user influence
      const userPixels = await pixelStorage.getUserPixels(user.id);
      const allPixels = await pixelStorage.getAllPixels();
      await userStorage.updateUserInfluence(user.id, calculateInfluence(userPixels, allPixels));
      
      // Update founder status (user might lose founder status if they melted their last minted pixel)
      await userStorage.updateFounderStatus(user.id);
      
      broadcast({
        type: 'pixelMelted',
        pixel: updatedPixel,
        user: user.address
      });
      
      res.json({ pixel: updatedPixel, reclaimedCkb: pixel.price });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to melt pixel" });
    }
  });
}
