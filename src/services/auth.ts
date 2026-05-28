import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

export type AuthProvider = "google" | "apple";

export type AuthAccount = {
  id: string;
  email: string;
  name: string;
  provider: string;
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || import.meta.env.VITE_SUPABASE_ANON_KEY
) as string | undefined;
const authRedirectUrl = import.meta.env.VITE_AUTH_REDIRECT_URL as string | undefined;

export const isAuthConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = isAuthConfigured
  ? createClient(supabaseUrl as string, supabasePublishableKey as string)
  : null;

function redirectTo() {
  return authRedirectUrl || window.location.origin;
}

function authAccountFromUser(user: User): AuthAccount {
  const metadata = user.user_metadata ?? {};
  const identities = user.identities ?? [];
  const provider = identities[0]?.provider ?? user.app_metadata.provider ?? "email";
  const metadataName = metadata.full_name ?? metadata.name ?? metadata.user_name;

  return {
    id: user.id,
    email: user.email ?? "",
    name: typeof metadataName === "string" && metadataName.trim() ? metadataName : user.email?.split("@")[0] ?? "New stargazer",
    provider
  };
}

export async function getAuthAccount() {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return authAccountFromUser(data.user);
}

export function onAuthAccountChange(callback: (account: AuthAccount | null) => void) {
  if (!supabase) {
    return () => undefined;
  }

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ? authAccountFromUser(session.user) : null);
  });

  return () => data.subscription.unsubscribe();
}

export async function signInWithProvider(provider: AuthProvider) {
  if (!supabase) {
    throw new Error("Supabase auth is not configured.");
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectTo()
    }
  });

  if (error) {
    throw error;
  }
}

export async function signUpWithEmail({
  email,
  password,
  fullName
}: {
  email: string;
  password: string;
  fullName: string;
}) {
  if (!supabase) {
    throw new Error("Supabase auth is not configured.");
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      },
      emailRedirectTo: redirectTo()
    }
  });

  if (error) {
    throw error;
  }

  return data.user ? authAccountFromUser(data.user) : null;
}

export async function signInWithMagicLink(email: string) {
  if (!supabase) {
    throw new Error("Supabase auth is not configured.");
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo()
    }
  });

  if (error) {
    throw error;
  }
}

export async function signOutAuth() {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}
