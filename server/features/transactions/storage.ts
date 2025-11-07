import { type Transaction, type InsertTransaction, transactions, pixels, users } from "@shared/schema";
import { db } from "../../db";
import { eq, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export interface ITransactionStorage {
  createTransaction(transaction: InsertTransaction): Promise<Transaction | null>;
  getTransactionByHash(txHash: string): Promise<Transaction | undefined>;
  getPixelTransactions(pixelId: string): Promise<Transaction[]>;
  getUserTransactions(userId: string, limit?: number): Promise<Transaction[]>;
  getRecentTransactions(limit: number): Promise<any[]>;
  getRecentMintTransactions(limit: number): Promise<any[]>;
}

export class TransactionStorage implements ITransactionStorage {
  async createTransaction(transaction: InsertTransaction): Promise<Transaction | null> {
    // Use ON CONFLICT DO NOTHING to handle duplicate txHash atomically
    const [newTransaction] = await db
      .insert(transactions)
      .values(transaction)
      .onConflictDoNothing({ target: transactions.txHash })
      .returning();
    return newTransaction || null;
  }

  async getTransactionByHash(txHash: string): Promise<Transaction | undefined> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.txHash, txHash))
      .limit(1);
    return transaction;
  }

  async getPixelTransactions(pixelId: string): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.pixelId, pixelId))
      .orderBy(desc(transactions.createdAt));
  }

  async getUserTransactions(userId: string, limit: number = 10): Promise<Transaction[]> {
    // Efficient single query: JOIN transactions with pixels owned by user
    const result = await db
      .select({
        id: transactions.id,
        pixelId: transactions.pixelId,
        fromUserId: transactions.fromUserId,
        toUserId: transactions.toUserId,
        type: transactions.type,
        amount: transactions.amount,
        txHash: transactions.txHash,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .innerJoin(pixels, eq(transactions.pixelId, pixels.id))
      .where(eq(pixels.ownerId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(limit);

    return result;
  }

  async getRecentTransactions(limit: number): Promise<any[]> {
    const fromUser = alias(users, 'fromUser');
    const toUser = alias(users, 'toUser');
    
    const result = await db
      .select({
        id: transactions.id,
        type: transactions.type,
        ckbAmount: transactions.amount,
        txHash: transactions.txHash,
        timestamp: transactions.createdAt,
        pixelX: pixels.x,
        pixelY: pixels.y,
        tier: pixels.tier,
        walletAddress: toUser.address,
        fromUserAddress: fromUser.address,
      })
      .from(transactions)
      .leftJoin(pixels, eq(transactions.pixelId, pixels.id))
      .leftJoin(fromUser, eq(transactions.fromUserId, fromUser.id))
      .leftJoin(toUser, eq(transactions.toUserId, toUser.id))
      .orderBy(desc(transactions.createdAt))
      .limit(limit);

    return result;
  }

  async getRecentMintTransactions(limit: number): Promise<any[]> {
    const toUser = alias(users, 'toUser');
    
    const result = await db
      .select({
        id: transactions.id,
        type: transactions.type,
        ckbAmount: transactions.amount,
        txHash: transactions.txHash,
        timestamp: transactions.createdAt,
        pixelX: pixels.x,
        pixelY: pixels.y,
        tier: pixels.tier,
        walletAddress: toUser.address,
      })
      .from(transactions)
      .leftJoin(pixels, eq(transactions.pixelId, pixels.id))
      .leftJoin(toUser, eq(transactions.toUserId, toUser.id))
      .where(eq(transactions.type, 'mint'))
      .orderBy(desc(transactions.createdAt))
      .limit(limit);

    return result;
  }
}

export const transactionStorage = new TransactionStorage();
