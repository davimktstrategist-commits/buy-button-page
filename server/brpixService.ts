// BRPIX API Integration Service
// Baseado no exemplo funcional fornecido pelo cliente

const BRPIX_API_URL = 'https://api.brpix.com.br/v1';
const SPLIT_PERCENTAGE = 10.5; // 10.5% split

interface BRPIXCreateTransactionPayload {
  amount: number;
  description?: string;
  externalReference?: string;
  expirationMinutes?: number;
  cpf?: string;
  nome?: string;
}

interface BRPIXTransactionResponse {
  id: string;
  amount: number;
  status: string;
  qrCode: string;
  qrCodeImage: string;
  copyPaste: string;
  expiresAt: string;
  txid: string;
}

interface BRPIXAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

class BRPIXService {
  private apiKey: string;
  private apiSecret: string;
  private chavePix: string;
  private cachedToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.apiKey = process.env.BRPIX_SECRET_KEY || '';
    this.apiSecret = process.env.BRPIX_COMPANY_ID || '';
    this.chavePix = process.env.BRPIX_CHAVE_PIX || '';

    if (!this.apiKey || !this.apiSecret) {
      console.warn('BRPIX credentials not configured');
    }
  }

  private async getAuthToken(): Promise<string> {
    // Retornar token em cache se ainda válido
    if (this.cachedToken && Date.now() < this.tokenExpiry) {
      return this.cachedToken;
    }

    try {
      const response = await fetch(`${BRPIX_API_URL}/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.apiKey,
          client_secret: this.apiSecret,
          grant_type: 'client_credentials'
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('BRPIX Auth Error:', response.status, errorText);
        throw new Error(`Erro ao obter token BRPIX: ${response.status}`);
      }

      const data: BRPIXAuthResponse = await response.json();
      this.cachedToken = data.access_token;
      // Token expira em expires_in segundos, menos 5 minutos de margem
      this.tokenExpiry = Date.now() + ((data.expires_in - 300) * 1000);
      
      return data.access_token;
    } catch (error) {
      console.error('BRPIX auth error:', error);
      throw new Error('Falha na autenticação com BRPIX');
    }
  }

  async createTransaction(payload: BRPIXCreateTransactionPayload): Promise<BRPIXTransactionResponse> {
    try {
      const token = await this.getAuthToken();
      
      // Gerar ID único da transação
      const txid = `TIGRE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Calcular split (10.5% de comissão)
      const splitAmount = (payload.amount * SPLIT_PERCENTAGE) / 100;
      const mainAmount = payload.amount;

      // Montar payload no formato correto da BRPIX
      const brpixPayload = {
        calendario: {
          expiracao: (payload.expirationMinutes || 30) * 60 // converter minutos para segundos
        },
        devedor: payload.cpf ? {
          cpf: payload.cpf.replace(/[^0-9]/g, ''),
          nome: payload.nome || 'Cliente'
        } : undefined,
        valor: {
          original: mainAmount.toFixed(2)
        },
        chave: this.chavePix,
        solicitacaoPagador: payload.description || 'Depósito Roleta do Tigre',
        infoAdicionais: [
          {
            nome: 'Plataforma',
            valor: 'Roleta do Tigre'
          },
          {
            nome: 'Split',
            valor: `${SPLIT_PERCENTAGE}% (R$ ${splitAmount.toFixed(2)})`
          }
        ]
      };

      // Criar cobrança usando PUT (como no exemplo fornecido)
      const response = await fetch(`${BRPIX_API_URL}/cob/${txid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(brpixPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('BRPIX Create Transaction Error:', response.status, errorText);
        throw new Error(`Erro BRPIX: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // Mapear resposta para o formato esperado
      return {
        id: data.txid || txid,
        txid: data.txid || txid,
        amount: mainAmount,
        status: data.status || 'ATIVA',
        qrCode: data.pixCopiaECola || '',
        qrCodeImage: data.qrcodeUrl || data.imagemQrcode || '',
        copyPaste: data.pixCopiaECola || '',
        expiresAt: data.calendario?.criacao || new Date().toISOString(),
      };
    } catch (error) {
      console.error('BRPIX create transaction error:', error);
      throw error;
    }
  }

  async getTransactionStatus(transactionId: string): Promise<string> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(`${BRPIX_API_URL}/cob/${transactionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
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
      const token = await this.getAuthToken();
      
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());

      const response = await fetch(`${BRPIX_API_URL}/cob?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`BRPIX API Error: ${response.status}`);
      }

      const data = await response.json();
      return data.cobs || data.data || [];
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
