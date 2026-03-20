import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Button } from '@/shared/ui/button'
import { Timer, Tag, Calendar, X } from 'lucide-react'
import { supabase } from '@/shared/lib/supabaseClient'
import { toast } from 'sonner'
import { MenuItem } from '@/shared/types/menu'
import { DynamicFoodImage } from '@/2_partner/setup/pages/RestaurantSetup'

interface OfferModalProps {
  isOpen:       boolean
  onClose:      () => void
  items:        MenuItem[]
  editItem?:    MenuItem | null
  formatPrice:  (p: number) => string
  onSaved:      () => void
}

const QUICK_PRESETS = [
  { label: '2 hours',   hours: 2  },
  { label: '6 hours',   hours: 6  },
  { label: 'Tonight',   hours: 0, toMidnight: true },
  { label: 'Tomorrow',  hours: 24 },
  { label: '3 days',    hours: 72 },
  { label: '1 week',    hours: 168 },
]

export default function OfferModal({
  isOpen, onClose, items, editItem, formatPrice, onSaved
}: OfferModalProps) {

  const [selectedItemId, setSelectedItemId] = useState('')
  const [discount,       setDiscount]       = useState(10)
  const [expiresAt,      setExpiresAt]      = useState('')
  const [offerName,      setOfferName]      = useState('')
  const [saving,         setSaving]         = useState(false)
  const [search,         setSearch]         = useState('')

  // Format datetime-local min value (now)
  const nowLocal = new Date(
    Date.now() - new Date().getTimezoneOffset() * 60000
  ).toISOString().slice(0, 16)

  useEffect(() => {
    if (editItem) {
      setSelectedItemId(editItem.id)
      setDiscount(editItem.discount_percentage || 10)
      setOfferName(editItem.offer_name || '')
      if (editItem.offer_expires_at) {
        const d = new Date(editItem.offer_expires_at)
        setExpiresAt(
          new Date(d.getTime() - d.getTimezoneOffset() * 60000)
            .toISOString().slice(0, 16)
        )
      }
    } else {
      setSelectedItemId('')
      setDiscount(10)
      setExpiresAt('')
      setOfferName('')
    }
  }, [editItem, isOpen])

  const applyPreset = (preset: typeof QUICK_PRESETS[0]) => {
    const now = new Date()
    if (preset.toMidnight) {
      now.setHours(23, 59, 0, 0)
    } else {
      now.setTime(now.getTime() + preset.hours * 60 * 60 * 1000)
    }
    setExpiresAt(
      new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString().slice(0, 16)
    )
  }

  const selectedItem = items.find(i => i.id === selectedItemId)
  const originalPrice = selectedItem?.offer_original_price
                     || selectedItem?.price
                     || 0
  const discountedPrice = Math.round(originalPrice * (1 - discount / 100))

  const filteredItems = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.category || '').toLowerCase().includes(search.toLowerCase())
  )

  const handleSave = async () => {
    if (!selectedItemId) {
      toast.error('Please select an item')
      return
    }
    if (!expiresAt) {
      toast.error('Please set an expiry time')
      return
    }
    if (discount <= 0 || discount > 99) {
      toast.error('Discount must be between 1% and 99%')
      return
    }

    const expiresDate = new Date(expiresAt)
    if (expiresDate <= new Date()) {
      toast.error('Expiry time must be in the future')
      return
    }

    setSaving(true)
    try {
      const item = items.find(i => i.id === selectedItemId)!
      const basePrice = item.offer_original_price || item.price

      await supabase
        .from('menu_items')
        .update({
          price:                discountedPrice,
          discount_percentage:  discount,
          offer_name:           offerName || `${discount}% Off`,
          offer_expires_at:     expiresDate.toISOString(),
          offer_original_price: basePrice,
        })
        .eq('id', selectedItemId)

      toast.success(`Offer set! Expires ${expiresDate.toLocaleString()}`)
      onSaved()
    } catch (err) {
      toast.error('Failed to save offer')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-2xl w-[95vw] bg-[#0f172a]
                   border border-slate-700 p-0
                   rounded-2xl overflow-hidden"
        onInteractOutside={(e) => e.preventDefault()}
      >

        {/* Header */}
        <div className="flex items-center justify-between
                        px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20
                            flex items-center justify-center">
              <Timer className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">
                {editItem ? 'Edit Offer' : 'New Time-Limited Offer'}
              </h2>
              <p className="text-xs text-slate-500">
                Offer removes itself automatically when time expires
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10
                       flex items-center justify-center text-slate-400
                       hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div
          className="p-6 space-y-5 overflow-y-auto custom-scrollbar"
          style={{ maxHeight: '65vh', overscrollBehavior: 'contain' }}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >

          {/* Step 1 — Select item */}
          <div className="space-y-2">
            <Label className="text-xs font-black text-slate-400
                              uppercase tracking-wider">
              1. Select Item or Deal
            </Label>
            <Input
              placeholder="Search by name or category..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-10 bg-slate-800 border-slate-700
                         text-white rounded-xl mb-2"
            />
            <div className="max-h-48 overflow-y-auto space-y-1.5
                            custom-scrollbar">
              {filteredItems.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedItemId(item.id)}
                  className={`w-full flex items-center justify-between
                              p-3 rounded-xl border text-left transition-all
                    ${selectedItemId === item.id
                      ? 'bg-orange-500/10 border-orange-500/30'
                      : 'bg-slate-800/40 border-slate-700/40 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-700 overflow-hidden shrink-0">
                      <DynamicFoodImage
                        cuisine={item.cuisine || ''}
                        category={item.category || ''}
                        name={item.name}
                        manualImage={item.image_url || null}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {item.category} · {formatPrice(item.price)}
                      </p>
                    </div>
                  </div>
                  {selectedItemId === item.id && (
                    <span className="text-[10px] font-black
                                     text-orange-400 bg-orange-500/20
                                     px-2 py-0.5 rounded-full">
                      Selected
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2 — Discount */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-black text-slate-400
                                uppercase tracking-wider">
                2. Discount %
              </Label>
              <Input
                type="number"
                min="1"
                max="99"
                value={discount}
                onChange={e => setDiscount(
                  Math.min(99, Math.max(1, Number(e.target.value)))
                )}
                className="h-11 text-xl font-black bg-slate-800
                           border-slate-700 rounded-xl text-amber-400
                           remove-arrow text-center"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-black text-slate-400
                                uppercase tracking-wider">
                Offer Label (optional)
              </Label>
              <Input
                placeholder="e.g. Happy Hour"
                value={offerName}
                onChange={e => setOfferName(e.target.value)}
                className="h-11 bg-slate-800 border-slate-700
                           rounded-xl text-white font-bold"
              />
            </div>
          </div>

          {/* Price preview */}
          {selectedItem && (
            <div className="flex items-center gap-4 p-4 bg-slate-800/50
                            rounded-xl border border-slate-700/50">
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">
                  Original Price
                </p>
                <p className="text-lg font-black text-slate-400
                              line-through">
                  {formatPrice(originalPrice)}
                </p>
              </div>
              <div className="text-slate-600 text-2xl">→</div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">
                  Offer Price
                </p>
                <p className="text-2xl font-black text-green-400">
                  {formatPrice(discountedPrice)}
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-slate-500 font-bold uppercase">
                  Customer Saves
                </p>
                <p className="text-lg font-black text-amber-400">
                  {formatPrice(originalPrice - discountedPrice)}
                </p>
              </div>
            </div>
          )}

          {/* Step 3 — Expiry */}
          <div className="space-y-2">
            <Label className="text-xs font-black text-slate-400
                              uppercase tracking-wider">
              3. Offer Expires At
            </Label>

            {/* Quick presets */}
            <div className="flex flex-wrap gap-2">
              {QUICK_PRESETS.map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold
                             bg-slate-800 border border-slate-700
                             text-slate-300 hover:border-orange-500/50
                             hover:text-orange-400 transition-all"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Manual picker */}
            <input
              type="datetime-local"
              value={expiresAt}
              min={nowLocal}
              onChange={e => setExpiresAt(e.target.value)}
              className="w-full h-11 bg-slate-800 border border-slate-700
                         rounded-xl px-4 text-white font-bold text-sm
                         focus:outline-none focus:border-orange-500/50"
            />

            {expiresAt && (
              <p className="text-xs text-orange-400 font-bold">
                ⏱ Offer will auto-expire on{' '}
                {new Date(expiresAt).toLocaleDateString()} at{' '}
                {new Date(expiresAt).toLocaleTimeString([], {
                  hour: '2-digit', minute: '2-digit'
                })}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3
                        px-6 py-4 border-t border-slate-800">
          <Button variant="ghost" onClick={onClose}
            className="text-slate-400 hover:text-white h-11 px-6 rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !selectedItemId || !expiresAt}
            className="bg-orange-500 hover:bg-orange-400 text-white
                       font-black h-11 px-8 rounded-xl disabled:opacity-30"
          >
            {saving ? 'Saving...' : 'Set Offer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
