// The design palette as literal hex — for the few places that cannot reference the
// CSS tokens at runtime: MapLibre paint props, SVG markers rendered to data URLs,
// and the browser theme-color meta. These mirror --color-blue-* exactly, so the
// whole app stays on blue-950 / blue-800 / white.
export const BLUE_950 = '#172554' // --color-ink / --color-blue-950
export const BLUE_800 = '#1e40af' // --color-accent / --color-blue-800
export const WHITE = '#ffffff'

// v2 «окно» (mirrors the @theme tokens in app/globals.css).
export const DUSK = '#0F1830' // --color-dusk: night surfaces, browser theme colour
export const INK = '#121A2E' // --color-ink
export const LAMP = '#FFB547' // --color-lamp: free slots, primary actions
export const PAPER = '#F3F5F9' // --color-paper
