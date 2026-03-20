import React, { useState, useEffect, useRef } from 'react';
import {
  Package, Plus, Search, X, AlertCircle, Minus, Gift,
  ChevronDown, ChevronRight
} from 'lucide-react';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { MenuItem, DealItem } from '@/shared/types/menu';
import { DynamicFoodImage } from '@/2_partner/setup/pages/RestaurantSetup';

export type { DealItem };

interface DealBuilderProps {
  existingItems: MenuItem[];
  initialDealItems?: DealItem[];
  onDealItemsChange: (items: DealItem[]) => void;
  discountPercentage: number | null;
  setDiscountPercentage: (val: number | null) => void;
  offerName: string | null;
  setOfferName: (val: string | null) => void;
  onPriceSync: (price: number) => void;
  formatPrice?: (price: number | string) => string;
}

const DealBuilder: React.FC<DealBuilderProps> = ({
  existingItems,
  initialDealItems = [],
  onDealItemsChange,
  discountPercentage,
  setDiscountPercentage,
  offerName,
  setOfferName,
  onPriceSync,
  formatPrice = (p) =>
    typeof p === 'number'
      ? p.toLocaleString('en', { maximumFractionDigits: 0 })
      : String(p),
}) => {
  const [items, setItems] = useState<DealItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const rightPanelRef = React.useRef<HTMLDivElement>(null);

  // Load initial items ONCE
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current && initialDealItems.length > 0) {
      setItems(initialDealItems);
      initializedRef.current = true;
    }
  }, [initialDealItems.length]);

  // Sync items to parent — use ref to avoid stale onDealItemsChange
  const onChangeRef = useRef(onDealItemsChange);
  useEffect(() => { onChangeRef.current = onDealItemsChange; });
  useEffect(() => {
    onChangeRef.current(items);
  }, [items]);

  // Price sync — use ref to avoid infinite loop
  const onPriceSyncRef = useRef(onPriceSync);
  useEffect(() => { onPriceSyncRef.current = onPriceSync; });

  const paidItems = items.filter(i => !i.is_free);
  const freeItems = items.filter(i => i.is_free);
  const computedOriginalPrice = paidItems.reduce(
    (s, i) => s + i.original_price * i.quantity, 0
  );
  const totalFreeValue = freeItems.reduce(
    (s, i) => s + i.original_price * i.quantity, 0
  );
  const finalPrice = Math.round(
    computedOriginalPrice * (1 - (discountPercentage || 0) / 100)
  );
  const totalSavings =
    Math.round(computedOriginalPrice * (discountPercentage || 0) / 100) +
    totalFreeValue;

  const prevPriceRef = useRef<number>(-1);
  useEffect(() => {
    if (computedOriginalPrice > 0 && prevPriceRef.current !== finalPrice) {
      prevPriceRef.current = finalPrice;
      onPriceSyncRef.current(finalPrice);
    }
  }, [finalPrice, computedOriginalPrice]);

  // Item grouping
  const availableItems = existingItems.filter(
    item =>
      item.item_type !== 'deal' &&
      (item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.cuisine?.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  const groupedItems = availableItems.reduce((acc, item) => {
    const cat = item.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);
  const categories = Object.keys(groupedItems).sort();

  useEffect(() => {
    if (categories.length === 0) return;
    if (searchTerm.trim()) {
      setExpandedCategories([...categories]);
    } else if (expandedCategories.length === 0) {
      setExpandedCategories([categories[0]]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories.length, searchTerm]);

  // Handlers — ALL use functional updaters (no stale closure possible)
  const addItem = (menuItem: MenuItem) => {
    setItems(prev => {
      const existing = prev.find(d => d.item_id === menuItem.id);
      if (existing) {
        return prev.map(d =>
          d.item_id === menuItem.id
            ? { ...d, quantity: d.quantity + 1 }
            : d
        );
      }
      return [...prev, {
        item_id: menuItem.id,
        item_name: menuItem.name,
        original_price: menuItem.price,
        quantity: 1,
        image_url: menuItem.image_url,
        cuisine: menuItem.cuisine,
        category: menuItem.category,
        is_free: false,
      }];
    });
  };

  const updateQty = (itemId: string, delta: number) => {
    setItems(prev =>
      prev
        .map(d => d.item_id === itemId
          ? { ...d, quantity: Math.max(0, d.quantity + delta) }
          : d)
        .filter(d => d.quantity > 0)
    );
  };

  const removeItem = (itemId: string) => {
    setItems(prev => prev.filter(d => d.item_id !== itemId));
  };

  const toggleFree = (itemId: string) => {
    setItems(prev =>
      prev.map(d =>
        d.item_id === itemId ? { ...d, is_free: !d.is_free } : d
      )
    );
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const hasFreeItems = freeItems.length > 0;
  const hasDiscount = (discountPercentage || 0) > 0;

  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      flex: 1,
      minHeight: 0,
      width: '100%',
      overflow: 'hidden',
    }}>
      {/* LEFT PANEL */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        width: '44%',
        alignSelf: 'stretch',
        flexShrink: 0,
        overflow: 'hidden',
      }} className="bg-slate-900 rounded-2xl border border-slate-800">

        <div className="px-3 py-2.5 border-b border-slate-800 shrink-0 space-y-2">

          {/* Header row */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-white flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-amber-500/15 border
                               border-amber-500/20 flex items-center justify-center">
                <Plus className="w-3 h-3 text-amber-500" />
              </span>
              Add Items
            </p>
            <span className="text-[9px] font-black text-slate-500 bg-slate-800
                             px-1.5 py-0.5 rounded-md">
              {availableItems.length} available
            </span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2
                               w-3 h-3 text-slate-500 pointer-events-none" />
            <input
              placeholder="Search by name or category..."
              className="w-full bg-slate-800/80 border border-slate-700/60
                         rounded-xl h-7 pl-7 pr-3 text-[11px] text-white
                         placeholder:text-slate-600 focus:outline-none
                         focus:border-amber-500/40 focus:bg-slate-800
                         transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>

           <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}
             className="px-2.5 py-2 custom-scrollbar"
             onWheel={(e) => e.stopPropagation()}>
          {categories.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-600 text-xs">No items found</p>
            </div>
          ) : categories.map(cat => {
            const isExpanded = expandedCategories.includes(cat);
            return (
              <div key={cat} className="mb-0.5">
                <button
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className="w-full flex items-center justify-between px-1.5 py-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider hover:text-slate-300 transition-colors"
                >
                  <span>{cat}</span>
                  <div className="flex items-center gap-1">
                    <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[9px] font-black">
                      {groupedItems[cat].length}
                    </span>
                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </div>
                </button>

                {isExpanded && groupedItems[cat].map(menuItem => {
                  const entry = items.find(d => d.item_id === menuItem.id);
                  const isAdded = !!entry;
                  const isFree = entry?.is_free || false;
                  return (
                    <button
                      key={menuItem.id}
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); addItem(menuItem); }}
                      className={`w-full flex items-center gap-2 px-2 py-1.5
                                  rounded-xl border mb-0.5 transition-all text-left
                                  active:scale-[0.98]
                        ${isAdded
                          ? isFree
                            ? 'bg-green-500/10 border-green-500/20'
                            : 'bg-amber-500/10 border-amber-500/20'
                          : 'bg-slate-800/30 border-transparent hover:bg-slate-800/60 hover:border-slate-700/40'
                        }`}
                    >
                      {/* Compact image — smaller */}
                      <div className="w-7 h-7 rounded-lg bg-slate-950 overflow-hidden
                                      border border-slate-700/50 shrink-0">
                        <DynamicFoodImage
                          cuisine={menuItem.cuisine || ''}
                          category={menuItem.category || ''}
                          name={menuItem.name}
                          manualImage={menuItem.image_url || null}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Name + price inline */}
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <p className="text-[11px] font-bold text-white truncate flex-1">
                          {menuItem.name}
                        </p>
                        <p className="text-[10px] text-amber-500 font-black shrink-0">
                          {formatPrice(menuItem.price)}
                        </p>
                      </div>

                      {/* Status indicator */}
                      {isAdded ? (
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0
                          ${isFree
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-amber-500/20 text-amber-400'
                          }`}>
                          {isFree ? '🎁' : `×${entry?.quantity}`}
                        </span>
                      ) : (
                        <div className="w-5 h-5 rounded-md bg-slate-700/80 flex items-center
                                        justify-center text-slate-400 shrink-0">
                          <Plus className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* ══ RIGHT PANEL ══ */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: 'auto 1fr',
          flex: 1,
          minWidth: 0,
          alignSelf: 'stretch',
          gap: '8px',
          minHeight: 0,
        }}
      >

        {/* ZONE 1 — Bundle (expands to fill) */}
        <div
          style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          className="bg-slate-900 rounded-2xl border border-slate-800"
        >
          {/* Bundle header */}
          <div className="px-3 py-2 border-b border-slate-800 flex items-center
                          justify-between shrink-0 bg-slate-800/20">
            <div className="flex items-center gap-2">
              <Package className="w-3.5 h-3.5 text-purple-400" />
              <p className="text-xs font-black text-white">Bundle</p>
              {items.length === 0 && (
                <span className="text-[9px] text-slate-600 font-bold">
                  (tap items on left to add)
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {hasFreeItems && (
                <span className="text-[9px] font-black text-green-400 bg-green-500/15
                                 px-1.5 py-0.5 rounded-full border border-green-500/20">
                  🎁 Free
                </span>
              )}
              {items.length > 0 && (
                <span className="text-[9px] font-black text-amber-400 bg-amber-500/15
                                 px-1.5 py-0.5 rounded-full border border-amber-500/20">
                  {items.reduce((a,i) => a + i.quantity, 0)} items
                </span>
              )}
            </div>
          </div>

          {/* Items list */}
          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center
                            py-6 px-4 text-center">
              <Package className="w-8 h-8 text-slate-700 mb-2" />
              <p className="text-xs font-black text-slate-500 mb-0.5">Bundle is empty</p>
              <p className="text-[10px] text-slate-600">← Tap items to add them</p>
            </div>
          ) : (
            <div
              style={{ overflowY: 'auto', maxHeight: '84px' }}
              className="custom-scrollbar"
              onWheel={(e) => e.stopPropagation()}
            >
              <div className="divide-y divide-slate-800/50">
                {items.map(item => (
                  <div key={item.item_id}
                       className={`flex items-center gap-2 px-3 py-2
                         ${item.is_free ? 'bg-green-500/[0.03]' : ''}`}>
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center
                                     shrink-0 text-[10px] font-black border
                      ${item.is_free
                        ? 'bg-green-500/15 border-green-500/25 text-green-400'
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                      {item.is_free ? <Gift className="w-3 h-3"/> : item.quantity}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-[10px] font-bold text-white truncate">
                          {item.item_name}
                        </p>
                        {item.is_free && (
                          <span className="text-[8px] font-black text-green-400
                                           bg-green-500/15 px-1 py-0.5 rounded shrink-0">
                            FREE
                          </span>
                        )}
                      </div>
                      <p className={`text-[9px] font-bold
                        ${item.is_free ? 'text-green-400' : 'text-slate-500'}`}>
                        {item.is_free
                          ? `Worth ${formatPrice(item.original_price * item.quantity)}` 
                          : formatPrice(item.original_price)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!item.is_free && (
                        <div className="flex items-center bg-slate-800 rounded-lg
                                        border border-slate-700/60 overflow-hidden h-5">
                          <button type="button" onClick={() => updateQty(item.item_id,-1)}
                            className="w-5 h-full flex items-center justify-center
                                       text-slate-400 hover:text-white hover:bg-slate-700">
                            <Minus className="w-2 h-2"/>
                          </button>
                          <span className="px-1 text-white font-black text-[9px]
                                           min-w-[14px] text-center">
                            {item.quantity}
                          </span>
                          <button type="button" onClick={() => updateQty(item.item_id,1)}
                            className="w-5 h-full flex items-center justify-center
                                       text-slate-400 hover:text-white hover:bg-slate-700">
                            <Plus className="w-2 h-2"/>
                          </button>
                        </div>
                      )}
                      <button type="button" onClick={() => toggleFree(item.item_id)}
                        className={`h-5 w-5 rounded-lg flex items-center justify-center
                                    text-[8px] font-black transition-all border
                          ${item.is_free
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                            : 'bg-slate-800 text-slate-500 border-slate-700/60 hover:text-green-400'}`}>
                        {item.is_free ? '💰' : <Gift className="w-2.5 h-2.5"/>}
                      </button>
                      <button type="button" onClick={() => removeItem(item.item_id)}
                        className="w-5 h-5 flex items-center justify-center rounded-lg
                                   text-slate-600 hover:text-red-400 hover:bg-red-500/10">
                        <X className="w-2.5 h-2.5"/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ZONE 2 — Pricing (always visible, auto height) */}
        <div
          style={{ overflowY: 'auto', minHeight: 0 }}
          className="bg-slate-900 rounded-2xl border border-slate-800 custom-scrollbar"
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 grid grid-cols-2 gap-2 border-b border-slate-800">
            <div className="space-y-0.5">
              <Label className="text-[8px] font-black text-slate-500 uppercase tracking-wider">
                Discount %
              </Label>
              <Input type="number" min="0" max="100" placeholder="0"
                className="h-7 text-sm font-black bg-slate-800 border-slate-700
                           rounded-lg text-amber-400 remove-arrow text-center"
                value={discountPercentage ?? ''}
                onChange={e => setDiscountPercentage(
                  Math.min(100, parseFloat(e.target.value)||0)||null
                )}/>
            </div>
            <div className="space-y-0.5">
              <Label className="text-[8px] font-black text-slate-500 uppercase tracking-wider">
                Deal Name
              </Label>
              <Input placeholder="e.g. Family Feast"
                className="h-7 bg-slate-800 border-slate-700 rounded-lg
                           text-white text-[11px] font-bold placeholder:text-slate-600"
                value={offerName||''} onChange={e => setOfferName(e.target.value)}/>
            </div>
          </div>

          <div className="px-3 py-2 space-y-1">
            {paidItems.length > 0 && (
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500 font-bold">Paid ({paidItems.length})</span>
                <span className="text-slate-300 font-black">{formatPrice(computedOriginalPrice)}</span>
              </div>
            )}
            {hasDiscount && (
              <div className="flex justify-between text-[10px]">
                <span className="text-amber-400 font-bold">-{discountPercentage}% off</span>
                <span className="text-amber-400 font-black">
                  -{formatPrice(Math.round(computedOriginalPrice*(discountPercentage||0)/100))}
                </span>
              </div>
            )}
            {hasFreeItems && (
              <div className="flex justify-between text-[10px]">
                <span className="text-green-400 font-bold flex items-center gap-1">
                  <Gift className="w-2.5 h-2.5"/> Free items
                </span>
                <span className="text-green-400 font-black">
                  +{formatPrice(totalFreeValue)} saved
                </span>
              </div>
            )}
          </div>

          <div className={`px-3 py-3 flex items-center justify-between border-t
            ${items.length > 0
              ? 'border-amber-500/20 bg-amber-500/5'
              : 'border-slate-800/50'}`}>
            <div>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-wider mb-0.5">
                Customer Pays
              </p>
              <p className={`font-black leading-none tabular-nums
                ${items.length===0 ? 'text-slate-600 text-sm' : 'text-white text-2xl'}`}>
                {items.length===0 ? '— add items' : formatPrice(finalPrice)}
              </p>
            </div>
            {totalSavings > 0 ? (
              <div className="text-right bg-green-500/10 border border-green-500/20
                              rounded-xl px-3 py-2">
                <p className="text-[8px] text-green-400 font-black uppercase tracking-wider">
                  Total Savings
                </p>
                <p className="text-lg font-black text-green-400 tabular-nums">
                  {formatPrice(totalSavings)}
                </p>
                <p className="text-[8px] text-green-500/50 font-bold">
                  {hasFreeItems && hasDiscount
                    ? `${discountPercentage}% + free` 
                    : hasFreeItems ? 'free items' : `${discountPercentage}% off`}
                </p>
              </div>
            ) : items.length > 0 ? (
              <div className="text-right opacity-30">
                <p className="text-[8px] text-slate-500 font-black uppercase">Savings</p>
                <p className="text-lg font-black text-slate-500">$0</p>
              </div>
            ) : null}
          </div>

          <div className="px-3 pb-2 flex items-center gap-1.5">
            <AlertCircle className={`w-3 h-3 shrink-0
              ${hasFreeItems ? 'text-green-500' : 'text-amber-500'}`}/>
            <p className={`text-[9px] font-bold
              ${hasFreeItems ? 'text-green-500/70' : 'text-amber-500/70'}`}>
              {hasFreeItems
                ? 'Shows as "BUY & GET FREE" 🎁 on your menu'
                : 'Shows as "VALUE BUNDLE" on your menu'}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DealBuilder;
