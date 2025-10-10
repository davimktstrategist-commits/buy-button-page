// Complete database schema for Roleta do Tigre with BRPIX integration
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  boolean,
  decimal,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const roleEnum = pgEnum('role', ['user', 'admin']);
export const transactionStatusEnum = pgEnum('transaction_status', ['pending', 'processing', 'completed', 'failed', 'cancelled']);
export const transactionTypeEnum = pgEnum('transaction_type', ['deposit', 'withdrawal', 'win', 'bet']);
export const gameStatusEnum = pgEnum('game_status', ['pending', 'spinning', 'completed']);
export const rouletteTypeEnum = pgEnum('roulette_type', ['main', 'bonus']);

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table (enhanced for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: roleEnum("role").default('user').notNull(),
  balance: decimal("balance", { precision: 10, scale: 2 }).default('0.00').notNull(),
  totalDeposited: decimal("total_deposited", { precision: 10, scale: 2 }).default('0.00').notNull(),
  totalWon: decimal("total_won", { precision: 10, scale: 2 }).default('0.00').notNull(),
  totalBet: decimal("total_bet", { precision: 10, scale: 2 }).default('0.00').notNull(),
  referralCode: varchar("referral_code").unique(),
  referredByUserId: varchar("referred_by_user_id").references(() => users.id),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Roulette configuration table
export const rouletteConfig = pgTable("roulette_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: rouletteTypeEnum("type").notNull(),
  multiplier: integer("multiplier").notNull(), // 0, 2, 5, 10, 15, 100, etc.
  probability: decimal("probability", { precision: 5, scale: 2 }).notNull(), // percentage
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Games table
export const games = pgTable("games", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  betAmount: decimal("bet_amount", { precision: 10, scale: 2 }).notNull(),
  multiplier: integer("multiplier").notNull(),
  winAmount: decimal("win_amount", { precision: 10, scale: 2 }).notNull(),
  rouletteType: rouletteTypeEnum("roulette_type").default('main').notNull(),
  status: gameStatusEnum("status").default('completed').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("games_user_id_idx").on(table.userId),
  index("games_created_at_idx").on(table.createdAt),
]);

// Transactions table (deposits, withdrawals, wins, bets)
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: transactionTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: transactionStatusEnum("status").default('pending').notNull(),
  // BRPIX specific fields
  brpixTransactionId: varchar("brpix_transaction_id"),
  brpixQrCode: text("brpix_qr_code"),
  brpixQrCodeImage: text("brpix_qr_code_image"),
  brpixCopyPaste: text("brpix_copy_paste"),
  brpixExpiresAt: timestamp("brpix_expires_at"),
  // Split information
  splitAmount: decimal("split_amount", { precision: 10, scale: 2 }),
  splitPercentage: decimal("split_percentage", { precision: 5, scale: 2 }).default('10.50'),
  // Additional metadata
  metadata: jsonb("metadata"),
  gameId: varchar("game_id").references(() => games.id),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("transactions_user_id_idx").on(table.userId),
  index("transactions_status_idx").on(table.status),
  index("transactions_brpix_id_idx").on(table.brpixTransactionId),
]);

// Withdrawals table (for tracking withdrawal requests)
export const withdrawals = pgTable("withdrawals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  pixKey: varchar("pix_key").notNull(),
  pixKeyType: varchar("pix_key_type").notNull(), // cpf, cnpj, email, phone, random
  status: transactionStatusEnum("status").default('pending').notNull(),
  transactionId: varchar("transaction_id").references(() => transactions.id),
  rejectionReason: text("rejection_reason"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("withdrawals_user_id_idx").on(table.userId),
  index("withdrawals_status_idx").on(table.status),
]);

// System settings table
export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Affiliate referrals table
export const affiliateReferrals = pgTable("affiliate_referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  affiliateUserId: varchar("affiliate_user_id").notNull().references(() => users.id),
  referredUserId: varchar("referred_user_id").notNull().references(() => users.id),
  referralCode: varchar("referral_code").notNull().unique(),
  totalCommissionEarned: decimal("total_commission_earned", { precision: 10, scale: 2 }).default('0.00').notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("affiliate_referrals_affiliate_idx").on(table.affiliateUserId),
  index("affiliate_referrals_referred_idx").on(table.referredUserId),
  index("affiliate_referrals_code_idx").on(table.referralCode),
]);

// Affiliate commissions table
export const affiliateCommissions = pgTable("affiliate_commissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  affiliateUserId: varchar("affiliate_user_id").notNull().references(() => users.id),
  referredUserId: varchar("referred_user_id").notNull().references(() => users.id),
  transactionId: varchar("transaction_id").notNull().references(() => transactions.id),
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }).notNull(),
  commissionPercentage: decimal("commission_percentage", { precision: 5, scale: 2 }).default('5.00').notNull(),
  isPaid: boolean("is_paid").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("affiliate_commissions_affiliate_idx").on(table.affiliateUserId),
  index("affiliate_commissions_referred_idx").on(table.referredUserId),
  index("affiliate_commissions_transaction_idx").on(table.transactionId),
]);

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  games: many(games),
  transactions: many(transactions),
  withdrawals: many(withdrawals),
  affiliateReferrals: many(affiliateReferrals, { relationName: "affiliate" }),
  referredUsers: many(affiliateReferrals, { relationName: "referred" }),
  affiliateCommissions: many(affiliateCommissions, { relationName: "affiliateCommissions" }),
  referredBy: one(users, {
    fields: [users.referredByUserId],
    references: [users.id],
  }),
}));

export const gamesRelations = relations(games, ({ one, many }) => ({
  user: one(users, {
    fields: [games.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  game: one(games, {
    fields: [transactions.gameId],
    references: [games.id],
  }),
}));

export const withdrawalsRelations = relations(withdrawals, ({ one }) => ({
  user: one(users, {
    fields: [withdrawals.userId],
    references: [users.id],
  }),
  transaction: one(transactions, {
    fields: [withdrawals.transactionId],
    references: [transactions.id],
  }),
}));

export const affiliateReferralsRelations = relations(affiliateReferrals, ({ one }) => ({
  affiliateUser: one(users, {
    fields: [affiliateReferrals.affiliateUserId],
    references: [users.id],
    relationName: "affiliate",
  }),
  referredUser: one(users, {
    fields: [affiliateReferrals.referredUserId],
    references: [users.id],
    relationName: "referred",
  }),
}));

export const affiliateCommissionsRelations = relations(affiliateCommissions, ({ one }) => ({
  affiliateUser: one(users, {
    fields: [affiliateCommissions.affiliateUserId],
    references: [users.id],
    relationName: "affiliateCommissions",
  }),
  referredUser: one(users, {
    fields: [affiliateCommissions.referredUserId],
    references: [users.id],
  }),
  transaction: one(transactions, {
    fields: [affiliateCommissions.transactionId],
    references: [transactions.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRouletteConfigSchema = createInsertSchema(rouletteConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGameSchema = createInsertSchema(games).omit({
  id: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWithdrawalSchema = createInsertSchema(withdrawals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  processedAt: true,
});

export const insertAffiliateReferralSchema = createInsertSchema(affiliateReferrals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAffiliateCommissionSchema = createInsertSchema(affiliateCommissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Upsert user schema for Replit Auth
export const upsertUserSchema = z.object({
  id: z.string(),
  email: z.string().email().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  profileImageUrl: z.string().nullable(),
});

// Types
export type User = typeof users.$inferSelect;
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type RouletteConfig = typeof rouletteConfig.$inferSelect;
export type InsertRouletteConfig = z.infer<typeof insertRouletteConfigSchema>;

export type Game = typeof games.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type Withdrawal = typeof withdrawals.$inferSelect;
export type InsertWithdrawal = z.infer<typeof insertWithdrawalSchema>;

export type AffiliateReferral = typeof affiliateReferrals.$inferSelect;
export type InsertAffiliateReferral = z.infer<typeof insertAffiliateReferralSchema>;

export type AffiliateCommission = typeof affiliateCommissions.$inferSelect;
export type InsertAffiliateCommission = z.infer<typeof insertAffiliateCommissionSchema>;

export type SystemSetting = typeof systemSettings.$inferSelect;
