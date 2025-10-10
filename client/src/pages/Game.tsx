import { useState } from "react";
import { useSession } from "@/hooks/useSession";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { RouletteWheel } from "@/components/RouletteWheel";
import { DepositModal } from "@/components/DepositModal";
import { WithdrawalModal } from "@/components/WithdrawalModal";
import { WinAnimation } from "@/components/WinAnimation";
import { useToast } from "@/hooks/use-toast";
import { User, Volume2, HelpCircle, DollarSign } from "lucide-react";
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
      const response = await apiRequest("GET", `/api/games/history?sessionId=${sessionId}`);
      return response as GameType[];
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
      setWinAmount(parseFloat(data.winAmount));
      setWinMultiplier(data.multiplier);
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

  if (!sessionId) {
    return null;
  }

  return (
    <div className="casino-bg" style={{ minHeight: '100vh', overflow: 'hidden' }}>
      <div id="game-container" className="relative">
        {/* Top Right Icons - Grid 2x2 */}
        <div className="absolute top-4 right-4 grid grid-cols-2 gap-3 z-[25]">
          <button 
            className="w-11 h-11 rounded-full bg-gradient-to-br from-green-900/85 to-green-900/70 border-2 border-green-600 text-green-400 flex items-center justify-center shadow-lg hover:scale-110 transition-all"
            data-testid="button-profile"
          >
            <User className="w-5 h-5" />
          </button>
          <button 
            className="w-11 h-11 rounded-full bg-gradient-to-br from-green-900/85 to-green-900/70 border-2 border-green-600 text-green-400 flex items-center justify-center shadow-lg hover:scale-110 transition-all"
            data-testid="button-sound"
          >
            <Volume2 className="w-5 h-5" />
          </button>
          <button 
            className="w-11 h-11 rounded-full bg-gradient-to-br from-green-900/85 to-green-900/70 border-2 border-green-600 text-green-400 flex items-center justify-center shadow-lg hover:scale-110 transition-all"
            data-testid="button-help"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setShowDeposit(true)}
            className="w-11 h-11 rounded-full bg-gradient-to-br from-green-900/85 to-green-900/70 border-2 border-green-600 text-green-400 flex items-center justify-center shadow-lg hover:scale-110 transition-all animate-pulse"
            data-testid="button-deposit"
          >
            <DollarSign className="w-5 h-5" />
          </button>
        </div>

        {/* Roleta centralizada */}
        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1]" style={{ width: '88%' }}>
          <RouletteWheel
            isSpinning={isSpinning}
            finalMultiplier={finalMultiplier}
            onSpinComplete={handleSpinComplete}
          />
        </div>

        {/* Controles inferiores */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[380px] flex flex-col items-center gap-4 z-[20]">
          {/* Botão START */}
          <button
            onClick={handleSpin}
            disabled={isSpinning || playGameMutation.isPending}
            className="relative group disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-spin"
          >
            <div className="absolute inset-0 bg-[#8a2be2] rounded-[28px] blur-xl opacity-70" />
            <div className="relative px-20 py-3 bg-gradient-to-b from-[#9370db] to-[#8a2be2] rounded-[28px] shadow-2xl">
              <span className="text-white text-2xl font-black tracking-wider">
                {isSpinning ? "Girando..." : "Start"}
              </span>
            </div>
          </button>

          {/* Linha de controles */}
          <div className="flex items-center justify-center gap-3 w-full">
            {/* Botão - */}
            <button 
              onClick={() => setBetAmount(Math.max(0.10, betAmount - 0.10))}
              className="w-14 h-14 rounded-full border-3 border-green-600 bg-gradient-to-br from-green-900/90 to-green-900/75 text-green-400 flex items-center justify-center text-2xl font-bold shadow-lg hover:scale-105 transition-all"
              data-testid="button-decrease-bet"
            >
              -
            </button>

            {/* GIRO e SALDO */}
            <div className="flex flex-col gap-2">
              {/* GIRO */}
              <div className="bg-gradient-to-br from-green-900/85 to-green-900/70 border-3 border-green-600 rounded-xl px-4 py-2 text-center shadow-lg min-w-[95px]" data-testid="display-bet">
                <p className="text-[10px] text-green-400 font-bold uppercase m-0 opacity-80">GIRO</p>
                <p className="text-base text-green-400 font-bold m-0" data-testid="text-bet-amount">R$ {betAmount.toFixed(2)}</p>
              </div>

              {/* SALDO */}
              <div className="bg-gradient-to-br from-green-900/85 to-green-900/70 border-2 border-green-600 rounded-lg px-3 py-1 text-center shadow-md min-w-[90px]" data-testid="display-balance">
                <p className="text-[9px] text-green-400 font-bold uppercase m-0 opacity-75">SALDO</p>
                <p className="text-sm text-green-400 font-bold m-0" data-testid="text-balance">R$ {balance.toFixed(2)}</p>
              </div>
            </div>

            {/* Botão + */}
            <button 
              onClick={() => setBetAmount(betAmount + 0.10)}
              className="w-14 h-14 rounded-full border-3 border-green-600 bg-gradient-to-br from-green-900/90 to-green-900/75 text-green-400 flex items-center justify-center text-2xl font-bold shadow-lg hover:scale-105 transition-all"
              data-testid="button-increase-bet"
            >
              +
            </button>
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
