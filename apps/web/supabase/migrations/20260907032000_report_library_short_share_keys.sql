alter table public.report_share_links
  alter column share_key drop default,
  alter column share_key type text using share_key::text;

alter table public.report_share_links
  drop constraint if exists report_share_links_share_key_format_check;

alter table public.report_share_links
  add constraint report_share_links_share_key_format_check
  check (
    share_key ~ '^[A-Za-z0-9_-]{22}$'
    or share_key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  );

comment on column public.report_share_links.share_key is
  'Server-generated bearer credential. New keys use 128-bit base64url tokens; legacy UUID keys remain valid until revoked.';
