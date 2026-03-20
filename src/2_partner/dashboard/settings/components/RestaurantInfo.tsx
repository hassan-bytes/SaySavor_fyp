import { Store, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { RestaurantSettings } from '../types'

interface Props {
  settings: RestaurantSettings
  onChange: (fields: Partial<RestaurantSettings>) => void
  onLogoChange: (file: File) => void
  logoPreview: string | null
  currentStyles: { bg: string; text: string; glow: string; border: string }
}

export function RestaurantInfo({
  settings,
  onChange,
  onLogoChange,
  logoPreview,
  currentStyles,
}: Props) {
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 1024 * 1024) {
      toast.error('Image must be under 1MB')
      return
    }

    onLogoChange(file)
  }

  return (
    <section className="order-glass-panel p-10 rounded-[2.5rem] border border-white/5 group relative overflow-hidden shadow-2xl">
      <h2 className="text-xl font-bold flex items-center gap-3 mb-10 text-white tracking-tight">
        <span className={`bg-white/5 p-3 rounded-2xl text-slate-400 ${currentStyles.text} transition-colors`}>
          <Store size={22} />
        </span>
        Restaurant Info
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-6">
          <div className="relative w-40 h-40">
            <div className="w-full h-full relative">
              <div className="absolute inset-0 bg-white/[0.03] rounded-3xl border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-cover p-2 rounded-3xl" />
                ) : (
                  <Upload className="text-white/20" size={32} />
                )}
                <input
                  type="file"
                  className="absolute inset-0 opacity-0 cursor-pointer z-50"
                  onChange={handleLogoUpload}
                  accept="image/png,image/jpeg"
                />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-400">Max 1MB · JPG or PNG</p>
          </div>

          <div>
            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">
              Restaurant Name
            </Label>
            <Input
              value={settings.name}
              onChange={(event) => onChange({ name: event.target.value })}
              className="h-14 input-glass rounded-2xl font-black text-lg px-6"
              placeholder="Enter restaurant name"
            />
          </div>

          <div>
            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">
              Short Description
            </Label>
            <textarea
              value={settings.description}
              onChange={(event) => onChange({ description: event.target.value })}
              className="w-full min-h-[120px] input-glass rounded-2xl font-medium px-6 py-4 resize-none"
              maxLength={160}
              placeholder="e.g. Best BBQ in the city since 2010"
            />
            <p className="mt-2 text-xs text-slate-400 text-right">{settings.description.length} / 160</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">
              Phone Number
            </Label>
            <Input
              value={settings.phone}
              onChange={(event) => onChange({ phone: event.target.value })}
              className="h-14 input-glass rounded-2xl font-bold px-6"
              placeholder="+92 XXX XXXXXXX"
            />
          </div>

          <div>
            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">
              WhatsApp Number
            </Label>
            <Input
              value={settings.whatsapp}
              onChange={(event) => onChange({ whatsapp: event.target.value })}
              className="h-14 input-glass rounded-2xl font-bold px-6"
              placeholder="+92 XXX XXXXXXX"
            />
            <p className="mt-2 text-xs text-slate-400">Customers will message you here for orders</p>
          </div>

          <div>
            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">
              Restaurant Address
            </Label>
            <Input
              value={settings.address}
              onChange={(event) => onChange({ address: event.target.value })}
              className="h-14 input-glass rounded-2xl font-medium px-6"
              placeholder="Street and city"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
