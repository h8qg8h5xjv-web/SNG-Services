// Free-text → category (REQUESTS 12.2). Case-insensitive, Cyrillic + Latin.
// Keywords are the subcategory tags from DESIGN §2 plus a few obvious synonyms;
// category names (ru/en) are added from the live category list at call time so
// the two never drift. Pure and unit-testable.

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  beauty: [
    'парикмахер', 'стрижк', 'волос', 'ногт', 'маникюр', 'педикюр', 'бров', 'ресниц',
    'косметолог', 'барбер', 'массаж', 'тату', 'макияж', 'красот',
    'haircut', 'hair', 'nails', 'barber', 'massage', 'brows', 'lashes', 'beauty',
  ],
  health: [
    'стоматолог', 'зуб', 'врач', 'терапевт', 'психолог', 'психотерап', 'физиотерап',
    'узи', 'диетолог', 'доктор', 'здоров',
    'dentist', 'doctor', 'psycholog', 'therapist', 'health',
  ],
  kids: [
    'нян', 'русская школа', 'кружок', 'кружк', 'детск', 'логопед', 'ребён', 'ребен', 'дет',
    'nanny', 'kids', 'children', 'speech',
  ],
  education: [
    'английск', 'репетитор', 'математик', 'музык', 'гитар', 'автошкол', 'курс', 'урок',
    'обучени', 'язык', 'tutor', 'english', 'lesson', 'course', 'driving',
  ],
  home: [
    'сантехник', 'электрик', 'мастер на час', 'уборк', 'убрать', 'ремонт', 'мебел',
    'сборка', 'клининг', 'plumber', 'electrician', 'clean', 'handyman', 'repair', 'furniture',
  ],
  moving: [
    'грузчик', 'переезд', 'ван', 'man and van', 'посылк', 'хранени', 'перевоз',
    'moving', 'movers', 'van', 'storage', 'parcel',
  ],
  legal: [
    'юрист', 'иммиграцион', 'бухгалтер', 'апостил', 'виз', 'документ', 'перевод документ',
    'lawyer', 'immigration', 'accountant', 'visa', 'apostille', 'document',
  ],
  restaurants: [
    'ресторан', 'кафе', 'чайхана', 'кондитер', 'бар', 'столов',
    'restaurant', 'cafe', 'bar', 'canteen',
  ],
  food: [
    'магазин', 'кейтеринг', 'торт', 'выпечк', 'домашняя кухня', 'продукт', 'еда', 'доставка',
    'catering', 'cake', 'food', 'grocery', 'delivery',
  ],
  sport: [
    'зал', 'тренер', 'фитнес', 'бассейн', 'единоборств', 'бокс', 'танц', 'йога', 'спорт',
    'gym', 'trainer', 'fitness', 'pool', 'yoga', 'dance', 'sport',
  ],
  auto: [
    'механик', 'шиномонтаж', 'детейлинг', 'авто', 'машин', 'выкуп авто',
    'mechanic', 'tyre', 'tire', 'detailing', 'car', 'auto',
  ],
  celebrations: [
    'фотограф', 'фото', 'ведущ', 'тамада', 'декор', 'аренда зала', 'музыкант', 'праздник',
    'photographer', 'photo', 'host', 'decor', 'musician', 'party',
  ],
  finance: [
    'денежные перевод', 'перевод денег', 'ипотек', 'брокер', 'страхован', 'финанс',
    'money transfer', 'mortgage', 'broker', 'insurance', 'finance',
  ],
  pets: [
    'груминг', 'ветеринар', 'передержк', 'выгул', 'питомц', 'собак', 'кошк', 'животн',
    'grooming', 'vet', 'pet', 'dog', 'cat', 'walking',
  ],
}

export type CategoryLite = { slug: string; name_en: string; name_ru: string }

/**
 * Best matching category slug for a free-text query, or null if nothing matches.
 * Score = number of keywords found as substrings of the normalised query; ties
 * break toward the longest matched keyword (the more specific term).
 */
export function matchCategory(query: string, categories: CategoryLite[]): string | null {
  const q = query.toLowerCase().trim()
  if (q.length < 2) return null

  let best: { slug: string; score: number; longest: number } | null = null
  for (const cat of categories) {
    const keywords = [
      ...(CATEGORY_KEYWORDS[cat.slug] ?? []),
      cat.name_ru.toLowerCase(),
      cat.name_en.toLowerCase(),
    ]
    let score = 0
    let longest = 0
    for (const kw of keywords) {
      if (kw.length >= 2 && q.includes(kw)) {
        score++
        if (kw.length > longest) longest = kw.length
      }
    }
    if (score > 0 && (!best || score > best.score || (score === best.score && longest > best.longest))) {
      best = { slug: cat.slug, score, longest }
    }
  }
  return best?.slug ?? null
}
