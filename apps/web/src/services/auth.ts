import type { SupabaseClient, User } from "@supabase/supabase-js";

export type AuthProvider = "google";

export type AuthAccount = {
  id: string;
  email: string;
  name: string;
  provider: string;
  avatarUrl?: string;
};

export type PersistedProfileData = unknown;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || import.meta.env.VITE_SUPABASE_ANON_KEY
) as string | undefined;
const authRedirectUrl = import.meta.env.VITE_AUTH_REDIRECT_URL as string | undefined;

export const isAuthConfigured = Boolean(supabaseUrl && supabasePublishableKey);

let supabaseClientPromise: Promise<SupabaseClient | null> | null = null;

export async function getSupabaseClient() {
  if (!isAuthConfigured) {
    return null;
  }

  supabaseClientPromise ??= import("@supabase/supabase-js").then(({ createClient }) => (
    createClient(supabaseUrl as string, supabasePublishableKey as string)
  ));

  return supabaseClientPromise;
}

function redirectTo() {
  return authRedirectUrl || window.location.origin;
}

function authAccountFromUser(user: User): AuthAccount {
  const metadata = user.user_metadata ?? {};
  const identities = user.identities ?? [];
  const provider = identities[0]?.provider ?? user.app_metadata.provider ?? "email";
  const metadataName = metadata.full_name ?? metadata.name ?? metadata.user_name;
  const avatarUrl = metadata.avatar_url ?? metadata.picture;

  return {
    id: user.id,
    email: user.email ?? "",
    name: typeof metadataName === "string" && metadataName.trim()
      ? metadataName
      : user.email?.split("@")[0] ?? user.phone ?? "New stargazer",
    provider,
    avatarUrl: typeof avatarUrl === "string" && avatarUrl.trim() ? avatarUrl : undefined
  };
}

export async function getAuthAccount() {
  const supabase = await getSupabaseClient();

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
  let unsubscribe: (() => void) | null = null;
  let cancelled = false;

  void getSupabaseClient().then((supabase) => {
    if (!supabase || cancelled) {
      return;
    }

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ? authAccountFromUser(session.user) : null);
    });
    unsubscribe = () => data.subscription.unsubscribe();

    if (cancelled) {
      unsubscribe();
    }
  });

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

export async function loadPersistedProfile(userId: string): Promise<PersistedProfileData | null> {
  const supabase = await getSupabaseClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.data ?? null;
}

export async function upsertPersistedProfile(userId: string, data: PersistedProfileData) {
  const supabase = await getSupabaseClient();

  if (!supabase) {
    return;
  }

  const { error } = await supabase
    .from("user_profiles")
    .upsert({
      user_id: userId,
      data,
      updated_at: new Date().toISOString()
    });

  if (error) {
    throw error;
  }
}

export async function signInWithProvider(provider: AuthProvider) {
  const supabase = await getSupabaseClient();

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
  const supabase = await getSupabaseClient();

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

export async function signInWithEmail({
  email,
  password
}: {
  email: string;
  password: string;
}) {
  const supabase = await getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase auth is not configured.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw error;
  }

  return data.user ? authAccountFromUser(data.user) : null;
}

export async function sendPhoneSignInCode(phone: string) {
  const supabase = await getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase auth is not configured.");
  }

  const { error } = await supabase.auth.signInWithOtp({
    phone: phone.trim()
  });

  if (error) {
    throw error;
  }
}

export async function verifyPhoneSignInCode({
  phone,
  code
}: {
  phone: string;
  code: string;
}) {
  const supabase = await getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase auth is not configured.");
  }

  const { data, error } = await supabase.auth.verifyOtp({
    phone: phone.trim(),
    token: code.trim(),
    type: "sms"
  });

  if (error) {
    throw error;
  }

  return data.user ? authAccountFromUser(data.user) : null;
}

export async function signOutAuth() {
  const supabase = await getSupabaseClient();

  if (!supabase) {
    return;
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function deleteOwnAccount() {
  const supabase = await getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase auth is not configured.");
  }

  const { data, error } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  if (error || !accessToken) {
    throw new Error("Sign in again before deleting your account.");
  }

  const response = await fetch("/api/account", {
    method: "DELETE",
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });
  const payload = await response.json().catch(() => null) as { error?: unknown } | null;

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === "string"
        ? payload.error
        : "Your account could not be deleted. Please try again."
    );
  }

  await supabase.auth.signOut({ scope: "local" });
}
