// ============================================================
// FILE: PartnerPOS.tsx
// SECTION: 2_partner > pages
// PURPOSE: Partner's manual POS — waiter takes order by hand.
//          Hybrid with CustomerMenu: both write to same orders table.
//          Features:
//          - Select table OR walk-in/takeaway
//          - Browse menu by category (same menu as customer sees)
//          - Add items with variants/modifiers
//          - View & edit running cart
//          - Set payment: cash or online (Stripe)
//          - Place order → appears in Live Orders instantly
//          - View open sessions per table → add more / close bill
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Minus, Trash2, CheckCircle2,
  Loader2, ChevronDown, X, Utensils, Package,
  CreditCard, Wallet, Users, TableProperties,
  RefreshCw, ShoppingBag, Receipt, PlusCircle,
  ChevronRight, AlertCircle, Tag
} from 'lucide-react';
import { supabase } from '@/shared/lib/supabaseClient';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────
interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string | null;
  image_url: string | null;
  category: string;
  item_type: string;
  is_available: boolean;
  variants: Variant[];
  modifier_groups: ModifierGroup[];
}

interface Variant { id: string; name: string; price: number; stock_count?: number | null; }
interface Modifier { id: string; name: string; price: number; }
interface ModifierGroup { id: string; name: string; modifiers: Modifier[]; }

interface CartItem {
  id: string;
  item: MenuItem;
  variants: Variant[];
  addons: Modifier[];
  quantity: number;
  unitPrice: number;
  notes: string;
}

interface OpenSession {
  id: string;
  table_number: string;
  customer_name: string;
  total_amount: number;
  status: string;
  created_at: string;
  item_count?: number;
}

type PaymentMethod = 'CASH' | 'ONLINE';
type PosView = 'tables' | 'menu' | 'cart';

// ── Helpers ───────────────────────────────────────────────────
const fmt = (n: number, symbol = 'Rs.') =>
  `${symbol} ${(n || 0).toLocaleString('en', { maximumFractionDigits: 0 })}`;

// ── Main Component ─────────────────────────────────────────────
const PartnerPOS: React.FC<{ restaurantId: string; currencySymbol?: string }> = ({
  restaurantId,
  currencySymbol = 'Rs.',
}) => {
  const f = (n: number) => fmt(n, currencySymbol);

  // ── Core state ─────────────────────────────────────────────
  const [view, setView] = useState<PosView>('tables');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [openSessions, setOpenSessions] = useState<OpenSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // ── Order state ─────────────────────────────────────────────
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // ── Menu browsing state ─────────────────────────────────────
  const [activeCategory, setActiveCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<Variant[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<Modifier[]>([]);
  const [itemQty, setItemQty] = useState(1);
  const [itemNotes, setItemNotes] = useState('');

  // ── Existing session to append to ──────────────────────────
  const [appendToSession, setAppendToSession] = useState<OpenSession | null>(null);

  // ── Fetch menu ──────────────────────────────────────────────
  const fetchMenu = useCallback(async () => {
    setMenuLoading(true);
    try {
      const { data: catData } = await supabase
        .from('categories')
        .select('id, name')
        .eq('restaurant_id', restaurantId)
        .order('sort_order');
      const categoriesData = (catData as { id: string; name: string }[] | null) || [];
      setCategories(categoriesData);
      if (categoriesData[0]) setActiveCategory(categoriesData[0].name);

      const { data: itemData } = await supabase
        .from('menu_items')
        .select('id, name, price, description, image_url, category_id, item_type, is_available, categories(name)')
        .eq('restaurant_id', restaurantId)
        .eq('is_available', true);

      const items: any[] = itemData || [];
      if (items.length > 0) {
        const ids = items.map(i => i.id);
        const { data: vd } = await (supabase as any).from('menu_variants').select('*').in('item_id', ids);
        const { data: gd } = await (supabase as any).from('menu_modifier_groups').select('*, menu_modifiers(*)').in('item_id', ids);

        const varMap: Record<string, Variant[]> = {};
        (vd || []).forEach((v: any) => { if (!varMap[v.item_id]) varMap[v.item_id] = []; varMap[v.item_id].push(v); });
        const modMap: Record<string, ModifierGroup[]> = {};
        (gd || []).forEach((g: any) => { if (!modMap[g.item_id]) modMap[g.item_id] = []; modMap[g.item_id].push({ ...g, modifiers: g.menu_modifiers || [] }); });

        setMenuItems(items.map(i => ({
          ...i,
          category: (i.categories as any)?.name || 'Other',
          variants: varMap[i.id] || [],
          modifier_groups: modMap[i.id] || [],
        })));
      } else {
        setMenuItems([]);
      }
    } catch (err) { console.error('Menu fetch error:', err); }
    finally { setMenuLoading(false); }
  }, [restaurantId]);

  // ── Fetch open sessions ─────────────────────────────────────
  const fetchOpenSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const { data } = await supabase
        .from('orders')
        .select('id, table_number, customer_name, total_amount, status, created_at')
        .eq('restaurant_id', restaurantId)
        .eq('session_status', 'OPEN')
        .not('status', 'in', '("cancelled","delivered")')
        .order('created_at', { ascending: false });

      // Get item counts
      if (data && data.length > 0) {
        const ids = data.map((o: any) => o.id);
        const { data: itemCounts } = await supabase
          .from('order_items')
          .select('order_id')
          .in('order_id', ids);

        const countMap: Record<string, number> = {};
        (itemCounts || []).forEach((i: any) => {
          countMap[i.order_id] = (countMap[i.order_id] || 0) + 1;
        });

        setOpenSessions(data.map((o: any) => ({ ...o, item_count: countMap[o.id] || 0 })));
      } else {
        setOpenSessions([]);
      }
    } catch (err) { console.error('Sessions fetch error:', err); }
    finally { setSessionsLoading(false); }
  }, [restaurantId]);

  useEffect(() => {
    fetchMenu();
    fetchOpenSessions();

    // Realtime: update open sessions when orders change
    const channel = supabase
      .channel(`partner-pos-${restaurantId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders',
        filter: `restaurant_id=eq.${restaurantId}`
      }, () => fetchOpenSessions())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchMenu, fetchOpenSessions, restaurantId]);

  // ── Item modal helpers ──────────────────────────────────────
  const openItemModal = (item: MenuItem) => {
    setSelectedItem(item);
    const avail = item.variants.filter(v => typeof v.stock_count !== 'number' || v.stock_count > 0);
    setSelectedVariants(avail.length > 0 ? [avail[0]] : []);
    setSelectedAddons([]);
    setItemQty(1);
    setItemNotes('');
  };

  const itemModalTotal = () => {
    if (!selectedItem) return 0;
    const base = selectedVariants.length > 0 ? 0 : selectedItem.price;
    const vTotal = selectedVariants.reduce((s, v) => s + v.price, 0);
    const aTotal = selectedAddons.reduce((s, a) => s + a.price, 0);
    return (base + vTotal + aTotal) * itemQty;
  };

  const addItemToCart = () => {
    if (!selectedItem) return;
    if (selectedItem.variants.length > 0 && selectedVariants.length === 0) {
      toast.error('Please select an option'); return;
    }
    const unitPrice = selectedVariants.length > 0
      ? selectedVariants.reduce((s, v) => s + v.price, 0) + selectedAddons.reduce((s, a) => s + a.price, 0)
      : selectedItem.price + selectedAddons.reduce((s, a) => s + a.price, 0);

    setCart(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      item: selectedItem,
      variants: selectedVariants,
      addons: selectedAddons,
      quantity: itemQty,
      unitPrice,
      notes: itemNotes,
    }]);
    toast.success(`${itemQty}× ${selectedItem.name} added`);
    setSelectedItem(null);
  };

  const cartTotal = () => cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const cartCount = () => cart.reduce((s, i) => s + i.quantity, 0);

  // ── Place order ─────────────────────────────────────────────
  const placeOrder = async () => {
    if (cart.length === 0) { toast.error('Cart is empty'); return; }
    if (!isWalkIn && !selectedTable && !appendToSession) {
      toast.error('Please select a table'); return;
    }
    if (!customerName.trim() && !appendToSession) {
      toast.error('Please enter customer name'); return;
    }

    setSubmitting(true);
    try {
      const total = cartTotal();

      // ── APPEND to existing session ────────────────────────
      if (appendToSession) {
        const items = cart.map(ci => ({
          order_id: appendToSession.id,
          menu_item_id: ci.item.id,
          item_name: ci.item.name,
          quantity: ci.quantity,
          unit_price: ci.item.price,
          total_price: ci.unitPrice * ci.quantity,
          item_notes: ci.notes || null,
          variant_details: { variants: ci.variants, addons: ci.addons },
        }));
        const { error: ie } = await (supabase as any).from('order_items').insert(items);
        if (ie) throw ie;
        await (supabase as any).from('orders')
          .update({ total_amount: appendToSession.total_amount + total })
          .eq('id', appendToSession.id);
        toast.success(`Added ${cartCount()} items to Table ${appendToSession.table_number}`);
      } else {
        // ── NEW order ─────────────────────────────────────────
        const { data: newOrder, error: oe } = await (supabase as any)
          .from('orders')
          .insert({
            restaurant_id: restaurantId,
            table_number: isWalkIn ? null : selectedTable,
            customer_name: customerName.trim() || 'Walk-in',
            order_type: isWalkIn ? 'DELIVERY' : 'DINE_IN',
            total_amount: total,
            session_status: isWalkIn ? 'CLOSED' : 'OPEN',
            payment_status: 'PENDING',
            payment_method: paymentMethod,
            status: 'pending',
          })
          .select('id')
          .single();
        if (oe) throw oe;

        const items = cart.map(ci => ({
          order_id: newOrder.id,
          menu_item_id: ci.item.id,
          item_name: ci.item.name,
          quantity: ci.quantity,
          unit_price: ci.item.price,
          total_price: ci.unitPrice * ci.quantity,
          item_notes: ci.notes || null,
          variant_details: { variants: ci.variants, addons: ci.addons },
        }));
        const { error: ie } = await (supabase as any).from('order_items').insert(items);
        if (ie) throw ie;
        toast.success(`Order placed${isWalkIn ? ' (walk-in)' : ` for Table ${selectedTable}`}!`);
      }

      // Reset
      setCart([]);
      setCustomerName('');
      setSelectedTable('');
      setAppendToSession(null);
      setView('tables');
      await fetchOpenSessions();

    } catch (err: any) {
      toast.error(err.message || 'Order failed');
    } finally { setSubmitting(false); }
  };

  // ── Close a session (mark as delivered + CLOSED) ────────────
  const closeSession = async (session: OpenSession) => {
    if (!window.confirm(`Close session for Table ${session.table_number}? (${f(session.total_amount)})`)) return;
    try {
      await (supabase as any).from('orders')
        .update({ session_status: 'CLOSED', status: 'delivered', payment_status: 'PAID' })
        .eq('id', session.id);
      toast.success(`Table ${session.table_number} closed`);
      await fetchOpenSessions();
    } catch (err: any) {
      toast.error(err.message || 'Could not close session');
    }
  };

  // ── Filtered menu items ─────────────────────────────────────
  const displayItems = menuItems.filter(item => {
    if (activeCategory && item.category !== activeCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return item.name.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
    }
    return true;
  });

  // ──────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0d0500] text-white">

      {/* Header */}
      <header className="sticky top-0 z-40 p-4 bg-[#0d0500]/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight">Manual POS</h1>
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Partner order entry</p>
          </div>
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button onClick={() => setView('cart')}
                className="relative px-4 py-2.5 rounded-xl bg-orange-500 text-white font-black text-sm flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                Cart ({cartCount()}) · {f(cartTotal())}
              </button>
            )}
            <button onClick={fetchOpenSessions} className="p-2.5 rounded-xl bg-white/5 border border-white/10 active:scale-90 transition-transform">
              <RefreshCw className="w-4 h-4 text-white/50" />
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="max-w-5xl mx-auto mt-3 flex gap-2">
          {[
            { key: 'tables', label: 'Tables', icon: TableProperties },
            { key: 'menu',   label: 'Add Items', icon: Utensils },
            { key: 'cart',   label: `Cart${cartCount() > 0 ? ` (${cartCount()})` : ''}`, icon: ShoppingBag },
          ].map(tab => (
            <button key={tab.key} onClick={() => setView(tab.key as PosView)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                view === tab.key ? 'bg-orange-500 text-white' : 'bg-white/5 text-white/40 border border-white/10'
              }`}>
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4">

        {/* ── VIEW: TABLES ─────────────────────────────────── */}
        {view === 'tables' && (
          <div className="space-y-6">

            {/* Quick start new order */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
              <h2 className="text-sm font-black text-white/50 uppercase tracking-widest">Start New Order</h2>

              <div className="flex gap-3">
                <button onClick={() => setIsWalkIn(false)}
                  className={`flex-1 py-3 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    !isWalkIn ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-white/10 bg-white/5 text-white/40'
                  }`}>
                  <TableProperties className="w-4 h-4" /> Dine-in / Table
                </button>
                <button onClick={() => setIsWalkIn(true)}
                  className={`flex-1 py-3 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    isWalkIn ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-white/10 bg-white/5 text-white/40'
                  }`}>
                  <Package className="w-4 h-4" /> Walk-in / Takeaway
                </button>
              </div>

              {!isWalkIn && (
                <div>
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-2">Table Number</label>
                  <div className="grid grid-cols-8 gap-2">
                    {Array.from({ length: 20 }, (_, i) => String(i + 1)).map(t => (
                      <button key={t} onClick={() => setSelectedTable(t === selectedTable ? '' : t)}
                        className={`aspect-square rounded-xl font-black text-sm transition-all ${
                          selectedTable === t
                            ? 'bg-orange-500 text-white'
                            : openSessions.some(s => s.table_number === t)
                              ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                              : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10'
                        }`}>
                        {t}
                        {openSessions.some(s => s.table_number === t) && (
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mx-auto mt-0.5" />
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-white/25 mt-2">
                    Orange dot = active session on that table
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-1">Customer name</label>
                  <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
                    placeholder={isWalkIn ? 'Walk-in customer' : 'e.g. Imran'}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-orange-500/50 outline-none text-sm text-white placeholder:text-white/20" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-1">Payment method</label>
                  <div className="flex gap-2">
                    <button onClick={() => setPaymentMethod('CASH')}
                      className={`flex-1 py-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                        paymentMethod === 'CASH' ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-white/10 bg-white/5 text-white/40'
                      }`}>
                      <Wallet className="w-3.5 h-3.5" /> Cash
                    </button>
                    <button onClick={() => setPaymentMethod('ONLINE')}
                      className={`flex-1 py-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                        paymentMethod === 'ONLINE' ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-white/10 bg-white/5 text-white/40'
                      }`}>
                      <CreditCard className="w-3.5 h-3.5" /> Online
                    </button>
                  </div>
                </div>
              </div>

              <button onClick={() => setView('menu')}
                disabled={!isWalkIn && !selectedTable}
                className="w-full py-3.5 rounded-2xl bg-orange-500 text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-all">
                <Utensils className="w-4 h-4" /> Add Items to Order →
              </button>
            </div>

            {/* Open sessions */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-black text-white/50 uppercase tracking-widest">
                  Open Sessions ({openSessions.length})
                </h2>
                <button onClick={fetchOpenSessions} className="text-[10px] text-orange-500 font-bold hover:underline">Refresh</button>
              </div>

              {sessionsLoading ? (
                <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 text-orange-500 animate-spin" /></div>
              ) : openSessions.length === 0 ? (
                <div className="py-8 text-center">
                  <TableProperties className="w-10 h-10 text-white/10 mx-auto mb-3" />
                  <p className="text-white/30 text-sm">No open sessions</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {openSessions.map(session => (
                    <motion.div key={session.id} layout
                      className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                            <span className="text-amber-400 font-black text-sm">
                              {session.table_number || 'WI'}
                            </span>
                          </div>
                          <div>
                            <p className="text-white font-black text-sm">
                              {session.table_number ? `Table ${session.table_number}` : 'Walk-in'}
                            </p>
                            <p className="text-white/40 text-[10px]">{session.customer_name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-black">{f(session.total_amount)}</p>
                          <p className="text-white/30 text-[10px]">
                            {session.item_count} item{session.item_count !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => {
                            setAppendToSession(session);
                            setSelectedTable(session.table_number || '');
                            setIsWalkIn(!session.table_number);
                            setCustomerName(session.customer_name || '');
                            setView('menu');
                          }}
                          className="flex-1 py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-orange-500/20 transition-colors">
                          <PlusCircle className="w-3.5 h-3.5" /> Add items
                        </button>
                        <button
                          onClick={() => closeSession(session)}
                          className="flex-1 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-green-500/20 transition-colors">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Close & pay
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── VIEW: MENU ───────────────────────────────────── */}
        {view === 'menu' && (
          <div className="space-y-4">

            {/* Context banner */}
            <div className={`p-3 rounded-2xl flex items-center gap-3 ${
              appendToSession ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-orange-500/10 border border-orange-500/20'
            }`}>
              {appendToSession ? (
                <>
                  <PlusCircle className="w-5 h-5 text-amber-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-amber-400 font-black text-xs uppercase tracking-widest">Adding to existing tab</p>
                    <p className="text-white/60 text-xs">Table {appendToSession.table_number} — {appendToSession.customer_name} — Current: {f(appendToSession.total_amount)}</p>
                  </div>
                  <button onClick={() => { setAppendToSession(null); setView('tables'); }} className="text-white/30 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <Utensils className="w-5 h-5 text-orange-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-orange-400 font-black text-xs uppercase tracking-widest">New order</p>
                    <p className="text-white/60 text-xs">
                      {isWalkIn ? 'Walk-in' : `Table ${selectedTable}`}
                      {customerName && ` — ${customerName}`}
                      {' · '}{paymentMethod === 'CASH' ? 'Cash' : 'Online'}
                    </p>
                  </div>
                  <button onClick={() => setView('tables')} className="text-white/30 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search menu..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-orange-500/40 outline-none text-sm text-white placeholder:text-white/20" />
            </div>

            {/* Category tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {categories.map(cat => (
                <button key={cat.id} onClick={() => setActiveCategory(cat.name)}
                  className={`shrink-0 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    activeCategory === cat.name ? 'bg-orange-500 text-white' : 'bg-white/5 text-white/40 border border-white/10'
                  }`}>
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Items grid */}
            {menuLoading ? (
              <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 text-orange-500 animate-spin" /></div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {displayItems.map(item => {
                  const inCart = cart.filter(c => c.item.id === item.id).reduce((s, c) => s + c.quantity, 0);
                  const minP = item.variants.length > 0 ? Math.min(...item.variants.map(v => v.price)) : item.price;
                  return (
                    <button key={item.id} onClick={() => openItemModal(item)}
                      className={`p-4 rounded-2xl text-left flex items-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] border ${
                        inCart > 0 ? 'border-orange-500/40 bg-orange-500/5' : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-bold text-white text-sm truncate">{item.name}</p>
                          {inCart > 0 && (
                            <span className="text-[9px] font-black bg-orange-500 text-white px-1.5 py-0.5 rounded-full shrink-0">×{inCart}</span>
                          )}
                        </div>
                        {item.description && <p className="text-white/40 text-xs mt-0.5 line-clamp-1">{item.description}</p>}
                        <p className="text-orange-400 font-black text-sm mt-1">{f(minP)}</p>
                      </div>
                      <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
                        <Plus className="w-4 h-4 text-white" />
                      </div>
                    </button>
                  );
                })}
                {displayItems.length === 0 && (
                  <div className="col-span-2 py-12 text-center">
                    <Search className="w-8 h-8 text-white/10 mx-auto mb-3" />
                    <p className="text-white/30">No items found</p>
                  </div>
                )}
              </div>
            )}

            {/* Go to cart */}
            {cart.length > 0 && (
              <div className="sticky bottom-4">
                <button onClick={() => setView('cart')}
                  className="w-full py-4 rounded-2xl bg-orange-500 text-white font-black text-base flex items-center justify-between px-6 shadow-2xl shadow-orange-500/30 active:scale-[0.98] transition-all">
                  <span>Review Cart ({cartCount()} items)</span>
                  <span className="flex items-center gap-2">{f(cartTotal())} <ChevronRight className="w-5 h-5" /></span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── VIEW: CART ───────────────────────────────────── */}
        {view === 'cart' && (
          <div className="space-y-4">

            {/* Context */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TableProperties className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-bold text-white">
                  {appendToSession ? `Table ${appendToSession.table_number} — Add to bill` : isWalkIn ? 'Walk-in order' : `Table ${selectedTable} — New order`}
                </span>
              </div>
              <button onClick={() => setView('menu')} className="text-xs text-orange-500 font-bold">+ Add more</button>
            </div>

            {cart.length === 0 ? (
              <div className="py-16 text-center">
                <ShoppingBag className="w-12 h-12 text-white/10 mx-auto mb-4" />
                <p className="text-white/30 font-bold">Cart is empty</p>
                <button onClick={() => setView('menu')} className="mt-4 px-5 py-2.5 rounded-xl bg-orange-500 text-white font-bold text-sm">
                  Browse menu
                </button>
              </div>
            ) : (
              <>
                {/* Cart items */}
                <div className="space-y-3">
                  {cart.map(ci => (
                    <div key={ci.id} className="p-4 rounded-2xl bg-white/5 border border-white/10">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-white font-bold text-sm">{ci.item.name}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {ci.variants.map(v => <span key={v.id} className="text-[9px] font-bold bg-white/10 px-1.5 py-0.5 rounded text-white/50">{v.name}</span>)}
                            {ci.addons.map(a => <span key={a.id} className="text-[9px] font-bold bg-orange-500/20 px-1.5 py-0.5 rounded text-orange-400">+{a.name}</span>)}
                          </div>
                          {ci.notes && <p className="text-[10px] text-orange-400/70 mt-1 italic">📝 {ci.notes}</p>}
                        </div>
                        <p className="text-orange-400 font-black text-sm shrink-0">{f(ci.unitPrice * ci.quantity)}</p>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2 bg-black/30 rounded-lg p-1">
                          <button onClick={() => setCart(p => ci.quantity <= 1 ? p.filter(i => i.id !== ci.id) : p.map(i => i.id === ci.id ? { ...i, quantity: i.quantity - 1 } : i))}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors">
                            {ci.quantity <= 1 ? <Trash2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                          </button>
                          <span className="text-white font-black text-xs w-5 text-center">{ci.quantity}</span>
                          <button onClick={() => setCart(p => p.map(i => i.id === ci.id ? { ...i, quantity: i.quantity + 1 } : i))}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-orange-400 hover:bg-orange-500/20 transition-colors">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[10px] text-white/30">{f(ci.unitPrice)} each</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bill summary */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  {appendToSession && (
                    <div className="flex justify-between text-sm text-white/50 pb-2 border-b border-white/5">
                      <span>Previous tab</span>
                      <span>{f(appendToSession.total_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm text-white/50">
                    <span>New items</span>
                    <span>{f(cartTotal())}</span>
                  </div>
                  <div className="flex justify-between font-black text-white pt-2 border-t border-white/5">
                    <span>{appendToSession ? 'New tab total' : 'Total'}</span>
                    <span className="text-orange-400">{f(appendToSession ? appendToSession.total_amount + cartTotal() : cartTotal())}</span>
                  </div>
                </div>

                {/* Payment method (only for new orders) */}
                {!appendToSession && (
                  <div>
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Payment method</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setPaymentMethod('CASH')}
                        className={`py-3 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all ${paymentMethod === 'CASH' ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-white/10 bg-white/5 text-white/40'}`}>
                        <Wallet className="w-4 h-4" /> Cash
                      </button>
                      <button onClick={() => setPaymentMethod('ONLINE')}
                        className={`py-3 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all ${paymentMethod === 'ONLINE' ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-white/10 bg-white/5 text-white/40'}`}>
                        <CreditCard className="w-4 h-4" /> Online
                      </button>
                    </div>
                  </div>
                )}

                {/* Place order button */}
                <button onClick={placeOrder} disabled={submitting}
                  className="w-full py-4 rounded-2xl bg-orange-500 text-white font-black text-base flex items-center justify-center gap-3 shadow-xl shadow-orange-500/25 disabled:opacity-60 active:scale-[0.98] transition-all">
                  {submitting
                    ? <><Loader2 className="w-5 h-5 animate-spin" /> Placing order...</>
                    : appendToSession
                      ? <><PlusCircle className="w-5 h-5" /> Add to bill ({f(cartTotal())})</>
                      : <><CheckCircle2 className="w-5 h-5" /> Place order ({f(cartTotal())})</>
                  }
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── ITEM SELECTION MODAL ─────────────────────────── */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
            <motion.div
              initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
              className="bg-[#1a0a00] border border-white/10 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[85vh] flex flex-col"
            >
              <div className="p-5 border-b border-white/5 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-white font-black text-lg">{selectedItem.name}</h3>
                  {selectedItem.description && <p className="text-white/40 text-xs mt-0.5 line-clamp-2">{selectedItem.description}</p>}
                </div>
                <button onClick={() => setSelectedItem(null)} className="p-2 rounded-xl bg-white/5 active:scale-90">
                  <X className="w-4 h-4 text-white/50" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Variants */}
                {selectedItem.variants.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Choose option *</p>
                    <div className="space-y-2">
                      {selectedItem.variants.map(v => {
                        const isSel = selectedVariants.some(sv => sv.id === v.id);
                        const isOOS = typeof v.stock_count === 'number' && v.stock_count <= 0;
                        return (
                          <button key={v.id} onClick={() => !isOOS && setSelectedVariants([v])}
                            className={`w-full p-3 rounded-xl border flex justify-between items-center transition-all ${isOOS ? 'opacity-30 cursor-not-allowed border-white/5 bg-white/5' : isSel ? 'border-orange-500 bg-orange-500/10' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
                            <span className={`font-bold text-sm ${isSel ? 'text-orange-400' : 'text-white/70'}`}>{v.name}</span>
                            <span className={`font-black text-sm ${isSel ? 'text-orange-400' : 'text-white/40'}`}>{f(v.price)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Modifiers */}
                {selectedItem.modifier_groups.map(group => (
                  <div key={group.id}>
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">{group.name} (optional)</p>
                    <div className="space-y-2">
                      {group.modifiers.map(addon => {
                        const isSel = selectedAddons.some(a => a.id === addon.id);
                        return (
                          <button key={addon.id} onClick={() => setSelectedAddons(prev => isSel ? prev.filter(a => a.id !== addon.id) : [...prev, addon])}
                            className={`w-full p-3 rounded-xl border flex justify-between items-center transition-all ${isSel ? 'border-orange-500 bg-orange-500/10' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
                            <span className={`font-bold text-sm ${isSel ? 'text-orange-400' : 'text-white/70'}`}>{addon.name}</span>
                            <span className={`font-black text-sm ${isSel ? 'text-orange-400' : 'text-white/40'}`}>
                              {addon.price > 0 ? `+${f(addon.price)}` : 'Free'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Notes */}
                <div>
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Kitchen notes</p>
                  <input type="text" value={itemNotes} onChange={e => setItemNotes(e.target.value)}
                    placeholder="e.g. No onions, extra spicy..."
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-orange-500/40 outline-none text-sm text-white placeholder:text-white/20" />
                </div>
              </div>

              <div className="p-5 border-t border-white/5 space-y-4 shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white/60">Quantity</span>
                  <div className="flex items-center gap-3 bg-black/40 rounded-xl p-1">
                    <button onClick={() => setItemQty(Math.max(1, itemQty - 1))} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white"><Minus className="w-3.5 h-3.5" /></button>
                    <span className="text-white font-black w-5 text-center">{itemQty}</span>
                    <button onClick={() => setItemQty(itemQty + 1)} className="w-8 h-8 flex items-center justify-center rounded-lg text-orange-500"><Plus className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <button onClick={addItemToCart}
                  className="w-full py-3.5 rounded-2xl bg-orange-500 text-white font-black text-base flex items-center justify-between px-6 active:scale-[0.98] transition-all">
                  <span>Add to order</span>
                  <span>{f(itemModalTotal())}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PartnerPOS;
