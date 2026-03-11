// ============================================================
// FILE: Foodie.tsx
// SECTION: 1_public > pages
// PURPOSE: Customer (Foodie) ka cinematic landing page.
//          Partner.tsx ki tarah — hero + features + testimonials + CTA.
//          CTA buttons /foodie/auth par jaate hain.
// ROUTE: /foodie
// ============================================================
import { Link } from 'react-router-dom';
import Navbar from '@/1_public/components/Navbar';
import Footer from '@/1_public/components/Footer';
import {
  ShoppingCart, Search, MapPin, Clock, Heart, Zap,
  Star, ArrowRight, Check, Flame, Trophy, Gift
} from 'lucide-react';
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
    { icon: ShoppingCart, title: 'One-Tap Ordering', description: 'Order from your favourite restaurants in seconds. No calls, no waiting.' },
    { icon: Search, title: 'Smart Search', description: 'Search by dish name, cuisine, or restaurant. AI-powered fuzzy matching.' },
    { icon: MapPin, title: 'Near You', description: 'Discover restaurants in your area with live availability status.' },
    { icon: Clock, title: 'Fast Delivery', description: 'Real-time order tracking. Know exactly when your food arrives.' },
    { icon: Heart, title: 'Save Favourites', description: 'Bookmark your go-to dishes and reorder with one tap.' },
    { icon: Gift, title: 'Savor Points', description: 'Earn loyalty points on every order. Redeem for free meals.' },
  ];

  const whyUs = [
    'Order from 500+ restaurants near you',
    'Live order tracking — from kitchen to door',
    'Earn Savor Points on every single order',
    'Guest checkout — no account needed',
    'EN/UR language support',
    'Exclusive deals & bundles daily',
  ];

  const testimonials = [
    { name: 'Sara Ahmed', location: 'Gujrat, PK', text: 'I ordered Biryani in 10 seconds. SaySavor is insane!', rating: 5 },
    { name: 'Usman Raza', location: 'Lahore, PK', text: 'The Savor Points system is addictive. Free meal every month!', rating: 5 },
    { name: 'Fatima Khan', location: 'Islamabad, PK', text: 'Love the EN/UR toggle. My mom can use it too now.', rating: 5 },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#0d0500' }}>
      <Navbar />

      {/* ══ HERO ══════════════════════════════════════════════════ */}
      <section
        ref={heroRef as React.RefObject<HTMLDivElement>}
        className="pt-32 pb-20 px-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #0d0500 0%, #1a0800 100%)' }}
      >
        {/* Ambient glow — orange for foodies */}
        <div
          className="absolute top-1/2 right-0 w-[700px] h-[700px] rounded-full blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,107,53,0.10) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,140,0,0.06) 0%, transparent 70%)' }}
        />

        <div className="relative z-10 max-w-6xl mx-auto">
          <div className={`grid lg:grid-cols-2 gap-12 items-center transition-all duration-700 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>

            {/* LEFT — Copy */}
            <div>
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-orange-400 text-sm font-medium mb-6"
                style={{ background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.3)' }}
              >
                <img src={logoIcon} alt="SaySavor" className="w-5 h-5 rounded" />
                {t('nav.foodie')}
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 text-white leading-tight">
                <span>Hungry? </span>
                <span style={{ color: '#FF6B35' }}>Order Smarter.</span>
                <br />
                <span className="text-white">Savor Every Bite.</span>
              </h1>

              <p className="text-xl mb-8 font-light" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Discover the best food near you. One tap to order, live tracking, and points that turn into free meals.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/foodie/auth"
                  className="flex items-center justify-center gap-2 px-8 py-4 rounded-full font-bold text-lg text-white transition-all duration-300 hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, #FF6B35, #E85A24)',
                    boxShadow: '0 4px 24px rgba(255,107,53,0.35)',
                  }}
                >
                  <ShoppingCart className="w-5 h-5" />
                  Start Ordering
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/foodie/auth"
                  className="flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold text-white transition-all duration-300 hover:scale-105"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  Browse as Guest
                </Link>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap gap-6 mt-8">
                {[
                  { icon: '⚡', label: 'Instant Orders' },
                  { icon: '📍', label: 'Live Tracking' },
                  { icon: '🌟', label: 'Savor Points' },
                ].map(b => (
                  <div key={b.label} className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    <span>{b.icon}</span>
                    <span className="font-medium">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT — 3D Benefit Card */}
            <div
              className="p-8 rounded-3xl relative overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,107,53,0.15)',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 0 60px rgba(255,107,53,0.06), inset 0 1px 0 rgba(255,255,255,0.05)',
                transform: 'perspective(1000px) rotateY(-3deg) rotateX(1deg)',
                transition: 'transform 0.5s ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg) scale(1.02)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = 'perspective(1000px) rotateY(-3deg) rotateX(1deg)';
              }}
            >
              {/* Inner glow */}
              <div
                className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl pointer-events-none"
                style={{ background: 'rgba(255,107,53,0.08)' }}
              />

              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(255,107,53,0.15)', border: '1px solid rgba(255,107,53,0.25)' }}
                >
                  <Trophy className="w-5 h-5" style={{ color: '#FF6B35' }} />
                </div>
                <h3 className="text-xl font-bold text-white">Why Foodies Love Us</h3>
              </div>

              <ul className="space-y-4">
                {whyUs.map((item, i) => (
                  <li
                    key={i}
                    className={`flex items-center gap-3 transition-all duration-500 ${heroVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}
                    style={{ color: 'rgba(255,255,255,0.75)', transitionDelay: `${i * 80}ms` }}
                  >
                    <Check className="w-5 h-5 flex-shrink-0" style={{ color: '#FF6B35' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FEATURES ════════════════════════════════════════════ */}
      <section ref={featuresRef as React.RefObject<HTMLDivElement>} className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className={`text-3xl font-extrabold text-center mb-12 transition-all duration-700 ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <span className="text-white">Everything You Need to </span>
            <span style={{ color: '#FF6B35' }}>Order & Enjoy</span>
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className={`p-6 rounded-2xl group transition-all duration-500 hover:-translate-y-2 ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  backdropFilter: 'blur(12px)',
                  transitionDelay: `${index * 80}ms`,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 36px rgba(255,107,53,0.15)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,107,53,0.25)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = '';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)';
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110"
                  style={{ background: 'rgba(255,107,53,0.12)', border: '1px solid rgba(255,107,53,0.2)' }}
                >
                  <feature.icon className="w-6 h-6" style={{ color: '#FF6B35' }} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:transition-colors" style={{ transition: 'color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#FF8C00')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'white')}
                >
                  {feature.title}
                </h3>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ TESTIMONIALS ════════════════════════════════════════ */}
      <section
        ref={testimonialsRef as React.RefObject<HTMLDivElement>}
        className="py-20 px-6"
        style={{ background: 'rgba(20,8,0,0.6)' }}
      >
        <div className="max-w-4xl mx-auto">
          <h2 className={`text-3xl font-extrabold text-center mb-12 transition-all duration-700 ${testimonialsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <span className="text-white">Loved by </span>
            <span style={{ color: '#FF6B35' }}>500K+ Foodies</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className={`p-6 rounded-2xl transition-all duration-500 hover:-translate-y-2 ${testimonialsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  backdropFilter: 'blur(12px)',
                  transitionDelay: `${i * 150}ms`,
                }}
              >
                <div className="flex gap-1 mb-3">
                  {[...Array(t.rating)].map((_, idx) => (
                    <Star key={idx} className="w-4 h-4 fill-orange-500 text-orange-500" />
                  ))}
                </div>
                <p className="mb-4 italic leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>"{t.text}"</p>
                <div className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="font-semibold" style={{ color: '#FF6B35' }}>{t.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{t.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ═════════════════════════════════════════════════ */}
      <section ref={ctaRef as React.RefObject<HTMLDivElement>} className="py-20 px-6">
        <div
          className={`max-w-2xl mx-auto text-center p-12 rounded-3xl relative overflow-hidden transition-all duration-700 ${ctaVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95'}`}
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,107,53,0.25)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 0 80px rgba(255,107,53,0.07)',
          }}
        >
          {/* Inner glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(circle at center, rgba(255,107,53,0.07) 0%, transparent 65%)' }}
          />

          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 relative z-10"
            style={{ background: 'rgba(255,107,53,0.12)', border: '1px solid rgba(255,107,53,0.25)' }}
          >
            <Flame className="w-8 h-8" style={{ color: '#FF6B35' }} />
          </div>

          <h2 className="text-3xl font-extrabold text-white mb-4 relative z-10">Ready to Order?</h2>
          <p className="mb-8 text-lg relative z-10" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Join 500K+ foodies already ordering smarter with SaySavor.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
            <Link
              to="/foodie/auth"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-bold text-lg text-white transition-all duration-300 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #FF6B35, #E85A24)',
                boxShadow: '0 4px 24px rgba(255,107,53,0.35)',
              }}
            >
              <Zap className="w-5 h-5" />
              Order Now — It's Free!
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Foodie;
