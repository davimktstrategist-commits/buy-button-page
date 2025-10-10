import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface BetControlsProps {
  balance: number;
  onBet: (amount: number) => void;
  isSpinning: boolean;
}

const BET_AMOUNTS = [1, 5, 10, 20, 50, 100];

export function BetControls({ balance, onBet, isSpinning }: BetControlsProps) {
  const [selectedBet, setSelectedBet] = useState(10);

  const handleBet = () => {
    if (selectedBet <= balance && !isSpinning) {
      onBet(selectedBet);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Bet amount selection */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-muted-foreground">
          Valor da Aposta
        </label>
        <div className="flex flex-wrap gap-2 justify-center">
          {BET_AMOUNTS.map((amount) => (
            <Button
              key={amount}
              variant={selectedBet === amount ? "default" : "outline"}
              size="lg"
              onClick={() => setSelectedBet(amount)}
              disabled={isSpinning || amount > balance}
              className="min-w-[80px]"
              data-testid={`button-bet-${amount}`}
            >
              R$ {amount}
            </Button>
          ))}
        </div>
      </div>

      {/* Spin button */}
      <Button
        size="lg"
        className="w-full h-16 text-xl font-display font-bold"
        onClick={handleBet}
        disabled={isSpinning || selectedBet > balance}
        data-testid="button-spin"
      >
        {isSpinning ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin">🎰</span>
            Girando...
          </span>
        ) : (
          `Girar - R$ ${selectedBet.toFixed(2)}`
        )}
      </Button>

      {/* Balance display */}
      <div className="flex justify-between items-center p-4 bg-card rounded-lg border border-card-border">
        <span className="text-sm font-medium text-muted-foreground">Saldo Disponível</span>
        <Badge variant="outline" className="text-lg font-display font-bold px-4 py-2" data-testid="text-balance">
          R$ {balance.toFixed(2)}
        </Badge>
      </div>
    </div>
  );
}
