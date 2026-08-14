-- 20240101000019_nullable_description.sql
-- A place captured from public data (claim_status='unclaimed') often has only a
-- name — we may not have (and must not invent) a description. Make description_en
-- optional, but only for unclaimed cards; a claimed/invited provider still needs
-- the English base description that translations fall back to.

alter table public.providers
  alter column description_en drop not null,
  add constraint chk_description_required check (
    description_en is not null or claim_status = 'unclaimed'
  );
