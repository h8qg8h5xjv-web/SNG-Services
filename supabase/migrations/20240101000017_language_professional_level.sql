-- 20240101000017_language_professional_level.sql
-- DESIGN.md «Проверка языка» → «Уровень»: for legal/health a conversational
-- command of the language is not enough — the talk is about documents and
-- diagnoses. A per-language professional_level flag records that the same check
-- covered professional, not just everyday, fluency. It is a verification fact,
-- so — like status/method — a provider may not set it; only an admin can.

alter table public.provider_languages
  add column professional_level boolean not null default false;

-- Extend the authority trigger to cover professional_level. A logged-in
-- non-admin (a provider member) may neither claim it on insert nor change it on
-- update; admin and server-side writes (auth.uid() is null) pass through.
create or replace function public.enforce_language_verification_authority()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status is distinct from 'claimed'
       or new.verified_by is not null
       or new.verified_at is not null
       or new.method is not null
       or new.expires_at is not null
       or new.professional_level then
      raise exception 'A provider may only claim a language, not verify it'
        using errcode = 'insufficient_privilege';
    end if;
  elsif tg_op = 'UPDATE' then
    if new.status      is distinct from old.status
       or new.verified_by is distinct from old.verified_by
       or new.verified_at is distinct from old.verified_at
       or new.method      is distinct from old.method
       or new.expires_at  is distinct from old.expires_at
       or new.professional_level is distinct from old.professional_level then
      raise exception 'A provider may not change the verification of a language'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  return new;
end;
$$;
