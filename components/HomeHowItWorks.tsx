import { getTranslations } from 'next-intl/server'
import { IconPencil, IconClock, IconCalendarCheck } from '@tabler/icons-react'
import { SectionHeading } from '@/components/ui/Section'

// Home explainer (idea #2): three short steps with icons. Icons from the set,
// accent-soft square like InfoBlock (DESIGN-SYSTEM §5).
export default async function HomeHowItWorks() {
  const t = await getTranslations('home.how')
  const steps = [
    { icon: IconPencil, label: t('step1') },
    { icon: IconClock, label: t('step2') },
    { icon: IconCalendarCheck, label: t('step3') },
  ]

  return (
    <section className="py-6">
      <SectionHeading>{t('title')}</SectionHeading>
      {/* §3: one card holding the three steps. */}
      <ol className="grid grid-cols-1 gap-4 rounded-card border border-slate-200 bg-white p-4 sm:grid-cols-3">
        {steps.map((s, i) => (
          <li key={i} className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <s.icon className="h-6 w-6" stroke={1.5} />
            </span>
            <span className="text-body font-semibold">{s.label}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
