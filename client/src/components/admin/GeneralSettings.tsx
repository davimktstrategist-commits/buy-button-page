import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Settings, Save } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface GeneralConfig {
  depositMin: number;
  depositMax: number;
  withdrawalMin: number;
  withdrawalMax: number;
  affiliateCpaPercent: number;
  affiliateCpaFixed: number;
  rolloverMultiplier: number;
  doubleDepositEnabled: boolean;
  doubleDepositMin: number;
  doubleDepositMax: number;
  brpixSecretKey?: string;
  brpixCompanyId?: string;
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
  const [rolloverMultiplier, setRolloverMultiplier] = useState("1");
  const [doubleDepositEnabled, setDoubleDepositEnabled] = useState(false);
  const [doubleDepositMin, setDoubleDepositMin] = useState("100");
  const [doubleDepositMax, setDoubleDepositMax] = useState("300");
  const [brpixSecretKey, setBrpixSecretKey] = useState("");
  const [brpixCompanyId, setBrpixCompanyId] = useState("");

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
      setRolloverMultiplier(config.rolloverMultiplier?.toString() || "1");
      setDoubleDepositEnabled(config.doubleDepositEnabled || false);
      setDoubleDepositMin(config.doubleDepositMin?.toString() || "100");
      setDoubleDepositMax(config.doubleDepositMax?.toString() || "300");
      setBrpixSecretKey(config.brpixSecretKey || "");
      setBrpixCompanyId(config.brpixCompanyId || "");
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
    const rolloverMultiplierNum = parseFloat(rolloverMultiplier);

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

    if (isNaN(rolloverMultiplierNum) || rolloverMultiplierNum < 1) {
      toast({
        title: "❌ Valor inválido",
        description: "Multiplicador de rollover deve ser no mínimo 1.",
        variant: "destructive",
      });
      return;
    }

    const doubleDepositMinNum = parseFloat(doubleDepositMin);
    const doubleDepositMaxNum = parseFloat(doubleDepositMax);

    if (doubleDepositEnabled) {
      if (isNaN(doubleDepositMinNum) || doubleDepositMinNum < 0) {
        toast({
          title: "❌ Valor inválido",
          description: "Valor mínimo de depósito dobrado deve ser válido.",
          variant: "destructive",
        });
        return;
      }

      if (isNaN(doubleDepositMaxNum) || doubleDepositMaxNum < doubleDepositMinNum) {
        toast({
          title: "❌ Valor inválido",
          description: "Valor máximo de depósito dobrado deve ser maior que o mínimo.",
          variant: "destructive",
        });
        return;
      }
    }

    saveConfigMutation.mutate({
      depositMin: depositMinNum,
      depositMax: depositMaxNum,
      withdrawalMin: withdrawalMinNum,
      withdrawalMax: withdrawalMaxNum,
      affiliateCpaPercent: affiliateCpaPercentNum,
      affiliateCpaFixed: affiliateCpaFixedNum,
      rolloverMultiplier: rolloverMultiplierNum,
      doubleDepositEnabled,
      doubleDepositMin: doubleDepositMinNum,
      doubleDepositMax: doubleDepositMaxNum,
      brpixSecretKey: brpixSecretKey.trim(),
      brpixCompanyId: brpixCompanyId.trim(),
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

        {/* Rollover */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Rollover</h3>
          <div className="space-y-2">
            <Label htmlFor="rolloverMultiplier">Multiplicador de Rollover</Label>
            <Input
              id="rolloverMultiplier"
              type="number"
              step="0.1"
              min="1"
              value={rolloverMultiplier}
              onChange={(e) => setRolloverMultiplier(e.target.value)}
              data-testid="input-rollover-multiplier"
            />
            <p className="text-xs text-muted-foreground">
              Valor que o usuário deve apostar antes de sacar (ex: 1x = valor depositado, 3x = 3 vezes o valor depositado)
            </p>
          </div>
        </div>

        {/* Depósito Dobrado */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-semibold text-foreground">Depósito Dobrado</h3>
              <p className="text-xs text-muted-foreground">
                Dobra automaticamente o valor do depósito dentro do range configurado
              </p>
            </div>
            <Switch
              checked={doubleDepositEnabled}
              onCheckedChange={setDoubleDepositEnabled}
              data-testid="switch-double-deposit"
            />
          </div>
          
          {doubleDepositEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="doubleDepositMin">Valor Mínimo (R$)</Label>
                <Input
                  id="doubleDepositMin"
                  type="number"
                  step="0.01"
                  min="0"
                  value={doubleDepositMin}
                  onChange={(e) => setDoubleDepositMin(e.target.value)}
                  data-testid="input-double-deposit-min"
                />
                <p className="text-xs text-muted-foreground">
                  Depósitos acima deste valor serão dobrados
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="doubleDepositMax">Valor Máximo (R$)</Label>
                <Input
                  id="doubleDepositMax"
                  type="number"
                  step="0.01"
                  min="0"
                  value={doubleDepositMax}
                  onChange={(e) => setDoubleDepositMax(e.target.value)}
                  data-testid="input-double-deposit-max"
                />
                <p className="text-xs text-muted-foreground">
                  Depósitos até este valor serão dobrados
                </p>
              </div>
            </div>
          )}
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

        {/* Credenciais BRPIX */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Credenciais BRPIX</h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brpixSecretKey">Secret Key</Label>
              <Input
                id="brpixSecretKey"
                type="password"
                value={brpixSecretKey}
                onChange={(e) => setBrpixSecretKey(e.target.value)}
                placeholder="Digite a Secret Key da BRPIX"
                data-testid="input-brpix-secret-key"
              />
              <p className="text-xs text-muted-foreground">
                Chave secreta da API BRPIX para transações PIX
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="brpixCompanyId">Company ID</Label>
              <Input
                id="brpixCompanyId"
                type="text"
                value={brpixCompanyId}
                onChange={(e) => setBrpixCompanyId(e.target.value)}
                placeholder="Digite o Company ID da BRPIX"
                data-testid="input-brpix-company-id"
              />
              <p className="text-xs text-muted-foreground">
                Identificador da empresa na plataforma BRPIX
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
