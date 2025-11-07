export type PixelTier = 'legendary' | 'epic' | 'rare' | 'common';

// Platform fees (in CKB) - tier-based for minting
export function getPlatformFee(tier: PixelTier): number {
  switch (tier) {
    case 'legendary': return 5000;
    case 'epic': return 2500;
    case 'rare': return 1000;
    case 'common': return 500;
  }
}

export const TRANSFER_FEE_CKB = 150;      // Charged on every pixel transfer
export const MELT_FEE_CKB = 150;          // Charged on every pixel melt

// Admin wallet addresses for platform fee collection
export const ADMIN_WALLET_TESTNET = 'ckt1qrfrwcdnvssswdwpn3s9v8fp87emat306ctjwsm3nmlkjg8qyza2cqgqq9x75zu4l7gld606r6eyd00m4lzy3zkxkq4nywzu';
export const ADMIN_WALLET_MAINNET = 'ckb1qrgqep8saj8agswr30pls73hra28ry8jlnlc3ejzh3dl2ju7xxpjxqgqq9fwtuqzxaww3afzur45fntyhhrvnrplq5se06q0';

export function calculateTierFromDistance(distance: number): PixelTier {
  if (distance <= 6) return 'legendary';
  if (distance <= 12) return 'epic';
  if (distance <= 20) return 'rare';
  return 'common';
}

export function calculatePriceFromTier(tier: PixelTier, distance: number): number {
  switch (tier) {
    case 'legendary': return 100000;
    case 'epic': return 50000;
    case 'rare': return 25000;
    case 'common': return 5000;
  }
}

export function getManhattanDistance(x: number, y: number): number {
  return Math.abs(x - 25) + Math.abs(y - 25);
}

export function getContrastingTextColor(bgcolor: string): string {
  switch (bgcolor) {
    case '#DBAB00': return '#000000';
    case '#FFBDFC': return '#000000';
    case '#09D3FF': return '#000000';
    case '#66C084': return '#FFFFFF';
    default: return '#FFFFFF';
  }
}

export function getTierColor(tier: PixelTier): string {
  switch (tier) {
    case 'legendary': return '#DBAB00'; // Gold for legendary
    case 'epic': return '#FFBDFC';      // Pink for epic  
    case 'rare': return '#09D3FF';      // Blue for rare
    case 'common': return '#66C084';    // Green for common
  }
}

export function formatPixelText(x: number, y: number, tier: PixelTier, price: number): string {
  const tierCapitalized = tier.charAt(0).toUpperCase() + tier.slice(1);
  return `x: ${x}, y: ${y}, ${tierCapitalized}, ${price.toLocaleString()} CKB`;
}

export function getTierDisplayName(tier: string): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}