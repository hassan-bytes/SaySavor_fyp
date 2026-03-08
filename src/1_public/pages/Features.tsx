// ============================================================
// FILE: Features.tsx
// SECTION: 1_public > pages
// PURPOSE: Saysavor ki features detail mein dikhai jaati hain.
// ROUTE: /features
// ============================================================
import Navbar from '@/1_public/components/Navbar';
import Footer from '@/1_public/components/Footer';
import {
  Mic, Brain, Clock, Users, Filter, Zap, Shield, Eye, Heart,
  Globe, Smartphone, Bell, ArrowRight, Check
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useScrollAnimation } from '@/shared/hooks/useScrollAnimation';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import logoIcon from '@/shared/assets/saysavor-icon.png';

const Features = () => {
  const { t } = useLanguage();
  const [heroRef, heroVisible] = useScrollAnimation();
  const [mainRef, mainVisible] = useScrollAnimation();
  const [additionalRef, additionalVisible] = useScrollAnimation();
  const [ctaRef, ctaVisible] = useScrollAnimation();

  const mainFeatures = [
    {
      icon: Mic,
      title: t('features.voice'),
      description: t('features.voiceDesc'),
      benefits: [t('features.benefit1v'), t('features.benefit2v'), t('features.benefit3v'), t('features.benefit4v')],
      color: 'from-gold to-amber',
    },
    {
      icon: Brain,
      title: t('features.ai'),
      description: t('features.aiDesc'),
      benefits: [t('features.benefit1a'), t('features.benefit2a'), t('features.benefit3a'), t('features.benefit4a')],
      color: 'from-amber to-gold-light',
    },
    {
      icon: Clock,
      title: t('features.realtime'),
      description: t('features.realtimeDesc'),
      benefits: [t('features.benefit1r'), t('features.benefit2r'), t('features.benefit3r'), t('features.benefit4r')],
      color: 'from-gold-light to-gold',
    },
  ];

  const additionalFeatures = [
    { icon: Filter, title: t('features.cultural'), description: t('features.culturalDesc') },
    { icon: Globe, title: t('about.globalReach'), description: t('about.globalReachDesc') },
    { icon: Shield, title: t('about.secure'), description: t('about.secureDesc') },
    { icon: Eye, title: t('features.accessibility'), description: t('features.accessibilityDesc') },
    { icon: Heart, title: t('foodie.saveFav'), description: t('foodie.saveFavDesc') },
    { icon: Bell, title: t('features.notifications'), description: t('features.notifDesc') },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#0b0202' }}>
      <Navbar />

      {/* Hero Section */}
      <section ref={heroRef as React.RefObject<HTMLDivElement>} className="pt-32 pb-20 px-6 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #0b0202 0%, #180505 100%)' }}>
        <div className="absolute top-1/2 right-0 w-[600px] h-[600px] rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(192,57,43,0.12) 0%, transparent 70%)' }} />

        <div className={`relative z-10 max-w-4xl mx-auto text-center transition-all duration-700 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-rose-400 text-sm font-medium mb-6" style={{ background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.3)' }}>
            <img src={logoIcon} alt="SaySavor" className="w-5 h-5 rounded" />
            {t('features.badge')}
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 text-white">
            <span>{t('features.title1')} </span>
            <span className="text-rose-400">{t('features.title2')}</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('features.subtitle')}
          </p>
        </div>
      </section>

      {/* Main Features */}
      <section ref={mainRef as React.RefObject<HTMLDivElement>} className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="space-y-12">
            {mainFeatures.map((feature, index) => (
              <div
                key={feature.title}
                className={`grid lg:grid-cols-2 gap-8 items-center transition-all duration-700 ${mainVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ transitionDelay: `${index * 200}ms` }}
              >
                <div className={`${index % 2 === 1 ? 'lg:order-2' : ''}`}>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110`}
                    style={{ background: 'rgba(192,57,43,0.15)', border: '1px solid rgba(192,57,43,0.2)', boxShadow: '0 0 15px rgba(192,57,43,0.2)' }}>
                    <feature.icon className="w-7 h-7 text-rose-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-4 group-hover:text-rose-300 transition-colors">{feature.title}</h2>
                  <p className="text-zinc-400 mb-6 text-lg">{feature.description}</p>
                  <ul className="space-y-2">
                    {feature.benefits.map((benefit) => (
                      <li key={benefit} className="flex items-center gap-3 text-zinc-300 text-base">
                        <Check className="w-5 h-5 text-rose-400 flex-shrink-0" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={`${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                  <div className="p-10 h-64 rounded-3xl flex items-center justify-center group transition-all duration-500 hover:-translate-y-2"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 12px 36px rgba(192,57,43,0.18)'; e.currentTarget.style.borderColor = 'rgba(192,57,43,0.25)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}>
                    <feature.icon className="w-24 h-24 text-rose-400/30 group-hover:text-rose-400/60 group-hover:scale-110 transition-all duration-500 ease-out" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Features Grid */}
      <section ref={additionalRef as React.RefObject<HTMLDivElement>} className="py-20 px-6" style={{ background: 'rgba(20,5,5,0.5)' }}>
        <div className="max-w-6xl mx-auto">
          <h2 className={`text-3xl md:text-4xl font-extrabold text-center mb-16 transition-all duration-700 ${additionalVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <span className="text-white">{t('features.and')} </span>
            <span className="text-rose-400">{t('features.muchMore')}</span>
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {additionalFeatures.map((feature, index) => (
              <div
                key={feature.title}
                className={`p-8 rounded-2xl group transition-all duration-500 hover:-translate-y-2 ${additionalVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)', transitionDelay: `${index * 100}ms` }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 12px 36px rgba(192,57,43,0.18)'; e.currentTarget.style.borderColor = 'rgba(192,57,43,0.25)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                  style={{ background: 'rgba(192,57,43,0.15)', border: '1px solid rgba(192,57,43,0.2)' }}>
                  <feature.icon className="w-6 h-6 text-rose-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-rose-300 transition-colors">{feature.title}</h3>
                <p className="text-zinc-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section ref={ctaRef as React.RefObject<HTMLDivElement>} className="py-24 px-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(192,57,43,0.08) 0%, transparent 60%)' }} />
        <div className={`relative z-10 max-w-4xl mx-auto text-center p-12 rounded-3xl transition-all duration-700 hover:-translate-y-2 ${ctaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(192,57,43,0.2)', backdropFilter: 'blur(16px)', boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)' }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 24px 80px rgba(192,57,43,0.2), inset 0 1px 0 rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(192,57,43,0.4)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(192,57,43,0.2)'; }}>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">{t('features.expDiff')}</h2>
          <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">
            {t('features.joinHundreds')}
          </p>
          <Link
            to="/foodie"
            className="inline-flex items-center justify-center gap-3 px-10 py-5 rounded-full font-bold text-lg text-white transition-all duration-300 hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #c0392b, #e74c3c)', boxShadow: '0 8px 32px rgba(192,57,43,0.4)' }}
          >
            {t('foodie.getFree')} <ArrowRight className="w-6 h-6" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Features;
