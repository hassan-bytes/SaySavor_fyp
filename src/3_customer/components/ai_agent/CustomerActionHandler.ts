import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCart } from '@/3_customer/context/CartContext';
import type { CustomerJarvisData } from './useCustomerJarvis';

const normalize = (v?: string) => (v || '').trim().toLowerCase();

const CUSTOMER_ROUTE_MAP: Record<string, string> = {
  home: '/foodie/home',
  cart: '/foodie/cart',
  profile: '/foodie/profile',
  checkout: '/foodie/checkout',
  auth: '/foodie/auth',
  orders: '/foodie/profile',
};

function resolveCustomerRoute(target: string): string {
  return CUSTOMER_ROUTE_MAP[normalize(target)] || '/foodie/home';
}

export const useCustomerActionHandler = () => {
  const navigate = useNavigate();
  const { addToCart, removeFromCart, updateQuantity } = useCart();

  const executeAction = useCallback(
    (action?: string, target?: string, toolResult?: CustomerJarvisData['tool_result']) => {
      const act = normalize(action);
      const tgt = normalize(target);
      const data = (toolResult as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
      const signal = (toolResult as Record<string, unknown>)?.signal as string | undefined;
      const navigateTo = data?.navigate_to as string | undefined;

      // ── Cart mutations (frontend executes via CartContext) ────────────────
      if (act === 'add_cart') {
        if (data?.error) {
          toast.error((data.error as string) || 'Item menu mein nahi mila');
          return;
        }
        const itemName = (data?.item_name as string) || (data?.name as string) || '';
        if (itemName) {
          addToCart({
            menuItem: {
              id: (data?.item_id as string) || '',
              name: itemName,
              price: Number(data?.price) || 0,
              category: (data?.category as string) || '',
              restaurant_id: (data?.restaurant_id as string) || '',
            },
            quantity: Number(data?.qty) || 1,
            selectedVariant: null,
            selectedModifiers: [],
          });
          toast.success(`${itemName} cart mein add ho gaya!`);
        }
        return;
      }

      if (act === 'remove_cart') {
        const index = Number(data?.index ?? 0);
        removeFromCart(index);
        toast.info(`Item cart se remove ho gaya`);
        return;
      }

      if (act === 'update_cart') {
        const index = Number(data?.index ?? 0);
        const qty = Number(data?.qty ?? 1);
        updateQuantity(index, qty);
        toast.info(`Cart updated`);
        return;
      }

      // ── Promo code ────────────────────────────────────────────────────────
      if (act === 'promo_code') {
        if (data?.promo) {
          const promo = data.promo as Record<string, unknown>;
          toast.success(`Promo "${promo.code}" valid! ${promo.discount_value} off`);
        } else {
          toast.error(`Promo code valid nahi hai`);
        }
        navigate('/foodie/checkout');
        return;
      }

      // ── Navigation with data ──────────────────────────────────────────────
      if (navigateTo) {
        navigate(navigateTo);
        return;
      }

      // ── Pure signal navigation ────────────────────────────────────────────
      if (signal === 'NAVIGATE' || act === 'navigate') {
        navigate(resolveCustomerRoute(tgt));
        return;
      }

      if (act === 'auth') {
        navigate('/foodie/auth');
        return;
      }

      if (act === 'stripe_pay') {
        navigate('/foodie/checkout?payment=stripe');
        return;
      }

      if (act === 'place_order') {
        navigate('/foodie/checkout');
        return;
      }

      if (act === 'view_cart' || act === 'cart_total') {
        navigate('/foodie/cart');
        return;
      }

      if (act === 'order_status' || act === 'order_history') {
        if (navigateTo) navigate(navigateTo);
        else navigate('/foodie/profile');
        return;
      }

      if (act === 'nearby' || act === 'search') {
        const q = (tgt || '').trim();
        const sort = data?.sort as string | undefined;
        const freeDelivery = data?.free_delivery as boolean | undefined;
        const params = new URLSearchParams();
        if (q) params.set('q', q);
        if (sort) params.set('sort', sort);
        if (freeDelivery) params.set('delivery', 'free');
        const qs = params.toString();
        navigate(qs ? `/foodie/home?${qs}` : '/foodie/home');
        return;
      }

      // ── SEARCH_MENU: update search bar + navigate with optional filters ────
      if (act === 'search_menu') {
        const q = (data?.query as string) || tgt;
        const rid = (data?.restaurant_id as string) || '';
        const maxPrice = data?.max_price as number | undefined;
        const sort = data?.sort as string | undefined;
        const freeDelivery = data?.free_delivery as boolean | undefined;

        if (q) {
          window.dispatchEvent(
            new CustomEvent('jarvis:customer:search', { detail: { query: q, restaurant_id: rid } })
          );
        }
        if (navigateTo) {
          navigate(navigateTo);
        } else if (rid) {
          navigate(`/foodie/restaurant/${rid}?search=${encodeURIComponent(q || '')}`);
        } else {
          const params = new URLSearchParams();
          if (q) params.set('q', q);
          if (maxPrice) params.set('maxprice', String(maxPrice));
          if (sort) params.set('sort', sort);
          if (freeDelivery) params.set('delivery', 'free');
          const qs = params.toString();
          navigate(qs ? `/foodie/home?${qs}` : '/foodie/home');
        }
        return;
      }

      // ── GET_DEALS / SHOW_DEALS ────────────────────────────────────────────
      if (act === 'get_deals' || act === 'show_deals') {
        const summary = (toolResult as Record<string, unknown>)?.summary as string | undefined;
        if (summary) toast.message('Best Deals', { description: summary });
        if (navigateTo) navigate(navigateTo);
        return;
      }

      // ── BUDGET_SUGGEST: show suggestions + filter home page ──────────────
      if (act === 'budget_suggest') {
        const summary = (toolResult as Record<string, unknown>)?.summary as string | undefined;
        if (summary) toast.message('Budget Suggestions', { description: summary });
        const budget = data?.budget as number | undefined;
        const budgetQuery = data?.query as string | undefined;
        if (budget) {
          const params = new URLSearchParams();
          if (budgetQuery) params.set('q', budgetQuery);
          params.set('maxprice', String(budget));
          navigate(`/foodie/home?${params.toString()}`);
        }
        return;
      }

      // ── Data-only actions (toast only, no nav) ────────────────────────────
      if (act === 'promotions' || act === 'get_menu') {
        const summary = (toolResult as Record<string, unknown>)?.summary as string | undefined;
        if (summary) toast.message('Jarvis', { description: summary });
        if (navigateTo) navigate(navigateTo);
        return;
      }
    },
    [navigate, addToCart, removeFromCart, updateQuantity]
  );

  return { executeAction };
};
