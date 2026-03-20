// ============================================================
// FILE: Orders.tsx
// SECTION: 2_partner > dashboard > pages
// PURPOSE: Real-time orders dekhna aur manage karna.
//          Accept, reject, cooking, ready status update hote hain.
//          Supabase Realtime se live updates aati hain.
// ROUTE: /dashboard/orders
// ============================================================
// ============================================
// ORDERS MANAGEMENT PAGE
// ============================================

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/shared/lib/supabaseClient';
import { OrderCard, Order } from '@/2_partner/dashboard/components/OrderCard';
import { OrderFilters, OrderStatus } from '@/2_partner/dashboard/components/OrderFilters';
import { Bell, BellRing, RefreshCw, Package, Volume2, VolumeX, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { soundManager } from '@/shared/services/soundManager';
import NewOrderModal from '@/2_partner/dashboard/components/NewOrderModal';
import CheckoutModal from '@/2_partner/dashboard/components/CheckoutModal';
import ConfirmModal from '@/2_partner/dashboard/components/ConfirmModal';
import { useOutletContext } from 'react-router-dom';
import { useRestaurant } from '@/shared/contexts/RestaurantContext';

export default function Orders() {
    const { theme: rawTheme } = useOutletContext<any>() || {};
    const { currencySymbol } = useRestaurant();
    const formatOrderPrice = (amount: number): string => {
        return `${currencySymbol}\u00A0${amount.toLocaleString('en', {
            maximumFractionDigits: 0
        })}`;
    };
    const theme = rawTheme || { bg: 'bg-orange-500', text: 'text-orange-500', mainBg: 'bg-orange-500', mainText: 'text-orange-500', shadow: 'shadow-orange-500/30', gradient: 'from-orange-600 to-amber-600', gradientDeep: 'from-orange-600 to-orange-800' };

    const [orders, setOrders] = useState<Order[]>([]);
    const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
    const [lowStockItems, setLowStockItems] = useState<{ name: string; stock: number; threshold: number }[]>([]);
    // FIX #10: Load filter from localStorage on mount
    const [selectedFilter, setSelectedFilter] = useState<OrderStatus>(
        (typeof window !== 'undefined' && localStorage.getItem('orderFilter') as OrderStatus) || 'all'
    );
    const [activeTab, setActiveTab] = useState<'DINE_IN' | 'DELIVERY'>(
        (typeof window !== 'undefined' && localStorage.getItem('activeOrderTab') as 'DINE_IN' | 'DELIVERY') || 'DINE_IN'
    );
    const [loading, setLoading] = useState(true);
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [restaurantId, setRestaurantId] = useState<string | null>(null);
    const [restaurantLogo, setRestaurantLogo] = useState<string>('/favicon.ico');
    const [soundEnabled, setSoundEnabled] = useState(true);
    // Modals
    const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
    const [checkoutOrder, setCheckoutOrder] = useState<Order | null>(null);
    const [editOrderInfo, setEditOrderInfo] = useState<{
        orderId: string,
        tableNo: string,
        orderType: string,
        customerName?: string,
        customerPhone?: string,
        deliveryAddress?: string
    } | null>(null);

    // Bulk Select & Confirm Dialog State
    const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        action: () => void;
        isDestructive?: boolean;
        confirmText?: string;
    }>({ isOpen: false, title: '', message: '', action: () => { } });

    // Keep a stable ref of orders to compare against during Supabase realtime updates
    const ordersRef = useRef<Order[]>([]);
    useEffect(() => {
        ordersRef.current = orders;
    }, [orders]);

    // Request Notification Permission on mount
    useEffect(() => {
        if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }, []);

    // Demo orders data
    const demoOrders: Order[] = [
        {
            id: 'demo-001',
            customer_name: 'Ahmed Ali',
            customer_phone: '+92 300 1234567',
            customer_address: 'House 123, Street 5, DHA Phase 6, Lahore',
            items: [
                { name: 'Bihari Kebab', quantity: 2, unit_price: 350 },
                { name: 'Garlic Naan', quantity: 4, unit_price: 50 }
            ],
            total_amount: 900,
            status: 'pending',
            created_at: new Date(Date.now() - 5 * 60000).toISOString(),
            time_ago: '5 mins ago'
        },
        {
            id: 'demo-002',
            customer_name: 'Sara Khan',
            customer_phone: '+92 321 9876543',
            customer_address: 'Flat 4B, Al-Hamra Tower, Gulberg III, Lahore',
            items: [
                { name: 'Chicken Tikka', quantity: 1, unit_price: 450 },
                { name: 'Zinger Burger', quantity: 2, unit_price: 400 },
                { name: 'Coca Cola', quantity: 2, unit_price: 20 }
            ],
            total_amount: 1290,
            status: 'cooking',
            created_at: new Date(Date.now() - 15 * 60000).toISOString(),
            time_ago: '15 mins ago'
        },
        {
            id: 'demo-003',
            customer_name: 'Hassan Raza',
            customer_phone: '+92 333 4567890',
            customer_address: 'Shop 7, Commercial Market, Cavalry Ground, Lahore',
            items: [
                { name: 'Pepperoni Pizza', quantity: 1, unit_price: 800 }
            ],
            total_amount: 800,
            status: 'ready',
            created_at: new Date(Date.now() - 25 * 60000).toISOString(),
            time_ago: '25 mins ago'
        },
        {
            id: 'demo-004',
            customer_name: 'Fatima Malik',
            customer_phone: '+92 345 2468013',
            customer_address: 'House 456, Block J, Johar Town, Lahore',
            items: [
                { name: 'Chicken Karahi', quantity: 1, unit_price: 1200 },
                { name: 'Garlic Naan', quantity: 6, unit_price: 50 },
                { name: 'Raita', quantity: 2, unit_price: 80 }
            ],
            total_amount: 1660,
            status: 'pending',
            created_at: new Date(Date.now() - 2 * 60000).toISOString(),
            time_ago: '2 mins ago'
        },
        {
            id: 'demo-005',
            customer_name: 'Ali Hamza',
            customer_phone: '+92 312 8765432',
            customer_address: 'Apartment 12C, Eden Towers, Main Boulevard, Lahore',
            items: [
                { name: 'Garlic Naan', quantity: 8, unit_price: 50 },
                { name: 'Seekh Kebab', quantity: 3, unit_price: 250 }
            ],
            total_amount: 1150,
            status: 'cooking',
            created_at: new Date(Date.now() - 20 * 60000).toISOString(),
            time_ago: '20 mins ago'
        },
        {
            id: 'demo-006',
            customer_name: 'Zainab Ahmed',
            customer_phone: '+92 331 5551234',
            customer_address: 'House 89, Street 12, Model Town, Lahore',
            items: [
                { name: 'Zinger Burger', quantity: 1, unit_price: 400 },
                { name: 'Fries', quantity: 2, unit_price: 150 }
            ],
            total_amount: 700,
            status: 'delivered',
            created_at: new Date(Date.now() - 60 * 60000).toISOString(),
            time_ago: '1 hour ago'
        }
    ];

    // Initialize
    useEffect(() => {
        const init = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    setLoading(false);
                    return;
                }

                // Get restaurant ID
                const { data: restaurant } = await supabase
                    .from('restaurants')
                    .select('id, logo_url')
                    .eq('owner_id', user.id)
                    .single();

                if (restaurant) {
                    setRestaurantId((restaurant as any).id);
                    setRestaurantLogo((restaurant as any).logo_url || '/favicon.ico');
                    await fetchOrders((restaurant as any).id);
                } else {
                    // No restaurant
                    setOrders([]);
                    setFilteredOrders([]);
                }

                setLoading(false);
            } catch (error) {
                console.error('Failed to load orders:', error);
                setOrders([]);
                setFilteredOrders([]);
                setLoading(false);
            }
        };

        init();
    }, []);

    // FIX #9 & #11: Add debouncing and loading state for stock check
    useEffect(() => {
        if (!restaurantId) return;

        // Debounce stock check to avoid running on every order change
        const timer = setTimeout(async () => {
            try {
                const { data: items } = await supabase
                    .from('menu_items')
                    .select('name, stock_count, low_stock_threshold, is_stock_managed')
                    .eq('restaurant_id', restaurantId)
                    .eq('is_stock_managed', true)
                    .not('stock_count', 'is', null);

                if (!items) return;

                const low = items.filter((item: any) =>
                    item.stock_count <= (item.low_stock_threshold || 5) &&
                    item.stock_count > 0
                ).map((item: any) => ({
                    name: item.name,
                    stock: item.stock_count,
                    threshold: item.low_stock_threshold || 5
                }));

                const outOfStock = items.filter((item: any) =>
                    item.stock_count <= 0
                ).map((item: any) => ({
                    name: item.name,
                    stock: 0,
                    threshold: item.low_stock_threshold || 5
                }));

                setLowStockItems([...outOfStock, ...low]);
            } catch (error) {
                console.error('Error checking low stock:', error);
            }
        }, 1000); // Debounce 1 second

        return () => clearTimeout(timer);
    }, [restaurantId, orders]);

    // Fetch real orders
    const fetchOrders = async (restId: string) => {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*, order_items(*)')
                .eq('restaurant_id', restId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data && data.length > 0) {
                const formattedOrders = data.map((order: any) => ({
                    ...order,
                    items: order.order_items.map((oi: any) => ({
                        id: oi.id,
                        menu_item_id: oi.menu_item_id,
                        name: oi.item_name,
                        quantity: oi.quantity,
                        unit_price: oi.unit_price || oi.price_at_order
                    }))
                }));
                setOrders(formattedOrders as Order[]);
                setFilteredOrders(formattedOrders as Order[]);
            } else {
                // No orders yet, show empty
                setOrders([]);
                setFilteredOrders([]);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
            toast.error('Failed to load orders');
            setOrders([]);
            setFilteredOrders([]);
        }
    };

    // Listen for Realtime Order Updates & Inserts
    useEffect(() => {
        if (!restaurantId || isDemoMode) return;

        const channel = supabase.channel('live-orders')
            .on(
                'broadcast',
                { event: 'bill_request' },
                (payload) => {
                    try {
                        const { table_number, restaurant_id } = payload.payload;
                        if (restaurant_id === restaurantId) {
                            console.log('🚨 BILL REQUEST FROM TABLE', table_number);
                        }
                    } catch (error) {
                        console.error('Error handling bill request:', error);
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
                async (payload) => {
                    try {
                        console.log('🔔 NEW ORDER RECEIVED (Orders UI update)', payload);
                        await fetchOrders(restaurantId);
                    } catch (error) {
                        console.error('Error processing new order:', error);
                        toast.error('Failed to load new order');
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
                async (payload) => {
                    try {
                        console.log('🔔 ORDER UPDATED!', payload);
                        await fetchOrders(restaurantId);
                    } catch (error) {
                        console.error('Error processing order update:', error);
                        toast.error('Failed to update order');
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Real-time subscription active');
                } else if (status === 'CLOSED') {
                    console.warn('⚠️ Real-time subscription closed');
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
        // FIX #8: Removed restaurantLogo from dependency array to prevent unnecessary re-subscriptions
    }, [restaurantId, isDemoMode, soundEnabled]);

    // FIX #10: Persist filter state to localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('orderFilter', selectedFilter);
        }
    }, [selectedFilter]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('activeOrderTab', activeTab);
        }
    }, [activeTab]);

    // Filter orders when filter changes or tab changes
    useEffect(() => {
        let result = orders.filter((o: any) => {
            // Include demo orders inside Dine-In if their order_type is missing
            if (activeTab === 'DINE_IN') return o.order_type === 'DINE_IN' || !o.order_type;
            return o.order_type === 'DELIVERY' || o.order_type === 'TAKEAWAY';
        });

        if (selectedFilter !== 'all') {
            // Specific filter view (e.g. only 'delivered' or only 'pending')
            result = result.filter(order => order.status === selectedFilter);
        }
        setFilteredOrders(result);
    }, [selectedFilter, orders, activeTab]);

    // Calculate counts for active tab
    const currentTabOrders = orders.filter((o: any) => {
        if (activeTab === 'DINE_IN') return o.order_type === 'DINE_IN' || !o.order_type;
        return o.order_type === 'DELIVERY' || o.order_type === 'TAKEAWAY';
    });

    const counts = {
        all: currentTabOrders.length,
        pending: currentTabOrders.filter(o => o.status === 'pending').length,
        accepted: currentTabOrders.filter(o => o.status === 'accepted').length,
        cooking: currentTabOrders.filter(o => o.status === 'cooking').length,
        ready: currentTabOrders.filter(o => o.status === 'ready').length,
        delivered: currentTabOrders.filter(o => o.status === 'delivered').length,
        cancelled: currentTabOrders.filter(o => o.status === 'cancelled').length
    };

    // Action handlers
    const handleAccept = async (orderId: string) => {
        if (isDemoMode) {
            soundManager.playAccepted();
            toast.success('Demo: Order accepted!');
            updateOrderStatus(orderId, 'accepted');
            return;
        }

        try {
            // 1. Update Order Status
            const { error: statusError } = await (supabase as any)
                .from('orders')
                .update({ status: 'accepted' })
                .eq('id', orderId);

            if (statusError) throw statusError;

            // 2. Decrement Stock for each item (FIX #7: Atomic operation via RPC)
            const order = orders.find(o => o.id === orderId);
            if (order && order.items) {
                for (const item of order.items) {
                    if (item.menu_item_id) {
                        try {
                            // FIX #7: Use RPC for atomic stock decrement to prevent race conditions
                            const { data: result, error: rpcError } = await (supabase as any).rpc(
                                'decrement_menu_item_stock',
                                {
                                    p_item_id: item.menu_item_id,
                                    p_quantity: item.quantity
                                }
                            );

                            if (rpcError) {
                                // Fallback to manual decrement if RPC doesn't exist
                                console.warn('RPC not available, using manual decrement:', rpcError);
                                const { data: currentItem } = await supabase
                                    .from('menu_items')
                                    .select('stock_count, is_stock_managed, low_stock_threshold')
                                    .eq('id', item.menu_item_id)
                                    .single();

                                if (currentItem && (currentItem as any).is_stock_managed && (currentItem as any).stock_count !== null) {
                                    const newStock = Math.max(0, (currentItem as any).stock_count - item.quantity);
                                    await (supabase as any)
                                        .from('menu_items')
                                        .update({ stock_count: newStock })
                                        .eq('id', item.menu_item_id);

                                    const threshold = (currentItem as any).low_stock_threshold || 5;
                                    if (newStock === 0) {
                                        toast.error(`⚠️ "${item.name}" is now OUT OF STOCK`, {
                                            duration: 8000,
                                            description: 'Update availability in Menu Manager'
                                        });
                                    } else if (newStock <= threshold) {
                                        toast.warning(`📦 "${item.name}" is running low — only ${newStock} left`, {
                                            duration: 6000,
                                            description: `Low stock threshold is ${threshold}`
                                        });
                                    }
                                }
                            } else if (result) {
                                // RPC returned stock info
                                const { new_stock, threshold } = result;
                                if (new_stock === 0) {
                                    toast.error(`⚠️ "${item.name}" is now OUT OF STOCK`, {
                                        duration: 8000,
                                        description: 'Update availability in Menu Manager'
                                    });
                                } else if (new_stock <= threshold) {
                                    toast.warning(`📦 "${item.name}" is running low — only ${new_stock} left`, {
                                        duration: 6000,
                                        description: `Low stock threshold is ${threshold}`
                                    });
                                }
                            }
                        } catch (error) {
                            console.error('Error decrementing stock:', error);
                            toast.error(`Failed to update stock for ${item.name}`);
                        }
                    }
                }
            }

            soundManager.playAccepted();
            updateOrderStatus(orderId, 'accepted');
            toast.success('Order accepted & stock updated!');
        } catch (error) {
            console.error('Error accepting order:', error);
            toast.error('Failed to accept order');
        }
    };

    const handleReject = async (orderId: string) => {
        if (isDemoMode) {
            soundManager.playRejected();
            toast.info('Demo: Order rejected');
            updateOrderStatus(orderId, 'cancelled');
            return;
        }

        try {
            const { error } = await (supabase as any)
                .from('orders')
                .update({ status: 'cancelled', session_status: 'CLOSED' })
                .eq('id', orderId);

            if (error) throw error;

            soundManager.playRejected();
            updateOrderStatus(orderId, 'cancelled');
            toast.info('Order cancelled');
        } catch (error) {
            console.error('Error rejecting order:', error);
            toast.error('Failed to reject order');
        }
    };

    const handleDeleteOrder = (orderId: string) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Order',
            message: 'Are you sure you want to permanently delete this order? This action cannot be undone.',
            isDestructive: true,
            confirmText: 'Delete Forever',
            action: async () => {
                try {
                    const { error } = await (supabase as any)
                        .from('orders')
                        .delete()
                        .eq('id', orderId);

                    if (error) throw error;
                    toast.success("Order deleted successfully.");
                    setOrders(prev => prev.filter(o => o.id !== orderId));
                    setSelectedOrders(prev => prev.filter(id => id !== orderId)); // Ensure unselected
                } catch (e: any) {
                    console.error("Delete failed:", e);
                    toast.error("Failed to delete order.");
                } finally {
                    setConfirmDialog(p => ({ ...p, isOpen: false }));
                }
            }
        });
    };

    const handleBulkDelete = () => {
        if (selectedOrders.length === 0) return;
        
        // FIX #12: Show order details in confirmation
        const selectedOrderDetails = orders
            .filter(o => selectedOrders.includes(o.id))
            .map(o => `${o.customer_name || 'Unknown'} (${o.id.slice(0, 8)})`)
            .join(', ');
        
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Multiple Orders',
            message: `Are you sure you want to permanently delete ${selectedOrders.length} selected orders?\n\nOrders: ${selectedOrderDetails}\n\nThis action cannot be undone.`,
            isDestructive: true,
            confirmText: `Delete ${selectedOrders.length} Orders`,
            action: async () => {
                try {
                    const { error } = await (supabase as any)
                        .from('orders')
                        .delete()
                        .in('id', selectedOrders);

                    if (error) throw error;
                    toast.success(`Successfully deleted ${selectedOrders.length} orders.`);
                    setOrders(prev => prev.filter(o => !selectedOrders.includes(o.id)));
                    setSelectedOrders([]); // Clear selection
                } catch (e: any) {
                    console.error("Bulk Delete failed:", e);
                    toast.error("Failed to delete selected orders.");
                } finally {
                    setConfirmDialog(p => ({ ...p, isOpen: false }));
                }
            }
        });
    };

    const handleRemoveItem = (orderId: string, itemId: string) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Remove Item',
            message: 'Are you sure you want to remove this item from the active bill?',
            isDestructive: true,
            confirmText: 'Remove',
            action: async () => {
                try {
                    const order = orders.find(o => o.id === orderId);
                    if (!order) return;
                    const itemToRemove = order.items.find((i: any) => i.id === itemId);
                    if (!itemToRemove) return;

                    // Delete item from db
                    const { error: deleteError } = await (supabase as any)
                        .from('order_items')
                        .delete()
                        .eq('id', itemId);

                    if (deleteError) throw deleteError;

                    // Recalculate total
                    const priceToDeduct = ((itemToRemove as any).price || itemToRemove.unit_price || 0) * itemToRemove.quantity;
                    const newTotal = Math.max(0, order.total_amount - priceToDeduct);

                    // Update order total in db
                    const { error: updateError } = await (supabase as any)
                        .from('orders')
                        .update({ total_amount: newTotal })
                        .eq('id', orderId);

                    if (updateError) throw updateError;

                    toast.success("Item removed from bill.");
                    if (restaurantId) {
                        fetchOrders(restaurantId);
                    }
                } catch (e: any) {
                    console.error("Failed to remove item:", e);
                    toast.error("Failed to remove item.");
                } finally {
                    setConfirmDialog(p => ({ ...p, isOpen: false }));
                }
            }
        });
    };

    const handleMarkCooking = async (orderId: string) => {
        if (isDemoMode) {
            toast.success('Demo: Started cooking!');
            updateOrderStatus(orderId, 'cooking');
            return;
        }

        try {
            const { error } = await (supabase as any)
                .from('orders')
                .update({ status: 'cooking' })
                .eq('id', orderId);

            if (error) throw error;

            updateOrderStatus(orderId, 'cooking');
            toast.success('Started cooking!');
        } catch (error) {
            console.error('Error updating order:', error);
            toast.error('Failed to update status');
        }
    };

    const handleMarkReady = async (orderId: string) => {
        if (isDemoMode) {
            soundManager.playReady();
            toast.success('Demo: Order ready!');
            updateOrderStatus(orderId, 'ready');
            return;
        }

        try {
            const { error } = await (supabase as any)
                .from('orders')
                .update({ status: 'ready' })
                .eq('id', orderId);

            if (error) throw error;

            soundManager.playReady();
            updateOrderStatus(orderId, 'ready');
            toast.success('Order ready for pickup!');
        } catch (error) {
            console.error('Error updating order:', error);
            toast.error('Failed to update status');
        }
    };

    // Update local order status
    const updateOrderStatus = (orderId: string, newStatus: Order['status']) => {
        setOrders(prevOrders =>
            prevOrders.map(order =>
                order.id === orderId ? { ...order, status: newStatus } : order
            )
        );
    };

    // Refresh orders
    const handleRefresh = async () => {
        if (isDemoMode) {
            toast.info('Demo mode - no new orders');
            return;
        }

        if (restaurantId) {
            toast.promise(fetchOrders(restaurantId), {
                loading: 'Refreshing orders...',
                success: 'Orders refreshed!',
                error: 'Failed to refresh'
            });
        }
    };

    // Group orders by relative time
    const groupOrdersByTime = (ordersToGroup: typeof orders) => {
        const now = new Date();
        const grouped: { [key: string]: typeof orders } = {
            'Last 2 Hours ⏳': [],
            'Today 📅': [],
            'Yesterday ⏪': [],
            'This Week 📆': [],
            'Older 🕰️': []
        };

        const isSameDay = (d1: Date, d2: Date) =>
            d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear();

        const isYesterday = (d1: Date, d2: Date) => {
            const yesterday = new Date(d2);
            yesterday.setDate(yesterday.getDate() - 1);
            return isSameDay(d1, yesterday);
        };

        ordersToGroup.forEach(order => {
            const orderDate = new Date(order.created_at);
            const diffHours = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffHours <= 2) {
                grouped['Last 2 Hours ⏳'].push(order);
            } else if (isSameDay(orderDate, now)) {
                grouped['Today 📅'].push(order);
            } else if (isYesterday(orderDate, now)) {
                grouped['Yesterday ⏪'].push(order);
            } else if (diffDays <= 7) {
                grouped['This Week 📆'].push(order);
            } else {
                grouped['Older 🕰️'].push(order);
            }
        });

        // Remove empty groups
        return Object.fromEntries(Object.entries(grouped).filter(([_, group]) => group.length > 0));
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-zinc-600">Loading orders...</div>
            </div>
        );
    }

    return (
        <div className="text-slate-900 dark:text-slate-100 font-display min-h-screen relative overflow-x-hidden selection:bg-[var(--primary)]/30" onClick={() => soundManager.unlockAudio()}>
            {/* Ambient Background Glows - Matches Overview exactly */}
            <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] ambient-glow-red pointer-events-none z-0 hidden dark:block"></div>
            <div className="fixed bottom-[-10%] right-[-10%] w-[60%] h-[60%] ambient-glow-gold pointer-events-none z-0 hidden dark:block"></div>
            <div className="fixed top-[20%] right-[10%] w-[40%] h-[40%] ambient-glow-red opacity-50 pointer-events-none z-0 hidden dark:block"></div>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto relative z-10 w-full h-full">
                {/* Header */}
                <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                            {counts.pending > 0 ? (
                                <BellRing className={`w-8 h-8 text-[var(--primary)] animate-pulse drop-shadow-lg`} />
                            ) : (
                                <Bell className="w-8 h-8 text-slate-400" />
                            )}
                            Orders Management
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">
                            {counts.pending > 0
                                ? `⚡ ${counts.pending} pending order${counts.pending > 1 ? 's' : ''} need${counts.pending === 1 ? 's' : ''} attention!`
                                : 'Real-time floor and delivery management'
                            }
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        {isDemoMode && (
                            <div className="bg-purple-500/20 border border-purple-500 px-4 py-2 rounded-xl text-purple-300 font-medium">
                                🎭 Demo Mode
                            </div>
                        )}
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setSoundEnabled(!soundEnabled);
                                    soundManager.setEnabled(!soundEnabled);
                                    toast.info(soundEnabled ? 'Sounds disabled' : 'Sounds enabled');
                                }}
                                className={`w-10 h-10 order-glass-card rounded-xl flex items-center justify-center transition-colors ${soundEnabled ? 'text-[var(--primary)] bg-[var(--primary)]/10 border-[var(--primary)]/30' : 'text-slate-400 hover:text-white'}`}
                                title={soundEnabled ? 'Click to disable sounds' : 'Click to enable sounds'}
                            >
                                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                            </button>
                            <button
                                onClick={handleRefresh}
                                className="w-10 h-10 order-glass-card rounded-xl flex items-center justify-center text-slate-300 hover:text-white transition-colors"
                            >
                                <RefreshCw className="w-5 h-5" />
                            </button>
                        </div>
                        <button
                            onClick={() => setIsNewOrderModalOpen(true)}
                            className="bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-[var(--primary)]/30 flex items-center gap-2 transition-all active:scale-95"
                        >
                            <Plus className="w-5 h-5 stroke-[3]" />
                            <span className="hidden sm:inline">New Order</span>
                        </button>
                    </div>
                </header>

                {lowStockItems.length > 0 && (
                    <div className="mb-6 order-glass-panel rounded-2xl border border-orange-500/20 p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-4 h-4 text-orange-400" />
                            </div>
                            <p className="text-sm font-black text-orange-400">
                                {lowStockItems.filter(i => i.stock === 0).length > 0
                                    ? `${lowStockItems.filter(i => i.stock === 0).length} items out of stock`
                                    : `${lowStockItems.length} items running low`}
                            </p>
                            <a
                                href="/dashboard/menu"
                                className="ml-auto text-xs font-bold text-slate-400 hover:text-white transition-colors"
                            >
                                Manage Stock →
                            </a>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {lowStockItems.slice(0, 5).map((item, i) => (
                                <span key={i} className={`text-xs font-bold px-3 py-1 rounded-full border ${item.stock === 0
                                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                    : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                    }`}>
                                    {item.name}: {item.stock === 0 ? 'Out' : `${item.stock} left`}
                                </span>
                            ))}
                            {lowStockItems.length > 5 && (
                                <span className="text-xs font-bold text-slate-500 px-3 py-1">
                                    +{lowStockItems.length - 5} more
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Environment Tabs (Dine-in vs Delivery) */}
                <div className="inline-flex p-1.5 order-glass-panel rounded-2xl mb-8 border border-white/5">
                    <button
                        onClick={() => setActiveTab('DINE_IN')}
                        className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'DINE_IN' ? 'bg-[var(--primary)] text-white shadow-inner' : 'text-slate-400 hover:text-white'}`}
                    >
                        Dine-In Tables
                    </button>
                    <button
                        onClick={() => setActiveTab('DELIVERY')}
                        className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'DELIVERY' ? 'bg-[var(--primary)] text-white shadow-inner' : 'text-slate-400 hover:text-white'}`}
                    >
                        Online & Delivery
                    </button>
                </div>

                {/* Filters */}
                <OrderFilters
                    selected={selectedFilter}
                    onChange={setSelectedFilter}
                    counts={counts}
                />

                {/* Orders Grid */}
                {filteredOrders.length > 0 ? (
                    <>
                        <div className="flex items-center justify-between p-4 order-glass-panel rounded-xl mb-10 border border-[var(--primary)]/10">
                            <div
                                className="flex items-center gap-4 cursor-pointer group"
                                onClick={() => {
                                    if (selectedOrders.length === filteredOrders.length) {
                                        setSelectedOrders([]);
                                    } else {
                                        setSelectedOrders(filteredOrders.map(o => o.id));
                                    }
                                }}
                            >
                                <input
                                    className="w-5 h-5 rounded border border-[var(--primary)]/30 bg-white/5 text-[var(--primary)] focus:ring-[var(--primary)]/50 focus:ring-offset-[#18080a] cursor-pointer"
                                    type="checkbox"
                                    checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                                    readOnly
                                />
                                <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">
                                    {selectedOrders.length === filteredOrders.length && filteredOrders.length > 0 ? 'Deselect All Orders' : 'Select All Orders'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-[var(--primary)] font-bold text-sm">
                                Showing {filteredOrders.length} Order(s)
                            </div>
                        </div>
                        <div className="space-y-8">
                            {Object.entries(groupOrdersByTime(filteredOrders)).map(([groupName, groupOrders]) => (
                                <div key={groupName} className="relative">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--primary)]/20 to-transparent"></div>
                                        <span className="text-xs font-black uppercase tracking-[0.3em] text-[var(--primary)]/60 flex items-center gap-2">
                                            {groupName} <span className="bg-[var(--primary)]/20 text-[var(--primary)] rounded-md px-1.5 py-0.5 text-[10px]">{groupOrders.length}</span>
                                        </span>
                                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--primary)]/20 to-transparent"></div>
                                    </div>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                                        {groupOrders.map(order => (
                                            <OrderCard
                                                key={order.id}
                                                order={order}
                                                onAccept={handleAccept}
                                                onReject={handleReject}
                                                onMarkCooking={handleMarkCooking}
                                                onMarkReady={handleMarkReady}
                                                onSettleBill={(order) => setCheckoutOrder(order)}
                                                onDeleteOrder={handleDeleteOrder}
                                                onEditOrder={(order) => {
                                                    setEditOrderInfo({
                                                        orderId: order.id,
                                                        tableNo: order.table_number || '',
                                                        orderType: order.order_type || 'DINE_IN',
                                                        customerName: order.customer_name || '',
                                                        customerPhone: order.customer_phone || '',
                                                        deliveryAddress: order.customer_address || ''
                                                    });
                                                    setIsNewOrderModalOpen(true);
                                                }}
                                                onRemoveItem={handleRemoveItem}
                                                isDemoMode={isDemoMode}
                                                isSelected={selectedOrders.includes(order.id)}
                                                onToggleSelect={(id) => {
                                                    setSelectedOrders(prev =>
                                                        prev.includes(id) ? prev.filter(oId => oId !== id) : [...prev, id]
                                                    );
                                                }}
                                                formatPrice={formatOrderPrice}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="relative mb-20 mt-10">
                        <div className="relative order-glass-panel rounded-2xl border border-dashed border-[var(--primary)]/30 p-16 text-center">
                            <Package className="w-16 h-16 text-[var(--primary)]/40 mx-auto mb-6" />

                            <h3 className="text-xl font-bold text-white mb-2">
                                {selectedFilter === 'all'
                                    ? 'No orders yet'
                                    : `No ${selectedFilter} orders`}
                            </h3>

                            <p className="text-slate-400 font-medium mb-8 max-w-sm mx-auto">
                                {selectedFilter === 'all'
                                    ? 'Orders from your QR menu will appear here in real time.'
                                    : `No orders with status "${selectedFilter}" right now.`}
                            </p>

                            {selectedFilter === 'all' && (
                                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                                    <button
                                        onClick={() => setIsNewOrderModalOpen(true)}
                                        className="bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all"
                                    >
                                        <Plus className="w-4 h-4" /> Add Manual Order
                                    </button>
                                    <a
                                        href="/dashboard/qr"
                                        className="text-slate-400 hover:text-white px-6 py-2.5 rounded-xl font-bold border border-white/10 hover:border-white/30 transition-all"
                                    >
                                        View QR Code →
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Bulk Actions Floating Bar */}
                {selectedOrders.length > 0 && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] order-glass-panel px-6 py-4 rounded-full flex items-center justify-between gap-6 border border-white/10" style={{ animation: 'modalPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                        <span className="font-bold text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]">{selectedOrders.length} order(s) selected</span>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSelectedOrders([])}
                                className="px-4 py-2 hover:bg-white/5 rounded-full font-medium transition-colors text-slate-300 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                className="px-5 py-2 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white rounded-full font-bold transition-all shadow-lg shadow-[var(--primary)]/30 flex items-center gap-2 active:scale-95"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete Selected
                            </button>
                        </div>
                    </div>
                )
                }

                {/* Global Modals */}
                <ConfirmModal
                    isOpen={confirmDialog.isOpen}
                    title={confirmDialog.title}
                    message={confirmDialog.message}
                    isDestructive={confirmDialog.isDestructive}
                    confirmText={confirmDialog.confirmText}
                    onConfirm={confirmDialog.action}
                    onCancel={() => setConfirmDialog(p => ({ ...p, isOpen: false }))}
                />

                {/* Cashier New Custom Order Modal */}
                {
                    restaurantId && (
                        <NewOrderModal
                            isOpen={isNewOrderModalOpen}
                            onClose={() => {
                                setIsNewOrderModalOpen(false);
                                setEditOrderInfo(null);
                            }}
                            restaurantId={restaurantId}
                            onOrderPlaced={() => fetchOrders(restaurantId)}
                            defaultTableNo={editOrderInfo?.tableNo}
                            defaultOrderType={editOrderInfo?.orderType as any}
                            defaultCustomerName={editOrderInfo?.customerName}
                            defaultCustomerPhone={editOrderInfo?.customerPhone}
                            defaultDeliveryAddress={editOrderInfo?.deliveryAddress}
                            formatPrice={formatOrderPrice}
                        />
                    )
                }

                {/* Checkout / Settle Bill Modal */}
                <CheckoutModal
                    isOpen={!!checkoutOrder}
                    onClose={() => setCheckoutOrder(null)}
                    order={checkoutOrder}
                    onPaymentComplete={() => {
                        if (restaurantId) fetchOrders(restaurantId);
                    }}
                    formatPrice={formatOrderPrice}
                />
            </main >
        </div >
    );
}
