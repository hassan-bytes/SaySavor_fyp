// ============================================================
// FILE: About.tsx
// SECTION: 1_public > pages
// PURPOSE: App ke baare mein information page. (Dark Cinematic Theme)
// ROUTE: /about
// ============================================================
import Navbar from '@/1_public/components/Navbar';
import Footer from '@/1_public/components/Footer';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Target, Eye, Lightbulb, Users, Award, Globe, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useScrollAnimation } from '@/shared/hooks/useScrollAnimation';
import logoIcon from '@/shared/assets/saysavor-icon.png';

const About = () => {
  const { t } = useLanguage();
  const [heroRef, heroVisible] = useScrollAnimation();
  const [valuesRef, valuesVisible] = useScrollAnimation();
  const [statsRef, statsVisible] = useScrollAnimation();
  const [storyRef, storyVisible] = useScrollAnimation();
  const [teamRef, teamVisible] = useScrollAnimation();
  const [ctaRef, ctaVisible] = useScrollAnimation();

  const values = [
    {
      icon: Target,
      title: t('about.mission'),
      description: t('about.missionDesc'),
    },
    {
      icon: Eye,
      title: t('about.vision'),
      description: t('about.visionDesc'),
    },
    {
      icon: Lightbulb,
      title: t('about.innovation'),
      description: t('about.innovationDesc'),
    },
  ];

  const stats = [
    { value: '500K+', label: t('about.statsUsers'), icon: Users },
    { value: '50+', label: t('about.statsCountries'), icon: Globe },
    { value: '20+', label: t('about.statsLangs'), icon: Award },
  ];

  const team = [
    { name: 'Mujeeb ul Hassan', role: 'Project Lead', avatar: '👨‍💼' },
    { name: 'Muhammad Ansar', role: 'Developer', avatar: '👨‍💻' },
    { name: 'Pakeeza Mehboob', role: 'Designer', avatar: '👩‍🎨' },
  ];

  return (
    <div className="min-h-screen bg-background relative selection:bg-primary/30 selection:text-primary-foreground">
      <Navbar />

      {/* Hero Section */}
      <section
        ref={heroRef as React.RefObject<HTMLDivElement>}
        className="pt-32 pb-20 px-6 relative overflow-hidden lens-flare-bg"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-obsidian-dark via-background to-obsidian opacity-80" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(192,57,43,0.15) 0%, transparent 70%)' }} />

        <div className={`relative z-10 max-w-4xl mx-auto text-center transition-all duration-700 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 font-semibold glow-crimson-box bg-background/50 border border-primary/20 text-primary backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-primary" style={{ boxShadow: '0 0 8px var(--primary)' }} />
            {t('nav.about')} SaySavor
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-extrabold mb-6 leading-tight text-foreground">
            {t('about.heroTitle1')}<br />
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #e74c3c, #f39c12)' }}>
              {t('about.heroTitle2')}
            </span>
          </h1>
          <p className="text-xl max-w-2xl mx-auto leading-relaxed text-muted-foreground">
            {t('about.heroDesc')}
          </p>
        </div>
      </section>

      {/* Values Section */}
      <section ref={valuesRef as React.RefObject<HTMLDivElement>} className="py-20 px-6 relative">
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <div
                key={value.title}
                className={`rounded-2xl p-8 text-center group transition-all duration-500 hover:-translate-y-2 cinematic-card bg-glass/40 backdrop-blur-xl border border-glass-border/50 ${valuesVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ transitionDelay: `${index * 150}ms` }}
                onMouseEnter={e => {
                  e.currentTarget.classList.add('glow-crimson-box-intense', 'border-primary/40', 'bg-glass/80');
                }}
                onMouseLeave={e => {
                  e.currentTarget.classList.remove('glow-crimson-box-intense', 'border-primary/40', 'bg-glass/80');
                }}
              >
                <div className="mx-auto mb-6 w-16 h-16 rounded-2xl flex items-center justify-center glow-crimson-box transition-transform group-hover:scale-110 bg-primary/10 border border-primary/20">
                  <value.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-extrabold mb-3 group-hover:text-primary transition-colors text-foreground">{value.title}</h3>
                <p className="leading-relaxed text-sm text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section ref={statsRef as React.RefObject<HTMLDivElement>} className="py-20 px-6 relative overflow-hidden bg-obsidian-dark/50">
        <div className={`relative z-10 max-w-5xl mx-auto transition-all duration-700 ${statsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="rounded-3xl p-8 md:p-14 cinematic-card bg-glass/60 border border-glass-border backdrop-blur-xl glow-crimson-box">
            <div className="grid md:grid-cols-3 gap-10">
              {stats.map((stat, index) => (
                <div
                  key={stat.label}
                  className="text-center group"
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <stat.icon className="w-8 h-8 group-hover:scale-110 transition-transform text-primary" />
                    <span className="text-5xl font-extrabold text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #e74c3c, #f39c12)' }}>{stat.value}</span>
                  </div>
                  <p className="font-semibold tracking-wide uppercase text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section ref={storyRef as React.RefObject<HTMLDivElement>} className="py-28 px-6 lens-flare-bg relative">
        <div className={`max-w-4xl mx-auto relative z-10 transition-all duration-700 ${storyVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-4xl md:text-5xl font-extrabold text-center mb-12 text-foreground">
            {t('about.storyTitle')}
          </h2>

          <div className="space-y-8 text-lg leading-relaxed cinematic-card p-10 rounded-3xl bg-glass/40 border border-glass-border/50 text-muted-foreground backdrop-blur-lg">
            <p>{t('about.storyP1')}</p>
            <p>{t('about.storyP2')}</p>
            <p className="font-semibold text-foreground">{t('about.storyP3')}</p>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section ref={teamRef as React.RefObject<HTMLDivElement>} className="py-28 px-6 relative bg-obsidian/30">
        <div className="max-w-6xl mx-auto relative z-10">
          <h2 className={`text-4xl md:text-5xl font-extrabold text-center mb-16 transition-all duration-700 ${teamVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'} text-foreground`}>
            {t('about.meetTeam')} <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #e74c3c, #f39c12)' }}>{t('about.team')}</span>
          </h2>

          <div className="grid sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {team.map((member, index) => (
              <div
                key={member.name}
                className={`rounded-2xl p-8 text-center group transition-all duration-500 hover:-translate-y-2 cinematic-card bg-glass/40 border border-glass-border/50 backdrop-blur-lg ${teamVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ transitionDelay: `${index * 100}ms` }}
                onMouseEnter={e => {
                  e.currentTarget.classList.add('glow-crimson-box-intense', 'border-primary/40', 'bg-glass/80');
                }}
                onMouseLeave={e => {
                  e.currentTarget.classList.remove('glow-crimson-box-intense', 'border-primary/40', 'bg-glass/80');
                }}
              >
                <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center text-4xl group-hover:scale-110 transition-transform glow-crimson-box bg-primary/10 border border-primary/20">
                  {member.avatar}
                </div>
                <h3 className="font-extrabold text-lg group-hover:text-primary transition-colors text-foreground">{member.name}</h3>
                <p className="font-semibold text-sm mt-1 text-primary">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section ref={ctaRef as React.RefObject<HTMLDivElement>} className="py-28 px-6 lens-flare-bg relative bg-obsidian-dark/80">
        <div className={`max-w-3xl mx-auto text-center relative z-10 transition-all duration-700 ${ctaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-4xl lg:text-5xl font-extrabold mb-6 leading-tight text-foreground">{t('about.readyToJoin')}</h2>
          <p className="text-lg leading-relaxed mb-10 text-muted-foreground">
            {t('about.ctaDesc')}
          </p>
          <div className="flex flex-col sm:flex-row gap-5 justify-center">
            <Link
              to="/foodie"
              className="group inline-flex items-center justify-center gap-2.5 px-9 py-4 rounded-full font-bold text-base text-white transition-all duration-300 hover:scale-105 glow-crimson-box-intense"
              style={{ background: 'linear-gradient(135deg, #c0392b 0%, #e74c3c 100%)' }}
            >
              {t('about.startFoodie')} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/partner"
              className="inline-flex items-center justify-center gap-2.5 px-9 py-4 rounded-full font-bold text-base transition-all duration-300 hover:scale-105 cinematic-card glow-crimson-box bg-glass/60 border border-primary/30 text-primary hover:bg-glass hover:text-primary-foreground"
              onMouseEnter={e => {
                e.currentTarget.classList.add('glow-crimson-box-intense');
              }}
              onMouseLeave={e => {
                e.currentTarget.classList.remove('glow-crimson-box-intense');
              }}
            >
              {t('nav.partner')}
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
