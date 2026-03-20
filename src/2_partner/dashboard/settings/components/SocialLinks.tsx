import { Instagram } from 'lucide-react'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { RestaurantSettings } from '../types'

interface Props {
  settings: RestaurantSettings
  onChange: (fields: Partial<RestaurantSettings>) => void
}

export function SocialLinks({ settings, onChange }: Props) {
  const sanitizedHandle = settings.instagram.replace('@', '')

  return (
    <section className="order-glass-panel p-10 rounded-[2.5rem] border border-white/5 group relative overflow-hidden shadow-2xl">
      <h2 className="text-xl font-bold flex items-center gap-3 mb-10 text-white tracking-tight">
        <span className="bg-pink-500/10 p-3 rounded-2xl text-pink-400 group-hover:text-pink-300 transition-colors">
          <Instagram size={22} />
        </span>
        Social Media
      </h2>

      <div>
        <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">
          Instagram Username
        </Label>

        <div className="relative">
          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400 pointer-events-none">
            instagram.com/
          </span>
          <Input
            value={settings.instagram}
            onChange={(event) => onChange({ instagram: event.target.value })}
            placeholder="@yourrestaurant"
            className="h-14 input-glass rounded-2xl font-bold pl-[150px] pr-6"
          />
        </div>

        {settings.instagram.trim() !== '' && (
          <a
            href={`https://instagram.com/${sanitizedHandle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--primary)] hover:underline mt-2 block"
          >
            instagram.com/{sanitizedHandle} ↗
          </a>
        )}
      </div>
    </section>
  )
}
