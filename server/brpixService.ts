// BRPIX API Integration Service
// Documentation: https://brpixdigital.readme.io/reference/introdução

const BRPIX_API_URL = 'https://api.brpixdigital.com/functions/v1';
const SPLIT_PERCENTAGE = 10.5; // 10.5% split

interface BRPIXCreateTransactionPayload {
  amount: number;
  description?: string;
  externalReference?: string;
  pixType?: 'static' | 'dynamic';
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
      console.warn('BRPIX credentials not configured');
    }
  }

  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.secretKey}:${this.companyId}`).toString('base64');
    return `Basic ${credentials}`;
  }

  async createTransaction(payload: BRPIXCreateTransactionPayload): Promise<BRPIXTransactionResponse> {
    try {
      // Calculate split amount (10.5% goes to split account)
      const splitAmount = (payload.amount * SPLIT_PERCENTAGE) / 100;
      const mainAmount = payload.amount;

      const response = await fetch(`${BRPIX_API_URL}/transactions`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: mainAmount,
          description: payload.description || 'Depósito Roleta do Tigre',
          externalReference: payload.externalReference,
          pixType: payload.pixType || 'dynamic',
          expirationMinutes: payload.expirationMinutes || 30,
          // Split configuration - 10.5% automatically goes to the split account
          split: {
            percentage: SPLIT_PERCENTAGE,
            amount: splitAmount,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `BRPIX API Error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        id: data.id,
        amount: data.amount,
        status: data.status,
        qrCode: data.qrCode || data.pix?.qrCode,
        qrCodeImage: data.qrCodeImage || data.pix?.qrCodeImage,
        copyPaste: data.copyPaste || data.pix?.copyPaste || data.pix?.brcode,
        expiresAt: data.expiresAt || data.pix?.expiresAt,
      };
    } catch (error) {
      console.error('BRPIX create transaction error:', error);
      throw error;
    }
  }

  async getTransactionStatus(transactionId: string): Promise<string> {
    try {
      const response = await fetch(`${BRPIX_API_URL}/transactions/${transactionId}`, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
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
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());

      const response = await fetch(`${BRPIX_API_URL}/transactions?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
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
