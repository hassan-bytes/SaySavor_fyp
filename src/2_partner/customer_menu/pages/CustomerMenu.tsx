// ============================================================
// FILE: CustomerMenu.tsx
// SECTION: 2_partner > customer_menu > pages
// PURPOSE: Customer ka menu page â€” QR scan karne ke baad yeh khulta hai.
//          Menu items dekhna, cart mein add karna, order place karna.
//          Supabase se real-time data aata hai.
//          Voice aur AI scanner se bhi order ho sakta hai.
// ROUTE: /menu/:restaurantId (Public â€” koi bhi dekh sakta hai)
// ============================================================
import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/shared/lib/supabaseClient';
import { MenuItem } from '@/shared/types/menu';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Plus, Clock, Sparkles, ChevronDown, X, MapPin, Phone, ShoppingCart, Minus, Trash2, ArrowRight, Search, Filter, BellRing, CheckCircle, ChefHat, Package, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/shared/ui/badge';
import { DynamicFoodImage } from '@/2_partner/setup/pages/RestaurantSetup';
import DealMosaicImage from '@/2_partner/dashboard/components/DealMosaicImage';
import { formatPrice, resolveCurrency, CurrencyInfo, DEFAULT_CURRENCY } from '@/shared/lib/currencyUtils';
import StripeWrapper from '@/shared/components/Stripe/StripeWrapper';
import { CreditCard, Banknote } from 'lucide-react';

export default function CustomerMenu() {
    const { restaurantId } = useParams<{ restaurantId: string }>();
    const [searchParams] = useSearchParams();
    const tableNo = searchParams.get('table');

    const [restaurantInfo, setRestaurantInfo] = useState<{ name: string; logo_url: string | null; address: string; phone: string; currency: CurrencyInfo } | null>(null);
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

    // Search and Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCuisine, setSelectedCuisine] = useState<string | 'all'>('all');

    // Selection Modal State
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
    const [selectedVariants, setSelectedVariants] = useState<any[]>([]);
    const [selectedAddons, setSelectedAddons] = useState<any[]>([]);
    const [quantity, setQuantity] = useState(1);

    // Cart & Order State
    const [cart, setCart] = useState<any[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [orderNote, setOrderNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRequestingBill, setIsRequestingBill] = useState(false);

    // New Stripe/Payment State
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'ONLINE'>('CASH');
    const [showStripe, setShowStripe] = useState(false);

    // Custom QR Validation State
    const [isValidTable, setIsValidTable] = useState<boolean | null>(null);

    // Live Order Status Tracking
    const [activeOrder, setActiveOrder] = useState<any>(null);

    useEffect(() => {
        if (!restaurantId || !tableNo) return;

        const fetchActiveOrder = async () => {
            const { data } = await supabase
                .from('orders')
                .select('*')
                .eq('restaurant_id', restaurantId)
                .eq('table_number', parseInt(tableNo))
                .in('status', ['pending', 'accepted', 'cooking', 'ready'])
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (data) setActiveOrder(data);
        };

        fetchActiveOrder();

        const channel = supabase.channel(`customer-table-${tableNo}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
                (payload) => {
                    const newOrder = payload.new as any;

                    setActiveOrder(prevOrder => {
                        // If an order is already active on this phone, check by its unique ID
                        if (prevOrder && prevOrder.id === newOrder.id) {
                            if (['pending', 'accepted', 'cooking', 'ready'].includes(newOrder.status)) {
                                return { ...prevOrder, ...newOrder }; // Merge updates like total_amount or status
                            } else {
                                // Status changed to delivered, cancelled, etc.
                                return null;
                            }
                        }

                        // If there is NO active order, and a new one was just INSERTED for this table
                        // (INSERT payloads always contain all columns including table_number)
                        if (!prevOrder && newOrder.table_number == tableNo) {
                            if (['pending', 'accepted', 'cooking', 'ready'].includes(newOrder.status)) {
                                return { ...newOrder };
                            }
                        }

                        return prevOrder;
                    });
                }
            ).subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [restaurantId, tableNo]);

    useEffect(() => {
        const checkTableAccess = async () => {
            if (!restaurantId || !tableNo) {
                setIsValidTable(true);
                return;
            }
            try {
                // Fetch the restaurant's owner_id
                const { data: restData } = await supabase
                    .from('restaurants')
                    .select('owner_id')
                    .eq('id', restaurantId)
                    .single();

                if (restData) {
                    // Try calling an RPC to validate table number securely without exposing auth.users
                    const { data: isValid, error: rpcError } = await (supabase as any).rpc('validate_table_access', {
                        r_id: restaurantId,
                        t_no: parseInt(tableNo)
                    });

                    // If RPC exists and returns false, block. If RPC fails, fallback to letting them in for now.
                    if (!rpcError && isValid === false) {
                        setIsValidTable(false);
                    } else {
                        setIsValidTable(true);
                    }
                } else {
                    setIsValidTable(false);
                }
            } catch (error) {
                console.error("Table validation check failed:", error);
                setIsValidTable(true);
            }
        };

        checkTableAccess();
    }, [restaurantId, tableNo]);

    // Body scroll lock when modals are open
    useEffect(() => {
        if (selectedItem || isCartOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [selectedItem, isCartOpen]);

    useEffect(() => {
        const fetchMenuData = async () => {
            console.log("CustomerMenu: fetchMenuData started with restaurantId =", restaurantId, "isValidTable =", isValidTable);
            if (!restaurantId || isValidTable !== true) return;

            try {
                console.log("Fetching Restaurant Info...");
                // Fetch Restaurant Info
                const { data: restData, error: restError } = await supabase
                    .from('restaurants')
                    .select('name, logo_url, address, phone, currency')
                    .eq('id', restaurantId)
                    .single() as { data: any, error: any };

                console.log("Restaurant Info fetched:", restData, "Error:", restError);
                if (restError || !restData) throw restError || new Error("Restaurant not found");

                // Resolve currency from stored code or phone number
                const currencyInfo = restData.currency
                    ? resolveCurrency(restData.currency)
                    : resolveCurrency(restData.phone);

                setRestaurantInfo({
                    name: restData.name,
                    logo_url: restData.logo_url,
                    address: restData.address,
                    phone: restData.phone,
                    currency: currencyInfo
                });

                console.log("Fetching Categories...");
                // Fetch Categories
                const { data: catData, error: catError } = await supabase
                    .from('categories')
                    .select('*')
                    .eq('restaurant_id', restaurantId)
                    .order('sort_order');

                console.log("Categories fetched:", catData, "Error:", catError);
                if (catError) throw catError;
                const sortedCategories = catData || [];
                setCategories(sortedCategories);
                // Categories remain collapsed by default

                console.log("Fetching Menu Items...");
                // Fetch Menu Items (Available only)
                const { data: menuData, error: menuError } = await supabase
                    .from('menu_items')
                    .select('*, categories(name)')
                    .eq('restaurant_id', restaurantId)
                    .eq('is_available', true);

                console.log("Menu Items fetched:", menuData, "Error:", menuError);
                if (menuError) throw menuError;

                // Fetch Variants Separately
                let formattedData: any[] = menuData || [];
                if (formattedData.length > 0) {
                    const itemIds = formattedData.map((item: any) => item.id);
                    console.log("Fetching Variants for items:", itemIds.length);

                    // Supabase URL size limit workaround:
                    // Fetch in chunks of 50 items to keep GET requests smaller
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

                    console.log("Variants fetched:", allVariants?.length);

                    let variantsByItem: Record<string, any[]> = {};
                    if (allVariants) {
                        for (const v of allVariants) {
                            if (!variantsByItem[v.item_id]) variantsByItem[v.item_id] = [];
                            variantsByItem[v.item_id].push(v);
                        }
                    }

                    console.log("Fetching Modifier Groups...");
                    // Same chunking workaround for modifier groups
                    let allGroups: any[] = [];

                    for (let i = 0; i < itemIds.length; i += chunkSize) {
                        const chunk = itemIds.slice(i, i + chunkSize);
                        const { data } = await (supabase as any)
                            .from('menu_modifier_groups')
                            .select('*, menu_modifiers(*)')
                            .in('item_id', chunk);
                        if (data) allGroups = [...allGroups, ...data];
                    }

                    console.log("Modifier Groups fetched:", allGroups?.length);

                    let modifierGroupsByItem: Record<string, any[]> = {};
                    if (allGroups) {
                        for (const group of allGroups) {
                            if (!modifierGroupsByItem[group.item_id]) modifierGroupsByItem[group.item_id] = [];
                            modifierGroupsByItem[group.item_id].push({
                                ...group,
                                modifiers: group.menu_modifiers || []
                            });
                        }
                    }

                    formattedData = formattedData.map((item: any) => ({
                        ...item,
                        category: item.categories?.name || item.category || 'Uncategorized',
                        variants: variantsByItem[item.id] || [],
                        modifier_groups: modifierGroupsByItem[item.id] || []
                    }));
                }

                console.log("Setting final menu items...");
                setMenuItems(formattedData);

            } catch (error) {
                console.error("Error fetching menu:", error);
                toast.error("Failed to load the menu. Please try again.");
            } finally {
                console.log("fetchMenuData finally block, setting loading false");
                setLoading(false);
            }
        };

        fetchMenuData();
    }, [restaurantId, isValidTable]);

    // Derived Filters
    const uniqueCuisines = Array.from(new Set(menuItems.map(i => i.cuisine).filter(Boolean))) as string[];

    const displayCategories = categories.map(category => {
        const categoryItems = menuItems.filter(item => {
            if (item.category !== category.name) return false;

            const query = searchQuery.toLowerCase();
            const matchesSearch = !query ||
                item.name.toLowerCase().includes(query) ||
                (item.description && item.description.toLowerCase().includes(query)) ||
                item.category.toLowerCase().includes(query) ||
                (item.cuisine && item.cuisine.toLowerCase().includes(query));

            const matchesCuisine = selectedCuisine === 'all' || item.cuisine === selectedCuisine;

            return matchesSearch && matchesCuisine;
        });

        return {
            ...category,
            items: categoryItems
        };
    }).filter(cat => cat.items.length > 0);

    // Auto-expand categories if user is actively searching or filtering
    useEffect(() => {
        if (searchQuery || selectedCuisine !== 'all') {
            setExpandedCategories(displayCategories.map(c => c.id));
        }
    }, [searchQuery, selectedCuisine, menuItems]);

    if (isValidTable === false) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
                    <X className="w-10 h-10 text-red-500" />
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-3">Invalid Table URL</h1>
                <p className="text-slate-500 text-lg max-w-md">
                    This QR code is no longer valid or this table has been removed from the system.
                </p>
                <div className="mt-8 p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <p className="text-amber-800 font-medium">Please ask a staff member for assistance or to provide a new QR code.</p>
                </div>
            </div>
        );
    }

    if (loading || isValidTable === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
            </div>
        );
    }

    if (!restaurantInfo) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
                <h1 className="text-2xl font-bold text-slate-800 mb-2">Restaurant Not Found</h1>
                <p className="text-slate-500">The QR code you scanned might be invalid or expired.</p>
            </div>
        );
    }

    const getCurrencySymbol = () => {
        return restaurantInfo?.currency?.symbol || DEFAULT_CURRENCY.symbol;
    };

    // Helper to format prices using restaurant's currency
    const formatPriceDisplay = (price: number) => {
        return formatPrice(price, restaurantInfo?.currency || DEFAULT_CURRENCY);
    };

    const currencySymbol = getCurrencySymbol();

    const toggleCategory = (categoryId: string) => {
        setExpandedCategories(prev =>
            prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId]
        );
    };

    const handleOpenItemModal = (item: MenuItem) => {
        setSelectedItem(item);

        // Auto-select first available variant if variants exist
        const availableVariants = item.variants?.filter(v => typeof v.stock_count !== 'number' || v.stock_count > 0) || [];
        if (availableVariants.length > 0) {
            setSelectedVariants([availableVariants[0]]);
        } else {
            setSelectedVariants([]);
        }

        setSelectedAddons([]);
        setQuantity(1);
    };

    const handleCloseModal = () => {
        setSelectedItem(null);
        setSelectedVariants([]);
        setSelectedAddons([]);
        setQuantity(1);
    };

    const toggleVariant = (variant: any) => {
        setSelectedVariants(prev => {
            const exists = prev.find(v => v.id === variant.id);
            if (exists) return prev.filter(v => v.id !== variant.id);
            return [...prev, variant];
        });
    };

    const toggleAddon = (addon: any) => {
        setSelectedAddons(prev => {
            const exists = prev.find(a => a.id === addon.id);
            if (exists) return prev.filter(a => a.id !== addon.id);
            return [...prev, addon];
        });
    };

    const calculateModalTotal = () => {
        if (!selectedItem) return 0;
        let base = selectedItem.price;
        let variantsTotal = 0;

        if (selectedVariants.length > 0) {
            variantsTotal = selectedVariants.reduce((sum, v) => sum + (v.price || 0), 0);
            base = 0; // If variants are selected, their combined price handles the base cost
        }

        let addonsTotal = selectedAddons.reduce((sum, a) => sum + (a.price || 0), 0);
        return (base + variantsTotal + addonsTotal) * quantity;
    };

    const handleAddToCart = () => {
        // Prepare cart item payload
        if (!selectedItem) return;

        if (selectedItem.variants && selectedItem.variants.length > 0 && selectedVariants.length === 0) {
            toast.error("Please select at least one option.");
            return;
        }

        const cartItem = {
            id: Math.random().toString(36).substr(2, 9),
            item: selectedItem,
            variants: selectedVariants,
            addons: selectedAddons,
            quantity: quantity,
            totalPrice: calculateModalTotal()
        };

        setCart(prev => [...prev, cartItem]);
        toast.success(`${quantity}x ${selectedItem.name} added!`);
        handleCloseModal();
    };

    const handleUpdateCartQuantity = (id: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQuantity = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQuantity };
            }
            return item;
        }));
    };

    const handleRemoveFromCart = (id: string) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const calculateCartTotal = () => {
        return cart.reduce((total, item) => total + (item.totalPrice * item.quantity), 0);
    };

    const handlePlaceOrder = async (isAlreadyPaid: boolean = false) => {
        if (!restaurantId) return;
        if (cart.length === 0) {
            toast.error("Your cart is empty");
            return;
        }

        const trimmedName = customerName.trim();
        if (!trimmedName) {
            toast.error("Please enter your name for the order");
            return;
        }

        setIsSubmitting(true);
        try {
            const grandTotal = calculateCartTotal();
            const orderType = tableNo ? 'DINE_IN' : 'DELIVERY';

            // If Online Payment is selected and not yet processed, show Stripe UI
            if (paymentMethod === 'ONLINE' && !showStripe && !isAlreadyPaid) {
                setShowStripe(true);
                setIsSubmitting(false);
                return;
            }

            let activeOrderId = null;

            // 1. If Dine-In, check for an existing OPEN session for this table
            if (tableNo) {
                const { data: existingOrder, error: checkError } = await (supabase as any)
                    .from('orders')
                    .select('id, total_amount')
                    .eq('restaurant_id', restaurantId)
                    .eq('table_number', tableNo)
                    .eq('session_status', 'OPEN')
                    .neq('status', 'cancelled')
                    .maybeSingle();

                if (!checkError && existingOrder) {
                    activeOrderId = existingOrder.id;
                    // Update the grand total of the existing order
                    await (supabase as any)
                        .from('orders')
                        .update({ total_amount: existingOrder.total_amount + grandTotal })
                        .eq('id', activeOrderId);
                }
            }

            // 2. If no active session found, create a new Order
            if (!activeOrderId) {
                const { data: newOrderData, error: orderInsertError } = await (supabase as any)
                    .from('orders')
                    .insert({
                        restaurant_id: restaurantId,
                        table_number: tableNo || null,
                        customer_name: orderNote.trim() ? `${trimmedName} (${orderNote.trim()})` : trimmedName,
                        customer_phone: customerPhone.trim() || null,
                        order_type: orderType,
                        total_amount: grandTotal,
                        session_status: 'OPEN',
                        payment_status: paymentMethod === 'ONLINE' ? 'PAID' : 'PENDING',
                        payment_method: paymentMethod
                    })
                    .select('id');

                if (orderInsertError) throw orderInsertError;

                // Fallback in case RLS prevents returning the inserted row
                if (newOrderData && newOrderData.length > 0) {
                    activeOrderId = newOrderData[0].id;
                } else {
                    throw new Error("Order was placed but no ID was returned by the database. Check RLS policies.");
                }
            }

            // 3. Prepare and Insert Order Items
            const orderItemsToInsert = cart.map(cartItem => ({
                order_id: activeOrderId,
                menu_item_id: cartItem.item.id,
                item_name: cartItem.item.name,
                quantity: cartItem.quantity,
                unit_price: cartItem.item.price, // Base price
                total_price: cartItem.totalPrice * cartItem.quantity, // Computed total per line
                variant_details: {
                    variants: cartItem.variants,
                    addons: cartItem.addons
                }
            }));

            const { error: itemsError } = await (supabase as any)
                .from('order_items')
                .insert(orderItemsToInsert);

            if (itemsError) throw itemsError;

            // 4. Success state cleanup
            toast.success("Order sent to kitchen successfully! 👨‍🍳");
            setCart([]);
            setIsCartOpen(false);

        } catch (error) {
            console.error("Error submitting order:", error);
            toast.error("Failed to send order. Please try again or contact staff.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const requestBill = async () => {
        if (!restaurantId || !tableNo) return;
        setIsRequestingBill(true);
        try {
            await supabase.channel('global-live-orders').send({
                type: 'broadcast',
                event: 'bill_request',
                payload: { table_number: tableNo, restaurant_id: restaurantId }
            });
            toast.success("Waiter called! Someone will be with you shortly. 🛎️");
        } catch (e) {
            toast.error("Failed to call waiter.");
        } finally {
            setTimeout(() => setIsRequestingBill(false), 5000); // 5 sec cooldown
        }
    };

    const calculateCartItemsCount = () => {
        return cart.reduce((sum, item) => sum + item.quantity, 0);
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-24 font-sans selection:bg-amber-100 relative">
            <header className="bg-white sticky top-0 z-30 px-4 py-4 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)] border-b border-amber-100/50">
                <div className="flex items-center gap-4">
                    {restaurantInfo.logo_url ? (
                        <img src={restaurantInfo.logo_url} alt="Logo" className="w-14 h-14 rounded-full object-cover shadow-sm border border-slate-100 shrink-0" />
                    ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-black text-xl shadow-sm shrink-0">
                            {restaurantInfo.name.charAt(0)}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <h1 className="text-xl font-black text-slate-900 tracking-tight truncate">{restaurantInfo.name}</h1>
                            {tableNo && <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider bg-amber-50 px-2 py-1 rounded-full shrink-0">Table {tableNo}</span>}
                        </div>
                        <div className="flex flex-col gap-0.5 mt-1">
                            {restaurantInfo.address && (
                                <div className="flex items-center gap-1.5 text-slate-500">
                                    <MapPin className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                                    <p className="text-xs truncate">{restaurantInfo.address}</p>
                                </div>
                            )}
                            {restaurantInfo.phone && (
                                <div className="flex items-center gap-1.5 text-slate-500">
                                    <Phone className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                                    <p className="text-xs truncate">{restaurantInfo.phone}</p>
                                </div>
                            )}
                        </div>

                        {tableNo && activeOrder && (
                            <button
                                onClick={requestBill}
                                disabled={isRequestingBill}
                                className="mt-3 w-full bg-orange-100 hover:bg-orange-200 text-orange-900 font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 border border-orange-200"
                            >
                                <BellRing className="w-4 h-4" />
                                {isRequestingBill ? 'Calling Waiter...' : 'Call Waiter / Request Bill'}
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Search and Filters Section */}
            <div className="bg-white sticky top-[88px] z-20 border-b border-slate-200/50 shadow-sm">
                <div className="max-w-2xl mx-auto px-4 py-2.5 flex flex-col gap-2.5">
                    {/* Search Bar */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Search className="w-4 h-4 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search dishes, categories..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-full pl-10 pr-4 py-2 text-[14px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:font-normal force-black-input shadow-inner"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Filter Chips - Horizontal Scroll */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar shrink-0">
                        <div className="flex items-center gap-1.5 text-slate-400 shrink-0 mr-1 sticky left-0 bg-white pr-2 z-10">
                            <Filter className="w-4 h-4" />
                        </div>

                        <button
                            onClick={() => setSelectedCuisine('all')}
                            className={`shrink-0 px-4 py-1.5 rounded-full text-[13px] font-bold transition-all border ${selectedCuisine === 'all'
                                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                        >
                            All
                        </button>

                        {uniqueCuisines.map(cuisine => (
                            <button
                                key={cuisine}
                                onClick={() => setSelectedCuisine(cuisine)}
                                className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${selectedCuisine === cuisine
                                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                            >
                                {cuisine}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Menu Content */}
            <main className="p-4 space-y-10 max-w-2xl mx-auto mt-2">
                {displayCategories.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                            <Search className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">No items found</h3>
                        <p className="text-slate-500 text-sm">Try adjusting your search or filters.</p>
                        {(searchQuery || selectedCuisine !== 'all') && (
                            <button
                                onClick={() => { setSearchQuery(''); setSelectedCuisine('all'); }}
                                className="mt-4 text-amber-600 text-sm font-bold hover:underline"
                            >
                                Clear all filters
                            </button>
                        )}
                    </div>
                ) : (
                    displayCategories.map(category => {
                        const categoryItems = category.items;

                        return (
                            <section key={category.id} className="space-y-4 scroll-mt-24" id={`category-${category.id}`}>
                                <div
                                    className="flex items-center justify-between cursor-pointer border-b-2 border-slate-200/60 pb-2 group"
                                    onClick={() => toggleCategory(category.id)}
                                >
                                    <h2 className="text-[22px] font-black text-slate-900 drop-shadow-sm group-hover:text-amber-600 transition-colors">
                                        {category.name}
                                    </h2>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{categoryItems.length} items</span>
                                        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${expandedCategories.includes(category.id) ? 'rotate-180 text-amber-600' : ''}`} />
                                    </div>
                                </div>

                                <div className={`space-y-4 grid transition-all duration-300 ease-in-out ${expandedCategories.includes(category.id) ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0 overflow-hidden'}`}>
                                    <div className="min-h-0 space-y-4">
                                        {categoryItems.map(item => {
                                            // Pricing Logic
                                            let minP = item.price;
                                            let maxP = item.price;
                                            const vs = item.variants?.filter(v => v.price > 0) || [];
                                            if (vs.length > 0) {
                                                minP = Math.min(...vs.map(v => v.price));
                                                maxP = Math.max(...vs.map(v => v.price));
                                            }

                                            // Discount Logic
                                            const itemDiscount = item.discount_percentage || 0;
                                            const variantDiscounts = vs.map(v =>
                                                v.original_price && v.original_price > v.price
                                                    ? ((v.original_price - v.price) / v.original_price) * 100
                                                    : 0
                                            );
                                            const maxDiscount = Math.round(Math.max(itemDiscount, ...variantDiscounts));

                                            return (
                                                <div key={item.id} className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex gap-4 hover:shadow-md transition-shadow relative overflow-hidden group">

                                                    {/* Image Container */}
                                                    <div className="w-28 h-28 shrink-0 rounded-xl overflow-hidden relative bg-slate-100 shadow-inner">

                                                        {/* Added to Cart Indicator Glow */}
                                                        {cart.filter(c => c.item.id === item.id).length > 0 && (
                                                            <div className="absolute inset-x-0 bottom-0 h-1 bg-amber-400 z-30"></div>
                                                        )}

                                                        {/* Quantity Badge */}
                                                        {(() => {
                                                            const count = cart.filter(c => c.item.id === item.id).reduce((sum, c) => sum + c.quantity, 0);
                                                            if (count > 0) {
                                                                return (
                                                                    <div className="absolute top-1.5 right-1.5 z-30 bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-lg shadow-md border border-amber-400/50 flex items-center gap-1">
                                                                        <ShoppingCart className="w-2.5 h-2.5" />
                                                                        {count}
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        })()}

                                                        {(maxDiscount > 0 || item.offer_name) && (
                                                            <div className="absolute top-0 left-0 z-10 w-full bg-gradient-to-b from-black/60 to-transparent h-12"></div>
                                                        )}
                                                        {maxDiscount > 0 && (
                                                            <Badge variant="default" className="absolute top-1 left-1 z-20 bg-red-500 text-white border-0 font-black shadow-lg text-[10px] px-1 py-0 h-4 min-h-0">
                                                                -{maxDiscount}%
                                                            </Badge>
                                                        )}

                                                        {item.item_type === 'deal' && !item.image_url ? (
                                                            <DealMosaicImage divId={`deal-cust-${item.id}`} items={item.deal_items || []} className="w-full h-full" allMenuItems={menuItems} />
                                                        ) : (
                                                            <DynamicFoodImage
                                                                cuisine={item.cuisine || undefined}
                                                                category={item.category || undefined}
                                                                name={item.name}
                                                                manualImage={item.image_url}
                                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                            />
                                                        )}
                                                    </div>

                                                    {/* Details Container */}
                                                    <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
                                                        <div>
                                                            <div className="flex items-start justify-between gap-1 mb-1">
                                                                <h3 className="font-bold text-[16px] text-slate-800 leading-tight truncate-multiline line-clamp-2">
                                                                    {item.name}
                                                                </h3>
                                                            </div>

                                                            {item.offer_name && (
                                                                <div className="flex items-center gap-1 mb-1 bg-green-50 w-fit px-1.5 py-0.5 rounded border border-green-100/50">
                                                                    <Sparkles className="w-2.5 h-2.5 text-green-600" />
                                                                    <span className="text-[9px] font-black text-green-700 uppercase tracking-wider">{item.offer_name}</span>
                                                                </div>
                                                            )}

                                                            {item.description && (
                                                                <p className="text-[11px] text-slate-500 line-clamp-2 leading-snug">{item.description}</p>
                                                            )}

                                                            {item.item_type === 'deal' && item.deal_items && item.deal_items.length > 0 && (
                                                                <p className="text-[10px] text-slate-500 line-clamp-1 mt-1 font-medium bg-slate-50 inline-block px-1.5 rounded">
                                                                    Includes {item.deal_items.length} items
                                                                </p>
                                                            )}
                                                        </div>

                                                        {/* Price and Add Button */}
                                                        <div className="mt-2 flex items-end justify-between">
                                                            <div className="flex flex-col">
                                                                {(item.original_price && item.original_price > minP) ? (
                                                                    <span className="text-[10px] text-slate-400 line-through">
                                                                        {currencySymbol} {item.original_price.toLocaleString()}
                                                                    </span>
                                                                ) : null}
                                                                <span className="font-black text-amber-600 text-base leading-none drop-shadow-sm">
                                                                    {currencySymbol} {minP === maxP ? minP.toLocaleString() : `${minP.toLocaleString()} - ${maxP.toLocaleString()}`}
                                                                </span>
                                                            </div>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleOpenItemModal(item); }}
                                                                className="bg-slate-900 text-white px-3.5 py-1.5 rounded-full font-bold text-[11px] tracking-wide hover:bg-slate-800 transition-colors shadow-sm active:scale-95 flex items-center gap-1"
                                                            >
                                                                Add <Plus className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </section>
                        );
                    })
                )}
            </main>

            {/* Selection Modal (Bottom Sheet for Mobile, Modal for Desktop) */}
            {
                selectedItem && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-0 sm:p-4 animate-in fade-in duration-200">
                        <div className="bg-white w-full sm:max-w-md max-h-[95vh] sm:max-h-[90vh] sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-4 duration-300 relative border border-slate-200/50">
                            {/* Close button */}
                            <button
                                onClick={handleCloseModal}
                                className="absolute top-4 right-4 z-20 w-8 h-8 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/40 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* Modal Header Image */}
                            <div className="h-48 sm:h-56 w-full relative bg-slate-100 shrink-0">
                                {selectedItem.item_type === 'deal' && !selectedItem.image_url ? (
                                    <DealMosaicImage divId={`modal-deal-${selectedItem.id}`} items={selectedItem.deal_items || []} className="w-full h-full" allMenuItems={menuItems} />
                                ) : (
                                    <DynamicFoodImage
                                        cuisine={selectedItem.cuisine || undefined}
                                        category={selectedItem.category || undefined}
                                        name={selectedItem.name}
                                        manualImage={selectedItem.image_url}
                                        className="w-full h-full object-cover"
                                    />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                                <div className="absolute bottom-4 left-4 right-4">
                                    <h2 className="text-2xl font-black text-white leading-tight drop-shadow-md">{selectedItem.name}</h2>
                                    {selectedItem.description && (
                                        <p className="text-slate-200 text-sm line-clamp-2 mt-1 drop-shadow-sm">{selectedItem.description}</p>
                                    )}
                                </div>
                            </div>

                            {/* Scrollable Options Area */}
                            <div className="flex-1 overflow-y-auto p-5">

                                {/* Variants Selection */}
                                {selectedItem.variants && selectedItem.variants.length > 0 && (
                                    <div className="mb-6">
                                        <div className="flex justify-between items-end mb-3">
                                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Choose Options</h3>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded">Required</span>
                                        </div>
                                        <div className="space-y-2">
                                            {selectedItem.variants.map((variant) => {
                                                const isSelected = selectedVariants.some(v => v.id === variant.id);
                                                const isOutOfStock = typeof variant.stock_count === 'number' && variant.stock_count <= 0;
                                                return (
                                                    <div
                                                        key={variant.id}
                                                        onClick={() => !isOutOfStock && toggleVariant(variant)}
                                                        className={`p-3 border-2 rounded-xl flex justify-between items-center transition-all ${isOutOfStock ? 'opacity-50 cursor-not-allowed border-slate-100 bg-slate-50' :
                                                            isSelected ? 'border-amber-500 bg-amber-50/50 cursor-pointer shadow-sm' : 'border-slate-100 hover:border-amber-200 cursor-pointer'
                                                            }`}
                                                    >
                                                        <div>
                                                            <span className={`font-bold ${isSelected ? 'text-amber-700' : 'text-slate-800'}`}>{variant.name}</span>
                                                            {variant.description && <p className="text-xs text-slate-500 mt-0.5">{variant.description}</p>}
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex flex-col items-end">
                                                                {variant.original_price && variant.original_price > variant.price && (
                                                                    <span className="text-[10px] text-slate-400 line-through font-medium leading-none mb-0.5">
                                                                        {currencySymbol} {variant.original_price.toLocaleString()}
                                                                    </span>
                                                                )}
                                                                <span className={`font-black leading-none ${isSelected ? 'text-amber-600' : 'text-slate-600'}`}>
                                                                    {currencySymbol} {variant.price.toLocaleString()}
                                                                </span>
                                                            </div>
                                                            <div className={`w-5 h-5 rounded animate-in zoom-in-95 border-2 flex items-center justify-center ${isSelected ? 'border-amber-500 bg-amber-500' : 'border-slate-300'
                                                                }`}>
                                                                {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Add-ons Selection */}
                                {selectedItem.modifier_groups && selectedItem.modifier_groups.length > 0 && (
                                    <div className="space-y-6">
                                        {selectedItem.modifier_groups.map((group) => (
                                            <div key={group.id}>
                                                <div className="flex justify-between items-end mb-3">
                                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">{group.name}</h3>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded">Optional</span>
                                                </div>
                                                <div className="space-y-2">
                                                    {group.modifiers.map((addon: any) => {
                                                        const isSelected = selectedAddons.some(a => a.id === addon.id);
                                                        return (
                                                            <div
                                                                key={addon.id}
                                                                onClick={() => toggleAddon(addon)}
                                                                className={`p-3 border-2 rounded-xl flex justify-between items-center cursor-pointer transition-all ${isSelected ? 'border-amber-500 bg-amber-50/50 shadow-sm' : 'border-slate-100 hover:border-amber-200'
                                                                    }`}
                                                            >
                                                                <span className={`font-bold ${isSelected ? 'text-amber-700' : 'text-slate-800'}`}>{addon.name}</span>
                                                                <div className="flex items-center gap-3">
                                                                    {addon.price > 0 && (
                                                                        <span className={`text-sm font-black ${isSelected ? 'text-amber-600' : 'text-slate-500'}`}>
                                                                            + {currencySymbol} {addon.price.toLocaleString()}
                                                                        </span>
                                                                    )}
                                                                    <div className={`w-5 h-5 rounded animate-in zoom-in-95 border-2 flex items-center justify-center ${isSelected ? 'border-amber-500 bg-amber-500' : 'border-slate-300'
                                                                        }`}>
                                                                        {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* If no variants and no addons, show standard details */}
                                {(!selectedItem.variants || selectedItem.variants.length === 0) && (!selectedItem.modifier_groups || selectedItem.modifier_groups.length === 0) && (
                                    <div className="text-center py-6">
                                        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Sparkles className="w-8 h-8 text-amber-500" />
                                        </div>
                                        <p className="text-slate-500 font-medium">This item is ready to be ordered exactly as described.</p>
                                        <div className="flex items-center justify-center gap-2 mt-2">
                                            {selectedItem.original_price && selectedItem.original_price > selectedItem.price && (
                                                <span className="text-sm text-slate-400 line-through font-medium mt-1">
                                                    {currencySymbol} {selectedItem.original_price.toLocaleString()}
                                                </span>
                                            )}
                                            <span className="text-2xl font-black text-slate-900">{currencySymbol} {selectedItem.price.toLocaleString()}</span>
                                        </div>
                                    </div>
                                )}

                            </div>

                            {/* Sticky Bottom Actions - NO LONGER ABSOLUTE, NOW A FLEX CHILD */}
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-bold text-slate-700">Quantity</span>
                                <div className="flex items-center gap-4 bg-slate-50 p-1.5 rounded-full border border-slate-200">
                                    <button
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-700 font-bold shadow-sm hover:bg-slate-100 active:scale-95 transition-transform"
                                    >-</button>
                                    <span className="font-black text-slate-900 w-4 text-center">{quantity}</span>
                                    <button
                                        onClick={() => setQuantity(quantity + 1)}
                                        className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white font-bold shadow-sm hover:bg-slate-800 active:scale-95 transition-transform"
                                    >+</button>
                                </div>
                            </div>

                            {/* Final Add Button */}
                            <button
                                onClick={handleAddToCart}
                                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black text-lg py-4 rounded-2xl shadow-lg shadow-amber-500/30 transition-all active:scale-[0.98] flex items-center justify-between px-6"
                            >
                                <span>Add to Order</span>
                                <span>{currencySymbol} {calculateModalTotal().toLocaleString()}</span>
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Active Order Live Tracker Widget */}
            <AnimatePresence>
                {activeOrder && !isCartOpen && !selectedItem && cart.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-6 left-4 right-4 z-40 max-w-2xl mx-auto"
                    >
                        <div className="bg-white border-2 border-amber-200/50 shadow-[0_10px_40px_-10px_rgba(245,158,11,0.2)] rounded-2xl p-4 transition-all">
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 border-4 border-white shadow-md ${activeOrder.status === 'pending' ? 'bg-orange-100 text-orange-600' :
                                    activeOrder.status === 'accepted' ? 'bg-blue-100 text-blue-600' :
                                        activeOrder.status === 'cooking' ? 'bg-purple-100 text-purple-600' :
                                            'bg-green-100 text-green-600'
                                    }`}>
                                    {activeOrder.status === 'pending' && <Clock className="w-7 h-7 animate-pulse" />}
                                    {activeOrder.status === 'accepted' && <CheckCircle className="w-7 h-7" />}
                                    {activeOrder.status === 'cooking' && <ChefHat className="w-7 h-7 animate-bounce" />}
                                    {activeOrder.status === 'ready' && <Package className="w-7 h-7" />}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-black text-slate-900 text-lg leading-tight mb-1">
                                        {activeOrder.status === 'pending' && 'Order Received'}
                                        {activeOrder.status === 'accepted' && 'Order Accepted'}
                                        {activeOrder.status === 'cooking' && 'Cooking Now 🍳'}
                                        {activeOrder.status === 'ready' && 'Food is Ready! 🛎️'}
                                    </h4>
                                    <p className="text-sm font-semibold text-slate-500">
                                        {activeOrder.status === 'pending' && 'Waiting for kitchen...'}
                                        {activeOrder.status === 'accepted' && 'Chef is reviewing...'}
                                        {activeOrder.status === 'cooking' && <span className="text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md font-bold">Est: 10 - 15 mins</span>}
                                        {activeOrder.status === 'ready' && <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded-md font-bold">Arriving shortly!</span>}
                                    </p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Total</p>
                                    {activeOrder.discount_amount > 0 ? (
                                        <div className="flex flex-col items-end">
                                            <span className="text-sm line-through text-slate-400 block leading-tight">{currencySymbol} {activeOrder.total_amount}</span>
                                            <span className="font-black text-slate-900 text-lg leading-none">{currencySymbol} {Math.max(0, activeOrder.total_amount - activeOrder.discount_amount)}</span>
                                        </div>
                                    ) : (
                                        <p className="font-black text-slate-900 text-lg">{currencySymbol} {activeOrder.total_amount}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Cart Button */}
            <AnimatePresence>
                {cart.length > 0 && !selectedItem && !isCartOpen && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-6 left-4 right-4 z-40 max-w-2xl mx-auto"
                    >
                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white shadow-xl shadow-amber-500/30 rounded-2xl p-4 flex items-center justify-between transition-all active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 p-2 rounded-xl">
                                    <ShoppingCart className="w-6 h-6" />
                                </div>
                                <div className="text-left">
                                    <p className="font-black text-lg leading-none">View Cart</p>
                                    <p className="text-amber-100 text-sm font-medium mt-1">{calculateCartItemsCount()} items added</p>
                                </div>
                            </div>
                            <div className="font-black text-xl">
                                {currencySymbol} {calculateCartTotal().toLocaleString()}
                            </div>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Cart Review Modal */}
            <AnimatePresence>
                {isCartOpen && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="bg-slate-50 w-full max-w-2xl sm:rounded-3xl rounded-t-3xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh] border-t border-slate-200 sm:border border-slate-200/50"
                        >
                            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0 shadow-sm z-10">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Your Order</h2>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {tableNo && <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider bg-amber-50 px-2 py-0.5 rounded-full shrink-0">Table {tableNo}</span>}
                                        <p className="text-slate-500 text-sm font-medium">
                                            {showStripe ? "Complete secure payment" : "Review items before sending to kitchen"}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsCartOpen(false)}
                                    className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {cart.length === 0 ? (
                                    <div className="text-center py-16">
                                        <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                                            <ShoppingCart className="w-10 h-10 text-slate-400" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900 mb-2">Your cart is empty</h3>
                                        <p className="text-slate-500 mb-6">Add some delicious items from the menu to get started!</p>
                                        <button
                                            onClick={() => setIsCartOpen(false)}
                                            className="px-6 py-3 bg-white text-amber-600 font-bold tracking-wide rounded-xl border-2 border-amber-100 hover:border-amber-200 hover:bg-amber-50 transition-colors shadow-sm"
                                        >
                                            Browse Menu
                                        </button>
                                    </div>
                                ) : showStripe ? (
                                    <StripeWrapper
                                        amount={calculateCartTotal()}
                                        restaurantId={restaurantId || ''}
                                        metadata={{
                                            customer_name: customerName,
                                            table_number: tableNo,
                                            order_note: orderNote
                                        }}
                                        onSuccess={() => {
                                            // HandlePlaceOrder will be called with the success state
                                            setShowStripe(false);
                                            handlePlaceOrder(true);
                                        }}
                                        onCancel={() => setShowStripe(false)}
                                    />
                                ) : (
                                    <div className="space-y-3">
                                        {cart.map((cartItem) => (
                                            <div key={cartItem.id} className="p-4 border border-slate-200/60 rounded-2xl bg-white shadow-sm relative overflow-hidden group">
                                                <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="pr-4">
                                                        <h4 className="font-bold text-slate-900 text-lg leading-tight">{cartItem.item.name}</h4>
                                                        {(cartItem.variants.length === 0) && (
                                                            <p className="text-xs font-semibold text-slate-400 mt-0.5 flex items-center gap-1.5">
                                                                Base Price:
                                                                {cartItem.item.original_price && cartItem.item.original_price > cartItem.item.price && (
                                                                    <span className="line-through text-slate-300 font-normal">{currencySymbol} {cartItem.item.original_price.toLocaleString()}</span>
                                                                )}
                                                                <span>{currencySymbol} {cartItem.item.price.toLocaleString()}</span>
                                                            </p>
                                                        )}
                                                    </div>
                                                    <span className="font-black text-slate-900 shrink-0 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                                        {currencySymbol} {(cartItem.totalPrice * cartItem.quantity).toLocaleString()}
                                                    </span>
                                                </div>

                                                {(cartItem.variants.length > 0 || cartItem.addons.length > 0) && (
                                                    <div className="text-sm text-slate-500 space-y-1.5 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                                                        {cartItem.variants.map((v: any) => (
                                                            <div key={v.id} className="flex items-center justify-between gap-2">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0"></span>
                                                                    <span className="font-medium text-slate-700">{v.name}</span>
                                                                </div>
                                                                <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                                                                    {v.original_price && v.original_price > v.price && (
                                                                        <span className="line-through text-slate-300 font-normal">{currencySymbol} {v.original_price.toLocaleString()}</span>
                                                                    )}
                                                                    <span>{currencySymbol} {v.price.toLocaleString()}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {cartItem.addons.map((a: any) => (
                                                            <div key={a.id} className="flex items-center justify-between gap-2">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-300 shrink-0"></span>
                                                                    <span className="font-medium text-slate-700">{a.name}</span>
                                                                </div>
                                                                <span className="text-xs font-bold text-amber-600/70">+{currencySymbol} {a.price}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between mt-2">
                                                    <div className="flex items-center gap-3 bg-slate-100/80 p-1 rounded-xl border border-slate-200">
                                                        <button
                                                            onClick={() => handleUpdateCartQuantity(cartItem.id, -1)}
                                                            className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-700 font-bold shadow-sm hover:bg-slate-50 active:scale-95 transition-transform"
                                                        ><Minus className="w-4 h-4" /></button>
                                                        <span className="font-black text-slate-900 w-6 text-center">{cartItem.quantity}</span>
                                                        <button
                                                            onClick={() => handleUpdateCartQuantity(cartItem.id, 1)}
                                                            className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-white font-bold shadow-sm hover:bg-slate-700 active:scale-95 transition-transform"
                                                        ><Plus className="w-4 h-4" /></button>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveFromCart(cartItem.id)}
                                                        className="w-9 h-9 text-slate-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors"
                                                        title="Remove item"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {cart.length > 0 && (
                                <div className="bg-white border-t border-slate-200 p-5 shadow-[0_-10px_40px_-5px_rgba(0,0,0,0.05)] shrink-0 sm:rounded-b-3xl">

                                    {/* Ultra-Compact Customer Details Form */}
                                    <div className="flex gap-2 mb-3">
                                        <div className="relative flex-1">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                            </div>
                                            <input
                                                type="text"
                                                value={customerName}
                                                onChange={(e) => setCustomerName(e.target.value)}
                                                placeholder="Name (Req.)"
                                                className="force-black-input w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-8 pr-3 py-2 text-[13px] font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                                            />
                                        </div>

                                        <div className="relative flex-1">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                            </div>
                                            <input
                                                type="tel"
                                                value={customerPhone}
                                                onChange={(e) => setCustomerPhone(e.target.value)}
                                                placeholder="Phone (Opt.)"
                                                className="force-black-input w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-8 pr-3 py-2 text-[13px] font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="relative mb-4">
                                        <div className="absolute top-2.5 left-3 flex items-center pointer-events-none">
                                            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                                        </div>
                                        <textarea
                                            rows={2}
                                            value={orderNote}
                                            onChange={(e) => setOrderNote(e.target.value)}
                                            placeholder="Any special requests? (e.g. extra sauce, loaded, etc.)"
                                            className="force-black-input w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-8 pr-3 py-2.5 text-[13px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none"
                                        />
                                    </div>

                                    {/* Payment Method Selector */}
                                    {!showStripe && (
                                        <div className="mb-6">
                                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-3">Payment Method</h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    onClick={() => setPaymentMethod('CASH')}
                                                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${paymentMethod === 'CASH'
                                                        ? 'border-amber-500 bg-amber-50 shadow-sm'
                                                        : 'border-slate-100 hover:border-slate-200 bg-white'
                                                        }`}
                                                >
                                                    <Banknote className={`w-6 h-6 mb-2 ${paymentMethod === 'CASH' ? 'text-amber-500' : 'text-slate-400'}`} />
                                                    <span className={`text-sm font-bold ${paymentMethod === 'CASH' ? 'text-amber-700' : 'text-slate-600'}`}>Cash</span>
                                                </button>
                                                <button
                                                    onClick={() => setPaymentMethod('ONLINE')}
                                                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${paymentMethod === 'ONLINE'
                                                        ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                                                        : 'border-slate-100 hover:border-slate-200 bg-white'
                                                        }`}
                                                >
                                                    <CreditCard className={`w-6 h-6 mb-2 ${paymentMethod === 'ONLINE' ? 'text-indigo-500' : 'text-slate-400'}`} />
                                                    <span className={`text-sm font-bold ${paymentMethod === 'ONLINE' ? 'text-indigo-700' : 'text-slate-600'}`}>Online</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {!showStripe && (
                                        <>
                                            <div className="space-y-2 mb-5">
                                                <div className="flex justify-between items-center text-slate-500 text-sm font-medium px-1">
                                                    <span>Subtotal</span>
                                                    <span>{currencySymbol} {calculateCartTotal().toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xl font-black text-slate-900 border-t border-slate-100 pt-2 px-1">
                                                    <span>Grand Total</span>
                                                    <span>{currencySymbol} {calculateCartTotal().toLocaleString()}</span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handlePlaceOrder()}
                                                disabled={isSubmitting}
                                                className={`w-full ${paymentMethod === 'ONLINE' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20' : 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/20'} disabled:bg-slate-400 text-white font-black text-lg py-4 rounded-2xl shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 group`}
                                            >
                                                {isSubmitting ? (
                                                    <>
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                        Sending to Kitchen...
                                                    </>
                                                ) : (
                                                    <>
                                                        {paymentMethod === 'ONLINE' ? 'Pay & Order' : 'Place Order Now'}
                                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                                    </>
                                                )}
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}



