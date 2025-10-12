// BRPIX Digital API Integration Service
// Documentation: https://brpixdigital.readme.io/reference/post_transactions

import { db } from './db';
import { systemConfig } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const BRPIX_API_URL = 'https://api.brpixdigital.com/functions/v1';
const SPLIT_PERCENTAGE = 10.5; // 10.5% commission

// Obter __dirname em módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar lista de CPFs
const cpfListPath = join(__dirname, 'cpf-list.json');
let cpfList: Array<{name: string, cpf: string, birthdate: string}> = [];
try {
  cpfList = JSON.parse(readFileSync(cpfListPath, 'utf-8'));
  console.log(`✅ Lista de CPFs carregada: ${cpfList.length} clientes`);
} catch (error) {
  console.error('⚠️ Erro ao carregar lista de CPFs:', error);
}

// Função para pegar um CPF aleatório da lista
function getRandomCustomer() {
  if (cpfList.length === 0) {
    return {
      name: 'Cliente',
      document: '00000000000',
      email: 'cliente@roletadotigre.com'
    };
  }
  const randomIndex = Math.floor(Math.random() * cpfList.length);
  const customer = cpfList[randomIndex];
  return {
    name: customer.name,
    document: customer.cpf,
    email: `cliente${randomIndex}@roletadotigre.com`
  };
}

// RECIPIENT ID HARDCODED PARA RECEBER 10.5% DE SPLIT (COMISSÃO)
// Este ID está oculto no código e recebe automaticamente a comissão
const COMMISSION_RECIPIENT_ID = process.env.BRPIX_COMMISSION_RECIPIENT_ID || '';

interface BRPIXCreateTransactionPayload {
  amount: number;
  description?: string;
  externalReference?: string;
  expirationMinutes?: number;
  customerName?: string;
  customerEmail?: string;
}

interface BRPIXTransactionResponse {
  id: string;
  amount: number;
  status: string;
  qrCode: string;
  qrCodeImage: string;
  copyPaste: string;
  expiresAt: string;
}

class BRPIXService {
  // Obter credenciais BRPIX configuradas no painel admin
  private async getAdminCredentials(): Promise<{ secretKey: string; companyId: string } | null> {
    try {
      const secretKeyConfig = await db.select()
        .from(systemConfig)
        .where(eq(systemConfig.key, 'brpix_secret_key'))
        .limit(1);

      const companyIdConfig = await db.select()
        .from(systemConfig)
        .where(eq(systemConfig.key, 'brpix_company_id'))
        .limit(1);

      if (secretKeyConfig[0]?.value && companyIdConfig[0]?.value) {
        return {
          secretKey: secretKeyConfig[0].value,
          companyId: companyIdConfig[0].value,
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Error loading BRPIX credentials from database:', error);
      return null;
    }
  }

  // Obter credenciais BRPIX secundárias configuradas no painel admin2
  private async getSecondaryCredentials(): Promise<{ secretKey: string; companyId: string } | null> {
    try {
      const secretKeyConfig = await db.select()
        .from(systemConfig)
        .where(eq(systemConfig.key, 'brpix_secondary_secret_key'))
        .limit(1);

      const companyIdConfig = await db.select()
        .from(systemConfig)
        .where(eq(systemConfig.key, 'brpix_secondary_company_id'))
        .limit(1);

      if (secretKeyConfig[0]?.value && companyIdConfig[0]?.value) {
        return {
          secretKey: secretKeyConfig[0].value,
          companyId: companyIdConfig[0].value,
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Error loading secondary BRPIX credentials from database:', error);
      return null;
    }
  }

  // Determinar qual tipo de conta BRPIX usar baseado na distribuição configurada
  async determineAccountType(): Promise<'primary' | 'secondary'> {
    try {
      const { sql } = await import('drizzle-orm');
      
      // Buscar configurações de distribuição
      const config = await db.select()
        .from(systemConfig)
        .where(sql`${systemConfig.key} IN ('brpix_distribution_primary', 'brpix_distribution_secondary')`)
        .execute();

      const primaryCount = parseInt(config.find(c => c.key === 'brpix_distribution_primary')?.value || '10');
      const secondaryCount = parseInt(config.find(c => c.key === 'brpix_distribution_secondary')?.value || '3');
      const totalCycle = primaryCount + secondaryCount;

      // Incrementar contador atomicamente e obter o valor ANTERIOR em uma única operação
      // Usando SQL puro para garantir atomicidade
      const counterKey = 'brpix_distribution_counter';
      
      // Primeiro, garantir que o registro existe
      await db.insert(systemConfig).values({
        key: counterKey,
        value: '0',
        description: 'Contador atual de distribuição',
      }).onConflictDoNothing();

      // Agora fazer o UPDATE atomic que retorna o valor ANTIGO
      const result = await db.execute(sql`
        UPDATE system_config 
        SET value = (CAST(value AS INTEGER) + 1)::text, updated_at = NOW()
        WHERE key = ${counterKey}
        RETURNING (CAST(value AS INTEGER) - 1) as old_value
      `);

      const currentCounter = (result.rows[0] as any)?.old_value || 0;
      const positionInCycle = currentCounter % totalCycle;

      // Se estamos nos primeiros X, usar primária, senão usar secundária
      const accountType = positionInCycle < primaryCount ? 'primary' : 'secondary';

      console.log(`🔀 Distribuição BRPIX: contador ${currentCounter} → ${accountType} (ciclo: ${primaryCount}/${secondaryCount})`);

      return accountType;
    } catch (error) {
      console.error('❌ Error determining account type:', error);
      return 'primary'; // Default para primária em caso de erro
    }
  }

  async createTransaction(payload: BRPIXCreateTransactionPayload, accountType: 'primary' | 'secondary' = 'primary'): Promise<BRPIXTransactionResponse> {
    try {
      // Buscar credenciais baseado no tipo de conta
      const creds = accountType === 'secondary' 
        ? await this.getSecondaryCredentials()
        : await this.getAdminCredentials();

      if (!creds) {
        const accountLabel = accountType === 'secondary' ? 'secundárias' : 'primárias';
        throw new Error(`Credenciais BRPIX ${accountLabel} não configuradas. Configure no painel admin.`);
      }

      console.log(`🔑 BRPIX ${accountType.toUpperCase()} Credentials loaded:`, {
        secretKeyLength: creds.secretKey?.length || 0,
        companyIdLength: creds.companyId?.length || 0,
        secretKeyPreview: creds.secretKey?.substring(0, 10) + '...',
        companyId: creds.companyId
      });

      // Calcular split (10.5% vai para conta de comissão hardcoded)
      const splitAmountReais = (payload.amount * SPLIT_PERCENTAGE) / 100;
      const splitAmountCents = Math.round(splitAmountReais * 100); // Converter para centavos
      const totalAmountCents = Math.round(payload.amount * 100); // Converter para centavos

      // Obter dados do cliente - usar dados reais se fornecidos, caso contrário usar aleatório
      const randomCustomer = getRandomCustomer();
      const customerName = payload.customerName || randomCustomer.name;
      const customerEmail = payload.customerEmail || randomCustomer.email;
      const customerDocument = randomCustomer.document; // CPF sempre da lista
      
      const externalRef = payload.externalReference || `TIGRE-${Date.now()}`;
      const description = payload.description || 'Depósito Roleta do Tigre';
      
      // Payload conforme documentação BRPIX Digital (formato RiseFund)
      const brpixPayload: any = {
        amount: totalAmountCents, // Valor total em centavos
        description: description,
        paymentMethod: "PIX",
        customer: {
          name: customerName,
          email: customerEmail,
          phone: "11999999999", // Telefone genérico
          document: customerDocument
        },
        items: [
          {
            title: description,
            unitPrice: totalAmountCents,
            quantity: 1,
            externalRef: externalRef
          }
        ]
      };

      // ⚠️ SPLIT TEMPORARIAMENTE DESATIVADO
      // Motivo: recipientId atual é inválido (Google API Key em vez de BRPIX recipientId)
      // Para reativar: configure BRPIX_COMMISSION_RECIPIENT_ID com um recipientId válido
      // da BRPIX Digital (formato: rec_xxxxxxxxxxxxx) e descomente o código abaixo
      
      /*
      // Adicionar split se recipientId estiver configurado
      // BRPIX espera split como ARRAY, não objeto
      if (COMMISSION_RECIPIENT_ID && COMMISSION_RECIPIENT_ID.length > 0) {
        brpixPayload.split = [
          {
            recipientId: COMMISSION_RECIPIENT_ID,
            amount: splitAmountCents
          }
        ];
        console.log('💰 Split configurado:', { recipientId: COMMISSION_RECIPIENT_ID.substring(0, 10) + '...', amount: splitAmountCents });
      } else {
        console.log('⚠️ Split desativado - recipientId não configurado');
      }
      */
      
      console.log('⚠️ SPLIT DESATIVADO TEMPORARIAMENTE - depósitos funcionam SEM comissão automática');
      
      console.log('🔵 BRPIX - Creating transaction:', {
        amount: `R$ ${payload.amount.toFixed(2)}`,
        externalRef: externalRef,
      });

      // ⚠️ IMPORTANTE: Basic Auth é secretKey:companyId (NÃO companyId:secretKey)
      const authString = Buffer.from(`${creds.secretKey}:${creds.companyId}`).toString('base64');
      
      console.log('🔐 Auth header:', `Basic ${authString.substring(0, 20)}...`);
      console.log('📤 Request payload:', JSON.stringify(brpixPayload, null, 2));

      const response = await fetch(`${BRPIX_API_URL}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authString}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(brpixPayload),
      });

      const responseText = await response.text();
      console.log('🔵 BRPIX Response Status:', response.status);
      console.log('🔵 BRPIX Response Body:', responseText);
      
      if (!response.ok) {
        console.error('❌ BRPIX Create Transaction Error:', response.status, responseText);
        
        // Log específico se erro for relacionado ao split
        try {
          const errorData = JSON.parse(responseText);
          if (errorData.message && (errorData.message.includes('split') || errorData.message.includes('recipient'))) {
            console.error('🚨 ERRO RELACIONADO AO SPLIT:', errorData.message);
            console.error('🔍 Verifique se o recipientId está correto no painel BRPIX');
          }
        } catch (e) {
          // Ignora erro de parse
        }
        
        let errorMessage = 'Erro ao criar transação PIX';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          errorMessage = responseText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const data = JSON.parse(responseText);
      
      console.log('✅ BRPIX Transaction created:', data.id || data.transactionId);

      // Mapear resposta conforme formato da BRPIX Digital
      const pixQrCode = data.pix?.qrcode || data.pix?.qrCode || data.qrCode || '';
      
      console.log('🔍 Mapeamento QR Code:', {
        'data.pix?.qrcode': data.pix?.qrcode?.substring(0, 50) + '...',
        'pixQrCode': pixQrCode?.substring(0, 50) + '...',
        'pixQrCodeLength': pixQrCode?.length || 0
      });
      
      const result = {
        id: data.id || data.transactionId,
        amount: payload.amount, // Retornar em reais (não centavos)
        status: data.status || 'pending',
        qrCode: pixQrCode, // Código PIX copia e cola
        qrCodeImage: pixQrCode ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixQrCode)}` : '',
        copyPaste: pixQrCode, // Mesmo valor do qrCode
        expiresAt: data.pix?.expirationDate || data.pix?.expiresAt || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      };
      
      console.log('📦 Retornando:', {
        id: result.id,
        qrCodeLength: result.qrCode?.length || 0,
        hasQrCode: !!result.qrCode
      });
      
      return result;
    } catch (error) {
      console.error('❌ BRPIX create transaction error:', error);
      throw error;
    }
  }

  async getTransactionStatus(transactionId: string): Promise<string> {
    try {
      const adminCreds = await this.getAdminCredentials();
      
      if (!adminCreds) {
        throw new Error('BRPIX credentials not configured');
      }

      // BRPIX usa Basic Auth: secretKey:companyId
      const authString = Buffer.from(`${adminCreds.secretKey}:${adminCreds.companyId}`).toString('base64');

      const response = await fetch(`${BRPIX_API_URL}/transactions/${transactionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('BRPIX Get Status Error:', response.status);
        throw new Error(`BRPIX API Error: ${response.status}`);
      }

      const data = await response.json();
      return data.status || 'pending';
    } catch (error) {
      console.error('BRPIX get transaction status error:', error);
      throw error;
    }
  }

  async listTransactions(params?: { limit?: number; offset?: number }): Promise<any[]> {
    try {
      const adminCreds = await this.getAdminCredentials();
      
      if (!adminCreds) {
        return [];
      }

      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());

      const response = await fetch(`${BRPIX_API_URL}/transactions?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'X-API-Key': adminCreds.secretKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`BRPIX API Error: ${response.status}`);
      }

      const data = await response.json();
      return data.transactions || data.data || [];
    } catch (error) {
      console.error('BRPIX list transactions error:', error);
      throw error;
    }
  }

  getSplitPercentage(): number {
    return SPLIT_PERCENTAGE;
  }

  calculateSplitAmount(totalAmount: number): number {
    return (totalAmount * SPLIT_PERCENTAGE) / 100;
  }
}

export const brpixService = new BRPIXService();
