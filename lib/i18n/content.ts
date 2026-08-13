// Localized content selection for DB-stored text. English is the fallback base
// and is shown without any "translation missing" marker (that marker is admin-only).

export type Translation = {
  locale: string
  name: string | null
  description: string | null
}

export type LocalizedContent = { name: string; description: string }

function nonEmpty(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/** Provider name/description for a locale, falling back to the English base. */
export function pickProviderContent(
  base: { name_en: string; description_en: string },
  translations: Translation[],
  locale: string,
): LocalizedContent {
  if (locale === 'en') {
    return { name: base.name_en, description: base.description_en }
  }
  const tr = translations.find((t) => t.locale === locale)
  return {
    name: nonEmpty(tr?.name) ? tr!.name! : base.name_en,
    description: nonEmpty(tr?.description) ? tr!.description! : base.description_en,
  }
}

/** Category names live directly on the row (only en + ru). Others fall back to en. */
export function pickCategoryName(
  category: { name_en: string; name_ru: string },
  locale: string,
): string {
  return locale === 'ru' ? category.name_ru : category.name_en
}
