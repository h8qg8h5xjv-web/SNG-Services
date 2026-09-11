// Database types mirroring the SQL migrations in /supabase.
// Hand-authored to match the schema; can be regenerated with
//   supabase gen types typescript --local > types/database.ts
// once the Supabase CLI is wired up.

export type FulfillmentType = 'native_booking' | 'external_order' | 'enquiry'
export type ContentStatus = 'draft' | 'published'
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled'
export type RequestType = 'fixed' | 'quote'
export type LanguageVerificationStatus = 'claimed' | 'verified' | 'rejected'
// 'seed' = demo data, never a real check. Real checks: call | voice_sample | video_call.
export type LanguageVerificationMethod = 'seed' | 'call' | 'voice_sample' | 'video_call'
// The second axis (DESIGN §2в): a place you go to vs a pro you call.
export type EntityType = 'place' | 'pro'
export type ClaimStatus = 'unclaimed' | 'claimed' | 'invited'
// Insurance/DBS follow the claimed-vs-verified model; expired verified reads as self_declared.
export type CredentialStatus = 'none' | 'self_declared' | 'verified'
export type DbsType = 'basic' | 'standard' | 'enhanced'
export type Urgency = 'today' | 'this_week' | 'flexible'
// LEGAL D3a: which regulated activity a request touches (null = none).
export type RegulatedKind = 'gas' | 'electrical' | 'other'
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

// The provider_request_stats view (query with .returns<ProviderRequestStats[]>()).
export type ProviderRequestStats = {
  provider_id: string
  received: number
  accepted: number
  accept_rate: number | null
  median_response_seconds: number | null
  cancellations_after_accept: number
}

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
          default_request_type: string
        }
        Insert: {
          id?: string
          slug: string
          name_en: string
          name_ru: string
          icon: string
          sort_order?: number
          default_request_type?: string
        }
        Update: {
          id?: string
          slug?: string
          name_en?: string
          name_ru?: string
          icon?: string
          sort_order?: number
          default_request_type?: string
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
          description_en: string | null
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
          broadcast_paused_until: string | null
          entity_type: EntityType
          claim_status: ClaimStatus
          booking_enabled: boolean
          opening_hours: Json | null
          venue_photos: string[] | null
          travel_radius_km: number | null
          insurance_status: CredentialStatus
          insurance_verified_by: string | null
          insurance_verified_at: string | null
          insurance_expires_at: string | null
          insurance_document_ref: string | null
          insurance_note: string | null
          dbs_status: CredentialStatus
          dbs_type: DbsType | null
          dbs_verified_by: string | null
          dbs_verified_at: string | null
          dbs_expires_at: string | null
          dbs_document_ref: string | null
          dbs_note: string | null
          gas_safe_number: string | null
          gas_safe_status: CredentialStatus
          gas_safe_verified_by: string | null
          gas_safe_verified_at: string | null
          gas_safe_expires_at: string | null
          gas_safe_note: string | null
          electrical_scheme: string | null
          electrical_status: CredentialStatus
          electrical_verified_by: string | null
          electrical_verified_at: string | null
          electrical_expires_at: string | null
          electrical_note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name_en: string
          description_en?: string | null
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
          broadcast_paused_until?: string | null
          entity_type?: EntityType
          claim_status?: ClaimStatus
          booking_enabled?: boolean
          opening_hours?: Json | null
          venue_photos?: string[] | null
          travel_radius_km?: number | null
          insurance_status?: CredentialStatus
          insurance_verified_by?: string | null
          insurance_verified_at?: string | null
          insurance_expires_at?: string | null
          insurance_document_ref?: string | null
          insurance_note?: string | null
          dbs_status?: CredentialStatus
          dbs_type?: DbsType | null
          dbs_verified_by?: string | null
          dbs_verified_at?: string | null
          dbs_expires_at?: string | null
          dbs_document_ref?: string | null
          dbs_note?: string | null
          gas_safe_number?: string | null
          gas_safe_status?: CredentialStatus
          gas_safe_verified_by?: string | null
          gas_safe_verified_at?: string | null
          gas_safe_expires_at?: string | null
          gas_safe_note?: string | null
          electrical_scheme?: string | null
          electrical_status?: CredentialStatus
          electrical_verified_by?: string | null
          electrical_verified_at?: string | null
          electrical_expires_at?: string | null
          electrical_note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name_en?: string
          description_en?: string | null
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
          broadcast_paused_until?: string | null
          entity_type?: EntityType
          claim_status?: ClaimStatus
          booking_enabled?: boolean
          opening_hours?: Json | null
          venue_photos?: string[] | null
          travel_radius_km?: number | null
          insurance_status?: CredentialStatus
          insurance_verified_by?: string | null
          insurance_verified_at?: string | null
          insurance_expires_at?: string | null
          insurance_document_ref?: string | null
          insurance_note?: string | null
          dbs_status?: CredentialStatus
          dbs_type?: DbsType | null
          dbs_verified_by?: string | null
          dbs_verified_at?: string | null
          dbs_expires_at?: string | null
          dbs_document_ref?: string | null
          dbs_note?: string | null
          gas_safe_number?: string | null
          gas_safe_status?: CredentialStatus
          gas_safe_verified_by?: string | null
          gas_safe_verified_at?: string | null
          gas_safe_expires_at?: string | null
          gas_safe_note?: string | null
          electrical_scheme?: string | null
          electrical_status?: CredentialStatus
          electrical_verified_by?: string | null
          electrical_verified_at?: string | null
          electrical_expires_at?: string | null
          electrical_note?: string | null
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
        Row: {
          provider_id: string
          language_code: string
          status: LanguageVerificationStatus
          verified_by: string | null
          verified_at: string | null
          method: LanguageVerificationMethod | null
          expires_at: string | null
          note: string | null
          professional_level: boolean
        }
        Insert: {
          provider_id: string
          language_code: string
          status?: LanguageVerificationStatus
          verified_by?: string | null
          verified_at?: string | null
          method?: LanguageVerificationMethod | null
          expires_at?: string | null
          note?: string | null
          professional_level?: boolean
        }
        Update: {
          provider_id?: string
          language_code?: string
          status?: LanguageVerificationStatus
          verified_by?: string | null
          verified_at?: string | null
          method?: LanguageVerificationMethod | null
          expires_at?: string | null
          note?: string | null
          professional_level?: boolean
        }
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
          price_pence: number
          duration_min: number
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
          // Snapshotted from the service by the trigger when omitted; immutable after.
          price_pence?: number
          duration_min?: number
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
          // Immutable — the trigger freezes these to their original values.
          price_pence?: number
          duration_min?: number
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
      requests: {
        Row: {
          id: string
          public_ref: string
          guest_token: string
          customer_id: string | null
          type: string
          category_id: string
          service_id: string | null
          target_provider_id: string | null
          borough: string
          postcode_outward: string | null
          urgency: Urgency
          photos: string[] | null
          regulated: boolean
          regulated_kind: RegulatedKind | null
          description: string | null
          budget_max_pence: number | null
          status: string
          created_at: string
          expires_at: string | null
        }
        Insert: {
          id?: string
          public_ref?: string
          guest_token?: string
          customer_id?: string | null
          type: string
          category_id: string
          service_id?: string | null
          target_provider_id?: string | null
          borough: string
          postcode_outward?: string | null
          urgency?: Urgency
          photos?: string[] | null
          regulated?: boolean
          regulated_kind?: RegulatedKind | null
          description?: string | null
          budget_max_pence?: number | null
          status?: string
          created_at?: string
          expires_at?: string | null
        }
        Update: {
          status?: string
          expires_at?: string | null
          description?: string | null
          budget_max_pence?: number | null
        }
        Relationships: []
      }
      request_contacts: {
        Row: {
          request_id: string
          contact_name: string
          contact_phone: string
          contact_email: string | null
          address: string | null
          postcode: string | null
        }
        Insert: {
          request_id: string
          contact_name: string
          contact_phone: string
          contact_email?: string | null
          address?: string | null
          postcode?: string | null
        }
        Update: {
          contact_name?: string
          contact_phone?: string
          contact_email?: string | null
          address?: string | null
          postcode?: string | null
        }
        Relationships: []
      }
      request_windows: {
        Row: { id: string; request_id: string; starts_at: string; ends_at: string }
        Insert: { id?: string; request_id: string; starts_at: string; ends_at: string }
        Update: { starts_at?: string; ends_at?: string }
        Relationships: []
      }
      request_targets: {
        Row: {
          id: string
          request_id: string
          provider_id: string
          wave: number
          channel: string | null
          notified_at: string | null
          response: string
          responded_at: string | null
        }
        Insert: {
          id?: string
          request_id: string
          provider_id: string
          wave: number
          channel?: string | null
          notified_at?: string | null
          response?: string
          responded_at?: string | null
        }
        Update: {
          channel?: string | null
          notified_at?: string | null
          response?: string
          responded_at?: string | null
        }
        Relationships: []
      }
      request_offers: {
        Row: {
          id: string
          request_id: string
          provider_id: string
          price_pence: number
          message: string | null
          proposed_start: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          request_id: string
          provider_id: string
          price_pence: number
          message?: string | null
          proposed_start?: string | null
          status?: string
          created_at?: string
        }
        Update: { price_pence?: number; message?: string | null; status?: string }
        Relationships: []
      }
      request_matches: {
        Row: {
          request_id: string
          provider_id: string
          service_id: string | null
          starts_at: string | null
          ends_at: string | null
          price_pence: number | null
          booking_id: string | null
          created_at: string
        }
        Insert: {
          request_id: string
          provider_id: string
          service_id?: string | null
          starts_at?: string | null
          ends_at?: string | null
          price_pence?: number | null
          booking_id?: string | null
          created_at?: string
        }
        Update: { booking_id?: string | null }
        Relationships: []
      }
      provider_events: {
        Row: {
          id: string
          provider_id: string | null
          event_type: string
          position: number | null
          surface: string | null
          session_id: string | null
          category_id: string | null
          locale: string | null
          search_query: string | null
          occurred_at: string
        }
        Insert: {
          id?: string
          provider_id?: string | null
          event_type: string
          position?: number | null
          surface?: string | null
          session_id?: string | null
          category_id?: string | null
          locale?: string | null
          search_query?: string | null
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
      accept_request: {
        Args: {
          p_request_id: string
          p_provider_id: string
          p_service_id: string | null
          p_starts_at: string | null
          p_ends_at: string | null
          p_price_pence: number | null
        }
        Returns: boolean
      }
    }
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}
