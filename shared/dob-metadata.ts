import { DOB_COLORS, TEXT_COLORS, type DOBColor, type TextColor } from "./schema";

// SoMo Pixel DOB/0 pattern using Colorful Loot style (DOB/0 cookbook)
// DNA structure: 10 bytes total (20 hex chars)
// - prev.bgcolor: 1 byte (offset 0) - Visual background color
// - prev<%k: %v>: 1 byte (offset 1) - Visual text color with label
// - Tier: 1 byte (offset 2)  
// - CoordX: 1 byte (offset 3) - values 0-49
// - CoordY: 1 byte (offset 4) - values 0-49
// - CKB Locked: 1 byte (offset 5) - Option index (0-3) for ["5k", "25k", "50k", "100k"]
// - Tier Mint Number: 2 bytes (offset 6-7) - Permanent tier sequence (e.g., #12/85), little-endian
// - Global Mint Number: 2 bytes (offset 8-9) - Incremental mint counter, little-endian
export const SOMO_DOB_PATTERN = [
  {
    traitName: "prev.bgcolor",  // Special prefix: renders background color visually
    dobType: "String" as const,
    dnaOffset: 0,
    dnaLength: 1,
    patternType: "options" as const,
    traitArgs: [...DOB_COLORS],
  },
  {
    traitName: "prev<%k: %v>",  // Special format: renders text color and shows "TextColor: #FFFFFF"
    dobType: "String" as const,
    dnaOffset: 1,
    dnaLength: 1,
    patternType: "options" as const,
    traitArgs: [...TEXT_COLORS],
  },
  {
    traitName: "Tier",
    dobType: "String" as const,
    dnaOffset: 2,
    dnaLength: 1,
    patternType: "options" as const,
    traitArgs: ["legendary", "epic", "rare", "common"],
  },
  {
    traitName: "CoordX",
    dobType: "Number" as const,
    dnaOffset: 3,
    dnaLength: 1,
    patternType: "rawNumber" as const,
  },
  {
    traitName: "CoordY",
    dobType: "Number" as const,
    dnaOffset: 4,
    dnaLength: 1,
    patternType: "rawNumber" as const,
  },
  {
    traitName: "CKB",
    dobType: "String" as const,
    dnaOffset: 5,
    dnaLength: 1,
    patternType: "options" as const,
    traitArgs: ["5k locked", "25k locked", "50k locked", "100k locked"],
  },
  {
    traitName: "Tier Mint #",
    dobType: "Number" as const,
    dnaOffset: 6,
    dnaLength: 2,
    patternType: "rawNumber" as const,
  },
  {
    traitName: "Global Mint #",
    dobType: "Number" as const,
    dnaOffset: 8,
    dnaLength: 2,
    patternType: "rawNumber" as const,
  },
];

// Helper to get bgcolor index from color
export const getBgColorIndex = (color: DOBColor): number => {
  const index = DOB_COLORS.indexOf(color);
  if (index === -1) {
    throw new Error(`Invalid background color: ${color}. Must be one of: ${DOB_COLORS.join(', ')}`);
  }
  return index;
};

// Helper to get text color index from color
export const getTextColorIndex = (color: TextColor): number => {
  const index = TEXT_COLORS.indexOf(color);
  if (index === -1) {
    throw new Error(`Invalid text color: ${color}. Must be one of: ${TEXT_COLORS.join(', ')}`);
  }
  return index;
};

// Helper to get tier index
export const getTierIndex = (tier: string): number => {
  const tiers = ["legendary", "epic", "rare", "common"];
  const index = tiers.indexOf(tier);
  if (index === -1) {
    throw new Error(`Invalid tier: ${tier}. Must be one of: ${tiers.join(', ')}`);
  }
  return index;
};

// Helper to get CKB display option index (maps CKB amount to formatted string option)
export const getCKBOptionIndex = (ckbLocked: number): number => {
  // Map CKB amounts to display options: ["5k", "25k", "50k", "100k"]
  const ckbToIndex: Record<number, number> = {
    5000: 0,    // "5k" - Common tier
    25000: 1,   // "25k" - Rare tier
    50000: 2,   // "50k" - Epic tier
    100000: 3,  // "100k" - Legendary tier
  };
  
  const index = ckbToIndex[ckbLocked];
  if (index === undefined) {
    throw new Error(`Invalid CKB amount: ${ckbLocked}. Must be one of: 5000, 25000, 50000, 100000`);
  }
  return index;
};

// Generate DNA for a pixel
export const generatePixelDNA = (
  bgcolor: DOBColor,
  textColor: TextColor,
  tier: string,
  x: number,
  y: number,
  ckbLocked: number,
  tierMintNumber: number,
  globalMintNumber: number
): string => {
  // Validate coordinates are integers in valid range
  if (!Number.isInteger(x)) {
    throw new Error(`X coordinate must be an integer, got: ${x}`);
  }
  if (!Number.isInteger(y)) {
    throw new Error(`Y coordinate must be an integer, got: ${y}`);
  }
  if (x < 0 || x > 49) {
    throw new Error(`Invalid X coordinate: ${x}. Must be between 0 and 49`);
  }
  if (y < 0 || y > 49) {
    throw new Error(`Invalid Y coordinate: ${y}. Must be between 0 and 49`);
  }
  
  // Validate mint numbers (allow 0 as placeholder for frontend minting)
  if (!Number.isInteger(tierMintNumber) || tierMintNumber < 0 || tierMintNumber > 65535) {
    throw new Error(`Invalid tier mint number: ${tierMintNumber}. Must be integer between 0 and 65535`);
  }
  if (!Number.isInteger(globalMintNumber) || globalMintNumber < 0 || globalMintNumber > 65535) {
    throw new Error(`Invalid global mint number: ${globalMintNumber}. Must be integer between 0 and 65535`);
  }
  
  // Get validated indices (will throw if invalid color/tier/ckb)
  // Each value must match its byte allocation in the pattern:
  // bgcolor: 1 byte = 2 hex chars
  // textColor: 1 byte = 2 hex chars
  // tier: 1 byte = 2 hex chars
  // x: 1 byte = 2 hex chars (0-49 fits in 1 byte)
  // y: 1 byte = 2 hex chars (0-49 fits in 1 byte)
  // ckb: 1 byte = 2 hex chars (option index 0-3)
  // tierMintNumber: 2 bytes = 4 hex chars (big-endian)
  // globalMintNumber: 2 bytes = 4 hex chars (big-endian)
  // Total: 10 bytes = 20 hex chars
  const bgIndex = getBgColorIndex(bgcolor).toString(16).padStart(2, "0");
  const textIndex = getTextColorIndex(textColor).toString(16).padStart(2, "0");
  const tierIndex = getTierIndex(tier).toString(16).padStart(2, "0");
  const xHex = x.toString(16).padStart(2, "0");
  const yHex = y.toString(16).padStart(2, "0");
  
  // CKB uses options pattern: map CKB amount to display string index
  // Store index (0-3) as 1-byte value (2 hex chars)
  const ckbOptionIndex = getCKBOptionIndex(ckbLocked);
  const ckbHex = ckbOptionIndex.toString(16).padStart(2, "0");
  
  // Encode mint numbers as 2-byte little-endian values (DOB/0 decoder expects little-endian)
  // For little-endian: low byte first, high byte second
  // Example: number 1 (0x0001) → encode as "0100" (byte swap)
  const tierMintLowByte = (tierMintNumber & 0xFF).toString(16).padStart(2, "0");
  const tierMintHighByte = ((tierMintNumber >> 8) & 0xFF).toString(16).padStart(2, "0");
  const tierMintHex = tierMintLowByte + tierMintHighByte;
  
  const globalMintLowByte = (globalMintNumber & 0xFF).toString(16).padStart(2, "0");
  const globalMintHighByte = ((globalMintNumber >> 8) & 0xFF).toString(16).padStart(2, "0");
  const globalMintHex = globalMintLowByte + globalMintHighByte;
  
  const dna = `${bgIndex}${textIndex}${tierIndex}${xHex}${yHex}${ckbHex}${tierMintHex}${globalMintHex}`;
  
  // Final validation: DNA length must be exactly 20 hex chars (10 bytes), all valid hex characters
  if (dna.length !== 20) {
    throw new Error(`Invalid DNA length: ${dna.length}, expected 20. DNA: ${dna}`);
  }
  if (!/^[0-9a-f]{20}$/i.test(dna)) {
    throw new Error(`DNA contains invalid hex characters: ${dna}`);
  }
  
  return dna;
};

// DOB/0 cluster metadata structure (legacy - kept for compatibility)
export interface DOBClusterMetadata {
  description: string;
  dob: {
    ver: number;
    decoder: {
      type: string;
      hash: string;
    };
    pattern: any[];
  };
}

// Create DOB/0 cluster metadata for SoMo
// This returns the pattern configuration that will be encoded by CCC SDK
// Uses Colorful Loot style with prev.bgcolor and prev<%k: %v> for visual rendering
export const createSoMoClusterMetadata = () => {
  return {
    description: "SoMo (Social Movement) - A collaborative 50x50 pixel art canvas where each pixel is a colorful Spore NFT with tier-based rarity, visual colors, and CKB value locked inside",
    dob: {
      ver: 0,
      // CCC SDK will use getDecoder() to get the correct decoder for the network
      decoder: {
        type: "code_hash" as const,
        hash: "0x13cac78ad8482202f18f9df4ea707611c35f994375fa03ae79121312dda9925c", // DOB/0 universal decoder
      },
      pattern: SOMO_DOB_PATTERN,
    },
  };
};

// Create DOB/0 content for pixel Spore
export interface PixelDOBContent {
  dna: string;
}

export const createPixelDOBContent = (
  bgcolor: DOBColor,
  textColor: TextColor,
  tier: string,
  x: number,
  y: number,
  ckbLocked: number,
  tierMintNumber: number,
  globalMintNumber: number
): PixelDOBContent => {
  return {
    dna: generatePixelDNA(bgcolor, textColor, tier, x, y, ckbLocked, tierMintNumber, globalMintNumber),
  };
};

// Decoded pixel DNA data
export interface DecodedPixelDNA {
  bgcolor: DOBColor;
  textColor: TextColor;
  tier: string;
  x: number;
  y: number;
  ckbLocked: number;
  tierMintNumber: number;
  globalMintNumber: number;
}

// Decode DNA hex string back to pixel data
export const decodePixelDNA = (dnaHex: string): DecodedPixelDNA => {
  // Validate DNA format - support both old (12 chars) and new (20 chars) format
  if (!/^[0-9a-f]{12}$/i.test(dnaHex) && !/^[0-9a-f]{20}$/i.test(dnaHex)) {
    throw new Error(`Invalid DNA format: ${dnaHex}. Must be 12 or 20 hex characters`);
  }

  // Extract bytes (each 2 hex chars = 1 byte)
  const bgIndex = parseInt(dnaHex.substring(0, 2), 16);
  const textIndex = parseInt(dnaHex.substring(2, 4), 16);
  const tierIndex = parseInt(dnaHex.substring(4, 6), 16);
  const x = parseInt(dnaHex.substring(6, 8), 16);
  const y = parseInt(dnaHex.substring(8, 10), 16);
  const ckbIndex = parseInt(dnaHex.substring(10, 12), 16);

  // Map indices back to values
  const bgcolor = DOB_COLORS[bgIndex];
  if (!bgcolor) {
    throw new Error(`Invalid bgcolor index: ${bgIndex}`);
  }

  const textColor = TEXT_COLORS[textIndex];
  if (!textColor) {
    throw new Error(`Invalid textColor index: ${textIndex}`);
  }

  const tiers = ["legendary", "epic", "rare", "common"];
  const tier = tiers[tierIndex];
  if (!tier) {
    throw new Error(`Invalid tier index: ${tierIndex}`);
  }

  // Map CKB index back to amount
  const ckbAmounts = [5000, 25000, 50000, 100000];
  const ckbLocked = ckbAmounts[ckbIndex];
  if (ckbLocked === undefined) {
    throw new Error(`Invalid CKB index: ${ckbIndex}`);
  }

  // Decode mint numbers if present (new format with 20 hex chars)
  // Numbers are stored in little-endian format: low byte first, high byte second
  let tierMintNumber = 0;
  let globalMintNumber = 0;
  if (dnaHex.length === 20) {
    // Extract bytes in little-endian order
    const tierMintLowByte = parseInt(dnaHex.substring(12, 14), 16);
    const tierMintHighByte = parseInt(dnaHex.substring(14, 16), 16);
    tierMintNumber = tierMintLowByte | (tierMintHighByte << 8);
    
    const globalMintLowByte = parseInt(dnaHex.substring(16, 18), 16);
    const globalMintHighByte = parseInt(dnaHex.substring(18, 20), 16);
    globalMintNumber = globalMintLowByte | (globalMintHighByte << 8);
  }

  return {
    bgcolor,
    textColor,
    tier,
    x,
    y,
    ckbLocked,
    tierMintNumber,
    globalMintNumber,
  };
};
