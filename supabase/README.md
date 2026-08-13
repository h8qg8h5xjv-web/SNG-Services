# Migrations

Numbered SQL migrations, applied in order. Never edit the schema through the
Supabase UI — every change is a new numbered file here (see `CLAUDE.md`).

| File | Contents |
|---|---|
| `0001_init.sql` | Helper functions: `set_updated_at()`, `is_admin()` |
| `0002_reference.sql` | `categories`, `languages` |
| `0003_providers.sql` | `providers`, `provider_languages`, `provider_translations`, `services` + published-language triggers |
| `0004_scheduling.sql` | `schedules`, `schedule_exceptions` + native-booking-only trigger |
| `0005_bookings.sql` | `bookings` + capacity-overflow / native-only trigger |
| `0006_events.sql` | `events` (afisha) |
| `0007_indexes.sql` | Indexes for the catalog and afisha query patterns |
| `0008_rls.sql` | RLS enabled on every table + read/write policies |
| `0009_storage.sql` | Public `images` bucket + admin-only write policies |
| `0010_booking_capacity_pending.sql` | Capacity guard counts pending + confirmed |
| `0011_provider_events.sql` | Pseudonymous analytics log (no IP/UA) + indexes |
| `0012_slot_participants.sql` | Security-definer function: opted-in group-slot names only |

## Applying

With the Supabase CLI (recommended):

```bash
supabase db push          # applies pending migrations to the linked project
```

Or against any Postgres 13+ connection, in order:

```bash
for f in supabase/0*.sql; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"; done
```

The RLS grants target the Supabase roles `anon` and `authenticated`; those roles
already exist on a Supabase project.

## Notes

- **Roles.** `service_role` (used by the seed script and privileged server code)
  bypasses RLS. Anonymous users only ever read published content; all writes are
  admin-only. An admin is an authenticated user whose JWT carries
  `app_metadata.is_admin = true`.
- **Slot overflow** is enforced in `enforce_booking_rules()`: it locks the
  service row (`SELECT ... FOR UPDATE`) to serialize concurrent bookings, then
  rejects any `confirmed` booking whose `party_size`, summed with other confirmed
  bookings overlapping the slot, would exceed the service `capacity`.
- **Types.** Regenerate `types/database.ts` after a schema change with
  `supabase gen types typescript --local > types/database.ts`.
- **Admin access.** The admin panel (`/admin`) and all writes require an
  authenticated user whose JWT carries `app_metadata.is_admin = true`. Grant it
  once per admin account:
  ```sql
  update auth.users
     set raw_app_meta_data = raw_app_meta_data || '{"is_admin": true}'
   where email = 'you@example.com';
  ```
  Enable the Email provider (magic link) in Supabase Auth, and add
  `.../admin/auth/confirm` to the allowed redirect URLs.
