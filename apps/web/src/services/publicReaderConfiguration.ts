/** This small bootstrap check never loads the authentication SDK. */
export function publicReaderConfigurationPresent() {
  if (!import.meta.env) return false;
  return !!(import.meta.env.VITE_SUPABASE_URL
    && (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY));
}
