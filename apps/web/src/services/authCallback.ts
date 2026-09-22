import { getSupabaseClient } from "./auth";
import { rememberReaderReturnPath } from "./readerAuthReturn";

function restartSignIn() {
  const returnPath = rememberReaderReturnPath();
  const url = new URL("/?auth=login", window.location.origin);
  if (returnPath) url.searchParams.set("readerReturn", returnPath);
  // Do not replay an expired/cancelled callback when the user retries.
  window.location.replace(url.href);
}

// Loaded only on a sign-in return, before the app can replace its callback URL.
export async function completeAuthCallback() {
  const callback = new URLSearchParams(window.location.hash.slice(1));
  if (callback.has("error") || callback.has("error_code")) {
    restartSignIn();
    return;
  }
  const supabase = await getSupabaseClient();
  if (!supabase) throw new Error("Supabase auth is not configured.");
  // initialize is single-flight and also returns callback validation errors.
  // getSession alone would hide those errors as an absent session.
  const { error } = await supabase.auth.initialize();
  if (error) {
    if (("status" in error && typeof error.status === "number" && error.status >= 400 && error.status < 500)
      || error.name === "AuthImplicitGrantRedirectError" || error.name === "AuthPKCEGrantCodeExchangeError") {
      restartSignIn();
      return;
    }
    throw error;
  }
  const { data, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!data.session) throw new Error("Sign-in did not establish a session.");
}
