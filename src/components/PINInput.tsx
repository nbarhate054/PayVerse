import { useRef, useEffect, useState } from 'react';
import { useApp } from '../context';

interface PINInputProps {
  onComplete: (pin: string) => void;
  error?: string;
  disabled?: boolean;
  onReset?: () => void;
}

export default function PINInput({ onComplete, error, disabled, onReset }: PINInputProps) {
  const { pinLockedUntil } = useApp();
  const [pin, setPin] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!pinLockedUntil) { setTimeLeft(0); return; }
    const update = () => {
      const rem = Math.ceil((pinLockedUntil - Date.now()) / 1000);
      setTimeLeft(rem > 0 ? rem : 0);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [pinLockedUntil]);

  useEffect(() => {
    if (!disabled) setTimeout(() => inputRef.current?.focus(), 100);
  }, [disabled]);

  // Reset pin display when error changes (wrong pin was entered)
  useEffect(() => {
    if (error) setPin('');
  }, [error]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(val);
    if (val.length === 4) onComplete(val);
  };

  const isLocked = timeLeft > 0;

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="flex gap-3 cursor-pointer"
        onClick={() => !isLocked && !disabled && inputRef.current?.focus()}
      >
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all duration-200 ${
              error
                ? 'border-red-400 bg-red-50'
                : isLocked
                ? 'border-gray-200 bg-gray-50'
                : pin.length > i
                ? 'border-blue-600 bg-blue-50 scale-105'
                : pin.length === i
                ? 'border-blue-400 bg-white shadow-sm shadow-blue-100'
                : 'border-gray-200 bg-white'
            }`}
          >
            {pin.length > i && (
              <div className={`w-3 h-3 rounded-full ${error ? 'bg-red-400' : 'bg-blue-600'}`} />
            )}
          </div>
        ))}
      </div>
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        value={pin}
        onChange={handleChange}
        disabled={disabled || isLocked}
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
        maxLength={4}
        autoComplete="off"
      />
      {isLocked && (
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
            <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-red-600 text-sm font-medium">PIN locked • {timeLeft}s</span>
          </div>
          <p className="text-gray-400 text-xs">Too many incorrect attempts</p>
        </div>
      )}
      {error && !isLocked && (
        <div className="flex flex-col items-center gap-1">
          <p className="text-red-500 text-sm font-medium">{error}</p>
          {onReset && (
            <button onClick={onReset} className="text-blue-600 text-xs underline">
              Try again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
