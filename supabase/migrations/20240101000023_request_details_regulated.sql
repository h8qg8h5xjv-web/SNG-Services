-- 20240101000023_request_details_regulated.sql
-- Requests for pros (LEGAL D3a). Adds to the request: photos, urgency, a postcode
-- (outward part broadcast, full part hidden until match like the address), and the
-- regulated-activity question. Adds to the provider the Gas Safe / electrical-scheme
-- credentials, following the SAME claimed-vs-verified model as insurance and DBS:
-- a provider may self-declare, only an admin may verify; we store the number and
-- the fact it was seen, never a scan (LEGAL: fewer personal data, less liability).

-- ---------------------------------------------------------------------------
-- Request: photos (quote only, shown to masters in the broadcast), urgency,
-- outward postcode (broadcast), and the regulated question.
-- ---------------------------------------------------------------------------
alter table public.requests
  add column photos          text[],
  add column urgency         text not null default 'flexible'
                               check (urgency in ('today', 'this_week', 'flexible')),
  -- Outward code only (e.g. "SW1A"). Coarse enough to broadcast for distance; the
  -- full postcode lives in request_contacts and is hidden until match.
  add column postcode_outward text,
  -- LEGAL D3a: does the job touch gas / electrics / other regulated work?
  add column regulated        boolean not null default false,
  add column regulated_kind   text check (regulated_kind in ('gas', 'electrical', 'other')),
  -- regulated_kind is set exactly when regulated is true.
  add constraint chk_regulated_kind check (regulated = (regulated_kind is not null));

-- Full postcode is contact-level: as precise as the address, so hidden until match.
alter table public.request_contacts
  add column postcode text;

-- ---------------------------------------------------------------------------
-- Provider: Gas Safe (gas) and electrical competent-person scheme (Part P).
-- Same shape as insurance/DBS. The "number"/"scheme" is the identifying string;
-- the Gas Safe number is verifiable against the public register (LEGAL D3a).
-- ---------------------------------------------------------------------------
alter table public.providers
  add column gas_safe_number       text,
  add column gas_safe_status       text not null default 'none'
                                     check (gas_safe_status in ('none', 'self_declared', 'verified')),
  add column gas_safe_verified_by  uuid references auth.users(id) on delete set null,
  add column gas_safe_verified_at  timestamptz,
  add column gas_safe_expires_at   date,
  add column gas_safe_note         text,
  add column electrical_scheme       text,
  add column electrical_status       text not null default 'none'
                                       check (electrical_status in ('none', 'self_declared', 'verified')),
  add column electrical_verified_by  uuid references auth.users(id) on delete set null,
  add column electrical_verified_at  timestamptz,
  add column electrical_expires_at   date,
  add column electrical_note         text;

-- Extend the place/pro mutual-exclusion: these regulated credentials are pro-only.
alter table public.providers drop constraint chk_pro_fields_only_for_pro;
alter table public.providers
  add constraint chk_pro_fields_only_for_pro check (
    entity_type <> 'place' or (
      travel_radius_km is null
      and insurance_status = 'none' and insurance_verified_by is null
      and insurance_verified_at is null and insurance_expires_at is null
      and insurance_document_ref is null and insurance_note is null
      and dbs_status = 'none' and dbs_type is null and dbs_verified_by is null
      and dbs_verified_at is null and dbs_expires_at is null
      and dbs_document_ref is null and dbs_note is null
      and gas_safe_number is null and gas_safe_status = 'none'
      and gas_safe_verified_by is null and gas_safe_verified_at is null
      and gas_safe_expires_at is null and gas_safe_note is null
      and electrical_scheme is null and electrical_status = 'none'
      and electrical_verified_by is null and electrical_verified_at is null
      and electrical_expires_at is null and electrical_note is null
    )
  );

-- ---------------------------------------------------------------------------
-- Extend the credential-authority trigger to gas_safe and electrical: a provider
-- may self-declare, only an admin may verify (same rule as insurance/DBS).
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

  -- Gas Safe: verified is admin-only.
  if new.gas_safe_status = 'verified'
     or (tg_op = 'UPDATE' and old.gas_safe_status = 'verified') then
    if tg_op = 'INSERT'
       or new.gas_safe_status      is distinct from old.gas_safe_status
       or new.gas_safe_verified_by is distinct from old.gas_safe_verified_by
       or new.gas_safe_verified_at is distinct from old.gas_safe_verified_at
       or new.gas_safe_expires_at  is distinct from old.gas_safe_expires_at
       or new.gas_safe_number      is distinct from old.gas_safe_number
       or new.gas_safe_note        is distinct from old.gas_safe_note then
      raise exception 'Only an admin may set or change a verified Gas Safe credential'
        using errcode = 'insufficient_privilege';
    end if;
  elsif new.gas_safe_verified_by is not null or new.gas_safe_verified_at is not null then
    raise exception 'A provider may not fill the verified-by fields'
      using errcode = 'insufficient_privilege';
  end if;

  -- Electrical competent-person scheme: verified is admin-only.
  if new.electrical_status = 'verified'
     or (tg_op = 'UPDATE' and old.electrical_status = 'verified') then
    if tg_op = 'INSERT'
       or new.electrical_status      is distinct from old.electrical_status
       or new.electrical_verified_by is distinct from old.electrical_verified_by
       or new.electrical_verified_at is distinct from old.electrical_verified_at
       or new.electrical_expires_at  is distinct from old.electrical_expires_at
       or new.electrical_scheme      is distinct from old.electrical_scheme
       or new.electrical_note        is distinct from old.electrical_note then
      raise exception 'Only an admin may set or change a verified electrical credential'
        using errcode = 'insufficient_privilege';
    end if;
  elsif new.electrical_verified_by is not null or new.electrical_verified_at is not null then
    raise exception 'A provider may not fill the verified-by fields'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;
