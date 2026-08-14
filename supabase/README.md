# Migrations

Migrations live in `supabase/migrations/` and are applied in filename order by
the Supabase CLI. Never edit the schema through the Supabase UI — every change is
a new migration file (see `CLAUDE.md`). Timestamp prefixes set the order; the
name after it is the logical step.

| Migration (`…_name.sql`) | Contents |
|---|---|
| `…01_init` | Helper functions: `set_updated_at()`, `is_admin()` |
| `…02_reference` | `categories`, `languages` |
| `…03_providers` | `providers`, `provider_languages`, `provider_translations`, `services` + published-language triggers |
| `…04_scheduling` | `schedules`, `schedule_exceptions` + native-booking-only trigger |
| `…05_bookings` | `bookings` + capacity-overflow / native-only trigger |
| `…06_events` | `events` (afisha) |
| `…07_indexes` | Indexes for the catalog and afisha query patterns |
| `…08_rls` | RLS enabled on every table + read/write policies |
| `…09_storage` | Public `images` bucket + admin-only write policies |
| `…10_booking_capacity_pending` | Capacity guard counts pending + confirmed |
| `…11_provider_events` | Pseudonymous analytics log (no IP/UA) + indexes |
| `…12_slot_participants` | Security-definer function: opted-in group-slot names only |
| `…13_service_role_grants` | Table grants for service_role + default privileges |
| `…14_cabinets_roles` | `provider_members`/`provider_invites`, 4-principal RLS, invite flow |
| `…15_requests` | Request/broadcast model, contact-hiding RLS, atomic accept, stats view |

## Local development (Docker required)

```bash
supabase start            # boots Postgres, Studio, Auth, Storage… (pulls images)
supabase db reset         # drops the local DB and re-applies every migration
npm run seed              # loads demo data (uses .env.local)
```

`supabase start` prints the local **API URL**, **anon key**, **service_role key**
and **Studio URL** — put the first three in `.env.local` (service_role WITHOUT the
`NEXT_PUBLIC_` prefix). Studio (default `http://127.0.0.1:54323`) lets you browse
the tables.

## Applying to a hosted project

```bash
supabase link --project-ref <ref>
supabase db push          # applies pending migrations to the linked project
```

The RLS grants target the Supabase roles `anon` and `authenticated`, which
already exist on any Supabase project.

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
