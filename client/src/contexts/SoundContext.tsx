import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface SoundContextType {
  isMuted: boolean;
  toggleSound: () => void;
  playSound: (soundType: 'click' | 'spin' | 'win' | 'lose') => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export function SoundProvider({ children }: { children: ReactNode }) {
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('soundMuted');
    return saved === 'true';
  });

  const toggleSound = () => {
    setIsMuted(prev => {
      const newValue = !prev;
      localStorage.setItem('soundMuted', String(newValue));
      return newValue;
    });
  };

  const playSound = (soundType: 'click' | 'spin' | 'win' | 'lose') => {
    if (isMuted) return;

    // Create simple beep sounds using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Different frequencies for different sounds
    const frequencies: Record<typeof soundType, number> = {
      click: 800,
      spin: 400,
      win: 1000,
      lose: 200,
    };

    oscillator.frequency.value = frequencies[soundType];
    oscillator.type = 'sine';

    // Volume and duration
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  };

  return (
    <SoundContext.Provider value={{ isMuted, toggleSound, playSound }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error('useSound must be used within SoundProvider');
  }
  return context;
}
