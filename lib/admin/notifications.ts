import { createAdminClient } from '@/lib/supabase/admin'

// §5 admin queue reads. Admin-gated by the dashboard layout; service role.

export type QueuedNotification = {
  id: string
  providerName: string | null
  phone: string | null
  emails: string[] | null
  kind: string | null
  requestRef: string | null
  subject: string
  body: string
  ctaPath: string | null
  status: 'unsent' | 'sent'
  createdAt: string
}

export async function listQueuedNotifications(
  status: 'unsent' | 'sent' = 'unsent',
): Promise<QueuedNotification[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('notification_queue')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(200)
  return (data ?? []).map((n) => ({
    id: n.id,
    providerName: n.provider_name,
    phone: n.recipient_phone,
    emails: n.recipient_emails,
    kind: n.kind,
    requestRef: n.request_ref,
    subject: n.subject,
    body: n.body,
    ctaPath: n.cta_path,
    status: n.status,
    createdAt: n.created_at,
  }))
}

export async function getUnsentNotificationCount(): Promise<number> {
  const supabase = createAdminClient()
  const { count } = await supabase
    .from('notification_queue')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'unsent')
  return count ?? 0
}
