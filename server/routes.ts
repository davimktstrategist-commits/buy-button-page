// API Routes for Roleta do Tigre
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./replitAuth";
import { brpixService } from "./brpixService";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
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
      const { action, nome_completo, email, telefone, senha } = req.body;
      
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
        
        // Separar nome completo em firstName e lastName
        const nameParts = nome_completo.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        // Criar usuário
        const newUser = await storage.createUser({
          email,
          firstName,
          lastName,
          phone: telefone.replace(/\D/g, ''),
          password: senha, // Em produção, usar hash
        });
        
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

  app.post('/api/admin/withdrawals/:id/reject', requireAdminToken, async (req: any, res) => {
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
          userId: game.userId.substring(0, 8), // Mostrar apenas primeiros 8 chars do userId
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
        saldo: parseFloat(user.balance).toFixed(2),
        balance: parseFloat(user.balance).toFixed(2)
      });
    } catch (error) {
      console.error("Error getting balance:", error);
      res.status(500).json({ error: "Erro ao obter saldo" });
    }
  });

  // Histórico de jogos do usuário
  app.get('/ajax/get_history.php', async (req, res) => {
    try {
      const sessionId = req.query.sessionId as string || req.headers['x-session-id'] as string;
      
      if (!sessionId) {
        return res.status(400).json({ error: "Session ID required" });
      }

      const games = await storage.getGamesByUserId(sessionId, 20);
      
      // Format games for frontend
      const history = games.map(game => ({
        id: game.id,
        betAmount: parseFloat(game.betAmount),
        multiplier: game.multiplier,
        winAmount: parseFloat(game.winAmount),
        createdAt: game.createdAt,
      }));

      res.json({ history });
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
        userId: sessionId,
        betAmount: betAmount.toString(),
        multiplier: selectedMultiplier,
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
          description: `Ganho no jogo ${game.id} - ${selectedMultiplier}x`,
        });
      }

      // Update user balance and stats
      await storage.updateUserBalance(sessionId, netChange);
      await storage.updateUserStats(sessionId, betAmount, winAmount);

      // Get updated balance
      const updatedUser = await storage.getUserBalance(sessionId);

      res.json({
        success: true,
        multiplier: selectedMultiplier,
        winAmount: winAmount.toFixed(2),
        balance: parseFloat(updatedUser?.balance || '0').toFixed(2),
        premio: winAmount.toFixed(2),
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
      const sessionId = req.body.sessionId || req.headers['x-session-id'] as string;
      const amount = parseFloat(req.body.amount || req.body.valor);

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
          // Update transaction status
          await storage.updateTransaction(transactionId, { status: 'completed' });
          
          // Update user balance and total deposited
          const userId = transaction.userId;
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
      if (!user || parseFloat(user.balance) < amount) {
        return res.status(400).json({ error: "Saldo insuficiente" });
      }

      // Deduct amount from balance immediately
      await storage.updateUserBalance(sessionId, -amount);

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
        rolloverCompleto: true,
        rolloverRestante: 0,
        rolloverTotal: 0
      });
    } catch (error) {
      console.error("Error checking rollover:", error);
      res.status(500).json({ error: "Erro ao verificar rollover" });
    }
  });

  // Dados de afiliado
  app.get('/ajax/get_affiliate_data.php', async (req, res) => {
    try {
      const sessionId = req.query.sessionId as string || req.headers['x-session-id'] as string;
      
      // Por enquanto, retorna dados vazios de afiliado
      res.json({ 
        affiliateCode: sessionId,
        totalReferrals: 0,
        totalCommission: 0,
        referrals: []
      });
    } catch (error) {
      console.error("Error getting affiliate data:", error);
      res.status(500).json({ error: "Erro ao obter dados de afiliado" });
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

  const httpServer = createServer(app);
  
  // Setup Vite for React app (dev mode only)
  if (process.env.NODE_ENV !== "production") {
    const { setupVite } = await import("./vite");
    await setupVite(app, httpServer);
  }
  
  return httpServer;
}
