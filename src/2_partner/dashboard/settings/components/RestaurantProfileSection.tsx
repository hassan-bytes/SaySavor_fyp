import type { ChangeEvent } from 'react';
import { Upload } from 'lucide-react';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { COUNTRY_CURRENCIES } from '@/shared/lib/currencyUtils';
import { SectionCard } from './SectionCard';

interface RestaurantProfileSectionProps {
  restaurantName: string;
  phone: string;
  address: string;
  opensAt: string;
  closesAt: string;
  currencyCode: string;
  logoUrl: string | null;
  onRestaurantNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onOpensAtChange: (value: string) => void;
  onClosesAtChange: (value: string) => void;
  onCurrencyCodeChange: (value: string) => void;
  onLogoFileChange: (file: File | null) => void;
}

const currencyOptions = Object.values(COUNTRY_CURRENCIES)
  .map((item) => ({
    value: item.code,
    label: `${item.code} (${item.symbol})`,
  }))
  .filter((item, index, source) => source.findIndex((value) => value.value === item.value) === index)
  .sort((a, b) => a.value.localeCompare(b.value));

export const RestaurantProfileSection = ({
  restaurantName,
  phone,
  address,
  opensAt,
  closesAt,
  currencyCode,
  logoUrl,
  onRestaurantNameChange,
  onPhoneChange,
  onAddressChange,
  onOpensAtChange,
  onClosesAtChange,
  onCurrencyCodeChange,
  onLogoFileChange,
}: RestaurantProfileSectionProps) => {
  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    onLogoFileChange(nextFile);
  };

  return (
    <SectionCard
      title="Restaurant profile"
      description="Update how your restaurant appears to customers and staff."
    >
      <div className="grid gap-6 lg:grid-cols-[200px,1fr]">
        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-wide text-slate-400">Logo</Label>
          <div className="relative h-40 w-40 overflow-hidden rounded-2xl border border-white/20 bg-black/20">
            {logoUrl ? (
              <img src={logoUrl} alt="Restaurant logo" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-500">
                <Upload className="h-8 w-8" />
              </div>
            )}
          </div>
          <Input
            className="input-glass border-white/15"
            type="file"
            accept="image/*"
            onChange={handleFileInput}
          />
          <p className="text-xs text-slate-400">Use a clear square image. Maximum size is 1 MB.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label className="mb-2 block text-xs uppercase tracking-wide text-slate-400">Restaurant name</Label>
            <Input
              className="input-glass border-white/15"
              value={restaurantName}
              onChange={(event) => onRestaurantNameChange(event.target.value)}
              placeholder="Example: Garden Spice"
            />
          </div>

          <div>
            <Label className="mb-2 block text-xs uppercase tracking-wide text-slate-400">Phone</Label>
            <Input
              className="input-glass border-white/15"
              value={phone}
              onChange={(event) => onPhoneChange(event.target.value)}
              placeholder="+92 300 1234567"
            />
          </div>

          <div>
            <Label className="mb-2 block text-xs uppercase tracking-wide text-slate-400">Currency</Label>
            <Select value={currencyCode} onValueChange={onCurrencyCodeChange}>
              <SelectTrigger className="input-glass border-white/15">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {currencyOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2">
            <Label className="mb-2 block text-xs uppercase tracking-wide text-slate-400">Address</Label>
            <Input
              className="input-glass border-white/15"
              value={address}
              onChange={(event) => onAddressChange(event.target.value)}
              placeholder="Street, city"
            />
          </div>

          <div>
            <Label className="mb-2 block text-xs uppercase tracking-wide text-slate-400">Open time</Label>
            <Input
              className="input-glass border-white/15"
              type="time"
              value={opensAt}
              onChange={(event) => onOpensAtChange(event.target.value)}
            />
          </div>

          <div>
            <Label className="mb-2 block text-xs uppercase tracking-wide text-slate-400">Close time</Label>
            <Input
              className="input-glass border-white/15"
              type="time"
              value={closesAt}
              onChange={(event) => onClosesAtChange(event.target.value)}
            />
          </div>
        </div>
      </div>
    </SectionCard>
  );
};
