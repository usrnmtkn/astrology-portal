-- Facts-window claims are a worker-only operation. SECURITY DEFINER bypasses
-- the claims table's RLS, so table policies alone cannot protect this RPC.
revoke execute on function public.claim_report_facts_window(text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.claim_report_facts_window(text, uuid, text)
  to service_role;
