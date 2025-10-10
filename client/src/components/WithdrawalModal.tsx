import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, DollarSign } from "lucide-react";

interface WithdrawalModalProps {
  open: boolean;
  onClose: () => void;
  maxAmount: number;
  sessionId: string;
}

type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';

export function WithdrawalModal({ open, onClose, maxAmount, sessionId }: WithdrawalModalProps) {
  const [amount, setAmount] = useState("");
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>("cpf");
  const [pixKey, setPixKey] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const withdrawalMutation = useMutation({
    mutationFn: async () => {
      const withdrawalAmount = parseFloat(amount);
      
      if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
        throw new Error("Valor inválido");
      }
      
      if (withdrawalAmount > maxAmount) {
        throw new Error("Saldo insuficiente");
      }

      if (!pixKey.trim()) {
        throw new Error("Chave PIX obrigatória");
      }

      return await apiRequest("POST", "/api/withdrawals", {
        amount: withdrawalAmount,
        pixKeyType,
        pixKey: pixKey.trim(),
        sessionId,
      });
    },
    onSuccess: () => {
      toast({
        title: "Solicitação enviada!",
        description: "Seu saque está em análise e será processado em breve.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/balance', sessionId] });
      setAmount("");
      setPixKey("");
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao solicitar saque",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    withdrawalMutation.mutate();
  };

  const suggestedAmounts = [20, 50, 100, 200].filter(val => val <= maxAmount);

  const formatPixKeyPlaceholder = () => {
    switch (pixKeyType) {
      case 'cpf': return "000.000.000-00";
      case 'cnpj': return "00.000.000/0000-00";
      case 'email': return "seu@email.com";
      case 'phone': return "(00) 00000-0000";
      case 'random': return "Chave aleatória";
      default: return "Sua chave PIX";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="modal-withdrawal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Solicitar Saque
          </DialogTitle>
          <DialogDescription>
            Saldo disponível: R$ {maxAmount.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Valor do Saque</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="1"
              max={maxAmount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              data-testid="input-withdrawal-amount"
            />
          </div>

          {/* Suggested Amounts */}
          {suggestedAmounts.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {suggestedAmounts.map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(value.toString())}
                  data-testid={`button-suggested-${value}`}
                >
                  R$ {value}
                </Button>
              ))}
              {maxAmount > 200 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(maxAmount.toString())}
                  data-testid="button-suggested-max"
                >
                  Máximo (R$ {maxAmount.toFixed(2)})
                </Button>
              )}
            </div>
          )}

          {/* PIX Key Type */}
          <div className="space-y-2">
            <Label htmlFor="pixKeyType">Tipo de Chave PIX</Label>
            <Select value={pixKeyType} onValueChange={(value) => setPixKeyType(value as PixKeyType)}>
              <SelectTrigger data-testid="select-pix-key-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cpf">CPF</SelectItem>
                <SelectItem value="cnpj">CNPJ</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
                <SelectItem value="phone">Telefone</SelectItem>
                <SelectItem value="random">Chave Aleatória</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* PIX Key Input */}
          <div className="space-y-2">
            <Label htmlFor="pixKey">Chave PIX</Label>
            <Input
              id="pixKey"
              type="text"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              placeholder={formatPixKeyPlaceholder()}
              required
              data-testid="input-pix-key"
            />
          </div>

          {/* Info */}
          <div className="bg-muted/50 rounded-md p-3 text-sm text-muted-foreground">
            <p>• Saques são processados em até 24h úteis</p>
            <p>• Verifique se a chave PIX está correta</p>
            <p>• Valor mínimo: R$ 1,00</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={withdrawalMutation.isPending}
              data-testid="button-cancel-withdrawal"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={withdrawalMutation.isPending}
              data-testid="button-submit-withdrawal"
            >
              {withdrawalMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                "Solicitar Saque"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
