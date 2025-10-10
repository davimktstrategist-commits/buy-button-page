import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, X, ArrowRightCircle } from "lucide-react";

interface WithdrawalModalProps {
  open: boolean;
  onClose: () => void;
  maxAmount: number;
  sessionId: string;
}

type PixKeyType = 'CPF' | 'EMAIL' | 'TELEFONE' | 'EVP';

export function WithdrawalModal({ open, onClose, maxAmount, sessionId }: WithdrawalModalProps) {
  const [amount, setAmount] = useState("");
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>("CPF");
  const [pixKey, setPixKey] = useState("");
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const withdrawalMutation = useMutation({
    mutationFn: async () => {
      const withdrawalAmount = parseFloat(amount.replace(',', '.'));
      
      if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
        throw new Error("Valor inválido");
      }
      
      if (withdrawalAmount > maxAmount) {
        throw new Error("Saldo insuficiente");
      }

      if (!pixKey.trim() || !nome.trim() || !cpf.trim()) {
        throw new Error("Preencha todos os campos");
      }

      return await apiRequest("POST", "/api/withdrawals", {
        amount: withdrawalAmount,
        pixKeyType,
        pixKey: pixKey.trim(),
        nome: nome.trim(),
        cpf: cpf.trim(),
        sessionId,
      });
    },
    onSuccess: () => {
      toast({
        title: "Solicitação enviada!",
        description: "Seu saque está em análise e será processado em breve.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/balance', sessionId] });
      handleClose();
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

  const handleClose = () => {
    setAmount("");
    setPixKey("");
    setNome("");
    setCpf("");
    onClose();
  };

  const formatPixKeyPlaceholder = () => {
    switch (pixKeyType) {
      case 'CPF': return "000.000.000-00";
      case 'EMAIL': return "seu@email.com";
      case 'TELEFONE': return "(00) 00000-0000";
      case 'EVP': return "Chave aleatória";
      default: return "Sua chave PIX";
    }
  };

  const formatCpf = (value: string) => {
    let numeros = value.replace(/\D/g, '');
    if (numeros.length <= 11) {
      numeros = numeros.replace(/(\d{3})(\d)/, '$1.$2');
      numeros = numeros.replace(/(\d{3})(\d)/, '$1.$2');
      numeros = numeros.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return numeros.substring(0, 14);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="p-0 border-0 bg-transparent max-w-[420px] w-[90%] overflow-hidden"
        data-testid="modal-withdrawal"
      >
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
            data-testid="button-close-withdrawal"
          >
            <X />
          </button>

          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-3" data-testid="form-withdrawal">
              {/* Valor do Saque */}
              <div>
                <label className="text-white text-sm font-medium block mb-2">
                  Valor do saque
                </label>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="R$ 0,00"
                  className="w-full px-4 py-4 bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl text-white focus:outline-none focus:border-[#fd8303]"
                  required
                  data-testid="input-withdrawal-amount"
                />
                <small className="text-[#888] text-xs mt-1 block">
                  Seu Saldo: R$ {maxAmount.toFixed(2).replace('.', ',')}
                </small>
              </div>

              {/* Chave PIX */}
              <div>
                <label className="text-white text-sm font-medium block mb-2">
                  Chave PIX
                </label>
                <div className="flex gap-2">
                  <select
                    value={pixKeyType}
                    onChange={(e) => setPixKeyType(e.target.value as PixKeyType)}
                    className="w-[95px] bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl text-white px-2 py-4 text-sm focus:outline-none focus:border-[#fd8303]"
                    data-testid="select-pix-key-type"
                  >
                    <option value="CPF">CPF</option>
                    <option value="EMAIL">Email</option>
                    <option value="TELEFONE">Telefone</option>
                    <option value="EVP">Aleatória</option>
                  </select>
                  <input
                    type="text"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder={formatPixKeyPlaceholder()}
                    className="flex-1 px-4 py-4 bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl text-white focus:outline-none focus:border-[#fd8303]"
                    required
                    data-testid="input-pix-key"
                  />
                </div>
              </div>

              {/* Nome e CPF */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white text-sm font-medium block mb-2">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Nome completo"
                    className="w-full px-4 py-4 bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl text-white focus:outline-none focus:border-[#fd8303]"
                    required
                    data-testid="input-withdrawal-name"
                  />
                </div>
                <div>
                  <label className="text-white text-sm font-medium block mb-2">
                    CPF
                  </label>
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(formatCpf(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className="w-full px-4 py-4 bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl text-white focus:outline-none focus:border-[#fd8303]"
                    required
                    data-testid="input-withdrawal-cpf"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={withdrawalMutation.isPending}
                className="w-full bg-[#fd8303] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#e57503] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                data-testid="button-submit-withdrawal"
              >
                {withdrawalMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <ArrowRightCircle className="w-5 h-5" />
                    Solicitar Saque
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
