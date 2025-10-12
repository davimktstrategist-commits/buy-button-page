import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import { registerRoutes } from "./routes";
import { log } from "./vite";
import path from "path";

const app = express();

app.use(compression());

app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Iniciar sincronização automática de pagamentos
    startAutoSync();
  });
})();

// Sincronização automática de pagamentos a cada 2 minutos
function startAutoSync() {
  const SYNC_INTERVAL = 2 * 60 * 1000; // 2 minutos
  
  console.log('🔄 Sincronização automática de pagamentos iniciada (a cada 2 minutos)');
  
  // Executar imediatamente na primeira vez
  runAutoSync();
  
  // Depois executar a cada 2 minutos
  setInterval(() => {
    runAutoSync();
  }, SYNC_INTERVAL);
}

async function runAutoSync() {
  try {
    const { db } = await import('./db');
    const { transactions, users } = await import('@shared/schema');
    const { brpixService } = await import('./brpixService');
    const { eq, and, sql } = await import('drizzle-orm');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const pendingTransactions = await db.select()
      .from(transactions)
      .where(
        and(
          eq(transactions.type, 'deposit'),
          eq(transactions.status, 'pending'),
          sql`${transactions.createdAt} >= ${today.toISOString()}`
        )
      );

    if (pendingTransactions.length === 0) {
      console.log('🔄 Auto-sync: Nenhuma transação pendente para verificar');
      return;
    }

    console.log(`🔄 Auto-sync: Verificando ${pendingTransactions.length} transações pendentes...`);
    
    let syncedCount = 0;

    for (const transaction of pendingTransactions) {
      if (!transaction.brpixTransactionId) continue;

      try {
        const accountType = transaction.brpixAccountType || 'primary';
        const brpixStatus = await brpixService.getTransactionStatus(transaction.brpixTransactionId, accountType as 'primary' | 'secondary');

        if (brpixStatus === 'paid' || brpixStatus === 'approved') {
          await db.transaction(async (tx) => {
            const updated = await tx.update(transactions)
              .set({ status: 'completed' })
              .where(
                and(
                  eq(transactions.id, transaction.id),
                  eq(transactions.status, 'pending')
                )
              )
              .returning();

            if (updated.length === 0) return;

            const currentTransaction = updated[0];
            const depositAmount = parseFloat(currentTransaction.amount);

            await tx.update(users)
              .set({ 
                balance: sql`${users.balance}::numeric + ${depositAmount}`,
                totalDeposited: sql`${users.totalDeposited}::numeric + ${depositAmount}`
              })
              .where(eq(users.id, currentTransaction.userId));

            const [user] = await tx.select()
              .from(users)
              .where(eq(users.id, currentTransaction.userId))
              .limit(1);

            if (user?.referredByUserId) {
              const { affiliateReferrals, systemConfig: systemConfigTable } = await import('@shared/schema');
              
              const cpaConfigResult = await tx.select()
                .from(systemConfigTable)
                .where(eq(systemConfigTable.key, 'affiliate_cpa_percent'))
                .limit(1);
              
              const cpaPercent = cpaConfigResult[0]?.value ? parseFloat(cpaConfigResult[0].value) : 25;
              const commissionAmount = (depositAmount * cpaPercent) / 100;

              const existingReferral = await tx.select()
                .from(affiliateReferrals)
                .where(
                  and(
                    eq(affiliateReferrals.affiliateUserId, user.referredByUserId),
                    eq(affiliateReferrals.referredUserId, user.id)
                  )
                )
                .limit(1);

              if (existingReferral.length > 0) {
                await tx.update(affiliateReferrals)
                  .set({
                    totalCommissionEarned: sql`${affiliateReferrals.totalCommissionEarned}::numeric + ${commissionAmount}`
                  })
                  .where(eq(affiliateReferrals.id, existingReferral[0].id));

                await tx.update(users)
                  .set({ 
                    affiliateBalance: sql`COALESCE(${users.affiliateBalance}::numeric, 0) + ${commissionAmount}`
                  })
                  .where(eq(users.id, user.referredByUserId));

                console.log(`💸 Auto-sync: Comissão CPA creditada: R$ ${commissionAmount.toFixed(2)} para afiliado ${user.referredByUserId}`);
              }
            }

            syncedCount++;
            console.log(`✅ Auto-sync: Transação ${currentTransaction.id} sincronizada (R$ ${depositAmount.toFixed(2)})`);
          });
        }
      } catch (error) {
        console.error(`❌ Auto-sync: Erro ao verificar transação ${transaction.id}:`, error);
      }
    }

    if (syncedCount > 0) {
      console.log(`✅ Auto-sync concluído: ${syncedCount} transação(ões) creditada(s)`);
    } else {
      console.log('🔄 Auto-sync concluído: Nenhuma transação para creditar');
    }
  } catch (error) {
    console.error('❌ Erro na sincronização automática:', error);
  }
}
