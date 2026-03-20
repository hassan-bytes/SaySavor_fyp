import type { ReactNode } from 'react';

interface SectionCardProps {
  title: string;
  description: string;
  children: ReactNode;
}

export const SectionCard = ({ title, description, children }: SectionCardProps) => {
  return (
    <section className="order-glass-panel rounded-3xl border border-white/10 p-6 md:p-8 shadow-2xl">
      <header className="mb-6">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm text-slate-300">{description}</p>
      </header>
      {children}
    </section>
  );
};
