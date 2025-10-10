// API Routes for Roleta do Tigre
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./replitAuth";
import { brpixService } from "./brpixService";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User balance route
  app.get('/api/user/balance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUserBalance(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching balance:", error);
      res.status(500).json({ message: "Failed to fetch balance" });
    }
  });

  // Game history route
  app.get('/api/games/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const games = await storage.getGamesByUserId(userId, 20);
      res.json(games);
    } catch (error) {
      console.error("Error fetching game history:", error);
      res.status(500).json({ message: "Failed to fetch game history" });
    }
  });

  // Play game route
  app.post('/api/games/play', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { betAmount } = req.body;

      if (!betAmount || betAmount <= 0) {
        return res.status(400).json({ message: "Invalid bet amount" });
      }

      // Check user balance
      const user = await storage.getUserBalance(userId);
      if (!user || parseFloat(user.balance) < betAmount) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      // Get roulette configuration
      const configs = await storage.getRouletteConfigsByType('main');
      
      // Calculate result based on probabilities
      const random = Math.random() * 100;
      let cumulativeProbability = 0;
      let selectedMultiplier = 0;

      for (const config of configs) {
        cumulativeProbability += parseFloat(config.probability);
        if (random <= cumulativeProbability) {
          selectedMultiplier = config.multiplier;
          break;
        }
      }

      // Calculate win amount
      const winAmount = betAmount * selectedMultiplier;
      const netChange = winAmount - betAmount;

      // Create game record
      const game = await storage.createGame({
        userId,
        betAmount: betAmount.toString(),
        multiplier: selectedMultiplier,
        winAmount: winAmount.toString(),
        rouletteType: 'main',
        status: 'completed',
      });

      // Create bet transaction
      await storage.createTransaction({
        userId,
        type: 'bet',
        amount: betAmount.toString(),
        status: 'completed',
        gameId: game.id,
        description: `Aposta no jogo ${game.id}`,
      });

      // Create win transaction if won
      if (winAmount > 0) {
        await storage.createTransaction({
          userId,
          type: 'win',
          amount: winAmount.toString(),
          status: 'completed',
          gameId: game.id,
          description: `Ganho no jogo ${game.id} - ${selectedMultiplier}x`,
        });
      }

      // Update user balance and stats
      await storage.updateUserBalance(userId, netChange);
      await storage.updateUserStats(userId, betAmount, winAmount);

      res.json({
        multiplier: selectedMultiplier,
        winAmount,
        balance: (parseFloat(user.balance) + netChange).toFixed(2),
      });
    } catch (error) {
      console.error("Error playing game:", error);
      res.status(500).json({ message: "Failed to play game" });
    }
  });

  // Create deposit (generate PIX QR code)
  app.post('/api/deposits', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { amount } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid deposit amount" });
      }

      // Create BRPIX transaction
      const brpixTransaction = await brpixService.createTransaction({
        amount,
        description: `Depósito Roleta do Tigre - User ${userId}`,
        externalReference: userId,
        expirationMinutes: 30,
      });

      // Calculate split amount
      const splitAmount = brpixService.calculateSplitAmount(amount);

      // Create deposit transaction in database
      const transaction = await storage.createTransaction({
        userId,
        type: 'deposit',
        amount: amount.toString(),
        status: 'pending',
        brpixTransactionId: brpixTransaction.id,
        brpixQrCode: brpixTransaction.qrCode,
        brpixQrCodeImage: brpixTransaction.qrCodeImage,
        brpixCopyPaste: brpixTransaction.copyPaste,
        brpixExpiresAt: new Date(brpixTransaction.expiresAt),
        splitAmount: splitAmount.toString(),
        splitPercentage: brpixService.getSplitPercentage().toString(),
        description: `Depósito via PIX`,
      });

      res.json({
        transactionId: transaction.id,
        qrCode: brpixTransaction.qrCode,
        qrCodeImage: brpixTransaction.qrCodeImage,
        copyPaste: brpixTransaction.copyPaste,
        expiresAt: brpixTransaction.expiresAt,
        amount,
      });
    } catch (error) {
      console.error("Error creating deposit:", error);
      res.status(500).json({ message: "Failed to create deposit" });
    }
  });

  // Check deposit status (webhook or polling)
  app.post('/api/deposits/:transactionId/confirm', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { transactionId } = req.params;

      const transaction = await storage.getTransactionById(transactionId);
      
      if (!transaction || transaction.userId !== userId) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      if (transaction.status === 'completed') {
        return res.json({ status: 'completed', message: 'Deposit already confirmed' });
      }

      // Check BRPIX status
      if (transaction.brpixTransactionId) {
        const brpixStatus = await brpixService.getTransactionStatus(transaction.brpixTransactionId);
        
        if (brpixStatus === 'paid' || brpixStatus === 'completed') {
          // Update transaction status
          await storage.updateTransaction(transactionId, { status: 'completed' });
          
          // Update user balance and total deposited
          await storage.updateUserBalance(userId, parseFloat(transaction.amount));
          
          // Update total deposited via SQL
          const user = await storage.getUser(userId);
          if (user) {
            await db.update(users)
              .set({
                totalDeposited: sql`${users.totalDeposited} + ${parseFloat(transaction.amount)}`,
                updatedAt: new Date()
              })
              .where(eq(users.id, userId));
          }

          res.json({ status: 'completed', message: 'Deposit confirmed' });
        } else {
          res.json({ status: brpixStatus, message: 'Payment pending' });
        }
      } else {
        res.json({ status: 'pending', message: 'Awaiting payment' });
      }
    } catch (error) {
      console.error("Error confirming deposit:", error);
      res.status(500).json({ message: "Failed to confirm deposit" });
    }
  });

  // Admin routes
  app.get('/api/admin/stats', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get('/api/admin/users', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/admin/transactions', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const transactions = await storage.getAllTransactions();
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.get('/api/admin/withdrawals', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const withdrawals = await storage.getAllWithdrawals();
      res.json(withdrawals);
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
      res.status(500).json({ message: "Failed to fetch withdrawals" });
    }
  });

  app.post('/api/admin/withdrawals/:id/approve', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const withdrawal = await storage.getWithdrawalById(id);
      if (!withdrawal) {
        return res.status(404).json({ message: "Withdrawal not found" });
      }

      // Update withdrawal status
      await storage.updateWithdrawal(id, { 
        status: 'completed',
        processedAt: new Date(),
      });

      res.json({ message: "Withdrawal approved" });
    } catch (error) {
      console.error("Error approving withdrawal:", error);
      res.status(500).json({ message: "Failed to approve withdrawal" });
    }
  });

  app.post('/api/admin/withdrawals/:id/reject', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      const withdrawal = await storage.getWithdrawalById(id);
      if (!withdrawal) {
        return res.status(404).json({ message: "Withdrawal not found" });
      }

      // Return balance to user
      await storage.updateUserBalance(withdrawal.userId, parseFloat(withdrawal.amount));

      // Update withdrawal status
      await storage.updateWithdrawal(id, { 
        status: 'cancelled',
        rejectionReason: reason,
        processedAt: new Date(),
      });

      res.json({ message: "Withdrawal rejected" });
    } catch (error) {
      console.error("Error rejecting withdrawal:", error);
      res.status(500).json({ message: "Failed to reject withdrawal" });
    }
  });

  app.get('/api/admin/roulette-config', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const configs = await storage.getRouletteConfigs();
      res.json(configs);
    } catch (error) {
      console.error("Error fetching roulette config:", error);
      res.status(500).json({ message: "Failed to fetch roulette config" });
    }
  });

  app.put('/api/admin/roulette-config/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { probability } = req.body;

      if (probability < 0 || probability > 100) {
        return res.status(400).json({ message: "Invalid probability value" });
      }

      const config = await storage.updateRouletteConfig(id, probability);
      res.json(config);
    } catch (error) {
      console.error("Error updating roulette config:", error);
      res.status(500).json({ message: "Failed to update roulette config" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
