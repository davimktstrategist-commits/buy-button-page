// Database storage implementation for Roleta do Tigre
import {
  users,
  games,
  transactions,
  withdrawals,
  rouletteConfig,
  systemSettings,
  type User,
  type UpsertUser,
  type Game,
  type InsertGame,
  type Transaction,
  type InsertTransaction,
  type Withdrawal,
  type InsertWithdrawal,
  type RouletteConfig,
  type InsertRouletteConfig,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Balance operations
  getUserBalance(userId: string): Promise<User | undefined>;
  updateUserBalance(userId: string, amount: number): Promise<User>;
  updateUserStats(userId: string, betAmount: number, winAmount: number): Promise<User>;
  
  // Game operations
  createGame(game: InsertGame): Promise<Game>;
  getGamesByUserId(userId: string, limit?: number): Promise<Game[]>;
  getAllGames(): Promise<Game[]>;
  getRecentWinners(limit?: number): Promise<Game[]>;
  
  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionsByUserId(userId: string): Promise<Transaction[]>;
  getAllTransactions(): Promise<Transaction[]>;
  getTransactionById(id: string): Promise<Transaction | undefined>;
  updateTransaction(id: string, data: Partial<Transaction>): Promise<Transaction>;
  
  // Withdrawal operations
  createWithdrawal(withdrawal: InsertWithdrawal): Promise<Withdrawal>;
  getWithdrawalsByUserId(userId: string): Promise<Withdrawal[]>;
  getAllWithdrawals(): Promise<Withdrawal[]>;
  getWithdrawalById(id: string): Promise<Withdrawal | undefined>;
  updateWithdrawal(id: string, data: Partial<Withdrawal>): Promise<Withdrawal>;
  approveWithdrawal(id: string): Promise<Withdrawal>;
  rejectWithdrawal(id: string, reason: string): Promise<Withdrawal>;
  
  // Roulette configuration
  getRouletteConfigs(): Promise<RouletteConfig[]>;
  getRouletteConfigsByType(type: 'main' | 'bonus'): Promise<RouletteConfig[]>;
  updateRouletteConfig(id: string, probability: number): Promise<RouletteConfig>;
  
  // Admin stats
  getAllUsers(): Promise<User[]>;
  getDashboardStats(): Promise<any>;
  getDeposits7Days(): Promise<any>;
  getTopBalances(): Promise<any>;
  getGatewayConfig(): Promise<any>;
  saveGatewayConfig(publicKey: string, privateKey: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const result = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0];
  }

  // Balance operations
  async getUserBalance(userId: string): Promise<User | undefined> {
    return this.getUser(userId);
  }

  async updateUserBalance(userId: string, amount: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        balance: sql`${users.balance} + ${amount}`,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserStats(userId: string, betAmount: number, winAmount: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        totalBet: sql`${users.totalBet} + ${betAmount}`,
        totalWon: sql`${users.totalWon} + ${winAmount}`,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Game operations
  async createGame(gameData: InsertGame): Promise<Game> {
    const [game] = await db
      .insert(games)
      .values(gameData)
      .returning();
    return game;
  }

  async getGamesByUserId(userId: string, limit: number = 20): Promise<Game[]> {
    return db
      .select()
      .from(games)
      .where(eq(games.userId, userId))
      .orderBy(desc(games.createdAt))
      .limit(limit);
  }

  async getAllGames(): Promise<Game[]> {
    return db
      .select()
      .from(games)
      .orderBy(desc(games.createdAt));
  }

  async getRecentWinners(limit: number = 50): Promise<Game[]> {
    return db
      .select()
      .from(games)
      .where(sql`${games.winAmount} > 0`)
      .orderBy(desc(games.createdAt))
      .limit(limit);
  }

  // Transaction operations
  async createTransaction(transactionData: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db
      .insert(transactions)
      .values(transactionData)
      .returning();
    return transaction;
  }

  async getTransactionsByUserId(userId: string): Promise<Transaction[]> {
    return db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.createdAt));
  }

  async getTransactionById(id: string): Promise<Transaction | undefined> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id));
    return transaction;
  }

  async updateTransaction(id: string, data: Partial<Transaction>): Promise<Transaction> {
    const [transaction] = await db
      .update(transactions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(transactions.id, id))
      .returning();
    return transaction;
  }

  // Withdrawal operations
  async createWithdrawal(withdrawalData: InsertWithdrawal): Promise<Withdrawal> {
    const [withdrawal] = await db
      .insert(withdrawals)
      .values(withdrawalData)
      .returning();
    return withdrawal;
  }

  async getWithdrawalsByUserId(userId: string): Promise<Withdrawal[]> {
    return db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.userId, userId))
      .orderBy(desc(withdrawals.createdAt));
  }

  async getAllWithdrawals(): Promise<Withdrawal[]> {
    return db
      .select()
      .from(withdrawals)
      .orderBy(desc(withdrawals.createdAt));
  }

  async getWithdrawalById(id: string): Promise<Withdrawal | undefined> {
    const [withdrawal] = await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.id, id));
    return withdrawal;
  }

  async updateWithdrawal(id: string, data: Partial<Withdrawal>): Promise<Withdrawal> {
    const [withdrawal] = await db
      .update(withdrawals)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(withdrawals.id, id))
      .returning();
    return withdrawal;
  }

  async approveWithdrawal(id: string): Promise<Withdrawal> {
    const [withdrawal] = await db
      .update(withdrawals)
      .set({ 
        status: 'completed',
        processedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(withdrawals.id, id))
      .returning();
    return withdrawal;
  }

  async rejectWithdrawal(id: string, reason: string): Promise<Withdrawal> {
    const withdrawal = await this.getWithdrawalById(id);
    if (withdrawal) {
      // Return balance to user
      await this.updateUserBalance(withdrawal.userId, parseFloat(withdrawal.amount));
    }
    
    const [rejectedWithdrawal] = await db
      .update(withdrawals)
      .set({ 
        status: 'cancelled',
        rejectionReason: reason,
        processedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(withdrawals.id, id))
      .returning();
    return rejectedWithdrawal;
  }

  // Roulette configuration
  async getRouletteConfigs(): Promise<RouletteConfig[]> {
    return db
      .select()
      .from(rouletteConfig)
      .where(eq(rouletteConfig.isActive, true))
      .orderBy(rouletteConfig.multiplier);
  }

  async getRouletteConfigsByType(type: 'main' | 'bonus'): Promise<RouletteConfig[]> {
    return db
      .select()
      .from(rouletteConfig)
      .where(and(
        eq(rouletteConfig.type, type),
        eq(rouletteConfig.isActive, true)
      ))
      .orderBy(rouletteConfig.multiplier);
  }

  async updateRouletteConfig(id: string, probability: number): Promise<RouletteConfig> {
    const [config] = await db
      .update(rouletteConfig)
      .set({ 
        probability: probability.toString(),
        updatedAt: new Date() 
      })
      .where(eq(rouletteConfig.id, id))
      .returning();
    return config;
  }

  // Admin stats
  async getAllUsers(): Promise<User[]> {
    return db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
  }

  async getDashboardStats(): Promise<any> {
    const allUsers = await this.getAllUsers();
    const allTransactions = await this.getAllTransactions();
    const allWithdrawals = await this.getAllWithdrawals();

    const totalUsers = allUsers.length;
    const totalDeposits = allTransactions
      .filter(t => t.type === 'deposit' && t.status === 'completed')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const totalBets = allTransactions
      .filter(t => t.type === 'bet')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const totalWinnings = allTransactions
      .filter(t => t.type === 'win')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const platformProfit = totalBets - totalWinnings;
    
    const pendingWithdrawals = allWithdrawals.filter(w => w.status === 'pending').length;
    const accountBalance = allUsers.reduce((sum, u) => sum + parseFloat(u.balance), 0);
    
    // Depósitos de hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const depositsToday = allTransactions
      .filter(t => t.type === 'deposit' && t.status === 'completed' && new Date(t.createdAt) >= today)
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    // Depósitos confirmados (count)
    const confirmedDepositsCount = allTransactions
      .filter(t => t.type === 'deposit' && t.status === 'completed').length;
    
    // Saques pagos
    const withdrawalsPaid = allWithdrawals
      .filter(w => w.status === 'completed')
      .reduce((sum, w) => sum + parseFloat(w.amount), 0);

    return {
      totalUsers,
      totalDeposits: totalDeposits.toFixed(2),
      totalBets: totalBets.toFixed(2),
      totalWinnings: totalWinnings.toFixed(2),
      platformProfit: platformProfit.toFixed(2),
      activeGames: 0,
      pendingWithdrawals,
      accountBalance: accountBalance.toFixed(2),
      depositsToday: depositsToday.toFixed(2),
      confirmedDepositsCount,
      withdrawalsPaid: withdrawalsPaid.toFixed(2),
      depositRate: 0,
      userGrowth: 100,
      // Trends for sparklines (mock data for now)
      profitTrend: [0,0,0,0,0,0,platformProfit],
      betsTrend: [0,0,0,0,0,0,totalBets],
      depositsTodayTrend: [0,0,0,0,0,0,depositsToday],
      winsTrend: [0,0,0,0,0,0,totalWinnings],
      usersTrend: [0,0,0,0,0,0,totalUsers],
      confirmedDepositsTrend: [0,0,0,0,0,0,confirmedDepositsCount],
      balanceTrend: [0,0,0,0,0,0,accountBalance],
      withdrawalsTrend: [0,0,0,0,0,0,withdrawalsPaid],
    };
  }

  async getDeposits7Days(): Promise<any> {
    const allTransactions = await this.getAllTransactions();
    const deposits = allTransactions.filter(t => t.type === 'deposit' && t.status === 'completed');
    
    const labels = [];
    const values = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      
      const dayDeposits = deposits
        .filter(d => new Date(d.createdAt) >= date && new Date(d.createdAt) < nextDay)
        .reduce((sum, d) => sum + parseFloat(d.amount), 0);
      
      labels.push(i === 0 ? 'Hoje' : `D-${i}`);
      values.push(parseFloat(dayDeposits.toFixed(2)));
    }
    
    return { labels, values };
  }

  async getTopBalances(): Promise<any> {
    const allUsers = await this.getAllUsers();
    const sorted = allUsers
      .sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance))
      .slice(0, 5);
    
    const labels = sorted.map(u => u.email || u.id.substring(0, 8) + '...');
    const values = sorted.map(u => parseFloat(u.balance));
    
    return { labels, values };
  }

  async getGatewayConfig(): Promise<any> {
    const settings = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, 'BRPIX_PUBLIC_KEY'))
      .limit(1);
    
    return {
      publicKey: settings[0]?.value || '',
      privateKey: settings[0] ? '******************' : ''
    };
  }

  async saveGatewayConfig(publicKey: string, privateKey: string): Promise<void> {
    // Update or create public key
    await db
      .insert(systemSettings)
      .values({
        key: 'BRPIX_PUBLIC_KEY',
        value: publicKey,
        description: 'BRPIX Public Key (X-Public-Key)'
      })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value: publicKey, updatedAt: new Date() }
      });
    
    // Update or create private key
    await db
      .insert(systemSettings)
      .values({
        key: 'BRPIX_PRIVATE_KEY',
        value: privateKey,
        description: 'BRPIX Private Key (X-Private-Key)'
      })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value: privateKey, updatedAt: new Date() }
      });
  }
}

export const storage = new DatabaseStorage();
