import {
  IconScissors,
  IconStethoscope,
  IconMoodKid,
  IconSchool,
  IconTool,
  IconTruck,
  IconFileText,
  IconToolsKitchen2,
  IconShoppingBag,
  IconBarbell,
  IconCar,
  IconCamera,
  IconWallet,
  IconPaw,
  IconCategory2,
} from '@tabler/icons-react'

type Entry = { grad: string; Icon: React.ComponentType<{ className?: string; stroke?: number }> }

// §13: no-photo placeholder — a soft accent gradient with the category icon, a
// distinct tint per category (palette classes only, no arbitrary values). Used
// everywhere a provider has no image (we don't take others' photos for unclaimed
// cards).
const MAP: Record<string, Entry> = {
  beauty: { grad: 'from-rose-100 to-rose-50', Icon: IconScissors },
  health: { grad: 'from-emerald-100 to-emerald-50', Icon: IconStethoscope },
  kids: { grad: 'from-amber-100 to-amber-50', Icon: IconMoodKid },
  education: { grad: 'from-sky-100 to-sky-50', Icon: IconSchool },
  home: { grad: 'from-orange-100 to-orange-50', Icon: IconTool },
  moving: { grad: 'from-lime-100 to-lime-50', Icon: IconTruck },
  legal: { grad: 'from-slate-200 to-slate-50', Icon: IconFileText },
  restaurants: { grad: 'from-red-100 to-red-50', Icon: IconToolsKitchen2 },
  food: { grad: 'from-yellow-100 to-yellow-50', Icon: IconShoppingBag },
  sport: { grad: 'from-teal-100 to-teal-50', Icon: IconBarbell },
  auto: { grad: 'from-zinc-200 to-zinc-50', Icon: IconCar },
  celebrations: { grad: 'from-fuchsia-100 to-fuchsia-50', Icon: IconCamera },
  finance: { grad: 'from-cyan-100 to-cyan-50', Icon: IconWallet },
  pets: { grad: 'from-violet-100 to-violet-50', Icon: IconPaw },
}
const FALLBACK: Entry = { grad: 'from-blue-100 to-blue-50', Icon: IconCategory2 }

export default function NoPhoto({
  categorySlug,
  className = '',
  iconClassName = 'h-8 w-8',
}: {
  categorySlug: string
  className?: string
  iconClassName?: string
}) {
  const { grad, Icon } = MAP[categorySlug] ?? FALLBACK
  return (
    <div className={`flex items-center justify-center bg-linear-to-br ${grad} ${className}`}>
      <Icon className={`text-slate-500/70 ${iconClassName}`} stroke={1.5} />
    </div>
  )
}
