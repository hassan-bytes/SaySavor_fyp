// ============================================================
// FILE: Navbar.tsx — Warm Cream Stitch Design
// PURPOSE: Top navigation — warm cream theme.
//          Logo, links, language toggle. Functionality unchanged — routing same.
// ============================================================
import { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import LanguageToggle from './LanguageToggle';
import Logo from './Logo';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const { t } = useLanguage();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: t('nav.home'), href: '/' },
    { label: t('nav.about'), href: '/about' },
    { label: t('nav.features'), href: '/features' },
    { label: t('nav.foodie'), href: '/foodie' },
    { label: t('nav.partner'), href: '/partner' },
    { label: t('nav.policies'), href: '/policies' },
  ];

  const isActive = (href: string) => location.pathname === href;

  const scrollToJourney = (e: React.MouseEvent) => {
    e.preventDefault();
    const s = document.getElementById('choose-journey');
    if (s) s.scrollIntoView({ behavior: 'smooth' });
    else if (location.pathname !== '/') window.location.href = '/#choose-journey';
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled ? 'py-2' : 'py-3 bg-transparent'}`}
      style={isScrolled ? {
        background: 'rgba(245,237,224,0.92)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(192,57,43,0.1)',
        boxShadow: '0 4px 24px rgba(100,40,10,0.08)',
      } : {}}>

      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between gap-2">

          <Logo size="sm" theme={isScrolled ? 'light' : 'dark'} />

          {/* Nav pill */}
          <div className="flex items-center">
            <div className="flex items-center rounded-full px-1 py-1"
              style={{
                background: 'rgba(255,252,248,0.7)',
                border: '1px solid rgba(200,160,130,0.3)',
                backdropFilter: 'blur(12px)',
              }}>
              {navLinks.map((link) => (
                <Link key={link.label} to={link.href}
                  className={`relative px-2 lg:px-3 py-1.5 text-[10px] sm:text-xs font-medium rounded-full transition-all duration-300 whitespace-nowrap ${isActive(link.href) ? 'text-white' : ''
                    }`}
                  style={isActive(link.href) ? {
                    background: 'linear-gradient(135deg, #c0392b, #e74c3c)',
                    boxShadow: '0 2px 12px rgba(192,57,43,0.3)',
                    color: 'white',
                  } : {
                    color: '#5a2a15',
                  }}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 shrink-0">
            <LanguageToggle />
            <button onClick={scrollToJourney}
              className="group flex items-center gap-1 px-3 lg:px-4 py-2 rounded-full font-semibold text-[10px] sm:text-xs text-white hover:scale-105 transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, #c0392b, #e74c3c)',
                boxShadow: '0 4px 16px rgba(192,57,43,0.25)',
              }}>
              <span>{t('nav.getStarted')}</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
