import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
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

  const mainConfigs = configs.filter(c => c.type === 'main');
  const bonusConfigs = configs.filter(c => c.type === 'bonus');

  const renderConfigRow = (config: RouletteConfig) => {
    const isEditing = editingConfigs[config.id] !== undefined;
    const probability = isEditing 
      ? editingConfigs[config.id] 
      : parseFloat(config.probability);

    return (
      <div key={config.id} className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Prêmio {config.multiplier}x</Label>
          <span className="text-sm font-bold text-primary" data-testid={`text-probability-${config.multiplier}`}>
            {probability.toFixed(2)}%
          </span>
        </div>
        <Slider
          value={[probability]}
          min={0}
          max={100}
          step={0.5}
          onValueChange={([value]) => {
            setEditingConfigs(prev => ({
              ...prev,
              [config.id]: value
            }));
          }}
          onValueCommit={([value]) => {
            updateConfigMutation.mutate({ id: config.id, probability: value });
          }}
          className="cursor-pointer"
          data-testid={`slider-probability-${config.multiplier}`}
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
          <CardContent className="p-0">
            <ScrollArea className="h-[500px] px-6 py-4">
              <div className="space-y-4">
                {mainConfigs.map(renderConfigRow)}
              </div>
            </ScrollArea>
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
          <CardContent className="p-0">
            <ScrollArea className="h-[500px] px-6 py-4">
              <div className="space-y-4">
                {bonusConfigs.map(renderConfigRow)}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
