import { useEffect, useState, useRef } from "react";

interface RouletteWheelProps {
  isSpinning: boolean;
  finalMultiplier?: number;
  onSpinComplete: (multiplier: number) => void;
}

export function RouletteWheel({ isSpinning, finalMultiplier, onSpinComplete }: RouletteWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [currentRotation, setCurrentRotation] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);

  // Multiplicadores da roleta principal (12 segmentos, sentido horário do topo)
  const mainWheelMultipliers = [100, 10, 5, 2, 15, 100, 3, 20, 1, 30, 4, 50];
  
  // Ângulo por segmento (360° / 12 = 30°)
  const degreesPerSegment = 360 / 12;

  useEffect(() => {
    if (isSpinning && finalMultiplier !== undefined) {
      // Encontrar o índice do multiplicador final
      const targetIndex = mainWheelMultipliers.indexOf(finalMultiplier);
      
      if (targetIndex === -1) {
        console.error("Multiplicador não encontrado:", finalMultiplier);
        return;
      }

      // Calcular ângulo de destino com offset para centro do segmento
      const targetAngle = targetIndex * degreesPerSegment + (degreesPerSegment / 2);
      
      // Calcular a diferença necessária da posição atual
      const normalizedCurrent = currentRotation % 360;
      let deltaAngle = (360 - targetAngle) - normalizedCurrent;
      
      // Garantir que sempre giramos para frente
      if (deltaAngle < 0) {
        deltaAngle += 360;
      }
      
      // Adicionar voltas completas para animação (mínimo 5 voltas)
      const spins = 5 + Math.floor(Math.random() * 3); // 5-7 voltas
      const totalRotation = currentRotation + (360 * spins) + deltaAngle;
      
      setRotation(totalRotation);

      // Callback após animação - atualizar currentRotation DEPOIS da animação
      const timer = setTimeout(() => {
        setCurrentRotation(totalRotation);
        onSpinComplete(finalMultiplier);
      }, 3000); // 3 segundos de animação

      return () => clearTimeout(timer);
    }
  }, [isSpinning, finalMultiplier]);

  return (
    <div className="relative w-full flex flex-col items-center">
      {/* Seta Indicadora GRANDE no Topo */}
      <img 
        src="/cima.png" 
        alt="Indicador" 
        className="w-full mb-[-15%] z-[10] pointer-events-none"
        style={{ 
          maxWidth: '100%',
          height: 'auto'
        }}
        data-testid="img-roulette-indicator"
      />

      {/* Container da Roleta */}
      <div className="relative w-full" style={{ aspectRatio: '1/1' }}>
        {/* Roleta Principal */}
        <div
          ref={wheelRef}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[5] transition-transform ease-out"
          style={{
            width: '100%',
            transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
            transitionDuration: '3000ms'
          }}
          data-testid="img-roulette-wheel"
        >
          <img 
            src="/roleta1.png" 
            alt="Roleta Principal" 
            className="w-full h-auto"
          />
        </div>

        {/* Roleta Bônus (centro) */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[7] transition-transform ease-out"
          style={{
            width: '38%',
            transform: `translate(-50%, -50%) rotate(${-rotation}deg)`,
            transformOrigin: 'center center',
            transitionDuration: '3000ms'
          }}
          data-testid="img-bonus-wheel"
        >
          <img 
            src="/roleta2.png" 
            alt="Roleta Bônus" 
            className="w-full h-auto"
          />
        </div>

        {/* Indicador Bônus (seta branca pequena) */}
        <img 
          src="/ceta.png" 
          alt="Indicador Bônus" 
          className="absolute top-[20%] left-1/2 -translate-x-1/2 z-[8] pointer-events-none"
          style={{ 
            width: '10%', 
            height: 'auto'
          }}
          data-testid="img-bonus-indicator"
        />
      </div>

      {/* Barra Inferior Decorativa */}
      <img 
        src="/baixo.png" 
        alt="Barra Inferior" 
        className="w-full mt-[-8%] z-[6] pointer-events-none"
        style={{ 
          maxWidth: '100%',
          height: 'auto'
        }}
        data-testid="img-bottom-bar"
      />
    </div>
  );
}
