// Shared helpers for fast provider entry (admin quick-create and self-serve card
// creation): a slug from a possibly-Cyrillic name, and a one-line services parser.

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y',
  ь: '', э: 'e', ю: 'yu', я: 'ya',
}

export function slugify(name: string): string {
  const base = [...name.toLowerCase()]
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const rand = Math.random().toString(36).slice(2, 7)
  return `${base ? base.slice(0, 40) : 'master'}-${rand}`
}

export type ParsedService = {
  name_en: string
  duration_min: number
  price_pence: number
  capacity: number
}

// "Стрижка 25 60; Маникюр 30 90" → services. Each: name, price £, minutes.
export function parseServices(line: string): ParsedService[] {
  return line
    .split(/[;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .flatMap((chunk) => {
      const parts = chunk.split(/\s+/)
      if (parts.length < 3) return []
      const minutes = Number(parts[parts.length - 1])
      const pounds = Number(parts[parts.length - 2])
      const name = parts.slice(0, -2).join(' ')
      if (!name || !Number.isFinite(minutes) || minutes <= 0 || !Number.isFinite(pounds) || pounds < 0) {
        return []
      }
      return [{
        name_en: name,
        duration_min: Math.round(minutes),
        price_pence: Math.round(pounds * 100),
        capacity: 1,
      }]
    })
}
