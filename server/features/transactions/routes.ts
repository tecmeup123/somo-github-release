import type { Express } from "express";
import { transactionStorage } from "./storage";

export function registerTransactionRoutes(app: Express) {
  // Get transactions for a specific pixel
  app.get("/api/transactions/pixel/:pixelId", async (req, res) => {
    try {
      const { pixelId } = req.params;
      const transactions = await transactionStorage.getPixelTransactions(pixelId);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pixel transactions" });
    }
  });

  // Get recent transactions (all activity)
  app.get("/api/transactions/recent", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const transactions = await transactionStorage.getRecentTransactions(limit);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recent transactions" });
    }
  });
}
