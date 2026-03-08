// ============================================================
// FILE: StatsBar.tsx
// SECTION: 1_public > components
// PURPOSE: Numbers / stats bar â€” restaurants count, orders, etc.
// ============================================================
import { useEffect, useState } from 'react';
import { Users, Store, Star } from 'lucide-react';

interface StatItemProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  delay: number;
}

const StatItem = ({ icon, value, label, delay }: StatItemProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div 
      className={`flex flex-col items-center gap-2 transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gold/10 text-gold">
          {icon}
        </div>
        <span className="text-2xl md:text-3xl font-bold text-gold-gradient">{value}</span>
      </div>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
};

const StatsBar = () => {
  return (
    <div className="glass-card py-6 px-8 mt-12">
      <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
        <StatItem
          icon={<Users className="w-5 h-5" />}
          value="500K+"
          label="Active Users"
          delay={200}
        />
        <div className="hidden md:block w-px h-12 bg-border" />
        <StatItem
          icon={<Store className="w-5 h-5" />}
          value="10K+"
          label="Restaurants"
          delay={400}
        />
        <div className="hidden md:block w-px h-12 bg-border" />
        <StatItem
          icon={<Star className="w-5 h-5" />}
          value="4.9★"
          label="User Rating"
          delay={600}
        />
      </div>
    </div>
  );
};

export default StatsBar;
