import { type Pixel, type InsertPixel, type MintCounter, type InsertMintCounter, pixels, mintCounters } from "@shared/schema";
import { db } from "../../db";
import { eq, and, asc, sql } from "drizzle-orm";

export interface IPixelStorage {
  getPixel(x: number, y: number): Promise<Pixel | undefined>;
  getPixelById(id: string): Promise<Pixel | undefined>;
  getAllPixels(): Promise<Pixel[]>;
  getClaimedPixels(): Promise<Pixel[]>;
  createPixel(pixel: InsertPixel): Promise<Pixel>;
  updatePixel(id: string, updates: Partial<Pixel>): Promise<Pixel | undefined>;
  getUserPixels(userId: string): Promise<Pixel[]>;
  getUserMintedPixel(userId: string): Promise<Pixel | null>;
  hasUserMintedAnyPixel(userId: string): Promise<boolean>;
  getNextTierMintNumber(tier: string): Promise<number>;
  getNextGlobalMintNumber(): Promise<number>;
  incrementTierMintNumber(tier: string): Promise<number>;
  incrementGlobalMintNumber(): Promise<number>;
  atomicReservePixel(pixelId: string, userId: string, tier: string): Promise<{ tierMintNumber: number; globalMintNumber: number; wasReserved: boolean }>;
  initializeMintCounters(): Promise<void>;
  initializeCanvas(): Promise<void>;
  recalculateTiers(): Promise<void>;
}

export class PixelStorage implements IPixelStorage {
  async initializeCanvas() {
    try {
      // Check if pixels are already initialized
      const existingPixels = await db.select().from(pixels).limit(1);
      if (existingPixels.length > 0) {
        return; // Canvas already initialized
      }
    } catch (error: any) {
      if (error?.code === '42P01') {
        console.error('\n❌ Database tables do not exist!');
        console.error('📝 To fix this issue:');
        console.error('   1. Run: npm run db:push');
        console.error('   2. Then restart the application\n');
      }
      throw error;
    }

    // Initialize all 2,500 pixels as unclaimed
    const pixelData: InsertPixel[] = [];
    for (let x = 0; x < 50; x++) {
      for (let y = 0; y < 50; y++) {
        // Center of 50x50 grid (0-49) is at 24.5, so we calculate distance from (24.5, 24.5)
        const distance = Math.abs(x - 24.5) + Math.abs(y - 24.5);
        let tier: string;
        let price: number;
        
        if (distance <= 6) {
          tier = 'legendary';
          price = 100000;
        } else if (distance <= 12) {
          tier = 'epic';
          price = 50000;
        } else if (distance <= 20) {
          tier = 'rare';
          price = 25000;
        } else {
          tier = 'common';
          price = 5000;
        }

        pixelData.push({
          x,
          y,
          tier,
          price,
          claimed: false,
          bgcolor: null,
          textColor: null,
          ownerId: null,
          sporeId: null,
          sporeTxHash: null,
          mintedAt: null,
          claimedAt: null,
        });
      }
    }

    // Batch insert all pixels
    await db.insert(pixels).values(pixelData);
  }

  async getPixel(x: number, y: number): Promise<Pixel | undefined> {
    const [pixel] = await db
      .select()
      .from(pixels)
      .where(and(eq(pixels.x, x), eq(pixels.y, y)));
    return pixel || undefined;
  }

  async getPixelById(id: string): Promise<Pixel | undefined> {
    const [pixel] = await db.select().from(pixels).where(eq(pixels.id, id));
    return pixel || undefined;
  }

  async getAllPixels(): Promise<Pixel[]> {
    return await db.select().from(pixels)
      .orderBy(asc(pixels.y), asc(pixels.x)); // Order by row (y) then column (x) to match grid layout
  }

  async getClaimedPixels(): Promise<Pixel[]> {
    return await db.select().from(pixels).where(eq(pixels.claimed, true));
  }

  async createPixel(pixel: InsertPixel): Promise<Pixel> {
    const [newPixel] = await db
      .insert(pixels)
      .values(pixel)
      .returning();
    return newPixel;
  }

  async updatePixel(id: string, updates: Partial<Pixel>): Promise<Pixel | undefined> {
    const [updatedPixel] = await db
      .update(pixels)
      .set(updates)
      .where(eq(pixels.id, id))
      .returning();
    return updatedPixel || undefined;
  }

  async getUserPixels(userId: string): Promise<Pixel[]> {
    return await db
      .select()
      .from(pixels)
      .where(eq(pixels.ownerId, userId));
  }

  async getUserMintedPixel(userId: string): Promise<Pixel | null> {
    // Get the single pixel that the user originally minted (regardless of current ownership)
    // Enforces the 1-pixel-per-wallet rule - users can only mint ONE pixel total
    // CRITICAL: Check minterId not ownerId - transfers don't free the slot, only melting does
    // Must match logic in hasUserMintedAnyPixel to prevent stale data after melting
    const [result] = await db
      .select()
      .from(pixels)
      .where(
        and(
          eq(pixels.minterId, userId),
          eq(pixels.claimed, true)
        )
      )
      .limit(1);
    
    return result || null;
  }

  async hasUserMintedAnyPixel(userId: string): Promise<boolean> {
    // Check if user has EVER minted a pixel that is still claimed
    // This enforces the 1-pixel-per-wallet restriction for maximum decentralization (2,500 unique founders)
    // Users can only mint again after MELTING their pixel (not transferring)
    // CRITICAL: Check minterId not ownerId - transfers don't free the slot, only melting does
    const [result] = await db
      .select({
        id: pixels.id,
      })
      .from(pixels)
      .where(
        and(
          eq(pixels.minterId, userId),
          eq(pixels.claimed, true)
        )
      )
      .limit(1);
    
    return !!result;
  }

  async getNextTierMintNumber(tier: string): Promise<number> {
    // Count all pixels that have EVER been assigned a tier mint number in this tier
    // This number is permanent per coordinate - even if melted, the coordinate keeps its number
    // 
    // NOTE: This implementation has a race condition - concurrent claims could get duplicate numbers
    // TODO: Add database-level atomicity (e.g., dedicated counter table with FOR UPDATE locking)
    // For now, this works for low-concurrency scenarios
    const assignedCount = await db
      .select()
      .from(pixels)
      .where(eq(pixels.tier, tier));
    
    const countWithNumber = assignedCount.filter(p => p.tierMintNumber !== null).length;
    return countWithNumber + 1;
  }

  async getNextGlobalMintNumber(): Promise<number> {
    // DEPRECATED: Use incrementGlobalMintNumber() instead for atomic operation
    // This method remains for backward compatibility but has race conditions
    const allPixels = await db.select().from(pixels);
    
    const countWithNumber = allPixels.filter(p => p.globalMintNumber !== null).length;
    return countWithNumber + 1;
  }

  async initializeMintCounters(): Promise<void> {
    // Initialize mint counters based on current pixel state
    // This should be called once during deployment or when setting up the counters
    
    const tiers = ['legendary', 'epic', 'rare', 'common'];
    
    // Initialize tier counters
    for (const tier of tiers) {
      const tierPixels = await db
        .select()
        .from(pixels)
        .where(eq(pixels.tier, tier));
      
      const currentCount = tierPixels.filter(p => p.tierMintNumber !== null).length;
      
      // Insert or update counter
      await db
        .insert(mintCounters)
        .values({
          counterType: tier,
          value: currentCount,
        })
        .onConflictDoUpdate({
          target: mintCounters.counterType,
          set: { 
            value: currentCount,
            updatedAt: sql`NOW()`,
          },
        });
    }
    
    // Initialize global counter
    const allPixels = await db.select().from(pixels);
    const globalCount = allPixels.filter(p => p.globalMintNumber !== null).length;
    
    await db
      .insert(mintCounters)
      .values({
        counterType: 'global',
        value: globalCount,
      })
      .onConflictDoUpdate({
        target: mintCounters.counterType,
        set: { 
          value: globalCount,
          updatedAt: sql`NOW()`,
        },
      });
  }

  async incrementTierMintNumber(tier: string): Promise<number> {
    // Atomic increment using SELECT FOR UPDATE to prevent race conditions
    // This ensures unique tier mint numbers even under concurrent minting
    
    return await db.transaction(async (tx) => {
      // Lock the counter row for this tier
      const [counter] = await tx
        .select()
        .from(mintCounters)
        .where(eq(mintCounters.counterType, tier))
        .for('update');
      
      if (!counter) {
        // Counter doesn't exist, create it
        await tx.insert(mintCounters).values({
          counterType: tier,
          value: 1,
        });
        return 1;
      }
      
      // Increment the counter
      const newValue = counter.value + 1;
      await tx
        .update(mintCounters)
        .set({ 
          value: newValue,
          updatedAt: sql`NOW()`,
        })
        .where(eq(mintCounters.counterType, tier));
      
      return newValue;
    });
  }

  async incrementGlobalMintNumber(): Promise<number> {
    // Atomic increment using SELECT FOR UPDATE to prevent race conditions
    // This ensures unique global mint numbers even under concurrent minting
    
    return await db.transaction(async (tx) => {
      // Lock the global counter row
      const [counter] = await tx
        .select()
        .from(mintCounters)
        .where(eq(mintCounters.counterType, 'global'))
        .for('update');
      
      if (!counter) {
        // Counter doesn't exist, create it
        await tx.insert(mintCounters).values({
          counterType: 'global',
          value: 1,
        });
        return 1;
      }
      
      // Increment the counter
      const newValue = counter.value + 1;
      await tx
        .update(mintCounters)
        .set({ 
          value: newValue,
          updatedAt: sql`NOW()`,
        })
        .where(eq(mintCounters.counterType, 'global'));
      
      return newValue;
    });
  }

  async atomicReservePixel(pixelId: string, userId: string, tier: string): Promise<{ tierMintNumber: number; globalMintNumber: number; wasReserved: boolean }> {
    // Atomically reserve a pixel with mint numbers to prevent race conditions
    // Returns mint numbers (either newly assigned or existing if pixel was already reserved by same user)
    
    return await db.transaction(async (tx) => {
      const RESERVATION_TTL_MS = 5 * 60 * 1000; // 5 minutes
      
      // Lock the pixel row to prevent concurrent reservations
      const [pixel] = await tx
        .select()
        .from(pixels)
        .where(eq(pixels.id, pixelId))
        .for('update');
      
      if (!pixel) {
        throw new Error('Pixel not found');
      }
      
      // Check if pixel is already reserved
      if (pixel.reservedByUserId && pixel.reservedAt) {
        const reservationAge = Date.now() - pixel.reservedAt.getTime();
        
        // If reservation is still valid (not expired)
        if (reservationAge < RESERVATION_TTL_MS) {
          // Same user re-preparing - return existing reservation numbers
          if (pixel.reservedByUserId === userId) {
            return {
              tierMintNumber: pixel.reservedTierMintNumber!,
              globalMintNumber: pixel.reservedGlobalMintNumber!,
              wasReserved: true
            };
          }
          
          // Different user - reject
          throw new Error('Pixel is currently reserved by another user');
        }
        
        // Reservation expired - will be re-reserved below
      }
      
      // Get tier mint number (only if never assigned before)
      let tierMintNumber = pixel.tierMintNumber;
      if (!tierMintNumber) {
        // Lock and increment tier counter
        const [tierCounter] = await tx
          .select()
          .from(mintCounters)
          .where(eq(mintCounters.counterType, tier))
          .for('update');
        
        if (!tierCounter) {
          await tx.insert(mintCounters).values({
            counterType: tier,
            value: 1,
          });
          tierMintNumber = 1;
        } else {
          tierMintNumber = tierCounter.value + 1;
          await tx
            .update(mintCounters)
            .set({ 
              value: tierMintNumber,
              updatedAt: sql`NOW()`,
            })
            .where(eq(mintCounters.counterType, tier));
        }
      }
      
      // Lock and increment global counter (always increment)
      const [globalCounter] = await tx
        .select()
        .from(mintCounters)
        .where(eq(mintCounters.counterType, 'global'))
        .for('update');
      
      let globalMintNumber: number;
      if (!globalCounter) {
        await tx.insert(mintCounters).values({
          counterType: 'global',
          value: 1,
        });
        globalMintNumber = 1;
      } else {
        globalMintNumber = globalCounter.value + 1;
        await tx
          .update(mintCounters)
          .set({ 
            value: globalMintNumber,
            updatedAt: sql`NOW()`,
          })
          .where(eq(mintCounters.counterType, 'global'));
      }
      
      // Update pixel with reservation
      await tx
        .update(pixels)
        .set({
          reservedByUserId: userId,
          reservedAt: new Date(),
          reservedTierMintNumber: tierMintNumber,
          reservedGlobalMintNumber: globalMintNumber,
        })
        .where(eq(pixels.id, pixelId));
      
      return {
        tierMintNumber,
        globalMintNumber,
        wasReserved: false
      };
    });
  }

  async recalculateTiers(): Promise<void> {
    // Recalculate tiers for all pixels based on corrected center (24.5, 24.5)
    const allPixels = await db.select().from(pixels);
    
    for (const pixel of allPixels) {
      const distance = Math.abs(pixel.x - 24.5) + Math.abs(pixel.y - 24.5);
      let tier: string;
      let price: number;
      
      if (distance <= 6) {
        tier = 'legendary';
        price = 100000;
      } else if (distance <= 12) {
        tier = 'epic';
        price = 50000;
      } else if (distance <= 20) {
        tier = 'rare';
        price = 25000;
      } else {
        tier = 'common';
        price = 5000;
      }

      // Update pixel tier and price if changed
      if (pixel.tier !== tier || pixel.price !== price) {
        await db.update(pixels)
          .set({ tier, price })
          .where(eq(pixels.id, pixel.id));
      }
    }
  }
}

export const pixelStorage = new PixelStorage();
