// ============================================================
// FILE: HowItWorksSection.tsx
// PURPOSE: 3 steps — Dark Cinematic Theme.
// ============================================================
import { QrCode, Mic, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { AnimateOnScroll } from '@/shared/hooks/useScrollAnimation';

const HowItWorksSection = () => {
  const { t } = useLanguage();

  const steps = [
    { step: '01', icon: QrCode, title: t('how.step1Title'), desc: t('how.step1Desc'), delay: 0.0 },
    { step: '02', icon: Mic, title: t('how.step2Title'), desc: t('how.step2Desc'), delay: 0.15 },
    { step: '03', icon: CheckCircle, title: t('how.step3Title'), desc: t('how.step3Desc'), delay: 0.30 },
  ];

  return (
    <section id="how-it-works" className="py-28 px-6 relative overflow-hidden lens-flare-bg bg-obsidian-dark/90">

      {/* Background Floating Images */}
      <div className="absolute -left-10 top-1/4 w-48 h-48 opacity-10 pointer-events-none rounded-2xl overflow-hidden blur-[1px] rotate-[-15deg] border border-primary/20 mix-blend-screen">
        <img src="/burgers_frames/ezgif-frame-080.jpg" alt="Dish preview" className="w-full h-full object-cover" />
      </div>
      <div className="absolute -right-10 bottom-1/4 w-56 h-56 opacity-10 pointer-events-none rounded-3xl overflow-hidden blur-[2px] rotate-[10deg] border border-primary/20 mix-blend-screen">
        <img src="/burgers_frames/ezgif-frame-160.jpg" alt="Dish preview" className="w-full h-full object-cover" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <AnimateOnScroll animation="fade-up">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wider mb-6 glow-crimson-box bg-background/50 border border-primary/20 text-primary backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-primary" style={{ boxShadow: '0 0 8px var(--primary)' }} />
              {t('how.subtitle')}
            </div>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-foreground">
              {t('how.title')}
            </h2>
          </div>
        </AnimateOnScroll>

        <div className="relative grid md:grid-cols-3 gap-8">
          {/* Connecting dashed line */}
          <div className="absolute top-[52px] left-[16.5%] right-[16.5%] h-px hidden md:block"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(192,57,43,0.6), rgba(192,57,43,0.6), transparent)', borderTop: '2px dashed rgba(192,57,43,0.3)' }} />

          {steps.map(({ step, icon: Icon, title, desc, delay }) => (
            <AnimateOnScroll key={step} animation="fade-up" delay={delay}>
              <div className="flex flex-col items-center text-center group">
                {/* Tech Ring & Icon */}
                <div className="relative w-[104px] h-[104px] flex items-center justify-center rounded-full mb-8 z-10 transition-transform duration-500 group-hover:scale-110 glow-crimson-box-intense bg-obsidian-light border border-primary/20"
                  style={{
                    background: 'radial-gradient(circle at 36% 32%, var(--obsidian-light) 0%, var(--obsidian) 100%)',
                    boxShadow: '0 0 20px rgba(192,57,43,0.1)'
                  }}>
                  <div className="absolute top-2.5 left-5 w-10 h-5 bg-white/10 rounded-full blur-sm" />
                  {/* Rotating orbital ring */}
                  <div className="absolute inset-0 rounded-full border border-dashed border-primary/30 animate-[spin_10s_linear_infinite]" />
                  <Icon className="w-9 h-9 relative z-10 text-primary" />
                  <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold glow-crimson-box bg-background border border-primary/40 text-primary">
                    {step}
                  </div>
                </div>

                {/* Card */}
                <div className="w-full rounded-2xl p-7 transition-all duration-300 group-hover:-translate-y-1 cinematic-card glow-crimson-box bg-glass/60 border border-glass-border/50 backdrop-blur-xl"
                  onMouseEnter={e => {
                    e.currentTarget.classList.add('glow-crimson-box-intense', 'bg-glass/80', 'border-primary/40');
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.classList.remove('glow-crimson-box-intense', 'bg-glass/80', 'border-primary/40');
                  }}>
                  <h3 className="font-bold text-xl mb-3 group-hover:text-primary transition-colors text-foreground">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
                </div>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;