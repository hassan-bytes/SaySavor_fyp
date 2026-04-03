// ============================================================
// FILE: App.tsx
// SECTION: Root — App Entry Point
// PURPOSE: Defines routing for the entire app.
//          Supports three user groups: Public Visitor, Partner (Restaurant Owner), and Customer.
// ============================================================

// --- Shared UI and provider imports ---
import { useEffect } from "react";
import Lenis from "lenis";
import { Toaster } from "@/shared/ui/toaster";
import { Toaster as Sonner } from "@/shared/ui/sonner";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from "@/shared/contexts/LanguageContext";
import ScrollToTop from "@/shared/components/ScrollToTop";
import { ProtectedRoute } from "@/shared/components/ProtectedRoute";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import { PartnerAuthProvider, usePartnerAuth } from "@/shared/contexts/PartnerAuthContext";
import LoadingSpinner from "@/shared/components/LoadingSpinner";

// --- 1_public: Landing pages (accessible to everyone) ---
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

// --- 2_partner > setup: First-time restaurant setup ---
import RestaurantSetup from "@/2_partner/setup/pages/RestaurantSetup";

// --- 2_partner > dashboard: Partner dashboard ---
import Partner_Dashboard from "@/2_partner/dashboard/pages/Partner_Dashboard";
import { EnhancedDashboardOverview } from "@/2_partner/dashboard/pages/EnhancedDashboard";
import MenuManager from "@/2_partner/dashboard/pages/MenuManager";
import UnifiedOrdersManager from '@/2_partner/dashboard/pages/UnifiedOrdersManager';
import AIAssistant from "@/2_partner/dashboard/pages/AIAssistant";
import QRBuilder from "@/2_partner/dashboard/pages/QRBuilder";
import Settings from "@/2_partner/dashboard/settings";

// --- 2_partner > customer_menu: Customer QR scan karta hai, yeh page khulta hai ---
import CustomerMenu from "@/2_partner/customer_menu/pages/CustomerMenu";

// --- 3_customer: Foodie / Customer App ---
import CustomerAuth from "@/3_customer/auth/pages/CustomerAuth";
import CustomerHome from "@/3_customer/pages/CustomerHome";
import RestaurantDetail from "@/3_customer/pages/RestaurantDetail";
import CartPage from "@/3_customer/pages/Cart";
import CheckoutPage from "@/3_customer/pages/Checkout";
import OrderTracker from "@/3_customer/pages/OrderTracker";
import CustomerProfile from "@/3_customer/pages/CustomerProfile";
import { CustomerAuthProvider, useCustomerAuth } from "@/3_customer/context/CustomerAuthContext";
import { CartProvider } from "@/3_customer/context/CartContext";
import PaymentSuccess from '@/3_customer/pages/PaymentSuccess';
import PartnerOrders from '@/2_partner/pages/PartnerOrders';
import { RestaurantProvider, useRestaurant } from "@/shared/contexts/RestaurantContext";

const PartnerOrdersInner = () => {
    const { restaurantId, isLoading } = useRestaurant();

    if (isLoading || !restaurantId) {
      return (
        <div className="min-h-screen bg-[#0d0500] flex items-center justify-center">
          <div className="text-white/40 text-sm">Loading orders...</div>
        </div>
      );
    }

    return <PartnerOrders restaurantId={restaurantId || ''} />;
};

const PartnerOrdersWithId = () => (
  <RestaurantProvider>
    <PartnerOrdersInner />
  </RestaurantProvider>
);

const RequireCustomerSession: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userId, isLoading } = useCustomerAuth();

  if (isLoading) {
    return <LoadingSpinner message="Restoring foodie session..." />;
  }

  if (!userId) {
    return <Navigate to="/foodie/auth" replace />;
  }

  return <>{children}</>;
};

/**
 * AppContent - Inner component that uses auth context
 * Separated to allow usePartnerAuth hook to work
 */
const AppContent = () => {
  const { loadingInitial } = usePartnerAuth();

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

  // Show loading spinner during initial session restoration
  // Prevents flash of unauthenticated content
  if (loadingInitial) {
    return <LoadingSpinner message="Restoring session..." />;
  }

  return (
    <ErrorBoundary>
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
                  <CartProvider>
                    <Routes>
                      <Route path="auth" element={<CustomerAuth />} />
                      <Route path="home" element={<RequireCustomerSession><CustomerHome /></RequireCustomerSession>} />
                      <Route path="restaurant/:id" element={<RequireCustomerSession><RestaurantDetail /></RequireCustomerSession>} />
                      <Route path="cart" element={<RequireCustomerSession><CartPage /></RequireCustomerSession>} />
                      <Route path="checkout" element={<RequireCustomerSession><CheckoutPage /></RequireCustomerSession>} />
                      <Route path="track/:id" element={<RequireCustomerSession><OrderTracker /></RequireCustomerSession>} />
                      <Route path="profile" element={<RequireCustomerSession><CustomerProfile /></RequireCustomerSession>} />
                      <Route path="payment-success" element={<RequireCustomerSession><PaymentSuccess /></RequireCustomerSession>} />
                      {/* Phase 6+ routes will be added here */}
                    </Routes>
                  </CartProvider>
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

            {/* ── LIVE KITCHEN DASHBOARD ── */}
            <Route
              path="/partner/orders"
              element={<Navigate to="/dashboard/orders" replace />}
            />

            <Route
              path="/partner/pos"
              element={<Navigate to="/dashboard/orders" replace />}
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
              <Route path="orders" element={<UnifiedOrdersManager />} />
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
    </ErrorBoundary>
  );
};

/**
 * App - Root component with PartnerAuthProvider
 * 
 * CRITICAL: PartnerAuthProvider MUST wrap entire app
 * This ensures session restoration happens before any routing
 */
const App = () => {
  return (
    <PartnerAuthProvider>
      <AppContent />
    </PartnerAuthProvider>
  );
};

export default App;
