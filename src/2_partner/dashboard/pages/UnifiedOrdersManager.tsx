import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, BellRing, RefreshCw, Package, Volume2, VolumeX,
  Plus, Trash2, AlertTriangle, Clock, Phone, MapPin,
  CheckCircle2, Bike, XCircle, ChevronDown, Loader2,
  Search, Filter, TrendingUp, CreditCard, Wallet,
  ChevronLeft, ChevronRight, Settings, TableProperties,
  Utensils, ShoppingBag, Receipt, PlusCircle, Users
} from 'lucide-react';
import { supabase } from '@/shared/lib/supabaseClient';
import { toast } from 'sonner';
import { soundManager } from '@/shared/services/soundManager';
import { useRestaurant } from '@/shared/contexts/RestaurantContext';
import { useOutletContext } from 'react-router-dom';
import { useNotificationManager } from '../components/NotificationManager';
import { setupOrderRealtimeListener } from '../services/orderRealtimeService';
import { getTableSessions, type TableSession } from '../services/tableSessionService';
import { TabErrorBoundary } from '@/shared/components/TabErrorBoundary';
import { 
  Order, 
  OrderItem, 
  ORDER_STATUS, 
  normalizeStatus,
  isActiveOrder 
} from '@/shared/types/orderTypes';
import { ORDER_WITH_ITEMS_SELECT } from '@/shared/constants/querySelects';

// Child Components
import KitchenTab from '../components/orders/KitchenTab';
import TableMapTab from '../components/orders/TableMapTab';
import POSTab from '../components/orders/POSTab';
import HistoryTab from '../components/orders/HistoryTab';

// ── Types ──────────────────────────────────────────────────
// Using Order and OrderItem from @/shared/types/orderTypes

type MainTab = 'kitchen' | 'tables' | 'pos' | 'history';

const UnifiedOrdersManager = () => {
  const { restaurantId } = useOutletContext<any>();
  const { currencySymbol } = useRestaurant();
  const [activeTab, setActiveTab] = useState<MainTab>('kitchen');
  
  // Orders State
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [tableSessions, setTableSessions] = useState<TableSession[]>([]);
  const [restaurantTables, setRestaurantTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const notifiedOrderIdsRef = useRef<Set<string>>(new Set());
  const audioUnlockedRef = useRef(false);
  const notificationManagerRef = useRef<any>(null);

  const [selectedTable, setSelectedTable] = useState('');

  // REQUEST BROWSER NOTIFICATION PERMISSION & SETUP AUDIO UNLOCK ON FIRST INTERACTION
  useEffect(() => {
    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        console.log('🌐 Browser notification permission:', permission);
      });
    }

    // Unlock audio on first user interaction (to bypass autoplay policy)
    const unlockAudio = () => {
      if (!audioUnlockedRef.current) {
        soundManager.unlockAudio();
        audioUnlockedRef.current = true;
        console.log('🔓 Audio unlocked on first user interaction');
        // Remove listener after first interaction
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
      }
    };

    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);

    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Smart Notification Manager - memoized to prevent infinite resubscriptions
  const notificationConfig = useMemo(() => ({
    onOrdersReady: () => {
      console.log(`📦 New orders ready for display`);
      // Orders will be fetched via realtime listener, not here
    }
  }), []);

  const notificationManager = useNotificationManager(notificationConfig);
  
  // Store in ref to prevent dependency churn
  notificationManagerRef.current = notificationManager;

  const fmt = (n: number) => `${currencySymbol || 'Rs.'} ${(n || 0).toLocaleString('en', { maximumFractionDigits: 0 })}`;

  const fetchTables = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const { data, error } = await (supabase as any).from('restaurant_tables').select('*').eq('restaurant_id', restaurantId);
      
      // Handle 404 - table doesn't exist yet (optional feature)
      if (error) {
        // PGRST116 = "Could not find the table" - silently ignore for now
        if (error.code === 'PGRST116' || error.code === 'PGRST205') {
          setRestaurantTables([]);
          return;
        }
        setRestaurantTables([]);
        return;
      }
      
      setRestaurantTables(data || []);
    } catch (err: any) {
      // Silently handle missing table - it's an optional feature
      setRestaurantTables([]);
    }
  }, [restaurantId]);

  const fetchTableSessions = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const sessions = await getTableSessions(restaurantId);
      setTableSessions(sessions);
      console.log('[UnifiedOrdersManager] Table sessions updated:', sessions.length);
    } catch (err) {
      console.error('Fetch table sessions error:', err);
    }
  }, [restaurantId]);

  const fetchOrders = useCallback(async () => {
    console.log('[UnifiedOrdersManager] 🔄 fetchOrders called, restaurantId:', restaurantId);
    
    if (!restaurantId || !isMountedRef.current) {
      console.log('[UnifiedOrdersManager] ⚠️ fetchOrders aborted - no restaurantId or not mounted');
      setLoading(false);
      return;
    }
    
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(ORDER_WITH_ITEMS_SELECT)
        .eq('restaurant_id', restaurantId)
        .in('status', ['pending', 'accepted', 'cooking', 'ready', 'delivered', 'cancelled'])
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (!isMountedRef.current) return;
      
      if (error) {
        // Silently ignore abort errors
        if (error.message?.includes('AbortError') || error.message?.includes('aborted')) return;
        console.error('Supabase fetch error:', error.message);
        throw error;
      }
      
      const orders = (data || []) as Order[];
      
      console.log('[UnifiedOrdersManager] 📊 Fetched orders:', orders.length);
      console.log('[UnifiedOrdersManager] 📋 Order statuses:', orders.map(o => `${o.id.slice(-4)}: ${o.status}`));
      console.log('[UnifiedOrdersManager] 🍽️ Orders with items:', orders.filter(o => o.order_items?.length > 0).length);
      
      setAllOrders(orders);
    } catch (err: any) {
      // Silently ignore ALL abort-related errors (React Strict Mode cleanup)
      if (err?.name === 'AbortError') return;
      if (err?.message?.includes('AbortError')) return;
      if (err?.message?.includes('aborted')) return;
      if (err?.message?.includes('signal is aborted')) return;
      if (!isMountedRef.current) return;
      console.error('Fetch orders failed:', err?.message || err);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [restaurantId]);

  // Initial data fetch
  useEffect(() => {
    fetchOrders();
    fetchTables();
    fetchTableSessions();
  }, [fetchOrders, fetchTables, fetchTableSessions]);

  /**
   * REAL-TIME ORDER REFRESH (NO NOTIFICATION LOGIC)
   * Notification system is now handled globally by Partner_Dashboard
   * This just refreshes the order list when changes are detected
   */
  const handleOrderChangeCallback = useCallback(async () => {
    console.log('[UnifiedOrdersManager] 📦 Order change detected - refreshing data');
    
    // Refetch orders and table sessions
    await fetchOrders();
    await fetchTableSessions();
  }, [fetchOrders, fetchTableSessions]);

  /**
   * REAL-TIME ORDER SYNCHRONIZATION - DISABLED
   * 
   * Moved to Partner_Dashboard to prevent duplicate channel subscriptions.
   * Partner_Dashboard handles notifications globally across all dashboard routes.
   * 
   * This component will receive updates via context or props when needed.
   * For now, manual refresh via fetchOrders() is sufficient when on this route.
   */
  // Real-time listener removed - handled by Partner_Dashboard

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    console.log(`[handleStatusUpdate] Starting update for order ${id.slice(-4)} to ${newStatus}`);
    
    // OPTIMISTIC UPDATE: Move order visually immediately
    setAllOrders(prev => prev.map(order => 
      order.id === id ? { ...order, status: newStatus as Order['status'] } : order
    ));
    
    setUpdating(id);
    
    try {
      const result = await (supabase as any).from('orders').update({ status: newStatus }).eq('id', id).select();
      const { data, error } = result;
      
      if (error) {
        console.error('[handleStatusUpdate] Supabase error:', error.message);
        // Revert optimistic update on error
        fetchOrders();
        toast.error(`Update failed: ${error.message}`);
        return;
      }
      
      console.log('[handleStatusUpdate] ✅ Update successful');
      toast.success(`Order #${id.slice(-4).toUpperCase()} → ${newStatus}`);
      // Refresh to get server state
      fetchOrders();
    } catch (err: any) {
      console.error('[handleStatusUpdate] Error:', err?.message || err);
      // Revert on error
      fetchOrders();
      toast.error(`Update failed: ${err?.message || 'Network error'}`);
    } finally {
      setUpdating(null);
    }
  };

  const handleMarkPaid = async (id: string) => {
    // Optimistic update for faster UI response
    setAllOrders(prev => prev.map(order =>
      order.id === id ? { ...order, payment_status: 'PAID' } : order
    ));

    try {
      const { error } = await (supabase as any)
        .from('orders')
        .update({ payment_status: 'PAID' })
        .eq('id', id);

      if (error) {
        throw error;
      }

      toast.success(`Payment marked as PAID for #${id.slice(-4).toUpperCase()}`);
      fetchOrders();
    } catch (err: any) {
      console.error('[handleMarkPaid] Error:', err?.message || err);
      toast.error(`Failed to mark payment: ${err?.message || 'Network error'}`);
      fetchOrders();
    }
  };

  const handleCloseSession = async (tableNum: string) => {
    setLoading(true);
    try {
      const activeTableOrders = allOrders.filter(o => o.table_number === tableNum && o.session_status === 'active');
      if (activeTableOrders.length === 0) {
          toast.info(`Table ${tableNum} is already clear.`);
          setLoading(false);
          return;
      }
      const { error } = await (supabase as any)
        .from('orders')
        .update({ session_status: 'closed', status: 'delivered' })
        .eq('restaurant_id', restaurantId)
        .eq('table_number', tableNum)
        .eq('session_status', 'active');

      if (error) throw error;
      toast.success(`Table ${tableNum} bill settled and session closed.`);
      fetchOrders();
    } catch (err) {
      console.error('Close session error:', err);
      toast.error('Failed to close session');
    } finally {
      setLoading(false);
    }
  };

  const pendingOrders = allOrders.filter(o => o.status === 'pending');
  const activeOrders = allOrders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  
  const statusBreakdown = allOrders.reduce((acc, o) => {
    acc[o.status || 'NULL'] = (acc[o.status || 'NULL'] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('[UnifiedOrdersManager] 📊 Dashboard Stats:', {
    total: allOrders.length,
    pending: pendingOrders.length,
    active: activeOrders.length,
    tableSessions: tableSessions.length,
    statusBreakdown: JSON.stringify(statusBreakdown)
  });
  // tableSessions now comes from tableSessionService with proper aggregation

  return (
    <div className="min-h-screen bg-[#060606] text-white -m-6 lg:-m-8 p-6 lg:p-10 font-display relative overflow-hidden">
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] ambient-glow-red pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[60%] h-[60%] ambient-glow-gold pointer-events-none z-0"></div>

      <div className="relative z-10 flex flex-col h-full">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4">
               <div className={`p-4 rounded-[1.5rem] bg-black/40 backdrop-blur-3xl border border-white/5 shadow-2xl ${pendingOrders.length > 0 ? 'ring-2 ring-orange-500/20' : ''}`}>
                 <BellRing className={`w-10 h-10 ${pendingOrders.length > 0 ? 'text-orange-500 animate-[pulse_1s_infinite]' : 'text-slate-600'}`} />
               </div>
               <div>
                  <h1 className="text-4xl lg:text-5xl font-black tracking-tighter text-white">
                    Command <span className="text-orange-500">Center</span>
                  </h1>
                  <p className="text-slate-400 text-sm font-medium tracking-wide flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Floor & Kitchen Sync
                  </p>
               </div>
            </div>
          </div>

          <div className="flex items-center gap-4 p-2 bg-black/40 backdrop-blur-2xl rounded-3xl border border-white/5 shadow-2xl">
              {/* DND Indicator */}
              {notificationManager.dndMode !== 'off' && (
                <div className="bg-red-500/20 border border-red-500/30 px-4 py-2 rounded-2xl text-red-300 font-bold text-sm flex items-center gap-2 animate-pulse">
                  <span>🔇</span>
                  <span>DND: {notificationManager.formatDNDTime()}</span>
                  <button
                    onClick={() => notificationManager.disableDND()}
                    className="ml-2 text-red-400 hover:text-red-200 text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}

              <button
                 onClick={() => {
                   const nextEnabled = !soundEnabled;
                   soundManager.unlockAudio();
                   setSoundEnabled(nextEnabled);
                   soundManager.setEnabled(nextEnabled);
                   toast.info(nextEnabled ? 'Sounds Enabled' : 'Sounds Muted');
                 }}
                 className={`group flex items-center gap-2 px-5 py-3 rounded-2xl transition-all border ${soundEnabled ? 'bg-orange-500/10 border-orange-500/20 text-orange-400 shadow-[0_0_15px_rgba(244,175,37,0.1)]' : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:text-white'}`}
              >
                  {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                  <span className="text-xs font-black uppercase tracking-widest">{soundEnabled ? 'Live Audio' : 'Muted'}</span>
              </button>

              {/* DND Menu - Keyboard Accessible */}
              <div className="relative">
                <button 
                  aria-haspopup="menu"
                  aria-expanded={isSettingsOpen}
                  aria-controls="dnd-menu"
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setIsSettingsOpen(false);
                  }}
                  className="p-3 rounded-2xl bg-white/5 border border-white/5 text-slate-400 hover:text-white transition-all hover:bg-white/10 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  <Settings size={20} />
                </button>
                {isSettingsOpen && (
                  <div 
                    id="dnd-menu"
                    role="menu"
                    className="absolute right-0 mt-2 w-48 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl z-50"
                    onClick={() => setIsSettingsOpen(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setIsSettingsOpen(false);
                    }}
                  >
                    <div className="p-2 space-y-1">
                      <p className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Do Not Disturb</p>
                      {(['5min', '10min', '15min'] as const).map((duration) => (
                        <button
                          role="menuitem"
                          key={duration}
                          onClick={() => notificationManager.enableDND(duration)}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 focus:bg-white/5 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm font-medium text-slate-300 transition-colors"
                        >
                          🔇 {duration.replace('min', ' min')}
                        </button>
                      ))}
                      {notificationManager.dndMode !== 'off' && (
                        <button
                          role="menuitem"
                          onClick={() => notificationManager.disableDND()}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-red-500/20 focus:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm font-medium text-red-400 transition-colors border-t border-white/5 mt-1 pt-2"
                        >
                          🔔 Disable DND
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button 
                  onClick={fetchOrders}
                  className="p-3 rounded-2xl bg-white/5 border border-white/5 text-slate-400 hover:text-white transition-all hover:bg-white/10"
              >
                  <RefreshCw size={20} className={loading ? 'animate-spin text-orange-500' : ''} />
              </button>
          </div>
        </header>

        <nav className="flex gap-3 mb-10 overflow-x-auto pb-4 no-scrollbar sticky top-0 z-20 bg-transparent py-4">
          {[
            { id: 'kitchen', label: 'Kitchen Flow', icon: Utensils, count: activeOrders.length },
            { id: 'tables',  label: 'Table Grid',    icon: TableProperties, count: tableSessions.length },
            { id: 'pos',     label: 'Direct POS',    icon: ShoppingBag },
            { id: 'history', label: 'Archives',      icon: Receipt },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as MainTab)}
              className={`flex items-center gap-4 px-8 py-4 rounded-[2rem] font-black text-sm transition-all whitespace-nowrap border ${
                activeTab === tab.id 
                  ? 'dash-glass-panel bg-orange-600/20 border-orange-500/50 text-white shadow-[0_0_30px_rgba(244,175,37,0.15)] ring-1 ring-orange-500/20' 
                  : 'bg-black/40 text-slate-500 border-white/5 hover:border-white/10 hover:bg-white/5'
              }`}
            >
              <tab.icon size={20} className={activeTab === tab.id ? 'text-orange-500' : 'text-slate-600'} />
              {tab.label}
              {tab.count !== undefined && (
                  <span className={`px-3 py-1 rounded-full text-[11px] font-black ${activeTab === tab.id ? 'bg-orange-500 text-white shadow-lg' : 'bg-slate-800 text-slate-400'}`}>
                      {tab.count}
                  </span>
              )}
            </button>
          ))}
        </nav>

        <main className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
               key={activeTab}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -20 }}
               transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
               className="h-full"
            >
              {activeTab === 'kitchen' && (
                <TabErrorBoundary fallbackTitle="Kitchen Tab" onReset={fetchOrders}>
                  <KitchenTab 
                    orders={activeOrders} 
                    onUpdate={handleStatusUpdate} 
                    onMarkPaid={handleMarkPaid}
                    updating={updating} 
                    fmt={fmt} 
                  />
                </TabErrorBoundary>
              )}

              {activeTab === 'tables' && (
                <TabErrorBoundary fallbackTitle="Table Map" onReset={() => { fetchOrders(); fetchTableSessions(); }}>
                  <TableMapTab 
                    tableSessions={tableSessions} 
                    restaurantTables={restaurantTables}
                    fmt={fmt} 
                    onSelectTable={(t: string) => { setSelectedTable(t); setActiveTab('pos'); }} 
                    onCloseSession={handleCloseSession}
                  />
                </TabErrorBoundary>
              )}

              {activeTab === 'pos' && (
                <TabErrorBoundary fallbackTitle="POS Tab" onReset={fetchOrders}>
                  <POSTab 
                    restaurantId={restaurantId} 
                    selectedTable={selectedTable} 
                    fmt={fmt}
                    onComplete={() => { setSelectedTable(''); fetchOrders(); setActiveTab('kitchen'); }} 
                  />
                </TabErrorBoundary>
              )}

              {activeTab === 'history' && (
                <TabErrorBoundary fallbackTitle="History Tab" onReset={fetchOrders}>
                  <HistoryTab 
                    orders={allOrders} 
                    fmt={fmt} 
                    onOrdersUpdated={fetchOrders}
                  />
                </TabErrorBoundary>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default UnifiedOrdersManager;
