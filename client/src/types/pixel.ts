export type { PixelTier } from "@shared/canvas-utils";
import type { PixelTier } from "@shared/canvas-utils";
import type { Transaction as DBTransaction } from "@shared/schema";

export interface PixelData {
  id: string;
  x: number;
  y: number;
  tier: PixelTier;
  price: number;
  claimed: boolean;
  bgcolor: string | null;
  textColor: string | null;
  ownerId: string | null;
  minterId: string | null;
  ownerSince: Date | null;
  ownerAddress: string | null;
  sporeId: string | null;
  sporeTxHash: string | null;
  claimedAt: Date | null;
  tierMintNumber: number | null;
  globalMintNumber: number | null;
  createdAt: Date;
}

export interface UserData {
  id: string;
  address: string;
  influence: number;
  totalCkb: number;
  pixelCount: number;
  createdAt: Date;
}

export interface CanvasStats {
  totalPixels: number;
  claimedPixels: number;
  remainingPixels: number;
  totalCKBLocked: number;
  activeFounders: number;
  tierCounts: Record<PixelTier, number>;
  tierTotals: Record<PixelTier, number>;
}

export interface ClaimPixelRequest {
  x: number;
  y: number;
  userAddress: string;
  txHash?: string;
  sporeId?: string;
}

export interface TransferPixelRequest {
  pixelId: string;
  toAddress: string;
  fromAddress: string;
}

export interface BurnPixelRequest {
  pixelId: string;
  userAddress: string;
}

export type Transaction = DBTransaction;
