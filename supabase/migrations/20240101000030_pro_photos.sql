-- 20240101000030_pro_photos.sql
-- §2 master cabinet: a master (a pro, not only a place) can add up to 6 photos to
-- their card. The original constraint forbade venue_photos on a pro; relax it so
-- photos are allowed for both, while opening_hours stays place-only.
alter table public.providers drop constraint if exists chk_place_fields_only_for_place;
alter table public.providers
  add constraint chk_place_fields_only_for_place check (
    entity_type <> 'pro' or opening_hours is null
  );
