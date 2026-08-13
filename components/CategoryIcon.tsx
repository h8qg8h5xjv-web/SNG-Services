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

// Maps the Tabler icon name stored on each category to its component.
const ICONS: Record<string, IconComponent> = {
  scissors: IconScissors,
  stethoscope: IconStethoscope,
  'mood-kid': IconMoodKid,
  school: IconSchool,
  tool: IconTool,
  truck: IconTruck,
  'file-text': IconFileText,
  'tools-kitchen-2': IconToolsKitchen2,
  'shopping-bag': IconShoppingBag,
  barbell: IconBarbell,
  car: IconCar,
  camera: IconCamera,
  wallet: IconWallet,
  paw: IconPaw,
}

export default function CategoryIcon({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  const Icon = ICONS[name] ?? IconCategory2
  return <Icon className={className} stroke={1.5} />
}
