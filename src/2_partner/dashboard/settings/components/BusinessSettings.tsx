import { Coins, Truck } from 'lucide-react'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Switch } from '@/shared/ui/switch'
import { RestaurantSettings } from '../types'

interface Props {
  settings: RestaurantSettings
  onChange: (fields: Partial<RestaurantSettings>) => void
  currencySymbol: string
}

export function BusinessSettings({ settings, onChange, currencySymbol }: Props) {
  return (
    <section className="order-glass-panel p-10 rounded-[2.5rem] border border-white/5 group relative overflow-hidden shadow-2xl">
      <h2 className="text-xl font-bold flex items-center gap-3 mb-10 text-white tracking-tight">
        <span className="bg-amber-500/10 p-3 rounded-2xl text-amber-400 group-hover:text-amber-300 transition-colors">
          <Coins size={22} />
        </span>
        Business Rules
      </h2>

      <div className="space-y-6">
        <div>
          <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">
            Minimum Order ({currencySymbol})
          </Label>
          <Input
            type="number"
            min="0"
            value={settings.min_order ?? ''}
            onChange={(event) =>
              onChange({ min_order: event.target.value ? Number(event.target.value) : null })
            }
            placeholder="e.g. 500 - leave empty for no minimum"
            className="h-14 input-glass rounded-2xl font-bold px-6"
          />
        </div>

        <div>
          <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">
            Tax / Service Charge (%)
          </Label>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={settings.tax_percent}
            onChange={(event) => onChange({ tax_percent: Number(event.target.value) })}
            placeholder="e.g. 5 for 5%"
            className="h-14 input-glass rounded-2xl font-bold px-6"
          />
          <p className="mt-2 text-xs text-slate-400">Added to order total at checkout</p>
        </div>

        <div>
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2">
              <Truck size={16} className="text-slate-300" />
              <span className="text-sm font-semibold text-white">Delivery Available</span>
            </div>
            <Switch
              checked={settings.is_delivery}
              onCheckedChange={(val) => onChange({ is_delivery: val })}
            />
          </div>

          {settings.is_delivery && (
            <div className="mt-4 space-y-6">
              <div>
                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">
                  Delivery Fee ({currencySymbol})
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={settings.delivery_fee ?? ''}
                  onChange={(event) =>
                    onChange({ delivery_fee: event.target.value ? Number(event.target.value) : null })
                  }
                  placeholder="e.g. 0 for free delivery"
                  className="h-14 input-glass rounded-2xl font-bold px-6"
                />
                <p className="mt-2 text-xs text-slate-400">Shown to customers during checkout</p>
              </div>

              <div>
                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">
                  Estimated Delivery Time (minutes)
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={settings.delivery_time_min ?? ''}
                  onChange={(event) =>
                    onChange({
                      delivery_time_min: event.target.value ? Number(event.target.value) : null,
                    })
                  }
                  placeholder="e.g. 30"
                  className="h-14 input-glass rounded-2xl font-bold px-6"
                />
                <p className="mt-2 text-xs text-slate-400">Used to show delivery ETA on the customer app</p>
              </div>

              <div>
                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">
                  Delivery Areas (comma separated)
                </Label>
                <Input
                  value={settings.delivery_areas.join(', ')}
                  onChange={(event) =>
                    onChange({
                      delivery_areas: event.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="e.g. DHA, Gulberg, Model Town"
                  className="h-14 input-glass rounded-2xl font-bold px-6"
                />

                {settings.delivery_areas.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {settings.delivery_areas.map((area) => (
                      <span
                        key={area}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300"
                      >
                        {area}
                        <button
                          type="button"
                          onClick={() =>
                            onChange({
                              delivery_areas: settings.delivery_areas.filter((item) => item !== area),
                            })
                          }
                          className="text-slate-400 hover:text-white"
                          aria-label={`Remove ${area}`}
                        >
                          x
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
