// ============================================================
// FILE: FloatingFoodBackground.tsx
// SECTION: 1_public > components
// PURPOSE: Landing page ka animated food icons background.
// ============================================================
import { useMemo } from 'react';

const foodEmojis = ['🍔', '🍕', '🍜', '🍣', '🌮', '🍱', '🍩', '☕', '🥗', '🍝', '🧁', '🥘'];

interface FloatingFoodBackgroundProps {
  density?: 'low' | 'medium' | 'high';
  opacity?: number;
}

const FloatingFoodBackground = ({ density = 'medium', opacity = 0.04 }: FloatingFoodBackgroundProps) => {
  const count = density === 'low' ? 8 : density === 'medium' ? 14 : 20;

  const items = useMemo(() => {
    return [...Array(count)].map((_, i) => ({
      emoji: foodEmojis[i % foodEmojis.length],
      left: `${5 + (i * 7) % 90}%`,
      top: `${5 + (i * 11) % 90}%`,
      delay: `${i * 0.8}s`,
      duration: `${15 + (i % 5) * 3}s`,
      size: `${1.5 + (i % 3) * 0.5}rem`,
    }));
  }, [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {items.map((item, i) => (
        <span
          key={i}
          className="absolute animate-float select-none"
          style={{
            left: item.left,
            top: item.top,
            fontSize: item.size,
            opacity: opacity,
            animationDelay: item.delay,
            animationDuration: item.duration,
          }}
        >
          {item.emoji}
        </span>
      ))}
    </div>
  );
};

export default FloatingFoodBackground;
