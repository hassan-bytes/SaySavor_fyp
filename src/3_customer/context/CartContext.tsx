// ============================================================
// FILE: CartContext.tsx
// SECTION: 3_customer > context
// PURPOSE: Shopping cart management for the customer.
//          Handles Add/Remove/Update items and persistence.
// ============================================================
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import type { CartItem } from '@/3_customer/types/customer';
import { GUEST_ID_KEY } from '@/3_customer/types/customer';

interface CartContextType {
    cartItems: CartItem[];
    addToCart: (item: CartItem) => void;
    removeFromCart: (index: number) => void;
    updateQuantity: (index: number, quantity: number) => void;
    clearCart: () => void;
    totalAmount: number;
    totalCount: number;
    currentRestaurantId: string | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'ss_customer_cart';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [currentRestaurantId, setCurrentRestaurantId] = useState<string | null>(null);

    // Initial load
    useEffect(() => {
        const savedCart = localStorage.getItem(CART_STORAGE_KEY);
        if (savedCart) {
            try {
                const parsed = JSON.parse(savedCart);
                setCartItems(parsed.items || []);
                setCurrentRestaurantId(parsed.restaurantId || null);
            } catch (e) {
                console.error('Error parsing cart from storage:', e);
            }
        }
    }, []);

    // Save to storage
    useEffect(() => {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({
            items: cartItems,
            restaurantId: currentRestaurantId
        }));
    }, [cartItems, currentRestaurantId]);

    const addToCart = (newItem: CartItem) => {
        // Multi-restaurant check
        if (currentRestaurantId && newItem.menuItem.restaurant_id !== currentRestaurantId) {
            toast.error('Ek waqt mein sirf ek restaurant se order kiya ja sakta hai.', {
                description: 'Naya order start karne ke lye purana cart clear karna hoga.',
                action: {
                    label: 'Clear Cart',
                    onClick: () => {
                        setCartItems([newItem]);
                        setCurrentRestaurantId(newItem.menuItem.restaurant_id);
                        toast.success('Cart clear kar ke naya item add kar dya gaya hai.');
                    }
                }
            });
            return;
        }

        // Check if exact item (same variants/modifiers) already exists
        const existingIndex = cartItems.findIndex(item => 
            item.menuItem.id === newItem.menuItem.id &&
            JSON.stringify(item.selectedVariant) === JSON.stringify(newItem.selectedVariant) &&
            JSON.stringify(item.selectedModifiers) === JSON.stringify(newItem.selectedModifiers)
        );

        if (existingIndex > -1) {
            const updated = [...cartItems];
            updated[existingIndex].quantity += newItem.quantity;
            setCartItems(updated);
            toast.success(`${newItem.menuItem.name} ki quantity barha di gayi hai.`);
        } else {
            setCartItems([...cartItems, newItem]);
            setCurrentRestaurantId(newItem.menuItem.restaurant_id);
            toast.success(`${newItem.menuItem.name} cart mein add kar dya gaya hai.`);
        }
    };

    const removeFromCart = (index: number) => {
        const updated = cartItems.filter((_, i) => i !== index);
        setCartItems(updated);
        if (updated.length === 0) {
            setCurrentRestaurantId(null);
        }
    };

    const updateQuantity = (index: number, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(index);
            return;
        }
        const updated = [...cartItems];
        updated[index].quantity = quantity;
        setCartItems(updated);
    };

    const clearCart = () => {
        setCartItems([]);
        setCurrentRestaurantId(null);
    };

    const totalAmount = Math.round(cartItems.reduce((acc, item) => {
        const base = item.selectedVariant ? item.selectedVariant.price : item.menuItem.price;
        const modifiersTotal = (item.selectedModifiers || []).reduce((mAcc, mod) => mAcc + mod.price, 0);
        return acc + (base + modifiersTotal) * item.quantity;
    }, 0) * 100) / 100;

    const totalCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

    return (
        <CartContext.Provider value={{
            cartItems,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            totalAmount,
            totalCount,
            currentRestaurantId
        }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
