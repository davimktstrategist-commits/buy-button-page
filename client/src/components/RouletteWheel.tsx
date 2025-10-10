import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface RouletteWheelProps {
  isSpinning: boolean;
  finalMultiplier?: number;
  onSpinComplete?: (multiplier: number) => void;
}

// 12 segmentos conforme especificação
const SEGMENTS = [
  { multiplier: 100, color: "#0e3224", textColor: "#00ff88" },
  { multiplier: 10, color: "#065c39", textColor: "#000000" },
  { multiplier: 5, color: "#0e3224", textColor: "#00ff88" },
  { multiplier: 2, color: "#065c39", textColor: "#000000" },
  { multiplier: 15, color: "#0e3224", textColor: "#00ff88" },
  { multiplier: 100, color: "#065c39", textColor: "#000000" },
  { multiplier: 3, color: "#0e3224", textColor: "#00ff88" },
  { multiplier: 20, color: "#065c39", textColor: "#000000" },
  { multiplier: 1, color: "#0e3224", textColor: "#00ff88" },
  { multiplier: 30, color: "#065c39", textColor: "#000000" },
  { multiplier: 4, color: "#0e3224", textColor: "#00ff88" },
  { multiplier: 50, color: "#065c39", textColor: "#000000" },
];

const INNER_SEGMENTS = [
  { multiplier: 1, color: "#065c39" },
  { multiplier: 2, color: "#0e3224" },
  { multiplier: 3, color: "#065c39" },
  { multiplier: 4, color: "#0e3224" },
];

export function RouletteWheel({ isSpinning, finalMultiplier, onSpinComplete }: RouletteWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    if (isSpinning && finalMultiplier !== undefined) {
      const segmentIndex = SEGMENTS.findIndex(s => s.multiplier === finalMultiplier);
      const degreesPerSegment = 360 / SEGMENTS.length;
      const targetDegree = segmentIndex * degreesPerSegment;
      
      const fullRotations = 5;
      const finalRotation = fullRotations * 360 + (360 - targetDegree) + (degreesPerSegment / 2);
      
      setRotation(finalRotation);
      setAnimationKey(prev => prev + 1);
      
      setTimeout(() => {
        setCurrentRotation(finalRotation % 360);
        onSpinComplete?.(finalMultiplier);
      }, 3000);
    }
  }, [isSpinning, finalMultiplier, onSpinComplete]);

  return (
    <div className="relative w-[320px] h-[320px] md:w-[450px] md:h-[450px] mx-auto">
      {/* Seta dourada 3D no topo */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 z-30">
        <div className="relative">
          {/* Sombra da seta */}
          <div className="absolute inset-0 blur-md opacity-50">
            <svg width="80" height="100" viewBox="0 0 80 100">
              <polygon points="40,0 0,40 20,40 20,100 60,100 60,40 80,40" fill="#000000" />
            </svg>
          </div>
          
          {/* Seta principal */}
          <svg width="80" height="100" viewBox="0 0 80 100" className="relative">
            {/* Base verde esmeralda */}
            <defs>
              <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#00b86b', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#065c39', stopOpacity: 1 }} />
              </linearGradient>
              <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#ffd700', stopOpacity: 1 }} />
                <stop offset="50%" style={{ stopColor: '#ffed4e', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#ffa500', stopOpacity: 1 }} />
              </linearGradient>
            </defs>
            
            {/* Borda dourada */}
            <polygon 
              points="40,0 0,40 20,40 20,100 60,100 60,40 80,40" 
              fill="url(#goldGradient)"
            />
            
            {/* Corpo verde (menor que a borda) */}
            <polygon 
              points="40,4 6,40 22,40 22,96 58,96 58,40 74,40" 
              fill="url(#arrowGradient)"
            />
            
            {/* Brilho */}
            <polygon 
              points="40,4 20,28 30,28 30,70 38,70 38,28 42,28" 
              fill="rgba(255,255,255,0.4)"
            />
          </svg>
        </div>
      </div>
      
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-full bg-green-500/20 blur-3xl animate-pulse" />
      
      {/* Main wheel container */}
      <div className="relative w-full h-full">
        {/* Rotating wheel */}
        <motion.div
          key={animationKey}
          className="relative w-full h-full rounded-full overflow-visible"
          style={{ 
            transformOrigin: "center",
            filter: "drop-shadow(0 0 30px rgba(0, 184, 107, 0.6))"
          }}
          animate={{
            rotate: isSpinning ? rotation : currentRotation
          }}
          transition={{
            duration: 3,
            ease: [0.17, 0.67, 0.12, 0.99]
          }}
        >
          {/* Outer ring with LED lights */}
          <div className="absolute inset-0 rounded-full border-4 border-green-900/50">
            {Array.from({ length: 24 }).map((_, i) => {
              const angle = (i * 360) / 24;
              const radius = 50; // percentage
              const x = 50 + radius * Math.cos((angle - 90) * Math.PI / 180);
              const y = 50 + radius * Math.sin((angle - 90) * Math.PI / 180);
              
              return (
                <div
                  key={i}
                  className="absolute w-3 h-3 bg-white rounded-full shadow-lg"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: 'translate(-50%, -50%)',
                    boxShadow: '0 0 10px rgba(255,255,255,0.8)'
                  }}
                />
              );
            })}
          </div>

          {/* Outer segments */}
          <svg className="w-full h-full" viewBox="0 0 400 400">
            <defs>
              {SEGMENTS.map((segment, index) => (
                <pattern key={`pattern-${index}`} id={`dots-${index}`} width="8" height="8" patternUnits="userSpaceOnUse">
                  <circle cx="4" cy="4" r="1" fill="rgba(0,0,0,0.3)" />
                </pattern>
              ))}
            </defs>
            
            {SEGMENTS.map((segment, index) => {
              const anglePerSegment = 360 / SEGMENTS.length;
              const startAngle = (index * anglePerSegment - 90) * (Math.PI / 180);
              const endAngle = ((index + 1) * anglePerSegment - 90) * (Math.PI / 180);
              
              const innerRadius = 60;
              const outerRadius = 190;
              
              const x1 = 200 + innerRadius * Math.cos(startAngle);
              const y1 = 200 + innerRadius * Math.sin(startAngle);
              const x2 = 200 + outerRadius * Math.cos(startAngle);
              const y2 = 200 + outerRadius * Math.sin(startAngle);
              const x3 = 200 + outerRadius * Math.cos(endAngle);
              const y3 = 200 + outerRadius * Math.sin(endAngle);
              const x4 = 200 + innerRadius * Math.cos(endAngle);
              const y4 = 200 + innerRadius * Math.sin(endAngle);
              
              const largeArcFlag = anglePerSegment > 180 ? 1 : 0;
              
              const path = `
                M ${x1} ${y1}
                L ${x2} ${y2}
                A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x3} ${y3}
                L ${x4} ${y4}
                A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1} ${y1}
                Z
              `;
              
              const textAngle = index * anglePerSegment + anglePerSegment / 2 - 90;
              const textRadius = 125;
              const textX = 200 + textRadius * Math.cos(textAngle * Math.PI / 180);
              const textY = 200 + textRadius * Math.sin(textAngle * Math.PI / 180);
              
              return (
                <g key={index}>
                  <path
                    d={path}
                    fill={segment.color}
                  />
                  <path
                    d={path}
                    fill={`url(#dots-${index})`}
                  />
                  <text
                    x={textX}
                    y={textY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${textAngle + 90}, ${textX}, ${textY})`}
                    fill={segment.textColor}
                    fontSize="32"
                    fontWeight="900"
                    fontFamily="Arial Black, sans-serif"
                    style={{
                      textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                      letterSpacing: '-2px'
                    }}
                  >
                    {segment.multiplier}X
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Inner circle with 4 segments */}
          <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120px] h-[120px]" viewBox="0 0 200 200">
            {INNER_SEGMENTS.map((segment, index) => {
              const anglePerSegment = 360 / INNER_SEGMENTS.length;
              const startAngle = (index * anglePerSegment - 90) * (Math.PI / 180);
              const endAngle = ((index + 1) * anglePerSegment - 90) * (Math.PI / 180);
              
              const radius = 90;
              
              const x1 = 100;
              const y1 = 100;
              const x2 = 100 + radius * Math.cos(startAngle);
              const y2 = 100 + radius * Math.sin(startAngle);
              const x3 = 100 + radius * Math.cos(endAngle);
              const y3 = 100 + radius * Math.sin(endAngle);
              
              const largeArcFlag = anglePerSegment > 180 ? 1 : 0;
              
              const path = `
                M ${x1} ${y1}
                L ${x2} ${y2}
                A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x3} ${y3}
                Z
              `;
              
              const textAngle = index * anglePerSegment + anglePerSegment / 2 - 90;
              const textRadius = 50;
              const textX = 100 + textRadius * Math.cos(textAngle * Math.PI / 180);
              const textY = 100 + textRadius * Math.sin(textAngle * Math.PI / 180);
              
              return (
                <g key={index}>
                  <path
                    d={path}
                    fill={segment.color}
                    stroke="#003d26"
                    strokeWidth="2"
                  />
                  <text
                    x={textX}
                    y={textY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${textAngle + 90}, ${textX}, ${textY})`}
                    fill="white"
                    fontSize="28"
                    fontWeight="bold"
                  >
                    {segment.multiplier}X
                  </text>
                </g>
              );
            })}
            
            {/* Center white circle */}
            <circle cx="100" cy="100" r="20" fill="white" />
          </svg>
        </motion.div>
      </div>
    </div>
  );
}
