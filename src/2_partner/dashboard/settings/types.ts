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

  // hours
  opens_at: string
  closes_at: string
  operating_days: string[]

  // localization
  currency: string

  // business rules
  min_order: number | null
  tax_percent: number
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
  opens_at: '',
  closes_at: '',
  operating_days: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
  currency: 'PKR',
  min_order: null,
  tax_percent: 0,
  is_delivery: true,
  delivery_areas: [],
  instagram: '',
  email: '',
}
