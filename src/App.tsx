// ============================================================
// FILE: App.tsx
// SECTION: Root — App Entry Point
// PURPOSE: Puri app ki routing yahan define hoti hai.
//          Teen qisam ke users hain: Public Visitor, Partner (Restaurant Owner), Customer.
// ============================================================

// --- Shared UI aur Provider imports ---
import { useEffect } from "react";
import Lenis from "lenis";
import { Toaster } from "@/shared/ui/toaster";
import { Toaster as Sonner } from "@/shared/ui/sonner";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/shared/contexts/LanguageContext";
import ScrollToTop from "@/shared/components/ScrollToTop";
import { ProtectedRoute } from "@/shared/components/ProtectedRoute";

// --- 1_public: Landing pages (koi bhi dekh sakta hai) ---
import Index from "@/1_public/pages/Index";
import About from "@/1_public/pages/About";
import Features from "@/1_public/pages/Features";
import HowItWorks from "@/1_public/pages/HowItWorks";
import Policies from "@/1_public/pages/Policies";
import Foodie from "@/1_public/pages/Foodie";
import NotFound from "@/1_public/pages/NotFound";

// --- 2_partner > auth: Partner login/signup ---
import Partner from "@/2_partner/auth/pages/Partner";
import Partner_Auth from "@/2_partner/auth/pages/Partner_Auth";

// --- 2_partner > setup: Pehli baar restaurant setup ---
import RestaurantSetup from "@/2_partner/setup/pages/RestaurantSetup";

// --- 2_partner > dashboard: Roz ka partner dashboard ---
import Partner_Dashboard from "@/2_partner/dashboard/pages/Partner_Dashboard";
import { EnhancedDashboardOverview } from "@/2_partner/dashboard/pages/EnhancedDashboard";
import MenuManager from "@/2_partner/dashboard/pages/MenuManager";
import Orders from "@/2_partner/dashboard/pages/Orders";
import AIAssistant from "@/2_partner/dashboard/pages/AIAssistant";
import QRBuilder from "@/2_partner/dashboard/pages/QRBuilder";
import Settings from "@/2_partner/dashboard/pages/Settings";

// --- 2_partner > customer_menu: Customer QR scan karta hai, yeh page khulta hai ---
import CustomerMenu from "@/2_partner/customer_menu/pages/CustomerMenu";

// --- 3_customer: Foodie / Customer App ---
import CustomerAuth from "@/3_customer/auth/pages/CustomerAuth";
import CustomerHome from "@/3_customer/pages/CustomerHome";
import { CustomerAuthProvider } from "@/3_customer/context/CustomerAuthContext";

const App = () => {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/features" element={<Features />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/policies" element={<Policies />} />
            <Route path="/foodie" element={<Foodie />} />
            <Route path="/partner" element={<Partner />} />
            <Route path="/auth" element={<Partner_Auth />} />

            {/* Public Customer Menu Route */}
            <Route path="/menu/:restaurantId" element={<CustomerMenu />} />

            {/* ── 3_customer: Foodie App Routes ── */}
            <Route
              path="/foodie/*"
              element={
                <CustomerAuthProvider>
                  <Routes>
                    <Route path="auth" element={<CustomerAuth />} />
                    <Route path="home" element={<CustomerHome />} />
                    {/* Phase 3+ routes will be added here */}
                  </Routes>
                </CustomerAuthProvider>
              }
            />

            {/* Protected Routes */}
            <Route
              path="/restaurant-setup"
              element={
                <ProtectedRoute>
                  <RestaurantSetup />
                </ProtectedRoute>
              }
            />

            {/* Partner Dashboard with nested routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requireSetup={true}>
                  <Partner_Dashboard />
                </ProtectedRoute>
              }
            >
              {/* Nested dashboard routes */}
              <Route index element={<EnhancedDashboardOverview />} />
              <Route path="orders" element={<Orders />} />
              <Route path="menu" element={<MenuManager />} />
              <Route path="ai" element={<AIAssistant />} />
              <Route path="qr" element={<QRBuilder />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  );
};

export default App;
