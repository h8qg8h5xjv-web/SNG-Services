-- 20240101000018_entity_type.sql
-- DESIGN.md §2в: the second axis. fulfillment_type says HOW a deal is made;
-- entity_type says WHAT the thing is — a place you go to, or a pro you call.
-- Plus the fields that only one side needs, and the credentials (insurance,
-- DBS) that follow the same claimed-vs-verified model as language: a provider
-- may self-declare, only an admin may verify. Scans are never stored — just the
-- fact that it was seen and the document number (LEGAL: fewer personal data,
-- less liability).

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------
alter table public.providers
  -- Axis + general
  add column entity_type     text,               -- set below, then made NOT NULL
  add column claim_status    text not null default 'unclaimed'
                               check (claim_status in ('unclaimed', 'claimed', 'invited')),
  add column booking_enabled boolean not null default true,
  -- place-only
  add column opening_hours   jsonb,
  add column venue_photos    text[],
  -- pro-only
  add column travel_radius_km integer check (travel_radius_km >= 0),
  -- pro-only: public liability insurance (LEGAL D3)
  add column insurance_status       text not null default 'none'
                                       check (insurance_status in ('none', 'self_declared', 'verified')),
  add column insurance_verified_by   uuid references auth.users(id) on delete set null,
  add column insurance_verified_at   timestamptz,
  add column insurance_expires_at    date,
  add column insurance_document_ref  text,
  add column insurance_note          text,
  -- pro-only: DBS for work with children (LEGAL D1)
  add column dbs_status       text not null default 'none'
                                check (dbs_status in ('none', 'self_declared', 'verified')),
  add column dbs_type         text check (dbs_type in ('basic', 'standard', 'enhanced')),
  add column dbs_verified_by   uuid references auth.users(id) on delete set null,
  add column dbs_verified_at   timestamptz,
  add column dbs_expires_at    date,
  add column dbs_document_ref  text,
  add column dbs_note          text;

-- Backfill the 21 published + 2 draft demo rows so NOT NULL holds and nobody is
-- unpublished (entity_type does not gate publication). A meaningful per-provider
-- classification lives in seed-data.json and lands on the next seed run; this is
-- only the safe floor. Existing rows are "ours", so claim_status = 'claimed'
-- (the column default 'unclaimed' is for future cards entered from public data).
update public.providers
   set entity_type = coalesce(entity_type, 'place'),
       claim_status = 'claimed';
alter table public.providers
  alter column entity_type set not null,
  add constraint chk_entity_type check (entity_type in ('place', 'pro'));

-- ---------------------------------------------------------------------------
-- Mutual exclusion: place fields only on a place, pro fields only on a pro.
-- ---------------------------------------------------------------------------
alter table public.providers
  add constraint chk_place_fields_only_for_place check (
    entity_type <> 'pro' or (opening_hours is null and venue_photos is null)
  ),
  add constraint chk_pro_fields_only_for_pro check (
    entity_type <> 'place' or (
      travel_radius_km is null
      and insurance_status = 'none' and insurance_verified_by is null
      and insurance_verified_at is null and insurance_expires_at is null
      and insurance_document_ref is null and insurance_note is null
      and dbs_status = 'none' and dbs_type is null and dbs_verified_by is null
      and dbs_verified_at is null and dbs_expires_at is null
      and dbs_document_ref is null and dbs_note is null
    )
  );

-- ---------------------------------------------------------------------------
-- Verification authority: a provider may self-declare a credential but never
-- verify it — verified is admin-only, exactly like language. A logged-in
-- non-admin (a provider member) is the only restricted writer; admin and
-- server-side writes (auth.uid() is null) pass through.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_provider_credential_authority()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  -- Insurance: once it is (or becomes) verified, every field is admin-only.
  if new.insurance_status = 'verified'
     or (tg_op = 'UPDATE' and old.insurance_status = 'verified') then
    if tg_op = 'INSERT'
       or new.insurance_status      is distinct from old.insurance_status
       or new.insurance_verified_by is distinct from old.insurance_verified_by
       or new.insurance_verified_at is distinct from old.insurance_verified_at
       or new.insurance_expires_at  is distinct from old.insurance_expires_at
       or new.insurance_document_ref is distinct from old.insurance_document_ref
       or new.insurance_note        is distinct from old.insurance_note then
      raise exception 'Only an admin may set or change a verified insurance credential'
        using errcode = 'insufficient_privilege';
    end if;
  elsif new.insurance_verified_by is not null or new.insurance_verified_at is not null then
    raise exception 'A provider may not fill the verified-by fields'
      using errcode = 'insufficient_privilege';
  end if;

  -- DBS: same rule.
  if new.dbs_status = 'verified'
     or (tg_op = 'UPDATE' and old.dbs_status = 'verified') then
    if tg_op = 'INSERT'
       or new.dbs_status      is distinct from old.dbs_status
       or new.dbs_verified_by is distinct from old.dbs_verified_by
       or new.dbs_verified_at is distinct from old.dbs_verified_at
       or new.dbs_expires_at  is distinct from old.dbs_expires_at
       or new.dbs_document_ref is distinct from old.dbs_document_ref
       or new.dbs_note        is distinct from old.dbs_note
       or new.dbs_type        is distinct from old.dbs_type then
      raise exception 'Only an admin may set or change a verified DBS credential'
        using errcode = 'insufficient_privilege';
    end if;
  elsif new.dbs_verified_by is not null or new.dbs_verified_at is not null then
    raise exception 'A provider may not fill the verified-by fields'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

create trigger trg_providers_credential_authority
  before insert or update on public.providers
  for each row execute function public.enforce_provider_credential_authority();

-- Claiming a card via invite marks it claimed (it now has a real owner).
create or replace function public.accept_provider_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  select provider_id into v_provider
  from public.provider_invites
  where token = p_token and used_at is null and expires_at > now()
  for update;
  if v_provider is null then
    raise exception 'Invalid or expired invite';
  end if;
  insert into public.provider_members (provider_id, user_id, role)
  values (v_provider, v_uid, 'owner')
  on conflict (provider_id, user_id) do nothing;
  update public.provider_invites set used_at = now() where token = p_token;
  update public.providers set claim_status = 'claimed' where id = v_provider;
  return v_provider;
end;
$$;

create index idx_providers_entity_type on public.providers (entity_type);
