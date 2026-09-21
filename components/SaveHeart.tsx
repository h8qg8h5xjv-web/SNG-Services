import { IconHeart } from '@tabler/icons-react'

// The "save" heart on photos (DESIGN task §4/§7). Visual only — saving is NOT
// implemented, and this never intercepts the card link (pointer-events-none),
// so a tap falls through to the card / does nothing. `big` is the master-page
// size that sits beside the back button.
export default function SaveHeart({ big = false }: { big?: boolean }) {
  const box = big ? 'h-10 w-10' : 'h-8 w-8'
  const icon = big ? 'h-6 w-6' : 'h-5 w-5'
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute right-2 top-2 flex ${box} items-center justify-center rounded-full bg-white text-slate-900`}
    >
      <IconHeart className={icon} stroke={2} />
    </span>
  )
}
