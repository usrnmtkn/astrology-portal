-- The profile trigger runs as the signed-in caller. Its pure text-normalization
-- helper needs EXECUTE for that role too; ownership remains enforced by the
-- existing user_profiles RLS policies. Keep anonymous access revoked and keep
-- both functions SECURITY INVOKER. No profile rows or other grants are changed.
grant execute on function public.canonical_birth_time_text(text) to authenticated;
