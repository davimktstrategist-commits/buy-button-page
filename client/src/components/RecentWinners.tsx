import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";

interface WinnerData {
  id: string;
  username: string;
  amount: number;
  multiplier: number;
  timestamp: number;
}

export function RecentWinners() {
  const [winners, setWinners] = useState<WinnerData[]>([]);

  // Função para gerar nome de usuário aleatório
  const generateUsername = () => {
    const prefixes = ['Jogador', 'Player', 'User', 'Tiger', 'Lucky', 'Winner'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const number = Math.floor(Math.random() * 9999);
    return `${prefix}${number}`;
  };

  // Função para gerar ganho simulado
  const generateWinner = (): WinnerData => {
    const multipliers = [2, 3, 4, 5, 10, 15, 20, 30, 50, 100];
    const multiplier = multipliers[Math.floor(Math.random() * multipliers.length)];
    const betAmount = [0.5, 1, 2, 5, 10, 20, 50][Math.floor(Math.random() * 7)];
    const amount = betAmount * multiplier;

    return {
      id: Math.random().toString(36).substring(7),
      username: generateUsername(),
      amount,
      multiplier,
      timestamp: Date.now(),
    };
  };

  // Adicionar novos ganhadores periodicamente
  useEffect(() => {
    // Inicializar com alguns ganhadores
    const initialWinners = Array.from({ length: 5 }, generateWinner);
    setWinners(initialWinners);

    // Adicionar novo ganhador a cada 5-10 segundos
    const interval = setInterval(() => {
      const newWinner = generateWinner();
      setWinners(prev => [newWinner, ...prev].slice(0, 8)); // Manter no máximo 8
    }, Math.random() * 5000 + 5000); // Entre 5 e 10 segundos

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute top-4 left-4 z-[25] flex flex-col gap-2 max-w-[280px]" data-testid="recent-winners-list">
      {winners.map((winner, idx) => (
        <div
          key={winner.id}
          className="bg-gradient-to-r from-green-900/90 to-green-800/80 backdrop-blur-md border-2 border-yellow-500/50 rounded-lg px-4 py-2 shadow-lg animate-slide-in"
          style={{
            animation: idx === 0 ? 'slideInLeft 0.5s ease-out' : 'none',
          }}
          data-testid={`winner-item-${idx}`}
        >
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-white text-sm font-semibold truncate">
                  {winner.username}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-yellow-400 text-sm font-bold">
                    {winner.multiplier}x
                  </span>
                </div>
              </div>
              <div className="text-green-300 text-xs font-medium">
                Ganhou R$ {winner.amount.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
