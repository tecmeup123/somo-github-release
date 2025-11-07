import type { Express } from "express";
import { userStorage } from "../users/storage";
import { pixelStorage } from "../pixels/storage";
import { clusterStorage } from "../clusters/storage";
import { transactionStorage } from "../transactions/storage";
import { calculateInfluence } from "../shared/utils";
import { log } from "../../vite";
import { ccc } from "@ckb-ccc/core";
import { cccClient } from "@shared/ccc-client";
import { decodePixelDNA } from "@shared/dob-metadata";
import { mol } from "@ckb-ccc/core";

/**
 * Retrieve transfer history for a Spore NFT from blockchain
 * Returns the sender address and transaction timestamp
 */
async function retrieveTransferHistory(sporeId: string, sporeTxHash: string): Promise<{
  fromAddress: string | null;
  timestamp: Date;
  txHash: string;
} | null> {
  try {
    // Get the transaction that created this spore cell
    const txResponse = await cccClient.getTransaction(sporeTxHash);
    
    if (!txResponse) {
      log(`[TX HISTORY] Transaction ${sporeTxHash} not found`);
      return null;
    }
    
    const transaction = txResponse.transaction;
    
    // Get the block header to extract timestamp using blockHash
    let timestamp = new Date();
    if (txResponse.status === "committed" && txResponse.blockHash) {
      try {
        const blockHeader = await cccClient.getHeaderByHash(txResponse.blockHash);
        if (blockHeader) {
          timestamp = new Date(Number(blockHeader.timestamp));
          log(`[TX HISTORY] Block timestamp: ${timestamp.toISOString()}`);
        }
      } catch (error) {
        log(`[TX HISTORY] Could not get block timestamp: ${error}`);
      }
    }
    
    // Extract sender address from first input by getting the previous transaction
    let fromAddress: string | null = null;
    if (transaction.inputs.length > 0) {
      try {
        const firstInput = transaction.inputs[0];
        const prevTxHash = firstInput.previousOutput.txHash;
        const prevIndex = Number(firstInput.previousOutput.index);
        
        // Get the previous transaction to access the output
        const prevTxResponse = await cccClient.getTransaction(prevTxHash);
        
        if (prevTxResponse && prevTxResponse.transaction.outputs.length > prevIndex) {
          const prevOutput = prevTxResponse.transaction.outputs[prevIndex];
          
          if (prevOutput.lock) {
            // Convert lock script to address
            const addr = ccc.Address.fromScript(prevOutput.lock, cccClient);
            fromAddress = addr.toString();
            log(`[TX HISTORY] Sender address: ${fromAddress.slice(0, 10)}...${fromAddress.slice(-8)}`);
          }
        }
      } catch (error) {
        log(`[TX HISTORY] Could not extract sender address: ${error}`);
      }
    }
    
    return {
      fromAddress,
      timestamp,
      txHash: sporeTxHash,
    };
  } catch (error: any) {
    log(`[TX HISTORY] Error retrieving history for ${sporeId}: ${error.message}`);
    return null;
  }
}

export function registerSyncRoutes(app: Express) {
  // Production: Sync wallet with blockchain
  app.post("/api/wallet/sync", async (req, res) => {
    try {
      const { walletAddress } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address is required" });
      }
      
      log(`[WALLET SYNC] Starting sync for wallet: ${walletAddress.slice(0, 10)}...${walletAddress.slice(-8)}`);
      
      // Step 1: Get active cluster ID from database
      const allClusters = await clusterStorage.getAllClusters();
      const activeCluster = allClusters.find(c => c.isActive);
      
      if (!activeCluster) {
        return res.status(400).json({ 
          error: "No active cluster found. Create a cluster first." 
        });
      }
      
      // Step 2: Query blockchain for all cells owned by this wallet
      log(`[WALLET SYNC] Active cluster: ${activeCluster.clusterId}`);
      const addr = await ccc.Address.fromString(walletAddress, cccClient);
      const collector = cccClient.findCellsByLock(addr.script);
      const allCells: any[] = [];
      
      for await (const cell of collector) {
        allCells.push(cell);
      }
      
      log(`[WALLET SYNC] Found ${allCells.length} total cells owned by wallet`);
      
      // Step 3: Filter for Spore cells and decode DOB/0 pixels from our cluster
      const sporeCells = allCells.filter((cell: any) => cell.cellOutput.type !== undefined);
      log(`[WALLET SYNC] Found ${sporeCells.length} Spore cells (cells with type script)`);
      
      const SporeDataCodec = mol.table({
        contentType: mol.String,
        content: mol.Bytes,
        clusterId: mol.BytesOpt,
      });
      
      const blockchainPixels: any[] = [];
      let dob0Count = 0;
      let clusterMatchCount = 0;
      let dnaMatchCount = 0;
      let decodeErrorCount = 0;
      
      for (const cell of sporeCells) {
        try {
          const sporeData = SporeDataCodec.decode(cell.outputData);
          
          // Check content type
          if (sporeData.contentType !== "dob/0") {
            log(`[WALLET SYNC] Skipping non-DOB/0 spore: ${sporeData.contentType}`);
            continue;
          }
          dob0Count++;
          
          // Check cluster ID (case-insensitive comparison)
          const clusterId = sporeData.clusterId ? ccc.hexFrom(sporeData.clusterId) : null;
          if (!clusterId || clusterId.toLowerCase() !== activeCluster.clusterId.toLowerCase()) {
            log(`[WALLET SYNC] Cluster mismatch - Expected: ${activeCluster.clusterId}, Got: ${clusterId}`);
            continue;
          }
          clusterMatchCount++;
          
          // Extract DNA from content
          const content = new TextDecoder().decode(ccc.bytesFrom(sporeData.content));
          const dnaMatch = content.match(/"dna"\s*:\s*"([0-9a-f]{20})"/i);
          if (!dnaMatch) {
            log(`[WALLET SYNC] Could not extract DNA from content: ${content.slice(0, 100)}...`);
            continue;
          }
          dnaMatchCount++;
          
          const dna = dnaMatch[1];
          const decoded = decodePixelDNA(dna);
          
          blockchainPixels.push({
            sporeId: cell.cellOutput.type?.args,
            sporeTxHash: cell.outPoint?.txHash,
            x: decoded.x,
            y: decoded.y,
            tier: decoded.tier,
            bgcolor: decoded.bgcolor,
            textColor: decoded.textColor,
            ckbLocked: decoded.ckbLocked,
            capacity: cell.cellOutput.capacity.toString(),
          });
          
          log(`[WALLET SYNC] Successfully decoded pixel (${decoded.x}, ${decoded.y}) - Tier: ${decoded.tier}`);
        } catch (error: any) {
          decodeErrorCount++;
          log(`[WALLET SYNC] Error decoding Spore cell: ${error.message}`);
        }
      }
      
      log(`[WALLET SYNC] Processing summary: ${sporeCells.length} Spore cells → ${dob0Count} DOB/0 → ${clusterMatchCount} cluster match → ${dnaMatchCount} DNA extracted → ${blockchainPixels.length} pixels decoded`);
      log(`[WALLET SYNC] Decode errors: ${decodeErrorCount}`);
      log(`[WALLET SYNC] Found ${blockchainPixels.length} SoMo pixels on blockchain`);
      
      // Step 4: Get or create user
      let user = await userStorage.getUserByAddress(walletAddress);
      if (!user) {
        user = await userStorage.createUser({
          address: walletAddress,
          influence: 0,
          totalCkb: 0,
          pixelCount: 0,
        });
      }
      
      // Step 5: Get current database pixels
      const dbPixels = await pixelStorage.getUserPixels(user.id);
      const dbPixelMap = new Map(dbPixels.map(p => [`${p.x},${p.y}`, p]));
      const blockchainPixelMap = new Map(blockchainPixels.map(p => [`${p.x},${p.y}`, p]));
      
      // Step 6: Determine changes needed
      const pixelsToRemove: any[] = [];
      const pixelsToAdd: any[] = [];
      const pixelsToUpdate: any[] = [];
      
      // Find pixels in DB but not on blockchain (transferred/melted)
      for (const dbPixel of dbPixels) {
        const key = `${dbPixel.x},${dbPixel.y}`;
        if (!blockchainPixelMap.has(key)) {
          pixelsToRemove.push(dbPixel);
        }
      }
      
      // Find pixels on blockchain but not in DB (secondary market purchases)
      // Also find pixels that exist in both and need updating
      for (const bcPixel of blockchainPixels) {
        const key = `${bcPixel.x},${bcPixel.y}`;
        if (!dbPixelMap.has(key)) {
          pixelsToAdd.push(bcPixel);
        } else {
          // Pixel exists in both - update if blockchain data is different
          const dbPixel = dbPixelMap.get(key);
          if (dbPixel && (!dbPixel.sporeTxHash || dbPixel.sporeId !== bcPixel.sporeId)) {
            pixelsToUpdate.push({ dbPixel, bcPixel });
          }
        }
      }
      
      log(`[WALLET SYNC] Pixels to remove: ${pixelsToRemove.length}, to add: ${pixelsToAdd.length}, to update: ${pixelsToUpdate.length}`);
      
      // Step 7: Update database
      // Remove transferred/melted pixels - reset ownership but preserve minter history
      // IMPORTANT: minterId and mint numbers are PERMANENT records for governance token airdrop
      for (const pixel of pixelsToRemove) {
        await pixelStorage.updatePixel(pixel.id, {
          ownerId: null,
          ownerSince: null,
          sporeId: null,
          sporeTxHash: null,
          bgcolor: null,
          textColor: null,
          claimed: false, // This alone should allow re-minting (hasUserMintedAnyPixel checks claimed=true)
          claimedAt: null,
          mintedAt: null,
          // DO NOT CLEAR minterId - it's the permanent governance record
          // DO NOT CLEAR tierMintNumber/globalMintNumber - they're immutable provenance
        });
        log(`[WALLET SYNC] Removed pixel (${pixel.x}, ${pixel.y}) - transferred/melted, cleared ownership but preserved minter history`);
      }
      
      // Add new pixels from blockchain - batch fetch transfer histories in parallel
      // Fetch all transfer histories in parallel to avoid N+1 queries
      const pixelHistoryPairs = await Promise.all(
        pixelsToAdd.map(async (pixel) => {
          const existingPixel = await pixelStorage.getPixel(pixel.x, pixel.y);
          if (!existingPixel) return null;
          
          const transferHistory = await retrieveTransferHistory(pixel.sporeId, pixel.sporeTxHash);
          return { pixel, existingPixel, transferHistory };
        })
      );
      
      // Process each pixel with its fetched history
      for (const pair of pixelHistoryPairs) {
        if (!pair) continue;
        
        const { pixel, existingPixel, transferHistory } = pair;
        
        // Determine if this is a mint (fromAddress matches current wallet) or a transfer
        const isMint = transferHistory?.fromAddress?.toLowerCase() === walletAddress.toLowerCase();
        
        // Update pixel ownership - set mintedAt and minterId for original mints
        await pixelStorage.updatePixel(existingPixel.id, {
          ownerId: user.id,
          sporeId: pixel.sporeId,
          sporeTxHash: pixel.sporeTxHash,
          bgcolor: pixel.bgcolor,
          textColor: pixel.textColor,
          claimed: true,
          claimedAt: transferHistory?.timestamp || new Date(),
          // Set mintedAt and minterId ONLY if this is an original mint
          ...(isMint ? {
            mintedAt: transferHistory?.timestamp || new Date(),
            minterId: user.id,
          } : {}),
        });
        
        // Create transaction record - determine if mint or transfer
        if (transferHistory) {
          // Check if this is a mint (fromAddress matches current wallet) or a transfer
          
          if (isMint) {
            // This is a mint - user minted it themselves
            await transactionStorage.createTransaction({
              pixelId: existingPixel.id,
              type: 'mint',
              amount: pixel.ckbLocked || existingPixel.price || 0,
              fromUserId: null,
              toUserId: user.id,
              txHash: transferHistory.txHash,
            });
            
            log(`[WALLET SYNC] Added pixel (${pixel.x}, ${pixel.y}) - minted by user at ${transferHistory.timestamp.toISOString()}`);
          } else {
            // This is a transfer - user received it from someone else
            let fromUser = null;
            if (transferHistory.fromAddress) {
              fromUser = await userStorage.getUserByAddress(transferHistory.fromAddress);
              if (!fromUser) {
                fromUser = await userStorage.createUser({
                  address: transferHistory.fromAddress,
                  influence: 0,
                  totalCkb: 0,
                  pixelCount: 0,
                });
              }
            }
            
            await transactionStorage.createTransaction({
              pixelId: existingPixel.id,
              type: 'transfer',
              amount: pixel.ckbLocked || existingPixel.price || 0,
              fromUserId: fromUser?.id || null,
              toUserId: user.id,
              txHash: transferHistory.txHash,
            });
            
            const senderInfo = transferHistory.fromAddress 
              ? `from ${transferHistory.fromAddress.slice(0, 6)}...${transferHistory.fromAddress.slice(-4)}`
              : 'from unknown sender';
            log(`[WALLET SYNC] Added pixel (${pixel.x}, ${pixel.y}) - received ${senderInfo} at ${transferHistory.timestamp.toISOString()}`);
          }
        } else {
          log(`[WALLET SYNC] Added pixel (${pixel.x}, ${pixel.y}) - secondary market purchase (no history)`);
        }
      }
      
      // Update existing pixels with latest blockchain data
      for (const { dbPixel, bcPixel } of pixelsToUpdate) {
        await pixelStorage.updatePixel(dbPixel.id, {
          sporeId: bcPixel.sporeId,
          sporeTxHash: bcPixel.sporeTxHash,
        });
        log(`[WALLET SYNC] Updated pixel (${dbPixel.x}, ${dbPixel.y}) with blockchain data`);
      }
      
      // Step 8: Recalculate user stats and influence
      const updatedPixels = await pixelStorage.getUserPixels(user.id);
      const totalCkbLocked = updatedPixels.reduce((sum, p) => sum + (p.price || 0), 0);
      const allPixels = await pixelStorage.getAllPixels();
      const influenceScore = calculateInfluence(updatedPixels, allPixels);
      
      await userStorage.updateUserStats(user.id, {
        pixelCount: updatedPixels.length,
        totalCkb: totalCkbLocked,
        influence: influenceScore,
      });
      
      log(`[WALLET SYNC] Updated user stats - pixels: ${updatedPixels.length}, CKB: ${totalCkbLocked}, influence: ${influenceScore}`);
      
      res.json({
        success: true,
        walletAddress,
        summary: {
          totalPixelsOnBlockchain: blockchainPixels.length,
          totalPixelsInDatabase: updatedPixels.length,
          pixelsRemoved: pixelsToRemove.length,
          pixelsAdded: pixelsToAdd.length,
          pixelsUpdated: pixelsToUpdate.length,
          influenceScore,
          totalCkbLocked,
        },
        changes: {
          removed: pixelsToRemove.map(p => ({ coords: `(${p.x}, ${p.y})`, tier: p.tier })),
          added: pixelsToAdd.map(p => ({ coords: `(${p.x}, ${p.y})`, tier: p.tier })),
          updated: pixelsToUpdate.map(u => ({ coords: `(${u.dbPixel.x}, ${u.dbPixel.y})`, tier: u.dbPixel.tier })),
        },
      });
      
    } catch (error: any) {
      log(`[WALLET SYNC] Error: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  // TEST: Verify wallet ownership by querying blockchain
  app.get("/api/test/verify-wallet-ownership/:address", async (req, res) => {
    try {
      const walletAddress = req.params.address;
      
      log(`[TEST] Verifying blockchain ownership for wallet: ${walletAddress.slice(0, 10)}...${walletAddress.slice(-8)}`);
      
      // Step 1: Get active cluster ID from database
      const allClusters = await clusterStorage.getAllClusters();
      const activeCluster = allClusters.find(c => c.isActive);
      
      if (!activeCluster) {
        return res.status(400).json({ 
          error: "No active cluster found. Create a cluster first." 
        });
      }
      
      log(`[TEST] Active cluster: ${activeCluster.clusterId}`);
      
      // Step 2: Query blockchain for all cells owned by this wallet
      const addr = await ccc.Address.fromString(walletAddress, cccClient);
      log(`[TEST] Querying blockchain for cells owned by lock script...`);
      
      const collector = cccClient.findCellsByLock(addr.script);
      const allCells: any[] = [];
      
      for await (const cell of collector) {
        allCells.push(cell);
      }
      
      log(`[TEST] Found ${allCells.length} total cells owned by wallet`);
      
      // Step 3: Filter for Spore cells (cells with type script)
      const sporeCells = allCells.filter((cell: any) => cell.cellOutput.type !== undefined);
      log(`[TEST] Found ${sporeCells.length} Spore cells`);
      
      // Step 4: Extract and decode Spores from our cluster
      const ourPixels: any[] = [];
      let processedCount = 0;
      let dob0Count = 0;
      let clusterMatchCount = 0;
      
      // Define Spore data codec using Molecule
      const SporeDataCodec = mol.table({
        contentType: mol.String,
        content: mol.Bytes,
        clusterId: mol.BytesOpt,
      });
      
      for (const cell of sporeCells) {
        processedCount++;
        try {
          // Decode Spore data using Molecule codec
          const sporeData = SporeDataCodec.decode(cell.outputData);
          
          // Check content type
          const contentType = sporeData.contentType;
          
          // Skip if not DOB/0
          if (contentType !== "dob/0") {
            continue;
          }
          dob0Count++;
          
          // Get content as string
          const content = new TextDecoder().decode(ccc.bytesFrom(sporeData.content));
          
          // Get cluster ID if present
          const clusterId = sporeData.clusterId ? ccc.hexFrom(sporeData.clusterId) : null;
          
          // Skip if not from our cluster
          if (clusterId !== activeCluster.clusterId) {
            continue;
          }
          clusterMatchCount++;
          
          // Parse DNA from content
          const dnaMatch = content.match(/"dna"\s*:\s*"([0-9a-f]{20})"/i);
          if (!dnaMatch) {
            log(`[TEST] Warning: Could not extract DNA from content: ${content}`);
            continue;
          }
          
          const dna = dnaMatch[1];
          const decoded = decodePixelDNA(dna);
          
          ourPixels.push({
            sporeId: cell.cellOutput.type?.args,
            clusterId,
            dna,
            decoded,
            capacity: cell.cellOutput.capacity.toString(),
          });
        } catch (error: any) {
          log(`[TEST] Error processing Spore cell #${processedCount}: ${error.message}`);
        }
      }
      
      log(`[TEST] Processed ${processedCount} Spore cells: ${dob0Count} DOB/0, ${clusterMatchCount} in our cluster`);
    
      
      log(`[TEST] Found ${ourPixels.length} SoMo pixels owned by wallet`);
      
      // Step 5: Compare with database
      const user = await userStorage.getUserByAddress(walletAddress);
      const dbPixels = user ? await pixelStorage.getUserPixels(user.id) : [];
      const dbPixelCoords = new Set(dbPixels.map((p: any) => `${p.x},${p.y}`));
      const blockchainCoords = new Set(ourPixels.map((p: any) => `${p.decoded.x},${p.decoded.y}`));
      
      // Find discrepancies
      const onlyInDatabase = dbPixels.filter((p: any) => !blockchainCoords.has(`${p.x},${p.y}`));
      const onlyOnBlockchain = ourPixels.filter((p: any) => !dbPixelCoords.has(`${p.decoded.x},${p.decoded.y}`));
      const matches = ourPixels.filter((p: any) => dbPixelCoords.has(`${p.decoded.x},${p.decoded.y}`));
      
      const report = {
        success: true,
        walletAddress,
        activeClusterId: activeCluster.clusterId,
        summary: {
          totalCellsOnBlockchain: allCells.length,
          totalSporesOnBlockchain: sporeCells.length,
          somoPixelsOnBlockchain: ourPixels.length,
          somoPixelsInDatabase: dbPixels.length,
          matches: matches.length,
          discrepancies: onlyInDatabase.length + onlyOnBlockchain.length,
        },
        matches: matches.map((p: any) => ({
          coords: `(${p.decoded.x}, ${p.decoded.y})`,
          tier: p.decoded.tier,
          sporeId: p.sporeId,
        })),
        onlyInDatabase: onlyInDatabase.map(p => ({
          coords: `(${p.x}, ${p.y})`,
          tier: p.tier,
          sporeId: p.sporeId,
          note: "User transferred this pixel or it was melted off-platform",
        })),
        onlyOnBlockchain: onlyOnBlockchain.map(p => ({
          coords: `(${p.decoded.x}, ${p.decoded.y})`,
          tier: p.decoded.tier,
          sporeId: p.sporeId,
          note: "User bought this pixel on secondary market or received transfer off-platform",
        })),
        blockchainPixels: ourPixels,
        conclusion: ourPixels.length === dbPixels.length && onlyInDatabase.length === 0 
          ? "✅ Blockchain and database are in perfect sync!"
          : "⚠️ Discrepancies found - blockchain sync needed",
      };
      
      log(`[TEST] Verification complete`);
      log(`[TEST] Matches: ${matches.length}, Only in DB: ${onlyInDatabase.length}, Only on blockchain: ${onlyOnBlockchain.length}`);
      
      res.json(report);
      
    } catch (error: any) {
      log(`[TEST] Error: ${error.message}`);
      res.status(500).json({ 
        error: error.message,
        stack: error.stack,
      });
    }
  });
}
