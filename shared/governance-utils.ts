import { Pixel } from './schema';

export const GOVERNANCE_CONFIG = {
  TOTAL_TOKENS: 500_000_000,
  PARTICIPANT_TOKENS: 350_000_000,
  TEAM_TREASURY_TOKENS: 150_000_000,
  POINTS_PER_TOKEN: 4,
  TOTAL_PARTICIPANT_POINTS: 1_400_000_000, // 350M tokens × 4 points/token
  MAINNET_LAUNCH: new Date('2025-10-01T00:00:00Z'), // Testnet demo: Oct 1, 2025
  SNAPSHOT_DATE: new Date('2026-03-31T23:59:59Z'),
  MAX_PIXELS: 2500,
  MINTER_MULTIPLIER: 1.0, // 100% points for original minters
  HOLDER_MULTIPLIER: 0.25, // 25% points for secondary market holders
} as const;

export const MONTHLY_MULTIPLIERS = {
  '2025-10': { multiplier: 1.0, days: 31, label: 'October 2025' }, // Testnet demo
  '2025-11': { multiplier: 1.0, days: 30, label: 'November 2025' }, // Testnet demo
  '2025-12': { multiplier: 2.0, days: 31, label: 'December 2025' },
  '2026-01': { multiplier: 1.5, days: 31, label: 'January 2026' },
  '2026-02': { multiplier: 1.25, days: 28, label: 'February 2026' },
  '2026-03': { multiplier: 1.0, days: 31, label: 'March 2026' },
} as const;

export type MonthKey = keyof typeof MONTHLY_MULTIPLIERS;

export function getMonthKey(date: Date): MonthKey | null {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const key = `${year}-${month}` as MonthKey;
  return MONTHLY_MULTIPLIERS[key] ? key : null;
}

export function calculateWeightedDays(): number {
  let totalWeightedDays = 0;
  for (const config of Object.values(MONTHLY_MULTIPLIERS)) {
    totalWeightedDays += config.days * config.multiplier;
  }
  return totalWeightedDays;
}

export function calculateDailyPointsPerPixel(): number {
  const totalWeightedDays = calculateWeightedDays();
  return GOVERNANCE_CONFIG.TOTAL_PARTICIPANT_POINTS / (GOVERNANCE_CONFIG.MAX_PIXELS * totalWeightedDays);
}

export function getTierMultiplier(tier: string): number {
  switch (tier) {
    case 'legendary': return 4.0;
    case 'epic': return 2.5;
    case 'rare': return 1.5;
    case 'common': return 1.0;
    default: return 1.0;
  }
}

export interface DailyPointsBreakdown {
  date: Date;
  monthKey: MonthKey;
  monthMultiplier: number;
  tierMultiplier: number;
  ownershipMultiplier: number; // 1.0 for minter, 0.25 for holder
  basePoints: number;
  totalPoints: number;
  isMinter: boolean;
}

export function calculateUserPoints(
  pixels: Pixel[], 
  userId: string, 
  currentDate: Date = new Date(),
  referralBoostLevel: number = 0,
  referralBoostExpiresAt: Date | null = null,
  isFounder: boolean = false
): {
  totalPoints: number;
  estimatedTokens: number;
  dailyPointRate: number;
  breakdown: DailyPointsBreakdown[];
  pixelCount: number;
  minterPixelCount: number;
  holderPixelCount: number;
} {
  // All pixel owners earn governance points
  // Original minters earn 1.0x points, secondary holders earn 0.25x points
  // The ownership multiplier below handles this differentiation
  
  const snapshotDate = GOVERNANCE_CONFIG.SNAPSHOT_DATE;
  const effectiveEndDate = currentDate > snapshotDate ? snapshotDate : currentDate;
  
  const basePointsPerPixelPerDay = calculateDailyPointsPerPixel();
  
  let totalPoints = 0;
  const breakdown: DailyPointsBreakdown[] = [];
  let currentDailyRate = 0;
  let minterPixelCount = 0;
  let holderPixelCount = 0;

  for (const pixel of pixels) {
    if (!pixel.mintedAt || !pixel.claimed) continue;
    
    const isMinter = pixel.minterId === userId;
    const ownershipMultiplier = isMinter ? GOVERNANCE_CONFIG.MINTER_MULTIPLIER : GOVERNANCE_CONFIG.HOLDER_MULTIPLIER;
    
    // For minters, use mintedAt. For holders, use ownerSince (when they acquired it)
    const startDate = isMinter ? new Date(pixel.mintedAt) : (pixel.ownerSince ? new Date(pixel.ownerSince) : new Date(pixel.mintedAt));
    
    if (startDate > effectiveEndDate) continue;
    
    if (isMinter) {
      minterPixelCount++;
    } else {
      holderPixelCount++;
    }
    
    let currentDay = new Date(startDate);
    currentDay.setUTCHours(0, 0, 0, 0);
    
    const mintDayStart = new Date(currentDay);
    
    while (currentDay <= effectiveEndDate) {
      const monthKey = getMonthKey(currentDay);
      if (!monthKey) {
        currentDay.setUTCDate(currentDay.getUTCDate() + 1);
        continue;
      }
      
      const monthConfig = MONTHLY_MULTIPLIERS[monthKey];
      const tierMultiplier = getTierMultiplier(pixel.tier);
      const basePoints = basePointsPerPixelPerDay;
      const fullDayPoints = basePoints * monthConfig.multiplier * tierMultiplier * ownershipMultiplier;
      
      let dailyPoints = fullDayPoints;
      
      // Calculate partial day for mint day
      const isMintDay = currentDay.getTime() === mintDayStart.getTime();
      const isCurrentDay = currentDay.toDateString() === effectiveEndDate.toDateString();
      
      if (isMintDay) {
        const totalMsInDay = 24 * 60 * 60 * 1000;
        let endOfPeriod: Date;
        
        // If start day is also current day, calculate from start to now
        // Otherwise, calculate from start to end of start day
        if (isCurrentDay) {
          endOfPeriod = effectiveEndDate;
        } else {
          endOfPeriod = new Date(currentDay);
          endOfPeriod.setUTCHours(23, 59, 59, 999);
        }
        
        const msFromStartToEnd = endOfPeriod.getTime() - startDate.getTime();
        const fractionOfDay = Math.max(0, Math.min(1, msFromStartToEnd / totalMsInDay));
        dailyPoints = fullDayPoints * fractionOfDay;
      }
      // Calculate partial day for current day (if not the mint day)
      else if (isCurrentDay) {
        const dayStart = new Date(currentDay);
        dayStart.setUTCHours(0, 0, 0, 0);
        const totalMsInDay = 24 * 60 * 60 * 1000;
        const msFromStartToNow = effectiveEndDate.getTime() - dayStart.getTime();
        const fractionOfDay = Math.max(0, Math.min(1, msFromStartToNow / totalMsInDay));
        dailyPoints = fullDayPoints * fractionOfDay;
      }
      
      totalPoints += dailyPoints;
      
      const isToday = currentDay.toDateString() === currentDate.toDateString();
      if (isToday) {
        currentDailyRate += fullDayPoints;
      }
      
      breakdown.push({
        date: new Date(currentDay),
        monthKey,
        monthMultiplier: monthConfig.multiplier,
        tierMultiplier,
        ownershipMultiplier,
        basePoints,
        totalPoints: dailyPoints,
        isMinter,
      });
      
      currentDay.setUTCDate(currentDay.getUTCDate() + 1);
    }
  }
  
  // Apply referral boost if active
  const isBoostActive = referralBoostExpiresAt && referralBoostExpiresAt > currentDate;
  if (isBoostActive && referralBoostLevel > 0) {
    const boostMultiplier = 1 + (referralBoostLevel / 100); // 20 = 0.2x, 100 = 1.0x
    totalPoints = totalPoints * boostMultiplier;
    currentDailyRate = currentDailyRate * boostMultiplier;
  }
  
  const estimatedTokens = Math.floor(totalPoints / GOVERNANCE_CONFIG.POINTS_PER_TOKEN);
  
  return {
    totalPoints: Math.floor(totalPoints),
    estimatedTokens,
    dailyPointRate: Math.floor(currentDailyRate),
    breakdown,
    pixelCount: pixels.filter(p => p.claimed).length,
    minterPixelCount,
    holderPixelCount,
  };
}

export function getDaysUntilSnapshot(currentDate: Date = new Date()): number {
  const snapshot = GOVERNANCE_CONFIG.SNAPSHOT_DATE;
  const diffMs = snapshot.getTime() - currentDate.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export function formatTokenAmount(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(2)}M`;
  } else if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(2)}K`;
  }
  return amount.toLocaleString();
}
