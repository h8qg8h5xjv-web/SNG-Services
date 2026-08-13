// Convenience row aliases and shared enums, re-exported from the generated schema types.

import type { Database } from './database'

export type {
  Database,
  FulfillmentType,
  ContentStatus,
  BookingStatus,
  EventCategory,
  InterfaceLocale,
  TranslationLocale,
  Json,
} from './database'

type Tables = Database['public']['Tables']

export type Category = Tables['categories']['Row']
export type Language = Tables['languages']['Row']
export type Provider = Tables['providers']['Row']
export type ProviderLanguage = Tables['provider_languages']['Row']
export type ProviderTranslation = Tables['provider_translations']['Row']
export type Service = Tables['services']['Row']
export type Schedule = Tables['schedules']['Row']
export type ScheduleException = Tables['schedule_exceptions']['Row']
export type Booking = Tables['bookings']['Row']
export type EventRow = Tables['events']['Row']
