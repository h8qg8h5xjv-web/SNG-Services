import { redirect } from '@/i18n/navigation'

export default async function BusinessIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  redirect({ href: '/business/requests', locale })
}
