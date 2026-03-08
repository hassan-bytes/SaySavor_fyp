// ============================================================
// FILE: Index.tsx
// SECTION: 1_public > pages
// PURPOSE: Website ka main home page.
//          Yahan visitor pehli baar aata hai aur app ko discover karta hai.
// ROUTE: /
// ============================================================
import { useState } from 'react';
import Navbar from '@/1_public/components/Navbar';
import Hero from '@/1_public/components/Hero';
import Scroll3DSequence from '@/1_public/components/Scroll3DSequence';
import AboutSection from '@/1_public/components/AboutSection';
import FeaturesSection from '@/1_public/components/FeaturesSection';
import HowItWorksSection from '@/1_public/components/HowItWorksSection';
import PersonaGateway from '@/1_public/components/PersonaGateway';
import TestimonialsSection from '@/1_public/components/TestimonialsSection';
import CTASection from '@/1_public/components/CTASection';
import PoliciesSection from '@/1_public/components/PoliciesSection';
import Footer from '@/1_public/components/Footer';

const Index = () => {
  const [orbVariant, setOrbVariant] = useState<'gold' | 'amber' | 'default'>('default');
  const [showParticles, setShowParticles] = useState(false);

  const handlePersonaHover = (type: 'foodie' | 'partner' | null) => {
    if (type === 'foodie') {
      setOrbVariant('amber');
      setShowParticles(false);
    } else if (type === 'partner') {
      setOrbVariant('gold');
      setShowParticles(true);
    } else {
      setOrbVariant('default');
      setShowParticles(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative selection:bg-primary/30 selection:text-primary-foreground">
      <Navbar />
      <Hero orbVariant={orbVariant} showParticles={showParticles} />
      <Scroll3DSequence />
      <AboutSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PersonaGateway onHover={handlePersonaHover} />
      <TestimonialsSection />
      <CTASection />
      <PoliciesSection />
      <Footer />
    </div>
  );
};

export default Index;
