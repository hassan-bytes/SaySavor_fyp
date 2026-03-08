// ============================================================
// FILE: Scroll3DSequence.tsx
// PURPOSE: 3D Image Sequence Animation on Scroll based on Apple-style
//          using GSAP ScrollTrigger and HTML5 Canvas.
// ============================================================
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLanguage } from '@/shared/contexts/LanguageContext';

gsap.registerPlugin(ScrollTrigger);

const Scroll3DSequence = () => {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Refs for animated text blocks
  const text1Ref = useRef<HTMLDivElement>(null);
  const text2Ref = useRef<HTMLDivElement>(null);
  const text3Ref = useRef<HTMLDivElement>(null);
  const text4Ref = useRef<HTMLDivElement>(null);

  const [imagesPreloaded, setImagesPreloaded] = useState(false);
  const imagesRef = useRef<HTMLImageElement[]>([]);

  const frameCount = 231;

  // Format index to 3 digits, e.g., 001, 012, 123
  const currentFrame = (index: number) =>
    `/burgers_frames/ezgif-frame-${index.toString().padStart(3, '0')}.jpg`;

  useEffect(() => {
    // Preload images
    let loadedCount = 0;
    const images: HTMLImageElement[] = [];

    for (let i = 1; i <= frameCount; i++) {
      const img = new Image();
      img.src = currentFrame(i);
      img.onload = () => {
        loadedCount++;
        if (loadedCount === frameCount) {
          imagesRef.current = images;
          setImagesPreloaded(true);
        }
      };
      // Important to push to the right index to maintain order
      images.push(img);
    }
  }, []);

  useEffect(() => {
    if (!imagesPreloaded || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    const images = imagesRef.current;

    // Draw frame on canvas with object-contain like scaling logic
    const render = (index: number) => {
      const img = images[index];
      if (!img) return;

      // Clear canvas before drawing
      context.clearRect(0, 0, canvas.width, canvas.height);

      // Calculate object-contain dimensions to preserve aspect ratio
      const canvasRatio = canvas.width / canvas.height;
      const imgRatio = img.width / img.height;

      let renderWidth = canvas.width;
      let renderHeight = canvas.height;
      let offsetX = 0;
      let offsetY = 0;

      if (canvasRatio < imgRatio) {
        // Image is wider than canvas relative to height
        renderHeight = canvas.width / imgRatio;
        offsetY = (canvas.height - renderHeight) / 2;
      } else {
        // Image is taller than canvas relative to width
        renderWidth = canvas.height * imgRatio;
        offsetX = (canvas.width - renderWidth) / 2;
      }

      context.drawImage(img, offsetX, offsetY, renderWidth, renderHeight);
    };

    // Draw first frame initially
    render(0);

    const playhead = { frame: 0 };

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top top',
        end: '+=6000', // Extended for ultra-smooth buttery animation
        scrub: 2,      // Higher scrub for Apple-like inertia
        pin: true,
        anticipatePin: 1,
      }
    });

    // 1. Image Sequence Animation (Total timeline duration = 100)
    tl.to(playhead, {
      frame: frameCount - 1,
      snap: 'frame',
      ease: 'none',
      duration: 100,
      onUpdate: () => render(playhead.frame),
    }, 0);

    // 2. Text Animations synced to the 100 duration scale

    // Text 1 (Already visible initially, fades out)
    tl.to(text1Ref.current, { opacity: 0, y: -50, duration: 10, ease: 'power2.inOut' }, 10);

    // Text 2 (Fades in, then fades out)
    tl.fromTo(text2Ref.current,
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 10, ease: 'power2.out' },
      25
    );
    tl.to(text2Ref.current, { opacity: 0, y: -50, duration: 10, ease: 'power2.in' }, 45);

    // Text 3 (Fades in, then fades out)
    tl.fromTo(text3Ref.current,
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 10, ease: 'power2.out' },
      55
    );
    tl.to(text3Ref.current, { opacity: 0, y: -50, duration: 10, ease: 'power2.in' }, 75);

    // Text 4 (Fades in and stays past 85)
    tl.fromTo(text4Ref.current,
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 10, ease: 'power2.out' },
      85
    );

    return () => {
      // Cleanup scroll trigger and timeline
      if (tl.scrollTrigger) {
        tl.scrollTrigger.kill();
      }
      tl.kill();
    };
  }, [imagesPreloaded]);

  return (
    <section
      ref={containerRef}
      className="relative w-full h-screen bg-black overflow-hidden flex justify-center items-center"
    >
      {/* Loading state indicator */}
      {!imagesPreloaded && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm">
          <div className="w-10 h-10 rounded-full border-t-2 border-r-2 border-primary animate-spin mb-4" />
          <p className="text-primary text-sm tracking-wider uppercase font-semibold">Loading 3D Experience...</p>
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={1920}
        height={1080}
        className="w-full h-screen object-contain"
      />

      {/* Cinematic Vignette Overlays to blend with the dark theme */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)] pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-background to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      {/* Multiple scrolling text sections */}
      <div className="absolute inset-0 max-w-7xl mx-auto px-6 pointer-events-none flex flex-col justify-center">

        {/* Text Area 1 */}
        <div ref={text1Ref} className="absolute right-12 lg:right-24 top-1/2 -translate-y-1/2 max-w-sm text-right opacity-90">
          <div className="inline-block px-4 py-1.5 rounded-full mb-4 font-semibold glow-crimson-box bg-background/50 border border-primary/30 text-primary backdrop-blur-md">
            {t('scroll.step1Title')}
          </div>
          <h3 className="text-4xl lg:text-5xl font-extrabold text-foreground mb-4 drop-shadow-2xl">{t('scroll.step1Heading')}</h3>
          <p className="text-xl text-muted-foreground ml-auto drop-shadow-lg font-medium">{t('scroll.step1Desc')}</p>
        </div>

        {/* Text Area 2 */}
        <div ref={text2Ref} className="absolute left-12 lg:left-24 top-1/2 -translate-y-1/2 max-w-sm text-left opacity-0">
          <div className="inline-block px-4 py-1.5 rounded-full mb-4 font-semibold border border-amber-500/30 text-amber-500 bg-black/40 backdrop-blur-md shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            {t('scroll.step2Title')}
          </div>
          <h3 className="text-4xl lg:text-5xl font-extrabold text-white mb-4 drop-shadow-2xl">{t('scroll.step2Heading')}</h3>
          <p className="text-xl text-white/80 drop-shadow-lg font-medium">{t('scroll.step2Desc')}</p>
        </div>

        {/* Text Area 3 */}
        <div ref={text3Ref} className="absolute right-12 lg:right-24 top-1/2 -translate-y-1/2 max-w-sm text-right opacity-0">
          <div className="inline-block px-4 py-1.5 rounded-full mb-4 font-semibold border border-gold/30 text-gold bg-black/40 backdrop-blur-md shadow-[0_0_15px_rgba(251,191,36,0.2)]">
            {t('scroll.step3Title')}
          </div>
          <h3 className="text-4xl lg:text-5xl font-extrabold text-white mb-4 drop-shadow-2xl">{t('scroll.step3Heading')}</h3>
          <p className="text-xl text-white/80 ml-auto drop-shadow-lg font-medium">{t('scroll.step3Desc')}</p>
        </div>

        {/* Text Area 4 */}
        <div ref={text4Ref} className="absolute inset-x-0 bottom-24 text-center opacity-0 max-w-2xl mx-auto">
          <h3 className="text-5xl lg:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-500 mb-6 drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]">
            {t('scroll.step4Heading')}
          </h3>
          <p className="text-2xl text-white/90 drop-shadow-lg font-medium">{t('scroll.step4Desc')}</p>
        </div>

      </div>
    </section>
  );
};

export default Scroll3DSequence;
