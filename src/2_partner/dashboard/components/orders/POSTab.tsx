import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search, Plus, Minus, Trash2, CheckCircle2, Loader2, ChevronRight, X, 
    ShoppingBag, Wallet, CreditCard, Utensils, TableProperties, Info, TrendingUp,
    Bell, BellOff, Volume2
} from 'lucide-react';
import { supabase } from '@/shared/lib/supabaseClient';
import { toast } from 'sonner';
import { setupOrderRealtimeListener } from '../../services/orderRealtimeService';
import { useNotificationManager } from '../NotificationManager';
import { soundManager } from '@/shared/services/soundManager';

interface POSTabProps {
    restaurantId: string;
    selectedTable: string;
    onComplete: () => void;
    fmt: (n: number) => string;
}

interface Variant {
    id: string;
    name: string;
    price_adjustment: number;
}

interface Modifier {
    id: string;
    name: string;
    price: number;
}

interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    image_url?: string;
    variant?: Variant;
    modifiers: Modifier[];
    special_instructions?: string;
}

const POSTab: React.FC<POSTabProps> = ({ restaurantId, selectedTable, onComplete, fmt }) => {
    const [view, setView] = useState<'menu' | 'cart'>('menu');
    const [categories, setCategories] = useState<any[]>([]);
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Notification Manager for real-time alerts
    const { addOrderToQueue, enableDND, disableDND, dndMode, formatDNDTime } = useNotificationManager({
        onOrdersReady: (orders) => {
            console.log('[POSTab] Batch of', orders.length, 'orders ready for notification');
        }
    });
    
    // Track existing orders to detect new ones
    const [existingOrderIds, setExistingOrderIds] = useState<Set<string>>(new Set());
    
    // Variant/Modifier Modal State
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [itemVariants, setItemVariants] = useState<Variant[]>([]);
    const [itemModifiers, setItemModifiers] = useState<Modifier[]>([]);
    const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
    const [selectedModifiers, setSelectedModifiers] = useState<Modifier[]>([]);
    const [specialInstructions, setSpecialInstructions] = useState('');
    const [showVariantModal, setShowVariantModal] = useState(false);
    
    // Order State
    const [cart, setCart] = useState<CartItem[]>([]);
    const [customerName, setCustomerName] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'ONLINE'>('CASH');
    const [submitting, setSubmitting] = useState(false);

    // Fetch Menu with variants and modifiers
    const fetchMenu = useCallback(async () => {
        setLoading(true);
        try {
            const { data: cats } = await (supabase as any).from('categories').select('*').eq('restaurant_id', restaurantId).order('sort_order');
            setCategories(cats || []);
            if (cats && cats[0]) setActiveCategory(cats[0].name);

            const { data: items } = await (supabase as any)
                .from('menu_items')
                .select(`*, categories(name), menu_item_variants(*), menu_item_modifiers(*)`)
                .eq('restaurant_id', restaurantId)
                .eq('is_available', true);
            
            setMenuItems(items?.map((i: any) => ({ 
                ...i, 
                category: i.categories?.name || 'Other',
                has_variants: i.menu_item_variants?.length > 0,
                has_modifiers: i.menu_item_modifiers?.length > 0
            })) || []);
        } catch (err) {
            console.error('Menu load error:', err);
            toast.error('Failed to load menu');
        } finally {
            setLoading(false);
        }
    }, [restaurantId]);

    useEffect(() => { 
        const debounceTimer = setTimeout(() => {
            fetchMenu(); 
        }, 500); // Debounce menu fetches to avoid excessive calls
        
        return () => clearTimeout(debounceTimer);
    }, [fetchMenu, restaurantId]);

    /**
     * REAL-TIME ORDER SYNCHRONIZATION
     * 
     * Listens to Supabase Postgres Changes for instant order updates.
     * - QR orders appear in POSTab < 1 second
     * - Filtered by restaurant_id for security
     * - Auto-cleanup on unmount
     */
    useEffect(() => {
        if (!restaurantId) return;

        const unsubscribe = setupOrderRealtimeListener({
            restaurantId,
            onOrderChange: async () => {
                console.log('[POSTab] 📦 Order change detected - checking for new orders');
                
                // Fetch latest orders to detect new ones
                try {
                    const { data: orders } = await supabase
                        .from('orders')
                        .select('id, customer_name, status, created_at')
                        .eq('restaurant_id', restaurantId)
                        .eq('status', 'pending')
                        .order('created_at', { ascending: false })
                        .limit(10);
                    
                    if (orders) {
                        // Find new orders that weren't in our existing set
                        const newOrders = orders.filter(o => !existingOrderIds.has(o.id));
                        
                        if (newOrders.length > 0) {
                            console.log('[POSTab] 🆕 Detected', newOrders.length, 'new orders');
                            
                            // Add each new order to notification queue
                            newOrders.forEach(order => {
                                addOrderToQueue({
                                    id: order.id,
                                    customer_name: order.customer_name,
                                    status: order.status,
                                    created_at: order.created_at
                                });
                            });
                            
                            // Update existing order IDs
                            setExistingOrderIds(prev => {
                                const updated = new Set(prev);
                                newOrders.forEach(o => updated.add(o.id));
                                return updated;
                            });
                        }
                    }
                } catch (error) {
                    console.error('[POSTab] Error checking new orders:', error);
                }
                
                // Refetch menu to show updated stock counts if needed
                fetchMenu();
            },
            onError: (error) => {
                console.error('[POSTab] Real-time error:', error);
                toast.error('Real-time sync error - please refresh');
            }
        });

        return unsubscribe;
    }, [restaurantId, fetchMenu, addOrderToQueue, existingOrderIds]);

    // Fetch variants and modifiers for an item
    const fetchItemDetails = async (item: any) => {
        try {
            const { data: variants } = await (supabase as any)
                .from('menu_item_variants')
                .select('*')
                .eq('menu_item_id', item.id)
                .eq('is_available', true);
            
            const { data: modifiers } = await (supabase as any)
                .from('menu_item_modifiers')
                .select('*')
                .eq('menu_item_id', item.id)
                .eq('is_available', true);
            
            setItemVariants(variants || []);
            setItemModifiers(modifiers || []);
        } catch (err) {
            console.error('Error fetching item details:', err);
        }
    };

    // Handle item click - show variant modal if needed
    const handleItemClick = async (item: any) => {
        if (item.has_variants || item.has_modifiers) {
            setSelectedItem(item);
            setSelectedVariant(null);
            setSelectedModifiers([]);
            setSpecialInstructions('');
            await fetchItemDetails(item);
            setShowVariantModal(true);
        } else {
            addToCart(item);
        }
    };

    // Add item to cart (with or without variants)
    const addToCart = (item: any, variant?: Variant, modifiers?: Modifier[], instructions?: string) => {
        const basePrice = item.price || 0;
        const variantPrice = variant?.price_adjustment || 0;
        const modifiersPrice = modifiers?.reduce((sum, m) => sum + (m.price || 0), 0) || 0;
        const finalPrice = basePrice + variantPrice + modifiersPrice;

        const cartItem: CartItem = {
            id: `${item.id}${variant ? `-${variant.id}` : ''}-${Date.now()}`,
            menu_item_id: item.id,
            name: item.name,
            price: finalPrice,
            quantity: 1,
            image_url: item.image_url,
            variant,
            modifiers: modifiers || [],
            special_instructions: instructions
        };

        setCart(prev => [...prev, cartItem]);
        
        const variantText = variant ? ` (${variant.name})` : '';
        toast.success(`+1 ${item.name}${variantText}`);
        
        if (showVariantModal) {
            setShowVariantModal(false);
            setSelectedItem(null);
        }
    };

    // Confirm variant selection
    const confirmVariantSelection = () => {
        if (selectedItem.has_variants && !selectedVariant) {
            toast.error('Please select a variant');
            return;
        }
        addToCart(selectedItem, selectedVariant || undefined, selectedModifiers, specialInstructions);
    };

    // Toggle modifier selection
    const toggleModifier = (modifier: Modifier) => {
        setSelectedModifiers(prev => {
            const exists = prev.find(m => m.id === modifier.id);
            if (exists) {
                return prev.filter(m => m.id !== modifier.id);
            }
            return [...prev, modifier];
        });
    };

    // Calculate cart total
    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const placeOrder = async () => {
        if (cart.length === 0) return toast.error('Cart is empty');
        if (!selectedTable && !customerName) return toast.error('Table or Customer Name required');

        setSubmitting(true);
        try {
            const { data: order, error: oe } = await (supabase as any).from('orders').insert({
                restaurant_id: restaurantId,
                table_number: selectedTable || null,
                customer_name: customerName || (selectedTable ? `Table ${selectedTable}` : 'Walk-in'),
                order_type: selectedTable ? 'DINE_IN' : 'TAKEAWAY',
                total_amount: cartTotal,
                status: 'pending',
                payment_method: paymentMethod,
                session_status: 'active' // Standardized to 'active'
            }).select().single();

            if (oe) throw oe;

            const items = cart.map(ci => ({
                order_id: order.id,
                menu_item_id: ci.id.split('-')[0],
                item_name: ci.name,
                quantity: ci.quantity,
                unit_price: ci.price,
                total_price: ci.price * ci.quantity,
                variant_details: ci.variant ? {
                    name: ci.variant.name,
                    price_adjustment: ci.variant.price_adjustment
                } : null,
                modifier_details: ci.modifiers.length > 0 ? ci.modifiers.map(m => ({
                    name: m.name,
                    price: m.price
                })) : null,
                item_notes: ci.special_instructions || null
            }));

            const { error: ie } = await (supabase as any).from('order_items').insert(items);
            if (ie) throw ie;

            toast.success('Order placed successfully!');
            setCart([]);
            setCustomerName('');
            onComplete();
        } catch (err) {
            console.error('[POSTab] Order placement error:', err);
            toast.error('Failed to place order');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredItems = menuItems.filter(i => {
        const matchesCat = activeCategory ? i.category === activeCategory : true;
        const matchesSearch = searchQuery ? i.name.toLowerCase().includes(searchQuery.toLowerCase()) : true;
        return matchesCat && matchesSearch;
    });

    return (
        <div className="flex flex-col lg:flex-row gap-10 h-full pb-20 relative">
            {/* Variant/Modifier Modal */}
            <AnimatePresence>
                {showVariantModal && selectedItem && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
                        onClick={() => setShowVariantModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-8 max-w-md w-full max-h-[90vh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-2xl font-black text-white">{selectedItem.name}</h3>
                                    <p className="text-orange-500 font-bold text-lg">{fmt(selectedItem.price)}</p>
                                </div>
                                <button 
                                    onClick={() => setShowVariantModal(false)}
                                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Variants */}
                            {itemVariants.length > 0 && (
                                <div className="mb-6">
                                    <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-3">Select Variant {selectedItem.has_variants && <span className="text-red-400">*</span>}</p>
                                    <div className="space-y-2">
                                        {itemVariants.map((variant) => (
                                            <button
                                                key={variant.id}
                                                onClick={() => setSelectedVariant(variant)}
                                                className={`w-full p-4 rounded-2xl border transition-all flex justify-between items-center ${
                                                    selectedVariant?.id === variant.id
                                                        ? 'bg-orange-500/20 border-orange-500/50 text-white'
                                                        : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/20'
                                                }`}
                                            >
                                                <span className="font-bold">{variant.name}</span>
                                                <span className={selectedVariant?.id === variant.id ? 'text-orange-400' : 'text-slate-500'}>
                                                    {variant.price_adjustment > 0 ? `+${fmt(variant.price_adjustment)}` : variant.price_adjustment < 0 ? fmt(variant.price_adjustment) : 'No extra'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Modifiers */}
                            {itemModifiers.length > 0 && (
                                <div className="mb-6">
                                    <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-3">Add Modifiers (Optional)</p>
                                    <div className="space-y-2">
                                        {itemModifiers.map((modifier) => (
                                            <button
                                                key={modifier.id}
                                                onClick={() => toggleModifier(modifier)}
                                                className={`w-full p-4 rounded-2xl border transition-all flex justify-between items-center ${
                                                    selectedModifiers.find(m => m.id === modifier.id)
                                                        ? 'bg-blue-500/20 border-blue-500/50 text-white'
                                                        : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/20'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                                                        selectedModifiers.find(m => m.id === modifier.id)
                                                            ? 'bg-blue-500 border-blue-500'
                                                            : 'border-slate-600'
                                                    }`}>
                                                        {selectedModifiers.find(m => m.id === modifier.id) && <CheckCircle2 size={14} className="text-white" />}
                                                    </div>
                                                    <span className="font-bold">{modifier.name}</span>
                                                </div>
                                                <span className={selectedModifiers.find(m => m.id === modifier.id) ? 'text-blue-400' : 'text-slate-500'}>
                                                    +{fmt(modifier.price)}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Special Instructions */}
                            <div className="mb-6">
                                <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-3">Special Instructions (Optional)</p>
                                <textarea
                                    value={specialInstructions}
                                    onChange={(e) => setSpecialInstructions(e.target.value)}
                                    placeholder="e.g., No onions, extra spicy..."
                                    className="w-full p-4 bg-black/40 border border-white/5 rounded-2xl text-white placeholder:text-slate-600 focus:border-orange-500/50 outline-none transition-all resize-none"
                                    rows={3}
                                />
                            </div>

                            {/* Price Preview */}
                            <div className="bg-black/40 rounded-2xl p-4 mb-6 border border-white/5">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">Current Price</span>
                                    <span className="text-2xl font-black text-white">
                                        {fmt(selectedItem.price + 
                                            (selectedVariant?.price_adjustment || 0) + 
                                            selectedModifiers.reduce((sum, m) => sum + m.price, 0))}
                                    </span>
                                </div>
                            </div>

                            {/* Add to Cart Button */}
                            <button
                                onClick={confirmVariantSelection}
                                disabled={selectedItem.has_variants && !selectedVariant}
                                className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-orange-500/20"
                            >
                                Add to Order
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Left Column: Menu Browsing */}
            <div className="flex-1 space-y-8 flex flex-col h-full overflow-hidden">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                    <div className="relative flex-1 group w-full">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-orange-500 transition-colors" size={20} />
                        <input 
                            type="text" 
                            placeholder="Discover dishes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 bg-black/40 backdrop-blur-3xl border border-white/5 rounded-[1.5rem] focus:border-orange-500/50 outline-none transition-all text-white placeholder:text-slate-600 shadow-2xl"
                        />
                    </div>
                    
                    {/* DND Controls */}
                    <div className="flex items-center gap-2">
                        {dndMode !== 'off' ? (
                            <div className="flex items-center gap-2 px-4 py-3 rounded-[1.5rem] bg-orange-500/20 border border-orange-500/30">
                                <BellOff size={16} className="text-orange-400" />
                                <span className="text-orange-400 font-bold text-xs">{formatDNDTime()}</span>
                                <button
                                    onClick={disableDND}
                                    className="ml-2 p-1 rounded-lg hover:bg-orange-500/30 transition-colors"
                                    title="Disable DND"
                                >
                                    <X size={14} className="text-orange-400" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => enableDND('5min')}
                                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white transition-all text-xs font-bold"
                                    title="DND for 5 minutes"
                                >
                                    5m
                                </button>
                                <button
                                    onClick={() => enableDND('10min')}
                                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white transition-all text-xs font-bold"
                                    title="DND for 10 minutes"
                                >
                                    10m
                                </button>
                                <button
                                    onClick={() => enableDND('15min')}
                                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white transition-all text-xs font-bold"
                                    title="DND for 15 minutes"
                                >
                                    15m
                                </button>
                                <button
                                    onClick={() => soundManager.playNewOrder()}
                                    className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-emerald-400 transition-all"
                                    title="Test notification sound"
                                >
                                    <Volume2 size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                    
                    {view === 'cart' && (
                        <button 
                            onClick={() => setView('menu')}
                            className="flex items-center gap-2 px-8 py-4 rounded-[1.5rem] bg-white/5 border border-white/10 text-white font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
                        >
                            <ChevronRight size={16} className="rotate-180" />
                            Back to Menu
                        </button>
                    )}
                </div>

                {/* Categories */}
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => { setActiveCategory(cat.name); setView('menu'); }}
                            className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border whitespace-nowrap ${
                                activeCategory === cat.name 
                                    ? 'bg-orange-500 text-white border-orange-400 shadow-[0_0_20px_rgba(244,175,37,0.3)]' 
                                    : 'bg-black/40 text-slate-500 border-white/5 hover:border-white/10'
                            }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                    {view === 'menu' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredItems.map(item => (
                                <motion.button
                                    key={item.id}
                                    whileHover={{ y: -5 }}
                                    onClick={() => handleItemClick(item)}
                                    className="p-5 bg-black/40 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 hover:border-orange-500/30 transition-all text-left flex gap-5 group relative overflow-hidden shadow-2xl"
                                >
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
                                    <div className="w-20 h-20 rounded-2xl bg-white/5 shrink-0 overflow-hidden border border-white/5 relative">
                                         {item.image_url ? (
                                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                         ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-700"><Utensils size={32} /></div>
                                         )}
                                         {(item.has_variants || item.has_modifiers) && (
                                            <div className="absolute top-1 right-1 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                                                <Plus size={14} className="text-white" />
                                            </div>
                                         )}
                                    </div>
                                    <div className="flex-1 min-w-0 pr-6">
                                        <h4 className="font-black text-white text-base truncate mb-1">{item.name}</h4>
                                        <p className="text-[10px] text-slate-500 font-medium line-clamp-1 mb-2 leading-relaxed">{item.description}</p>
                                        <div className="flex items-center gap-2">
                                            <p className="text-orange-500 font-black text-base">{fmt(item.price)}</p>
                                            {(item.has_variants || item.has_modifiers) && (
                                                <span className="text-[9px] text-slate-500 bg-white/5 px-2 py-1 rounded-full">Customize</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="absolute right-4 bottom-4 w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-4 transition-all duration-300 shadow-lg shadow-orange-500/20">
                                        <Plus size={20} />
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    ) : (
                       <div className="space-y-6">
                           <div className="flex items-center gap-4 mb-8">
                               <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shadow-2xl">
                                    <ShoppingBag className="text-orange-500 w-7 h-7" />
                               </div>
                               <div>
                                    <h3 className="text-2xl font-black text-white">Review Order</h3>
                                    <p className="text-slate-500 text-xs font-medium">Final adjustment before transmission</p>
                               </div>
                           </div>
                           
                           {cart.length > 0 ? (
                               <div className="grid gap-4">
                                   {cart.map((item, idx) => (
                                       <motion.div 
                                         layout
                                         key={item.id} 
                                         className="flex items-center justify-between p-6 bg-black/40 backdrop-blur-3xl rounded-[2rem] border border-white/5 shadow-2xl"
                                       >
                                           <div className="flex items-center gap-6">
                                               <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 overflow-hidden">
                                                   {item.image_url ? <img src={item.image_url} alt={item.name || item.title || 'Cart item image'} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-700"><Utensils size={20} /></div>}
                                               </div>
                                               <div>
                                                   <h4 className="font-black text-white text-lg">{item.name}</h4>
                                                   {item.variant && (
                                                       <p className="text-xs text-orange-400">{item.variant.name}</p>
                                                   )}
                                                   {item.modifiers.length > 0 && (
                                                       <p className="text-xs text-slate-500">
                                                           + {item.modifiers.map(m => m.name).join(', ')}
                                                       </p>
                                                   )}
                                                   {item.special_instructions && (
                                                       <p className="text-xs text-slate-600 italic">"{item.special_instructions}"</p>
                                                   )}
                                                   <p className="text-xs text-slate-500 font-bold mt-1">{fmt(item.price)} / unit</p>
                                               </div>
                                           </div>
                                           
                                           <div className="flex items-center gap-10">
                                               <div className="flex items-center gap-6 bg-black/40 border border-white/5 rounded-2xl p-2 px-3 shadow-inner">
                                                   <button 
                                                      onClick={() => setCart(prev => item.quantity <= 1 ? prev.filter((_, i) => i !== idx) : prev.map((ci, i) => i === idx ? { ...ci, quantity: ci.quantity - 1 } : ci))} 
                                                      className="w-10 h-10 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-600 hover:text-red-500 transition-all flex items-center justify-center border border-white/5"
                                                   >
                                                       <Minus size={18} />
                                                   </button>
                                                   <span className="text-lg font-black text-white w-6 text-center">{item.quantity}</span>
                                                   <button 
                                                      onClick={() => setCart(prev => prev.map((ci, i) => i === idx ? { ...ci, quantity: ci.quantity + 1 } : ci))} 
                                                      className="w-10 h-10 rounded-xl bg-white/5 hover:bg-orange-500/20 text-slate-600 hover:text-orange-500 transition-all flex items-center justify-center border border-white/5"
                                                   >
                                                       <Plus size={18} />
                                                   </button>
                                               </div>
                                               <p className="font-black text-xl text-orange-500 text-right w-32">{fmt(item.price * item.quantity)}</p>
                                           </div>
                                       </motion.div>
                                   ))}
                               </div>
                           ) : (
                               <div className="py-20 text-center bg-black/20 rounded-[3rem] border border-dashed border-white/5">
                                   <ShoppingBag size={48} className="mx-auto mb-4 text-slate-800" />
                                   <p className="text-slate-500 font-bold italic">Your culinary queue is empty.</p>
                               </div>
                           )}
                       </div>
                    )}
                </div>
            </div>

            {/* Right Column: Checkout Summary */}
            <div className="w-full lg:w-[400px] shrink-0">
                <div className="p-8 bg-black/40 backdrop-blur-3xl rounded-[3rem] border border-white/5 sticky top-8 space-y-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute bottom-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -mb-32 -mr-32"></div>
                    
                    <div className="flex items-center justify-between relative z-10">
                         <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Checkout</h3>
                         <span className={`flex items-center gap-2 px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-widest ${selectedTable ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                             {selectedTable ? <TableProperties size={12} /> : <ShoppingBag size={12} />}
                             {selectedTable ? `Table ${selectedTable}` : 'Direct Sale'}
                         </span>
                    </div>

                    {!selectedTable && (
                        <div className="space-y-3 relative z-10">
                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Customer Identifier</label>
                            <input 
                                type="text"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                placeholder="Name or Order Tag..."
                                className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl outline-none focus:border-orange-500/50 transition-all text-white font-bold shadow-inner"
                            />
                        </div>
                    )}

                    <div className="space-y-4 relative z-10">
                         <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Settlement Method</label>
                         <div className="flex gap-3">
                             <button onClick={() => setPaymentMethod('CASH')} className={`flex-1 flex flex-col items-center gap-3 p-5 rounded-[1.5rem] border transition-all ${paymentMethod === 'CASH' ? 'bg-orange-500/20 border-orange-500/40 text-white shadow-lg shadow-orange-500/10' : 'bg-white/5 border-white/10 text-slate-500'}`}>
                                 <Wallet size={24} className={paymentMethod === 'CASH' ? 'text-orange-500' : ''} />
                                 <span className="text-[10px] font-black uppercase tracking-widest">Cold Cash</span>
                             </button>
                             <button onClick={() => setPaymentMethod('ONLINE')} className={`flex-1 flex flex-col items-center gap-3 p-5 rounded-[1.5rem] border transition-all ${paymentMethod === 'ONLINE' ? 'bg-orange-500/20 border-orange-500/40 text-white shadow-lg shadow-orange-500/10' : 'bg-white/5 border-white/10 text-slate-500'}`}>
                                 <CreditCard size={24} className={paymentMethod === 'ONLINE' ? 'text-orange-500' : ''} />
                                 <span className="text-[10px] font-black uppercase tracking-widest">Digital Pay</span>
                             </button>
                         </div>
                    </div>

                    <div className="p-6 bg-black/40 rounded-[2rem] border border-white/5 relative z-10 shadow-inner">
                        <div className="flex justify-between text-xs font-bold text-slate-500 mb-4">
                             <span className="flex items-center gap-2 uppercase tracking-widest">
                                 <ShoppingBag size={12} /> Items ({cart.length})
                             </span>
                             <span>{fmt(cartTotal)}</span>
                        </div>
                        <div className="h-px bg-white/5 mb-4"></div>
                        <div className="flex justify-between items-end relative">
                             <div>
                                 <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-1">Grand Total</p>
                                 <h2 className="text-4xl font-black text-white tracking-tighter">{fmt(cartTotal)}</h2>
                             </div>
                             <div className="p-2 bg-orange-500/10 rounded-xl">
                                <TrendingUp size={20} className="text-orange-500" />
                             </div>
                        </div>
                    </div>

                    {view === 'menu' ? (
                        <button 
                            disabled={cart.length === 0}
                            onClick={() => setView('cart')}
                            className="w-full py-5 rounded-[1.5rem] bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm uppercase tracking-widest transition-all shadow-2xl shadow-indigo-600/20 disabled:opacity-30 flex items-center justify-center gap-3 relative z-10 group"
                        >
                            Review Order
                            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    ) : (
                        <button 
                            disabled={submitting || cart.length === 0}
                            onClick={placeOrder}
                            className="w-full py-5 rounded-[1.5rem] bg-orange-500 hover:bg-orange-600 text-white font-black text-sm uppercase tracking-widest transition-all shadow-2xl shadow-orange-600/30 disabled:opacity-30 flex items-center justify-center gap-3 relative z-10"
                        >
                            {submitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                            Finalize Order
                        </button>
                    )}

                    <div className="flex items-center gap-2 justify-center text-[10px] font-black text-slate-700 uppercase tracking-widest relative z-10">
                        <Info size={12} /> Secured by SaySavor Core
                    </div>
                </div>
            </div>
        </div>
    );
};

export default POSTab;
