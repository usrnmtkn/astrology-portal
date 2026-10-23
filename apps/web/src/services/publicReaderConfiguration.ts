/** This small bootstrap check never loads the authentication SDK. */
export const publicReaderConfigurationPresent = !!(import.meta.env
  && import.meta.env.VITE_SUPABASE_URL
  && (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY));
