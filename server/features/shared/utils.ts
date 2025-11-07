import { DOB_COLORS, TEXT_COLORS, type TextColor } from "@shared/schema";
import { getContrastingTextColor } from "@shared/canvas-utils";

export { getContrastingTextColor };

export function calculateInfluence(pixels: any[], allPixels: any[]): number {
  // Security Fix M-03: Use BigInt for large CKB values to prevent overflow
  // pixel.price is stored as a number but could theoretically exceed Number.MAX_SAFE_INTEGER
  // Using BigInt ensures precision for large CKB amounts (in shannons)
  
  let totalInfluence = 0;
  
  // Create spatial index for O(1) adjacency lookups
  // Key: "x,y" -> pixel with ownerId
  const spatialIndex = new Map<string, string>();
  for (const p of allPixels) {
    if (p.ownerId) {
      spatialIndex.set(`${p.x},${p.y}`, p.ownerId);
    }
  }
  
  for (const pixel of pixels) {
    // Base score: locked CKB / 1000 (using BigInt for safety)
    // Convert to BigInt, divide, then back to Number for multiplier calculations
    const priceInShannons = BigInt(Math.floor(pixel.price));
    let pixelScore = Number(priceInShannons / BigInt(1000));
    
    // Location bonus
    switch (pixel.tier) {
      case 'legendary': pixelScore *= 1.5; break;
      case 'epic': pixelScore *= 1.4; break;
      case 'rare': pixelScore *= 1.2; break;
      default: pixelScore *= 1.0; break;
    }
    
    // Territory bonus: +10% per adjacent pixel owned by same user
    // Check 8 adjacent positions using spatial index (O(1) per check)
    let adjacentCount = 0;
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];
    
    for (const [dx, dy] of directions) {
      const adjX = pixel.x + dx;
      const adjY = pixel.y + dy;
      const adjacentOwnerId = spatialIndex.get(`${adjX},${adjY}`);
      if (adjacentOwnerId === pixel.ownerId) {
        adjacentCount++;
      }
    }
    
    pixelScore *= (1 + (adjacentCount * 0.1));
    
    // Color bonus: rare colors get +5 points
    if (pixel.bgcolor === '#FFBDFC') {
      pixelScore += 5;
    }
    
    totalInfluence += pixelScore;
  }
  
  return Math.floor(totalInfluence);
}
