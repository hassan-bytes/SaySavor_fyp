// ============================================================
// FILE: HowItWorks.tsx
// SECTION: 1_public > pages
// PURPOSE: App kaise kaam karta hai â€” step by step guide.
// ROUTE: /how-it-works
// ============================================================
import Navbar from '@/1_public/components/Navbar';
import Footer from '@/1_public/components/Footer';
import { Mic, Brain, UtensilsCrossed, ArrowRight, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useScrollAnimation } from '@/shared/hooks/useScrollAnimation';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import logoIcon from '@/shared/assets/saysavor-icon.png';

const HowItWorks = () => {
  const { t } = useLanguage();
  const [heroRef, heroVisible] = useScrollAnimation();
  const [stepsRef, stepsVisible] = useScrollAnimation();
  const [ctaRef, ctaVisible] = useScrollAnimation();

  const steps = [
    {
      number: '01',
      icon: Mic,
      title: t('howItWorks.step1Title'),
      description: t('howItWorks.step1Desc'),
      details: [
        t('howItWorks.step1Detail1'),
        t('howItWorks.step1Detail2'),
        t('howItWorks.step1Detail3'),
        t('howItWorks.step1Detail4'),
      ],
    },
    {
      number: '02',
      icon: Brain,
      title: t('howItWorks.step2Title'),
      description: t('howItWorks.step2Desc'),
      details: [
        t('howItWorks.step2Detail1'),
        t('howItWorks.step2Detail2'),
        t('howItWorks.step2Detail3'),
        t('howItWorks.step2Detail4'),
      ],
    },
    {
      number: '03',
      icon: UtensilsCrossed,
      title: t('howItWorks.step3Title'),
      description: t('howItWorks.step3Desc'),
      details: [
        t('howItWorks.step3Detail1'),
        t('howItWorks.step3Detail2'),
        t('howItWorks.step3Detail3'),
        t('howItWorks.step3Detail4'),
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section ref={heroRef as React.RefObject<HTMLDivElement>} className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-obsidian-dark to-obsidian" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gold/5 rounded-full blur-3xl" />

        <div className={`relative z-10 max-w-4xl mx-auto text-center transition-all duration-700 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/20 text-gold text-sm font-medium mb-6">
            <img src={logoIcon} alt="SaySavor" className="w-5 h-5 rounded" />
            {t('howItWorks.title')}
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            <span className="text-foreground">{t('howItWorks.subtitle').split(' ').slice(0, 3).join(' ')} </span>
            <span className="text-gold">{t('howItWorks.subtitle').split(' ').slice(3).join(' ')}</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            {t('howItWorks.learnMore')}
          </p>
          <button className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-secondary border border-border text-foreground font-medium hover:border-gold/50 hover:scale-105 transition-all duration-300">
            <Play className="w-5 h-5 text-gold" />
            {t('howItWorks.watchDemo')}
          </button>
        </div>
      </section>

      {/* Steps Section */}
      <section ref={stepsRef as React.RefObject<HTMLDivElement>} className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="relative">
            {/* Connecting Line */}
            <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-gold via-gold/50 to-gold/20 -translate-x-1/2" />

            <div className="space-y-24">
              {steps.map((step, index) => (
                <div
                  key={step.number}
                  className={`grid lg:grid-cols-2 gap-12 items-center relative transition-all duration-700 ${stepsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                  style={{ transitionDelay: `${index * 200}ms` }}
                >
                  {/* Step Number Circle */}
                  <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-obsidian border-2 border-gold items-center justify-center z-10 shadow-lg shadow-gold/20">
                    <span className="text-gold font-bold text-lg">{step.number}</span>
                  </div>

                  {/* Content */}
                  <div className={`${index % 2 === 1 ? 'lg:order-2 lg:text-right' : ''}`}>
                    <div className={`flex items-center gap-4 mb-4 ${index % 2 === 1 ? 'lg:justify-end' : ''}`}>
                      <div className="lg:hidden w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center">
                        <span className="text-gold font-bold">{step.number}</span>
                      </div>
                      <step.icon className="w-8 h-8 text-gold" />
                    </div>
                    <h2 className="text-3xl font-bold text-foreground mb-4">{step.title}</h2>
                    <p className="text-muted-foreground text-lg mb-6">{step.description}</p>
                    <ul className={`space-y-2 ${index % 2 === 1 ? 'lg:text-right' : ''}`}>
                      {step.details.map((detail) => (
                        <li key={detail} className={`flex items-center gap-2 text-foreground/80 ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Visual */}
                  <div className={`${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                    <div className="glass-card p-8 h-72 flex items-center justify-center group hover:border-gold/40 transition-all duration-500">
                      <step.icon className="w-24 h-24 text-gold/30 group-hover:text-gold/50 group-hover:scale-110 transition-all duration-500" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section ref={ctaRef as React.RefObject<HTMLDivElement>} className="py-20 px-6 bg-obsidian-dark/30">
        <div className={`max-w-3xl mx-auto text-center transition-all duration-700 ${ctaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-3xl font-bold text-foreground mb-6">{t('howItWorks.tryYourself')}</h2>
          <p className="text-muted-foreground mb-8">
            {t('howItWorks.tryDesc')}
          </p>
          <Link
            to="/foodie"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gold text-primary-foreground font-semibold text-lg hover:bg-gold-light transition-all duration-300 hover:scale-105"
          >
            {t('howItWorks.startOrdering')} <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HowItWorks;
