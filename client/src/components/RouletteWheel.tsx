import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface RouletteWheelProps {
  isSpinning: boolean;
  finalMultiplier?: number;
  onSpinComplete?: (multiplier: number) => void;
}

const SEGMENTS = [
  { multiplier: 0, color: "hsl(147 20% 22%)" },
  { multiplier: 5, color: "hsl(147 70% 35%)" },
  { multiplier: 15, color: "hsl(147 20% 22%)" },
  { multiplier: 2, color: "hsl(147 70% 35%)" },
  { multiplier: 100, color: "hsl(45 90% 55%)" }, // Gold for 100x
  { multiplier: 10, color: "hsl(147 70% 35%)" },
  { multiplier: 2, color: "hsl(147 20% 22%)" },
  { multiplier: 5, color: "hsl(147 70% 35%)" },
];

export function RouletteWheel({ isSpinning, finalMultiplier, onSpinComplete }: RouletteWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    if (isSpinning && finalMultiplier !== undefined) {
      // Calculate final rotation based on multiplier
      const segmentIndex = SEGMENTS.findIndex(s => s.multiplier === finalMultiplier);
      const degreesPerSegment = 360 / SEGMENTS.length;
      const targetDegree = segmentIndex * degreesPerSegment;
      
      // Add multiple full rotations for dramatic effect
      const fullRotations = 5;
      const finalRotation = fullRotations * 360 + (360 - targetDegree) + (degreesPerSegment / 2);
      
      setRotation(finalRotation);
      setAnimationKey(prev => prev + 1);
      
      // Trigger completion after animation
      setTimeout(() => {
        onSpinComplete?.(finalMultiplier);
      }, 3000);
    }
  }, [isSpinning, finalMultiplier, onSpinComplete]);

  return (
    <div className="relative w-[280px] h-[280px] md:w-[400px] md:h-[400px] mx-auto">
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl animate-pulse" />
      
      {/* Main wheel container */}
      <div className="relative w-full h-full">
        {/* Pointer/Arrow at top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
          <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[30px] border-t-yellow-500" />
        </div>
        
        {/* Rotating wheel */}
        <motion.div
          key={animationKey}
          className="relative w-full h-full rounded-full shadow-2xl overflow-hidden"
          style={{ 
            transformOrigin: "center",
            boxShadow: "0 0 40px rgba(147, 197, 114, 0.5)"
          }}
          animate={{
            rotate: isSpinning ? rotation : 0
          }}
          transition={{
            duration: 3,
            ease: [0.17, 0.67, 0.12, 0.99]
          }}
        >
          {/* Segments */}
          {SEGMENTS.map((segment, index) => {
            const rotation = (360 / SEGMENTS.length) * index;
            
            return (
              <div
                key={index}
                className="absolute w-full h-full"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transformOrigin: "center"
                }}
              >
                <div
                  className="absolute top-0 left-1/2 w-0 h-0 -translate-x-1/2"
                  style={{
                    borderLeft: `100px solid transparent`,
                    borderRight: `100px solid transparent`,
                    borderTop: `200px solid ${segment.color}`,
                    borderBottom: "none",
                  }}
                />
                
                {/* Multiplier text */}
                <div
                  className="absolute top-12 md:top-16 left-1/2 -translate-x-1/2"
                  style={{
                    transform: `translateX(-50%) rotate(${-rotation}deg)`,
                  }}
                >
                  <span className={`font-display font-bold text-xl md:text-3xl ${
                    segment.multiplier === 100 ? 'text-yellow-500' : 'text-white'
                  }`}>
                    {segment.multiplier}x
                  </span>
                </div>
              </div>
            );
          })}
          
          {/* Center circle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-green-900 to-green-950 border-4 border-yellow-500 flex items-center justify-center z-10">
            <span className="text-3xl md:text-5xl">🐯</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
