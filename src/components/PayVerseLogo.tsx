import logoSvg from '../assets/logo.svg';

interface PayVerseLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

export default function PayVerseLogo({
  className = '',
  size = 'md',
  showTagline = false,
}: PayVerseLogoProps) {
  const heightMap = {
    sm: 'h-8 sm:h-9',
    md: 'h-10 sm:h-12',
    lg: 'h-16 sm:h-20',
  };

  return (
    <div className={`inline-flex flex-col items-center justify-center bg-transparent border-none outline-none shadow-none p-0 m-0 ${className}`}>
      <img
        src={logoSvg}
        alt="PayVerse"
        className={`${heightMap[size]} w-auto object-contain border-none shadow-none bg-transparent pointer-events-none select-none block`}
      />
      {showTagline && (
        <p className="text-gray-500 text-[10px] sm:text-xs font-semibold tracking-wide mt-1 bg-transparent">
          Designed for the Digital Generation.
        </p>
      )}
    </div>
  );
}
