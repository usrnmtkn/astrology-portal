-- Limit lossless LZ4 to Weekly checkpoint transactions. Existing data is not
-- rewritten. Other transactions retain their existing compression settings.
alter function public.checkpoint_weekly_horoscope(uuid,timestamptz,jsonb)
  set default_toast_compression = 'lz4';
alter function public.checkpoint_weekly_provider_result(uuid,text,text,text,text,jsonb)
  set default_toast_compression = 'lz4';
notify pgrst, 'reload schema';
