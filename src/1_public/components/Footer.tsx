// ============================================================
// FILE: Footer.tsx
// PURPOSE: Website footer — Dark Cinematic Theme.
// ============================================================
import { Github, Twitter, Linkedin, Instagram } from 'lucide-react';
import logoIcon from '@/shared/assets/saysavor-icon.png';
import { useLanguage } from '@/shared/contexts/LanguageContext';

const Footer = () => {
  const { t } = useLanguage();

  const footerLinks = {
    [t('footer.product')]: ['Features', 'Pricing', 'API', 'Integrations'],
    [t('footer.company')]: ['About', 'Blog', 'Careers', 'Press'],
    [t('footer.resources')]: ['Documentation', 'Help Center', 'Community', 'Contact'],
    [t('footer.legal')]: ['Privacy', 'Terms', 'Cookies', 'Licenses'],
  };

  const socialLinks = [
    { icon: Twitter, href: '#' },
    { icon: Linkedin, href: '#' },
    { icon: Github, href: '#' },
    { icon: Instagram, href: '#' },
  ];

  return (
    <footer className="bg-background border-t border-primary/20 relative overflow-hidden">

      {/* Crimson top accent */}
      <div className="absolute top-0 left-0 w-full h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(220,20,60,0.5) 30%, rgba(220,20,60,0.8) 50%, rgba(220,20,60,0.5) 70%, transparent)' }} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-primary/20 blur-sm pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 py-16 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">

          {/* Brand */}
          <div className="col-span-2">
            <a href="/" className="flex items-center gap-3 mb-5 group">
              <img src={logoIcon} alt="SaySavor Logo"
                className="w-10 h-10 rounded-xl group-hover:scale-105 transition-transform duration-300 shadow-[0_4px_16px_rgba(220,20,60,0.2)]" />
              <span className="text-xl font-bold text-foreground">
                Say<span className="text-primary">Savor</span>
              </span>
            </a>
            <p className="text-sm mb-7 max-w-xs leading-relaxed text-muted-foreground">
              {t('footer.description')}
            </p>
            <div className="flex gap-3">
              {socialLinks.map(({ icon: Icon, href }, i) => (
                <a key={i} href={href}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 bg-glass/60 border border-glass-border text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-glass/80"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link groups */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-semibold mb-4 text-sm text-foreground">{title}</h4>
              <ul className="space-y-3">
                {links.map(link => (
                  <li key={link}>
                    <a href="#" className="text-sm transition-colors duration-300 text-muted-foreground hover:text-primary">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-glass-border">
          <p className="text-sm text-muted-foreground">{t('footer.copyright')}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{t('footer.madeWith')}</span>
            <span className="text-primary animate-pulse">♥</span>
            <span>{t('footer.forFoodLovers')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;