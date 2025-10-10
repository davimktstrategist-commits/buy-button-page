import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import confetti from "canvas-confetti";

interface WinAnimationProps {
  show: boolean;
  amount: number;
  multiplier: number;
}

const randomInRange = (min: number, max: number) => {
  return Math.random() * (max - min) + min;
};

export function WinAnimation({ show, amount, multiplier }: WinAnimationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      
      // Trigger confetti if it's a win (1x or more)
      if (multiplier >= 1) {
        // Fire confetti multiple times for dramatic effect
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const interval = setInterval(function() {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            return clearInterval(interval);
          }

          const particleCount = 50 * (timeLeft / duration);

          // Fire from left side
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
            colors: ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#45B7D1']
          });

          // Fire from right side
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
            colors: ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#45B7D1']
          });
        }, 250);

        // Big burst at the start
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#45B7D1']
        });
      }

      const timer = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [show, multiplier]);

  if (!visible) return null;

  const isWin = multiplier >= 1;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      data-testid="win-animation"
    >
      <div className="text-center space-y-4">
        {isWin ? (
          <>
            <motion.div
              animate={{ 
                scale: [1, 1.3, 1.2, 1.3, 1],
                rotate: [0, -10, 10, -10, 0]
              }}
              transition={{ repeat: 2, duration: 0.6 }}
              className="text-9xl drop-shadow-2xl"
            >
              🎉
            </motion.div>
            <motion.div
              animate={{ scale: [0.8, 1.1, 1] }}
              transition={{ duration: 0.5 }}
              className="space-y-3 bg-black/60 backdrop-blur-md px-8 py-6 rounded-3xl border-2 border-yellow-500/50"
            >
              <motion.h2 
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: 3, duration: 0.5 }}
                className="text-6xl font-display font-black text-yellow-400 drop-shadow-lg"
                data-testid="text-win-title"
              >
                VOCÊ GANHOU!
              </motion.h2>
              <motion.p 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: 3, duration: 0.5, delay: 0.1 }}
                className="text-5xl font-display font-black text-green-400"
                data-testid="text-win-amount"
              >
                R$ {amount.toFixed(2)}
              </motion.p>
              <p className="text-3xl font-bold text-yellow-300" data-testid="text-win-multiplier">
                Multiplicador {multiplier}x
              </p>
            </motion.div>
          </>
        ) : (
          <>
            <motion.div
              animate={{ rotate: [0, 10, -10, 10, 0] }}
              transition={{ repeat: 2, duration: 0.5 }}
              className="text-9xl drop-shadow-2xl"
            >
              😢
            </motion.div>
            <motion.div
              className="space-y-3 bg-black/60 backdrop-blur-md px-8 py-6 rounded-3xl border-2 border-red-500/50"
              data-testid="lose-animation"
            >
              <h2 className="text-5xl font-display font-black text-red-400 drop-shadow-lg">
                NÃO FOI DESSA VEZ
              </h2>
              <p className="text-2xl font-bold text-gray-300">
                Tente novamente!
              </p>
            </motion.div>
          </>
        )}
      </div>
    </motion.div>
  );
}
