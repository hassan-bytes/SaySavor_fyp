import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/shared/lib/supabaseClient'
import { COUNTRY_CURRENCIES, CurrencyInfo } from '@/shared/lib/currencyUtils'
import { useLanguage, Language } from '@/shared/contexts/LanguageContext'

interface RestaurantRow {
  id: string
  name: string | null
  logo_url: string | null
  currency: string | null
  dashboard_lang: string | null
}

interface RestaurantContextValue {
  restaurantId: string
  restaurantName: string
  logoUrl: string | null
  currency: CurrencyInfo
  currencySymbol: string
  currencyCode: string
  isLoading: boolean
  refreshRestaurant: () => Promise<void>
}

// Safe default — find PKR by code, never assume key name
const DEFAULT_CURRENCY: CurrencyInfo =
  Object.values(COUNTRY_CURRENCIES).find(c => c.code === 'PKR') ??
  Object.values(COUNTRY_CURRENCIES)[0]

const RestaurantContext = createContext<RestaurantContextValue | null>(null)

export function RestaurantProvider({ children }: { children: React.ReactNode }) {
  const { setLanguage } = useLanguage()
  const [restaurantId, setRestaurantId] = useState('')
  const [restaurantName, setRestaurantName] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [currency, setCurrency] = useState<CurrencyInfo>(DEFAULT_CURRENCY)
  const [isLoading, setIsLoading] = useState(true)
  const isFetchingRef = useRef(false)

  const fetchRestaurant = useCallback(async () => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: restaurant, error } = await supabase
        .from('restaurants')
        .select('id, name, logo_url, currency, dashboard_lang')
        .eq('owner_id', user.id)
        .single() as { data: RestaurantRow | null; error: any }

      if (error) {
        console.error('RestaurantContext query error:', error)
        return
      }

      if (restaurant) {
        setRestaurantId(restaurant.id)
        setRestaurantName(restaurant.name || '')
        setLogoUrl(restaurant.logo_url)

        if (restaurant.currency) {
          const found = Object.values(COUNTRY_CURRENCIES).find(
            c => c.code === restaurant.currency
          )
          if (found) setCurrency(found)
        }

        if (restaurant.dashboard_lang) {
          setLanguage(restaurant.dashboard_lang as Language)
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.includes('AbortError')) return
      console.error('RestaurantContext fetch error:', err)
    } finally {
      isFetchingRef.current = false
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchRestaurant() }, [])

  const value: RestaurantContextValue = {
    restaurantId,
    restaurantName,
    logoUrl,
    currency,
    currencySymbol: currency?.symbol ?? 'Rs.',
    currencyCode: currency?.code ?? 'PKR',
    isLoading,
    refreshRestaurant: fetchRestaurant,
  }

  // CRITICAL SECURITY: Block rendering if no restaurantId
  // Prevents data leakage and ensures multi-tenant isolation
  if (!isLoading && !restaurantId) {
    return (
      <div className="min-h-screen bg-[#060606] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-red-500 text-lg font-semibold">
            ⚠️ Restaurant Not Found
          </div>
          <p className="text-slate-400 text-sm max-w-md">
            No restaurant is associated with your account. Please complete restaurant setup first.
          </p>
          <a 
            href="/restaurant-setup" 
            className="inline-block px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
          >
            Complete Setup
          </a>
        </div>
      </div>
    )
  }

  return (
    <RestaurantContext.Provider value={value}>
      {children}
    </RestaurantContext.Provider>
  )
}

export function useRestaurant() {
  const ctx = useContext(RestaurantContext)
  if (!ctx) throw new Error('useRestaurant must be used inside RestaurantProvider')
  return ctx
}