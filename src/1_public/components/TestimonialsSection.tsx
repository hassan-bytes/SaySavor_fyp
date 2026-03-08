// ============================================================
// FILE: TestimonialsSection.tsx
// PURPOSE: 3 testimonial cards — Dark Cinematic Theme.
// ============================================================
import { Star } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { AnimateOnScroll } from '@/shared/hooks/useScrollAnimation';

const TestimonialsSection = () => {
  const { t } = useLanguage();

  const testimonials = [
    { nameKey: 'testimonials.t1Name', roleKey: 'testimonials.t1Role', textKey: 'testimonials.t1Text', initials: 'AK', delay: 0.0 },
    { nameKey: 'testimonials.t2Name', roleKey: 'testimonials.t2Role', textKey: 'testimonials.t2Text', initials: 'SB', delay: 0.12 },
    { nameKey: 'testimonials.t3Name', roleKey: 'testimonials.t3Role', textKey: 'testimonials.t3Text', initials: 'RM', delay: 0.24 },
  ];

  return (
    <section id="testimonials" className="py-28 px-6 relative overflow-hidden lens-flare-bg bg-background">

      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto">
        <AnimateOnScroll animation="fade-up">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wider mb-6 glow-crimson-box bg-background/50 border border-primary/20 text-primary backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-primary" style={{ boxShadow: '0 0 8px var(--primary)' }} />
              {t('testimonials.subtitle')}
            </div>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-foreground">
              {t('testimonials.title')}
            </h2>
          </div>
        </AnimateOnScroll>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map(({ nameKey, roleKey, textKey, initials, delay }) => (
            <AnimateOnScroll key={nameKey} animation="fade-up" delay={delay}>
              <div className="rounded-2xl p-8 flex flex-col gap-5 h-full group transition-all duration-300 hover:-translate-y-1 cinematic-card glow-crimson-box bg-glass/60 border border-glass-border/50 backdrop-blur-xl hover:bg-glass/80 hover:border-primary/40"
                onMouseEnter={e => e.currentTarget.classList.add('glow-crimson-box-intense')}
                onMouseLeave={e => e.currentTarget.classList.remove('glow-crimson-box-intense')}>

                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-4 h-4 text-transparent fill-primary drop-shadow-[0_0_4px_rgba(220,20,60,0.6)]" />)}
                </div>

                <p className="text-lg leading-relaxed flex-1 italic relative text-muted-foreground">
                  "{t(textKey)}"
                </p>

                <div className="flex items-center gap-4 pt-5 border-t border-dashed border-glass-border/70">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 glow-crimson-box transition-transform group-hover:scale-110 bg-gradient-to-br from-primary to-orange-700">
                    {initials}
                  </div>
                  <div>
                    <p className="font-extrabold text-base text-foreground">{t(nameKey)}</p>
                    <p className="text-xs tracking-wide text-primary">{t(roleKey)}</p>
                  </div>
                </div>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;