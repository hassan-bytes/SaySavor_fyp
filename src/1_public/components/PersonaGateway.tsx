// ============================================================
// FILE: PersonaGateway.tsx
// PURPOSE: Choose Your Journey — Dark Cinematic Theme.
// ============================================================
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChefHat, Utensils, ArrowRight, Star } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { AnimateOnScroll } from '@/shared/hooks/useScrollAnimation';

interface PersonaGatewayProps {
  onHover?: (type: 'foodie' | 'partner' | null) => void;
}

const PersonaGateway = ({ onHover }: PersonaGatewayProps) => {
  const { t } = useLanguage();
  const [hoveredCard, setHoveredCard] = useState<'foodie' | 'partner' | null>(null);

  const handleHover = (type: 'foodie' | 'partner' | null) => {
    setHoveredCard(type);
    onHover?.(type);
  };

  return (
    <section id="choose-journey" className="py-28 px-6 relative overflow-hidden lens-flare-bg bg-obsidian-dark">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-primary/5 via-obsidian/30 to-obsidian-dark pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto">
        <AnimateOnScroll animation="fade-up">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wider mb-6 glow-crimson-box bg-background/50 border border-primary/20 text-primary backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-primary" style={{ boxShadow: '0 0 8px var(--primary)' }} />
              {t('persona.subtitle')}
            </div>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-foreground">
              {t('persona.title')}
            </h2>
          </div>
        </AnimateOnScroll>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">

          {/* FOODIE */}
          <AnimateOnScroll animation="fade-right">
            <Link to="/foodie"
              className="block rounded-3xl p-10 group transition-all duration-500 hover:-translate-y-2 cinematic-card glow-crimson-box bg-glass/60 border border-glass-border backdrop-blur-xl"
              style={{
                borderColor: hoveredCard === 'foodie' ? 'rgba(192,57,43,0.5)' : 'var(--glass-border)',
                background: hoveredCard === 'foodie' ? 'rgba(20,10,10,0.8)' : 'var(--glass)',
              }}
              onMouseEnter={(e) => {
                handleHover('foodie');
                e.currentTarget.classList.add('glow-crimson-box-intense');
              }}
              onMouseLeave={(e) => {
                handleHover(null);
                e.currentTarget.classList.remove('glow-crimson-box-intense');
              }}
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8 glow-crimson-box group-hover:scale-110 transition-transform bg-primary/10 border border-primary/20">
                <Utensils className="w-8 h-8 text-primary" />
              </div>
              <div className="flex gap-1 mb-5">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-4 h-4 text-transparent fill-primary drop-shadow-[0_0_4px_rgba(220,20,60,0.6)]" />)}
              </div>
              <h3 className="text-2xl font-extrabold mb-3 group-hover:text-primary transition-colors text-foreground">{t('persona.foodie')}</h3>
              <p className="text-sm leading-relaxed mb-8 text-muted-foreground">{t('persona.foodieDesc')}</p>
              <div className="inline-flex items-center gap-2 font-semibold group-hover:gap-3 transition-all text-primary">
                {t('persona.foodieCta')} <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          </AnimateOnScroll>

          {/* PARTNER */}
          <AnimateOnScroll animation="fade-left">
            <Link to="/partner"
              className="block rounded-3xl p-10 group transition-all duration-500 hover:-translate-y-2 cinematic-card glow-crimson-box bg-glass/60 border border-glass-border backdrop-blur-xl"
              style={{
                borderColor: hoveredCard === 'partner' ? 'rgba(192,57,43,0.5)' : 'var(--glass-border)',
                background: hoveredCard === 'partner' ? 'rgba(20,10,10,0.8)' : 'var(--glass)',
              }}
              onMouseEnter={(e) => {
                handleHover('partner');
                e.currentTarget.classList.add('glow-crimson-box-intense');
              }}
              onMouseLeave={(e) => {
                handleHover(null);
                e.currentTarget.classList.remove('glow-crimson-box-intense');
              }}
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8 glow-crimson-box group-hover:scale-110 transition-transform bg-primary/10 border border-primary/20">
                <ChefHat className="w-8 h-8 text-primary" />
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-5 glow-crimson-box bg-background border border-primary/20 text-primary">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_6px_#22c55e]" />
                {t('persona.restaurantsCount')}
              </div>
              <h3 className="text-2xl font-extrabold mb-3 group-hover:text-primary transition-colors text-foreground">{t('persona.partner')}</h3>
              <p className="text-sm leading-relaxed mb-8 text-muted-foreground">{t('persona.partnerDesc')}</p>
              <div className="inline-flex items-center gap-2 font-semibold group-hover:gap-3 transition-all text-primary">
                {t('persona.partnerCta')} <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          </AnimateOnScroll>
        </div>
      </div>
    </section>
  );
};

export default PersonaGateway;