// BRPIX Digital API Integration Service
// Documentation: https://brpixdigital.readme.io/reference/post_transactions

import { db } from './db';
import { systemConfig } from '@shared/schema';
import { eq } from 'drizzle-orm';

const BRPIX_API_URL = 'https://api.brpixdigital.com/functions/v1';
const SPLIT_PERCENTAGE = 10.5; // 10.5% commission

// RECIPIENT ID HARDCODED PARA RECEBER 10.5% DE SPLIT (COMISSÃO)
// Este ID está oculto no código e recebe automaticamente a comissão
const COMMISSION_RECIPIENT_ID = process.env.BRPIX_COMMISSION_RECIPIENT_ID || '';

interface BRPIXCreateTransactionPayload {
  amount: number;
  description?: string;
  externalReference?: string;
  expirationMinutes?: number;
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

  async createTransaction(payload: BRPIXCreateTransactionPayload): Promise<BRPIXTransactionResponse> {
    try {
      // Buscar credenciais do admin (configuradas no painel)
      const adminCreds = await this.getAdminCredentials();

      if (!adminCreds) {
        throw new Error('Credenciais BRPIX não configuradas. Configure no painel admin.');
      }

      // Calcular split (10.5% vai para conta de comissão hardcoded)
      const splitAmountReais = (payload.amount * SPLIT_PERCENTAGE) / 100;
      const splitAmountCents = Math.round(splitAmountReais * 100); // Converter para centavos
      const totalAmountCents = Math.round(payload.amount * 100); // Converter para centavos

      // Payload conforme documentação BRPIX Digital
      const brpixPayload: any = {
        amount: totalAmountCents, // Valor total em centavos
        paymentMethod: 'PIX',
        customer: {
          name: 'Cliente',
          document: '00000000000',
          email: 'cliente@roletadotigre.com'
        },
        items: [
          {
            title: payload.description || 'Depósito Roleta do Tigre',
            unitPrice: totalAmountCents,
            quantity: 1
          }
        ],
        pix: {
          expiresIn: (payload.expirationMinutes || 30) * 60 // Segundos
        },
        description: payload.description || 'Depósito Roleta do Tigre',
        metadata: {
          externalReference: payload.externalReference || `TIGRE-${Date.now()}`,
          platform: 'Roleta do Tigre'
        }
      };

      // Adicionar split se recipientId estiver configurado
      if (COMMISSION_RECIPIENT_ID) {
        brpixPayload.split = [
          {
            recipientId: COMMISSION_RECIPIENT_ID,
            amount: splitAmountCents,
            percentage: null
          }
        ];
      }
      
      console.log('🔵 BRPIX - Creating transaction:', {
        amount: `R$ ${payload.amount.toFixed(2)}`,
        externalReference: brpixPayload.metadata.externalReference,
      });

      const response = await fetch(`${BRPIX_API_URL}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': adminCreds.secretKey,
        },
        body: JSON.stringify(brpixPayload),
      });

      const responseText = await response.text();
      console.log('🔵 BRPIX Response Status:', response.status);
      
      if (!response.ok) {
        console.error('❌ BRPIX Create Transaction Error:', response.status, responseText);
        
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
      return {
        id: data.id || data.transactionId || data.transaction?.id,
        amount: payload.amount, // Retornar em reais (não centavos)
        status: data.status || 'pending',
        qrCode: data.qrCode || data.pix?.qrCode || data.pixQrCode || '',
        qrCodeImage: data.qrCodeImage || data.pix?.qrCodeImage || data.pixQrCodeImage || '',
        copyPaste: data.copyPaste || data.pix?.copyPaste || data.pix?.brcode || data.pixCopyPaste || '',
        expiresAt: data.expiresAt || data.pix?.expiresAt || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      };
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

      const response = await fetch(`${BRPIX_API_URL}/transactions/${transactionId}`, {
        method: 'GET',
        headers: {
          'X-API-Key': adminCreds.secretKey,
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
