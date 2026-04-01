import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Plus, Minus, Search, Trash2 } from 'lucide-react';
import { supabase } from '@/shared/lib/supabaseClient';
import { toast } from 'sonner';
import type { Order, OrderItem } from '@/shared/types/orderTypes';

interface MenuVariant {
  id: string;
  name: string;
  price: number;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category_id?: string | null;
  categories?: { name: string } | null;
  category?: string;
  variants?: MenuVariant[];
}

interface EditableItem {
  id?: string;
  tempId: string;
  menu_item_id?: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  item_notes?: string | null;
  variant_details?: any;
  modifiers_info?: any;
}

interface EditOrderModalProps {
  isOpen: boolean;
  order: Order | null;
  restaurantId: string | null;
  currencySymbol?: string;
  onClose: () => void;
  onSaved?: () => void;
}

const makeTempId = () => `tmp_${Math.random().toString(36).slice(2, 10)}`;

const toEditableItem = (item: OrderItem): EditableItem => ({
  id: item.id,
  tempId: item.id,
  menu_item_id: item.menu_item_id ?? null,
  item_name: item.item_name,
  quantity: item.quantity,
  unit_price: item.unit_price,
  total_price: item.total_price,
  item_notes: item.item_notes ?? null,
  variant_details: item.variant_details ?? null,
  modifiers_info: (item as any).modifiers_info ?? null,
});

const EditOrderModal: React.FC<EditOrderModalProps> = ({
  isOpen,
  order,
  restaurantId,
  currencySymbol = 'Rs.',
  onClose,
  onSaved,
}) => {
  const [items, setItems] = useState<EditableItem[]>([]);
  const [discountInput, setDiscountInput] = useState('0');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [addQty, setAddQty] = useState(1);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const selectedPanelRef = useRef<HTMLDivElement | null>(null);

  const formatPrice = (price: number) =>
    `${currencySymbol} ${Number(price || 0).toLocaleString('en', { maximumFractionDigits: 0 })}`;

  useEffect(() => {
    if (!isOpen || !order) return;
    setItems(order.order_items.map(toEditableItem));
    setDiscountInput(String(order.discount_amount ?? 0));
  }, [isOpen, order]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add('no-scroll');
    document.documentElement.classList.add('no-scroll');
    return () => {
      document.body.classList.remove('no-scroll');
      document.documentElement.classList.remove('no-scroll');
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !restaurantId) return;

    const fetchMenu = async () => {
      try {
        const { data: catData } = await supabase
          .from('categories')
          .select('id, name')
          .eq('restaurant_id', restaurantId)
          .order('sort_order');
        setCategories(catData || []);

        const { data: menuData } = await supabase
          .from('menu_items')
          .select('id, name, price, category_id, categories(name)')
          .eq('restaurant_id', restaurantId)
          .eq('is_available', true);

        const baseItems = (menuData || []) as MenuItem[];
        if (baseItems.length === 0) {
          setMenuItems([]);
          return;
        }

        const ids = baseItems.map((item) => item.id);
        const { data: variantsData } = await (supabase as any)
          .from('menu_variants')
          .select('id, item_id, name, price')
          .in('item_id', ids);

        const variantsMap: Record<string, MenuVariant[]> = {};
        (variantsData || []).forEach((variant: any) => {
          if (!variantsMap[variant.item_id]) variantsMap[variant.item_id] = [];
          variantsMap[variant.item_id].push({
            id: variant.id,
            name: variant.name,
            price: variant.price,
          });
        });

        const hydrated = baseItems.map((item) => ({
          ...item,
          category: item.categories?.name || 'Other',
          variants: variantsMap[item.id] || [],
        }));
        setMenuItems(hydrated);
      } catch (err: any) {
        console.error('[EditOrderModal] Menu load error:', err?.message || err);
        toast.error('Failed to load menu items');
      }
    };

    fetchMenu();
  }, [isOpen, restaurantId]);

  useEffect(() => {
    if (!selectedMenuItem) return;
    if (selectedMenuItem.variants && selectedMenuItem.variants.length > 0) {
      setSelectedVariantId(selectedMenuItem.variants[0].id);
    } else {
      setSelectedVariantId('');
    }
    setAddQty(1);
  }, [selectedMenuItem]);

  useEffect(() => {
    if (!selectedMenuItem) return;
    selectedPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedMenuItem]);

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (activeCategory !== 'all' && item.category !== activeCategory) return false;
      if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [menuItems, activeCategory, searchQuery]);

  const addMenuItemDirect = (item: MenuItem) => {
    if (item.variants && item.variants.length > 0) {
      setSelectedMenuItem(item);
      return;
    }
    const nextItem: EditableItem = {
      tempId: makeTempId(),
      menu_item_id: item.id,
      item_name: item.name,
      quantity: 1,
      unit_price: item.price,
      total_price: item.price,
      item_notes: null,
      variant_details: null,
      modifiers_info: null,
    };
    setItems((prev) => [...prev, nextItem]);
  };

  const addMenuItem = () => {
    if (!selectedMenuItem) return;
    const variant = selectedMenuItem.variants?.find((v) => v.id === selectedVariantId) || null;
    const unitPrice = variant ? variant.price : selectedMenuItem.price;
    const nextItem: EditableItem = {
      tempId: makeTempId(),
      menu_item_id: selectedMenuItem.id,
      item_name: selectedMenuItem.name,
      quantity: addQty,
      unit_price: unitPrice,
      total_price: unitPrice * addQty,
      item_notes: null,
      variant_details: variant ? { id: variant.id, name: variant.name, price: variant.price } : null,
      modifiers_info: null,
    };
    setItems((prev) => [...prev, nextItem]);
    setSelectedMenuItem(null);
  };

  const addCustomItem = () => {
    const name = customName.trim();
    const price = Number(customPrice);
    if (!name || !Number.isFinite(price) || price <= 0) {
      toast.error('Enter a valid custom item and price');
      return;
    }

    const nextItem: EditableItem = {
      tempId: makeTempId(),
      menu_item_id: null,
      item_name: name,
      quantity: 1,
      unit_price: price,
      total_price: price,
      item_notes: null,
      variant_details: null,
      modifiers_info: null,
    };
    setItems((prev) => [...prev, nextItem]);
    setCustomName('');
    setCustomPrice('');
  };

  const updateItemQty = (index: number, nextQty: number) => {
    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[index] };
      item.quantity = Math.max(1, nextQty);
      item.total_price = item.unit_price * item.quantity;
      next[index] = item;
      return next;
    });
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const calcItemsTotal = (list: EditableItem[]) =>
    list.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  const hasItemChanged = (current: EditableItem, original: OrderItem) => {
    if (current.quantity !== original.quantity) return true;
    if (current.unit_price !== original.unit_price) return true;
    if (current.item_name !== original.item_name) return true;
    if ((current.item_notes || '') !== (original.item_notes || '')) return true;
    const curVariant = current.variant_details ? JSON.stringify(current.variant_details) : '';
    const origVariant = original.variant_details ? JSON.stringify(original.variant_details) : '';
    if (curVariant !== origVariant) return true;
    return false;
  };

  const handleSave = async () => {
    if (!order) return;
    if (items.length === 0) {
      toast.error('Order must have at least one item');
      return;
    }

    setIsSaving(true);
    try {
      const originalItems = order.order_items || [];
      const originalMap = new Map(originalItems.map((item) => [item.id, item]));

      const removedIds = originalItems
        .filter((item) => !items.some((current) => current.id === item.id))
        .map((item) => item.id);

      if (removedIds.length > 0) {
        const { error: deleteError } = await (supabase as any)
          .from('order_items')
          .delete()
          .in('id', removedIds);
        if (deleteError) throw deleteError;
      }

      const updates = items.filter((item) => item.id && originalMap.has(item.id));
      if (updates.length > 0) {
        await Promise.all(updates.map(async (item) => {
          const original = originalMap.get(item.id!);
          if (!original || !hasItemChanged(item, original)) return;
          const { error } = await (supabase as any)
            .from('order_items')
            .update({
              item_name: item.item_name,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.unit_price * item.quantity,
              item_notes: item.item_notes ?? null,
              variant_details: item.variant_details ?? null,
              modifiers_info: item.modifiers_info ?? null,
            })
            .eq('id', item.id);
          if (error) throw error;
        }));
      }

      const inserts = items.filter((item) => !item.id).map((item) => ({
        order_id: order.id,
        menu_item_id: item.menu_item_id ?? null,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.unit_price * item.quantity,
        item_notes: item.item_notes ?? null,
        variant_details: item.variant_details ?? null,
        modifiers_info: item.modifiers_info ?? null,
      }));

      if (inserts.length > 0) {
        const { error: insertError } = await (supabase as any)
          .from('order_items')
          .insert(inserts);
        if (insertError) throw insertError;
      }

      const discountAmount = Math.max(0, Number(discountInput) || 0);
      const itemsTotal = calcItemsTotal(items);
      const deliveryFee = order.delivery_fee ?? 0;
      const taxAmount = order.tax_amount ?? 0;
      const totalAmount = Math.max(0, itemsTotal + deliveryFee + taxAmount - discountAmount);

      const { error: orderError } = await (supabase as any)
        .from('orders')
        .update({
          total_amount: totalAmount,
          discount_amount: discountAmount,
        })
        .eq('id', order.id);

      if (orderError) throw orderError;

      toast.success('Order updated');
      onSaved?.();
      onClose();
    } catch (err: any) {
      console.error('[EditOrderModal] Save error:', err?.message || err);
      toast.error(err?.message || 'Failed to update order');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !order) return null;

  const discountValue = Math.max(0, Number(discountInput) || 0);
  const itemsTotal = calcItemsTotal(items);
  const deliveryFee = order.delivery_fee ?? 0;
  const taxAmount = order.tax_amount ?? 0;
  const finalTotal = Math.max(0, itemsTotal + deliveryFee + taxAmount - discountValue);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto custom-scrollbar"
      style={{ overscrollBehavior: 'contain' }}
    >
      <div className="w-full max-w-5xl max-h-[85vh] bg-[#0b0b0b] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-white text-lg font-black">Edit Order #{order.id.slice(-4).toUpperCase()}</h2>
            <p className="text-xs text-slate-500">Update items and discount for this order</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div
          className="p-6 space-y-6 overflow-y-auto custom-scrollbar"
          style={{ maxHeight: '65vh', overscrollBehavior: 'contain' }}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">{itemCount} items</span>
            <span>Subtotal: <span className="text-white font-semibold">{formatPrice(itemsTotal)}</span></span>
            <span>Total: <span className="text-emerald-400 font-semibold">{formatPrice(finalTotal)}</span></span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
            <div className="space-y-6">
            <div className="bg-black/40 border border-white/10 rounded-2xl p-4">
              <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-4">Current Items</h3>
              <div className="space-y-3">
                {items.length === 0 ? (
                  <div className="text-slate-600 text-xs">No items yet. Add from the menu.</div>
                ) : (
                  items.map((item, idx) => (
                    <div key={item.tempId} className="flex items-center justify-between gap-4 bg-black/30 border border-white/5 rounded-xl p-3">
                      <div className="min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{item.item_name}</p>
                        <p className="text-[11px] text-slate-500">
                          {formatPrice(item.unit_price)} each • {formatPrice(item.total_price)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateItemQty(idx, item.quantity - 1)}
                          className="w-8 h-8 rounded-lg bg-white/5 text-slate-300 hover:text-white"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-sm text-white font-bold w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateItemQty(idx, item.quantity + 1)}
                          className="w-8 h-8 rounded-lg bg-white/5 text-slate-300 hover:text-white"
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          onClick={() => removeItem(idx)}
                          className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:text-red-300"
                          title="Remove item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-2xl p-4">
              <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-4">Discount</h3>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={discountInput}
                  min={0}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white"
                  placeholder="Discount amount"
                />
                <span className="text-xs text-slate-400">{currencySymbol}</span>
              </div>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-2xl p-4">
              <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-4">Totals</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Items</span>
                  <span>{formatPrice(itemsTotal)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Delivery</span>
                  <span>{formatPrice(deliveryFee)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Tax</span>
                  <span>{formatPrice(taxAmount)}</span>
                </div>
                {discountValue > 0 ? (
                  <div className="flex justify-between text-orange-400">
                    <span>Discount</span>
                    <span>- {formatPrice(discountValue)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-white font-bold">
                  <span>Total</span>
                  <span>{formatPrice(finalTotal)}</span>
                </div>
              </div>
            </div>
          </div>

            <div className="space-y-6">
            <div className="bg-black/40 border border-white/10 rounded-2xl p-4">
              <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-4">Add Menu Item</h3>
              <div className="flex items-center gap-2 mb-4">
                <Search size={16} className="text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search menu"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => setActiveCategory('all')}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold ${activeCategory === 'all' ? 'bg-orange-500 text-white' : 'bg-white/5 text-slate-400'}`}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.name)}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold ${activeCategory === cat.name ? 'bg-orange-500 text-white' : 'bg-white/5 text-slate-400'}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {selectedMenuItem && (
                <div ref={selectedPanelRef} className="mb-4 bg-black/50 border border-white/10 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-white font-semibold">{selectedMenuItem.name}</p>
                    <button onClick={() => setSelectedMenuItem(null)} className="text-slate-500">Close</button>
                  </div>
                  {selectedMenuItem.variants && selectedMenuItem.variants.length > 0 && (
                    <select
                      value={selectedVariantId}
                      onChange={(e) => setSelectedVariantId(e.target.value)}
                      className="w-full mt-3 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white"
                    >
                      {selectedMenuItem.variants.map((variant) => (
                        <option key={variant.id} value={variant.id}>
                          {variant.name} ({formatPrice(variant.price)})
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="flex items-center gap-3 mt-3">
                    <button
                      onClick={() => setAddQty(Math.max(1, addQty - 1))}
                      className="w-7 h-7 rounded-lg bg-white/5 text-slate-300"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-sm text-white font-bold">{addQty}</span>
                    <button
                      onClick={() => setAddQty(addQty + 1)}
                      className="w-7 h-7 rounded-lg bg-white/5 text-slate-300"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      onClick={addMenuItem}
                      className="ml-auto px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold"
                    >
                      Add Item
                    </button>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {filteredMenuItems.length === 0 ? (
                  <div className="text-slate-600 text-xs">No items match your filters.</div>
                ) : (
                  filteredMenuItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3 py-2"
                    >
                      <div>
                        <p className="text-sm text-white font-semibold">{item.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {formatPrice(item.price)}
                          {item.variants && item.variants.length > 0 ? ' • Options' : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => addMenuItemDirect(item)}
                        className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-white font-bold"
                      >
                        {item.variants && item.variants.length > 0 ? 'Select' : 'Add'}
                      </button>
                    </div>
                  ))
                )}
              </div>

            </div>

            <div className="bg-black/40 border border-white/10 rounded-2xl p-4">
              <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-4">Custom Item</h3>
              <div className="space-y-3">
                <input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Item name"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
                <input
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  placeholder="Price"
                  type="number"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
                <button
                  onClick={addCustomItem}
                  className="w-full px-4 py-2 rounded-xl bg-white/5 text-white text-xs font-bold"
                >
                  Add Custom Item
                </button>
              </div>
            </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-t border-white/10 bg-black/30">
          <div className="text-xs text-slate-400">
            Total: <span className="text-emerald-400 font-semibold">{formatPrice(finalTotal)}</span>
          </div>
          <div className="flex items-center gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/5 text-white text-xs font-bold">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || items.length === 0}
            className="px-5 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditOrderModal;
