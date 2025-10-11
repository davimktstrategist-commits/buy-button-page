// API Routes for Roleta do Tigre
import express, { type Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./replitAuth";
import { brpixService } from "./brpixService";
import { db } from "./db";
import { users, transactions } from "@shared/schema";
import { eq, sql, desc, and, inArray } from "drizzle-orm";
import { randomBytes } from "crypto";

// Admin token storage (in-memory)
const adminTokens = new Map<string, { token: string; expiresAt: Date }>();

function generateAdminToken(): string {
  return randomBytes(32).toString('hex');
}

function isValidAdminToken(token: string): boolean {
  for (const tokenData of Array.from(adminTokens.values())) {
    if (tokenData.token === token && tokenData.expiresAt > new Date()) {
      return true;
    }
  }
  return false;
}

// Middleware to require admin token
function requireAdminToken(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token || !isValidAdminToken(token)) {
    return res.status(401).json({ message: "Não autorizado" });
  }
  
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // User registration and login (for HTML game)
  app.post('/ajax/auth.php', async (req, res) => {
    try {
      const { action, nome_completo, email, telefone, senha, referralCode } = req.body;
      
      if (action === 'register') {
        // Validações
        if (!nome_completo || !email || !telefone || !senha) {
          return res.json({ success: false, message: 'Preencha todos os campos' });
        }
        
        if (senha.length < 6) {
          return res.json({ success: false, message: 'Senha deve ter no mínimo 6 caracteres' });
        }
        
        // Verificar se email já existe
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser) {
          return res.json({ success: false, message: 'Email já cadastrado' });
        }
        
        // Verificar se há código de afiliado e se é válido
        let affiliateUser = null;
        if (referralCode) {
          const { users } = await import('@shared/schema');
          const affiliateUsers = await db.select().from(users)
            .where(eq(users.referralCode, referralCode))
            .limit(1);
          
          if (affiliateUsers.length > 0) {
            affiliateUser = affiliateUsers[0];
          }
        }
        
        // Separar nome completo em firstName e lastName
        const nameParts = nome_completo.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        // Gerar código de afiliado único para o novo usuário
        const newReferralCode = randomBytes(4).toString('hex').toUpperCase();
        
        // Criar usuário
        console.log('👤 Criando novo usuário:', {
          email,
          hasReferralCode: !!referralCode,
          affiliateUserId: affiliateUser?.id,
          newReferralCode
        });
        
        const newUser = await storage.createUser({
          email,
          firstName,
          lastName,
          phone: telefone.replace(/\D/g, ''),
          password: senha, // Em produção, usar hash
          referralCode: newReferralCode,
          referredByUserId: affiliateUser?.id || null,
        });
        
        console.log('✅ Usuário criado com sucesso:', {
          userId: newUser.id,
          email: newUser.email,
          referralCode: newUser.referralCode,
          referredByUserId: newUser.referredByUserId
        });
        
        // Se foi indicado por alguém, criar registro de afiliado
        if (affiliateUser) {
          const { affiliateReferrals } = await import('@shared/schema');
          await db.insert(affiliateReferrals).values({
            affiliateUserId: affiliateUser.id,
            referredUserId: newUser.id,
            referralCode: referralCode,
            totalCommissionEarned: '0.00',
            isActive: true,
          });
          console.log('✅ Referral criado:', {
            affiliateUserId: affiliateUser.id,
            referredUserId: newUser.id,
            referralCode: referralCode
          });
        }
        
        // Migrate anonymous user data if exists
        const oldSessionId = req.body.sessionId || req.headers['x-session-id'] as string;
        if (oldSessionId && oldSessionId !== newUser.id) {
          await storage.migrateAnonymousUser(oldSessionId, newUser.id);
          // Refresh user data after migration
          const updatedUser = await storage.getUser(newUser.id);
          if (updatedUser) {
            return res.json({ 
              success: true, 
              message: 'Conta criada com sucesso!',
              user: {
                id: updatedUser.id,
                email: updatedUser.email,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                phone: updatedUser.phone,
                balance: updatedUser.balance,
                profileImageUrl: updatedUser.profileImageUrl
              }
            });
          }
        }
        
        res.json({ 
          success: true, 
          message: 'Conta criada com sucesso!',
          user: {
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            phone: newUser.phone,
            balance: newUser.balance,
            profileImageUrl: newUser.profileImageUrl
          }
        });
      } else if (action === 'login') {
        // Login
        if (!email || !senha) {
          return res.json({ success: false, message: 'Preencha todos os campos' });
        }
        
        const user = await storage.getUserByEmail(email);
        if (!user || user.password !== senha) {
          return res.json({ success: false, message: 'Email ou senha incorretos' });
        }
        
        // Migrate anonymous user data if exists
        const oldSessionId = req.body.sessionId || req.headers['x-session-id'] as string;
        if (oldSessionId && oldSessionId !== user.id) {
          await storage.migrateAnonymousUser(oldSessionId, user.id);
          // Refresh user data after migration
          const updatedUser = await storage.getUser(user.id);
          if (updatedUser) {
            return res.json({ 
              success: true, 
              message: 'Login realizado com sucesso!',
              user: {
                id: updatedUser.id,
                email: updatedUser.email,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                phone: updatedUser.phone,
                balance: updatedUser.balance,
                profileImageUrl: updatedUser.profileImageUrl
              }
            });
          }
        }
        
        // Retorna dados do usuário para o frontend
        res.json({ 
          success: true, 
          message: 'Login realizado com sucesso!',
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            balance: user.balance,
            profileImageUrl: user.profileImageUrl
          }
        });
      } else {
        res.json({ success: false, message: 'Ação inválida' });
      }
    } catch (error) {
      console.error('Error in auth:', error);
      res.json({ success: false, message: 'Erro ao processar requisição' });
    }
  });

  // Admin login (password-based)
  app.post('/api/admin/login', async (req, res) => {
    try {
      const { password } = req.body;
      const adminPassword = process.env.ADMIN_PASSWORD;
      
      if (!adminPassword) {
        console.error("CRITICAL: ADMIN_PASSWORD environment variable not set!");
        return res.status(500).json({ message: "Configuração de segurança inválida" });
      }
      
      if (password === adminPassword) {
        const token = generateAdminToken();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        adminTokens.set(token, { token, expiresAt });
        
        res.json({ token, expiresAt });
      } else {
        res.status(401).json({ message: "Senha incorreta" });
      }
    } catch (error) {
      console.error("Error in admin login:", error);
      res.status(500).json({ message: "Erro ao fazer login" });
    }
  });

  // Admin token verification
  app.get('/api/admin/verify', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token || !isValidAdminToken(token)) {
        return res.json({ isAdmin: false });
      }
      
      res.json({ isAdmin: true });
    } catch (error) {
      console.error("Error verifying admin token:", error);
      res.json({ isAdmin: false });
    }
  });

  // Logout route - generates new anonymous sessionId
  app.post('/api/logout', async (req, res) => {
    try {
      const newSessionId = randomBytes(16).toString('hex');
      console.log('🚪 Logout - Novo sessionId gerado:', newSessionId);
      
      res.json({ 
        success: true, 
        sessionId: newSessionId 
      });
    } catch (error) {
      console.error("Error during logout:", error);
      res.status(500).json({ success: false, message: "Logout failed" });
    }
  });

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

  // User balance route (public - uses sessionId)
  app.get('/api/balance', async (req: any, res) => {
    try {
      const { sessionId } = req.query;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID required" });
      }

      // Get or create user with sessionId
      let user = await storage.getUser(sessionId);
      if (!user) {
        user = await storage.upsertUser({
          id: sessionId,
          email: null,
          firstName: null,
          lastName: null,
          profileImageUrl: null,
        });
      }

      res.json({ balance: parseFloat(user.balance) });
    } catch (error) {
      console.error("Error fetching balance:", error);
      res.status(500).json({ message: "Failed to fetch balance" });
    }
  });

  // Legacy authenticated balance route (for admin)
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

  // Game history route (public - uses sessionId)
  app.get('/api/games/history', async (req: any, res) => {
    try {
      const sessionId = req.query.sessionId || (req.user?.claims?.sub);
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID required" });
      }

      const games = await storage.getGamesByUserId(sessionId, 20);
      res.json(games);
    } catch (error) {
      console.error("Error fetching game history:", error);
      res.status(500).json({ message: "Failed to fetch game history" });
    }
  });

  // Public settings route (for deposit/withdrawal validation)
  app.get('/api/public-settings', async (req: any, res) => {
    try {
      const { systemConfig } = await import('@shared/schema');
      
      const configs = await db.select().from(systemConfig).where(
        sql`${systemConfig.key} IN ('deposit_min', 'deposit_max', 'withdrawal_min', 'withdrawal_max', 'affiliate_cpa_percent', 'affiliate_cpa_fixed')`
      );

      const settings = {
        depositMin: 20,
        depositMax: 10000,
        withdrawalMin: 20,
        withdrawalMax: 50000,
        affiliateCpaPercent: 25,
        affiliateCpaFixed: 0,
      };

      configs.forEach(config => {
        switch(config.key) {
          case 'deposit_min': settings.depositMin = parseFloat(config.value || '20'); break;
          case 'deposit_max': settings.depositMax = parseFloat(config.value || '10000'); break;
          case 'withdrawal_min': settings.withdrawalMin = parseFloat(config.value || '20'); break;
          case 'withdrawal_max': settings.withdrawalMax = parseFloat(config.value || '50000'); break;
          case 'affiliate_cpa_percent': settings.affiliateCpaPercent = parseFloat(config.value || '25'); break;
          case 'affiliate_cpa_fixed': settings.affiliateCpaFixed = parseFloat(config.value || '0'); break;
        }
      });

      res.json(settings);
    } catch (error) {
      console.error("Error fetching public settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  // Play game route (public - uses sessionId)
  app.post('/api/games/play', async (req: any, res) => {
    try {
      const userId = req.body.sessionId || req.user?.claims?.sub;
      const { betAmount } = req.body;

      if (!userId) {
        return res.status(400).json({ message: "Session ID required" });
      }

      if (!betAmount || betAmount <= 0) {
        return res.status(400).json({ message: "Invalid bet amount" });
      }

      // Get or create user
      let user = await storage.getUserBalance(userId);
      if (!user) {
        user = await storage.upsertUser({
          id: userId,
          email: null,
          firstName: null,
          lastName: null,
          profileImageUrl: null,
        });
      }

      // Check user balance
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

  // Create deposit (generate PIX QR code) - Public with sessionId
  app.post('/api/deposits', async (req: any, res) => {
    try {
      const userId = req.body.sessionId || req.user?.claims?.sub;
      const { amount } = req.body;

      if (!userId) {
        return res.status(400).json({ message: "Session ID required" });
      }

      // Get or create user
      let user = await storage.getUser(userId);
      if (!user) {
        user = await storage.upsertUser({
          id: userId,
          email: null,
          firstName: null,
          lastName: null,
          profileImageUrl: null,
        });
      }

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

  // Check deposit status (webhook or polling) - Public with sessionId
  app.post('/api/deposits/:transactionId/confirm', async (req: any, res) => {
    try {
      const { transactionId } = req.params;

      const transaction = await storage.getTransactionById(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      if (transaction.status === 'completed') {
        return res.json({ status: 'completed', message: 'Deposit already confirmed' });
      }

      // Get userId from transaction
      const userId = transaction.userId;

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

  // Create withdrawal request - Public with sessionId
  app.post('/api/withdrawals', async (req: any, res) => {
    try {
      const userId = req.body.sessionId || req.user?.claims?.sub;
      const { amount, pixKeyType, pixKey } = req.body;

      if (!userId) {
        return res.status(400).json({ message: "Session ID required" });
      }

      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Valor inválido" });
      }

      if (!pixKeyType || !pixKey) {
        return res.status(400).json({ message: "Chave PIX obrigatória" });
      }

      // Check user balance
      const user = await storage.getUser(userId);
      if (!user || parseFloat(user.balance) < amount) {
        return res.status(400).json({ message: "Saldo insuficiente" });
      }

      // Deduct amount from balance immediately
      await storage.updateUserBalance(userId, -amount);

      // Create withdrawal request
      const withdrawal = await storage.createWithdrawal({
        userId,
        amount: amount.toString(),
        pixKeyType,
        pixKey,
        status: 'pending',
      });

      res.json({ 
        message: "Solicitação de saque criada com sucesso",
        withdrawalId: withdrawal.id,
      });
    } catch (error) {
      console.error("Error creating withdrawal:", error);
      res.status(500).json({ message: "Erro ao criar solicitação de saque" });
    }
  });

  // Admin routes
  app.get('/api/admin/stats', requireAdminToken, async (req: any, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get('/api/admin/users', requireAdminToken, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put('/api/admin/users/:id', requireAdminToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { balance, influencerMode, customAffiliateCpaPercent, customAffiliateCpaFixed, password } = req.body;

      const updateData: any = {};

      if (balance !== undefined) {
        updateData.balance = balance.toString();
      }

      if (influencerMode !== undefined) {
        updateData.influencerMode = influencerMode;
      }

      if (customAffiliateCpaPercent !== undefined) {
        updateData.customAffiliateCpaPercent = customAffiliateCpaPercent ? customAffiliateCpaPercent.toString() : null;
      }

      if (customAffiliateCpaFixed !== undefined) {
        updateData.customAffiliateCpaFixed = customAffiliateCpaFixed ? customAffiliateCpaFixed.toString() : null;
      }

      if (password) {
        updateData.password = password;
      }

      updateData.updatedAt = new Date();

      await db.update(users).set(updateData).where(eq(users.id, id));

      const updatedUser = await db.select().from(users).where(eq(users.id, id)).limit(1);

      res.json({ success: true, user: updatedUser[0] });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Erro ao atualizar usuário" });
    }
  });

  app.delete('/api/admin/users/:id', requireAdminToken, async (req: any, res) => {
    try {
      const { id } = req.params;

      // Deletar usuário
      await db.delete(users).where(eq(users.id, id));

      res.json({ success: true, message: "Usuário deletado com sucesso" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Erro ao deletar usuário" });
    }
  });

  app.get('/api/admin/transactions', requireAdminToken, async (req: any, res) => {
    try {
      const transactions = await storage.getAllTransactions();
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.get('/api/admin/withdrawals', requireAdminToken, async (req: any, res) => {
    try {
      const withdrawals = await storage.getAllWithdrawals();
      res.json(withdrawals);
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
      res.status(500).json({ message: "Failed to fetch withdrawals" });
    }
  });

  app.post('/api/admin/withdrawals/:id/approve', requireAdminToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      console.log('✅ Aprovando saque:', id);
      
      const withdrawal = await storage.approveWithdrawal(id);
      
      console.log('✅ Saque aprovado com sucesso:', {
        id: withdrawal.id,
        amount: withdrawal.amount,
        status: withdrawal.status
      });

      res.json({ 
        message: "Withdrawal approved",
        withdrawal 
      });
    } catch (error) {
      console.error("❌ Error approving withdrawal:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to approve withdrawal" 
      });
    }
  });

  app.post('/api/admin/withdrawals/:id/reject', requireAdminToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      console.log('❌ Rejeitando saque:', id, 'Motivo:', reason);
      
      const withdrawal = await storage.rejectWithdrawal(id, reason || 'Rejeitado pelo administrador');
      
      console.log('✅ Saque rejeitado com sucesso:', {
        id: withdrawal.id,
        amount: withdrawal.amount,
        status: withdrawal.status,
        reason: withdrawal.rejectionReason
      });

      res.json({ 
        message: "Withdrawal rejected",
        withdrawal 
      });
    } catch (error) {
      console.error("❌ Error rejecting withdrawal:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to reject withdrawal" 
      });
    }
  });

  app.get('/api/admin/roulette-config', requireAdminToken, async (req: any, res) => {
    try {
      const configs = await storage.getRouletteConfigs();
      res.json(configs);
    } catch (error) {
      console.error("Error fetching roulette config:", error);
      res.status(500).json({ message: "Failed to fetch roulette config" });
    }
  });

  app.put('/api/admin/roulette-config/:id', requireAdminToken, async (req: any, res) => {
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

  // Gateway configuration routes
  app.get('/api/admin/gateway-config', requireAdminToken, async (req: any, res) => {
    try {
      const config = await storage.getGatewayConfig();
      res.json(config);
    } catch (error) {
      console.error("Error fetching gateway config:", error);
      res.status(500).json({ message: "Failed to fetch gateway config" });
    }
  });

  app.post('/api/admin/gateway-config', requireAdminToken, async (req: any, res) => {
    try {
      const { publicKey, privateKey } = req.body;

      if (!publicKey) {
        return res.status(400).json({ message: "Public key is required" });
      }

      await storage.saveGatewayConfig(publicKey, privateKey);
      res.json({ message: "Gateway configuration saved successfully" });
    } catch (error) {
      console.error("Error saving gateway config:", error);
      res.status(500).json({ message: "Failed to save gateway config" });
    }
  });

  // Configurações Gerais
  app.get('/api/admin/general-config', requireAdminToken, async (req: any, res) => {
    try {
      const { systemConfig } = await import('@shared/schema');
      
      const configs = await db.select().from(systemConfig).where(
        sql`${systemConfig.key} IN ('deposit_min', 'deposit_max', 'withdrawal_min', 'withdrawal_max', 'affiliate_cpa_percent', 'affiliate_cpa_fixed', 'brpix_secret_key', 'brpix_company_id')`
      );

      const configMap: any = {
        depositMin: 20,
        depositMax: 10000,
        withdrawalMin: 20,
        withdrawalMax: 50000,
        affiliateCpaPercent: 10,
        affiliateCpaFixed: 0,
        brpixSecretKey: '',
        brpixCompanyId: '',
      };

      configs.forEach(config => {
        switch(config.key) {
          case 'deposit_min': configMap.depositMin = parseFloat(config.value || '0'); break;
          case 'deposit_max': configMap.depositMax = parseFloat(config.value || '0'); break;
          case 'withdrawal_min': configMap.withdrawalMin = parseFloat(config.value || '0'); break;
          case 'withdrawal_max': configMap.withdrawalMax = parseFloat(config.value || '0'); break;
          case 'affiliate_cpa_percent': configMap.affiliateCpaPercent = parseFloat(config.value || '0'); break;
          case 'affiliate_cpa_fixed': configMap.affiliateCpaFixed = parseFloat(config.value || '0'); break;
          case 'brpix_secret_key': configMap.brpixSecretKey = config.value || ''; break;
          case 'brpix_company_id': configMap.brpixCompanyId = config.value || ''; break;
        }
      });

      res.json(configMap);
    } catch (error) {
      console.error("Error fetching general config:", error);
      res.status(500).json({ error: "Erro ao buscar configurações" });
    }
  });

  app.post('/api/admin/general-config', requireAdminToken, async (req: any, res) => {
    try {
      const { depositMin, depositMax, withdrawalMin, withdrawalMax, affiliateCpaPercent, affiliateCpaFixed, brpixSecretKey, brpixCompanyId } = req.body;
      const { systemConfig } = await import('@shared/schema');

      const configsToSave = [
        { key: 'deposit_min', value: depositMin.toString(), description: 'Depósito mínimo' },
        { key: 'deposit_max', value: depositMax.toString(), description: 'Depósito máximo' },
        { key: 'withdrawal_min', value: withdrawalMin.toString(), description: 'Saque mínimo' },
        { key: 'withdrawal_max', value: withdrawalMax.toString(), description: 'Saque máximo' },
        { key: 'affiliate_cpa_percent', value: affiliateCpaPercent.toString(), description: 'Percentual CPA afiliados' },
        { key: 'affiliate_cpa_fixed', value: affiliateCpaFixed.toString(), description: 'Valor fixo CPA afiliados' },
        { key: 'brpix_secret_key', value: brpixSecretKey || '', description: 'BRPIX Secret Key', encrypted: true },
        { key: 'brpix_company_id', value: brpixCompanyId || '', description: 'BRPIX Company ID', encrypted: true },
      ];

      for (const config of configsToSave) {
        const existing = await db.select().from(systemConfig).where(eq(systemConfig.key, config.key)).limit(1);
        
        if (existing.length > 0) {
          await db.update(systemConfig)
            .set({ value: config.value, updatedAt: new Date() })
            .where(eq(systemConfig.key, config.key));
        } else {
          await db.insert(systemConfig).values({
            key: config.key,
            value: config.value,
            description: config.description,
            encrypted: (config as any).encrypted || false,
          });
        }
      }

      res.json({ success: true, message: "Configurações salvas com sucesso" });
    } catch (error) {
      console.error("Error saving general config:", error);
      res.status(500).json({ error: "Erro ao salvar configurações" });
    }
  });

  // ===== ROTAS DE AFILIADOS =====
  
  // Estatísticas de afiliados
  app.get('/api/admin/affiliates/stats', requireAdminToken, async (req: any, res) => {
    try {
      const { affiliateReferrals, affiliateCommissions, users } = await import('@shared/schema');
      
      // Total de afiliados (usuários com referralCode)
      const allUsers = await db.select().from(users);
      const totalAffiliates = allUsers.filter(u => u.referralCode).length;
      
      // Afiliados ativos (que têm indicações)
      const activeReferrals = await db.select({ affiliateUserId: affiliateReferrals.affiliateUserId })
        .from(affiliateReferrals)
        .groupBy(affiliateReferrals.affiliateUserId);
      const activeAffiliates = activeReferrals.length;
      
      // Total de indicações
      const totalReferralsData = await db.select().from(affiliateReferrals);
      const totalReferrals = totalReferralsData.length;
      
      // Total de comissões pagas
      const paidCommissions = await db.select().from(affiliateCommissions)
        .where(eq(affiliateCommissions.status, 'paid'));
      const totalCommissionsPaid = paidCommissions.reduce((sum, c) => sum + parseFloat(c.commissionAmount), 0);
      
      // Comissões pendentes
      const pendingCommissions = await db.select().from(affiliateCommissions)
        .where(eq(affiliateCommissions.status, 'pending'));
      const totalPendingCommissions = pendingCommissions.reduce((sum, c) => sum + parseFloat(c.commissionAmount), 0);
      
      res.json({
        totalAffiliates,
        activeAffiliates,
        totalCommissionsPaid: totalCommissionsPaid.toFixed(2).replace('.', ','),
        totalReferrals,
        pendingCommissions: totalPendingCommissions.toFixed(2).replace('.', ','),
      });
    } catch (error) {
      console.error("Error fetching affiliate stats:", error);
      res.status(500).json({ error: "Erro ao buscar estatísticas de afiliados" });
    }
  });

  // Lista de afiliados
  app.get('/api/admin/affiliates/list', requireAdminToken, async (req: any, res) => {
    try {
      const { users, affiliateReferrals, transactions } = await import('@shared/schema');
      
      // Buscar todos os usuários com código de afiliado
      const allUsers = await db.select().from(users);
      const affiliateUsers = allUsers.filter(u => u.referralCode);
      
      const affiliatesList = await Promise.all(affiliateUsers.map(async (user) => {
        // Buscar todas as indicações deste afiliado
        const referrals = await db.select()
          .from(affiliateReferrals)
          .where(eq(affiliateReferrals.affiliateUserId, user.id));
        
        const activeReferrals = referrals.filter(r => r.isActive).length;
        const totalCommission = referrals.reduce((sum, r) => sum + parseFloat(r.totalCommissionEarned || '0'), 0);
        
        // Calcular total de depósitos confirmados dos referidos
        let totalReferredDeposits = 0;
        if (referrals.length > 0) {
          const referredUserIds = referrals.map(r => r.referredUserId);
          const referredDeposits = await db.select()
            .from(transactions)
            .where(
              and(
                inArray(transactions.userId, referredUserIds),
                eq(transactions.type, 'deposit'),
                eq(transactions.status, 'completed')
              )
            );
          
          totalReferredDeposits = referredDeposits.reduce((sum, t) => sum + parseFloat(t.amount), 0);
        }
        
        return {
          userId: user.id,
          userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          email: user.email || '',
          referralCode: user.referralCode || '',
          totalReferrals: referrals.length,
          totalCommissionEarned: totalCommission.toFixed(2).replace('.', ','),
          totalReferredDeposits: totalReferredDeposits.toFixed(2).replace('.', ','),
          activeReferrals,
          createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
        };
      }));
      
      res.json(affiliatesList);
    } catch (error) {
      console.error("Error fetching affiliates list:", error);
      res.status(500).json({ error: "Erro ao buscar lista de afiliados" });
    }
  });

  // Histórico de comissões
  app.get('/api/admin/affiliates/commissions', requireAdminToken, async (req: any, res) => {
    try {
      const { affiliateCommissions, users } = await import('@shared/schema');
      
      const commissions = await db.select().from(affiliateCommissions)
        .orderBy(desc(affiliateCommissions.createdAt))
        .limit(50);
      
      const commissionsWithNames = await Promise.all(commissions.map(async (commission) => {
        const affiliateUser = await db.select().from(users).where(eq(users.id, commission.affiliateUserId)).limit(1);
        const referredUser = await db.select().from(users).where(eq(users.id, commission.referredUserId)).limit(1);
        
        const affiliateName = affiliateUser[0] ? 
          `${affiliateUser[0].firstName || ''} ${affiliateUser[0].lastName || ''}`.trim() || affiliateUser[0].email : 
          'Desconhecido';
        
        const referredName = referredUser[0] ? 
          `${referredUser[0].firstName || ''} ${referredUser[0].lastName || ''}`.trim() || referredUser[0].email : 
          'Desconhecido';
        
        return {
          id: commission.id,
          affiliateUserName: affiliateName,
          referredUserName: referredName,
          commissionAmount: parseFloat(commission.commissionAmount).toFixed(2).replace('.', ','),
          depositAmount: parseFloat(commission.depositAmount || '0').toFixed(2).replace('.', ','),
          commissionType: commission.commissionType,
          createdAt: commission.createdAt.toISOString(),
          status: commission.status,
        };
      }));
      
      res.json(commissionsWithNames);
    } catch (error) {
      console.error("Error fetching commissions history:", error);
      res.status(500).json({ error: "Erro ao buscar histórico de comissões" });
    }
  });

  // ===== ROTAS COMPATÍVEIS COM FRONTEND HTML ORIGINAL =====
  
  // Lista de ganhadores recentes (winners carousel)
  app.get('/ajax/winners.php', async (req, res) => {
    try {
      // Buscar últimos 50 jogos com ganhos > 0
      const winners = await storage.getRecentWinners(50);
      res.json({ 
        success: true,
        winners: winners.map(game => ({
          id: game.id,
          name: `Jogador ${game.userId.substring(0, 6)}`, // Nome do jogador (usando parte do ID)
          prize: `R$ ${parseFloat(game.winAmount).toFixed(2).replace('.', ',')}`, // Prêmio formatado
          userId: game.userId.substring(0, 8),
          betAmount: parseFloat(game.betAmount),
          multiplier: game.multiplier,
          winAmount: parseFloat(game.winAmount),
          createdAt: game.createdAt
        }))
      });
    } catch (error) {
      console.error("Error fetching winners:", error);
      res.status(500).json({ success: false, error: "Erro ao buscar ganhadores" });
    }
  });

  // Obter saldo do usuário
  app.get('/ajax/get_saldo.php', async (req, res) => {
    try {
      const sessionId = req.query.sessionId as string || req.headers['x-session-id'] as string;
      
      if (!sessionId) {
        return res.status(400).json({ error: "Session ID required" });
      }

      // Get or create user
      let user = await storage.getUser(sessionId);
      if (!user) {
        user = await storage.upsertUser({
          id: sessionId,
          email: null,
          firstName: null,
          lastName: null,
          profileImageUrl: null,
        });
      }

      res.json({ 
        success: true,
        saldo: parseFloat(user.balance).toFixed(2),
        balance: parseFloat(user.balance).toFixed(2),
        affiliateBalance: parseFloat(user.affiliateBalance || '0').toFixed(2)
      });
    } catch (error) {
      console.error("Error getting balance:", error);
      res.status(500).json({ error: "Erro ao obter saldo" });
    }
  });

  // Histórico completo do usuário (jogos, depósitos, saques)
  app.get('/ajax/get_history.php', async (req, res) => {
    try {
      console.log('📊 Get history - query:', req.query);
      console.log('📊 Get history - headers x-session-id:', req.headers['x-session-id']);
      
      const sessionId = req.query.sessionId as string || req.headers['x-session-id'] as string;
      
      console.log('📊 Get history request - sessionId:', sessionId);
      
      if (!sessionId) {
        console.log('❌ No sessionId provided');
        return res.status(400).json({ error: "Session ID required" });
      }

      // Buscar jogos, depósitos e saques
      const [games, transactions, withdrawals] = await Promise.all([
        storage.getGamesByUserId(sessionId, 50),
        storage.getTransactionsByUserId(sessionId),
        storage.getWithdrawalsByUserId(sessionId)
      ]);
      
      console.log(`📊 Found: ${games.length} games, ${transactions.length} transactions, ${withdrawals.length} withdrawals`);
      
      // Combinar tudo em um histórico unificado
      const history: any[] = [];
      
      // Adicionar jogos
      games.forEach(game => {
        const winAmount = parseFloat(game.winAmount);
        const betAmount = parseFloat(game.betAmount);
        const profit = winAmount - betAmount;
        
        history.push({
          id: game.id,
          tipo: 'jogo',
          valor: betAmount,
          resultado: profit,
          multiplier: game.multiplier,
          createdAt: game.createdAt,
          data_jogo_formatada: new Date(game.createdAt).toLocaleString('pt-BR')
        });
      });
      
      // Adicionar depósitos confirmados
      transactions.filter(t => t.status === 'completed').forEach(transaction => {
        history.push({
          id: transaction.id,
          tipo: 'deposito',
          valor: parseFloat(transaction.amount),
          resultado: parseFloat(transaction.amount), // Depósito é sempre positivo
          createdAt: transaction.createdAt,
          data_jogo_formatada: new Date(transaction.createdAt).toLocaleString('pt-BR')
        });
      });
      
      // Adicionar saques (todos os status)
      withdrawals.forEach(withdrawal => {
        history.push({
          id: withdrawal.id,
          tipo: 'saque',
          valor: parseFloat(withdrawal.amount),
          resultado: -parseFloat(withdrawal.amount), // Saque é sempre negativo
          status: withdrawal.status,
          pixKey: withdrawal.pixKey,
          createdAt: withdrawal.createdAt,
          data_jogo_formatada: new Date(withdrawal.createdAt).toLocaleString('pt-BR')
        });
      });
      
      // Ordenar por data (mais recente primeiro)
      history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const limitedHistory = history.slice(0, 50);
      console.log(`📊 Returning ${limitedHistory.length} items in history`);
      
      res.json({ success: true, history: limitedHistory });
    } catch (error) {
      console.error("Error getting history:", error);
      res.status(500).json({ error: "Erro ao obter histórico" });
    }
  });

  // Iniciar giro (start spin)
  app.post('/ajax/start_spin.php', async (req, res) => {
    try {
      const sessionId = req.body.sessionId || req.headers['x-session-id'] as string;
      const betAmount = parseFloat(req.body.betAmount || req.body.valor);

      if (!sessionId) {
        return res.status(400).json({ error: "Session ID required" });
      }

      if (!betAmount || betAmount <= 0) {
        return res.status(400).json({ error: "Valor de aposta inválido" });
      }

      // Get or create user
      let user = await storage.getUserBalance(sessionId);
      if (!user) {
        user = await storage.upsertUser({
          id: sessionId,
          email: null,
          firstName: null,
          lastName: null,
          profileImageUrl: null,
        });
      }

      // Check user balance
      if (parseFloat(user.balance) < betAmount) {
        return res.status(400).json({ error: "Saldo insuficiente" });
      }

      // Mapeamento das roletas (deve corresponder ao frontend)
      const roleta1Map = [0, 5, 15, 2, 20, 100, 10, 50]; // Roleta grande
      const roleta2Map = [2, 3, 4, 1]; // Roleta pequena
      
      // Get roulette configuration for roleta1 (main/big wheel)
      const configs = await storage.getRouletteConfigsByType('main');
      
      let mult1 = 0;
      let posicao1 = 0;

      // Sortear multiplicador da roleta GRANDE (roleta1)
      if (user.influencerMode) {
        const influencerRandom = Math.random() * 100;
        
        if (influencerRandom < 70) {
          // 70% chance: Select a winning multiplier (> 0)
          const winningConfigs = configs.filter(c => c.multiplier > 0);
          if (winningConfigs.length > 0) {
            const totalWinProb = winningConfigs.reduce((sum, c) => sum + parseFloat(c.probability), 0);
            const winRandom = Math.random() * totalWinProb;
            let cumulativeWinProb = 0;
            
            for (const config of winningConfigs) {
              cumulativeWinProb += parseFloat(config.probability);
              if (winRandom <= cumulativeWinProb) {
                mult1 = config.multiplier;
                break;
              }
            }
          }
        } else {
          const random = Math.random() * 100;
          let cumulativeProbability = 0;

          for (const config of configs) {
            cumulativeProbability += parseFloat(config.probability);
            if (random <= cumulativeProbability) {
              mult1 = config.multiplier;
              break;
            }
          }
        }
      } else {
        // Normal mode
        const random = Math.random() * 100;
        let cumulativeProbability = 0;

        for (const config of configs) {
          cumulativeProbability += parseFloat(config.probability);
          if (random <= cumulativeProbability) {
            mult1 = config.multiplier;
            break;
          }
        }
      }
      
      // Mapear multiplicador para posição na roleta1
      posicao1 = roleta1Map.indexOf(mult1);
      if (posicao1 === -1) posicao1 = 0;
      
      // Sortear multiplicador da roleta PEQUENA (roleta2) - aleatório uniforme
      const posicao2 = Math.floor(Math.random() * roleta2Map.length);
      const mult2 = roleta2Map[posicao2];
      
      // CÁLCULO CORRETO: aposta × mult_roleta1 × mult_roleta2
      const winAmount = betAmount * mult1 * mult2;
      const netChange = winAmount - betAmount;
      
      // Multiplicador total para registro
      const totalMultiplier = mult1 * mult2;

      // Create game record
      const game = await storage.createGame({
        userId: sessionId,
        betAmount: betAmount.toString(),
        multiplier: totalMultiplier,
        winAmount: winAmount.toString(),
        rouletteType: 'main',
        status: 'completed',
      });

      // Create bet transaction
      await storage.createTransaction({
        userId: sessionId,
        type: 'bet',
        amount: betAmount.toString(),
        status: 'completed',
        gameId: game.id,
        description: `Aposta no jogo ${game.id}`,
      });

      // Create win transaction if won
      if (winAmount > 0) {
        await storage.createTransaction({
          userId: sessionId,
          type: 'win',
          amount: winAmount.toString(),
          status: 'completed',
          gameId: game.id,
          description: `Ganho no jogo ${game.id} - ${mult1}x × ${mult2}x = ${totalMultiplier}x`,
        });
      }

      // Update user balance and stats
      await storage.updateUserBalance(sessionId, netChange);
      await storage.updateUserStats(sessionId, betAmount, winAmount);

      // Get updated balance
      const updatedUser = await storage.getUserBalance(sessionId);

      res.json({
        success: true,
        multiplier: totalMultiplier,
        mult1,
        mult2,
        winAmount: winAmount.toFixed(2),
        balance: parseFloat(updatedUser?.balance || '0').toFixed(2),
        newBalance: parseFloat(updatedUser?.balance || '0').toFixed(2),
        premio: winAmount.toFixed(2),
        ganhoFinal: winAmount.toFixed(2),
        posicao1,
        posicao2,
        bonus_multiplier: null,
      });
    } catch (error) {
      console.error("Error starting spin:", error);
      res.status(500).json({ error: "Erro ao iniciar giro" });
    }
  });

  // Finalizar giro (finish spin) - pode ser apenas confirmação
  app.post('/ajax/finish_spin.php', async (req, res) => {
    try {
      res.json({ success: true });
    } catch (error) {
      console.error("Error finishing spin:", error);
      res.status(500).json({ error: "Erro ao finalizar giro" });
    }
  });

  // Criar pagamento PIX
  app.post('/api/payment.php', async (req, res) => {
    try {
      console.log('📥 Payment request body:', req.body);
      const sessionId = req.body.sessionId || req.headers['x-session-id'] as string;
      const amount = parseFloat(req.body.amount || req.body.valor);

      console.log('🔍 Parsed values:', { sessionId, amount, amountRaw: req.body.amount, valorRaw: req.body.valor });

      if (!sessionId) {
        return res.status(400).json({ error: "Session ID required" });
      }

      // Get or create user
      let user = await storage.getUser(sessionId);
      if (!user) {
        user = await storage.upsertUser({
          id: sessionId,
          email: null,
          firstName: null,
          lastName: null,
          profileImageUrl: null,
        });
      }

      if (!amount || amount <= 0) {
        console.log('❌ Invalid amount:', { amount, isNaN: isNaN(amount), isLessThanZero: amount <= 0 });
        return res.status(400).json({ error: "Valor de depósito inválido" });
      }

      // Create BRPIX transaction
      const brpixTransaction = await brpixService.createTransaction({
        amount,
        description: `Depósito Roleta do Tigre - User ${sessionId}`,
        externalReference: sessionId,
        expirationMinutes: 30,
      });

      // Calculate split amount
      const splitAmount = brpixService.calculateSplitAmount(amount);

      // Create deposit transaction in database
      const transaction = await storage.createTransaction({
        userId: sessionId,
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
        success: true,
        transactionId: transaction.id,
        qrcode: brpixTransaction.copyPaste,
        qrCodeImage: brpixTransaction.qrCodeImage,
        copyPaste: brpixTransaction.copyPaste,
        expiresAt: brpixTransaction.expiresAt,
        amount,
      });
    } catch (error) {
      console.error("Error creating payment:", error);
      res.status(500).json({ error: "Erro ao criar pagamento" });
    }
  });

  // Verificar status do pagamento
  app.get('/api/check_payment_status.php', async (req, res) => {
    try {
      const transactionId = req.query.transactionId as string;

      if (!transactionId) {
        return res.status(400).json({ error: "Transaction ID required" });
      }

      const transaction = await storage.getTransactionById(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ error: "Transação não encontrada" });
      }

      if (transaction.status === 'completed') {
        return res.json({ 
          status: 'completed',
          paid: true,
          message: 'Pagamento confirmado' 
        });
      }

      // Check BRPIX status
      if (transaction.brpixTransactionId) {
        const brpixStatus = await brpixService.getTransactionStatus(transaction.brpixTransactionId);
        
        if (brpixStatus === 'paid' || brpixStatus === 'completed') {
          // Usar UPDATE atômico: só atualiza se status='pending'
          const result = await db.update(transactions)
            .set({ 
              status: 'completed',
              updatedAt: new Date()
            })
            .where(
              sql`${transactions.id} = ${transactionId} AND ${transactions.status} = 'pending'`
            )
            .returning();
          
          // Se retornou linha, significa que ERA pending e foi atualizado agora
          if (result.length > 0) {
            console.log('💰 Pagamento confirmado ATOMICAMENTE! Creditando saldo...', {
              transactionId,
              userId: transaction.userId,
              amount: transaction.amount
            });
            
            // Update user balance and total deposited
            const userId = transaction.userId;
            await storage.updateUserBalance(userId, parseFloat(transaction.amount));
            
            console.log('✅ Saldo creditado com sucesso!', {
              userId,
              creditedAmount: transaction.amount
            });
            
            // Update total deposited via SQL
            await db.update(users)
              .set({
                totalDeposited: sql`${users.totalDeposited} + ${parseFloat(transaction.amount)}`,
                updatedAt: new Date()
              })
              .where(eq(users.id, userId));
            
            const user = await storage.getUser(userId);
            console.log('📊 Total depositado atualizado!', {
              userId,
              newBalance: user?.balance,
              newTotalDeposited: user?.totalDeposited
            });
            
            // 💰 PROCESSAR COMISSÃO DE AFILIADO (CPA)
            console.log('🔍 Verificando comissão de afiliado para userId:', userId, 'referredByUserId:', user?.referredByUserId);
            
            if (user?.referredByUserId) {
              try {
                console.log('✅ Usuário foi referido! Iniciando processo de comissão...');
                const { systemConfig, affiliateCommissions, affiliateReferrals } = await import('@shared/schema');
                
                // Buscar configurações de CPA
                const configs = await db.select().from(systemConfig).where(
                  sql`${systemConfig.key} IN ('affiliate_cpa_percent', 'affiliate_cpa_fixed')`
                );
                
                console.log('📋 Configurações CPA encontradas:', configs);
                
                let cpaPercent = 0;
                let cpaFixed = 0;
                configs.forEach(config => {
                  if (config.key === 'affiliate_cpa_percent') cpaPercent = parseFloat(config.value || '0');
                  if (config.key === 'affiliate_cpa_fixed') cpaFixed = parseFloat(config.value || '0');
                });
                
                console.log('💵 Valores CPA:', { cpaPercent, cpaFixed });
                
                // Calcular comissão
                const depositAmount = parseFloat(transaction.amount);
                const commissionPercent = (depositAmount * cpaPercent) / 100;
                const totalCommission = commissionPercent + cpaFixed;
                
                console.log('🧮 Cálculo da comissão:', {
                  depositAmount,
                  commissionPercent,
                  cpaFixed,
                  totalCommission
                });
                
                if (totalCommission > 0) {
                  console.log('💰 Criando registro de comissão...');
                  
                  // Criar registro de comissão
                  await db.insert(affiliateCommissions).values({
                    affiliateUserId: user.referredByUserId,
                    referredUserId: userId,
                    transactionId: transactionId,
                    commissionAmount: totalCommission.toFixed(2),
                    depositAmount: depositAmount.toFixed(2),
                    commissionType: `${cpaPercent}% + R$ ${cpaFixed.toFixed(2)}`,
                    status: 'paid',
                  });
                  
                  console.log('✅ Registro de comissão criado!');
                  
                  // Creditar comissão no saldo de afiliado (separado)
                  await storage.updateAffiliateBalance(user.referredByUserId, totalCommission);
                  console.log('✅ Saldo de afiliado creditado!');
                  
                  // Atualizar total ganho no affiliateReferrals
                  await db.update(affiliateReferrals)
                    .set({
                      totalCommissionEarned: sql`${affiliateReferrals.totalCommissionEarned} + ${totalCommission}`,
                      updatedAt: new Date()
                    })
                    .where(
                      sql`${affiliateReferrals.affiliateUserId} = ${user.referredByUserId} AND ${affiliateReferrals.referredUserId} = ${userId}`
                    );
                  
                  console.log('✅ Total de comissões do afiliado atualizado!');
                  
                  console.log('💰 Comissão CPA creditada COM SUCESSO!', {
                    affiliateUserId: user.referredByUserId,
                    referredUserId: userId,
                    depositAmount,
                    commission: totalCommission,
                    type: `${cpaPercent}% + R$ ${cpaFixed}`
                  });
                } else {
                  console.log('⚠️ Comissão total é zero, pulando criação de registro');
                }
              } catch (commissionError) {
                console.error('❌ ERRO CRÍTICO ao processar comissão de afiliado:', commissionError);
                console.error('❌ Stack trace:', (commissionError as Error).stack);
                // Não falhar a transação principal se houver erro na comissão
              }
            } else {
              console.log('ℹ️ Usuário não foi referido por ninguém, sem comissão a processar');
            }
          } else {
            console.log('ℹ️ Transação já foi creditada anteriormente (race condition evitada)');
          }

          res.json({ 
            status: 'completed',
            paid: true,
            message: 'Pagamento confirmado' 
          });
        } else {
          res.json({ 
            status: brpixStatus,
            paid: false,
            message: 'Aguardando pagamento' 
          });
        }
      } else {
        res.json({ 
          status: 'pending',
          paid: false,
          message: 'Aguardando pagamento' 
        });
      }
    } catch (error) {
      console.error("Error checking payment status:", error);
      res.status(500).json({ error: "Erro ao verificar status do pagamento" });
    }
  });

  // Solicitar saque
  app.post('/api/withdraw.php', async (req, res) => {
    try {
      const sessionId = req.body.sessionId || req.headers['x-session-id'] as string;
      const amount = parseFloat(req.body.amount || req.body.valor);
      const pixKeyType = req.body.pixKeyType || req.body.tipo_chave;
      const pixKey = req.body.pixKey || req.body.chave_pix;
      const walletType = req.body.walletType || 'main'; // 'main' ou 'affiliate'

      if (!sessionId) {
        return res.status(400).json({ error: "Session ID required" });
      }

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Valor inválido" });
      }

      if (!pixKeyType || !pixKey) {
        return res.status(400).json({ error: "Chave PIX obrigatória" });
      }

      // Check user balance
      const user = await storage.getUser(sessionId);
      if (!user) {
        return res.status(400).json({ error: "Usuário não encontrado" });
      }

      // Verificar saldo baseado no tipo de carteira
      const currentBalance = walletType === 'affiliate' 
        ? parseFloat(user.affiliateBalance || '0')
        : parseFloat(user.balance);

      if (currentBalance < amount) {
        return res.status(400).json({ error: "Saldo insuficiente" });
      }

      // Deduzir do saldo correto
      if (walletType === 'affiliate') {
        await storage.updateAffiliateBalance(sessionId, -amount);
      } else {
        await storage.updateUserBalance(sessionId, -amount);
      }

      // Create withdrawal request
      const withdrawal = await storage.createWithdrawal({
        userId: sessionId,
        amount: amount.toString(),
        pixKeyType,
        pixKey,
        status: 'pending',
      });

      res.json({ 
        success: true,
        message: "Solicitação de saque criada com sucesso",
        withdrawalId: withdrawal.id,
      });
    } catch (error) {
      console.error("Error creating withdrawal:", error);
      res.status(500).json({ error: "Erro ao criar solicitação de saque" });
    }
  });

  // Verificar rollover (se aplicável)
  app.get('/api/check_rollover.php', async (req, res) => {
    try {
      const sessionId = req.query.sessionId as string || req.headers['x-session-id'] as string;
      
      // Por enquanto, sempre retorna rollover completo
      res.json({ 
        success: true,
        rolloverCompleto: true,
        rollover_completo: true, // compatibilidade
        rolloverRestante: 0,
        rollover_restante: 0, // compatibilidade
        rolloverTotal: 0,
        rollover_total: 0 // compatibilidade
      });
    } catch (error) {
      console.error("Error checking rollover:", error);
      res.status(500).json({ 
        success: false,
        error: "Erro ao verificar rollover" 
      });
    }
  });

  // Dados de afiliado
  app.get('/ajax/get_affiliate_data.php', async (req, res) => {
    try {
      const sessionId = req.query.sessionId as string || req.headers['x-session-id'] as string;
      
      if (!sessionId) {
        return res.json({ success: false, message: 'Sessão inválida' });
      }

      // Buscar usuário
      const user = await storage.getUser(sessionId);
      
      if (!user) {
        return res.json({ success: false, message: 'Usuário não encontrado' });
      }

      // Gerar link de afiliado
      const affiliateLink = `${req.protocol}://${req.get('host')}?ref=${user.referralCode}`;

      // Buscar indicados do usuário
      const referrals = await db.select().from(users).where(eq(users.referredByUserId, user.id));
      
      // Contar depositantes ativos (usuários que fizeram depósito)
      const depositantes = referrals.filter(r => parseFloat(r.totalDeposited || '0') > 0).length;

      // Calcular ganhos de comissões (3% dos depósitos dos indicados)
      let totalComission = 0;
      for (const referral of referrals) {
        const depositValue = parseFloat(referral.totalDeposited || '0');
        totalComission += depositValue * 0.03; // 3% de comissão
      }

      res.json({
        success: true,
        link: affiliateLink,
        stats: {
          convidados: referrals.length,
          depositantes: depositantes,
          ganhos: totalComission
        },
        comissoes: {
          master: 0,
          agente: 0,
          blogueiro: 3
        },
        historico: []
      });
    } catch (error) {
      console.error("Error getting affiliate data:", error);
      res.json({ success: false, message: "Erro ao obter dados de afiliado" });
    }
  });

  // ===== ROTAS ADMIN PHP-COMPATÍVEIS (SEM REPLIT AUTH) =====
  
  // Verificar se o token é válido
  function isAdminToken(token: string | undefined): boolean {
    if (!token) return false;
    return isValidAdminToken(token);
  }
  
  // Rota de login admin
  app.post('/ajax/admin_login.php', async (req, res) => {
    try {
      const { password } = req.body;
      
      if (password === process.env.ADMIN_PASSWORD) {
        const token = generateAdminToken();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas
        
        adminTokens.set(token, { token, expiresAt });
        
        res.json({ 
          success: true, 
          token,
          expiresAt: expiresAt.toISOString()
        });
      } else {
        res.status(401).json({ success: false, error: "Senha incorreta" });
      }
    } catch (error) {
      console.error("Error in admin login:", error);
      res.status(500).json({ success: false, error: "Erro ao fazer login" });
    }
  });

  // Helper para extrair token admin do header Authorization
  function getAdminToken(req: any): string | undefined {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return undefined;
  }

  // Estatísticas do dashboard admin
  app.get('/ajax/admin_stats.php', async (req, res) => {
    try {
      const token = getAdminToken(req);
      
      if (!isAdminToken(token)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ error: "Erro ao buscar estatísticas" });
    }
  });

  // Lista de usuários admin
  app.get('/ajax/admin_users.php', async (req, res) => {
    try {
      const token = getAdminToken(req);
      
      if (!isAdminToken(token)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Erro ao buscar usuários" });
    }
  });

  // Lista de transações admin
  app.get('/ajax/admin_transactions.php', async (req, res) => {
    try {
      const token = getAdminToken(req);
      
      if (!isAdminToken(token)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const transactions = await storage.getAllTransactions();
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ error: "Erro ao buscar transações" });
    }
  });

  // Lista de saques admin
  app.get('/ajax/admin_withdrawals.php', async (req, res) => {
    try {
      const token = getAdminToken(req);
      
      if (!isAdminToken(token)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const withdrawals = await storage.getAllWithdrawals();
      res.json(withdrawals);
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
      res.status(500).json({ error: "Erro ao buscar saques" });
    }
  });

  // Aprovar saque admin
  app.post('/ajax/admin_approve_withdrawal.php', async (req, res) => {
    try {
      const token = getAdminToken(req);
      const withdrawalId = req.body.withdrawalId;
      
      if (!isAdminToken(token)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      if (!withdrawalId) {
        return res.status(400).json({ error: "ID do saque é obrigatório" });
      }

      const withdrawal = await storage.approveWithdrawal(withdrawalId);
      res.json({ success: true, withdrawal });
    } catch (error) {
      console.error("Error approving withdrawal:", error);
      res.status(500).json({ error: "Erro ao aprovar saque" });
    }
  });

  // Rejeitar saque admin
  app.post('/ajax/admin_reject_withdrawal.php', async (req, res) => {
    try {
      const token = getAdminToken(req);
      const withdrawalId = req.body.withdrawalId;
      const reason = req.body.reason;
      
      if (!isAdminToken(token)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      if (!withdrawalId) {
        return res.status(400).json({ error: "ID do saque é obrigatório" });
      }

      const withdrawal = await storage.rejectWithdrawal(withdrawalId, reason || 'Rejeitado pelo administrador');
      res.json({ success: true, withdrawal });
    } catch (error) {
      console.error("Error rejecting withdrawal:", error);
      res.status(500).json({ error: "Erro ao rejeitar saque" });
    }
  });

  // Configuração da roleta admin
  app.get('/ajax/admin_roulette_config.php', async (req, res) => {
    try {
      const token = getAdminToken(req);
      
      if (!isAdminToken(token)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const configs = await storage.getRouletteConfigs();
      res.json(configs);
    } catch (error) {
      console.error("Error fetching roulette config:", error);
      res.status(500).json({ error: "Erro ao buscar configuração da roleta" });
    }
  });

  // Atualizar configuração da roleta admin
  app.post('/ajax/admin_update_roulette.php', async (req, res) => {
    try {
      const token = getAdminToken(req);
      const configId = req.body.configId;
      const probability = parseFloat(req.body.probability);
      
      if (!isAdminToken(token)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      if (!configId || isNaN(probability)) {
        return res.status(400).json({ error: "Dados inválidos" });
      }

      if (probability < 0 || probability > 100) {
        return res.status(400).json({ error: "Probabilidade deve estar entre 0 e 100" });
      }

      const config = await storage.updateRouletteConfig(configId, probability);
      res.json({ success: true, config });
    } catch (error) {
      console.error("Error updating roulette config:", error);
      res.status(500).json({ error: "Erro ao atualizar configuração" });
    }
  });

  // Depósitos dos últimos 7 dias (gráfico)
  app.get('/ajax/admin_deposits_7days.php', async (req, res) => {
    try {
      const token = getAdminToken(req);
      
      if (!isAdminToken(token)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const data = await storage.getDeposits7Days();
      res.json(data);
    } catch (error) {
      console.error("Error fetching deposits 7 days:", error);
      res.status(500).json({ error: "Erro ao buscar depósitos" });
    }
  });

  // Maiores saldos de usuários (gráfico)
  app.get('/ajax/admin_top_balances.php', async (req, res) => {
    try {
      const token = getAdminToken(req);
      
      if (!isAdminToken(token)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const data = await storage.getTopBalances();
      res.json(data);
    } catch (error) {
      console.error("Error fetching top balances:", error);
      res.status(500).json({ error: "Erro ao buscar saldos" });
    }
  });

  // Configuração do gateway
  app.get('/ajax/admin_gateway_config.php', async (req, res) => {
    try {
      const token = getAdminToken(req);
      
      if (!isAdminToken(token)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const config = await storage.getGatewayConfig();
      res.json(config);
    } catch (error) {
      console.error("Error fetching gateway config:", error);
      res.status(500).json({ error: "Erro ao buscar configuração do gateway" });
    }
  });

  // Salvar configuração do gateway
  app.post('/ajax/admin_save_gateway.php', async (req, res) => {
    try {
      const token = getAdminToken(req);
      const { publicKey, privateKey } = req.body;
      
      if (!isAdminToken(token)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      if (!publicKey || !privateKey) {
        return res.status(400).json({ error: "Preencha todos os campos" });
      }

      await storage.saveGatewayConfig(publicKey, privateKey);
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving gateway config:", error);
      res.status(500).json({ error: "Erro ao salvar configuração" });
    }
  });

  // Listar afiliados e estatísticas
  app.get('/ajax/admin_affiliates.php', async (req, res) => {
    try {
      const token = getAdminToken(req);
      
      if (!isAdminToken(token)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      // Buscar todos os usuários que têm indicados
      const allUsers = await db.select().from(users);
      
      const affiliatesData = [];
      
      for (const user of allUsers) {
        // Buscar indicados deste usuário
        const referrals = await db.select().from(users).where(eq(users.referredByUserId, user.id));
        
        if (referrals.length > 0) {
          // Contar depositantes (usuários que fizeram depósito)
          const depositantes = referrals.filter(r => parseFloat(r.totalDeposited || '0') > 0).length;
          
          // Calcular comissões (3% dos depósitos dos indicados)
          let totalCommission = 0;
          for (const referral of referrals) {
            const depositValue = parseFloat(referral.totalDeposited || '0');
            totalCommission += depositValue * 0.03;
          }
          
          affiliatesData.push({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            referralCode: user.referralCode || user.id,
            totalReferrals: referrals.length,
            activeReferrals: depositantes,
            totalCommission: totalCommission.toFixed(2),
            affiliateLink: `${req.protocol}://${req.get('host')}?ref=${user.id}`,
            createdAt: user.createdAt
          });
        }
      }
      
      // Ordenar por total de comissões (maior para menor)
      affiliatesData.sort((a, b) => parseFloat(b.totalCommission) - parseFloat(a.totalCommission));
      
      res.json(affiliatesData);
    } catch (error) {
      console.error("Error loading affiliates:", error);
      res.status(500).json({ error: "Erro ao carregar afiliados" });
    }
  });

  // Editar usuário
  app.post('/ajax/admin_edit_user.php', async (req, res) => {
    try {
      const token = getAdminToken(req);
      
      if (!isAdminToken(token)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const { userId, email, firstName, lastName, balance, influencerMode, isActive, password } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "ID do usuário é obrigatório" });
      }

      const updateData: any = {
        updatedAt: new Date()
      };

      if (email !== undefined) updateData.email = email;
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (balance !== undefined) updateData.balance = String(balance);
      if (influencerMode !== undefined) updateData.influencerMode = influencerMode;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (password) updateData.password = password; // Em produção, deve ser hash

      await db.update(users).set(updateData).where(eq(users.id, userId));
      
      res.json({ success: true, message: "Usuário atualizado com sucesso" });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Erro ao atualizar usuário" });
    }
  });

  // Rotas admin para configuração BRPIX
  app.get('/ajax/admin_brpix_config.php', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!isAdminToken(token)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const { systemConfig } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');

      const secretKeyConfig = await db.select()
        .from(systemConfig)
        .where(eq(systemConfig.key, 'brpix_secret_key'))
        .limit(1);

      const companyIdConfig = await db.select()
        .from(systemConfig)
        .where(eq(systemConfig.key, 'brpix_company_id'))
        .limit(1);

      res.json({
        success: true,
        config: {
          secretKey: secretKeyConfig[0]?.value || '',
          companyId: companyIdConfig[0]?.value || '',
          configured: !!(secretKeyConfig[0]?.value && companyIdConfig[0]?.value)
        }
      });
    } catch (error) {
      console.error("Error fetching BRPIX config:", error);
      res.status(500).json({ error: "Erro ao buscar configurações BRPIX" });
    }
  });

  app.post('/ajax/admin_brpix_config.php', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!isAdminToken(token)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const { secretKey, companyId } = req.body;
      
      if (!secretKey || !companyId) {
        return res.status(400).json({ error: "Secret Key e Company ID são obrigatórios" });
      }

      const { systemConfig } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');

      // Atualizar ou criar Secret Key
      const existingSecretKey = await db.select()
        .from(systemConfig)
        .where(eq(systemConfig.key, 'brpix_secret_key'))
        .limit(1);

      if (existingSecretKey.length > 0) {
        await db.update(systemConfig)
          .set({ value: secretKey, updatedAt: new Date() })
          .where(eq(systemConfig.key, 'brpix_secret_key'));
      } else {
        await db.insert(systemConfig).values({
          key: 'brpix_secret_key',
          value: secretKey,
          description: 'BRPIX API Secret Key',
          encrypted: false,
        });
      }

      // Atualizar ou criar Company ID
      const existingCompanyId = await db.select()
        .from(systemConfig)
        .where(eq(systemConfig.key, 'brpix_company_id'))
        .limit(1);

      if (existingCompanyId.length > 0) {
        await db.update(systemConfig)
          .set({ value: companyId, updatedAt: new Date() })
          .where(eq(systemConfig.key, 'brpix_company_id'));
      } else {
        await db.insert(systemConfig).values({
          key: 'brpix_company_id',
          value: companyId,
          description: 'BRPIX Company ID',
          encrypted: false,
        });
      }

      console.log('✅ BRPIX credentials configured successfully');
      
      res.json({ 
        success: true, 
        message: "Credenciais BRPIX configuradas com sucesso" 
      });
    } catch (error) {
      console.error("Error saving BRPIX config:", error);
      res.status(500).json({ error: "Erro ao salvar configurações BRPIX" });
    }
  });

  // ENDPOINT DE TESTE - Simular confirmação de depósito (REMOVER EM PRODUÇÃO)
  app.post('/api/test/confirm-deposit', async (req, res) => {
    try {
      const { transactionId } = req.body;
      
      if (!transactionId) {
        return res.status(400).json({ error: "Transaction ID required" });
      }

      const transaction = await storage.getTransactionById(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ error: "Transação não encontrada" });
      }

      if (transaction.status === 'completed') {
        return res.json({ message: 'Transação já confirmada anteriormente' });
      }

      // Usar UPDATE atômico: só atualiza se status='pending'
      const result = await db.update(transactions)
        .set({ 
          status: 'completed',
          updatedAt: new Date()
        })
        .where(
          sql`${transactions.id} = ${transactionId} AND ${transactions.status} = 'pending'`
        )
        .returning();
      
      // Se retornou linha, significa que ERA pending e foi atualizado agora
      if (result.length > 0) {
        console.log('💰 [TESTE] Pagamento confirmado ATOMICAMENTE!', {
          transactionId,
          userId: transaction.userId,
          amount: transaction.amount
        });
        
        // Update user balance and total deposited
        const userId = transaction.userId;
        await storage.updateUserBalance(userId, parseFloat(transaction.amount));
        
        console.log('✅ [TESTE] Saldo creditado!', {
          userId,
          creditedAmount: transaction.amount
        });
        
        // Update total deposited via SQL
        await db.update(users)
          .set({
            totalDeposited: sql`${users.totalDeposited} + ${parseFloat(transaction.amount)}`,
            updatedAt: new Date()
          })
          .where(eq(users.id, userId));
        
        const user = await storage.getUser(userId);
        console.log('📊 [TESTE] Total depositado atualizado!', {
          userId,
          newBalance: user?.balance,
          newTotalDeposited: user?.totalDeposited
        });
        
        // 💰 PROCESSAR COMISSÃO DE AFILIADO (CPA)
        console.log('🔍 Verificando comissão de afiliado para userId:', userId, 'referredByUserId:', user?.referredByUserId);
        
        if (user?.referredByUserId) {
          try {
            console.log('✅ Usuário foi referido! Iniciando processo de comissão...');
            const { systemConfig, affiliateCommissions, affiliateReferrals } = await import('@shared/schema');
            
            // Buscar configurações de CPA
            const configs = await db.select().from(systemConfig).where(
              sql`${systemConfig.key} IN ('affiliate_cpa_percent', 'affiliate_cpa_fixed')`
            );
            
            console.log('📋 Configurações CPA encontradas:', configs);
            
            let cpaPercent = 0;
            let cpaFixed = 0;
            configs.forEach(config => {
              if (config.key === 'affiliate_cpa_percent') cpaPercent = parseFloat(config.value || '0');
              if (config.key === 'affiliate_cpa_fixed') cpaFixed = parseFloat(config.value || '0');
            });
            
            console.log('💵 Valores CPA:', { cpaPercent, cpaFixed });
            
            // Calcular comissão
            const depositAmount = parseFloat(transaction.amount);
            const commissionPercent = (depositAmount * cpaPercent) / 100;
            const totalCommission = commissionPercent + cpaFixed;
            
            console.log('🧮 Cálculo da comissão:', {
              depositAmount,
              commissionPercent,
              cpaFixed,
              totalCommission
            });
            
            if (totalCommission > 0) {
              console.log('💰 Criando registro de comissão...');
              
              // Criar registro de comissão
              await db.insert(affiliateCommissions).values({
                affiliateUserId: user.referredByUserId,
                referredUserId: userId,
                transactionId: transactionId,
                commissionAmount: totalCommission.toFixed(2),
                depositAmount: depositAmount.toFixed(2),
                commissionType: `${cpaPercent}% + R$ ${cpaFixed.toFixed(2)}`,
                status: 'paid',
              });
              
              console.log('✅ Registro de comissão criado!');
              
              // Creditar comissão no saldo de afiliado (separado)
              await storage.updateAffiliateBalance(user.referredByUserId, totalCommission);
              console.log('✅ Saldo de afiliado creditado!');
              
              // Atualizar total ganho no affiliateReferrals
              await db.update(affiliateReferrals)
                .set({
                  totalCommissionEarned: sql`${affiliateReferrals.totalCommissionEarned} + ${totalCommission}`,
                  updatedAt: new Date()
                })
                .where(
                  sql`${affiliateReferrals.affiliateUserId} = ${user.referredByUserId} AND ${affiliateReferrals.referredUserId} = ${userId}`
                );
              
              console.log('✅ Total de comissões do afiliado atualizado!');
              
              console.log('💰 Comissão CPA creditada COM SUCESSO!', {
                affiliateUserId: user.referredByUserId,
                referredUserId: userId,
                depositAmount,
                commission: totalCommission,
                type: `${cpaPercent}% + R$ ${cpaFixed}`
              });
            } else {
              console.log('⚠️ Comissão total é zero, pulando criação de registro');
            }
          } catch (commissionError) {
            console.error('❌ ERRO CRÍTICO ao processar comissão de afiliado:', commissionError);
            console.error('❌ Stack trace:', (commissionError as Error).stack);
          }
        } else {
          console.log('ℹ️ Usuário não foi referido por ninguém, sem comissão a processar');
        }

        res.json({ 
          success: true,
          message: 'Depósito confirmado e comissão processada (se aplicável)'
        });
      } else {
        res.json({ message: 'Transação já foi creditada anteriormente' });
      }
    } catch (error) {
      console.error("[TESTE] Error confirming deposit:", error);
      res.status(500).json({ error: "Erro ao confirmar depósito de teste" });
    }
  });

  // Servir arquivos estáticos da pasta public com cache adequado
  app.use(express.static(path.join(process.cwd(), 'public'), {
    maxAge: 0,
    etag: true,
    lastModified: true,
    setHeaders: (res, filepath) => {
      if (filepath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else if (filepath.match(/\.(css|js)$/)) {
        // CSS e JS sem hash - cache curto para permitir atualizações
        const maxAge = process.env.NODE_ENV === 'production' ? 3600 : 0; // 1 hora em produção
        res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
      } else if (filepath.match(/\.(jpg|jpeg|png|gif|svg|ico)$/)) {
        // Imagens - cache médio (1 semana)
        const maxAge = process.env.NODE_ENV === 'production' ? 604800 : 0;
        res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
      } else if (filepath.match(/\.(woff|woff2|ttf|eot)$/)) {
        // Fontes - cache longo (1 ano)
        const maxAge = process.env.NODE_ENV === 'production' ? 31536000 : 0;
        res.setHeader('Cache-Control', `public, max-age=${maxAge}, immutable`);
      } else if (filepath.match(/\.(mp3|wav|ogg)$/)) {
        // Áudio - cache médio (30 dias)
        const maxAge = process.env.NODE_ENV === 'production' ? 2592000 : 0;
        res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
      }
    }
  }));

  // Servir arquivos estáticos de media
  app.use('/media', express.static(path.join(process.cwd(), 'media'), {
    maxAge: process.env.NODE_ENV === 'production' ? '30d' : 0,
    etag: true,
    lastModified: true,
    setHeaders: (res, filepath) => {
      if (filepath.match(/\.(mp3|wav|ogg)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=2592000');
      }
    }
  }));

  const httpServer = createServer(app);

  // Setup Vite for development or serve static files for production
  if (process.env.NODE_ENV === 'development') {
    const { setupVite } = await import('./vite');
    await setupVite(app, httpServer);
  } else {
    const { serveStatic } = await import('./vite');
    serveStatic(app);
  }

  return httpServer;
}
