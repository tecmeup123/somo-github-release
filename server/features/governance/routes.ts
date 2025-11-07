import { Express } from 'express';
import { db } from '../../db';
import { pixels, users } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import { calculateUserPoints, GOVERNANCE_CONFIG, getDaysUntilSnapshot, formatTokenAmount } from '../../../shared/governance-utils';

// Simple in-memory cache for governance calculations
interface CacheEntry {
  data: any;
  timestamp: number;
}

const pointsCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key: string): any | null {
  const entry = pointsCache.get(key);
  if (!entry) return null;
  
  const now = Date.now();
  if (now - entry.timestamp > CACHE_TTL) {
    pointsCache.delete(key);
    return null;
  }
  
  return entry.data;
}

function setCache(key: string, data: any): void {
  pointsCache.set(key, {
    data,
    timestamp: Date.now(),
  });
  
  // Cleanup old entries periodically
  if (pointsCache.size > 1000) {
    const now = Date.now();
    const entries = Array.from(pointsCache.entries());
    for (const [k, v] of entries) {
      if (now - v.timestamp > CACHE_TTL) {
        pointsCache.delete(k);
      }
    }
  }
}

export function registerGovernanceRoutes(app: Express) {
  app.get('/api/governance/points/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    // Check cache first
    const cacheKey = `points:${address}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
    const user = await db.query.users.findFirst({
      where: eq(users.address, address),
    });
    
    if (!user) {
      return res.json({
        totalPoints: 0,
        estimatedTokens: 0,
        dailyPointRate: 0,
        pixelCount: 0,
        minterPixelCount: 0,
        holderPixelCount: 0,
        daysUntilSnapshot: getDaysUntilSnapshot(),
        formattedTokens: '0',
      });
    }
    
    // Get ALL pixels this user currently owns (both minted and acquired)
    const userPixels = await db.query.pixels.findMany({
      where: eq(pixels.ownerId, user.id),
    });
    
    const pointsData = calculateUserPoints(
      userPixels, 
      user.id, 
      new Date(),
      user.referralBoostLevel || 0,
      user.referralBoostExpiresAt,
      user.isFounder || false
    );
    
    const response = {
      ...pointsData,
      daysUntilSnapshot: getDaysUntilSnapshot(),
      formattedTokens: formatTokenAmount(pointsData.estimatedTokens),
      snapshotDate: GOVERNANCE_CONFIG.SNAPSHOT_DATE.toISOString(),
      mainnetLaunch: GOVERNANCE_CONFIG.MAINNET_LAUNCH.toISOString(),
    };
    
    // Cache the result
    setCache(cacheKey, response);
    
    res.json(response);
  } catch (error) {
    console.error('Error calculating governance points:', error);
    res.status(500).json({ error: 'Failed to calculate governance points' });
  }
});

  app.get('/api/governance/stats', async (req, res) => {
  try {
    // Check cache first
    const cacheKey = 'stats:global';
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
    const allPixels = await db.query.pixels.findMany();
    const claimedPixels = allPixels.filter(p => p.claimed);
    
    const allUsersData = await db.query.users.findMany();
    
    let totalPointsDistributed = 0;
    const userPointsArray: Array<{ address: string; points: number; tokens: number }> = [];
    
    for (const user of allUsersData) {
      // Get ALL pixels this user currently owns (both minted and acquired)
      const userPixels = claimedPixels.filter(p => p.ownerId === user.id);
      if (userPixels.length > 0) {
        const pointsData = calculateUserPoints(
          userPixels, 
          user.id,
          new Date(),
          user.referralBoostLevel || 0,
          user.referralBoostExpiresAt,
          user.isFounder || false
        );
        totalPointsDistributed += pointsData.totalPoints;
        userPointsArray.push({
          address: user.address,
          points: pointsData.totalPoints,
          tokens: pointsData.estimatedTokens,
        });
      }
    }
    
    const totalTokensDistributed = Math.floor(totalPointsDistributed / GOVERNANCE_CONFIG.POINTS_PER_TOKEN);
    const participationRate = (claimedPixels.length / GOVERNANCE_CONFIG.MAX_PIXELS) * 100;
    
    userPointsArray.sort((a, b) => b.points - a.points);
    
    const response = {
      totalPointsDistributed,
      totalTokensDistributed,
      formattedTokensDistributed: formatTokenAmount(totalTokensDistributed),
      participationRate: parseFloat(participationRate.toFixed(2)),
      totalParticipants: userPointsArray.length,
      pixelsClaimed: claimedPixels.length,
      pixelsRemaining: GOVERNANCE_CONFIG.MAX_PIXELS - claimedPixels.length,
      daysUntilSnapshot: getDaysUntilSnapshot(),
      topHolders: userPointsArray.slice(0, 10),
      config: {
        totalTokens: GOVERNANCE_CONFIG.TOTAL_TOKENS,
        participantTokens: GOVERNANCE_CONFIG.PARTICIPANT_TOKENS,
        snapshotDate: GOVERNANCE_CONFIG.SNAPSHOT_DATE.toISOString(),
        mainnetLaunch: GOVERNANCE_CONFIG.MAINNET_LAUNCH.toISOString(),
      },
    };
    
    // Cache the result
    setCache(cacheKey, response);
    
    res.json(response);
  } catch (error) {
    console.error('Error calculating governance stats:', error);
    res.status(500).json({ error: 'Failed to calculate governance stats' });
  }
  });
}
