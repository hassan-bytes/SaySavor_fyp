// ============================================================
// FILE: Foodie.tsx
// SECTION: 1_public > pages
// PURPOSE: Customer (foodie) ke liye dedicated landing page.
// ROUTE: /foodie
// ============================================================
import Navbar from '@/1_public/components/Navbar';
import Footer from '@/1_public/components/Footer';
import {
  Mic, Search, MapPin, Clock, Heart, ShoppingBag,
  Star, ArrowRight, Play
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useScrollAnimation } from '@/shared/hooks/useScrollAnimation';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import logoIcon from '@/shared/assets/saysavor-icon.png';

const Foodie = () => {
  const { t } = useLanguage();
  const [heroRef, heroVisible] = useScrollAnimation();
  const [featuresRef, featuresVisible] = useScrollAnimation();
  const [testimonialsRef, testimonialsVisible] = useScrollAnimation();
  const [ctaRef, ctaVisible] = useScrollAnimation();

  const features = [
    { icon: Mic, title: t('persona.foodieFeature1'), description: t('features.subtitle') },
    { icon: Search, title: t('persona.foodieFeature2'), description: t('features.aiDesc') },
    { icon: MapPin, title: t('about.globalReach'), description: t('about.globalReachDesc') },
    { icon: Clock, title: t('persona.foodieFeature4'), description: t('about.fastDesc') },
    { icon: Heart, title: t('foodie.saveFav'), description: t('foodie.saveFavDesc') },
    { icon: ShoppingBag, title: t('foodie.easyReorder'), description: t('foodie.easyReorderDesc') },
  ];

  const testimonials = [
    { name: t('foodie.t1Name'), location: t('foodie.t1Location'), text: t('foodie.t1Text'), rating: 5 },
    { name: t('foodie.t2Name'), location: t('foodie.t2Location'), text: t('foodie.t2Text'), rating: 5 },
    { name: t('foodie.t3Name'), location: t('foodie.t3Location'), text: t('foodie.t3Text'), rating: 5 },
  ];

  return (
    <div className="min-h-screen bg-obsidian text-foreground selection:bg-primary/30 selection:text-primary-foreground">
      <Navbar />

      {/* Hero Section */}
      <section ref={heroRef as React.RefObject<HTMLDivElement>} className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-obsidian-dark via-obsidian to-primary/5" />
        <div className="absolute top-1/2 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        {/* Floating background frame (Empty Space fill) */}
        <div className="absolute left-10 top-20 w-40 h-40 opacity-20 pointer-events-none rounded-full overflow-hidden blur-[2px] border border-primary/20 rotate-[-12deg] mix-blend-screen hidden lg:block">
          <img src="/burgers_frames/ezgif-frame-005.jpg" alt="Dish preview" className="w-full h-full object-cover" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto">
          <div className={`grid lg:grid-cols-2 gap-12 items-center transition-all duration-700 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6 backdrop-blur-md">
                <img src={logoIcon} alt="SaySavor" className="w-5 h-5 rounded" />
                {t('nav.foodie')}
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                <span className="text-foreground">{t('persona.foodieSubtitle').split(' ').slice(0, 2).join(' ')} </span>
                <span className="text-primary">{t('persona.foodieSubtitle').split(' ').slice(2).join(' ')}</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                {t('hero.subheadline')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold text-lg glow-crimson-box transition-all duration-300 hover:scale-105">
                  <Mic className="w-5 h-5" />
                  {t('hero.tryVoice')}
                </button>
                <button className="flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-glass/60 border border-glass-border text-foreground font-semibold hover:border-primary/50 transition-all duration-300 backdrop-blur-xl">
                  <Play className="w-5 h-5 text-primary" />
                  {t('howItWorks.learnMore')}
                </button>
              </div>
            </div>
            <div className="cinematic-card p-8 h-80 flex items-center justify-center group hover:border-primary/40 transition-all duration-500 bg-glass/60 border border-glass-border backdrop-blur-xl rounded-3xl relative overflow-hidden">
              {/* Internal Card Decor */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="text-center relative z-10">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-[0_0_30px_rgba(220,38,38,0.2)]">
                  <Mic className="w-12 h-12 text-primary drop-shadow-[0_0_8px_rgba(220,38,38,0.8)]" />
                </div>
                <p className="text-muted-foreground font-medium">{t('foodie.voiceDemo')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section ref={featuresRef as React.RefObject<HTMLDivElement>} className="py-20 px-6 relative overflow-hidden bg-obsidian-dark/40">
        <div className="max-w-6xl mx-auto relative z-10">
          <h2 className={`text-3xl lg:text-5xl font-extrabold text-center mb-16 transition-all duration-700 ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <span className="text-foreground">{t('features.everythingYou')} </span>
            <span className="text-primary">{t('features.need')}</span>
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className={`cinematic-card p-6 border border-glass-border bg-glass/60 backdrop-blur-xl rounded-2xl glow-crimson-box transition-all duration-500 group hover:-translate-y-2 relative overflow-hidden ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 w-fit mb-4 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section ref={testimonialsRef as React.RefObject<HTMLDivElement>} className="py-20 px-6 bg-obsidian-dark/90 relative overflow-hidden lens-flare-bg">
        {/* Floating decorative image */}
        <div className="absolute right-10 bottom-10 w-48 h-48 opacity-10 pointer-events-none rounded-2xl overflow-hidden blur-[3px] border border-primary/20 rotate-12 mix-blend-screen hidden lg:block">
          <img src="/burgers_frames/ezgif-frame-150.jpg" alt="Dish preview" className="w-full h-full object-cover" />
        </div>

        <div className="max-w-4xl mx-auto relative z-10">
          <h2 className={`text-3xl lg:text-5xl font-extrabold text-center mb-16 transition-all duration-700 ${testimonialsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <span className="text-foreground">{t('foodie.lovedBy')} </span>
            <span className="text-primary">{t('foodie.foodies')}</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className={`cinematic-card p-6 border border-glass-border bg-glass/60 backdrop-blur-xl rounded-2xl transition-all duration-500 hover:-translate-y-2 glow-crimson-box ${testimonialsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-primary text-primary drop-shadow-[0_0_8px_rgba(220,38,38,0.5)]" />
                  ))}
                </div>
                <p className="text-foreground/90 mb-4 italic leading-relaxed">"{t.text}"</p>
                <div className="mt-auto pt-4 border-t border-border/30">
                  <p className="text-sm font-semibold text-primary">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section ref={ctaRef as React.RefObject<HTMLDivElement>} className="py-28 px-6 bg-obsidian">
        <div className={`max-w-2xl mx-auto text-center cinematic-card p-12 border border-glass-border bg-glass backdrop-blur-2xl rounded-3xl glow-crimson-box-intense transition-all duration-700 relative overflow-hidden ${ctaVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95'}`}>
          <div className="absolute inset-0 bg-gradient-radial from-primary/10 via-transparent to-transparent opacity-50 pointer-events-none" />
          <h2 className="text-3xl lg:text-4xl font-extrabold text-foreground mb-6 relative z-10">{t('foodie.readyOrder')}</h2>
          <p className="text-muted-foreground mb-8 text-lg relative z-10">
            {t('foodie.join500k')}
          </p>
          <button className="relative z-10 inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-bold text-lg hover:bg-orange-600 transition-all duration-300 hover:scale-105 shadow-[0_0_20px_rgba(220,38,38,0.4)]">
            {t('foodie.getFree')} <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Foodie;
