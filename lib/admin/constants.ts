// Constant lists shared by admin server actions and client components. They
// live here, not in the 'use server' action files: such a module may export
// only async functions, so a client component importing an array from it got a
// server-action reference instead of the array (the admin provider page
// crashed on `.map`).

// Real language-verification methods only — 'seed' is reserved for demo data
// written by the seed script and can never be chosen here.
export const VERIFICATION_METHODS = ['call', 'voice_sample', 'video_call'] as const

export const DBS_TYPES = ['basic', 'standard', 'enhanced'] as const
