// ============================================================
// FILE: GoldenOrb.tsx
// SECTION: 1_public > components
// PURPOSE: Animated golden orb â€” landing page ka decorative 3D element.
// ============================================================
import { useState, useEffect } from 'react';
import { Utensils, Wine, Cake, Coffee, Pizza, Salad } from 'lucide-react';

interface GoldenOrbProps {
  glowVariant?: 'gold' | 'amber' | 'default';
  showParticles?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const foodIcons = [Utensils, Wine, Cake, Coffee, Pizza, Salad];

const GoldenOrb = ({ glowVariant = 'default', showParticles = false, size = 'md' }: GoldenOrbProps) => {
  const [activeIcon, setActiveIcon] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIcon((prev) => (prev + 1) % foodIcons.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const getGlowClass = () => {
    switch (glowVariant) {
      case 'amber':
        return 'glow-amber';
      case 'gold':
        return 'glow-gold-intense';
      default:
        return 'glow-gold animate-pulse-gold';
    }
  };

  const sizeClasses = {
    sm: 'w-48 h-48 md:w-56 md:h-56',
    md: 'w-64 h-64 md:w-80 md:h-80',
    lg: 'w-72 h-72 md:w-96 md:h-96 lg:w-[420px] lg:h-[420px]',
  };

  return (
    <div className={`relative ${sizeClasses[size]}`}>
      {/* Outer glow ring - pure gold glow without black */}
      <div className={`absolute inset-0 rounded-full transition-glow duration-500 ${getGlowClass()}`} />
      
      {/* Main orb - pure gold gradient without dark shades */}
      <div className="absolute inset-4 rounded-full bg-gradient-to-br from-gold-light via-gold to-amber overflow-hidden shadow-[0_0_60px_rgba(234,179,8,0.5)]">
        {/* Pure gold surface effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-amber/40 via-gold/20 to-gold-light/60" />
        
        {/* Inner shimmer */}
        <div className="absolute inset-0 animate-shimmer" />
        
        {/* Rotating food silhouettes container */}
        <div className="absolute inset-0 flex items-center justify-center animate-rotate-slow">
          <div className="relative w-full h-full">
            {foodIcons.map((Icon, index) => {
              const angle = (index * 60) * (Math.PI / 180);
              const radius = 35;
              const x = 50 + radius * Math.cos(angle);
              const y = 50 + radius * Math.sin(angle);
              
              return (
                <Icon
                  key={index}
                  className={`absolute w-8 h-8 md:w-10 md:h-10 text-primary-foreground/40 transition-all duration-700 ${
                    activeIcon === index ? 'opacity-70 scale-125' : 'opacity-25 scale-100'
                  }`}
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Center highlight - brighter */}
        <div className="absolute inset-1/4 rounded-full bg-gradient-to-br from-gold-light/90 via-gold/50 to-transparent blur-xl" />
        
        {/* Surface reflection - enhanced */}
        <div className="absolute top-4 left-4 right-1/2 bottom-1/2 rounded-full bg-gradient-to-br from-white/40 via-gold-light/30 to-transparent blur-lg" />
      </div>

      {/* Data particles for partner hover */}
      {showParticles && (
        <div className="absolute inset-0">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1.5 h-1.5 bg-gold rounded-full animate-particle shadow-[0_0_8px_rgba(234,179,8,0.8)]"
              style={{
                left: `${20 + Math.random() * 60}%`,
                top: `${20 + Math.random() * 60}%`,
                animationDelay: `${i * 0.3}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Orbital ring - golden glow */}
      <div className="absolute inset-0 rounded-full border border-gold/30 animate-rotate-slow" style={{ animationDuration: '20s' }}>
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-gold rounded-full shadow-[0_0_12px_rgba(234,179,8,0.9)]" />
      </div>
    </div>
  );
};

export default GoldenOrb;
