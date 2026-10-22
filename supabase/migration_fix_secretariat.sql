-- ============================================================================
-- Migration: Fix Secretariat USG name to Zain Firas and ensure reliable image URLs
-- Ensures public.secretariat table has Zain Firas as Under-Secretary-General and verified image paths
-- ============================================================================

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'secretariat') then
    -- Update Under-Secretary-General name from Fahad to Zain Firas and set canonical image
    update public.secretariat
    set name = 'Zain Firas',
        image_url = '/zain-firas.jpg'
    where (role ilike '%under-secretary%' or sort_order = 3 or name = 'Fahad')
      and role not ilike '%deputy%';

    -- Ensure Senior Advisor / Muaz El Amir has verified reliable image path
    update public.secretariat
    set image_url = '/muaz.jpg'
    where (role ilike '%advisor%' or sort_order = 4 or name ilike '%muaz%')
      and (image_url is null or image_url = '' or image_url ilike '%i.ibb.co%');

    -- Ensure Secretary-General and Deputy Secretary-General have reliable local images if missing
    update public.secretariat
    set image_url = '/rakan-almerbad.jpg'
    where (role = 'Secretary-General' or sort_order = 1)
      and (image_url is null or image_url = '');

    update public.secretariat
    set image_url = '/yousef.jpg'
    where (role = 'Deputy Secretary-General' or sort_order = 2)
      and (image_url is null or image_url = '');
  end if;
end $$;
