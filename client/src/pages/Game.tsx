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
      <div id="game-container" className="relative flex flex-col">
        {/* Lista de Vencedores Recentes - Topo Esquerdo */}
        <div className="absolute top-4 left-4 z-[25] flex flex-col gap-2" data-testid="winners-list">
          {Array.isArray(gameHistory) && gameHistory.slice(0, 4).map((game, idx) => (
            <div 
              key={game.id} 
              className="bg-black/40 backdrop-blur-sm border border-green-600/30 rounded-lg px-3 py-1 flex items-center gap-2"
              data-testid={`winner-item-${idx}`}
            >
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-white text-xs font-semibold">
                {`${String.fromCharCode(65 + idx)}${'*'.repeat(6)}`}
              </span>
              <span className="text-yellow-400 text-xs font-bold ml-auto">
                {game.multiplier}x
              </span>
            </div>
          ))}
        </div>

        {/* Ícones do Topo Direito - Grid 2x2 */}
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

        {/* Área da Roleta Centralizada */}
        <div className="flex-1 flex items-center justify-center px-4 pt-16 pb-4">
          <div className="w-full max-w-[400px]">
            <RouletteWheel
              isSpinning={isSpinning}
              finalMultiplier={finalMultiplier}
              onSpinComplete={handleSpinComplete}
            />
          </div>
        </div>

        {/* Controles Inferiores */}
        <div className="pb-8 px-4 flex flex-col items-center gap-4 z-[20]">
          {/* Botão START Grande e Azul */}
          <button
            onClick={handleSpin}
            disabled={isSpinning || playGameMutation.isPending}
            className="relative group disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-spin"
          >
            <div className="absolute inset-0 bg-blue-600 rounded-[28px] blur-xl opacity-70" />
            <div className="relative px-24 py-3.5 bg-gradient-to-b from-blue-500 to-blue-600 rounded-[28px] shadow-2xl border-2 border-blue-400">
              <span className="text-white text-2xl font-black tracking-wider uppercase">
                {isSpinning ? "Girando..." : "Start"}
              </span>
            </div>
          </button>

          {/* Painel de Apostas - Fundo Verde com Textura */}
          <div 
            className="relative w-full max-w-[380px] bg-gradient-to-br from-green-900/60 to-green-800/50 backdrop-blur-sm rounded-2xl p-4 border-2 border-green-600/40"
            style={{
              backgroundImage: 'url(/baixo.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            <div className="relative z-10 flex items-center justify-center gap-3">
              {/* Botão - */}
              <button 
                onClick={() => setBetAmount(Math.max(0.10, betAmount - 0.10))}
                className="w-14 h-14 rounded-full border-3 border-green-500 bg-gradient-to-br from-green-900/95 to-green-800/90 text-green-300 flex items-center justify-center text-3xl font-bold shadow-lg hover:scale-105 transition-all"
                data-testid="button-decrease-bet"
              >
                -
              </button>

              {/* GIRO e SALDO */}
              <div className="flex flex-col gap-2">
                {/* GIRO */}
                <div className="bg-gradient-to-br from-green-950/90 to-green-900/85 border-2 border-green-500 rounded-xl px-5 py-2 text-center shadow-lg min-w-[110px]" data-testid="display-bet">
                  <p className="text-[10px] text-green-300 font-bold uppercase m-0 opacity-90">GIRO</p>
                  <p className="text-lg text-green-300 font-bold m-0" data-testid="text-bet-amount">R$ {betAmount.toFixed(2)}</p>
                </div>

                {/* SALDO */}
                <div className="bg-gradient-to-br from-green-950/90 to-green-900/85 border-2 border-green-500/70 rounded-lg px-4 py-1.5 text-center shadow-md min-w-[110px]" data-testid="display-balance">
                  <p className="text-[9px] text-green-300 font-bold uppercase m-0 opacity-85">SALDO</p>
                  <p className="text-base text-green-300 font-bold m-0" data-testid="text-balance">R$ {balance.toFixed(2)}</p>
                </div>
              </div>

              {/* Botão + */}
              <button 
                onClick={() => setBetAmount(betAmount + 0.10)}
                className="w-14 h-14 rounded-full border-3 border-green-500 bg-gradient-to-br from-green-900/95 to-green-800/90 text-green-300 flex items-center justify-center text-3xl font-bold shadow-lg hover:scale-105 transition-all"
                data-testid="button-increase-bet"
              >
                +
              </button>
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
