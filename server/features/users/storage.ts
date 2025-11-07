import { type User, type InsertUser, users } from "@shared/schema";
import { db } from "../../db";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

function generateReferralCode(): string {
  return nanoid(10);
}

export interface IUserStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByAddress(address: string): Promise<User | undefined>;
  getOrCreateUser(address: string): Promise<User>;
  createUser(user: InsertUser): Promise<User>;
  updateUserInfluence(id: string, influence: number): Promise<void>;
  updateUserStats(id: string, stats: { influence?: number; totalCkb?: number; pixelCount?: number; founderPixelCount?: number; isFounder?: boolean }): Promise<void>;
  updateFounderStatus(userId: string): Promise<void>;
  getTopUsers(limit: number): Promise<User[]>;
  getUserByReferralCode(code: string): Promise<User | undefined>;
  applyReferralBoost(userId: string, boostIncrement: number): Promise<void>;
  getReferralStats(userId: string): Promise<{ totalReferrals: number; currentBoostLevel: number; expiresAt: Date | null }>;
}

export class UserStorage implements IUserStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByAddress(address: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.address, address));
    return user || undefined;
  }

  async getOrCreateUser(address: string): Promise<User> {
    let user = await this.getUserByAddress(address);
    if (!user) {
      user = await this.createUser({
        address,
        influence: 0,
        totalCkb: 0,
        pixelCount: 0,
      });
    } else if (!user.referralCode) {
      // Generate referral code for existing users who don't have one
      const referralCode = generateReferralCode();
      await db
        .update(users)
        .set({ referralCode, referralBoostLevel: 0 })
        .where(eq(users.id, user.id));
      user.referralCode = referralCode;
      user.referralBoostLevel = 0;
    }
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const referralCode = generateReferralCode();
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        referralCode,
        referralBoostLevel: 0,
      })
      .returning();
    return user;
  }

  async updateUserInfluence(id: string, influence: number): Promise<void> {
    await db
      .update(users)
      .set({ influence })
      .where(eq(users.id, id));
  }

  async updateUserStats(id: string, stats: { influence?: number; totalCkb?: number; pixelCount?: number; founderPixelCount?: number; isFounder?: boolean }): Promise<void> {
    const updates: any = {};
    if (stats.influence !== undefined) updates.influence = stats.influence;
    if (stats.totalCkb !== undefined) updates.totalCkb = stats.totalCkb;
    if (stats.pixelCount !== undefined) updates.pixelCount = stats.pixelCount;
    if (stats.founderPixelCount !== undefined) updates.founderPixelCount = stats.founderPixelCount;
    if (stats.isFounder !== undefined) updates.isFounder = stats.isFounder;
    
    await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id));
  }

  async updateFounderStatus(userId: string): Promise<void> {
    const { pixels } = await import("@shared/schema");
    const { sql, and } = await import("drizzle-orm");
    
    // Count pixels where user is both minter and current owner
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(pixels)
      .where(
        and(
          eq(pixels.minterId, userId),
          eq(pixels.ownerId, userId),
          eq(pixels.claimed, true)
        )
      );
    
    const founderPixelCount = result?.count || 0;
    const isFounder = founderPixelCount > 0;
    
    await db
      .update(users)
      .set({
        founderPixelCount,
        isFounder,
      })
      .where(eq(users.id, userId));
  }

  async getTopUsers(limit: number): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.isFounder, true))
      .orderBy(desc(users.influence))
      .limit(limit);
  }

  async getUserByReferralCode(code: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.referralCode, code));
    return user || undefined;
  }

  async applyReferralBoost(userId: string, boostIncrement: number): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');
    
    const now = new Date();
    const currentExpiry = user.referralBoostExpiresAt;
    const isBoostActive = currentExpiry && currentExpiry > now;
    
    // Reset boost to 0 if expired, otherwise keep current level
    const baseBoostLevel = isBoostActive ? (user.referralBoostLevel || 0) : 0;
    const newBoostLevel = Math.min(100, baseBoostLevel + boostIncrement);
    
    // Extend from the later of current expiry or now
    const baseTime = isBoostActive && currentExpiry ? currentExpiry.getTime() : now.getTime();
    const expiresAt = new Date(baseTime + 24 * 60 * 60 * 1000); // +24 hours
    
    await db
      .update(users)
      .set({
        referralBoostLevel: newBoostLevel,
        referralBoostExpiresAt: expiresAt,
      })
      .where(eq(users.id, userId));
  }

  async getReferralStats(userId: string): Promise<{ totalReferrals: number; currentBoostLevel: number; expiresAt: Date | null }> {
    const user = await this.getUser(userId);
    if (!user) {
      return { totalReferrals: 0, currentBoostLevel: 0, expiresAt: null };
    }

    const { referrals: referralsTable } = await import("@shared/schema");
    const userReferrals = await db
      .select()
      .from(referralsTable)
      .where(eq(referralsTable.referrerId, userId));

    const now = new Date();
    const isBoostActive = user.referralBoostExpiresAt && user.referralBoostExpiresAt > now;

    return {
      totalReferrals: userReferrals.length,
      currentBoostLevel: isBoostActive ? (user.referralBoostLevel || 0) : 0,
      expiresAt: isBoostActive ? user.referralBoostExpiresAt : null,
    };
  }

  async getReferralLeaderboard(limit: number = 10): Promise<Array<{
    userId: string;
    address: string;
    referralCode: string;
    totalReferrals: number;
    currentBoostLevel: number;
  }>> {
    const { referrals: referralsTable } = await import("@shared/schema");
    const { sql } = await import("drizzle-orm");
    
    // Get users with referral counts
    const leaderboard = await db
      .select({
        userId: users.id,
        address: users.address,
        referralCode: users.referralCode,
        currentBoostLevel: users.referralBoostLevel,
        totalReferrals: sql<number>`count(${referralsTable.id})::int`,
      })
      .from(users)
      .leftJoin(referralsTable, eq(users.id, referralsTable.referrerId))
      .groupBy(users.id, users.address, users.referralCode, users.referralBoostLevel)
      .orderBy(sql`count(${referralsTable.id}) desc`)
      .limit(limit);

    return leaderboard.map(row => ({
      userId: row.userId,
      address: row.address,
      referralCode: row.referralCode || '',
      totalReferrals: row.totalReferrals,
      currentBoostLevel: row.currentBoostLevel || 0,
    }));
  }
}

export const userStorage = new UserStorage();
