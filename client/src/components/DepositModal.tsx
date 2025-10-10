import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Copy, QrCode as QrCodeIcon } from "lucide-react";
import QRCode from "react-qr-code";

interface DepositModalProps {
  open: boolean;
  onClose: () => void;
}

const SUGGESTED_AMOUNTS = [20, 30, 50, 100];

export function DepositModal({ open, onClose }: DepositModalProps) {
  const [amount, setAmount] = useState("");
  const [qrCodeData, setQrCodeData] = useState<{
    qrCode: string;
    qrCodeImage: string;
    copyPaste: string;
    expiresAt: string;
  } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createDepositMutation = useMutation({
    mutationFn: async (depositAmount: number) => {
      const response = await apiRequest("POST", "/api/deposits", { amount: depositAmount }) as any;
      return response;
    },
    onSuccess: (data: any) => {
      setQrCodeData({
        qrCode: data.qrCode,
        qrCodeImage: data.qrCodeImage,
        copyPaste: data.copyPaste,
        expiresAt: data.expiresAt,
      });
      toast({
        title: "PIX gerado com sucesso!",
        description: "Escaneie o QR Code ou copie o código PIX para realizar o pagamento.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao gerar PIX",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGenerate = () => {
    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      toast({
        title: "Valor inválido",
        description: "Por favor, insira um valor válido para depósito.",
        variant: "destructive",
      });
      return;
    }
    createDepositMutation.mutate(depositAmount);
  };

  const handleCopy = async () => {
    if (qrCodeData?.copyPaste) {
      await navigator.clipboard.writeText(qrCodeData.copyPaste);
      toast({
        title: "Copiado!",
        description: "Código PIX copiado para a área de transferência.",
      });
    }
  };

  const handleClose = () => {
    setQrCodeData(null);
    setAmount("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <QrCodeIcon className="w-8 h-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-2xl font-display font-bold text-center">
            Depositar via PIX
          </DialogTitle>
          <DialogDescription className="text-center">
            Depósito rápido e seguro com PIX
          </DialogDescription>
        </DialogHeader>

        {!qrCodeData ? (
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor do Depósito</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-lg"
                data-testid="input-deposit-amount"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Valores Sugeridos</Label>
              <div className="grid grid-cols-4 gap-2">
                {SUGGESTED_AMOUNTS.map((suggestedAmount) => (
                  <Button
                    key={suggestedAmount}
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(suggestedAmount.toString())}
                    data-testid={`button-suggested-${suggestedAmount}`}
                  >
                    R$ {suggestedAmount}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleGenerate}
              disabled={createDepositMutation.isPending}
              data-testid="button-generate-pix"
            >
              {createDepositMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando QR Code...
                </>
              ) : (
                "Gerar QR Code PIX"
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {/* QR Code */}
            <div className="bg-white p-4 rounded-lg mx-auto w-fit">
              <QRCode value={qrCodeData.qrCode} size={200} />
            </div>

            {/* Copy PIX Code */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Código PIX Copia e Cola</Label>
              <div className="flex gap-2">
                <Input
                  value={qrCodeData.copyPaste}
                  readOnly
                  className="font-mono text-xs"
                  data-testid="input-pix-code"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  data-testid="button-copy-pix"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="text-sm text-muted-foreground text-center space-y-1">
              <p>Valor: <span className="font-bold text-foreground">R$ {amount}</span></p>
              <p className="text-xs">
                Expira em: {new Date(qrCodeData.expiresAt).toLocaleString('pt-BR')}
              </p>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleClose}
              data-testid="button-close-deposit"
            >
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
