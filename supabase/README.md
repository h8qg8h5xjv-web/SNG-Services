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
| `…16_language_verification` | `provider_languages` verification (claimed/verified/rejected), publish rule needs a verified language, admin-only verification |
| `…17_language_professional_level` | Per-language `professional_level` flag (legal/health), admin-only |
| `…18_entity_type` | `place`\|`pro` axis, `claim_status`, `booking_enabled`, place/pro fields, insurance + DBS credentials (admin-verified) |
| `…19_nullable_description` | `description_en` optional for `claim_status='unclaimed'` (public-data places) |
| `…20_booking_price_snapshot` | `bookings.price_pence`/`duration_min` snapshotted at creation, immutable after |

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

## Before a real launch: delete the demo data

The seed marks every provider's language as `status = 'verified'` with
`method = 'seed'` and `note = 'demo data, not actually verified'`. This is what
lets the 21 demo providers stay published under the "published needs a verified
language" rule without pretending a real check happened. **These are not real
verifications.** Before onboarding real providers, delete the demo rows (or at
least reset their languages to `claimed`). Find everything still relying on a
seed verification:

```sql
select p.slug, pl.language_code
from public.provider_languages pl
join public.providers p on p.id = pl.provider_id
where pl.method = 'seed';
```

The admin panel exposes the same view under **Providers → «Подтверждения из
сида»**. Real checks always have `method in ('call','voice_sample','video_call')`
and a non-null `verified_by`.

## Notes

- **Language verification.** A provider may *claim* a language (insert a
  `provider_languages` row, which defaults to `status = 'claimed'`); only an
  admin may set it to `verified`/`rejected`. This is enforced by
  `enforce_language_verification_authority()` (a trigger), which blocks any
  logged-in non-admin from writing the verification columns. Publication
  requires at least one `verified`, non-expired language.
- **place vs pro.** `entity_type` is a second axis, independent of
  `fulfillment_type`. Place-only fields (`opening_hours`, `venue_photos`) and
  pro-only fields (`travel_radius_km`, insurance, DBS) are mutually exclusive by
  CHECK constraint. Insurance and DBS follow the language model — a provider may
  self-declare, only an admin may verify; a verified credential that has passed
  its `expires_at` reads as `self_declared` (computed, no job). **Document scans
  are never stored** — only the status, an expiry, and a document number.
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
