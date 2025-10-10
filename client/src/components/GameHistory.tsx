import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface GameResult {
  multiplier: number;
  timestamp: Date;
}

interface GameHistoryProps {
  results: GameResult[];
}

export function GameHistory({ results }: GameHistoryProps) {
  const getMultiplierColor = (multiplier: number) => {
    if (multiplier === 0) return "bg-destructive text-destructive-foreground";
    if (multiplier >= 100) return "bg-yellow-500 text-black";
    if (multiplier >= 10) return "bg-chart-2 text-white";
    return "bg-primary text-primary-foreground";
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">
        Últimos Resultados
      </h3>
      <ScrollArea className="h-20">
        <div className="flex gap-2 pb-2">
          {results.slice(0, 20).map((result, index) => (
            <Badge
              key={index}
              className={`${getMultiplierColor(result.multiplier)} min-w-[60px] justify-center font-display font-bold shrink-0`}
              data-testid={`badge-result-${index}`}
            >
              {result.multiplier}x
            </Badge>
          ))}
          {results.length === 0 && (
            <p className="text-sm text-muted-foreground text-center w-full py-4">
              Nenhum resultado ainda
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
