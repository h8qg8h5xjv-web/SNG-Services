-- 20240101000016_language_verification.sql
-- DESIGN.md «Проверка языка»: a provider CLAIMS a service language; an admin
-- VERIFIES it. Publication now requires at least one verified (non-expired)
-- language, not merely a claimed one. A provider can add/remove their own
-- claims but can never set the verification fields — that authority is the
-- admin's (or the server's), enforced by a trigger, not by front-end code.
--
-- Grace for launch (agreed variant): the constraint is live from day one, but
-- the 21 seeded providers are marked status='verified' with method='seed' and
-- an honest note, so the catalogue does not empty out. method='seed' makes real
-- vs seed verifications distinguishable in a single query — see README (the
-- seed data must be deleted before a real launch).

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------
alter table public.provider_languages
  add column status      text not null default 'claimed'
                           check (status in ('claimed', 'verified', 'rejected')),
  add column verified_by uuid references auth.users(id) on delete set null,
  add column verified_at timestamptz,
  add column method      text
                           check (method in ('seed', 'call', 'voice_sample', 'video_call')),
  add column expires_at  timestamptz,
  add column note        text;

-- Existing rows are all seed/demo data. Mark them verified but honestly
-- attributed to the seed, never as a real check (verified_by stays null).
update public.provider_languages
   set status = 'verified',
       method = 'seed',
       verified_at = now(),
       note = 'demo data, not actually verified';

-- ---------------------------------------------------------------------------
-- Verification authority: a provider can claim, not verify.
-- The only writers of provider_languages are admin, provider_members (a logged
-- in user, so auth.uid() is set), and the service_role/migrations (auth.uid()
-- is null). We block exactly the middle group from touching the verification
-- columns; admin and server-side writes pass through.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_language_verification_authority()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only a non-admin, logged-in caller (i.e. a provider member) is restricted.
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status is distinct from 'claimed'
       or new.verified_by is not null
       or new.verified_at is not null
       or new.method is not null
       or new.expires_at is not null then
      raise exception 'A provider may only claim a language, not verify it'
        using errcode = 'insufficient_privilege';
    end if;
  elsif tg_op = 'UPDATE' then
    if new.status      is distinct from old.status
       or new.verified_by is distinct from old.verified_by
       or new.verified_at is distinct from old.verified_at
       or new.method      is distinct from old.method
       or new.expires_at  is distinct from old.expires_at then
      raise exception 'A provider may not change the verification of a language'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_provider_languages_verification_authority
  before insert or update on public.provider_languages
  for each row execute function public.enforce_language_verification_authority();

-- ---------------------------------------------------------------------------
-- Publication rule: a published provider needs a verified, non-expired language.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_published_has_language()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'published'
     and not exists (
       select 1 from public.provider_languages pl
       where pl.provider_id = new.id
         and pl.status = 'verified'
         and (pl.expires_at is null or pl.expires_at > now())
     ) then
    raise exception 'Published provider % must have at least one verified service language', new.id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- The other direction: don't let the last verified language of a published
-- provider be removed or downgraded (delete, or update that clears 'verified').
create or replace function public.prevent_last_language_removal()
returns trigger
language plpgsql
as $$
declare
  v_status text;
  v_other integer;
  v_old_active boolean;
  v_new_active boolean;
begin
  v_old_active := old.status = 'verified'
                  and (old.expires_at is null or old.expires_at > now());

  if tg_op = 'UPDATE' then
    v_new_active := new.status = 'verified'
                    and (new.expires_at is null or new.expires_at > now());
    -- Only a transition that loses an active verification can strand a provider.
    if not v_old_active or v_new_active then
      return new;
    end if;
  else -- DELETE
    if not v_old_active then
      return old;
    end if;
  end if;

  select status into v_status from public.providers where id = old.provider_id;
  if v_status = 'published' then
    select count(*) into v_other
    from public.provider_languages
    where provider_id = old.provider_id
      and language_code <> old.language_code
      and status = 'verified'
      and (expires_at is null or expires_at > now());
    if v_other = 0 then
      raise exception 'Cannot remove the last verified language of published provider %', old.provider_id
        using errcode = 'check_violation';
    end if;
  end if;

  if tg_op = 'UPDATE' then return new; else return old; end if;
end;
$$;

-- Speeds up the publish predicate and the "seed verifications" admin filter.
create index idx_provider_languages_verified
  on public.provider_languages (provider_id)
  where status = 'verified';
create index idx_provider_languages_method on public.provider_languages (method);
