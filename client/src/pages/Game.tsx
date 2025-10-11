import { useState } from "react";
import { useSession } from "@/hooks/useSession";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { RouletteWheel } from "@/components/RouletteWheel";
import { DepositModal } from "@/components/DepositModal";
import { WithdrawalModal } from "@/components/WithdrawalModal";
import { AuthModal } from "@/components/AuthModal";
import { ProfileModal } from "@/components/ProfileModal";
import { RulesModal } from "@/components/RulesModal";
import { WinAnimation } from "@/components/WinAnimation";
import { RecentWinners } from "@/components/RecentWinners";
import { useToast } from "@/hooks/use-toast";
import { useSound } from "@/contexts/SoundContext";
import { User, Volume2, VolumeX, HelpCircle, DollarSign, ArrowLeft } from "lucide-react";
import type { Game as GameType } from "@shared/schema";
import { useLocation } from "wouter";

export default function Game() {
  const { sessionId } = useSession();
  const { isMuted, toggleSound, playSound } = useSound();
  const [, setLocation] = useLocation();
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showRules, setShowRules] = useState(false);
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
      const response = await apiRequest("GET", `/api/games/history?sessionId=${sessionId}`) as unknown;
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
    playSound('spin');
    playGameMutation.mutate();
  };

  const handleSpinComplete = (multiplier: number) => {
    setIsSpinning(false);
    setShowWin(true);
    
    // Play win or lose sound
    if (multiplier >= 1) {
      playSound('win');
    } else {
      playSound('lose');
    }
    
    queryClient.invalidateQueries({ queryKey: ['/api/balance', sessionId] });
    queryClient.invalidateQueries({ queryKey: ['/api/games/history', sessionId] });
    
    setTimeout(() => {
      setShowWin(false);
      setFinalMultiplier(undefined);
    }, 3000);
  };

  const handleLogout = async () => {
    let newSessionId: string | null = null;
    
    try {
      // Try to get new anonymous sessionId from API
      const response = await fetch('/api/logout', { method: 'POST' });
      const data = await response.json();
      
      if (data.success && data.sessionId) {
        newSessionId = data.sessionId;
      }
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
    
    // ALWAYS clear session data, even if API failed
    localStorage.removeItem('tiger_session_id');
    localStorage.removeItem('sessionId');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('loggedUser');
    
    // Set new session if API succeeded
    if (newSessionId) {
      localStorage.setItem('tiger_session_id', newSessionId);
      localStorage.setItem('sessionId', newSessionId);
    }
    
    window.location.href = '/';
  };

  if (!sessionId) {
    return null;
  }

  return (
    <div className="casino-bg flex items-center justify-center" style={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <div id="game-container" className="relative w-full h-full flex flex-col">
        {/* Botão Voltar - Topo Esquerdo */}
        <button 
          onClick={() => {
            playSound('click');
            setLocation('/');
          }}
          className="absolute top-4 left-4 w-11 h-11 rounded-full bg-gradient-to-br from-green-900/85 to-green-900/70 border-2 border-green-600 text-green-400 flex items-center justify-center shadow-lg hover:scale-110 transition-all z-[25]"
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Lista de Ganhadores Simulados - Topo Esquerdo */}
        <RecentWinners />

        {/* Ícones do Topo Direito - Grid 2x2 */}
        <div className="absolute top-4 right-4 grid grid-cols-2 gap-[10px] z-[25]">
          <button 
            onClick={() => {
              playSound('click');
              setShowProfile(true);
            }}
            className="w-11 h-11 rounded-full bg-gradient-to-br from-green-900/85 to-green-900/70 border-2 border-green-600 text-green-400 flex items-center justify-center shadow-lg hover:scale-110 transition-all"
            data-testid="button-profile"
          >
            <User className="w-5 h-5" />
          </button>
          <button 
            onClick={() => {
              playSound('click');
              toggleSound();
            }}
            className="w-11 h-11 rounded-full bg-gradient-to-br from-green-900/85 to-green-900/70 border-2 border-green-600 text-green-400 flex items-center justify-center shadow-lg hover:scale-110 transition-all"
            data-testid="button-sound"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <button 
            onClick={() => {
              playSound('click');
              setShowRules(true);
            }}
            className="w-11 h-11 rounded-full bg-gradient-to-br from-green-900/85 to-green-900/70 border-2 border-green-600 text-green-400 flex items-center justify-center shadow-lg hover:scale-110 transition-all"
            data-testid="button-help"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
          <button 
            onClick={() => {
              playSound('click');
              setShowDeposit(true);
            }}
            className="w-11 h-11 rounded-full bg-gradient-to-br from-green-900/85 to-green-900/70 border-2 border-green-600 text-green-400 flex items-center justify-center shadow-lg hover:scale-110 transition-all animate-pulse"
            data-testid="button-deposit"
          >
            <DollarSign className="w-5 h-5" />
          </button>
        </div>

        {/* Área da Roleta Centralizada - Responsiva */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[2] roulette-container">
          <RouletteWheel
            isSpinning={isSpinning}
            finalMultiplier={finalMultiplier}
            onSpinComplete={handleSpinComplete}
          />
        </div>

        {/* Área Inferior com Escamas - 20% da tela */}
        <div 
          className="absolute bottom-0 left-0 right-0 z-[4] flex flex-col items-center justify-end"
          style={{
            height: '20vh',
            backgroundImage: 'url(/baixo.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'bottom center'
          }}
        >
          {/* Botão START - 20px do fundo */}
          <button
            onClick={handleSpin}
            disabled={isSpinning || playGameMutation.isPending}
            className="mb-20 z-[25] group disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-spin"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-[28px] blur-xl opacity-70" />
            <div className="relative px-24 py-3.5 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 rounded-[28px] shadow-2xl border-2 border-purple-400">
              <span className="text-white text-2xl font-black tracking-wider uppercase">
                {isSpinning ? "Girando..." : "Start"}
              </span>
            </div>
          </button>

          {/* Painel de Apostas - Sobre as Escamas */}
          <div className="w-full max-w-[380px] px-4 mb-5 z-[25]">
            <div className="relative bg-gradient-to-br from-green-900/60 to-green-800/50 backdrop-blur-sm rounded-2xl p-4 border-2 border-green-600/40">
            <div className="relative z-10 flex items-center justify-center gap-3">
              {/* Botão - */}
              <button 
                onClick={() => {
                  playSound('click');
                  setBetAmount(Math.max(0.10, betAmount - 0.10));
                }}
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
                onClick={() => {
                  playSound('click');
                  setBetAmount(betAmount + 0.10);
                }}
                className="w-14 h-14 rounded-full border-3 border-green-500 bg-gradient-to-br from-green-900/95 to-green-800/90 text-green-300 flex items-center justify-center text-3xl font-bold shadow-lg hover:scale-105 transition-all"
                data-testid="button-increase-bet"
              >
                +
              </button>
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AuthModal
        open={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/balance', sessionId] });
        }}
      />

      <ProfileModal
        open={showProfile}
        onClose={() => setShowProfile(false)}
        balance={balance}
        username={sessionId.substring(0, 8)}
        onWithdraw={() => setShowWithdrawal(true)}
        onLogout={handleLogout}
      />

      <RulesModal
        open={showRules}
        onClose={() => setShowRules(false)}
      />

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
