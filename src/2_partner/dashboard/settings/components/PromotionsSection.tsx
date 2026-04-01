import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/shared/lib/supabaseClient'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Switch } from '@/shared/ui/switch'
import { Button } from '@/shared/ui/button'

interface PromotionRow {
  id: string
  code: string
  discount_type: 'percent' | 'flat'
  discount_value: number
  max_discount: number | null
  min_order: number | null
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
  usage_limit: number | null
  usage_count: number | null
}

interface Props {
  restaurantId: string
  currencySymbol: string
}

const formatDate = (value: string | null) => {
  if (!value) return 'No end date'
  return new Date(value).toLocaleDateString('en-GB')
}

export function PromotionsSection({ restaurantId, currencySymbol }: Props) {
  const [promotions, setPromotions] = useState<PromotionRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    code: '',
    discountType: 'percent',
    discountValue: '',
    minOrder: '',
    maxDiscount: '',
    startsAt: '',
    endsAt: '',
  })

  const fetchPromotions = async () => {
    if (!restaurantId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPromotions((data || []) as PromotionRow[])
    } catch (err) {
      console.error('Promotions fetch failed:', err)
      toast.error('Could not load promotions.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchPromotions()
  }, [restaurantId])

  const resetForm = () => {
    setForm({
      code: '',
      discountType: 'percent',
      discountValue: '',
      minOrder: '',
      maxDiscount: '',
      startsAt: '',
      endsAt: '',
    })
  }

  const handleCreate = async () => {
    if (!restaurantId) {
      toast.error('Restaurant ID missing.')
      return
    }

    const code = form.code.trim().toUpperCase()
    const discountValue = Number(form.discountValue)
    const minOrderValue = form.minOrder.trim() ? Number(form.minOrder) : null
    const maxDiscountValue = form.maxDiscount.trim() ? Number(form.maxDiscount) : null

    if (!code) {
      toast.error('Promo code is required.')
      return
    }

    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      toast.error('Enter a valid discount value.')
      return
    }

    setSaving(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      const payload = {
        restaurant_id: restaurantId,
        code,
        discount_type: form.discountType,
        discount_value: discountValue,
        min_order: Number.isFinite(minOrderValue) ? minOrderValue : null,
        max_discount: Number.isFinite(maxDiscountValue) ? maxDiscountValue : null,
        starts_at: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        ends_at: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        created_by: userData.user?.id ?? null,
        is_active: true,
      }

      const promotionsTable = supabase.from('promotions') as any
      const { error } = await promotionsTable.insert(payload)

      if (error) throw error
      toast.success('Promotion created!')
      resetForm()
      await fetchPromotions()
    } catch (err: any) {
      console.error('Promotion create failed:', err)
      toast.error(err.message || 'Could not create promotion.')
    } finally {
      setSaving(false)
    }
  }

  const togglePromotion = async (id: string, nextValue: boolean) => {
    setSaving(true)
    try {
      const promotionsTable = supabase.from('promotions') as any
      const { error } = await promotionsTable
        .update({ is_active: nextValue })
        .eq('id', id)

      if (error) throw error
      setPromotions((prev) => prev.map((promo) =>
        promo.id === id ? { ...promo, is_active: nextValue } : promo
      ))
    } catch (err) {
      console.error('Promotion update failed:', err)
      toast.error('Could not update promotion.')
    } finally {
      setSaving(false)
    }
  }

  const deletePromotion = async (id: string) => {
    const confirmDelete = window.confirm('Delete this promotion?')
    if (!confirmDelete) return

    setSaving(true)
    try {
      const promotionsTable = supabase.from('promotions') as any
      const { error } = await promotionsTable
        .delete()
        .eq('id', id)

      if (error) throw error
      setPromotions((prev) => prev.filter((promo) => promo.id !== id))
      toast.success('Promotion deleted.')
    } catch (err) {
      console.error('Promotion delete failed:', err)
      toast.error('Could not delete promotion.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="order-glass-panel p-10 rounded-[2.5rem] border border-white/5 group relative overflow-hidden shadow-2xl">
      <h2 className="text-xl font-bold flex items-center gap-3 mb-10 text-white tracking-tight">
        <span className="bg-orange-500/10 p-3 rounded-2xl text-orange-400 group-hover:text-orange-300 transition-colors">
          %
        </span>
        Promotions
      </h2>

      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">
              Promo Code
            </Label>
            <Input
              value={form.code}
              onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
              placeholder="e.g. WELCOME10"
              className="h-12 input-glass rounded-2xl font-bold px-5"
            />
          </div>

          <div>
            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">
              Discount Type
            </Label>
            <select
              value={form.discountType}
              onChange={(event) => setForm((prev) => ({ ...prev, discountType: event.target.value }))}
              className="w-full h-12 input-glass rounded-2xl font-bold px-5"
            >
              <option value="percent" className="bg-slate-900 text-white">Percent (%)</option>
              <option value="flat" className="bg-slate-900 text-white">Flat ({currencySymbol})</option>
            </select>
          </div>

          <div>
            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">
              Discount Value
            </Label>
            <Input
              type="number"
              min="1"
              value={form.discountValue}
              onChange={(event) => setForm((prev) => ({ ...prev, discountValue: event.target.value }))}
              placeholder={form.discountType === 'percent' ? '10' : '200'}
              className="h-12 input-glass rounded-2xl font-bold px-5"
            />
          </div>

          <div>
            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">
              Minimum Order ({currencySymbol})
            </Label>
            <Input
              type="number"
              min="0"
              value={form.minOrder}
              onChange={(event) => setForm((prev) => ({ ...prev, minOrder: event.target.value }))}
              placeholder="Optional"
              className="h-12 input-glass rounded-2xl font-bold px-5"
            />
          </div>

          <div>
            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">
              Max Discount ({currencySymbol})
            </Label>
            <Input
              type="number"
              min="0"
              value={form.maxDiscount}
              onChange={(event) => setForm((prev) => ({ ...prev, maxDiscount: event.target.value }))}
              placeholder="Optional"
              className="h-12 input-glass rounded-2xl font-bold px-5"
            />
          </div>

          <div>
            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">
              Start Date
            </Label>
            <Input
              type="date"
              value={form.startsAt}
              onChange={(event) => setForm((prev) => ({ ...prev, startsAt: event.target.value }))}
              className="h-12 input-glass rounded-2xl font-bold px-5"
            />
          </div>

          <div>
            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">
              End Date
            </Label>
            <Input
              type="date"
              value={form.endsAt}
              onChange={(event) => setForm((prev) => ({ ...prev, endsAt: event.target.value }))}
              className="h-12 input-glass rounded-2xl font-bold px-5"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleCreate}
            disabled={saving}
            className="bg-orange-500/90 hover:bg-orange-500 text-white font-black px-8 py-3 rounded-xl"
          >
            {saving ? 'Saving...' : 'Create Promotion'}
          </Button>
          <Button
            onClick={resetForm}
            variant="outline"
            className="border-white/10 text-white/60 hover:text-white rounded-xl"
          >
            Reset
          </Button>
        </div>

        <div className="space-y-4">
          {loading ? (
            <p className="text-sm text-slate-400">Loading promotions...</p>
          ) : promotions.length === 0 ? (
            <p className="text-sm text-slate-400">No promotions yet. Create your first deal above.</p>
          ) : (
            promotions.map((promo) => (
              <div
                key={promo.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">{promo.code}</p>
                  <p className="text-white font-bold text-lg">
                    {promo.discount_type === 'percent'
                      ? `${promo.discount_value}% off`
                      : `${currencySymbol} ${promo.discount_value} off`}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {promo.min_order ? `Min ${currencySymbol} ${promo.min_order}` : 'No minimum'}
                    {' · '}
                    {formatDate(promo.ends_at)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>Active</span>
                    <Switch
                      checked={promo.is_active}
                      onCheckedChange={(val) => togglePromotion(promo.id, val)}
                    />
                  </div>
                  <Button
                    onClick={() => deletePromotion(promo.id)}
                    disabled={saving}
                    variant="outline"
                    className="border-red-500/30 text-red-400 hover:text-red-300 rounded-xl"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
