// ============================================================
// FILE: LanguageToggle.tsx
// SECTION: 1_public > components
// PURPOSE: English aur Urdu ke darmiyan toggle karna.
//          LanguageContext se connected hai.
// ============================================================
import { useState, useRef, useEffect } from 'react';
import { useLanguage, languageLabels, Language } from '@/shared/contexts/LanguageContext';
import { Globe, ChevronDown } from 'lucide-react';

const LanguageToggle = () => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const languages = Object.entries(languageLabels) as [Language, typeof languageLabels[Language]][];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-secondary/50 border border-border hover:border-gold/50 transition-all duration-300 group"
        aria-label="Select language"
      >
        <Globe className="w-3.5 h-3.5 text-gold group-hover:rotate-12 transition-transform" />
        <span className="text-[10px] sm:text-xs font-medium text-foreground">
          {languageLabels[language].flag} {language.toUpperCase()}
        </span>
        <ChevronDown className={`w-2.5 h-2.5 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div 
          className="absolute top-full right-0 mt-2 w-52 py-2 bg-obsidian border border-border rounded-xl shadow-2xl shadow-black/50 z-[100] animate-fade-in"
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="px-3 py-2 border-b border-border/30">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Select Language</p>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {languages.map(([code, { name, flag, nativeName }]) => (
              <button
                key={code}
                onClick={() => {
                  setLanguage(code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-200 ${
                  language === code 
                    ? 'bg-gold/10 text-gold' 
                    : 'text-foreground/80 hover:bg-secondary/50 hover:text-foreground'
                }`}
              >
                <span className="text-xl">{flag}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{name}</p>
                  <p className="text-xs text-muted-foreground">{nativeName}</p>
                </div>
                {language === code && (
                  <div className="w-2 h-2 rounded-full bg-gold" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageToggle;
