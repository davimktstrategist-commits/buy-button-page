import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Wallet } from "lucide-react";

interface ChartData {
  labels: string[];
  values: number[];
}

export function TopBalancesChart() {
  const { data } = useQuery<ChartData>({
    queryKey: ['/api/admin/top-balances'],
  });

  const maxValue = Math.max(...(data?.values || [1]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="h-4 w-4" />
          Maiores Saldos de Usuários
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data && data.labels.length > 0 ? (
            data.labels.map((label, index) => {
              const value = data.values[index];
              const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
              
              return (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">R$ {value.toFixed(2)}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
