import { Store, Utensils, Plus } from 'lucide-react'
import { RestaurantSettings } from '../types'

interface Props {
  settings: RestaurantSettings
  logoPreview: string | null
  previewItem: { name: string; price: number; image_url: string | null } | null
  currencySymbol: string
  currentStyles: { bg: string; text: string }
}

export function CustomerPreview({ settings, logoPreview, previewItem, currencySymbol, currentStyles }: Props) {
  const to12h = (t: string) => {
    if (!t) return '--'
    const [h, m] = t.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
  }

  return (
    <aside className="relative">
      <div className="sticky top-36 flex flex-col items-center">
        <div className="mb-6 bg-white/[0.03] border border-white/10 px-6 py-2 rounded-full text-xs font-bold tracking-tight text-slate-400 shadow-xl backdrop-blur-xl transition-all hover:text-white group">
          <span className="text-[var(--primary)] group-hover:animate-pulse mr-2">●</span> Live Menu Preview
        </div>

        {/* 3D Phone Chassis */}
        <div className="relative w-[340px] h-[720px] bg-slate-950 rounded-[3.5rem] p-3 shadow-[0_60px_120px_-20px_rgba(0,0,0,0.8)] ring-4 ring-white/5 rotate-3d-mirror transition-all duration-1000 hover:rotate-y-0 hover:rotate-x-0 hover:scale-[1.02]">
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/[0.05] to-transparent pointer-events-none"></div>

          {/* Inner Screen Surface */}
          <div className="w-full h-full bg-[#f8fafc] rounded-[2.8rem] overflow-hidden relative flex flex-col shadow-inner">
            {/* Phone Header - Dynamic Theme */}
            <div className={`h-48 w-full transition-all duration-700 flex flex-col items-center justify-center relative ${currentStyles.bg}`}>
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/30 skew-x-[-20deg] animate-shimmer"></div>

              {/* Notch */}
              <div className="absolute top-0 w-32 h-6 bg-slate-950 rounded-b-2xl z-20 flex items-center justify-center">
                <div className="w-8 h-1 bg-white/10 rounded-full"></div>
              </div>

              <div className="z-10 w-24 h-24 bg-white rounded-[2rem] shadow-2xl flex items-center justify-center overflow-hidden border border-white/50 transform rotate-[-4deg]">
                {logoPreview ? (
                  <img src={logoPreview} className="w-full h-full object-cover" alt="Logo" />
                ) : (
                  <Store className={currentStyles.text} size={32} />
                )}
              </div>
              <h3 className="mt-4 text-white font-bold text-xl px-4 truncate tracking-tight drop-shadow-lg lowercase first-letter:uppercase">
                {settings.name || 'Your Restaurant'}
              </h3>
            </div>

            {/* App Menu Mockup */}
            <div className="flex-1 bg-slate-50 p-6 space-y-5 overflow-hidden">
              <div className="flex gap-2 overflow-hidden">
                <div className={`px-4 py-2 rounded-xl text-[10px] font-bold tracking-tight text-white ${currentStyles.bg}`}>
                  Signature
                </div>
                <div className="px-4 py-2 rounded-xl text-[10px] font-bold tracking-tight text-slate-400 bg-white border border-slate-100">
                  Specials
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl flex gap-4 shadow-sm border border-slate-100">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl overflow-hidden flex-shrink-0">
                  {previewItem?.image_url ? (
                    <img src={previewItem.image_url} alt="Item" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Utensils className="text-slate-300" size={20} />
                    </div>
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <h4 className="font-bold text-sm text-slate-800 leading-none truncate lowercase first-letter:uppercase">
                    {previewItem ? previewItem.name : 'Sample Dish'}
                  </h4>
                  <p className={`font-bold text-base ${currentStyles.text} mt-2`}>
                    {currencySymbol} {previewItem?.price ?? '0'}
                  </p>
                </div>
                <div className={`w-8 h-8 rounded-xl ${currentStyles.bg} flex items-center justify-center text-white`}>
                  <Plus size={16} />
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl flex gap-4 shadow-sm border border-slate-100 opacity-30 translate-x-1">
                <div className="w-16 h-16 bg-slate-100 rounded-xl"></div>
                <div className="flex-1 space-y-2 py-2">
                  <div className="w-full h-2 bg-slate-100 rounded-full"></div>
                  <div className="w-2/3 h-2 bg-slate-50 rounded-full"></div>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[85%]">
              <div className={`h-14 ${currentStyles.bg} rounded-2xl shadow-xl flex items-center justify-center text-white font-bold text-xs tracking-tight lowercase first-letter:uppercase`}>
                View Menu
              </div>
            </div>

            <div className="absolute inset-0 mirror-reflection pointer-events-none opacity-40"></div>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-500">Preview updates as you type</p>

        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 mt-6 text-xs text-slate-400 w-full max-w-[340px] space-y-2">
          <p>
            Opening hours: {to12h(settings.opens_at)} - {to12h(settings.closes_at)}
          </p>
          <p>Open days: {settings.operating_days.length > 0 ? settings.operating_days.join(', ') : 'Not set'}</p>
          <p>
            Min order:{' '}
            {settings.min_order ? `${currencySymbol}${settings.min_order}` : 'No minimum'}
          </p>
        </div>
      </div>
    </aside>
  )
}
