import type { Express } from "express";
import { db } from "../../db";
import { feedback, insertFeedbackSchema } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { ADMIN_WALLET_ADDRESS } from "../../config";

function isAdmin(walletAddress: string): boolean {
  return walletAddress === ADMIN_WALLET_ADDRESS;
}

export async function ensureFeedbackTable() {
  try {
    // Try to query the feedback table to see if it exists
    await db.select().from(feedback).limit(1);
  } catch (error: any) {
    // If table doesn't exist (code 42P01), create it
    if (error?.code === '42P01') {
      console.log('📝 Creating feedback table...');
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS feedback (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          user_address TEXT,
          category TEXT NOT NULL,
          description TEXT NOT NULL,
          page TEXT,
          user_agent TEXT,
          status TEXT NOT NULL DEFAULT 'new',
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      console.log('✅ Feedback table created successfully');
    } else {
      // Some other error, rethrow it
      throw error;
    }
  }
}

export function registerFeedbackRoutes(app: Express) {
  app.post("/api/feedback", async (req, res) => {
    try {
      const feedbackData = insertFeedbackSchema.parse({
        userAddress: req.body.userAddress || null,
        category: req.body.category,
        description: req.body.description,
        page: req.body.page || null,
        userAgent: req.headers['user-agent'] || null,
      });

      const [newFeedback] = await db
        .insert(feedback)
        .values(feedbackData)
        .returning();

      res.status(201).json({
        success: true,
        message: "Thank you for your feedback!",
        id: newFeedback.id,
      });
    } catch (error: any) {
      console.error("Failed to submit feedback:", error);
      res.status(400).json({
        error: error.message || "Failed to submit feedback",
      });
    }
  });

  app.get("/api/feedback", async (req, res) => {
    try {
      const { walletAddress } = req.query;

      if (!walletAddress || !isAdmin(walletAddress as string)) {
        return res.status(403).json({
          error: "Unauthorized: Only admin can view feedback",
        });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const status = req.query.status as string;

      let query = db.select().from(feedback);

      if (status) {
        query = query.where(eq(feedback.status, status)) as any;
      }

      const feedbackList = await query
        .orderBy(desc(feedback.createdAt))
        .limit(limit);

      res.json(feedbackList);
    } catch (error) {
      console.error("Failed to fetch feedback:", error);
      res.status(500).json({ error: "Failed to fetch feedback" });
    }
  });

  app.patch("/api/feedback/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, walletAddress } = req.body;

      if (!walletAddress || !isAdmin(walletAddress)) {
        return res.status(403).json({
          error: "Unauthorized: Only admin can update feedback status",
        });
      }

      if (!['new', 'reviewing', 'resolved', 'dismissed'].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const [updated] = await db
        .update(feedback)
        .set({ status })
        .where(eq(feedback.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Feedback not found" });
      }

      res.json({ success: true, feedback: updated });
    } catch (error) {
      console.error("Failed to update feedback status:", error);
      res.status(500).json({ error: "Failed to update feedback status" });
    }
  });
}
