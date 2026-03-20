import { Clock } from 'lucide-react'
import { Label } from '@/shared/ui/label'
import { RestaurantSettings } from '../types'

interface Props {
  settings: RestaurantSettings
  onChange: (fields: Partial<RestaurantSettings>) => void
  currentStyles: { bg: string; text: string }
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function OperatingHours({ settings, onChange, currentStyles }: Props) {
  const selectedDays = settings.operating_days

  const toggleDay = (day: string) => {
    const isActive = selectedDays.includes(day)

    if (isActive && selectedDays.length === 1) {
      return
    }

    const nextDays = isActive
      ? selectedDays.filter((item) => item !== day)
      : [...selectedDays, day]

    onChange({ operating_days: nextDays })
  }

  return (
    <section className="order-glass-panel p-10 rounded-[2.5rem] border border-white/5 group relative overflow-hidden shadow-2xl">
      <h2 className="text-xl font-bold flex items-center gap-3 mb-10 text-white tracking-tight">
        <span className={`bg-white/5 p-3 rounded-2xl text-slate-400 ${currentStyles.text} transition-colors`}>
          <Clock size={22} />
        </span>
        Operating Hours
      </h2>

      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">
              Opening Time
            </Label>
            <input
              type="time"
              value={settings.opens_at}
              onChange={(event) => onChange({ opens_at: event.target.value })}
              className="w-full h-14 input-glass rounded-2xl font-black text-center"
            />
          </div>

          <div>
            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">
              Closing Time
            </Label>
            <input
              type="time"
              value={settings.closes_at}
              onChange={(event) => onChange({ closes_at: event.target.value })}
              className="w-full h-14 input-glass rounded-2xl font-black text-center"
            />
          </div>
        </div>

        <div>
          <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">
            Open on These Days
          </Label>

          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => {
              const isActive = selectedDays.includes(day)

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                      : 'bg-white/5 text-slate-400 border-white/10'
                  }`}
                >
                  {day}
                </button>
              )
            })}
          </div>

          <p className="mt-3 text-xs text-slate-400 font-medium">Open {selectedDays.length} days a week</p>
        </div>
      </div>
    </section>
  )
}
