// ============================================================
// FILE: PoliciesSection.tsx — Warm Cream Stitch Theme
// PURPOSE: Policies cards — warm glass style, crimson accents.
//          Old dark gold → warm cream crimson. Functionality unchanged.
// ============================================================
import { Shield, FileText, Cookie, Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { AnimateOnScroll } from '@/shared/hooks/useScrollAnimation';

const PoliciesSection = () => {
  const { t } = useLanguage();

  const policies = [
    {
      icon: Shield,
      title: t('policies.privacy'),
      description: t('policies.privacyDesc'),
      link: '/policies#privacy-policy',
      bullets: [t('policies.privacyB1'), t('policies.privacyB2'), t('policies.privacyB3')],
    },
    {
      icon: FileText,
      title: t('policies.terms'),
      description: t('policies.termsDesc'),
      link: '/policies#terms-of-service',
      bullets: [t('policies.termsB1'), t('policies.termsB2'), t('policies.termsB3')],
    },
    {
      icon: Cookie,
      title: t('policies.cookies'),
      description: t('policies.cookiesDesc'),
      link: '/policies#cookie-policy',
      bullets: [t('policies.cookiesB1'), t('policies.cookiesB2'), t('policies.cookiesB3')],
    },
    {
      icon: Users,
      title: t('policies.partner'),
      description: t('policies.partnerDesc'),
      link: '/policies#partner-guidelines',
      bullets: [t('policies.partnerB1'), t('policies.partnerB2'), t('policies.partnerB3')],
    },
  ];

  return (
    <section
      id="policies"
      className="py-28 px-6 relative overflow-hidden bg-obsidian-dark"
    >
      {/* Decorative background elements to match theme */}
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <AnimateOnScroll animation="fade-up" className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wider mb-6 bg-primary/10 border border-primary/30 text-primary">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {t('policies.subtitle') || 'Our Commitments'}
          </div>
          <h2 className="text-4xl lg:text-5xl font-extrabold mb-4 text-foreground">
            {t('policies.title')}
          </h2>
          <p className="text-base text-muted-foreground">{t('policies.transparencyPriority')}</p>
        </AnimateOnScroll>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {policies.map((policy, index) => (
            <AnimateOnScroll key={policy.title} animation="fade-up" delay={0.06 * (index + 1)}>
              <Link
                to={policy.link}
                className="block h-full rounded-2xl p-7 group transition-all duration-400 hover:-translate-y-2 cinematic-card glow-crimson-box bg-glass/60 border border-glass-border backdrop-blur-xl relative overflow-hidden"
              >
                {/* Subtle background glow on hover */}
                <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />

                <div className="relative z-10">
                  {/* Icon tile */}
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-primary/10 border border-primary/20">
                    <policy.icon className="w-7 h-7 text-primary" />
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-extrabold mb-2 transition-colors group-hover:text-primary text-foreground">
                    {policy.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm leading-relaxed mb-5 text-muted-foreground">
                    {policy.description}
                  </p>

                  {/* Bullets */}
                  <ul className="space-y-2 mb-6">
                    {policy.bullets.map(bullet => (
                      <li key={bullet} className="text-xs flex items-center gap-2 text-muted-foreground/80">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-primary/70" />
                        {bullet}
                      </li>
                    ))}
                  </ul>

                  {/* Read more */}
                  <div className="flex items-center gap-1.5 text-sm font-bold group-hover:gap-2.5 transition-all text-primary">
                    {t('policies.readMore')} <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PoliciesSection;
