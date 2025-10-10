import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type { RouletteConfig } from "@shared/schema";
import { Dices, Sparkles } from "lucide-react";

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
    if (probability !== undefined && probability >= 0) {
      updateConfigMutation.mutate({ id, probability });
    } else {
      toast({
        title: "Valor inválido",
        description: "A probabilidade deve ser maior ou igual a 0.",
        variant: "destructive",
      });
    }
  };

  const mainConfigs = configs.filter(c => c.type === 'main');
  const bonusConfigs = configs.filter(c => c.type === 'bonus');

  const renderConfigRow = (config: RouletteConfig) => {
    const isEditing = editingConfigs[config.id] !== undefined;
    const probability = isEditing 
      ? editingConfigs[config.id] 
      : parseFloat(config.probability);

    return (
      <div key={config.id} className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Prêmio ({config.multiplier}x)</Label>
          <span className="text-xs text-muted-foreground">Probabilidade (%)</span>
        </div>
        <Input
          type="number"
          value={probability}
          onChange={(e) => {
            const newValue = parseFloat(e.target.value) || 0;
            setEditingConfigs(prev => ({
              ...prev,
              [config.id]: newValue
            }));
            // Auto-save after 1 second of no changes
            setTimeout(() => {
              if (editingConfigs[config.id] === newValue) {
                handleUpdate(config.id);
              }
            }, 1000);
          }}
          onBlur={() => handleUpdate(config.id)}
          className="text-right"
          min="0"
          step="0.01"
          data-testid={`input-probability-${config.multiplier}`}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold mb-2">Gestão da Roleta</h2>
        <p className="text-muted-foreground">
          Ajuste as probabilidades de cada prêmio para as roletas do jogo.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Dices className="h-5 w-5 text-primary" />
              </div>
              Roleta Principal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mainConfigs.map(renderConfigRow)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-purple-500" />
              </div>
              Roleta Bônus
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {bonusConfigs.map(renderConfigRow)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
