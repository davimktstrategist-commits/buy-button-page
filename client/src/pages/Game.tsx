import { useState, useEffect } from "react";
import { useSession } from "@/hooks/useSession";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { RouletteWheel } from "@/components/RouletteWheel";
import { DepositModal } from "@/components/DepositModal";
import { WithdrawalModal } from "@/components/WithdrawalModal";
import { WinAnimation } from "@/components/WinAnimation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { User, Volume2, Settings, Wallet } from "lucide-react";
import type { Game as GameType } from "@shared/schema";

export default function Game() {
  const { sessionId } = useSession();
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [finalMultiplier, setFinalMultiplier] = useState<number>();
  const [showWin, setShowWin] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const [winMultiplier, setWinMultiplier] = useState(0);
  const [betAmount, setBetAmount] = useState(0.50);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user balance
  const { data: balance = 0 } = useQuery<number>({
    queryKey: ['/api/balance', sessionId],
    queryFn: async () => {
      if (!sessionId) return 0;
      const response = await apiRequest("GET", `/api/balance?sessionId=${sessionId}`) as any;
      return response.balance || 0;
    },
    enabled: !!sessionId,
    refetchInterval: 5000,
  });

  // Fetch game history
  const { data: gameHistory = [] } = useQuery<GameType[]>({
    queryKey: ['/api/games/history', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      return await apiRequest("GET", `/api/games/history?sessionId=${sessionId}`) as GameType[];
    },
    enabled: !!sessionId,
  });

  // Play game mutation
  const playGameMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/games/play", { 
        betAmount,
        sessionId 
      }) as any;
      return response;
    },
    onSuccess: (data: any) => {
      setFinalMultiplier(data.multiplier);
      setIsSpinning(true);
      setWinAmount(data.winAmount);
      setWinMultiplier(data.multiplier);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao jogar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSpin = () => {
    if (betAmount > balance) {
      toast({
        title: "Saldo insuficiente",
        description: "Faça um depósito para continuar jogando.",
        variant: "destructive",
      });
      setShowDeposit(true);
      return;
    }
    playGameMutation.mutate();
  };

  const handleSpinComplete = (multiplier: number) => {
    setIsSpinning(false);
    setShowWin(true);
    
    queryClient.invalidateQueries({ queryKey: ['/api/balance', sessionId] });
    queryClient.invalidateQueries({ queryKey: ['/api/games/history', sessionId] });
    
    setTimeout(() => {
      setShowWin(false);
      setFinalMultiplier(undefined);
    }, 3000);
  };

  const recentResults = gameHistory.slice(0, 4).map(game => ({
    player: `${game.userId.substring(0, 2)}******`,
    multiplier: `${game.multiplier}.0xi`,
    amount: parseFloat(game.winAmount)
  }));

  if (!sessionId) {
    return null;
  }

  return (
    <div className="relative min-h-screen overflow-hidden casino-bg">
      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-green-700/10 rounded-full blur-3xl" />
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {/* Top Right - Player Results (Auto-scrolling) */}
        <div className="absolute top-4 right-56 space-y-2 w-52 max-h-[300px] overflow-hidden">
          <div className="space-y-2 animate-scroll">
            {recentResults.concat(recentResults).map((result, i) => (
              <div 
                key={i}
                className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center justify-between text-xs border border-green-900/30"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-green-600/30 flex items-center justify-center">
                    <User className="w-3 h-3 text-green-400" />
                  </div>
                  <span className="text-green-300">{result.player}</span>
                </div>
                <div className="text-right">
                  <div className="text-yellow-400 font-bold">{result.multiplier}</div>
                  {result.amount > 0 && (
                    <div className="text-green-400 text-[10px]">{result.amount.toFixed(2)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Right Icons */}
        <div className="absolute top-4 right-4 flex gap-2">
          <button className="w-12 h-12 rounded-full bg-green-900/50 backdrop-blur-sm border-2 border-green-600/30 flex items-center justify-center hover:bg-green-800/50 transition-colors">
            <User className="w-5 h-5 text-green-400" />
          </button>
          <button className="w-12 h-12 rounded-full bg-green-900/50 backdrop-blur-sm border-2 border-green-600/30 flex items-center justify-center hover:bg-green-800/50 transition-colors">
            <Volume2 className="w-5 h-5 text-green-400" />
          </button>
          <button 
            onClick={() => setShowDeposit(true)}
            className="w-12 h-12 rounded-full bg-green-900/50 backdrop-blur-sm border-2 border-green-600/30 flex items-center justify-center hover:bg-green-800/50 transition-colors"
          >
            <Wallet className="w-5 h-5 text-green-400" />
          </button>
          <button className="w-12 h-12 rounded-full bg-green-900/50 backdrop-blur-sm border-2 border-green-600/30 flex items-center justify-center hover:bg-green-800/50 transition-colors">
            <Settings className="w-5 h-5 text-green-400" />
          </button>
        </div>

        {/* Center - Roulette */}
        <div className="flex flex-col items-center justify-center min-h-screen pt-20">
          <RouletteWheel
            isSpinning={isSpinning}
            finalMultiplier={finalMultiplier}
            onSpinComplete={handleSpinComplete}
          />

          {/* Start/Continue Button */}
          <div className="mt-8">
            <Button
              onClick={handleSpin}
              disabled={isSpinning || playGameMutation.isPending}
              className="px-16 py-6 text-xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-full shadow-2xl shadow-blue-500/50 border-2 border-blue-400/50"
              data-testid="button-spin"
            >
              {isSpinning ? "Girando..." : balance > 0 ? "Start" : "Continue"}
            </Button>
          </div>

          {/* Bottom Controls - Dragon Scale Design */}
          <div className="mt-8 relative">
            {/* Dragon Scale Background */}
            <div className="relative w-[600px] h-32 bg-gradient-to-b from-green-900/80 to-green-950/80 rounded-3xl border-4 border-green-700/50 shadow-2xl">
              {/* Scale Pattern Overlay */}
              <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(34, 197, 94, 0.3) 10px, rgba(34, 197, 94, 0.3) 20px)`
              }} />
              
              {/* Giro Label */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 text-green-400/70 text-sm font-medium">
                GIRO
              </div>
              
              {/* Bet Amount Display */}
              <div className="absolute top-10 left-1/2 -translate-x-1/2 flex items-center gap-3">
                <button 
                  onClick={() => setBetAmount(Math.max(0.10, betAmount - 0.10))}
                  className="w-8 h-8 rounded-full bg-green-800/50 border border-green-600/50 flex items-center justify-center text-green-300 hover:bg-green-700/50"
                >
                  -
                </button>
                <div className="text-2xl font-bold text-green-300 min-w-[120px] text-center">
                  R$ {betAmount.toFixed(2)}
                </div>
                <button 
                  onClick={() => setBetAmount(betAmount + 0.10)}
                  className="w-8 h-8 rounded-full bg-green-800/50 border border-green-600/50 flex items-center justify-center text-green-300 hover:bg-green-700/50"
                >
                  +
                </button>
              </div>

              {/* Saldo Label and Value */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center">
                <div className="text-green-400/70 text-xs mb-1">💰 SALDO</div>
                <div className="text-lg font-bold text-green-300">
                  R$ {balance.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <DepositModal
        open={showDeposit}
        onClose={() => setShowDeposit(false)}
        sessionId={sessionId}
      />

      <WithdrawalModal
        open={showWithdrawal}
        onClose={() => setShowWithdrawal(false)}
        maxAmount={balance}
        sessionId={sessionId}
      />

      <WinAnimation
        show={showWin}
        amount={winAmount}
        multiplier={winMultiplier}
      />
    </div>
  );
}
