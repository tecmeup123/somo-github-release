import type { Express } from "express";
import { pixelStorage } from "../pixels/storage";
import { userStorage } from "../users/storage";

export function registerStatsRoutes(app: Express) {
  // Get canvas stats
  app.get("/api/stats", async (req, res) => {
    try {
      const allPixels = await pixelStorage.getAllPixels();
      const claimedPixels = allPixels.filter(p => p.claimed);
      const totalValue = claimedPixels.reduce((sum, p) => sum + p.price, 0);
      const remaining = allPixels.length - claimedPixels.length;
      
      // Count active founders (users who have minted and still own at least one pixel)
      const { users } = await import("@shared/schema");
      const { count, eq } = await import("drizzle-orm");
      const { db } = await import("../../db");
      
      const [result] = await db.select({ count: count() }).from(users).where(eq(users.isFounder, true));
      const activeFounders = result?.count || 0;
      
      const tierCounts = {
        legendary: claimedPixels.filter(p => p.tier === 'legendary').length,
        epic: claimedPixels.filter(p => p.tier === 'epic').length,
        rare: claimedPixels.filter(p => p.tier === 'rare').length,
        common: claimedPixels.filter(p => p.tier === 'common').length,
      };
      
      const tierTotals = {
        legendary: allPixels.filter(p => p.tier === 'legendary').length,
        epic: allPixels.filter(p => p.tier === 'epic').length,
        rare: allPixels.filter(p => p.tier === 'rare').length,
        common: allPixels.filter(p => p.tier === 'common').length,
      };

      res.json({
        totalPixels: allPixels.length,
        claimedPixels: claimedPixels.length,
        remainingPixels: remaining,
        totalCKBLocked: totalValue,
        activeFounders,
        tierCounts,
        tierTotals,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Get leaderboard
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const topUsers = await userStorage.getTopUsers(10);
      res.json(topUsers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });
}
