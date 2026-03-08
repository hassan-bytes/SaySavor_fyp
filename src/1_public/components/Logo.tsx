// ============================================================
// FILE: Logo.tsx
// SECTION: 1_public > components
// PURPOSE: Saysavor ka brand logo component.
// ============================================================
import { Link } from 'react-router-dom';
import logoIcon from '@/shared/assets/saysavor-icon.png';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
  theme?: 'dark' | 'light';
}

const Logo = ({ size = 'md', showTagline = false, className, theme = 'dark' }: LogoProps) => {
  const sizes = {
    sm: { icon: 'w-8 h-8', text: 'text-sm', tagline: 'text-[6px]' },
    md: { icon: 'w-9 h-9', text: 'text-base', tagline: 'text-[7px]' },
    lg: { icon: 'w-12 h-12', text: 'text-lg', tagline: 'text-[8px]' },
  };

  const textColor = theme === 'dark' ? '#f8f7f5' : '#1a0a05';

  return (
    <Link to="/" className={`flex items-center gap-2 group shrink-0 ${className || ''}`}>
      {/* Logo Icon */}
      <img
        src={logoIcon}
        alt="SaySavor Logo"
        className={`${sizes[size].icon} rounded-lg group-hover:scale-105 transition-transform duration-300`}
      />

      {/* Text */}
      <div className="flex flex-col">
        <span className={`${sizes[size].text} font-bold tracking-tight leading-tight transition-colors duration-500`}
          style={{ color: textColor }}>
          Say<span style={{ color: '#c0392b' }}>Savor</span>
        </span>
        {showTagline && (
          <span className={`${sizes[size].tagline} text-muted-foreground uppercase tracking-widest leading-tight`}>
            Your Voice, Your Taste
          </span>
        )}
      </div>
    </Link>
  );
};

export default Logo;
