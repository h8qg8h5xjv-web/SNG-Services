import { z } from 'zod'
import { EVENT_CATEGORIES } from '../events/constants'
import { openingHoursSchema } from '../hours'

export const FULFILLMENT_TYPES = ['native_booking', 'external_order', 'enquiry'] as const
export const CONTENT_STATUSES = ['draft', 'published'] as const
export const ENTITY_TYPES = ['place', 'pro'] as const
export const CLAIM_STATUSES = ['unclaimed', 'claimed', 'invited'] as const
export const TRANSLATION_LOCALES = ['ru', 'uk', 'kk', 'ka', 'hy'] as const

const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase letters, digits and dashes only')

const optionalUrl = z
  .string()
  .url('Must be a valid URL')
  .nullable()
  .or(z.literal('').transform(() => null))

export const serviceSchema = z.object({
  id: z.string().uuid().optional(),
  name_en: z.string().min(1, 'Required'),
  name_ru: z.string().nullable().default(null),
  description_en: z.string().nullable().default(null),
  description_ru: z.string().nullable().default(null),
  duration_min: z.number().int().positive('Must be > 0'),
  price_pence: z.number().int().min(0, 'Must be ≥ 0'),
  capacity: z.number().int().positive('Must be > 0'),
})

export const scheduleRowSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM'),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM'),
})

export const translationSchema = z.object({
  locale: z.enum(TRANSLATION_LOCALES),
  name: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
})

export const providerInputSchema = z
  .object({
    slug,
    name_en: z.string().min(1, 'Required'),
    description_en: z.string().min(1, 'Required'),
    category_id: z.string().uuid('Pick a category'),
    borough: z.string().min(1, 'Required'),
    address: z.string().nullable().default(null),
    lat: z.number().nullable().default(null),
    lng: z.number().nullable().default(null),
    phone: z.string().nullable().default(null),
    telegram: z.string().nullable().default(null),
    instagram: z.string().nullable().default(null),
    website: z.string().nullable().default(null),
    cover_image: z.string().nullable().default(null),
    fulfillment_type: z.enum(FULFILLMENT_TYPES),
    external_order_url: optionalUrl.default(null),
    status: z.enum(CONTENT_STATUSES),
    entity_type: z.enum(ENTITY_TYPES),
    claim_status: z.enum(CLAIM_STATUSES),
    booking_enabled: z.boolean().default(true),
    travel_radius_km: z.number().int().min(0).nullable().default(null),
    opening_hours: openingHoursSchema.default(null),
    venue_photos: z.array(z.string()).max(6).nullable().default(null),
    languages: z.array(z.string()).default([]),
    translations: z.array(translationSchema).default([]),
    services: z.array(serviceSchema).default([]),
    schedule: z.array(scheduleRowSchema).default([]),
  })
  .superRefine((val, ctx) => {
    if (val.fulfillment_type === 'external_order' && !val.external_order_url) {
      ctx.addIssue({
        path: ['external_order_url'],
        code: z.ZodIssueCode.custom,
        message: 'Required when fulfillment is “order outside”.',
      })
    }
    if (val.status === 'published' && val.languages.length === 0) {
      ctx.addIssue({
        path: ['languages'],
        code: z.ZodIssueCode.custom,
        message: 'A published provider must serve at least one CIS language.',
      })
    }
    if (val.entity_type === 'place' && val.travel_radius_km !== null) {
      ctx.addIssue({
        path: ['travel_radius_km'],
        code: z.ZodIssueCode.custom,
        message: 'Travel radius applies to a pro, not a place.',
      })
    }
    if (
      val.entity_type === 'pro' &&
      ((val.opening_hours && Object.keys(val.opening_hours).length > 0) ||
        (val.venue_photos && val.venue_photos.length > 0))
    ) {
      ctx.addIssue({
        path: ['opening_hours'],
        code: z.ZodIssueCode.custom,
        message: 'Opening hours and venue photos apply to a place, not a pro.',
      })
    }
    if (val.fulfillment_type !== 'native_booking' && val.schedule.length > 0) {
      ctx.addIssue({
        path: ['schedule'],
        code: z.ZodIssueCode.custom,
        message: 'Schedules are only allowed for native-booking providers.',
      })
    }
    for (const row of val.schedule) {
      if (row.end_time <= row.start_time) {
        ctx.addIssue({
          path: ['schedule'],
          code: z.ZodIssueCode.custom,
          message: 'Each schedule row must end after it starts.',
        })
        break
      }
    }
  })

export type ProviderInput = z.infer<typeof providerInputSchema>

export const eventInputSchema = z
  .object({
    slug,
    title_en: z.string().min(1, 'Required'),
    title_ru: z.string().nullable().default(null),
    description_en: z.string().nullable().default(null),
    description_ru: z.string().nullable().default(null),
    category: z.enum(EVENT_CATEGORIES as [string, ...string[]]),
    starts_at: z.string().min(1, 'Required'),
    ends_at: z.string().nullable().default(null),
    venue_name: z.string().nullable().default(null),
    address: z.string().nullable().default(null),
    lat: z.number().nullable().default(null),
    lng: z.number().nullable().default(null),
    borough: z.string().nullable().default(null),
    price_from_pence: z.number().int().min(0).nullable().default(null),
    ticket_url: optionalUrl.default(null),
    organizer_provider_id: z.string().uuid().nullable().default(null),
    languages: z.array(z.string()).default([]),
    cover_image: z.string().nullable().default(null),
    status: z.enum(CONTENT_STATUSES),
  })
  .superRefine((val, ctx) => {
    if (val.ends_at && val.ends_at <= val.starts_at) {
      ctx.addIssue({
        path: ['ends_at'],
        code: z.ZodIssueCode.custom,
        message: 'End must be after the start.',
      })
    }
  })

export type EventInput = z.infer<typeof eventInputSchema>
