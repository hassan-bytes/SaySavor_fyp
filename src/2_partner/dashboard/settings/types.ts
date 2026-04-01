export interface RestaurantSettings {
  // identifiers
  id: string
  owner_id: string

  // basic info
  name: string
  description: string
  logo_url: string | null

  // contact
  phone: string
  whatsapp: string
  address: string
  latitude: number | null
  longitude: number | null

  // hours
  opens_at: string
  closes_at: string
  operating_days: string[]

  // localization
  currency: string

  // business rules
  min_order: number | null
  tax_percent: number
  delivery_fee: number | null
  delivery_time_min: number | null
  is_delivery: boolean
  delivery_areas: string[]

  // social
  instagram: string

  // meta
  email: string
}

export type SettingsSavePayload = Omit<RestaurantSettings, 'id' | 'owner_id'>

export const DEFAULT_SETTINGS: RestaurantSettings = {
  id: '',
  owner_id: '',
  name: '',
  description: '',
  logo_url: null,
  phone: '',
  whatsapp: '',
  address: '',
  latitude: null,
  longitude: null,
  opens_at: '',
  closes_at: '',
  operating_days: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
  currency: 'PKR',
  min_order: null,
  tax_percent: 0,
  delivery_fee: 0,
  delivery_time_min: null,
  is_delivery: true,
  delivery_areas: [],
  instagram: '',
  email: '',
}
