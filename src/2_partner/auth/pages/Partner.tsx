// ============================================================
// FILE: Partner.tsx
// SECTION: 2_partner > auth > pages
// PURPOSE: Partner ka landing page â€” restaurant owners ke liye.
//          Yahan se woh register ya login karte hain.
// ROUTE: /partner
// ============================================================
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/1_public/components/Navbar';
import Footer from '@/1_public/components/Footer';
import {
  BarChart3, TrendingUp, Users, Wallet, Bell, Settings,
  ArrowRight, Check, Star, Crown, Zap, Building2
} from 'lucide-react';
import { useScrollAnimation } from '@/shared/hooks/useScrollAnimation';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import logoIcon from '@/shared/assets/saysavor-icon.png';

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  commission_rate: number;
  features: string[];
  is_popular: boolean;
}

// Static plan data
const staticPlans: Plan[] = [
  {
    id: '1',
    name: 'Starter',
    price_monthly: 0,
    commission_rate: 15,
    features: [
      'Up to 50 orders/month',
      'Basic analytics dashboard',
      'Voice AI integration',
      'Email support',
      'Menu management'
    ],
    is_popular: false
  },
  {
    id: '2',
    name: 'Growth',
    price_monthly: 49,
    commission_rate: 10,
    features: [
      'Unlimited orders',
      'Advanced analytics & insights',
      'Priority voice AI',
      '24/7 phone & email support',
      'Marketing tools',
      'Custom branding'
    ],
    is_popular: true
  },
  {
    id: '3',
    name: 'Enterprise',
    price_monthly: 199,
    commission_rate: 5,
    features: [
      'Everything in Growth',
      'Dedicated account manager',
      'Custom integrations',
      'White-label option',
      'API access',
      'Priority support'
    ],
    is_popular: false
  }
];

const Partner = () => {
  const { t } = useLanguage();
  const [heroRef, heroVisible] = useScrollAnimation();
  const [featuresRef, featuresVisible] = useScrollAnimation();
  const [pricingRef, pricingVisible] = useScrollAnimation();
  const [testimonialsRef, testimonialsVisible] = useScrollAnimation();
  const [ctaRef, ctaVisible] = useScrollAnimation();

  const [plans] = useState<Plan[]>(staticPlans);

  const features = [
    { icon: BarChart3, title: t('persona.partnerFeature1'), description: 'Deep insights into your restaurant performance' },
    { icon: TrendingUp, title: t('persona.partnerFeature2'), description: 'Predict busy periods and optimize staffing' },
    { icon: Users, title: t('persona.partnerFeature4'), description: 'Understand your customer demographics and preferences' },
    { icon: Wallet, title: 'Easy Payments', description: 'Weekly payouts with transparent fee structure' },
    { icon: Bell, title: t('persona.partnerFeature3'), description: 'Real-time order notifications and management' },
    { icon: Settings, title: 'Menu Control', description: 'Update menus, prices, and availability instantly' },
  ];

  const benefits = [
    'Reach 500K+ hungry customers',
    'Voice-ordering increases order size by 20%',
    'Lower commission than competitors',
    'Dedicated partner success manager',
    'Marketing support and promotions',
    '24/7 partner support',
  ];

  const testimonials = [
    { name: 'Karachi Biryani House', text: 'Orders increased 40% in the first month!', owner: 'Hassan Ali' },
    { name: 'The Italian Kitchen', text: 'The analytics help us plan our inventory better.', owner: 'Maria Santos' },
    { name: 'Spice Route', text: 'Best partner support we\'ve experienced.', owner: 'Raj Patel' },
  ];

  const getPlanIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'starter': return Zap;
      case 'growth': return Crown;
      case 'enterprise': return Building2;
      default: return Zap;
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#0b0202' }}>
      <Navbar />

      {/* Hero Section */}
      <section ref={heroRef as React.RefObject<HTMLDivElement>} className="pt-32 pb-20 px-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #0b0202 0%, #180505 100%)' }}>
        <div className="absolute top-1/2 right-0 w-[600px] h-[600px] rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(192,57,43,0.12) 0%, transparent 70%)' }} />

        <div className="relative z-10 max-w-6xl mx-auto">
          <div className={`grid lg:grid-cols-2 gap-12 items-center transition-all duration-700 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-rose-400 text-sm font-medium mb-6"
                style={{ background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.3)' }}>
                <img src={logoIcon} alt="SaySavor" className="w-5 h-5 rounded" />
                {t('nav.partner')}
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 text-white">
                <span>{t('persona.partnerSubtitle').split(' ').slice(0, 2).join(' ')} </span>
                <span className="text-rose-400">{t('persona.partnerSubtitle').split(' ').slice(2).join(' ')}</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                {t('persona.subtitle')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/auth"
                  className="flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold text-lg text-white transition-all duration-300 hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #c0392b, #e74c3c)', boxShadow: '0 4px 20px rgba(192,57,43,0.35)' }}>
                  {t('cta.becomePartner')}
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link to="/auth"
                  className="flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold text-white transition-all duration-300"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  Sign In
                </Link>
              </div>
            </div>
            <div className="p-8 rounded-3xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}>
              <h3 className="text-xl font-bold text-white mb-6">Why Partners Love Us</h3>
              <ul className="space-y-4">
                {benefits.map((benefit, i) => (
                  <li key={i}
                    className={`flex items-center gap-3 text-zinc-300 transition-all duration-500 ${heroVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}
                    style={{ transitionDelay: `${i * 100}ms` }}>
                    <Check className="w-5 h-5 text-rose-400 flex-shrink-0" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section ref={featuresRef as React.RefObject<HTMLDivElement>} className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className={`text-3xl font-extrabold text-center mb-12 transition-all duration-700 ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <span className="text-white">Powerful </span>
            <span className="text-rose-400">Partner Tools</span>
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div key={feature.title}
                className={`p-6 rounded-2xl group transition-all duration-500 hover:-translate-y-2 ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)', transitionDelay: `${index * 100}ms` }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 12px 36px rgba(192,57,43,0.18)'; e.currentTarget.style.borderColor = 'rgba(192,57,43,0.25)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110"
                  style={{ background: 'rgba(192,57,43,0.15)', border: '1px solid rgba(192,57,43,0.2)' }}>
                  <feature.icon className="w-6 h-6 text-rose-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-rose-300 transition-colors">{feature.title}</h3>
                <p className="text-zinc-500 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section ref={pricingRef as React.RefObject<HTMLDivElement>} id="pricing" className="py-20 px-6" style={{ background: 'rgba(20,5,5,0.5)' }}>
        <div className="max-w-6xl mx-auto">
          <div className={`text-center mb-12 transition-all duration-700 ${pricingVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h2 className="text-3xl font-extrabold mb-4">
              <span className="text-white">Simple, Transparent </span>
              <span className="text-rose-400">Pricing</span>
            </h2>
            <p className="text-zinc-500 max-w-2xl mx-auto">
              Start free and scale as you grow. No hidden fees, cancel anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan, index) => {
              const Icon = getPlanIcon(plan.name);

              return (
                <div key={plan.id}
                  className={`relative p-6 rounded-2xl transition-all duration-500 hover:-translate-y-2 ${pricingVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                  style={{
                    background: plan.is_popular ? 'rgba(192,57,43,0.1)' : 'rgba(255,255,255,0.03)',
                    border: plan.is_popular ? '1px solid rgba(192,57,43,0.4)' : '1px solid rgba(255,255,255,0.07)',
                    backdropFilter: 'blur(12px)',
                    boxShadow: plan.is_popular ? '0 0 0 1px rgba(192,57,43,0.2), 0 16px 48px rgba(192,57,43,0.15)' : '',
                    marginTop: plan.is_popular ? '-16px' : '',
                    marginBottom: plan.is_popular ? '16px' : '',
                    transitionDelay: `${index * 150}ms`,
                  }}>
                  {plan.is_popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white text-xs font-semibold"
                      style={{ background: 'linear-gradient(135deg, #c0392b, #e74c3c)' }}>
                      Most Popular
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-xl" style={{ background: plan.is_popular ? 'rgba(192,57,43,0.2)' : 'rgba(255,255,255,0.06)' }}>
                      <Icon className={`w-6 h-6 ${plan.is_popular ? 'text-rose-400' : 'text-zinc-500'}`} />
                    </div>
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  </div>
                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white">{plan.price_monthly === 0 ? 'Free' : `$${plan.price_monthly}`}</span>
                      {plan.price_monthly > 0 && <span className="text-zinc-500">/month</span>}
                    </div>
                    <p className="text-sm text-zinc-500 mt-1">{plan.commission_rate}% commission per order</p>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {plan.features.slice(0, 5).map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                        <span className="text-zinc-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/auth"
                    className="block text-center py-3 px-4 rounded-xl font-semibold transition-all text-white hover:opacity-90"
                    style={plan.is_popular
                      ? { background: 'linear-gradient(135deg, #c0392b, #e74c3c)' }
                      : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    Get Started
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Partner Testimonials */}
      <section ref={testimonialsRef as React.RefObject<HTMLDivElement>} className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className={`text-3xl font-extrabold text-center mb-12 transition-all duration-700 ${testimonialsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <span className="text-white">Partner </span>
            <span className="text-rose-400">Success Stories</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, i) => (
              <div key={i}
                className={`p-6 rounded-2xl transition-all duration-500 hover:-translate-y-2 ${testimonialsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)', transitionDelay: `${i * 150}ms` }}>
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, idx) => <Star key={idx} className="w-4 h-4 fill-rose-500 text-rose-500" />)}
                </div>
                <p className="text-zinc-300 mb-4 italic">"{testimonial.text}"</p>
                <p className="font-semibold text-white">{testimonial.name}</p>
                <p className="text-sm text-zinc-500">{testimonial.owner}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section ref={ctaRef as React.RefObject<HTMLDivElement>} className="py-20 px-6">
        <div className={`max-w-2xl mx-auto text-center p-12 rounded-3xl transition-all duration-500 ${ctaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(192,57,43,0.25)', backdropFilter: 'blur(12px)' }}>
          <h2 className="text-3xl font-extrabold text-white mb-6">Ready to Grow?</h2>
          <p className="text-zinc-500 mb-8">Join 10K+ restaurants already growing with SaySavor.</p>
          <Link to="/auth"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold text-lg text-white transition-all duration-300 hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #c0392b, #e74c3c)', boxShadow: '0 4px 24px rgba(192,57,43,0.35)' }}>
            Apply Now <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Partner;
