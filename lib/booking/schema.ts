import { z } from 'zod'

export const bookingInputSchema = z.object({
  service_id: z.string().uuid(),
  starts_at: z.string().min(1),
  party_size: z.number().int().positive(),
  customer_name: z.string().min(1),
  customer_phone: z.string().min(1),
  customer_email: z
    .string()
    .email()
    .nullable()
    .or(z.literal('').transform(() => null))
    .default(null),
  is_visible_to_group: z.boolean().default(false),
})

export type BookingInput = z.infer<typeof bookingInputSchema>
