// BRPIX Digital API Integration Service
// Documentation: https://brpixdigital.readme.io/reference/post_transactions

const BRPIX_API_URL = 'https://api.brpixdigital.com/functions/v1';
const SPLIT_PERCENTAGE = 10.5; // 10.5% split

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
  private secretKey: string;
  private companyId: string;

  constructor() {
    this.secretKey = process.env.BRPIX_SECRET_KEY || '';
    this.companyId = process.env.BRPIX_COMPANY_ID || '';

    if (!this.secretKey || !this.companyId) {
      console.warn('⚠️  BRPIX credentials not configured');
    }
  }

  async createTransaction(payload: BRPIXCreateTransactionPayload): Promise<BRPIXTransactionResponse> {
    try {
      if (!this.secretKey || !this.companyId) {
        throw new Error('BRPIX credentials not configured');
      }

      // Calcular split (10.5% de comissão)
      const splitAmount = (payload.amount * SPLIT_PERCENTAGE) / 100;
      const mainAmount = payload.amount;

      // Payload conforme documentação BRPIX Digital
      const brpixPayload = {
        amount: mainAmount,
        description: payload.description || 'Depósito Roleta do Tigre',
        externalReference: payload.externalReference || `TIGRE-${Date.now()}`,
        pixType: 'dynamic',
        expirationMinutes: payload.expirationMinutes || 30,
        companyId: this.companyId,
        // Split automático de 10.5%
        split: {
          enabled: true,
          percentage: SPLIT_PERCENTAGE,
          amount: splitAmount
        }
      };

      console.log('🔵 BRPIX - Creating transaction:', {
        amount: mainAmount,
        split: splitAmount,
        externalReference: brpixPayload.externalReference
      });

      const response = await fetch(`${BRPIX_API_URL}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.secretKey,
        },
        body: JSON.stringify(brpixPayload),
      });

      const responseText = await response.text();
      console.log('🔵 BRPIX Response Status:', response.status);
      console.log('🔵 BRPIX Response Body:', responseText);

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
        amount: data.amount || mainAmount,
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
      if (!this.secretKey) {
        throw new Error('BRPIX Secret Key not configured');
      }

      const response = await fetch(`${BRPIX_API_URL}/transactions/${transactionId}`, {
        method: 'GET',
        headers: {
          'X-API-Key': this.secretKey,
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
      if (!this.secretKey) {
        throw new Error('BRPIX Secret Key not configured');
      }

      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());

      const response = await fetch(`${BRPIX_API_URL}/transactions?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'X-API-Key': this.secretKey,
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
