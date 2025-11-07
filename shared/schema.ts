import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  address: text("address").notNull().unique(),
  influence: integer("influence").notNull().default(0),
  totalCkb: integer("total_ckb").notNull().default(0),
  pixelCount: integer("pixel_count").notNull().default(0),
  founderPixelCount: integer("founder_pixel_count").notNull().default(0), // Count of claimed pixels user both minted AND currently owns
  isFounder: boolean("is_founder").notNull().default(false), // TRUE if founderPixelCount > 0
  referralCode: text("referral_code").unique(), // Unique referral code for this user
  referralBoostLevel: integer("referral_boost_level").notNull().default(0), // 0-100 representing 0.0x to 1.0x boost (stored as integer for precision)
  referralBoostExpiresAt: timestamp("referral_boost_expires_at"), // When the referral boost expires
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const clusters = pgTable("clusters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clusterId: text("cluster_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  adminAddress: text("admin_address"), // Wallet address of cluster creator/owner (nullable for backward compat)
  txHash: text("tx_hash").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  // Full cluster cell data for manual injection in skip mode
  cellCapacity: text("cell_capacity"), // Hex capacity of cluster cell
  cellLockCodeHash: text("cell_lock_code_hash"), // ACP lock script code hash
  cellLockHashType: text("cell_lock_hash_type"), // ACP lock script hash type
  cellLockArgs: text("cell_lock_args"), // ACP lock script args
  cellTypeCodeHash: text("cell_type_code_hash"), // Cluster type script code hash
  cellTypeHashType: text("cell_type_hash_type"), // Cluster type script hash type
  cellTypeArgs: text("cell_type_args"), // Cluster type script args (clusterId)
  cellData: text("cell_data"), // Cluster cell data hex
  cellOutputIndex: integer("cell_output_index").default(0), // Output index in creation tx (usually 0)
  acpCellDepTxHash: text("acp_cell_dep_tx_hash"), // ACP lock script cellDep outPoint txHash
  acpCellDepIndex: integer("acp_cell_dep_index"), // ACP lock script cellDep outPoint index
  acpCellDepType: text("acp_cell_dep_type"), // ACP lock script cellDep depType
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const pixels = pgTable("pixels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  x: integer("x").notNull(),
  y: integer("y").notNull(),
  tier: text("tier").notNull(), // legendary, epic, rare, common
  price: integer("price").notNull(),
  claimed: boolean("claimed").notNull().default(false),
  bgcolor: text("bgcolor"), // DOB/0 background color
  textColor: text("text_color"), // contrasting text color
  ownerId: varchar("owner_id").references(() => users.id),
  minterId: varchar("minter_id").references(() => users.id), // Original minter (for governance points)
  ownerSince: timestamp("owner_since"), // When current owner acquired this pixel (for holder point calculation)
  sporeId: text("spore_id"), // Spore NFT ID
  sporeTxHash: text("spore_tx_hash"), // Spore minting transaction hash
  mintedAt: timestamp("minted_at"), // When the Spore was minted
  claimedAt: timestamp("claimed_at"),
  tierMintNumber: integer("tier_mint_number"), // Permanent tier sequence number (e.g., Legendary #12/85), assigned on first claim
  globalMintNumber: integer("global_mint_number"), // Incremental mint counter, assigned on every mint
  reservedByUserId: varchar("reserved_by_user_id").references(() => users.id), // Who has the mint reservation
  reservedAt: timestamp("reserved_at"), // When the reservation was made (for TTL cleanup)
  reservedTierMintNumber: integer("reserved_tier_mint_number"), // Reserved tier mint number
  reservedGlobalMintNumber: integer("reserved_global_mint_number"), // Reserved global mint number
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  // CRITICAL: Enforce 1-pixel-per-wallet minting rule at DATABASE level
  // This partial unique index prevents race conditions by ensuring atomicity
  // Only applies to claimed pixels (unclaimed/melted pixels don't count)
  // Users must MELT their pixel to mint a different one
  onePixelPerWalletMintIdx: uniqueIndex("one_pixel_per_wallet_mint_idx")
    .on(table.minterId)
    .where(sql`${table.claimed} = true`),
}));

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pixelId: varchar("pixel_id").notNull().references(() => pixels.id),
  fromUserId: varchar("from_user_id").references(() => users.id),
  toUserId: varchar("to_user_id").references(() => users.id),
  type: text("type").notNull(), // mint, transfer, melt
  amount: integer("amount").notNull(),
  txHash: text("tx_hash").unique(), // Unique constraint prevents duplicate blockchain transactions
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userAchievements = pgTable("user_achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  achievementType: text("achievement_type").notNull(), // first_blood, territory_king, color_collector, legendary_hunter, rich_player
  unlockedAt: timestamp("unlocked_at").notNull().defaultNow(),
});

export const mintCounters = pgTable("mint_counters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  counterType: text("counter_type").notNull().unique(), // "legendary", "epic", "rare", "common", "global"
  value: integer("value").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").notNull().references(() => users.id), // User who referred
  refereeId: varchar("referee_id").notNull().references(() => users.id), // User who was referred
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const feedback = pgTable("feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userAddress: text("user_address"), // Optional - allows anonymous feedback
  category: text("category").notNull(), // bug, feature, ui, performance, other
  description: text("description").notNull(),
  page: text("page"), // Which page the feedback was submitted from
  userAgent: text("user_agent"), // Browser/device info
  status: text("status").notNull().default("new"), // new, reviewing, resolved, dismissed
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertClusterSchema = createInsertSchema(clusters).omit({
  id: true,
  createdAt: true,
});

export const insertPixelSchema = createInsertSchema(pixels).omit({
  id: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertUserAchievementSchema = createInsertSchema(userAchievements).omit({
  id: true,
  unlockedAt: true,
});

export const insertMintCounterSchema = createInsertSchema(mintCounters).omit({
  id: true,
  updatedAt: true,
});

export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  createdAt: true,
});

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  createdAt: true,
  status: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCluster = z.infer<typeof insertClusterSchema>;
export type Cluster = typeof clusters.$inferSelect;
export type InsertPixel = z.infer<typeof insertPixelSchema>;
export type Pixel = typeof pixels.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertMintCounter = z.infer<typeof insertMintCounterSchema>;
export type MintCounter = typeof mintCounters.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referrals.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedback.$inferSelect;

export const DOB_COLORS = [
  "#DBAB00",
  "#FFBDFC", 
  "#09D3FF",
  "#66C084"
] as const;

export const TEXT_COLORS = [
  "#FFFFFF",
  "#000000", 
  "#FFBDFC"
] as const;

export const ACHIEVEMENT_TYPES = {
  FIRST_BLOOD: 'first_blood',
  TERRITORY_KING: 'territory_king',
  COLOR_COLLECTOR: 'color_collector',
  LEGENDARY_HUNTER: 'legendary_hunter',
  RICH_PLAYER: 'rich_player',
} as const;

export const ACHIEVEMENT_CONFIG = {
  [ACHIEVEMENT_TYPES.FIRST_BLOOD]: {
    name: 'First Blood',
    description: 'Claim your first pixel',
    icon: '🎯',
    condition: (stats: { pixelCount: number }) => stats.pixelCount >= 1,
  },
  [ACHIEVEMENT_TYPES.TERRITORY_KING]: {
    name: 'Territory King',
    description: 'Own 5+ connected pixels',
    icon: '👑',
    condition: (stats: { maxConnectedPixels: number }) => stats.maxConnectedPixels >= 5,
  },
  [ACHIEVEMENT_TYPES.COLOR_COLLECTOR]: {
    name: 'Color Collector',
    description: 'Own all 4 DOB/0 colors',
    icon: '🎨',
    condition: (stats: { uniqueColors: number }) => stats.uniqueColors >= 4,
  },
  [ACHIEVEMENT_TYPES.LEGENDARY_HUNTER]: {
    name: 'Legendary Hunter',
    description: 'Claim a legendary tier pixel',
    icon: '⭐',
    condition: (stats: { hasLegendary: boolean }) => stats.hasLegendary,
  },
  [ACHIEVEMENT_TYPES.RICH_PLAYER]: {
    name: 'Rich Founder',
    description: 'Lock 100,000+ CKB',
    icon: '💎',
    condition: (stats: { totalCkb: number }) => stats.totalCkb >= 100000,
  },
} as const;

export type DOBColor = typeof DOB_COLORS[number];
export type TextColor = typeof TEXT_COLORS[number];
export type AchievementType = typeof ACHIEVEMENT_TYPES[keyof typeof ACHIEVEMENT_TYPES];
