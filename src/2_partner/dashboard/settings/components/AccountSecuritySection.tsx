import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { SectionCard } from './SectionCard';

interface AccountSecuritySectionProps {
  email: string;
  newPassword: string;
  confirmPassword: string;
  onEmailChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
}

export const AccountSecuritySection = ({
  email,
  newPassword,
  confirmPassword,
  onEmailChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
}: AccountSecuritySectionProps) => {
  return (
    <SectionCard
      title="Account security"
      description="Update your login email and password."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label className="mb-2 block text-xs uppercase tracking-wide text-slate-400">Login email</Label>
          <Input
            className="input-glass border-white/15"
            type="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="owner@restaurant.com"
          />
        </div>

        <div>
          <Label className="mb-2 block text-xs uppercase tracking-wide text-slate-400">New password</Label>
          <Input
            className="input-glass border-white/15"
            type="password"
            value={newPassword}
            onChange={(event) => onNewPasswordChange(event.target.value)}
            placeholder="At least 8 characters"
          />
        </div>

        <div>
          <Label className="mb-2 block text-xs uppercase tracking-wide text-slate-400">Confirm new password</Label>
          <Input
            className="input-glass border-white/15"
            type="password"
            value={confirmPassword}
            onChange={(event) => onConfirmPasswordChange(event.target.value)}
            placeholder="Type password again"
          />
        </div>
      </div>
    </SectionCard>
  );
};
