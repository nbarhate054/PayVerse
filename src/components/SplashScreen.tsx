import { useState, useEffect } from 'react';
import logoSvg from '../assets/logo.svg';

interface SplashScreenProps {
  onFinish?: () => void;
  duration?: number; // in milliseconds
}

export default function SplashScreen({ onFinish, duration = 600 }: SplashScreenProps) {
  const [fadingOut, setFadingOut] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // Start fade-out animation near end of duration
    const fadeTimer = setTimeout(() => {
      setFadingOut(true);
    }, Math.max(100, duration - 200));

    // Hide completely and notify parent
    const hideTimer = setTimeout(() => {
      setHidden(true);
      if (onFinish) onFinish();
    }, duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [duration, onFinish]);

  if (hidden) return null;

  return (
    <div
      className={`absolute inset-0 z-50 flex flex-col items-center justify-center bg-white transition-opacity duration-400 ease-out pointer-events-none select-none ${
        fadingOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Background Ambient Glow */}
      <div className="absolute w-72 h-72 rounded-full bg-blue-500/10 blur-3xl animate-pulse" />
      <div className="absolute w-48 h-48 rounded-full bg-indigo-500/10 blur-2xl animate-pulse delay-500" />

      {/* Main Brand Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 animate-scale-in">
        <div className="mb-4">
          <img
            src={logoSvg}
            alt="PayVerse"
            className="w-56 sm:w-64 h-auto object-contain border-none shadow-none bg-transparent block pointer-events-none select-none"
          />
        </div>
        <p className="text-gray-500 text-xs sm:text-sm font-semibold tracking-wide animate-fade-slide-up">
          Designed for the Digital Generation.
        </p>
      </div>

      {/* Footer loading indicator */}
      <div className="absolute bottom-10 flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">PayVerse</span>
      </div>
    </div>
  );
}
