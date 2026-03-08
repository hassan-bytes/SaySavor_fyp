// ============================================================
// FILE: AboutSection.tsx
// PURPOSE: About section — Dark Cinematic Theme.
// ============================================================
import { Globe, Shield, Zap, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { AnimateOnScroll } from '@/shared/hooks/useScrollAnimation';

const AboutSection = () => {
  const { t } = useLanguage();

  const featureCards = [
    { icon: Globe, title: t('about.globalReach'), desc: t('about.globalReachDesc'), delay: 0.1 },
    { icon: Shield, title: t('about.secure'), desc: t('about.secureDesc'), delay: 0.2 },
    { icon: Zap, title: t('about.fast'), desc: t('about.fastDesc'), delay: 0.3 },
  ];

  return (
    <section
      id="about"
      className="py-28 px-6 relative overflow-hidden sr-section lens-flare-bg bg-background"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-obsidian-dark via-background to-obsidian opacity-80 pointer-events-none" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left Content */}
          <div className="sr sr-scale">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wider mb-6 glow-crimson-box bg-background/50 border border-primary/20 text-primary backdrop-blur-md shadow-lg shadow-primary/10">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-primary shadow-[0_0_8px_var(--primary)]" />
              {t('about.subtitle')}
            </div>

            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 leading-[1.15] text-foreground">
              <span className="block mb-2">{t('about.title1')}</span>
              <span className="text-transparent bg-clip-text"
                style={{ background: 'linear-gradient(90deg, #e74c3c 0%, #f39c12 100%)', WebkitBackgroundClip: 'text' }}>
                {t('about.title2')}
              </span>
            </h2>

            {/* Main Card */}
            <div className="p-8 rounded-3xl relative overflow-hidden group transition-all duration-500 hover:-translate-y-2 cinematic-card glow-crimson-box bg-glass/60 border border-glass-border backdrop-blur-xl">
              <p className="text-lg leading-relaxed relative z-10 text-muted-foreground">
                {t('about.description')}
              </p>

              {/* Decorative accent */}
              <div className="absolute -bottom-1 -right-1 w-24 h-24 rounded-full filter blur-2xl opacity-40 group-hover:opacity-70 transition-opacity bg-primary" />

              {/* Floating Image Frame inside card or positioned absolutely */}
              <div className="absolute -right-10 -top-10 w-40 h-40 opacity-20 group-hover:opacity-40 transition-opacity duration-700 pointer-events-none rounded-full overflow-hidden blur-[2px] group-hover:blur-none border-2 border-primary/30 rotate-12 group-hover:rotate-0">
                <img src="/burgers_frames/ezgif-frame-120.jpg" alt="Dish preview" className="w-full h-full object-cover" />
              </div>
            </div>

            <button className="mt-10 group inline-flex items-center gap-2.5 px-8 py-4 rounded-full font-bold text-white transition-all duration-300 hover:scale-105 active:scale-95 glow-crimson-box-intense bg-gradient-to-br from-primary to-orange-600 shadow-lg shadow-primary/20">
              <span>{t('about.learnMore')}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Right Features Grid */}
          <div className="grid gap-6">
            {featureCards.map(({ icon: Icon, title, desc, delay }, index) => (
              <div
                key={index}
                className={`sr sr-right sr-d${index + 2} flex gap-6 p-6 rounded-2xl group transition-all duration-400 cinematic-card hover:-translate-y-1 bg-glass/40 border border-glass-border/50 backdrop-blur-lg hover:bg-glass/80 hover:border-primary/40`}
                onMouseEnter={e => e.currentTarget.classList.add('glow-crimson-box-intense')}
                onMouseLeave={e => e.currentTarget.classList.remove('glow-crimson-box-intense')}
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 glow-crimson-box bg-primary/10 border border-primary/20">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors text-foreground">
                    {title}
                  </h3>
                  <p className="leading-relaxed text-sm text-muted-foreground">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
