// Database types mirroring the SQL migrations in /supabase.
// Hand-authored to match the schema; can be regenerated with
//   supabase gen types typescript --local > types/database.ts
// once the Supabase CLI is wired up.

export type FulfillmentType = 'native_booking' | 'external_order' | 'enquiry'
export type ContentStatus = 'draft' | 'published'
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled'
export type EventCategory =
  | 'концерт'
  | 'стендап'
  | 'вечеринка'
  | 'выставка'
  | 'дети'
  | 'спорт'
  | 'нетворкинг'

// Interface locales (URL prefix, translations). English is the base.
export type InterfaceLocale = 'en' | 'ru' | 'uk' | 'kk' | 'ka' | 'hy'
// Locales a provider translation may target (en lives on the provider row itself).
export type TranslationLocale = Exclude<InterfaceLocale, 'en'>

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          slug: string
          name_en: string
          name_ru: string
          icon: string
          sort_order: number
        }
        Insert: {
          id?: string
          slug: string
          name_en: string
          name_ru: string
          icon: string
          sort_order?: number
        }
        Update: {
          id?: string
          slug?: string
          name_en?: string
          name_ru?: string
          icon?: string
          sort_order?: number
        }
        Relationships: []
      }
      languages: {
        Row: { code: string; name_native: string; sort_order: number }
        Insert: { code: string; name_native: string; sort_order?: number }
        Update: { code?: string; name_native?: string; sort_order?: number }
        Relationships: []
      }
      providers: {
        Row: {
          id: string
          slug: string
          name_en: string
          description_en: string
          category_id: string
          borough: string
          address: string | null
          lat: number | null
          lng: number | null
          phone: string | null
          telegram: string | null
          instagram: string | null
          website: string | null
          cover_image: string | null
          fulfillment_type: FulfillmentType
          external_order_url: string | null
          status: ContentStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name_en: string
          description_en: string
          category_id: string
          borough: string
          address?: string | null
          lat?: number | null
          lng?: number | null
          phone?: string | null
          telegram?: string | null
          instagram?: string | null
          website?: string | null
          cover_image?: string | null
          fulfillment_type: FulfillmentType
          external_order_url?: string | null
          status?: ContentStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name_en?: string
          description_en?: string
          category_id?: string
          borough?: string
          address?: string | null
          lat?: number | null
          lng?: number | null
          phone?: string | null
          telegram?: string | null
          instagram?: string | null
          website?: string | null
          cover_image?: string | null
          fulfillment_type?: FulfillmentType
          external_order_url?: string | null
          status?: ContentStatus
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'providers_category_id_fkey'
            columns: ['category_id']
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
        ]
      }
      provider_languages: {
        Row: { provider_id: string; language_code: string }
        Insert: { provider_id: string; language_code: string }
        Update: { provider_id?: string; language_code?: string }
        Relationships: [
          {
            foreignKeyName: 'provider_languages_provider_id_fkey'
            columns: ['provider_id']
            referencedRelation: 'providers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'provider_languages_language_code_fkey'
            columns: ['language_code']
            referencedRelation: 'languages'
            referencedColumns: ['code']
          },
        ]
      }
      provider_translations: {
        Row: {
          provider_id: string
          locale: TranslationLocale
          name: string | null
          description: string | null
        }
        Insert: {
          provider_id: string
          locale: TranslationLocale
          name?: string | null
          description?: string | null
        }
        Update: {
          provider_id?: string
          locale?: TranslationLocale
          name?: string | null
          description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'provider_translations_provider_id_fkey'
            columns: ['provider_id']
            referencedRelation: 'providers'
            referencedColumns: ['id']
          },
        ]
      }
      services: {
        Row: {
          id: string
          provider_id: string
          name_en: string
          name_ru: string | null
          description_en: string | null
          description_ru: string | null
          duration_min: number
          price_pence: number
          capacity: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          name_en: string
          name_ru?: string | null
          description_en?: string | null
          description_ru?: string | null
          duration_min: number
          price_pence?: number
          capacity?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          name_en?: string
          name_ru?: string | null
          description_en?: string | null
          description_ru?: string | null
          duration_min?: number
          price_pence?: number
          capacity?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'services_provider_id_fkey'
            columns: ['provider_id']
            referencedRelation: 'providers'
            referencedColumns: ['id']
          },
        ]
      }
      schedules: {
        Row: {
          id: string
          provider_id: string
          day_of_week: number
          start_time: string
          end_time: string
        }
        Insert: {
          id?: string
          provider_id: string
          day_of_week: number
          start_time: string
          end_time: string
        }
        Update: {
          id?: string
          provider_id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
        }
        Relationships: [
          {
            foreignKeyName: 'schedules_provider_id_fkey'
            columns: ['provider_id']
            referencedRelation: 'providers'
            referencedColumns: ['id']
          },
        ]
      }
      schedule_exceptions: {
        Row: {
          id: string
          provider_id: string
          exception_date: string
          is_closed: boolean
          start_time: string | null
          end_time: string | null
        }
        Insert: {
          id?: string
          provider_id: string
          exception_date: string
          is_closed?: boolean
          start_time?: string | null
          end_time?: string | null
        }
        Update: {
          id?: string
          provider_id?: string
          exception_date?: string
          is_closed?: boolean
          start_time?: string | null
          end_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'schedule_exceptions_provider_id_fkey'
            columns: ['provider_id']
            referencedRelation: 'providers'
            referencedColumns: ['id']
          },
        ]
      }
      bookings: {
        Row: {
          id: string
          service_id: string
          provider_id: string
          starts_at: string
          ends_at: string
          party_size: number
          customer_name: string
          customer_phone: string
          customer_email: string | null
          status: BookingStatus
          is_visible_to_group: boolean
          customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          service_id: string
          // Filled from the service by a trigger; callers may omit it.
          provider_id?: string
          starts_at: string
          ends_at: string
          party_size?: number
          customer_name: string
          customer_phone: string
          customer_email?: string | null
          status?: BookingStatus
          is_visible_to_group?: boolean
          customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          service_id?: string
          provider_id?: string
          starts_at?: string
          ends_at?: string
          party_size?: number
          customer_name?: string
          customer_phone?: string
          customer_email?: string | null
          status?: BookingStatus
          is_visible_to_group?: boolean
          customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'bookings_service_id_fkey'
            columns: ['service_id']
            referencedRelation: 'services'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bookings_provider_id_fkey'
            columns: ['provider_id']
            referencedRelation: 'providers'
            referencedColumns: ['id']
          },
        ]
      }
      provider_members: {
        Row: {
          provider_id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          provider_id: string
          user_id: string
          role?: string
          created_at?: string
        }
        Update: {
          provider_id?: string
          user_id?: string
          role?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'provider_members_provider_id_fkey'
            columns: ['provider_id']
            referencedRelation: 'providers'
            referencedColumns: ['id']
          },
        ]
      }
      provider_invites: {
        Row: {
          id: string
          provider_id: string
          token: string
          expires_at: string
          used_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          token: string
          expires_at: string
          used_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          token?: string
          expires_at?: string
          used_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'provider_invites_provider_id_fkey'
            columns: ['provider_id']
            referencedRelation: 'providers'
            referencedColumns: ['id']
          },
        ]
      }
      provider_events: {
        Row: {
          id: string
          provider_id: string
          event_type: string
          position: number | null
          surface: string | null
          session_id: string | null
          category_id: string | null
          locale: string | null
          occurred_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          event_type: string
          position?: number | null
          surface?: string | null
          session_id?: string | null
          category_id?: string | null
          locale?: string | null
          occurred_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          event_type?: string
          position?: number | null
          surface?: string | null
          session_id?: string | null
          category_id?: string | null
          locale?: string | null
          occurred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'provider_events_provider_id_fkey'
            columns: ['provider_id']
            referencedRelation: 'providers'
            referencedColumns: ['id']
          },
        ]
      }
      events: {
        Row: {
          id: string
          slug: string
          title_en: string
          title_ru: string | null
          description_en: string | null
          description_ru: string | null
          category: EventCategory
          starts_at: string
          ends_at: string | null
          venue_name: string | null
          address: string | null
          lat: number | null
          lng: number | null
          borough: string | null
          price_from_pence: number | null
          ticket_url: string | null
          organizer_provider_id: string | null
          languages: string[]
          cover_image: string | null
          status: ContentStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title_en: string
          title_ru?: string | null
          description_en?: string | null
          description_ru?: string | null
          category: EventCategory
          starts_at: string
          ends_at?: string | null
          venue_name?: string | null
          address?: string | null
          lat?: number | null
          lng?: number | null
          borough?: string | null
          price_from_pence?: number | null
          ticket_url?: string | null
          organizer_provider_id?: string | null
          languages?: string[]
          cover_image?: string | null
          status?: ContentStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title_en?: string
          title_ru?: string | null
          description_en?: string | null
          description_ru?: string | null
          category?: EventCategory
          starts_at?: string
          ends_at?: string | null
          venue_name?: string | null
          address?: string | null
          lat?: number | null
          lng?: number | null
          borough?: string | null
          price_from_pence?: number | null
          ticket_url?: string | null
          organizer_provider_id?: string | null
          languages?: string[]
          cover_image?: string | null
          status?: ContentStatus
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'events_organizer_provider_id_fkey'
            columns: ['organizer_provider_id']
            referencedRelation: 'providers'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<never, never>
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean }
      is_provider_member: { Args: { p_provider_id: string }; Returns: boolean }
      accept_provider_invite: { Args: { p_token: string }; Returns: string }
      slot_participants: {
        Args: { p_service_id: string; p_starts_at: string }
        Returns: { name: string }[]
      }
    }
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}
