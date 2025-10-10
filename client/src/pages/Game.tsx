import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { RouletteWheel } from "@/components/RouletteWheel";
import { BetControls } from "@/components/BetControls";
import { GameHistory } from "@/components/GameHistory";
import { WelcomeModal } from "@/components/WelcomeModal";
import { DepositModal } from "@/components/DepositModal";
import { WinAnimation } from "@/components/WinAnimation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Wallet, LogOut, BarChart3, Settings } from "lucide-react";
import type { Game as GameType, User } from "@shared/schema";
import { useLocation } from "wouter";

export default function Game() {
  const { user, isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const [showWelcome, setShowWelcome] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [finalMultiplier, setFinalMultiplier] = useState<number>();
  const [showWin, setShowWin] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const [winMultiplier, setWinMultiplier] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user is new (show welcome modal)
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem(`welcome-seen-${user?.id}`);
    if (user && !hasSeenWelcome) {
      setShowWelcome(true);
      localStorage.setItem(`welcome-seen-${user?.id}`, 'true');
    }
  }, [user]);

  // Fetch user balance
  const { data: userBalance } = useQuery<User>({
    queryKey: ['/api/user/balance'],
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  // Fetch game history
  const { data: gameHistory = [] } = useQuery<GameType[]>({
    queryKey: ['/api/games/history'],
  });

  // Play game mutation
  const playGameMutation = useMutation({
    mutationFn: async (betAmount: number) => {
      const response = await apiRequest("POST", "/api/games/play", { betAmount }) as any;
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

  const handleBet = (amount: number) => {
    if (!userBalance || amount > parseFloat(userBalance.balance)) {
      toast({
        title: "Saldo insuficiente",
        description: "Faça um depósito para continuar jogando.",
        variant: "destructive",
      });
      setShowDeposit(true);
      return;
    }
    playGameMutation.mutate(amount);
  };

  const handleSpinComplete = (multiplier: number) => {
    setIsSpinning(false);
    setShowWin(true);
    
    // Refetch balance and history
    queryClient.invalidateQueries({ queryKey: ['/api/user/balance'] });
    queryClient.invalidateQueries({ queryKey: ['/api/games/history'] });
    
    setTimeout(() => {
      setShowWin(false);
      setFinalMultiplier(undefined);
    }, 3000);
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const balance = userBalance ? parseFloat(userBalance.balance) : 0;
  
  const gameResults = gameHistory.map(game => ({
    multiplier: game.multiplier,
    timestamp: new Date(game.createdAt),
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      {/* Header */}
      <header className="border-b border-border backdrop-blur-sm sticky top-0 z-40 bg-background/95">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center">
                <span className="text-3xl">🐯</span>
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-display font-bold">Roleta do Tigre</h1>
                <p className="text-xs text-muted-foreground hidden md:block">
                  {user?.email || user?.firstName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowDeposit(true)}
                data-testid="button-header-deposit"
              >
                <Wallet className="h-4 w-4" />
              </Button>
              
              {isAdmin && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setLocation('/admin')}
                  data-testid="button-header-admin"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}

              <Button
                variant="outline"
                size="icon"
                onClick={handleLogout}
                data-testid="button-header-logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Roulette Wheel */}
          <div className="flex justify-center py-8">
            <RouletteWheel
              isSpinning={isSpinning}
              finalMultiplier={finalMultiplier}
              onSpinComplete={handleSpinComplete}
            />
          </div>

          {/* Bet Controls */}
          <BetControls
            balance={balance}
            onBet={handleBet}
            isSpinning={isSpinning}
          />

          {/* Game History */}
          <GameHistory results={gameResults} />

          {/* Quick Actions */}
          <div className="flex justify-center gap-4 pt-4">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowDeposit(true)}
              data-testid="button-quick-deposit"
            >
              <Wallet className="mr-2 h-5 w-5" />
              Depositar
            </Button>
          </div>
        </div>
      </main>

      {/* Modals */}
      <WelcomeModal
        open={showWelcome}
        onClose={() => setShowWelcome(false)}
        userName={user?.firstName || undefined}
      />
      
      <DepositModal
        open={showDeposit}
        onClose={() => setShowDeposit(false)}
      />

      <WinAnimation
        show={showWin}
        amount={winAmount}
        multiplier={winMultiplier}
      />
    </div>
  );
}
