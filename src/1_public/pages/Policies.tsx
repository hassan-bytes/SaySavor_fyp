// ============================================================
// FILE: Policies.tsx
// SECTION: 1_public > pages
// PURPOSE: Privacy policy aur terms of service (Warm Cream Theme).
// ROUTE: /policies
// ============================================================
import Navbar from '@/1_public/components/Navbar';
import Footer from '@/1_public/components/Footer';
import { Shield, FileText, Cookie, Users } from 'lucide-react';
import { useScrollAnimation } from '@/shared/hooks/useScrollAnimation';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import logoIcon from '@/shared/assets/saysavor-icon.png';

const Policies = () => {
  const { t } = useLanguage();
  const [heroRef, heroVisible] = useScrollAnimation();
  const [contentRef, contentVisible] = useScrollAnimation();
  const [contactRef, contactVisible] = useScrollAnimation();

  const policies = [
    {
      icon: Shield,
      title: t('policies.privacy'),
      lastUpdated: t('policies.december2025'),
      description: t('policies.privacyDesc'),
      sections: [
        { heading: t('policies.infoCollect'), content: t('policies.infoCollectContent') },
        { heading: t('policies.howWeUse'), content: t('policies.howWeUseContent') },
        { heading: t('policies.dataSharing'), content: t('policies.dataSharingContent') },
        { heading: t('policies.yourRights'), content: t('policies.yourRightsContent') },
      ],
    },
    {
      icon: FileText,
      title: t('policies.terms'),
      lastUpdated: t('policies.december2025'),
      description: t('policies.termsDesc'),
      sections: [
        { heading: t('policies.accountResp'), content: t('policies.accountRespContent') },
        { heading: t('policies.serviceUsage'), content: t('policies.serviceUsageContent') },
        { heading: t('policies.orderPolicies'), content: t('policies.orderPoliciesContent') },
        { heading: t('policies.liability'), content: t('policies.liabilityContent') },
      ],
    },
    {
      icon: Cookie,
      title: t('policies.cookies'),
      lastUpdated: t('policies.december2025'),
      description: t('policies.cookiesDesc'),
      sections: [
        { heading: t('policies.essentialCookies'), content: t('policies.essentialCookiesContent') },
        { heading: t('policies.analyticsCookies'), content: t('policies.analyticsCookiesContent') },
        { heading: t('policies.prefCookies'), content: t('policies.prefCookiesContent') },
        { heading: t('policies.managingCookies'), content: t('policies.managingCookiesContent') },
      ],
    },
    {
      icon: Users,
      title: t('policies.partner'),
      lastUpdated: t('policies.december2025'),
      description: t('policies.partnerDesc'),
      sections: [
        { heading: t('policies.qualityStandards'), content: t('policies.qualityStandardsContent') },
        { heading: t('policies.commission'), content: t('policies.commissionContent') },
        { heading: t('policies.orderFulfillment'), content: t('policies.orderFulfillmentContent') },
        { heading: t('policies.supportResources'), content: t('policies.supportResourcesContent') },
      ],
    },
  ];

  return (
    <div className="min-h-screen relative bg-obsidian text-foreground selection:bg-primary/30 selection:text-primary-foreground">
      <Navbar />

      {/* Hero Section */}
      <section ref={heroRef as React.RefObject<HTMLDivElement>} className="pt-32 pb-28 px-6 relative overflow-hidden lens-flare-bg">
        <div className="absolute inset-0 bg-gradient-to-b from-obsidian-dark via-obsidian to-primary/10 opacity-90" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(220,38,38,0.15) 0%, transparent 70%)' }} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Decorative background image */}
        <div className="absolute right-10 top-1/3 w-64 h-64 opacity-20 pointer-events-none rounded-full overflow-hidden blur-[4px] border border-primary/20 rotate-[-15deg] mix-blend-screen hidden lg:block shadow-[0_0_50px_rgba(220,38,38,0.2)]">
          <img src="/burgers_frames/ezgif-frame-001.jpg" alt="Dish preview" className="w-full h-full object-cover" />
        </div>

        <div className={`max-w-4xl mx-auto text-center relative z-10 transition-all duration-700 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full mb-8 font-semibold glow-crimson-box bg-background/50 border border-primary/30 text-primary backdrop-blur-md">
            <span className="w-2 h-2 rounded-full animate-pulse bg-primary shadow-[0_0_8px_rgba(220,38,38,1)]" />
            {t('footer.legal') || 'LEGAL POLICIES'}
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-8 text-foreground tracking-tight leading-tight">
            {t('footer.legal')} <br className="md:hidden" />
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #e74c3c, #f39c12)' }}>
              & {t('nav.policies')}
            </span>
          </h1>
          <p className="text-xl max-w-2xl mx-auto leading-relaxed text-muted-foreground">
            {t('policies.heroDescription')}
          </p>
        </div>
      </section>

      {/* Policies Content */}
      <section ref={contentRef as React.RefObject<HTMLDivElement>} className="py-12 px-6 bg-obsidian-dark relative">
        {/* Decorative elements */}
        <div className="absolute top-1/2 left-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

        <div className={`max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 lg:gap-12 relative z-10 transition-all duration-700 ${contentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>

          {/* Sidebar Navigation (Desktop) */}
          <div className="hidden lg:block lg:w-1/4">
            <div className="sticky top-32 space-y-2 p-6 cinematic-card bg-glass/60 border border-glass-border backdrop-blur-xl rounded-3xl glow-crimson-box shadow-xl">
              <h3 className="text-xl font-extrabold text-foreground mb-4 pb-4 border-b border-glass-border">
                {t('nav.policies')}
              </h3>
              <nav className="flex flex-col gap-2">
                {policies.map((policy, index) => (
                  <a
                    key={index}
                    href={`#policy-${index}`}
                    className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-all duration-300 py-2.5 px-3 rounded-lg hover:bg-primary/10 group"
                  >
                    <policy.icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span className="font-semibold text-sm">{policy.title}</span>
                  </a>
                ))}
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:w-3/4 space-y-16">
            {policies.map((policy, index) => (
              <div
                key={index}
                id={`policy-${index}`}
                className="scroll-mt-32"
              >
                <div className="rounded-3xl p-8 md:p-12 cinematic-card bg-glass/40 border border-glass-border/50 backdrop-blur-xl shadow-lg relative overflow-hidden group transition-all duration-500 hover:border-primary/30 hover:bg-glass/60">
                  {/* Internal Card Decor */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="relative z-10">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8 pb-6 border-b border-glass-border">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 bg-primary/10 border border-primary/20 transition-transform group-hover:scale-110 duration-500 glow-crimson-box shadow-[0_0_15px_rgba(220,38,38,0.2)]">
                        <policy.icon className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-extrabold text-foreground tracking-tight">{policy.title}</h2>
                        <span className="inline-block mt-2 px-3 py-1 rounded-full bg-black/50 border border-white/5 text-xs text-muted-foreground font-medium">
                          {t('policies.lastUpdated')}: {policy.lastUpdated}
                        </span>
                      </div>
                    </div>

                    <p className="mb-10 text-lg leading-relaxed text-muted-foreground/90 font-medium">{policy.description}</p>

                    <div className="grid md:grid-cols-2 gap-6">
                      {policy.sections.map((section, sIndex) => (
                        <div key={sIndex} className="p-6 rounded-2xl bg-black/30 border border-white/5 hover:border-primary/20 transition-colors duration-300">
                          <h3 className="text-lg font-bold mb-3 text-foreground flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                            {section.heading}
                          </h3>
                          <p className="leading-relaxed text-sm text-muted-foreground">{section.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section ref={contactRef as React.RefObject<HTMLDivElement>} className="py-28 px-6 bg-obsidian relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none opacity-50" />

        <div className={`max-w-2xl mx-auto text-center cinematic-card p-12 border border-glass-border bg-glass/80 backdrop-blur-2xl rounded-3xl glow-crimson-box-intense transition-all duration-700 relative z-10 ${contactVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-3xl lg:text-4xl font-extrabold mb-4 text-foreground">{t('policies.contactTitle') || 'Questions?'}</h2>
          <p className="mb-8 text-lg text-muted-foreground">
            {t('policies.contactDescription') || 'Contact our legal team for any inquiries.'}
          </p>
          <a
            href="mailto:legal@saysavor.com"
            className="inline-flex items-center justify-center px-8 py-4 rounded-full font-bold text-white transition-all duration-300 hover:scale-105 bg-primary shadow-[0_0_20px_rgba(220,38,38,0.4)]"
          >
            {t('policies.contactButton') || 'Contact Legal Team'}
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Policies;
