import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type { RouletteConfig } from "@shared/schema";

export function RouletteSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingConfigs, setEditingConfigs] = useState<Record<string, number>>({});

  const { data: configs = [] } = useQuery<RouletteConfig[]>({
    queryKey: ['/api/admin/roulette-config'],
  });

  const updateConfigMutation = useMutation({
    mutationFn: async ({ id, probability }: { id: string; probability: number }) => {
      return apiRequest("PUT", `/api/admin/roulette-config/${id}`, { probability });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/roulette-config'] });
      toast({
        title: "Configuração atualizada",
        description: "As probabilidades da roleta foram atualizadas com sucesso.",
      });
      setEditingConfigs({});
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpdate = (id: string) => {
    const probability = editingConfigs[id];
    if (probability !== undefined && probability >= 0 && probability <= 100) {
      updateConfigMutation.mutate({ id, probability });
    } else {
      toast({
        title: "Valor inválido",
        description: "A probabilidade deve estar entre 0 e 100.",
        variant: "destructive",
      });
    }
  };

  const mainConfigs = configs.filter(c => c.type === 'main');
  const bonusConfigs = configs.filter(c => c.type === 'bonus');

  const renderConfigCard = (config: RouletteConfig) => {
    const isEditing = editingConfigs[config.id] !== undefined;
    const probability = isEditing 
      ? editingConfigs[config.id] 
      : parseFloat(config.probability);

    return (
      <Card key={config.id}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-display font-bold ${
                config.multiplier === 100 ? 'bg-yellow-500 text-black' :
                config.multiplier === 0 ? 'bg-destructive text-destructive-foreground' :
                'bg-primary text-primary-foreground'
              }`}>
                {config.multiplier}x
              </div>
              <div className="flex-1">
                <Label className="text-sm text-muted-foreground">Probabilidade (%)</Label>
                <Input
                  type="number"
                  value={probability}
                  onChange={(e) => setEditingConfigs(prev => ({
                    ...prev,
                    [config.id]: parseFloat(e.target.value)
                  }))}
                  className="mt-1"
                  min="0"
                  max="100"
                  step="0.01"
                  data-testid={`input-probability-${config.multiplier}`}
                />
              </div>
            </div>
            <Button
              onClick={() => handleUpdate(config.id)}
              disabled={!isEditing || updateConfigMutation.isPending}
              data-testid={`button-update-${config.multiplier}`}
            >
              Salvar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestão da Roleta</CardTitle>
          <CardDescription>
            Ajuste as probabilidades de cada prêmio para as roletas do jogo.
            A soma das probabilidades deve ser 100%.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-display font-bold">Roleta Principal</h3>
          {mainConfigs.map(renderConfigCard)}
          <div className="text-sm text-muted-foreground p-4 bg-card rounded-lg border border-card-border">
            Total: {mainConfigs.reduce((sum, c) => sum + parseFloat(c.probability), 0).toFixed(2)}%
          </div>
        </div>

        {bonusConfigs.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-display font-bold">Roleta Bônus</h3>
            {bonusConfigs.map(renderConfigCard)}
            <div className="text-sm text-muted-foreground p-4 bg-card rounded-lg border border-card-border">
              Total: {bonusConfigs.reduce((sum, c) => sum + parseFloat(c.probability), 0).toFixed(2)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
