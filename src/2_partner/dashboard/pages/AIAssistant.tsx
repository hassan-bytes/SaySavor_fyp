import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
  Mic, Square, Loader2, Sparkles, Radio, TrendingUp,
  ShoppingBag, Clock, Star, List, Zap, AlertCircle,
  Settings, Globe, User2, ChevronDown, ChevronUp,
  BarChart2, Package, Bell,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/shared/lib/supabaseClient';
import { usePartnerJarvis } from '@/2_partner/components/ai_agent/usePartnerJarvis';
import { usePartnerActionHandler } from '@/2_partner/components/ai_agent/PartnerActionHandler';
import { useRestaurant } from '@/shared/contexts/RestaurantContext';
import { usePartnerAuth } from '@/shared/contexts/PartnerAuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────
interface HistoryEntry {
  id: string;
  reply: string;
  action: string;
  toolResult?: Record<string, unknown>;
  ts: string;
}

// ── Eye-vision: rich data cards ───────────────────────────────────────────────
function DataCard({ action, data }: { action: string; data: Record<string, unknown> }) {
  const act = action.toUpperCase();
  const inner = (data.data as Record<string, unknown>) || {};

  if (act === 'GET_REVENUE' || act === 'GET_SUMMARY') {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {inner.today_revenue !== undefined && (
          <Stat icon={<TrendingUp className="h-4 w-4" />} label="Revenue" value={`Rs. ${inner.today_revenue}`} color="amber" />
        )}
        {inner.revenue !== undefined && (
          <Stat icon={<TrendingUp className="h-4 w-4" />} label="Revenue" value={`Rs. ${inner.revenue}`} color="amber" />
        )}
        {(inner.today_orders ?? inner.total_orders) !== undefined && (
          <Stat icon={<ShoppingBag className="h-4 w-4" />} label="Orders" value={String(inner.today_orders ?? inner.total_orders)} color="blue" />
        )}
        {inner.active_orders !== undefined && (
          <Stat icon={<Clock className="h-4 w-4" />} label="Active" value={String(inner.active_orders)} color="green" />
        )}
        {inner.pending_orders !== undefined && (
          <Stat icon={<Clock className="h-4 w-4" />} label="Pending" value={String(inner.pending_orders)} color="orange" />
        )}
        {inner.top_item && (
          <Stat icon={<Star className="h-4 w-4" />} label="Top Item" value={String(inner.top_item)} color="amber" />
        )}
      </div>
    );
  }

  if (act === 'GET_TOP_ITEMS') {
    const items = (inner.top_items as Array<{ name: string; count: number }>) || [];
    return (
      <ul className="space-y-1">
        {items.slice(0, 8).map((item, i) => (
          <li key={i} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-1.5 text-sm">
            <span className="flex items-center gap-2">
              <span className="text-amber-400 font-bold text-xs">#{i + 1}</span>
              {item.name}
            </span>
            <span className="text-amber-300 font-semibold">{item.count}x</span>
          </li>
        ))}
      </ul>
    );
  }

  if (act === 'GET_ACTIVE_ORDERS' || act === 'LIST_ORDERS' || act === 'GET_ORDERS') {
    const orders = (inner.orders as Array<Record<string, unknown>>) || [];
    if (!orders.length) return <p className="text-sm text-slate-400">Koi active order nahi hai.</p>;
    return (
      <ul className="space-y-1 max-h-56 overflow-y-auto pr-1">
        {orders.slice(0, 15).map((o, i) => (
          <li key={i} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-1.5 text-xs gap-2">
            <span className="text-slate-300 font-mono">#{(o.id as string || '').slice(0, 8)}</span>
            <span className="text-slate-400">Table {(o.table_number ?? o.table_no) as string || '?'}</span>
            <StatusBadge status={o.status as string} />
            <span className="text-amber-300 font-semibold">Rs.{(o.total_amount ?? o.total) as number}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (act === 'GET_PEAK') {
    const hours = (inner.peak_hours as Array<{ hour: string; orders: number }>) || [];
    const max = hours[0]?.orders || 1;
    return (
      <ul className="space-y-1.5">
        {hours.slice(0, 8).map((h, i) => (
          <li key={i} className="flex items-center gap-3 text-sm">
            <BarChart2 className="h-3 w-3 text-amber-400 shrink-0" />
            <span className="text-slate-300 w-16 shrink-0">{h.hour}</span>
            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${Math.min(100, (h.orders / max) * 100)}%` }} />
            </div>
            <span className="text-slate-400 text-xs w-16 text-right">{h.orders} orders</span>
          </li>
        ))}
      </ul>
    );
  }

  if (act === 'GET_MENU') {
    const items = (inner.menu_items as Array<Record<string, unknown>>) || [];
    if (!items.length) return <p className="text-sm text-slate-400">Menu items nahi mile.</p>;
    return (
      <ul className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
        {items.slice(0, 16).map((item, i) => (
          <li key={i} className="rounded-lg bg-white/5 px-3 py-2 text-xs border border-white/5">
            <p className="font-medium text-slate-200 truncate">{item.name as string}</p>
            <p className="text-amber-300 mt-0.5">Rs. {item.price as number}</p>
            {item.category && <p className="text-slate-500 text-[10px]">{item.category as string}</p>}
          </li>
        ))}
      </ul>
    );
  }

  if (act === 'SHOW_ACTIONS') {
    const cmds = (inner.commands as string[]) || [];
    return (
      <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {cmds.map((cmd, i) => (
          <li key={i} className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-300">{cmd}</li>
        ))}
      </ul>
    );
  }

  if (act === 'GET_CHART' || act === 'GET_VOLUME') {
    const trend = (inner.trend as Array<{ date: string; value: number }>) || [];
    const max = Math.max(...trend.map(t => t.value), 1);
    return (
      <div className="flex items-end gap-1 h-24">
        {trend.map((t, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full bg-amber-400/70 rounded-t" style={{ height: `${Math.max(4, (t.value / max) * 80)}px` }} />
            <span className="text-[9px] text-slate-500 rotate-45 origin-left">{t.date?.slice(5)}</span>
          </div>
        ))}
      </div>
    );
  }

  if (act === 'GET_INSIGHTS') {
    return (
      <div className="grid grid-cols-2 gap-3">
        {inner.repeat_customer_pct !== undefined && (
          <Stat icon={<User2 className="h-4 w-4" />} label="Repeat Customers" value={`${inner.repeat_customer_pct}%`} color="green" />
        )}
        {inner.avg_order_value !== undefined && (
          <Stat icon={<Package className="h-4 w-4" />} label="Avg Order" value={`Rs. ${inner.avg_order_value}`} color="blue" />
        )}
      </div>
    );
  }

  if (act === 'GET_TABLES') {
    const tables = (inner.tables as number[]) || [];
    return (
      <div>
        <p className="text-xs text-slate-400 mb-2">{tables.length} tables registered</p>
        <div className="flex flex-wrap gap-2">
          {tables.map((t) => (
            <span key={t} className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-sm font-semibold text-amber-200">
              Table {t}
            </span>
          ))}
          {tables.length === 0 && <p className="text-sm text-slate-400">Koi table register nahi hai.</p>}
        </div>
      </div>
    );
  }

  const summary = data.summary as string | undefined;
  if (summary) return <p className="text-sm text-slate-300">{summary}</p>;
  return <pre className="text-xs text-slate-400 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>;
}

function Stat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    amber:  'border-amber-400/30 bg-amber-500/10 text-amber-300',
    blue:   'border-blue-400/30 bg-blue-500/10 text-blue-300',
    green:  'border-green-400/30 bg-green-500/10 text-green-300',
    orange: 'border-orange-400/30 bg-orange-500/10 text-orange-300',
  };
  return (
    <div className={`rounded-xl border p-3 ${colorMap[color] || colorMap.amber}`}>
      <div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs opacity-70">{label}</span></div>
      <p className="text-base font-bold leading-tight">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:   'bg-yellow-500/20 text-yellow-300',
    cooking:   'bg-orange-500/20 text-orange-300',
    ready:     'bg-blue-500/20 text-blue-300',
    completed: 'bg-green-500/20 text-green-300',
    cancelled: 'bg-red-500/20 text-red-300',
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${map[status] || 'bg-white/10 text-slate-300'}`}>
      {status}
    </span>
  );
}

// ── Settings panel ────────────────────────────────────────────────────────────
interface JarvisSettings {
  lang: 'auto' | 'ur' | 'en';
  gender: 'auto' | 'male' | 'female';
}

function SettingsPanel({ settings, onChange }: { settings: JarvisSettings; onChange: (s: JarvisSettings) => void }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/40 p-5 text-white backdrop-blur-md">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2">
        <Settings className="h-3 w-3" /> Jarvis Settings
      </p>

      {/* Language */}
      <div className="mb-4">
        <p className="text-xs text-slate-400 mb-2 flex items-center gap-1.5"><Globe className="h-3 w-3" /> Zuban (Language)</p>
        <div className="flex gap-2">
          {(['auto', 'ur', 'en'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => onChange({ ...settings, lang: l })}
              className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition ${
                settings.lang === l
                  ? 'border-amber-400/60 bg-amber-500/20 text-amber-200'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {l === 'auto' ? 'Auto' : l === 'ur' ? 'اردو Urdu' : 'English'}
            </button>
          ))}
        </div>
      </div>

      {/* Gender / Voice */}
      <div>
        <p className="text-xs text-slate-400 mb-2 flex items-center gap-1.5"><User2 className="h-3 w-3" /> Awaaz (Voice)</p>
        <div className="flex gap-2">
          {(['auto', 'female', 'male'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => onChange({ ...settings, gender: g })}
              className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition ${
                settings.gender === g
                  ? 'border-amber-400/60 bg-amber-500/20 text-amber-200'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {g === 'auto' ? 'Auto' : g === 'female' ? 'Female' : 'Male'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Suggested commands ────────────────────────────────────────────────────────
const COMMANDS = [
  'Aaj ki revenue batao',
  'Active orders dikhao',
  'Top selling dishes batao',
  'Peak hours kab hain?',
  'Mera menu dikhao',
  'Orders list dikhao',
  'Table 5 ka QR banao',
  'Aaj ka summary batao',
  'Customer insights batao',
  'Orders page jao',
  'Menu page pe jao',
  'Quick actions batao',
];

// Actions whose executeAction calls navigate() — must be deferred until audio ends
// so the component doesn't unmount mid-playback.
const NAVIGATING_ACTIONS = new Set([
  'navigate', 'maps', 'gen_qr', 'update_order', 'update_menu', 'update_settings',
  'toggle_status', 'add_table', 'delete_table',
]);
type PendingAct = { action: string; target: string; toolResult?: Record<string, unknown> };

// ── Main Component ────────────────────────────────────────────────────────────
export default function AIAssistant() {
  const { restaurantId } = useRestaurant();
  const { profile } = usePartnerAuth();

  const [settings, setSettings] = useState<JarvisSettings>({ lang: 'auto', gender: 'auto' });
  const [showSettings, setShowSettings] = useState(false);

  const {
    isRecording, isProcessing, isAutoMode, isPlayingAudio,
    transcript, error, lastData,
    startRecording, stopRecording, toggleAutoMode,
  } = usePartnerJarvis({
    restaurantId,
    preferredLang: settings.lang,
    preferredGender: settings.gender,
  });

  const { executeAction } = usePartnerActionHandler();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const handledActionRef = useRef<string | null>(null);
  const pendingNavActionsRef = useRef<PendingAct[]>([]);

  // Build a stable key from actions array (or legacy action field) for dedup
  const currentActionKey = useMemo(() => {
    if (!lastData) return null;
    if (lastData.actions?.length) {
      return `${lastData.actions.map((a) => a.action).join(',')}:${lastData.reply?.slice(0, 20) || ''}:${Date.now()}`;
    }
    if (!lastData.action && !lastData.target) return null;
    return `${lastData.action || ''}:${lastData.target || ''}:${Date.now()}`;
  }, [lastData]);

  useEffect(() => {
    if (!lastData || !currentActionKey) return;
    if (handledActionRef.current === currentActionKey) return;
    handledActionRef.current = currentActionKey;

    // Multi-intent: build action list
    const actions = lastData.actions?.length
      ? lastData.actions
      : lastData.action
      ? [{ action: lastData.action, target: lastData.target || '', params: lastData.params, tool_result: lastData.tool_result }]
      : [];

    // Split: data/event actions run immediately; nav actions deferred until audio ends
    const navPending: PendingAct[] = [];
    for (const act of actions) {
      if (NAVIGATING_ACTIONS.has(act.action.toLowerCase())) {
        navPending.push({ action: act.action, target: act.target, toolResult: act.tool_result ?? lastData.tool_result });
      } else {
        executeAction(act.action, act.target, act.tool_result ?? lastData.tool_result);
      }
    }
    pendingNavActionsRef.current = navPending;

    // For history display: show the action that has real data, or the first one
    const primaryAct = actions.find((a) => a.tool_result) ?? actions[0];

    if (lastData.reply) {
      setHistory((prev) => [
        {
          id: currentActionKey,
          reply: lastData.reply || '',
          action: primaryAct?.action || 'NONE',
          toolResult: primaryAct?.tool_result ?? lastData.tool_result,
          ts: new Date().toLocaleTimeString('ur-PK', { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev.slice(0, 9),
      ]);
    }
  }, [currentActionKey, executeAction, lastData]);

  // Execute deferred nav actions once audio has finished playing
  useEffect(() => {
    if (!isPlayingAudio && pendingNavActionsRef.current.length > 0) {
      const pending = pendingNavActionsRef.current;
      pendingNavActionsRef.current = [];
      for (const act of pending) {
        executeAction(act.action, act.target, act.toolResult);
      }
    }
  }, [isPlayingAudio, executeAction]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  // ── Proactive order alerts: Jarvis speaks when a new order arrives ─────────
  const speakAlert = useCallback(async (text: string, lang = 'ur', gender = 'female') => {
    try {
      const fd = new FormData();
      fd.append('text', text);
      fd.append('lang', lang);
      fd.append('gender', gender);
      const res = await axios.post<ArrayBuffer>(`${import.meta.env.VITE_JARVIS_URL ?? 'http://localhost:8001'}/speak`, fd, {
        responseType: 'arraybuffer',
      });
      if (res.data.byteLength > 0) {
        const blob = new Blob([res.data], { type: 'audio/mpeg' });
        const url  = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => URL.revokeObjectURL(url);
        void audio.play().catch(() => URL.revokeObjectURL(url));
      }
    } catch {
      // Non-critical — alerts are optional
    }
  }, []);

  const lastNotifiedOrderId = useRef<string | null>(null);

  useEffect(() => {
    if (!restaurantId) return;

    // Listen for INSERT events on the orders table (new orders only — not status updates)
    const channel = supabase
      .channel(`jarvis-orders-${restaurantId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
        (payload) => {
          const order = payload.new as { id?: string; table_no?: string | number };
          if (!order.id || order.id === lastNotifiedOrderId.current) return;
          lastNotifiedOrderId.current = order.id;
          const tableNo = order.table_no ?? 'نامعلوم';
          void speakAlert(`نیا آرڈر آیا۔ ٹیبل نمبر ${tableNo}۔`);
          toast.info(`New order — Table ${tableNo}`, { icon: '🔔' });
        }
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [restaurantId, speakAlert]);

  const handleMic = async () => {
    if (isProcessing || isAutoMode) return;
    if (isRecording) { stopRecording(); return; }
    await startRecording();
  };

  const statusText = isAutoMode
    ? isProcessing ? 'Jawab de raha hai...' : isRecording ? 'Sun raha hai...' : 'Auto mode — baat karein...'
    : isProcessing ? 'Soch raha hai...'
    : isRecording ? 'Sun raha hai — bolo...'
    : 'Ready — mic dabayein ya Auto mode chalayein';

  return (
    <div className="space-y-5">
      {/* ── Header card ── */}
      <div className="rounded-3xl border border-white/10 bg-black/40 p-6 text-white backdrop-blur-md">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-300">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Jarvis Commander</h1>
              <p className="text-xs text-slate-400">
                {profile?.full_name ? `${profile.full_name} ka assistant` : 'Voice-powered dashboard AI'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Order alert indicator */}
            {restaurantId && (
              <span className="flex items-center gap-1 rounded-xl border border-green-400/30 bg-green-500/10 px-2.5 py-1.5 text-xs text-green-300">
                <Bell className="h-3 w-3" />
                Alerts ON
              </span>
            )}

            {/* Settings toggle */}
            <button
              type="button"
              onClick={() => setShowSettings((s) => !s)}
              className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-slate-300 hover:bg-white/10 transition"
            >
              <Settings className="h-4 w-4" />
              {showSettings ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            {/* Auto-mode toggle */}
            <button
              type="button"
              onClick={toggleAutoMode}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                isAutoMode
                  ? 'border-green-400/50 bg-green-500/20 text-green-300 animate-pulse'
                  : 'border-white/20 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Radio className="h-4 w-4" />
              {isAutoMode ? 'Auto ON' : 'Auto OFF'}
            </button>
          </div>
        </div>

        {/* Status bar */}
        <div className={`mt-4 rounded-2xl border px-4 py-2 text-sm ${
          isRecording  ? 'border-red-400/30 bg-red-500/10 text-red-200' :
          isProcessing ? 'border-amber-400/30 bg-amber-500/10 text-amber-200' :
          isAutoMode   ? 'border-green-400/30 bg-green-500/10 text-green-200' :
                         'border-white/10 bg-white/5 text-slate-300'
        }`}>
          {isRecording  && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-red-400 animate-pulse" />}
          {isProcessing && <Loader2 className="mr-2 inline-block h-3 w-3 animate-spin" />}
          {statusText}
          {transcript && !isRecording && (
            <span className="ml-3 text-xs text-slate-500 italic">"{transcript}"</span>
          )}
        </div>

        {/* Active settings pill */}
        {(settings.lang !== 'auto' || settings.gender !== 'auto') && (
          <div className="mt-2 flex gap-2">
            {settings.lang !== 'auto' && (
              <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] text-amber-300">
                {settings.lang === 'ur' ? '🇵🇰 Urdu' : '🇬🇧 English'}
              </span>
            )}
            {settings.gender !== 'auto' && (
              <span className="rounded-full border border-blue-400/30 bg-blue-500/10 px-2.5 py-0.5 text-[10px] text-blue-300">
                {settings.gender === 'female' ? 'Female Voice' : 'Male Voice'}
              </span>
            )}
          </div>
        )}

        {/* Manual mic button */}
        {!isAutoMode && (
          <button
            type="button"
            onClick={handleMic}
            disabled={isProcessing}
            className={`mt-4 inline-flex items-center gap-2 rounded-xl border px-5 py-3 font-semibold transition disabled:opacity-50 ${
              isRecording
                ? 'border-red-400/50 bg-red-500/20 text-red-200 hover:bg-red-500/30'
                : 'border-amber-300/30 bg-amber-400/10 text-amber-100 hover:bg-amber-400/20'
            }`}
          >
            {isProcessing
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : isRecording
              ? <Square className="h-4 w-4 text-red-400" />
              : <Mic className="h-4 w-4" />}
            {isProcessing ? 'Processing...' : isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>
        )}
      </div>

      {/* ── Settings panel (collapsible) ── */}
      {showSettings && <SettingsPanel settings={settings} onChange={setSettings} />}

      {/* ── Eye-Vision: conversation history + data cards ── */}
      {history.length > 0 && (
        <div className="rounded-3xl border border-white/10 bg-black/40 p-5 text-white backdrop-blur-md space-y-4">
          <p className="text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <Zap className="h-3 w-3 text-amber-400" /> Live Results
          </p>

          {history.map((entry) => (
            <div key={entry.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-slate-200 flex-1">{entry.reply}</p>
                <span className="text-[10px] text-slate-500 whitespace-nowrap">{entry.ts}</span>
              </div>
              {entry.toolResult && (
                <div className="border-t border-white/10 pt-3">
                  <DataCard action={entry.action} data={entry.toolResult} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Suggested commands ── */}
      <div className="rounded-3xl border border-white/10 bg-black/40 p-5 text-white backdrop-blur-md">
        <p className="mb-3 text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <List className="h-3 w-3" /> Suggested Commands
        </p>
        <ul className="grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
          {COMMANDS.map((cmd) => (
            <li
              key={cmd}
              className="cursor-default rounded-xl border border-white/10 bg-black/30 px-3 py-2 hover:border-amber-400/30 hover:bg-amber-400/5 transition"
            >
              "{cmd}"
            </li>
          ))}
        </ul>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-300 flex items-center gap-3">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
