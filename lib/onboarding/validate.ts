// Server-side checks for business onboarding: a category and a district must
// come from the reference tables (categories, boroughs), never from free text.
// Pure — the caller loads the reference sets (lib/onboarding/reference.ts).

export type References = { categoryIds: Set<string>; boroughs: Set<string> }

export const NO_CATEGORY = '__none__' // the «Моей категории нет» option
export const SUGGESTION_MAX = 200

export type OnboardingError = 'badCategory' | 'needSuggestion' | 'badBorough'

// A card (cabinet, QuickMaster): the category is required from the list.
export function checkCard(input: { categoryId: string; borough: string }, refs: References): OnboardingError | null {
  if (!refs.categoryIds.has(input.categoryId)) return 'badCategory'
  if (!refs.boroughs.has(input.borough)) return 'badBorough'
  return null
}

// A catalogue request (/for-business): a category from the list, or «Моей
// категории нет» with a suggestion — which is stored, never turned into a
// category. Returns the values to store.
export function checkCatalogRequest(
  input: { categoryId: string; suggestion: string | null; borough: string },
  refs: References,
):
  | { ok: true; categoryId: string | null; suggestion: string | null; borough: string }
  | { ok: false; error: OnboardingError } {
  if (!refs.boroughs.has(input.borough)) return { ok: false, error: 'badBorough' }
  if (input.categoryId === NO_CATEGORY) {
    const suggestion = (input.suggestion ?? '').trim().replace(/\s+/g, ' ')
    if (!suggestion || suggestion.length > SUGGESTION_MAX) return { ok: false, error: 'needSuggestion' }
    return { ok: true, categoryId: null, suggestion, borough: input.borough }
  }
  if (!refs.categoryIds.has(input.categoryId)) return { ok: false, error: 'badCategory' }
  return { ok: true, categoryId: input.categoryId, suggestion: null, borough: input.borough }
}
