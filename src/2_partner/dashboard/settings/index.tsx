import { useEffect, useState } from 'react'
import { useSettingsData } from './hooks/useSettingsData'
import { ProfileCompletion } from './components/ProfileCompletion'
import { RestaurantInfo } from './components/RestaurantInfo'
import { OperatingHours } from './components/OperatingHours'
import { LocalizationSection } from './components/LocalizationSection'
import { BusinessSettings } from './components/BusinessSettings'
import { PromotionsSection } from './components/PromotionsSection'
import { SocialLinks } from './components/SocialLinks'
import { SecuritySection } from './components/SecuritySection'
import { DeleteConfirmModal } from './components/DeleteConfirmModal'
import { CustomerPreview } from './components/CustomerPreview'
import { useLanguage } from '@/shared/contexts/LanguageContext'
import { COUNTRY_CURRENCIES } from '@/shared/lib/currencyUtils'
import { Clock, Coins, Globe, Save, Shield, Store, Zap } from 'lucide-react'
import { Button } from '@/shared/ui/button'

const formatTimeAgo = (date: Date): string => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
  if (seconds < 10) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return date.toLocaleDateString()
}

export default function SettingsPage() {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'hours' | 'business' | 'social' | 'security'>('profile')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)

  const tabs = [
    { id: 'profile', label: 'Restaurant', icon: Store },
    { id: 'hours', label: 'Hours', icon: Clock },
    { id: 'business', label: 'Business', icon: Coins },
    { id: 'social', label: 'Social', icon: Globe },
    { id: 'security', label: 'Security', icon: Shield },
  ]

  const {
    settings,
    setSettings,
    previewItem,
    logoFile,
    setLogoFile,
    loading,
    saving,
    hasUnsavedChanges,
    handleSave,
    handleSaveLocation,
    handleDeleteRestaurant,
    newPassword,
    setNewPassword,
  } = useSettingsData()

  const { language, setLanguage, t } = useLanguage()

  const currencyInfo =
    Object.values(COUNTRY_CURRENCIES).find((c) => c.code === settings.currency) ?? COUNTRY_CURRENCIES.PK
  const currencySymbol = currencyInfo.symbol

  useEffect(() => {
    if (!lastSavedAt) return
    const interval = setInterval(() => {
      // Force re-render to keep relative time label fresh
      setLastSavedAt(prev => (prev ? new Date(prev.getTime()) : null))
    }, 30000)
    return () => clearInterval(interval)
  }, [lastSavedAt])

  const themeStyles = {
    crimson: {
      bg: 'bg-[#d41132]',
      text: 'text-[#d41132]',
      glow: 'shadow-[#d41132]/20',
      border: 'border-[#d41132]/30',
    },
    gold: {
      bg: 'bg-[#f4af25]',
      text: 'text-[#f4af25]',
      glow: 'shadow-[#f4af25]/20',
      border: 'border-[#f4af25]/30',
    },
    indigo: {
      bg: 'bg-indigo-500',
      text: 'text-indigo-500',
      glow: 'shadow-indigo-500/20',
      border: 'border-indigo-500/30',
    },
  }
  const currentStyles = themeStyles.crimson

  if (loading) {
    return <div className="p-8 text-slate-300">Loading settings...</div>
  }

  return (
    <div className="text-slate-900 dark:text-slate-100 font-display min-h-screen relative overflow-x-hidden">
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] ambient-glow-red pointer-events-none z-0 hidden dark:block"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[60%] h-[60%] ambient-glow-gold pointer-events-none z-0 hidden dark:block"></div>
      <div className="fixed top-[20%] right-[10%] w-[40%] h-[40%] ambient-glow-red opacity-50 pointer-events-none z-0 hidden dark:block"></div>

      <div className="max-w-[1600px] mx-auto pt-10 px-6 lg:px-12">
        <header className="flex flex-col md:flex-row justify-between items-center mb-12 sticky top-6 z-[60] order-glass-panel px-10 py-6 rounded-full border border-white/5 shadow-2xl backdrop-blur-3xl">
          <div className="flex items-center gap-6">
            <div className={`p-4 rounded-2xl shadow-lg ${currentStyles.bg} ${currentStyles.glow} transition-colors duration-500`}>
              <Zap className="text-white" size={28} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3 lowercase first-letter:uppercase">
                {t('dash.settings')}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${
                  saving
                    ? 'bg-amber-500 animate-pulse'
                    : hasUnsavedChanges
                    ? 'bg-orange-400 animate-pulse'
                    : 'bg-emerald-500'
                }`}></span>
                <div className="flex flex-col">
                  <p className="text-xs font-medium text-slate-400 leading-none">
                    {saving
                      ? 'Saving...'
                      : hasUnsavedChanges
                      ? 'Unsaved changes'
                      : 'All changes saved'}
                  </p>
                  {lastSavedAt && !saving && !hasUnsavedChanges && (
                    <p className="text-[10px] text-slate-600 mt-0.5 leading-none">
                      Last saved {formatTimeAgo(lastSavedAt)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={async () => {
              const ok = await handleSave()
              if (ok) setLastSavedAt(new Date())
            }}
            disabled={saving || !hasUnsavedChanges}
            className={`mt-4 md:mt-0 ${currentStyles.bg} hover:opacity-90 text-white font-black px-12 py-7 rounded-2xl shadow-xl transition-all active:scale-95 text-sm uppercase tracking-widest border-t border-white/20`}
          >
            {saving ? 'Saving...' : <><Save className="mr-2" size={18} /> Save Changes</>}
          </Button>
        </header>

        <ProfileCompletion settings={settings} />

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all border ${isActive
                  ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-lg'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/30 hover:text-white'
                  }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7 space-y-8">
            {activeTab === 'profile' && (
              <>
                <RestaurantInfo
                  settings={settings}
                  onChange={(fields) => setSettings((prev) => ({ ...prev, ...fields }))}
                  onLogoChange={(file) => setLogoFile(file)}
                  logoPreview={settings.logo_url}
                  currentStyles={currentStyles}
                  savingLocation={saving}
                  onSaveLocation={handleSaveLocation}
                />

                <LocalizationSection
                  settings={settings}
                  onChange={(fields) => setSettings((prev) => ({ ...prev, ...fields }))}
                  language={language}
                  onLanguageChange={setLanguage}
                />
              </>
            )}

            {activeTab === 'hours' && (
              <OperatingHours
                settings={settings}
                onChange={(fields) => setSettings((prev) => ({ ...prev, ...fields }))}
                currentStyles={currentStyles}
              />
            )}

            {activeTab === 'business' && (
              <>
                <BusinessSettings
                  settings={settings}
                  onChange={(fields) => setSettings((prev) => ({ ...prev, ...fields }))}
                  currencySymbol={currencySymbol}
                />
                <PromotionsSection
                  restaurantId={settings.id}
                  currencySymbol={currencySymbol}
                />
              </>
            )}

            {activeTab === 'social' && (
              <SocialLinks
                settings={settings}
                onChange={(fields) => setSettings((prev) => ({ ...prev, ...fields }))}
              />
            )}

            {activeTab === 'security' && (
              <>
                <SecuritySection
                  email={settings.email}
                  onEmailChange={(email) => setSettings((prev) => ({ ...prev, email }))}
                  newPassword={newPassword}
                  onPasswordChange={setNewPassword}
                />

                <section className="order-glass-panel p-10 rounded-[2.5rem] border border-red-500/10 shadow-2xl">
                  <h2 className="text-xl font-bold flex items-center gap-3 mb-6 text-white">Danger Zone</h2>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-bold text-sm">Delete Restaurant</p>
                      <p className="text-slate-500 text-xs mt-1">Permanently delete your restaurant and all data</p>
                    </div>
                    <Button
                      onClick={() => setDeleteModalOpen(true)}
                      disabled={saving}
                      className="bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/20 font-bold px-6 py-3 rounded-xl text-sm"
                    >
                      Delete Restaurant
                    </Button>
                  </div>
                </section>
              </>
            )}
          </div>

          <aside className="hidden lg:block lg:col-span-5 lg:sticky lg:top-32 h-fit">
            <CustomerPreview
              settings={settings}
              logoPreview={settings.logo_url}
              previewItem={previewItem}
              currencySymbol={currencySymbol}
              currentStyles={currentStyles}
            />
          </aside>
        </div>

        {hasUnsavedChanges && (
          <div className="sticky bottom-6 flex justify-end mt-8 pb-6">
            <Button
              onClick={async () => {
                const ok = await handleSave()
                if (ok) setLastSavedAt(new Date())
              }}
              disabled={saving}
              className="bg-[var(--primary)] text-white font-black px-10 py-5 rounded-2xl shadow-2xl uppercase tracking-widest text-sm"
            >
              <Save size={18} className="mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>

      <DeleteConfirmModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteRestaurant}
        restaurantName={settings.name}
        saving={saving}
      />
    </div>
  )
}
