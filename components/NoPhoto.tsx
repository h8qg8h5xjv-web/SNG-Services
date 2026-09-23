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

type IconComponent = React.ComponentType<{ className?: string; stroke?: number }>

// §13: no-photo placeholder — one soft blue gradient (palette only) with the
// category icon; variety comes from the icon, not off-palette tints. Used wherever
// a provider has no image (we don't take others' photos for unclaimed cards).
const ICONS: Record<string, IconComponent> = {
  beauty: IconScissors,
  health: IconStethoscope,
  kids: IconMoodKid,
  education: IconSchool,
  home: IconTool,
  moving: IconTruck,
  legal: IconFileText,
  restaurants: IconToolsKitchen2,
  food: IconShoppingBag,
  sport: IconBarbell,
  auto: IconCar,
  celebrations: IconCamera,
  finance: IconWallet,
  pets: IconPaw,
}
const GRAD = 'from-blue-100 to-blue-50'

export default function NoPhoto({
  categorySlug,
  className = '',
  iconClassName = 'h-8 w-8',
}: {
  categorySlug: string
  className?: string
  iconClassName?: string
}) {
  const Icon = ICONS[categorySlug] ?? IconCategory2
  return (
    <div className={`flex items-center justify-center bg-linear-to-br ${GRAD} ${className}`}>
      <Icon className={`text-accent/70 ${iconClassName}`} stroke={1.5} />
    </div>
  )
}
