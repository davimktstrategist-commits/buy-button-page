import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Settings, Save } from "lucide-react";

interface GeneralConfig {
  depositMin: number;
  depositMax: number;
  withdrawalMin: number;
  withdrawalMax: number;
  affiliateCpaPercent: number;
  affiliateCpaFixed: number;
}

export function GeneralSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [depositMin, setDepositMin] = useState("20");
  const [depositMax, setDepositMax] = useState("10000");
  const [withdrawalMin, setWithdrawalMin] = useState("20");
  const [withdrawalMax, setWithdrawalMax] = useState("50000");
  const [affiliateCpaPercent, setAffiliateCpaPercent] = useState("10");
  const [affiliateCpaFixed, setAffiliateCpaFixed] = useState("0");

  const { data: config, isLoading } = useQuery<GeneralConfig>({
    queryKey: ['/api/admin/general-config'],
  });

  useEffect(() => {
    if (config) {
      setDepositMin(config.depositMin.toString());
      setDepositMax(config.depositMax.toString());
      setWithdrawalMin(config.withdrawalMin.toString());
      setWithdrawalMax(config.withdrawalMax.toString());
      setAffiliateCpaPercent(config.affiliateCpaPercent.toString());
      setAffiliateCpaFixed(config.affiliateCpaFixed.toString());
    }
  }, [config]);

  const saveConfigMutation = useMutation({
    mutationFn: async (data: GeneralConfig) => {
      return apiRequest("POST", "/api/admin/general-config", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/general-config'] });
      toast({
        title: "✅ Configuração salva",
        description: "As configurações gerais foram atualizadas com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const depositMinNum = parseFloat(depositMin);
    const depositMaxNum = parseFloat(depositMax);
    const withdrawalMinNum = parseFloat(withdrawalMin);
    const withdrawalMaxNum = parseFloat(withdrawalMax);
    const affiliateCpaPercentNum = parseFloat(affiliateCpaPercent);
    const affiliateCpaFixedNum = parseFloat(affiliateCpaFixed);

    if (isNaN(depositMinNum) || depositMinNum < 0) {
      toast({
        title: "❌ Valor inválido",
        description: "Depósito mínimo deve ser um número válido.",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(depositMaxNum) || depositMaxNum < depositMinNum) {
      toast({
        title: "❌ Valor inválido",
        description: "Depósito máximo deve ser maior que o mínimo.",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(withdrawalMinNum) || withdrawalMinNum < 0) {
      toast({
        title: "❌ Valor inválido",
        description: "Saque mínimo deve ser um número válido.",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(withdrawalMaxNum) || withdrawalMaxNum < withdrawalMinNum) {
      toast({
        title: "❌ Valor inválido",
        description: "Saque máximo deve ser maior que o mínimo.",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(affiliateCpaPercentNum) || affiliateCpaPercentNum < 0 || affiliateCpaPercentNum > 100) {
      toast({
        title: "❌ Valor inválido",
        description: "Percentual de afiliados deve ser entre 0 e 100.",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(affiliateCpaFixedNum) || affiliateCpaFixedNum < 0) {
      toast({
        title: "❌ Valor inválido",
        description: "Valor fixo de afiliados deve ser um número válido.",
        variant: "destructive",
      });
      return;
    }

    saveConfigMutation.mutate({
      depositMin: depositMinNum,
      depositMax: depositMaxNum,
      withdrawalMin: withdrawalMinNum,
      withdrawalMax: withdrawalMaxNum,
      affiliateCpaPercent: affiliateCpaPercentNum,
      affiliateCpaFixed: affiliateCpaFixedNum,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Carregando configuração...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configurações Gerais
        </CardTitle>
        <CardDescription>
          Configure os limites e valores do sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Depósitos */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Limites de Depósito</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="depositMin">Depósito Mínimo (R$)</Label>
              <Input
                id="depositMin"
                type="number"
                step="0.01"
                min="0"
                value={depositMin}
                onChange={(e) => setDepositMin(e.target.value)}
                data-testid="input-deposit-min"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="depositMax">Depósito Máximo (R$)</Label>
              <Input
                id="depositMax"
                type="number"
                step="0.01"
                min="0"
                value={depositMax}
                onChange={(e) => setDepositMax(e.target.value)}
                data-testid="input-deposit-max"
              />
            </div>
          </div>
        </div>

        {/* Saques */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Limites de Saque</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="withdrawalMin">Saque Mínimo (R$)</Label>
              <Input
                id="withdrawalMin"
                type="number"
                step="0.01"
                min="0"
                value={withdrawalMin}
                onChange={(e) => setWithdrawalMin(e.target.value)}
                data-testid="input-withdrawal-min"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="withdrawalMax">Saque Máximo (R$)</Label>
              <Input
                id="withdrawalMax"
                type="number"
                step="0.01"
                min="0"
                value={withdrawalMax}
                onChange={(e) => setWithdrawalMax(e.target.value)}
                data-testid="input-withdrawal-max"
              />
            </div>
          </div>
        </div>

        {/* Afiliados CPA */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Comissão de Afiliados (CPA)</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="affiliateCpaPercent">Percentual (%)</Label>
              <Input
                id="affiliateCpaPercent"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={affiliateCpaPercent}
                onChange={(e) => setAffiliateCpaPercent(e.target.value)}
                data-testid="input-affiliate-percent"
              />
              <p className="text-xs text-muted-foreground">
                Percentual sobre depósitos dos indicados
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="affiliateCpaFixed">Valor Fixo (R$)</Label>
              <Input
                id="affiliateCpaFixed"
                type="number"
                step="0.01"
                min="0"
                value={affiliateCpaFixed}
                onChange={(e) => setAffiliateCpaFixed(e.target.value)}
                data-testid="input-affiliate-fixed"
              />
              <p className="text-xs text-muted-foreground">
                Valor fixo por indicado que depositar
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={saveConfigMutation.isPending}
            data-testid="button-save-config"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveConfigMutation.isPending ? "Salvando..." : "Salvar Configuração"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
