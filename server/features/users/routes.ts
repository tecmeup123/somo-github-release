import type { Express } from "express";
import { userStorage } from "./storage";
import { pixelStorage } from "../pixels/storage";
import { transactionStorage } from "../transactions/storage";
import { insertUserSchema } from "@shared/schema";
import { getUserAchievements } from "../shared/achievements";

export function registerUserRoutes(app: Express) {
  // Create user
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await userStorage.getUserByAddress(userData.address);
      if (existingUser) {
        return res.json(existingUser);
      }
      
      const user = await userStorage.createUser(userData);
      res.status(201).json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to create user" });
    }
  });

  // Get user by address
  app.get("/api/users/:address", async (req, res) => {
    try {
      const user = await userStorage.getUserByAddress(req.params.address);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Get user's pixels
  app.get("/api/users/:address/pixels", async (req, res) => {
    try {
      const user = await userStorage.getUserByAddress(req.params.address);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const pixels = await pixelStorage.getUserPixels(user.id);
      res.json(pixels);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user pixels" });
    }
  });

  // Get user's recent transactions
  app.get("/api/users/:address/transactions", async (req, res) => {
    try {
      const user = await userStorage.getUserByAddress(req.params.address);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Efficient single query - fetches all user transactions with JOIN
      const transactions = await transactionStorage.getUserTransactions(user.id, 10);
      
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user transactions" });
    }
  });

  // Get user's achievements
  app.get("/api/users/:address/achievements", async (req, res) => {
    try {
      const user = await userStorage.getUserByAddress(req.params.address);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const achievements = await getUserAchievements(user.id);
      res.json(achievements);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user achievements" });
    }
  });

  // Get user's minted pixel status (enforces 1-pixel-per-wallet rule)
  app.get("/api/users/:address/claimed-tiers", async (req, res) => {
    try {
      const { address } = req.params;
      const user = await userStorage.getUserByAddress(address);
      
      if (!user) {
        return res.json({ 
          hasAlreadyMinted: false,
          mintedPixel: null
        });
      }
      
      const hasAlreadyMinted = await pixelStorage.hasUserMintedAnyPixel(user.id);
      const mintedPixel = await pixelStorage.getUserMintedPixel(user.id);
      
      res.json({
        hasAlreadyMinted,
        mintedPixel: mintedPixel ? {
          x: mintedPixel.x,
          y: mintedPixel.y,
          tier: mintedPixel.tier,
          id: mintedPixel.id
        } : null
      });
    } catch (error) {
      console.error("Failed to fetch minted pixel:", error);
      res.status(500).json({ error: "Failed to fetch minted pixel" });
    }
  });

  // Get referral stats for a user
  app.get("/api/referrals/stats/:address", async (req, res) => {
    try {
      const { address } = req.params;
      
      // Use getOrCreateUser to ensure referral code is generated for existing users
      const user = await userStorage.getOrCreateUser(address);
      
      const stats = await userStorage.getReferralStats(user.id);
      
      res.json({
        referralCode: user.referralCode || '',
        totalReferrals: stats.totalReferrals,
        currentBoostLevel: stats.currentBoostLevel,
        maxBoostLevel: 100,
        boostMultiplier: 1 + (stats.currentBoostLevel / 100),
        expiresAt: stats.expiresAt,
      });
    } catch (error) {
      console.error("Failed to fetch referral stats:", error);
      res.status(500).json({ error: "Failed to fetch referral stats" });
    }
  });

  // Get referral leaderboard
  app.get("/api/referrals/leaderboard", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const leaderboard = await userStorage.getReferralLeaderboard(limit);
      res.json(leaderboard);
    } catch (error) {
      console.error("Failed to fetch referral leaderboard:", error);
      res.status(500).json({ error: "Failed to fetch referral leaderboard" });
    }
  });
}
