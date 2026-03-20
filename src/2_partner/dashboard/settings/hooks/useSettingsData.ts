import { useEffect, useRef, useState } from 'react'
import type React from 'react'
import { toast } from 'sonner'
import { supabase } from '@/shared/lib/supabaseClient'
import { RestaurantSettings, DEFAULT_SETTINGS } from '../types'
import { COUNTRY_CURRENCIES, getCurrencyFromPhone } from '@/shared/lib/currencyUtils'
import { v4 as uuidv4 } from 'uuid'
import { Language, useLanguage } from '@/shared/contexts/LanguageContext'
import { useRestaurant } from '@/shared/contexts/RestaurantContext'

interface PreviewItem {
  name: string
  price: number
  image_url: string | null
}

interface SupabaseErrorLike {
  message: string
}

interface LooseUpdateTable {
  update: (values: Record<string, unknown>) => {
    eq: (column: string, value: string) => Promise<{ error: SupabaseErrorLike | null }>
  }
}

interface RestaurantRow {
  id: string
  owner_id: string
  name: string | null
  description: string | null
  logo_url: string | null
  phone: string | null
  whatsapp: string | null
  address: string | null
  opens_at: string | null
  closes_at: string | null
  operating_days: unknown
  currency: string | null
  min_order: number | null
  tax_percent: number | null
  is_delivery: boolean | null
  delivery_areas: unknown
  instagram: string | null
  dashboard_lang?: string | null
}

interface LooseRestaurantTable {
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      single: () => Promise<{ data: RestaurantRow | null; error: SupabaseErrorLike | null }>
    }
  }
}

interface LoosePreviewTable {
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      limit: (count: number) => {
        maybeSingle: () => Promise<{ data: PreviewItem | null; error: SupabaseErrorLike | null }>
      }
    }
  }
}

const convertTo24Hour = (timeStr: string): string => {
  if (!timeStr || !timeStr.match(/am|pm/i)) return timeStr
  const [time, modifier] = timeStr.trim().split(/\s+/)
  const [hours, minutes] = time.split(':')
  let h = Number.parseInt(hours, 10)
  if (modifier?.toUpperCase() === 'PM' && h < 12) h += 12
  if (modifier?.toUpperCase() === 'AM' && h === 12) h = 0
  return `${h.toString().padStart(2, '0')}:${(minutes || '00').padStart(2, '0')}`
}

const convertTo12Hour = (time24h: string): string => {
  if (!time24h || !time24h.includes(':')) return time24h
  const [hours, minutes] = time24h.split(':')
  let h = Number.parseInt(hours, 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  h = h || 12
  return `${h.toString().padStart(2, '0')}:${minutes} ${ampm}`
}

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

const normalizeLanguage = (value: unknown): Language | null => {
  if (typeof value !== 'string') return null
  const lower = value.trim().toLowerCase()
  if (lower === 'en' || lower === 'ur' || lower === 'ar' || lower === 'hi' || lower === 'es' || lower === 'fr' || lower === 'zh' || lower === 'tr') {
    return lower
  }
  if (lower === 'urdu') return 'ur'
  if (lower === 'arabic') return 'ar'
  return null
}

export function useSettingsData(): {
  settings: RestaurantSettings,
  setSettings: React.Dispatch<React.SetStateAction<RestaurantSettings>>,
  previewItem: { name: string; price: number; image_url: string | null } | null,
  newPassword: string,
  setNewPassword: React.Dispatch<React.SetStateAction<string>>,
  logoFile: File | null,
  setLogoFile: (file: File | null) => void,
  loading: boolean,
  saving: boolean,
  hasUnsavedChanges: boolean,
  setHasUnsavedChanges: (val: boolean) => void,
  handleSave: () => Promise<boolean>,
  handleDeleteRestaurant: () => Promise<void>,
} {
  const { language, setLanguage, setCurrencyCode } = useLanguage()
  const { refreshRestaurant } = useRestaurant()
  const [settings, setSettings] = useState<RestaurantSettings>(DEFAULT_SETTINGS)
  const [logoFile, setLogoFileState] = useState<File | null>(null)
  const [previewItem, setPreviewItem] = useState<PreviewItem | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const isInitializedRef = useRef(false)
  const initialSnapshotRef = useRef<string>('')
  const isMountedRef = useRef(true)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const setLogoFile = (file: File | null) => {
    setLogoFileState(file)
  }

  useEffect(() => {
    const fetchSettingsData = async () => {
      setLoading(true)
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) throw userError
        if (!user) {
          toast.error('Please sign in to load settings.')
          return
        }

        const restaurantsSelectTable = supabase.from('restaurants') as unknown as LooseRestaurantTable
        const { data: restaurantData, error: restaurantError } = await restaurantsSelectTable
          .select('*')
          .eq('owner_id', user.id)
          .single()

        if (restaurantError) {
          throw restaurantError
        }

        if (!restaurantData) {
          throw new Error('Restaurant settings not found.')
        }

        let currencyValue = COUNTRY_CURRENCIES.PK.code
        if (restaurantData.currency) {
          const found = Object.values(COUNTRY_CURRENCIES).find(
            (c) => c.code === restaurantData.currency,
          )
          if (found) {
            currencyValue = found.code
            setCurrencyCode(found.code)
          } else {
            currencyValue = COUNTRY_CURRENCIES.PK.code
            setCurrencyCode(COUNTRY_CURRENCIES.PK.code)
          }
        } else if (restaurantData.phone) {
          const derived = getCurrencyFromPhone(restaurantData.phone)
          if (derived) {
            currencyValue = derived.code
            setCurrencyCode(derived.code)
          } else {
            currencyValue = COUNTRY_CURRENCIES.PK.code
            setCurrencyCode(COUNTRY_CURRENCIES.PK.code)
          }
        } else {
          currencyValue = COUNTRY_CURRENCIES.PK.code
          setCurrencyCode(COUNTRY_CURRENCIES.PK.code)
        }
        const dbLanguage = normalizeLanguage(restaurantData.dashboard_lang)
        const nextSettings: RestaurantSettings = {
          id: restaurantData.id || '',
          owner_id: user.id,
          name: restaurantData.name || '',
          description: restaurantData.description || '',
          logo_url: restaurantData.logo_url || null,
          phone: restaurantData.phone || '',
          whatsapp: restaurantData.whatsapp || '',
          address: restaurantData.address || '',
          opens_at: convertTo24Hour(restaurantData.opens_at || ''),
          closes_at: convertTo24Hour(restaurantData.closes_at || ''),
          operating_days: toStringArray(restaurantData.operating_days).length > 0
            ? toStringArray(restaurantData.operating_days)
            : [...DEFAULT_SETTINGS.operating_days],
          currency: currencyValue,
          min_order: typeof restaurantData.min_order === 'number' ? restaurantData.min_order : null,
          tax_percent: typeof restaurantData.tax_percent === 'number' ? restaurantData.tax_percent : 0,
          is_delivery: typeof restaurantData.is_delivery === 'boolean' ? restaurantData.is_delivery : true,
          delivery_areas: toStringArray(restaurantData.delivery_areas),
          instagram: restaurantData.instagram || '',
          email: user.email || '',
        }

        // Only update state if component is still mounted
        if (isMountedRef.current) {
          setSettings(nextSettings)
          setCurrencyCode(currencyValue)
          if (dbLanguage) {
            setLanguage(dbLanguage)
          }
        }

        const menuItemsTable = supabase.from('menu_items') as unknown as LoosePreviewTable
        const { data: menuPreview, error: previewError } = await menuItemsTable
          .select('name, price, image_url')
          .eq('restaurant_id', restaurantData.id)
          .limit(1)
          .maybeSingle()

        if (previewError) {
          throw previewError
        }

        if (menuPreview && isMountedRef.current) {
          setPreviewItem({
            name: menuPreview.name,
            price: menuPreview.price,
            image_url: menuPreview.image_url,
          })
        }

        if (isMountedRef.current) {
          initialSnapshotRef.current = JSON.stringify(nextSettings)
          setHasUnsavedChanges(false)
          isInitializedRef.current = true
        }
      } catch (error) {
        console.error('Settings load failed:', error)
        toast.error('Could not load your settings. Please try again.')
      } finally {
        if (isMountedRef.current) {
          setLoading(false)
        }
      }
    }

    void fetchSettingsData()
  }, [])

  useEffect(() => {
    if (!isInitializedRef.current) return
    const currentSnapshot = JSON.stringify(settings)
    const changed = currentSnapshot !== initialSnapshotRef.current || logoFile !== null || newPassword.trim() !== ''
    setHasUnsavedChanges(changed)
  }, [settings, logoFile, newPassword])

  const handleSave = async (): Promise<boolean> => {
    if (!settings.id) {
      toast.error('Restaurant record is missing. Please reload the page.')
      return false
    }

    setSaving(true)
    try {
      let finalLogoUrl = settings.logo_url

      if (logoFile) {
        if (!settings.owner_id) {
          toast.error('Cannot upload logo: Restaurant owner ID is missing.')
          return false
        }
        const extension = logoFile.name.split('.').pop() || 'png'
        const filePath = `${settings.owner_id}/${uuidv4()}.${extension}`
        const { error: uploadError } = await supabase.storage
          .from('restaurant-logos')
          .upload(filePath, logoFile, { upsert: true })

        if (uploadError) {
          throw uploadError
        }

        finalLogoUrl = supabase.storage.from('restaurant-logos').getPublicUrl(filePath).data.publicUrl
      }

      const updatePayload = {
        name: settings.name,
        description: settings.description,
        logo_url: finalLogoUrl,
        phone: settings.phone,
        whatsapp: settings.whatsapp,
        address: settings.address,
        opens_at: convertTo12Hour(settings.opens_at),
        closes_at: convertTo12Hour(settings.closes_at),
        operating_days: settings.operating_days,
        currency: settings.currency,
        min_order: settings.min_order,
        tax_percent: settings.tax_percent,
        is_delivery: settings.is_delivery,
        delivery_areas: settings.delivery_areas,
        instagram: settings.instagram,
        dashboard_lang: language,
      }

      const restaurantsTable = supabase.from('restaurants') as unknown as LooseUpdateTable
      const { error: updateError } = await restaurantsTable
        .update(updatePayload)
        .eq('id', settings.id)

      if (updateError) {
        throw updateError
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      const authPayload: { email?: string; password?: string; data?: any } = {}
      const nextMetadata = {
        ...(user?.user_metadata || {}),
        dashboardLang: language,
      }
      if (settings.email && settings.email !== (user?.email || '')) {
        authPayload.email = settings.email
      }

      if (newPassword.trim()) {
        authPayload.password = newPassword
      }

      // Combine email/password updates with metadata in single call
      if (Object.keys(authPayload).length > 0 || authPayload.data) {
        authPayload.data = nextMetadata
        const { error: authError } = await supabase.auth.updateUser(authPayload)
        if (authError) {
          throw authError
        }

        if (authPayload.email) {
          toast.info('Email update started. Please confirm the change from your inbox.')
        }
        if (authPayload.password) {
          toast.success('Password updated successfully.')
        }
      } else {
        // Only metadata changed, update separately
        const { error: metadataError } = await supabase.auth.updateUser({ data: nextMetadata })
        if (metadataError) {
          throw metadataError
        }
      }

      setCurrencyCode(settings.currency)

      const savedSettings = {
        ...settings,
        logo_url: finalLogoUrl,
      }

      setSettings(savedSettings)
      setLogoFileState(null)
      setNewPassword('')
      initialSnapshotRef.current = JSON.stringify(savedSettings)
      setHasUnsavedChanges(false)
      toast.success('Settings saved successfully!')
      await refreshRestaurant()
      return true
    } catch (error) {
      console.error('Settings save failed:', error)
      const message = error instanceof Error ? error.message : 'Could not save settings. Please try again.'
      toast.error(message)
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRestaurant = async (): Promise<void> => {
    if (!settings.id) {
      toast.error('Restaurant record is missing. Please reload the page.')
      return
    }

    setSaving(true)
    try {
      const { error: itemsError } = await supabase
        .from('menu_items')
        .delete()
        .eq('restaurant_id', settings.id)

      if (itemsError) {
        throw itemsError
      }

      const { error: restaurantError } = await supabase
        .from('restaurants')
        .delete()
        .eq('id', settings.id)

      if (restaurantError) {
        throw restaurantError
      }

      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) {
        throw signOutError
      }

      window.location.href = '/'
    } catch (error) {
      console.error('Restaurant deletion failed:', error)
      const message = error instanceof Error ? error.message : 'Could not delete restaurant. Please try again.'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return {
    settings,
    setSettings,
    previewItem,
    newPassword,
    setNewPassword,
    logoFile,
    setLogoFile,
    loading,
    saving,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    handleSave,
    handleDeleteRestaurant,
  }
}
