import { db } from "../../db";
import { userAchievements, pixels, users, ACHIEVEMENT_TYPES, type AchievementType } from "@shared/schema";
import { eq, and, count, sql } from "drizzle-orm";
import { broadcast } from "./websocket";

interface UserAchievementStats {
  pixelCount: number;
  maxConnectedPixels: number;
  uniqueColors: number;
  hasLegendary: boolean;
  totalCkb: number;
}

async function getUserStats(userId: string): Promise<UserAchievementStats> {
  // Get user data
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) {
    return {
      pixelCount: 0,
      maxConnectedPixels: 0,
      uniqueColors: 0,
      hasLegendary: false,
      totalCkb: 0,
    };
  }

  // Get user's pixels
  const userPixels = await db.select().from(pixels).where(eq(pixels.ownerId, userId));

  // Calculate unique colors
  const uniqueColors = new Set(userPixels.map(p => p.bgcolor).filter(Boolean)).size;

  // Check if has legendary
  const hasLegendary = userPixels.some(p => p.tier === 'legendary');

  // Calculate max connected pixels using flood fill
  const maxConnectedPixels = calculateMaxConnectedPixels(userPixels);

  return {
    pixelCount: user.pixelCount,
    maxConnectedPixels,
    uniqueColors,
    hasLegendary,
    totalCkb: user.totalCkb,
  };
}

function calculateMaxConnectedPixels(userPixels: any[]): number {
  if (userPixels.length === 0) return 0;

  const pixelMap = new Map<string, boolean>();
  userPixels.forEach(p => pixelMap.set(`${p.x},${p.y}`, true));

  const visited = new Set<string>();
  let maxCluster = 0;

  function floodFill(x: number, y: number): number {
    const key = `${x},${y}`;
    if (visited.has(key) || !pixelMap.has(key)) return 0;
    
    visited.add(key);
    let size = 1;

    // Check 4 neighbors
    size += floodFill(x + 1, y);
    size += floodFill(x - 1, y);
    size += floodFill(x, y + 1);
    size += floodFill(x, y - 1);

    return size;
  }

  userPixels.forEach(p => {
    const key = `${p.x},${p.y}`;
    if (!visited.has(key)) {
      const clusterSize = floodFill(p.x, p.y);
      maxCluster = Math.max(maxCluster, clusterSize);
    }
  });

  return maxCluster;
}

export async function checkAndUnlockAchievements(userId: string): Promise<AchievementType[]> {
  // Get user stats
  const stats = await getUserStats(userId);

  // Get already unlocked achievements
  const unlockedAchievements = await db
    .select()
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId));

  const unlockedTypes = new Set(unlockedAchievements.map(a => a.achievementType));

  const toUnlock: AchievementType[] = [];

  // Check each achievement type and collect those to unlock
  if (!unlockedTypes.has(ACHIEVEMENT_TYPES.FIRST_BLOOD) && stats.pixelCount >= 1) {
    toUnlock.push(ACHIEVEMENT_TYPES.FIRST_BLOOD);
  }

  if (!unlockedTypes.has(ACHIEVEMENT_TYPES.TERRITORY_KING) && stats.maxConnectedPixels >= 5) {
    toUnlock.push(ACHIEVEMENT_TYPES.TERRITORY_KING);
  }

  if (!unlockedTypes.has(ACHIEVEMENT_TYPES.COLOR_COLLECTOR) && stats.uniqueColors >= 4) {
    toUnlock.push(ACHIEVEMENT_TYPES.COLOR_COLLECTOR);
  }

  if (!unlockedTypes.has(ACHIEVEMENT_TYPES.LEGENDARY_HUNTER) && stats.hasLegendary) {
    toUnlock.push(ACHIEVEMENT_TYPES.LEGENDARY_HUNTER);
  }

  if (!unlockedTypes.has(ACHIEVEMENT_TYPES.RICH_PLAYER) && stats.totalCkb >= 100000) {
    toUnlock.push(ACHIEVEMENT_TYPES.RICH_PLAYER);
  }

  // Batch unlock all achievements at once
  if (toUnlock.length > 0) {
    await batchUnlockAchievements(userId, toUnlock);
  }

  return toUnlock;
}

async function batchUnlockAchievements(userId: string, achievements: AchievementType[]): Promise<void> {
  if (achievements.length === 0) return;

  // Batch insert all achievements in a single query
  await db.insert(userAchievements).values(
    achievements.map(achievementType => ({
      userId,
      achievementType,
    }))
  );

  // Get user info once for all broadcasts
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  
  // Broadcast all achievement unlocks
  achievements.forEach(achievementType => {
    broadcast({
      type: 'achievement_unlocked',
      userId,
      userAddress: user?.address,
      achievementType,
    });
  });
}

export async function getUserAchievements(userId: string) {
  return await db
    .select()
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId));
}
