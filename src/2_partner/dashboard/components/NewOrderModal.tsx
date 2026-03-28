// ============================================================
// FILE: NewOrderModal.tsx
// SECTION: 2_partner > dashboard > components
// PURPOSE: Partner manually naya order create kar sakta hai is modal se.
//          Dine-in ya delivery type choose kiya jata hai.
// ============================================================
import React, { useEffect, useState } from 'react';
import { supabase } from '@/shared/lib/supabaseClient';
import { MenuItem } from '@/shared/types/menu';
import { PaymentStatus } from '@/shared/types/paymentTypes';
import { X, Search, Plus, Minus, Trash2, ShoppingCart, User, Phone, MapPin, Coffee, Utensils, Hash } from 'lucide-react';
import { toast } from 'sonner';

interface NewOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    restaurantId: string;
    onOrderPlaced: () => void;
    defaultTableNo?: string;
    defaultOrderType?: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
    defaultCustomerName?: string;
    defaultCustomerPhone?: string;
    defaultDeliveryAddress?: string;
    formatPrice?: (price: number) => string;
}

export default function NewOrderModal({
    isOpen,
    onClose,
    restaurantId,
    onOrderPlaced,
    defaultTableNo,
    defaultOrderType,
    defaultCustomerName,
    defaultCustomerPhone,
    defaultDeliveryAddress,
    formatPrice = (p: number) => p.toLocaleString('en', { maximumFractionDigits: 0 })
}: NewOrderModalProps) {
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    // Cart State
    const [cart, setCart] = useState<any[]>([]);

    // Custom Item State
    const [customItemName, setCustomItemName] = useState('');
    const [customItemPrice, setCustomItemPrice] = useState('');
    const [customItemNote, setCustomItemNote] = useState('');

    // Order Details State
    const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'>('DINE_IN');
    const [tableNo, setTableNo] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Variant Modal State
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
    const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [itemNote, setItemNote] = useState('');

    useEffect(() => {
        if (!isOpen) return;

        // Lock Body Scroll
        document.body.classList.add('no-scroll');

        if (!restaurantId) {
            document.body.classList.remove('no-scroll');
            return;
        }

        if (defaultTableNo) setTableNo(defaultTableNo);
        if (defaultOrderType) setOrderType(defaultOrderType);
        if (defaultCustomerName) setCustomerName(defaultCustomerName);
        if (defaultCustomerPhone) setCustomerPhone(defaultCustomerPhone);
        if (defaultDeliveryAddress) setDeliveryAddress(defaultDeliveryAddress);

        const fetchCatalog = async () => {
            setLoading(true);
            try {
                const { data: catData } = await supabase
                    .from('categories')
                    .select('*')
                    .eq('restaurant_id', restaurantId)
                    .order('sort_order');
                setCategories(catData || []);

                const { data: menuData } = await supabase
                    .from('menu_items')
                    .select('*, categories(name)')
                    .eq('restaurant_id', restaurantId)
                    .eq('is_available', true);

                let formattedData: any[] = menuData || [];
                if (formattedData.length > 0) {
                    const itemIds = formattedData.map((item: any) => item.id);

                    const chunkSize = 50;
                    let allVariants: any[] = [];
                    for (let i = 0; i < itemIds.length; i += chunkSize) {
                        const chunk = itemIds.slice(i, i + chunkSize);
                        const { data } = await (supabase as any)
                            .from('menu_variants')
                            .select('*')
                            .in('item_id', chunk);
                        if (data) allVariants = [...allVariants, ...data];
                    }

                    let variantsByItem: Record<string, any[]> = {};
                    if (allVariants.length > 0) {
                        for (const v of allVariants) {
                            if (!variantsByItem[v.item_id]) variantsByItem[v.item_id] = [];
                            variantsByItem[v.item_id].push(v);
                        }
                    }

                    formattedData = formattedData.map((item: any) => ({
                        ...item,
                        variants: variantsByItem[item.id] || []
                    }));
                }

                setMenuItems(formattedData as MenuItem[]);
            } catch (err) {
                console.error("Failed to fetch menu:", err);
                toast.error("Failed to load generic menu for POS");
            } finally {
                setLoading(false);
            }
        };

        fetchCatalog();

        return () => {
            document.body.classList.remove('no-scroll');
        };
    }, [isOpen, restaurantId]);

    if (!isOpen) return null;

    // Derived States
    let displayedItems = menuItems;
    if (activeCategory !== 'all') {
        displayedItems = displayedItems.filter(item => item.category_id === activeCategory);
    }
    if (searchQuery) {
        displayedItems = displayedItems.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);

    const handleAddToCart = () => {
        if (!selectedItem) return;

        let finalPrice = selectedItem.price;
        let variantInfo = itemNote.trim() ? `For: ${itemNote.trim()}` : null;

        if (selectedVariant) {
            finalPrice = selectedVariant.price;
            variantInfo = selectedVariant.name + (itemNote.trim() ? ` | For: ${itemNote.trim()}` : '');
        }

        const newItem = {
            id: Math.random().toString(36).substr(2, 9),
            menuItem: selectedItem,
            variant: selectedVariant,
            quantity,
            unitPrice: finalPrice,
            totalPrice: finalPrice * quantity,
            variantInfo
        };

        setCart([...cart, newItem]);
        setSelectedItem(null);
        setSelectedVariant(null);
        setQuantity(1);
        setItemNote('');
        toast.success(`Added ${selectedItem.name} to ticket`);
    };

    const handleAddCustomItem = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = customItemName.trim();
        const price = parseFloat(customItemPrice);

        if (!trimmedName || isNaN(price) || price < 0) {
            toast.error("Invalid custom item details");
            return;
        }

        const customItem = {
            id: 'custom_' + Math.random().toString(36).substr(2, 9),
            menuItem: { id: 'custom', name: trimmedName, price: price, category_id: 'custom' },
            variant: null,
            quantity: 1,
            unitPrice: price,
            totalPrice: price,
            variantInfo: customItemNote.trim() ? `For: ${customItemNote.trim()}` : 'Quick Add'
        };

        setCart([...cart, customItem]);
        setCustomItemName('');
        setCustomItemPrice('');
        setCustomItemNote('');
        toast.success(`Added ${trimmedName} to ticket`);
    };

    const handlePlaceOrder = async () => {
        if (cart.length === 0) return toast.error("Cart is empty!");
        if (orderType === 'DINE_IN' && !tableNo) return toast.error("Table Number is required for Dine-in");

        setIsSubmitting(true);
        try {
            const currentTotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);

            // Check for existing open table session
            let existingOrderId = null;
            if (orderType === 'DINE_IN') {
                const { data: openOrders } = await (supabase as any)
                    .from('orders')
                    .select('id, total_amount')
                    .eq('restaurant_id', restaurantId)
                    .eq('table_number', parseInt(tableNo))
                    .eq('session_status', 'OPEN')
                    .limit(1);

                if (openOrders && openOrders.length > 0) {
                    existingOrderId = openOrders[0].id;
                    const { error: updateOrderError } = await (supabase as any)
                        .from('orders')
                        .update({ total_amount: openOrders[0].total_amount + currentTotal })
                        .eq('id', existingOrderId);
                    if (updateOrderError) throw updateOrderError;
                }
            }

            let finalOrderId = existingOrderId;

            // If no existing ticket, create new
            if (!finalOrderId) {
                const { data: newOrder, error: orderError } = await (supabase as any)
                    .from('orders')
                    .insert({
                        restaurant_id: restaurantId,
                        table_number: orderType === 'DINE_IN' ? parseInt(tableNo) : null,
                        customer_name: customerName || null,
                        customer_phone: customerPhone || null,
                        customer_address: orderType === 'DELIVERY' ? deliveryAddress : null,
                        order_type: orderType,
                        total_amount: currentTotal,
                        session_status: orderType === 'DINE_IN' ? 'OPEN' : 'CLOSED',
                        payment_status: PaymentStatus.PENDING,
                        status: 'pending' // Kitchen status
                    })
                    .select()
                    .single();

                if (orderError) throw orderError;
                finalOrderId = newOrder?.id || null;
            }

            // Insert Items
            const itemsToInsert = cart.map(item => ({
                order_id: finalOrderId,
                menu_item_id: item.menuItem.id === 'custom' ? null : item.menuItem.id, // Custom items don't have menu ID
                item_name: item.variantInfo ? `${item.menuItem.name} (${item.variantInfo})` : item.menuItem.name,
                quantity: item.quantity,
                unit_price: item.unitPrice,
                total_price: item.totalPrice,
                variant_details: item.variant ? { id: item.variant.id, name: item.variant.name } : null
            }));

            const { error: itemsError } = await (supabase as any).from('order_items').insert(itemsToInsert);
            if (itemsError) throw itemsError;

            toast.success(existingOrderId ? 'Added to running table bill!' : 'New ticket created successfully!');
            setCart([]);
            onOrderPlaced();
            onClose();

        } catch (e: any) {
            console.error("Manual order failed:", e);
            toast.error(e.message || "Failed to place manual order");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex overflow-y-auto bg-zinc-900/80 backdrop-blur-md antialiased text-left p-0 md:p-4 lg:p-8 custom-scrollbar">
            <div className="w-full min-h-full max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-0 md:gap-4 xl:gap-6 bg-slate-100 md:bg-transparent">

                {/* 1. LEFT PANEL: Categories Sidebar (approx 20%) */}
                <div className="w-64 hidden lg:flex flex-col bg-slate-50 border border-zinc-200 rounded-2xl shadow-xl overflow-hidden shrink-0 min-w-0">
                    <div className="px-5 py-4 bg-white border-b border-zinc-200 shrink-0">
                        <h2 className="text-xl font-black text-zinc-900 flex items-center gap-2">
                            <Utensils className="w-5 h-5 text-zinc-400" /> Categories
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-1">
                        <button
                            onClick={() => setActiveCategory('all')}
                            className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-all flex items-center gap-3 ${activeCategory === 'all' ? 'bg-zinc-900 text-white shadow-md' : 'text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900'}`}
                        >
                            <span className="w-2 h-2 rounded-full bg-current opacity-60"></span>
                            All Items
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-all flex items-center gap-3 ${activeCategory === cat.id ? 'bg-zinc-900 text-white shadow-md' : 'text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900'}`}
                            >
                                <span className="w-2 h-2 rounded-full bg-current opacity-60"></span>
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 2. MIDDLE PANEL: Grid & Custom Item (approx 50%) */}
                <div className="flex-1 flex flex-col bg-slate-50 rounded-2xl shadow-xl overflow-hidden border border-zinc-200 min-w-0 relative">
                    {/* Header: Search */}
                    <div className="px-5 py-3 border-b border-zinc-200 bg-white shadow-sm z-10 flex gap-4 items-center shrink-0">
                        <div className="relative flex-1 max-w-md">
                            <input
                                type="text"
                                placeholder="Search all items..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-zinc-100 rounded-full text-sm font-bold text-zinc-900 placeholder:text-zinc-500 focus:outline-none border border-transparent focus:border-zinc-300 focus:bg-white focus:shadow-sm transition-all"
                            />
                            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                        </div>
                    </div>

                    {/* Quick Add Custom Item (Hybrid Approach) */}
                    <div className="px-5 py-3 bg-white border-b border-zinc-100 shrink-0">
                        <form onSubmit={handleAddCustomItem} className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Quick add custom item (e.g. Cold Drink)"
                                value={customItemName}
                                onChange={e => setCustomItemName(e.target.value)}
                                className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm font-bold text-zinc-900 placeholder:font-medium focus:outline-none focus:border-zinc-400 focus:bg-white transition-colors"
                            />
                            <div className="relative w-28 shrink-0">
                                <input
                                    type="number"
                                    placeholder="0"
                                    min="0"
                                    value={customItemPrice}
                                    onChange={e => setCustomItemPrice(e.target.value)}
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm font-bold text-zinc-900 focus:outline-none focus:border-zinc-400 focus:bg-white transition-colors"
                                />
                            </div>
                            <button type="submit" disabled={!customItemName || !customItemPrice} className="bg-zinc-900 text-white px-5 py-2 rounded-lg font-bold text-sm disabled:opacity-40 hover:bg-zinc-800 transition-all flex items-center gap-1.5 shadow-sm active:scale-95">
                                <Plus className="w-4 h-4" /> Add
                            </button>
                        </form>
                    </div>

                    {/* Mobile Category Horizontal Strip (Hidden on Desktop) */}
                    <div className="lg:hidden px-4 py-3 bg-white border-b border-zinc-100 overflow-x-auto whitespace-nowrap hide-scrollbar shrink-0 flex gap-2">
                        <button
                            onClick={() => setActiveCategory('all')}
                            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${activeCategory === 'all' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
                        >
                            All Items
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${activeCategory === cat.id ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    {/* Menu Items Grid */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-5">
                        {loading ? (
                            <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-zinc-900 border-t-transparent flex-shrink-0 animate-spin rounded-full"></div></div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                                {displayedItems.map(item => (
                                    <div
                                        key={item.id}
                                        onClick={() => {
                                            setSelectedItem(item);
                                            if (item.variants && item.variants.length > 0) setSelectedVariant(item.variants[0]);
                                            else setSelectedVariant(null);
                                            setQuantity(1);
                                        }}
                                        className="bg-white rounded-xl p-2.5 border border-transparent shadow-sm hover:border-zinc-300 hover:shadow-md transition-all cursor-pointer group flex items-stretch gap-3 min-h-[5rem]"
                                    >
                                        <div className="w-[4.5rem] h-[4.5rem] bg-zinc-100 rounded-lg shrink-0 overflow-hidden border border-zinc-200/50 flex items-center justify-center">
                                            {item.image_url ? (
                                                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                            ) : (
                                                <Coffee className="w-6 h-6 text-zinc-300" />
                                            )}
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between py-0.5 pr-1 min-w-0">
                                            <h3 className="font-bold text-zinc-900 text-[13px] leading-snug line-clamp-2 truncate-multiline">
                                                {item.name}
                                            </h3>
                                            <div className="flex items-center justify-between mt-1">
                                                <span className="font-black text-zinc-900 text-[14px] bg-zinc-100 px-1.5 py-0.5 rounded-md leading-none">{formatPrice(item.price)}</span>
                                                <div className="w-6 h-6 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center group-hover:bg-zinc-900 group-hover:text-white transition-colors border border-transparent group-hover:border-zinc-900 shadow-sm">
                                                    <Plus className="w-3.5 h-3.5" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. RIGHT PANEL: Ticket / Cart (approx 30%) */}
                <div className="w-80 lg:w-[350px] xl:w-[400px] flex flex-col bg-slate-50 rounded-2xl shadow-xl border border-zinc-200 overflow-hidden flex-shrink-0 min-w-0 max-w-md">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 bg-zinc-900 text-white shrink-0">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <ShoppingCart className="w-4 h-4" /> Current Ticket
                        </h2>
                        <button onClick={onClose} className="w-7 h-7 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center justify-center border border-white/5 shadow-sm">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Order Details Form */}
                    <div className="p-4 border-b border-zinc-200 shrink-0 bg-white space-y-3 z-10 shadow-sm relative">
                        <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-100 rounded-lg border border-zinc-200">
                            {['DINE_IN', 'TAKEAWAY', 'DELIVERY'].map(type => (
                                <button
                                    key={type}
                                    onClick={() => setOrderType(type as any)}
                                    className={`py-1.5 text-[11px] font-bold rounded-md transition-all uppercase tracking-wider ${orderType === type ? 'bg-white shadow text-zinc-900' : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/50'}`}
                                >
                                    {type.replace('_', ' ')}
                                </button>
                            ))}
                        </div>

                        {orderType === 'DINE_IN' && (
                            <div className="relative">
                                <Hash className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                                <input type="number" placeholder="Table Number" value={tableNo} onChange={e => setTableNo(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg pl-9 pr-3 py-2 text-sm font-bold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 focus:bg-white transition-colors" />
                            </div>
                        )}

                        <div className="relative">
                            <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                            <input type="text" placeholder="Customer Name (Optional)" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg pl-9 pr-3 py-2 text-sm font-bold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 focus:bg-white transition-colors" />
                        </div>

                        {(orderType === 'DELIVERY' || orderType === 'TAKEAWAY') && (
                            <div className="relative">
                                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                                <input type="text" placeholder="Phone Number" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg pl-9 pr-3 py-2 text-sm font-bold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 focus:bg-white transition-colors" />
                            </div>
                        )}

                        {orderType === 'DELIVERY' && (
                            <div className="relative">
                                <MapPin className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                                <textarea placeholder="Full Delivery Address" rows={2} value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg pl-9 pr-3 py-2 text-sm font-bold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 focus:bg-white transition-colors resize-none" />
                            </div>
                        )}
                    </div>

                    {/* Cart Items List */}
                    <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-3 opacity-60">
                                <div className="w-16 h-16 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-400 mb-2">
                                    <ShoppingCart className="w-7 h-7" />
                                </div>
                                <p className="font-bold text-sm tracking-wide">Ticket is empty</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {cart.map((item, idx) => (
                                    <div key={item.id} className="flex justify-between items-start group bg-white p-3 rounded-xl border border-zinc-200 shadow-sm relative overflow-hidden">
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-zinc-900"></div>
                                        <div className="flex-1 pl-2 pr-3 min-w-0">
                                            <div className="flex items-start gap-2">
                                                <span className="font-black text-zinc-900 text-sm mt-[2px]">{item.quantity}x</span>
                                                <span className="font-bold text-zinc-800 text-sm leading-tight">{item.menuItem.name}</span>
                                            </div>
                                            {item.variantInfo && <p className="text-[11px] font-bold text-zinc-500 ml-6 mt-0.5 px-1.5 py-0.5 bg-zinc-100 w-fit rounded">{item.variantInfo}</p>}
                                        </div>
                                        <div className="flex flex-col items-end justify-between self-stretch">
                                            <span className="font-black text-zinc-900 font-mono text-sm leading-none">{formatPrice(item.totalPrice)}</span>
                                            <button onClick={() => setCart(cart.filter(c => c.id !== item.id))} className="text-zinc-400 hover:text-red-500 bg-zinc-50 hover:bg-red-50 p-1.5 rounded-lg transition-colors border border-transparent shadow-sm hover:border-red-100">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Checkout Footer */}
                    <div className="p-5 bg-white border-t border-zinc-200 shrink-0 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)] relative z-20">
                        <div className="flex justify-between items-end mb-4">
                            <span className="text-zinc-500 font-bold uppercase tracking-wider text-xs">Subtotal</span>
                            <span className="text-2xl font-black text-zinc-900 leading-none">{formatPrice(subtotal)}</span>
                        </div>
                        <button
                            disabled={cart.length === 0 || isSubmitting}
                            onClick={handlePlaceOrder}
                            className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed disabled:shadow-none text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                        >
                            {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white animate-spin rounded-full"></div> : null}
                            <span>Punch Order</span>
                        </button>
                    </div>
                </div>

            </div>

            {/* Variant Selection Modal (Overlays the POS) */}
            {selectedItem && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-zinc-200">
                        <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
                            <h3 className="font-black text-lg text-zinc-900 line-clamp-1">{selectedItem.name}</h3>
                            <button onClick={() => setSelectedItem(null)} className="w-8 h-8 flex flex-col justify-center items-center bg-white border border-zinc-200 shadow-sm hover:bg-zinc-100 rounded-full text-zinc-500 transition-colors"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="p-5 bg-white">
                            {selectedItem.variants && selectedItem.variants.length > 0 && (
                                <div className="space-y-2 mb-6">
                                    <label className="font-bold text-xs text-zinc-400 uppercase tracking-widest pl-1">Select Variant</label>
                                    <div className="grid grid-cols-1 gap-2 border border-zinc-100 bg-zinc-50 p-2 rounded-xl">
                                        {selectedItem.variants.map((v: any) => (
                                            <button
                                                key={v.id}
                                                onClick={() => setSelectedVariant(v)}
                                                className={`flex justify-between items-center p-3 border-2 rounded-xl text-left transition-all bg-white ${selectedVariant?.id === v.id ? 'border-zinc-900 shadow-sm' : 'border-transparent hover:border-zinc-300'}`}
                                            >
                                                <span className={`font-bold ${selectedVariant?.id === v.id ? 'text-zinc-900' : 'text-zinc-600'}`}>{v.name}</span>
                                                <span className="font-black text-zinc-400 text-sm">+ {formatPrice(v.price)}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-100 px-2 mt-4">
                                <span className="font-bold text-zinc-400 uppercase tracking-widest text-xs">Quantity</span>
                                <div className="flex items-center gap-3 bg-zinc-100 p-1.5 rounded-full border border-zinc-200 shadow-inner">
                                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-zinc-50 border border-transparent hover:border-zinc-200 text-zinc-600 transition-all"><Minus className="w-4 h-4" /></button>
                                    <span className="font-black text-lg w-8 text-center text-zinc-900">{quantity}</span>
                                    <button onClick={() => setQuantity(quantity + 1)} className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-zinc-50 border border-transparent hover:border-zinc-200 text-zinc-600 transition-all"><Plus className="w-4 h-4" /></button>
                                </div>
                            </div>

                            <button
                                onClick={handleAddToCart}
                                className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold transition-all shadow-md active:scale-95 flex justify-between items-center px-6"
                            >
                                <span>Add to Ticket</span>
                                <span className="bg-white/20 px-2 py-1 rounded bg-transparent font-black shadow-inner">{formatPrice((selectedVariant?.price || selectedItem.price) * quantity)}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
