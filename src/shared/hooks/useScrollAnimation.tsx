// ============================================================
// FILE: useScrollAnimation.tsx  — Cinematic Sci-Fi Upgrade
// PURPOSE: GPU-accelerated scroll reveal — IntersectionObserver
//          based, exponential ease, stagger support.
//          .sr .sr-up/.sr-left/.sr-right/.sr-scale/.sr-fade
//          → .in class added when element crosses threshold.
// ============================================================
import { useEffect, useRef, useState, MutableRefObject, useCallback } from 'react';

interface UseScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export const useScrollAnimation = (options: UseScrollAnimationOptions = {}): [MutableRefObject<HTMLDivElement | null>, boolean] => {
  const { threshold = 0.12, rootMargin = '0px 0px -40px 0px', triggerOnce = false } = options;
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        if (triggerOnce && entry.isIntersecting) {
          observer.unobserve(element);
        }
      },
      { threshold, rootMargin }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  return [ref, isVisible];
};

// ── Global cinematic scroll-reveal initialiser ────────────────
// Attach this once at app root to activate all .sr elements
export const useCinematicReveal = () => {
  useEffect(() => {
    const EL = document.querySelectorAll('.sr');
    if (!EL.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            // keep revealed — unobserve for performance
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.10, rootMargin: '0px 0px -30px 0px' }
    );

    EL.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);
};

// ── AnimateOnScroll wrapper component ─────────────────────────
interface AnimateOnScrollProps {
  children: React.ReactNode;
  className?: string;
  animation?: 'fade-up' | 'fade-left' | 'fade-right' | 'scale' | 'fade';
  delay?: number;
  duration?: number;
}

export const AnimateOnScroll = ({
  children,
  className = '',
  animation = 'fade-up',
  delay = 0,
  duration = 0.72
}: AnimateOnScrollProps) => {
  const [ref, isVisible] = useScrollAnimation();

  // Map to our new CSS system — use inline style approach for precision
  const hiddenStyles: React.CSSProperties = {
    opacity: 0,
    transform: animation === 'fade-up' ? 'translateY(40px) scale(0.97)'
      : animation === 'fade-left' ? 'translateX(-44px)'
        : animation === 'fade-right' ? 'translateX(44px)'
          : animation === 'scale' ? 'scale(0.88)'
            : 'none',
    willChange: 'transform, opacity',
  };

  const visibleStyles: React.CSSProperties = {
    opacity: 1,
    transform: 'translateY(0) translateX(0) scale(1)',
    willChange: 'auto',
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...(isVisible ? visibleStyles : hiddenStyles),
        transitionProperty: 'opacity, transform',
        transitionDuration: `${duration}s`,
        transitionDelay: `${delay}s`,
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {children}
    </div>
  );
};
