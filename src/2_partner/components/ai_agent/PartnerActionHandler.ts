import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { JarvisHeaderData } from './usePartnerJarvis';
import { usePartnerAuth } from '@/shared/contexts/PartnerAuthContext';

const normalize = (v?: string) => (v || '').trim().toLowerCase();

const ROUTE_MAP: Record<string, string> = {
  // Core pages
  orders: '/dashboard/orders',
  menu: '/dashboard/menu',
  qr: '/dashboard/qr',
  settings: '/dashboard/settings',
  dashboard: '/dashboard',
  home: '/dashboard',
  main: '/dashboard',
  // Orders sub-tabs
  kitchen: '/dashboard/orders?tab=kitchen',
  tables: '/dashboard/orders?tab=tables',
  pos: '/dashboard/orders?tab=pos',
  history: '/dashboard/orders?tab=history',
  // QR Builder aliases (LLM returns free-form)
  'qr builder': '/dashboard/qr',
  'qr code': '/dashboard/qr',
  'qr page': '/dashboard/qr',
  'qr_builder': '/dashboard/qr',
  'pure builder': '/dashboard/qr',
  'qr code generator': '/dashboard/qr',
  // Menu aliases
  'menu page': '/dashboard/menu',
  'menu manager': '/dashboard/menu',
  'menu management': '/dashboard/menu',
  // Settings aliases
  'restaurant settings': '/dashboard/settings',
  'setting': '/dashboard/settings',
  // AI Assistant aliases
  'ai': '/dashboard/ai',
  'ai assistant': '/dashboard/ai',
  'jarvis': '/dashboard/ai',
  'assistant': '/dashboard/ai',
};

function resolveRoute(target: string): string {
  const t = normalize(target);
  // Exact match
  if (ROUTE_MAP[t]) return ROUTE_MAP[t];
  // Fuzzy: check if target contains a key or key contains target
  for (const key of Object.keys(ROUTE_MAP)) {
    if (t.includes(key) || key.includes(t)) return ROUTE_MAP[key];
  }
  return '/dashboard';
}

export const usePartnerActionHandler = () => {
  const navigate = useNavigate();
  const { logout } = usePartnerAuth();

  const executeAction = useCallback(
    (action?: string, target?: string, toolResult?: JarvisHeaderData['tool_result']) => {
      const act = normalize(action);
      const tgt = normalize(target);

      // ── Data query actions — eye-vision handles display, no navigation ─────
      const DATA_ACTIONS = new Set([
        'get_revenue', 'get_summary', 'get_orders', 'get_active_orders',
        'get_chart', 'get_volume', 'get_peak', 'get_top_items',
        'get_insights', 'list_orders', 'show_actions', 'filter_time',
        'get_menu',    // show menu as data card, not navigate
        'get_tables',  // show QR table list as data card
      ]);
      if (DATA_ACTIONS.has(act)) {
        const summary = (toolResult as Record<string, unknown>)?.summary as string | undefined;
        if (summary) toast.message('Jarvis', { description: summary });
        return;
      }

      // ── Menu management — dispatch window events for MenuManager.tsx ─────
      if (act === 'search_menu') {
        const query = (tgt || (toolResult as Record<string, unknown>)?.query as string || '');
        window.dispatchEvent(new CustomEvent('jarvis:menu:search', { detail: { query } }));
        return;
      }

      if (act === 'add_menu_item') {
        const data = (toolResult as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
        if (data?.added) {
          toast.success(`"${data.name}" menu mein add ho gaya! Rs.${data.price}`);
          window.dispatchEvent(new CustomEvent('jarvis:menu:refresh'));
        } else {
          toast.error('Menu item add nahi ho saka');
        }
        return;
      }

      if (act === 'update_menu_by_name' || act === 'rename_item') {
        const data = (toolResult as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
        if (data?.updated) {
          toast.success(`"${data.name}" update ho gaya: ${data.field} → ${data.value}`);
          window.dispatchEvent(new CustomEvent('jarvis:menu:refresh'));
        } else {
          const err = (toolResult as Record<string, unknown>)?.error as string || 'Update fail';
          toast.error(err);
        }
        return;
      }

      if (act === 'toggle_item') {
        const data = (toolResult as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
        if (data?.updated) {
          const status = data.is_available ? 'available' : 'unavailable';
          toast.success(`"${data.name}" ab ${status} hai`);
          window.dispatchEvent(new CustomEvent('jarvis:menu:refresh'));
        }
        return;
      }

      if (act === 'apply_discount') {
        const data = (toolResult as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
        if (data?.updated) {
          toast.success(`"${data.name}" — ${data.discount_pct}% discount: Rs.${data.discounted_price}`);
          window.dispatchEvent(new CustomEvent('jarvis:menu:refresh'));
        }
        return;
      }

      // ── Mutation actions ─────────────────────────────────────────────────
      if (act === 'update_order') {
        const data = (toolResult as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
        const orderId = (data?.order_id as string || '').slice(0, 8);
        const status = data?.new_status as string || tgt;
        toast.success(`Order ${orderId}... → ${status}`);
        navigate('/dashboard/orders');
        return;
      }

      if (act === 'update_menu') {
        const data = (toolResult as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
        toast.success(
          data?.updated ? `Menu updated: ${data.field} = ${data.value}` : 'Menu update failed'
        );
        navigate('/dashboard/menu');
        return;
      }

      if (act === 'update_settings') {
        const data = (toolResult as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
        toast.success(data?.updated ? 'Settings updated' : 'Settings update failed');
        navigate('/dashboard/settings');
        return;
      }

      // ── Navigation actions ───────────────────────────────────────────────
      if (act === 'navigate' || act === 'maps') {
        navigate(resolveRoute(tgt));
        return;
      }

      if (act === 'gen_qr') {
        const tableNo = (toolResult as Record<string, unknown>)?.data
          ? ((toolResult as Record<string, unknown>).data as Record<string, unknown>)?.table_no
          : tgt;
        navigate(`/dashboard/qr${tableNo ? `?table=${tableNo}` : ''}`);
        return;
      }

      // ── Dashboard status toggle ─────────────────────────────────────────
      if (act === 'toggle_status') {
        window.dispatchEvent(new CustomEvent('jarvis:dashboard:toggle-status', {
          detail: { target: tgt } // "online" | "offline"
        }));
        toast.info(tgt === 'offline' ? 'Restaurant offline ho raha hai...' : 'Restaurant online ho raha hai...');
        navigate('/dashboard');
        return;
      }

      // ── QR table management ──────────────────────────────────────────────
      if (act === 'add_table') {
        const tableNo = Number(tgt) || Number((toolResult as Record<string, unknown>)?.table_no);
        window.dispatchEvent(new CustomEvent('jarvis:qr:add-table', { detail: { tableNo } }));
        navigate('/dashboard/qr');
        return;
      }

      if (act === 'delete_table') {
        const tableNo = Number(tgt) || Number((toolResult as Record<string, unknown>)?.table_no);
        window.dispatchEvent(new CustomEvent('jarvis:qr:delete-table', { detail: { tableNo } }));
        navigate('/dashboard/qr');
        return;
      }

      // ── Auth ─────────────────────────────────────────────────────────────
      if (act === 'logout') {
        toast.info('Sign out ho rahe hain...');
        void logout();
        return;
      }
    },
    [navigate, logout]
  );

  return { executeAction };
};
