// ============================================================
// Hero.tsx — Sci-Fi Cinematic 3D Food Background
// ============================================================
import { useEffect, useRef } from 'react';
import { Mic as MicIcon, Play as PlayIcon } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';

// ── Local public folder base ──────────────────────────────────
const SB = '/cuisines';

// ── 18 curated food items — best looking across all cuisines ──
const FOOD_ITEMS = [
  // FAR layer (8 items)
  { path: 'Desi/Rice/chicken-biryani.jpg', layer: 'far', w: 130, h: 130 },
  { path: 'Desi/DESERTS/gulab-jamun.jpg', layer: 'far', w: 115, h: 115 },
  { path: 'Desi/Karahi/chicken-karahi.jpg', layer: 'far', w: 125, h: 125 },
  { path: 'Desi/Specials/nihari.jpg', layer: 'far', w: 110, h: 110 },
  { path: 'Italian/Classic Pizzas/margherita.jpg', layer: 'far', w: 120, h: 120 },
  { path: 'Chinese/Main/kung-pao-chicken.jpg', layer: 'far', w: 118, h: 118 },
  { path: 'Fast Food/Fries/loaded-fries.jpg', layer: 'far', w: 108, h: 108 },
  { path: 'Japanese/Sushi/california-roll.jpg', layer: 'far', w: 112, h: 112 },

  // MID layer (5 items)
  { path: 'Fast Food/Burgers/zinger-burger.jpg', layer: 'mid', w: 180, h: 180 },
  { path: 'Fast Food/Pizzas/pepperoni-pizza.jpg', layer: 'mid', w: 190, h: 190 },
  { path: 'Desi/BBQ/chicken-tikka.jpg', layer: 'mid', w: 175, h: 175 },
  { path: 'Desi/Specials/lahori-chargha.jpg', layer: 'mid', w: 165, h: 165 },
  { path: 'Italian/Gourmet Pastas/spaghetti-carbonara.jpg', layer: 'mid', w: 170, h: 170 },

  // NEAR layer (5 items)
  { path: 'Desi/BBQ/tandoori-masala-lamb-chops.jpg', layer: 'near', w: 240, h: 240 },
  { path: 'Fast Food/Burgers/smash-burgers-with-special-sauce.jpg', layer: 'near', w: 255, h: 255 },
  { path: 'Desi/Rice/chicken-biryani.jpg', layer: 'near', w: 230, h: 230 },
  { path: 'Fast Food/Pizzas/chicken-tikka-pizza.jpg', layer: 'near', w: 245, h: 245 },
  { path: 'Japanese/Main/chicken-teriyaki.jpg', layer: 'near', w: 235, h: 235 },
];

const POSITIONS = [
  // FAR
  { x: '3%', y: '5%' }, { x: '85%', y: '6%' }, { x: '65%', y: '72%' }, { x: '14%', y: '74%' },
  { x: '48%', y: '4%' }, { x: '92%', y: '40%' }, { x: '28%', y: '82%' }, { x: '72%', y: '55%' },
  // MID
  { x: '1%', y: '35%' }, { x: '78%', y: '28%' }, { x: '55%', y: '68%' }, { x: '33%', y: '12%' },
  { x: '89%', y: '62%' },
  // NEAR
  { x: '3%', y: '55%' }, { x: '74%', y: '50%' }, { x: '42%', y: '76%' }, { x: '60%', y: '14%' },
  { x: '18%', y: '42%' },
];

const ANIM_PARAMS = [
  // FAR
  { dur: 16, delay: '-2s', rot: -7, yAmp: 8, xAmp: 4 },
  { dur: 18, delay: '-6s', rot: 5, yAmp: 7, xAmp: 3 },
  { dur: 20, delay: '-10s', rot: -4, yAmp: 8, xAmp: 4 },
  { dur: 15, delay: '-3s', rot: 8, yAmp: 6, xAmp: 3 },
  { dur: 17, delay: '-8s', rot: 3, yAmp: 7, xAmp: 4 },
  { dur: 19, delay: '-1s', rot: -6, yAmp: 8, xAmp: 3 },
  { dur: 14, delay: '-5s', rot: 4, yAmp: 6, xAmp: 4 },
  { dur: 22, delay: '-12s', rot: -3, yAmp: 7, xAmp: 3 },
  // MID
  { dur: 11, delay: '-1s', rot: -5, yAmp: 13, xAmp: 6 },
  { dur: 13, delay: '-4s', rot: 6, yAmp: 12, xAmp: 5 },
  { dur: 12, delay: '-7s', rot: -3, yAmp: 12, xAmp: 6 },
  { dur: 10, delay: '-9s', rot: 4, yAmp: 11, xAmp: 5 },
  { dur: 14, delay: '-2s', rot: -5, yAmp: 13, xAmp: 6 },
  // NEAR
  { dur: 8, delay: '0s', rot: -3, yAmp: 18, xAmp: 8 },
  { dur: 9, delay: '-3s', rot: 4, yAmp: 18, xAmp: 9 },
  { dur: 7, delay: '-1.5s', rot: -4, yAmp: 16, xAmp: 7 },
  { dur: 10, delay: '-5s', rot: 3, yAmp: 17, xAmp: 8 },
  { dur: 8, delay: '-2.5s', rot: -5, yAmp: 18, xAmp: 9 },
];

const LAYER_STYLES = {
  far: { opacity: 0.35, blur: 3.5, saturate: 1.3, brightness: 0.8 },
  mid: { opacity: 0.50, blur: 1.5, saturate: 1.4, brightness: 0.9 },
  near: { opacity: 0.70, blur: 0, saturate: 1.5, brightness: 1.0 },
};

const PARALLAX_SPEED = { far: 0.04, mid: 0.10, near: 0.20 };

const CinematicFoodBg = () => {
  const farRef = useRef<HTMLDivElement>(null);
  const midRef = useRef<HTMLDivElement>(null);
  const nearRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    let lastY = -1;
    const tick = () => {
      const y = window.scrollY;
      if (y !== lastY) {
        lastY = y;
        if (farRef.current) farRef.current.style.transform = `translateY(${-y * PARALLAX_SPEED.far}px) translateZ(0)`;
        if (midRef.current) midRef.current.style.transform = `translateY(${-y * PARALLAX_SPEED.mid}px) translateZ(0)`;
        if (nearRef.current) nearRef.current.style.transform = `translateY(${-y * PARALLAX_SPEED.near}px) translateZ(0)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    FOOD_ITEMS.forEach(item => {
      const img = new Image();
      img.src = `${SB}/${item.path}`;
    });
  }, []);

  const layerRefs = { far: farRef, mid: midRef, near: nearRef };
  const layers = ['far', 'mid', 'near'] as const;

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ pointerEvents: 'none', userSelect: 'none', zIndex: 0 }}>
      {layers.map(layer => (
        <div key={layer} ref={layerRefs[layer]} style={{ position: 'absolute', inset: 0, willChange: 'transform', transform: 'translateZ(0)' }}>
          {FOOD_ITEMS.map((item, idx) => {
            if (item.layer !== layer) return null;
            const pos = POSITIONS[idx];
            const anim = ANIM_PARAMS[idx];
            const style = LAYER_STYLES[layer];
            const animName = `cf${idx}`;
            return (
              <div key={idx}>
                <style>{`
                  @keyframes ${animName} {
                    0%   { transform: translate(0px,0px) rotate(${anim.rot}deg) scale(1); }
                    25%  { transform: translate(${anim.xAmp}px,-${anim.yAmp}px) rotate(${anim.rot + 1.5}deg) scale(1.025); }
                    50%  { transform: translate(-${anim.xAmp * .6}px,-${anim.yAmp * 1.5}px) rotate(${anim.rot - 1}deg) scale(1.015); }
                    75%  { transform: translate(-${anim.xAmp}px,-${anim.yAmp * .7}px) rotate(${anim.rot + .8}deg) scale(1.02); }
                    100% { transform: translate(0px,0px) rotate(${anim.rot}deg) scale(1); }
                  }
                `}</style>
                <div style={{
                  position: 'absolute', left: pos.x, top: pos.y, width: `${item.w}px`, height: `${item.h}px`,
                  borderRadius: layer === 'near' ? '22px' : layer === 'mid' ? '17px' : '13px',
                  overflow: 'hidden', opacity: style.opacity,
                  filter: `blur(${style.blur}px) saturate(${style.saturate}) brightness(${style.brightness})`,
                  animation: `${animName} ${anim.dur}s ease-in-out ${anim.delay} infinite`,
                  willChange: 'transform',
                  boxShadow: layer === 'near' ? '0 28px 70px rgba(0,0,0,0.8), 0 8px 24px rgba(220,20,60,0.15)' : layer === 'mid' ? '0 18px 45px rgba(0,0,0,0.6)' : '0 10px 24px rgba(0,0,0,0.4)',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}>
                  <img src={`${SB}/${item.path}`} alt="" loading="eager" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.07) translateZ(0)', display: 'block' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(255,255,255,0.1) 0%,transparent 55%)', pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%', background: 'linear-gradient(to top,rgba(0,0,0,0.6),transparent)', pointerEvents: 'none' }} />
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* Dark overlay — 75% for readable text */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10, background: 'linear-gradient(160deg,rgba(15,8,8,0.7) 0%,rgba(10,5,5,0.8) 50%,rgba(5,2,2,0.85) 100%)' }} />

      {/* Cinematic radial vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 11, background: 'radial-gradient(ellipse at center, transparent 30%, rgba(220,20,60,0.05) 100%)' }} />
    </div>
  );
};

// ── Dark Cinematic Orb ─────────────────────────────────────────
const WarmOrb = () => {
  const { t } = useLanguage();

  return (
    <div className="relative w-[300px] h-[300px] md:w-[380px] md:h-[380px] flex items-center justify-center select-none">
      <style>{`
      @keyframes wPulse { 0%{transform:scale(1);opacity:.35} 100%{transform:scale(1.25);opacity:0} }
      @keyframes wBar   { 0%,100%{height:14%} 50%{height:84%} }
      @keyframes wFloat { 0%{transform:translateY(0)} 100%{transform:translateY(-14px)} }
      .wo{animation:wFloat 3.5s ease-in-out infinite alternate}
      .wp1{animation:wPulse 2.4s ease-out 0s infinite}
      .wp2{animation:wPulse 2.4s ease-out .8s infinite}
      ${[...Array(12)].map((_, i) => `.wb${i + 1}{animation:wBar .9s ${(i * .07).toFixed(2)}s ease-in-out infinite alternate}`).join('')}
    `}</style>
      <div className="wp1 absolute inset-0 rounded-full border border-primary/20" />
      <div className="wp2 absolute inset-8 rounded-full border border-primary/10" />
      <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle,rgba(220,20,60,.14) 0%,transparent 70%)' }} />
      <div className="wo relative w-[185px] h-[185px] md:w-[225px] md:h-[225px] rounded-full flex items-center justify-center bg-obsidian-light border border-primary/30"
        style={{
          boxShadow: '0 0 70px 24px rgba(220,20,60,.18),0 22px 65px rgba(0,0,0,.5),inset 0 2px 20px rgba(220,20,60,.3)',
        }}>
        <div className="absolute top-4 left-7 w-14 h-8 rounded-full blur-md bg-white/10" />
        <div className="relative z-10 flex items-center gap-[3px] h-12">
          {[...Array(12)].map((_, i) => (
            <div key={i} className={`wb${i + 1} bg-gradient-to-t from-primary to-orange-500`} style={{ width: '3px', borderRadius: '9999px', minHeight: '4px', height: '14%' }} />
          ))}
        </div>
      </div>
      {/* Voice pill */}
      <div className="absolute bottom-[17%] right-[-20%] flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold shadow-2xl bg-glass border border-primary/20 text-foreground backdrop-blur-md">
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
        {t('hero.demoVoicePill')}
      </div>
    </div>
  );
};

// ── HERO ──────────────────────────────────────────────────────
interface HeroProps {
  orbVariant?: 'gold' | 'amber' | 'default';
  showParticles?: boolean;
}

const Hero = ({ orbVariant = 'default', showParticles = false }: HeroProps) => {
  const { t } = useLanguage();

  return (
    <section className="relative min-h-screen flex items-center px-6 pt-24 pb-16 overflow-hidden bg-background">
      <style>{`
        @keyframes heroFadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes cShimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        .hh1{animation:heroFadeUp .55s .05s ease both}
        .hh2{animation:heroFadeUp .55s .18s ease both}
        .hh3{animation:heroFadeUp .55s .30s ease both}
        .hh4{animation:heroFadeUp .55s .42s ease both}
      `}</style>

      {/* ══ CINEMATIC 3D FOOD BACKGROUND ══ */}
      <CinematicFoodBg />

      {/* ══ CONTENT ══ */}
      <div className="relative max-w-7xl mx-auto w-full" style={{ zIndex: 20 }}>
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-6 items-center">

          {/* LEFT */}
          <div className="text-left order-2 lg:order-1">
            <div className="hh1 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold mb-8 tracking-wider bg-background/50 border border-primary/30 text-primary backdrop-blur-md shadow-lg shadow-primary/10">
              <span>✦</span><span>{t('hero.badgeText')}</span><span>★★★★★</span>
            </div>

            <h1 className="hh2 text-5xl md:text-6xl lg:text-[4.2rem] font-extrabold mb-6 leading-[1.04] tracking-tight text-foreground">
              {t('hero.headlineMain1')}
              <br />
              <span
                className="text-transparent bg-clip-text"
                style={{
                  backgroundImage: 'linear-gradient(90deg, #e74c3c 0%, #f39c12 40%, #ffffff 50%, #f39c12 60%, #e74c3c 100%)',
                  backgroundSize: '200% auto',
                  animation: 'cShimmer 3.5s linear infinite'
                }}
              >
                {t('hero.headlineMain2')}
              </span>
            </h1>

            <p className="hh3 text-base md:text-lg max-w-md mb-10 leading-relaxed text-muted-foreground">
              {t('hero.subheadline')}
            </p>

            <div className="hh4 flex items-center gap-4 flex-wrap">
              <button className="group inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full font-bold text-base text-white transition-all duration-300 hover:scale-105 active:scale-95 bg-gradient-to-br from-primary to-orange-600 shadow-lg shadow-primary/20">
                <MicIcon className="w-4 h-4" /><span>{t('hero.tryVoice')}</span>
              </button>
              <button className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full font-bold text-base transition-all duration-300 hover:scale-105 active:scale-95 bg-glass/60 border border-primary/30 text-foreground backdrop-blur-md hover:bg-glass hover:text-primary">
                <div className="w-6 h-6 rounded-full flex items-center justify-center bg-primary/20">
                  <PlayIcon className="w-3 h-3 text-primary fill-current" />
                </div>
                {t('hero.watchDemo')}
              </button>
            </div>

            <div className="hh4 mt-6 flex flex-wrap items-center gap-4 text-xs font-semibold text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />{t('hero.liveOrdering')}
              </span>
              <span className="w-1 h-1 rounded-full bg-primary/50" />
              <span>{t('hero.voicePowered')}</span>
              <span className="w-1 h-1 rounded-full bg-primary/50" />
              <span>{t('hero.instantQR')}</span>
            </div>
          </div>

          {/* RIGHT — orb */}
          <div className="flex justify-center lg:justify-end order-1 lg:order-2">
            <WarmOrb />
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 inset-x-0 h-24 pointer-events-none bg-gradient-to-t from-background to-transparent z-20" />

      {/* Scroll indicator */}
      <div className="absolute bottom-7 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce z-20 text-muted-foreground">
        <span className="text-xs tracking-[.22em] uppercase font-semibold">{t('hero.scroll')}</span>
        <div className="w-px h-5 bg-gradient-to-b from-muted-foreground to-transparent" />
      </div>
    </section>
  );
};

export default Hero;
