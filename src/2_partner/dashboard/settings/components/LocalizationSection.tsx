import { ChevronDown, Globe } from 'lucide-react'
import { useLanguage, Language, languageLabels } from '@/shared/contexts/LanguageContext'
import { COUNTRY_CURRENCIES } from '@/shared/lib/currencyUtils'
import { Label } from '@/shared/ui/label'
import { RestaurantSettings } from '../types'

interface Props {
  settings: RestaurantSettings
  onChange: (fields: Partial<RestaurantSettings>) => void
  language: Language
  onLanguageChange: (lang: Language) => void
}

const CURRENCY_OPTIONS = Object.entries(COUNTRY_CURRENCIES).map(([country, info]) => ({
  code: info.code,
  symbol: info.symbol,
  label: `${info.code} (${info.symbol}) - ${country}`,
}))

const uniqueCurrencyOptions = CURRENCY_OPTIONS.filter(
  (opt, idx, arr) => arr.findIndex((item) => item.code === opt.code) === idx,
)

export function LocalizationSection({ settings, onChange, language, onLanguageChange }: Props) {
  const { language: contextLanguage } = useLanguage()
  const selectedLanguage = language || contextLanguage

  return (
    <section className="order-glass-panel p-10 rounded-[2.5rem] border border-white/5 relative overflow-hidden group transition-all hover:border-blue-500/20 shadow-2xl">
      <h2 className="text-xl font-bold flex items-center gap-3 mb-10 text-white tracking-tight">
        <span className="bg-blue-500/10 p-3 rounded-2xl text-blue-400 group-hover:text-blue-300 transition-colors">
          <Globe size={22} />
        </span>
        Language &amp; Currency
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">
            Dashboard Language
          </Label>
          <div className="relative group/lang">
            <select
              value={selectedLanguage}
              onChange={(event) => onLanguageChange(event.target.value as Language)}
              className="w-full h-16 input-glass rounded-2xl px-8 font-bold text-lg appearance-none cursor-pointer"
            >
              {(Object.keys(languageLabels) as Language[]).map((langKey) => (
                <option key={langKey} value={langKey} className="bg-slate-900 text-white">
                  {languageLabels[langKey].flag} {languageLabels[langKey].name}
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
              size={20}
            />
          </div>
        </div>

        <div>
          <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">
            Currency
          </Label>
          <div className="relative">
            <select
              value={settings.currency}
              onChange={(event) => {
                const selected = uniqueCurrencyOptions.find((option) => option.code === event.target.value)
                if (!selected) return
                onChange({ currency: selected.code })
              }}
              className="w-full h-16 input-glass rounded-2xl px-8 font-bold text-lg appearance-none cursor-pointer"
            >
              {uniqueCurrencyOptions.map((option) => (
                <option key={option.code} value={option.code} className="bg-slate-900 text-white">
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
              size={20}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
