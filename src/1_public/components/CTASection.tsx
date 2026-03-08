// ============================================================
// FILE: CTASection.tsx
// PURPOSE: "Ready to revolutionize your dining experience?"
//          Dark Cinematic Theme.
// ============================================================
import { ArrowRight, CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { AnimateOnScroll } from '@/shared/hooks/useScrollAnimation';

const CTASection = () => {
  const { t } = useLanguage();

  return (
    <section id="cta" className="py-28 px-6 relative overflow-hidden lens-flare-bg bg-obsidian-dark/95">

      <div className="absolute inset-0 bg-[linear-gradient(135deg,_var(--tw-gradient-stops))] from-background via-obsidian to-obsidian-dark pointer-events-none" />

      {/* Subtle dot texture */}
      <div className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(192,57,43,0.2) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />

      {/* Intense Crimson glow */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(192,57,43,0.15) 0%, transparent 70%)' }} />

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <AnimateOnScroll animation="fade-up">
          <h2 className="text-4xl lg:text-5xl font-extrabold mb-5 leading-tight text-foreground">
            {t('cta.title')}
          </h2>
          <p className="text-lg leading-relaxed mb-10 text-muted-foreground">
            {t('cta.description')}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-5">
            <Link to="/partner"
              className="group inline-flex items-center gap-2.5 px-9 py-4 rounded-full font-bold text-base text-white transition-all duration-300 hover:scale-105 glow-crimson-box-intense bg-gradient-to-r from-primary to-orange-600 shadow-lg shadow-primary/20">
              {t('cta.getStarted')}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <button
              className="inline-flex items-center gap-2.5 px-9 py-4 rounded-full font-bold text-base transition-all duration-300 hover:scale-105 cinematic-card glow-crimson-box bg-glass/60 border border-primary/30 text-foreground backdrop-blur-xl hover:bg-glass/80"
              onMouseEnter={e => e.currentTarget.classList.add('glow-crimson-box-intense')}
              onMouseLeave={e => e.currentTarget.classList.remove('glow-crimson-box-intense')}>
              <CalendarDays className="w-4 h-4 text-primary" />
              {t('cta.scheduleDemo')}
            </button>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
};

export default CTASection;