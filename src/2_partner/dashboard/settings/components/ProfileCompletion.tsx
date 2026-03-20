import { RestaurantSettings } from '../types'

interface Props {
  settings: RestaurantSettings
}

export function ProfileCompletion({ settings }: Props) {
  const fields = [
    { label: 'Restaurant Name', filled: !!settings.name },
    { label: 'Phone Number', filled: !!settings.phone },
    { label: 'Address', filled: !!settings.address },
    { label: 'Logo', filled: !!settings.logo_url },
    { label: 'Opening Hours', filled: !!settings.opens_at && !!settings.closes_at },
    { label: 'Description', filled: !!settings.description },
    { label: 'WhatsApp', filled: !!settings.whatsapp },
    { label: 'Instagram', filled: !!settings.instagram },
  ]

  const completedCount = fields.filter((field) => field.filled).length
  const completionPercent = Math.round((completedCount / fields.length) * 100)
  const missingFields = fields.filter((field) => !field.filled).map((field) => field.label)

  return (
    <div className="mb-10 order-glass-panel p-6 rounded-[2rem] border border-white/5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-base font-semibold text-white">Profile {completionPercent}% Complete</p>

        <div className="flex flex-wrap items-center gap-2">
          {missingFields.slice(0, 3).map((label) => (
            <span
              key={label}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300"
            >
              {label}
            </span>
          ))}

          {missingFields.length > 3 && (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
              +{missingFields.length - 3} more
            </span>
          )}
        </div>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full bg-[var(--primary)] transition-all duration-700"
          style={{ width: `${completionPercent}%` }}
        />
      </div>

      {completionPercent === 100 && (
        <p className="mt-3 text-sm font-medium text-emerald-400">✓ Profile fully set up</p>
      )}

      {completionPercent < 50 && (
        <p className="mt-3 text-sm font-medium text-amber-400">
          Complete your profile so customers can find you
        </p>
      )}
    </div>
  )
}
