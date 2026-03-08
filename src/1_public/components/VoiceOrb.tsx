// ============================================================
// FILE: VoiceOrb.tsx
// SECTION: 1_public > components
// PURPOSE: Voice interface ka animated orb component.
//          Microphone active hone par animate hota hai.
// ============================================================
import { Mic } from 'lucide-react';

interface VoiceOrbProps {
  size?: 'sm' | 'md' | 'lg';
}

const VoiceOrb = ({ size = 'lg' }: VoiceOrbProps) => {
  const sizeClasses = {
    sm: 'w-48 h-48 md:w-56 md:h-56',
    md: 'w-64 h-64 md:w-80 md:h-80',
    lg: 'w-72 h-72 md:w-96 md:h-96 lg:w-[420px] lg:h-[420px]',
  };

  const innerSizes = {
    sm: 'w-24 h-24 md:w-28 md:h-28',
    md: 'w-32 h-32 md:w-40 md:h-40',
    lg: 'w-36 h-36 md:w-44 md:h-44 lg:w-52 lg:h-52',
  };

  const iconSizes = {
    sm: 'w-10 h-10 md:w-12 md:h-12',
    md: 'w-12 h-12 md:w-16 md:h-16',
    lg: 'w-14 h-14 md:w-18 md:h-18 lg:w-20 lg:h-20',
  };

  return (
    <div className={`relative ${sizeClasses[size]} flex items-center justify-center`}>
      {/* Outer pulse rings */}
      <div className="absolute inset-0 rounded-full border border-gold/20 animate-ping" style={{ animationDuration: '3s' }} />
      <div className="absolute inset-4 rounded-full border border-gold/15 animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }} />
      <div className="absolute inset-8 rounded-full border border-gold/10 animate-ping" style={{ animationDuration: '3s', animationDelay: '1s' }} />
      
      {/* Glow background */}
      <div className="absolute inset-12 rounded-full bg-gradient-radial from-gold/20 via-gold/5 to-transparent blur-2xl" />
      
      {/* Sound wave circles */}
      <div className="absolute inset-16 rounded-full border-2 border-gold/30 animate-pulse" style={{ animationDuration: '2s' }} />
      <div className="absolute inset-20 rounded-full border border-gold/40" />
      
      {/* Center orb */}
      <div className={`relative ${innerSizes[size]} rounded-full bg-gradient-to-br from-gold via-gold to-amber flex items-center justify-center shadow-2xl shadow-gold/40 group cursor-pointer hover:scale-105 transition-transform duration-500`}>
        {/* Inner highlight */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-white/10 to-white/30" />
        
        {/* Mic icon */}
        <Mic className={`${iconSizes[size]} text-primary-foreground relative z-10 drop-shadow-lg`} />
        
        {/* Shimmer effect */}
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <div className="absolute inset-0 animate-shimmer opacity-30" />
        </div>
      </div>

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => {
        const angle = (i * 60) * (Math.PI / 180);
        const radius = 42;
        const x = 50 + radius * Math.cos(angle);
        const y = 50 + radius * Math.sin(angle);
        
        return (
          <div
            key={i}
            className="absolute w-2 h-2 bg-gold/60 rounded-full animate-pulse"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -50%)',
              animationDelay: `${i * 0.3}s`,
              animationDuration: '2s',
            }}
          />
        );
      })}
    </div>
  );
};

export default VoiceOrb;
