// ============================================================
// FILE: FeaturesSection.tsx
// PURPOSE: 6 feature cards — Dark Cinematic Theme.
// ============================================================
import { Mic, QrCode, Clock, Brain, Languages, BarChart3 } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { AnimateOnScroll } from '@/shared/hooks/useScrollAnimation';

const FeaturesSection = () => {
  const { t } = useLanguage();

  const features = [
    { icon: Mic, title: t('features.voice'), desc: t('features.voiceDesc'), delay: 0.05 },
    { icon: QrCode, title: t('features.qr'), desc: t('features.qrDesc'), delay: 0.10 },
    { icon: Clock, title: t('features.realtime'), desc: t('features.realtimeDesc'), delay: 0.15 },
    { icon: Brain, title: t('features.ai'), desc: t('features.aiDesc'), delay: 0.20 },
    { icon: Languages, title: t('features.multilang'), desc: t('features.multilangDesc'), delay: 0.25 },
    { icon: BarChart3, title: t('features.analytics'), desc: t('features.analyticsDesc'), delay: 0.30 },
  ];

  return (
    <section id="features" className="py-28 px-6 relative overflow-hidden lens-flare-bg bg-obsidian">

      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />

      {/* Decorative Floating Frames */}
      <div className="absolute top-20 right-10 w-40 h-40 opacity-15 pointer-events-none rounded-full overflow-hidden blur-[1px] border border-primary/20 rotate-12 mix-blend-screen hidden lg:block">
        <img src="/burgers_frames/ezgif-frame-040.jpg" alt="Dish preview" className="w-full h-full object-cover" />
      </div>
      <div className="absolute bottom-20 left-10 w-64 h-64 opacity-10 pointer-events-none rounded-3xl overflow-hidden blur-[3px] border border-primary/20 rotate-[-8deg] scale-110 mix-blend-screen hidden lg:block">
        <img src="/burgers_frames/ezgif-frame-200.jpg" alt="Dish preview" className="w-full h-full object-cover" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <AnimateOnScroll animation="fade-up">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wider mb-6 glow-crimson-box bg-background/50 border border-primary/20 text-primary backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-primary" style={{ boxShadow: '0 0 8px var(--primary)' }} />
              {t('features.subtitle')}
            </div>
            <h2 className="text-4xl lg:text-5xl font-extrabold leading-tight text-foreground">
              {t('features.title')}
            </h2>
          </div>
        </AnimateOnScroll>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc, delay }) => (
            <AnimateOnScroll key={title} animation="fade-up" delay={delay}>
              <div
                className="rounded-2xl p-7 group cursor-default transition-all duration-300 hover:-translate-y-1 cinematic-card bg-glass/60 border border-glass-border/50 backdrop-blur-xl hover:bg-glass/80 hover:border-primary/40 hover:shadow-[0_16px_48px_rgba(192,57,43,0.14)]"
                style={{
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  transition: 'background 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease, transform 0.3s ease',
                }}
                onMouseEnter={e => e.currentTarget.classList.add('glow-crimson-box-intense')}
                onMouseLeave={e => e.currentTarget.classList.remove('glow-crimson-box-intense')}
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 glow-crimson-box transition-transform group-hover:scale-110 bg-primary/10 border border-primary/20">
                  <Icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-3 group-hover:text-primary transition-colors text-foreground">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
                <div className="mt-6 h-0.5 rounded-full w-0 group-hover:w-full transition-all duration-500 glow-crimson-box-intense bg-gradient-to-r from-primary via-orange-500 to-transparent" />
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;