import type { EventCategory } from '@/types/database'

// The DB stores event categories as Russian text (matching the CHECK constraint).
// This maps each to a stable slug used for message keys and filter values.
export const EVENT_CATEGORY_SLUG: Record<EventCategory, string> = {
  концерт: 'concert',
  стендап: 'standup',
  вечеринка: 'party',
  выставка: 'exhibition',
  дети: 'kids',
  спорт: 'sport',
  нетворкинг: 'networking',
}

export const EVENT_CATEGORIES = Object.keys(EVENT_CATEGORY_SLUG) as EventCategory[]

export function eventCategorySlug(category: string): string {
  return EVENT_CATEGORY_SLUG[category as EventCategory] ?? category
}

/** Localized event title, falling back to the English base. */
export function pickEventTitle(
  event: { title_en: string; title_ru: string | null },
  locale: string,
): string {
  if (locale === 'ru' && event.title_ru && event.title_ru.trim()) {
    return event.title_ru
  }
  return event.title_en
}

/** Localized event description, falling back to the English base. */
export function pickEventDescription(
  event: { description_en: string | null; description_ru: string | null },
  locale: string,
): string | null {
  if (locale === 'ru' && event.description_ru && event.description_ru.trim()) {
    return event.description_ru
  }
  return event.description_en
}
