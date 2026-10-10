-- Production Weekly reservations were rolled back by authenticator's 8s
-- statement_timeout before a provider could be called. Complete inline history,
-- generated listing facts and the private version trigger make these writes
-- larger than ordinary Studio edits. PostgREST reads function settings before
-- executing RPCs. Keep this exemption below the API's 30s storage deadline;
-- do not change role/database limits or bypass version capture and CAS.
alter function public.checkpoint_weekly_horoscope(uuid,timestamptz,jsonb)
  set statement_timeout = '25s';
alter function public.checkpoint_weekly_provider_result(uuid,text,text,text,text,jsonb)
  set statement_timeout = '25s';
notify pgrst, 'reload schema';
