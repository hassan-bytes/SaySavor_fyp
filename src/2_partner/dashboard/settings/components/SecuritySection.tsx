import { useState } from 'react'
import { Shield, Eye, EyeOff } from 'lucide-react'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

interface Props {
  email: string
  onEmailChange: (email: string) => void
  newPassword: string
  onPasswordChange: (password: string) => void
}

export function SecuritySection({ email, onEmailChange, newPassword, onPasswordChange }: Props) {
  const [showPassword, setShowPassword] = useState(false)

  const passwordLength = newPassword.length
  const showStrength = passwordLength > 0
  const strengthClass =
    passwordLength <= 7
      ? 'bg-red-500'
      : passwordLength <= 11
      ? 'bg-amber-500'
      : 'bg-emerald-500'
  const strengthLabel =
    passwordLength <= 7
      ? 'Too short'
      : passwordLength <= 11
      ? 'Okay'
      : 'Strong'
  const strengthWidth =
    passwordLength <= 7
      ? 'w-1/3'
      : passwordLength <= 11
      ? 'w-2/3'
      : 'w-full'

  return (
    <section className="order-glass-panel p-10 rounded-[2.5rem] border border-white/5 group relative overflow-hidden shadow-2xl">
      <h2 className="text-xl font-bold flex items-center gap-3 mb-10 text-white tracking-tight">
        <span className="bg-cyan-500/10 p-3 rounded-2xl text-cyan-400 group-hover:text-cyan-300 transition-colors">
          <Shield size={22} />
        </span>
        Account & Security
      </h2>

      <div className="space-y-6">
        <div>
          <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">
            Email Address
          </Label>
          <Input
            type="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            className="h-14 input-glass rounded-2xl font-bold px-6"
          />
          <p className="mt-2 text-xs text-slate-400">
            You will receive a confirmation link at both old and new addresses
          </p>
        </div>

        <div>
          <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">
            New Password
          </Label>

          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder="Leave empty to keep current password"
              className="h-14 input-glass rounded-2xl font-bold px-6 pr-14"
            />

            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {showStrength && (
            <div className="mt-3">
              <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <div className={`h-full ${strengthClass} ${strengthWidth} transition-all duration-300`} />
              </div>
              <p className={`mt-2 text-xs font-semibold ${strengthClass.replace('bg-', 'text-')}`}>
                {strengthLabel}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
