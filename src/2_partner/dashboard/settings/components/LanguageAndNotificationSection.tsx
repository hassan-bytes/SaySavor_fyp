import { Label } from '@/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Switch } from '@/shared/ui/switch';
import { languageLabels } from '@/shared/contexts/LanguageContext';
import type { Language } from '@/shared/contexts/LanguageContext';
import { SectionCard } from './SectionCard';

interface NotificationSettings {
  newOrderSound: boolean;
  lowStockAlert: boolean;
  dailySummaryEmail: boolean;
}

interface LanguageAndNotificationSectionProps {
  language: Language;
  notifications: NotificationSettings;
  onLanguageChange: (language: Language) => void;
  onNotificationsChange: (next: NotificationSettings) => void;
}

export const LanguageAndNotificationSection = ({
  language,
  notifications,
  onLanguageChange,
  onNotificationsChange,
}: LanguageAndNotificationSectionProps) => {
  return (
    <SectionCard
      title="Language and alerts"
      description="Choose dashboard language and how you want to receive alerts."
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <Label className="mb-2 block text-xs uppercase tracking-wide text-slate-400">Dashboard language</Label>
          <Select value={language} onValueChange={(value) => onLanguageChange(value as Language)}>
            <SelectTrigger className="input-glass border-white/15">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(languageLabels).map(([code, info]) => (
                <SelectItem key={code} value={code}>
                  {info.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
            <div>
              <p className="text-sm font-medium text-white">New order sound</p>
              <p className="text-xs text-slate-400">Play a sound for each incoming order.</p>
            </div>
            <Switch
              checked={notifications.newOrderSound}
              onCheckedChange={(checked) => onNotificationsChange({ ...notifications, newOrderSound: checked })}
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
            <div>
              <p className="text-sm font-medium text-white">Low stock alert</p>
              <p className="text-xs text-slate-400">Show alerts when item stock gets low.</p>
            </div>
            <Switch
              checked={notifications.lowStockAlert}
              onCheckedChange={(checked) => onNotificationsChange({ ...notifications, lowStockAlert: checked })}
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
            <div>
              <p className="text-sm font-medium text-white">Daily summary email</p>
              <p className="text-xs text-slate-400">Receive one summary email per day.</p>
            </div>
            <Switch
              checked={notifications.dailySummaryEmail}
              onCheckedChange={(checked) => onNotificationsChange({ ...notifications, dailySummaryEmail: checked })}
            />
          </div>
        </div>
      </div>
    </SectionCard>
  );
};
