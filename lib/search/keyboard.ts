// Keyboard-layout tolerance for search (§11): text typed in the wrong layout still
// finds the right thing. Maps each physical key between QWERTY (Latin) and
// ЙЦУКЕН (Russian). "vfybr.h" (Russian word typed on the Latin layout) → "маникюр".

const EN2RU: Record<string, string> = {
  q: 'й', w: 'ц', e: 'у', r: 'к', t: 'е', y: 'н', u: 'г', i: 'ш', o: 'щ', p: 'з', '[': 'х', ']': 'ъ',
  a: 'ф', s: 'ы', d: 'в', f: 'а', g: 'п', h: 'р', j: 'о', k: 'л', l: 'д', ';': 'ж', "'": 'э',
  z: 'я', x: 'ч', c: 'с', v: 'м', b: 'и', n: 'т', m: 'ь', ',': 'б', '.': 'ю', '/': '.',
}
const RU2EN: Record<string, string> = Object.fromEntries(
  Object.entries(EN2RU).map(([en, ru]) => [ru, en]),
)

export function toRuLayout(s: string): string {
  return [...s.toLowerCase()].map((c) => EN2RU[c] ?? c).join('')
}
export function toEnLayout(s: string): string {
  return [...s.toLowerCase()].map((c) => RU2EN[c] ?? c).join('')
}

// Cyrillic → Latin transliteration, so a Latin query ("manikur") matches a
// Cyrillic name ("маникюр") after the name is transliterated.
const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y',
  ь: '', э: 'e', ю: 'yu', я: 'ya',
}
export function translitLat(s: string): string {
  return [...s.toLowerCase()].map((c) => TRANSLIT[c] ?? c).join('')
}

// Small edit distance for typo tolerance on short tokens ("маникур" → "маникюр").
export function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (Math.abs(m - n) > 2) return 3
  const dp = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j]
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1])
      prev = tmp
    }
  }
  return dp[n]
}
