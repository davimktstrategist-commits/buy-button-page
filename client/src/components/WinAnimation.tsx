import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface WinAnimationProps {
  show: boolean;
  amount: number;
  multiplier: number;
}

export function WinAnimation({ show, amount, multiplier }: WinAnimationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [show]);

  if (!visible) return null;

  const isWin = multiplier > 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
    >
      <div className="text-center space-y-4">
        {isWin ? (
          <>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: 3, duration: 0.5 }}
              className="text-8xl"
            >
              🎉
            </motion.div>
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: 3, duration: 0.5 }}
              className="space-y-2"
            >
              <h2 className="text-5xl font-display font-bold text-yellow-500">
                VOCÊ GANHOU!
              </h2>
              <p className="text-4xl font-display font-bold text-chart-2">
                R$ {amount.toFixed(2)}
              </p>
              <p className="text-2xl font-bold text-primary">
                Multiplicador {multiplier}x
              </p>
            </motion.div>
          </>
        ) : (
          <>
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: 2, duration: 0.5 }}
              className="text-8xl"
            >
              😢
            </motion.div>
            <motion.div
              className="space-y-2"
            >
              <h2 className="text-5xl font-display font-bold text-destructive">
                NÃO FOI DESSA VEZ
              </h2>
              <p className="text-2xl font-bold text-muted-foreground">
                Tente novamente!
              </p>
            </motion.div>
          </>
        )}
      </div>
    </motion.div>
  );
}
