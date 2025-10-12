import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Copy, QrCode as QrCodeIcon, X, CheckCircle } from "lucide-react";

interface DepositModalProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
}

interface PublicSettings {
  depositMin: number;
  depositMax: number;
  doubleDepositEnabled: boolean;
  doubleDepositMin: number;
  doubleDepositMax: number;
}

const SUGGESTED_AMOUNTS = [20, 30, 50, 100];
const DEPOSITO_MIN = 20;

export function DepositModal({ open, onClose, sessionId }: DepositModalProps) {
  const [amount, setAmount] = useState("");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [qrCodeData, setQrCodeData] = useState<{
    transactionId: string;
    qrCode: string;
    qrCodeImage: string;
  } | null>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch public settings to check double deposit config
  const { data: settings } = useQuery<PublicSettings>({
    queryKey: ['/api/public-settings'],
    enabled: open,
  });

  const isDoubleDeposit = (value: number) => {
    if (!settings?.doubleDepositEnabled) return false;
    return value >= settings.doubleDepositMin && value <= settings.doubleDepositMax;
  };

  const createDepositMutation = useMutation({
    mutationFn: async (depositAmount: number) => {
      const response = await apiRequest("POST", "/api/deposits", { 
        amount: depositAmount,
        sessionId 
      }) as any;
      return response;
    },
    onSuccess: (data: any) => {
      setQrCodeData({
        transactionId: data.transactionId,
        qrCode: data.qrCode,
        qrCodeImage: data.qrCodeImage,
      });
      setIsLoading(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao gerar PIX",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
    },
  });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    const depositAmount = parseFloat(amount.replace(',', '.'));
    
    if (isNaN(depositAmount) || depositAmount < DEPOSITO_MIN) {
      toast({
        title: "Valor inválido",
        description: `O valor mínimo para depósito é R$ ${DEPOSITO_MIN.toFixed(2).replace('.', ',')}`,
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    createDepositMutation.mutate(depositAmount);
  };

  const handleCopy = async () => {
    if (qrCodeData?.qrCode) {
      await navigator.clipboard.writeText(qrCodeData.qrCode);
      toast({
        title: "Copiado!",
        description: "Código PIX copiado com sucesso!",
      });
    }
  };

  const handleSuggestedAmount = (value: number) => {
    setSelectedAmount(value);
    setAmount(value.toFixed(2).replace('.', ','));
  };

  // Poll for payment confirmation
  useEffect(() => {
    if (!qrCodeData?.transactionId || paymentConfirmed) return;

    const checkPaymentStatus = async () => {
      try {
        const response = await apiRequest(
          "POST", 
          `/api/deposits/${qrCodeData.transactionId}/confirm`,
          {}
        ) as any;

        if (response.status === 'completed') {
          setPaymentConfirmed(true);
          queryClient.invalidateQueries({ queryKey: ['/api/balance', sessionId] });
          toast({
            title: "Depósito confirmado com sucesso!",
            description: "Seu saldo foi atualizado!",
          });
          
          setTimeout(() => {
            window.location.reload();
          }, 2500);
        }
      } catch (error) {
        console.error("Error checking payment:", error);
      }
    };

    const interval = setInterval(checkPaymentStatus, 3000);
    return () => clearInterval(interval);
  }, [qrCodeData?.transactionId, paymentConfirmed, queryClient, toast, sessionId]);

  const handleClose = () => {
    setQrCodeData(null);
    setAmount("");
    setSelectedAmount(null);
    setPaymentConfirmed(false);
    setIsLoading(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="p-0 border-0 bg-transparent max-w-[420px] w-[90%] overflow-hidden"
        data-testid="modal-deposit"
      >
        <VisuallyHidden>
          <DialogTitle>Depositar via PIX</DialogTitle>
          <DialogDescription>Gere um QR Code PIX para depositar</DialogDescription>
        </VisuallyHidden>
        {/* Banner Superior */}
        <div className="relative">
          <img 
            src="/banner.jpeg" 
            alt="Banner" 
            className="w-full h-auto rounded-t-2xl"
          />
        </div>

        {/* Card do Modal */}
        <div className="bg-[#101012] rounded-b-2xl relative">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-[#888] hover:text-white text-2xl z-10"
            data-testid="button-close-deposit"
          >
            <X />
          </button>

          <div className="p-6">
            {!qrCodeData ? (
              <form onSubmit={handleGenerate} className="space-y-4" data-testid="form-deposit">
                <div>
                  <label className="text-white text-sm font-medium block mb-2">
                    Valor do depósito
                  </label>
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="R$ 0,00"
                    className="w-full px-4 py-4 bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl text-white text-lg focus:outline-none focus:border-[#fd8303]"
                    required
                    data-testid="input-deposit-amount"
                  />
                </div>

                {/* Valores Sugeridos */}
                <div className="grid grid-cols-4 gap-2">
                  {SUGGESTED_AMOUNTS.map((value) => {
                    const willDouble = isDoubleDeposit(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleSuggestedAmount(value)}
                        className={`px-4 py-3 rounded-xl font-semibold transition-all relative ${
                          selectedAmount === value
                            ? 'bg-[#fd8303] text-white'
                            : 'bg-[#2a2a2a] text-white hover:bg-[#333333]'
                        }`}
                        data-testid={`button-suggested-${value}`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>R$ {value.toFixed(2).replace('.', ',')}</span>
                          {willDouble && (
                            <span className="text-[#22c55e] font-bold text-xs">x2</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#fd8303] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#e57503] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  data-testid="button-generate-pix"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <QrCodeIcon className="w-5 h-5" />
                      Gerar QR Code PIX
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="space-y-4" data-testid="qr-section">
                <h3 className="text-white text-xl font-bold text-center">
                  PIX gerado com sucesso!
                </h3>
                <p className="text-[#888] text-sm text-center">
                  Escaneie o QR Code ou use o código Pix Copia e Cola
                </p>

                {/* QR Code com overlay de PAGO */}
                <div className="relative w-[250px] h-[250px] mx-auto">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCodeData.qrCode)}`}
                    alt="QR Code"
                    className="w-full h-full bg-white p-1 rounded-2xl"
                    data-testid="img-qr-code"
                  />
                  
                  {paymentConfirmed && (
                    <div className="absolute inset-0 bg-[#22c55e]/95 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                      <div className="text-white text-3xl font-extrabold flex items-center gap-2">
                        PAGO <CheckCircle className="w-8 h-8" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Código Copia e Cola */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={qrCodeData.qrCode}
                    readOnly
                    className="flex-1 px-3 py-3 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-white text-sm"
                    data-testid="input-pix-code"
                  />
                  <button
                    onClick={handleCopy}
                    className="bg-[#fd8303] text-white px-4 py-3 rounded-lg font-semibold hover:bg-[#e57503] transition-colors flex items-center gap-2"
                    data-testid="button-copy-pix"
                  >
                    <Copy className="w-4 h-4" />
                    Copiar
                  </button>
                </div>
              </div>
            )}

            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-[#101012]/70 backdrop-blur-sm flex items-center justify-center z-20">
                <div className="w-12 h-12 border-4 border-[#fd8303] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
