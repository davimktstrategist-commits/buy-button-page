import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";

interface ChartData {
  labels: string[];
  values: number[];
}

export function DepositsChart() {
  const { data } = useQuery<ChartData>({
    queryKey: ['/api/admin/deposits-7days'],
  });

  const maxValue = Math.max(...(data?.values || [1]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4" />
          Depósitos (Últimos 7 dias)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          {data && data.labels.length > 0 ? (
            <div className="flex items-end justify-between h-full gap-2">
              {data.labels.map((label, index) => {
                const value = data.values[index];
                const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex items-end justify-center" style={{ height: '200px' }}>
                      <div 
                        className="w-full bg-gradient-to-t from-primary/80 to-primary rounded-t transition-all"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className="text-xs font-medium">R$ {value.toFixed(2)}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
