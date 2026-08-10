import type { SupabaseClient, User } from "@supabase/supabase-js";
import { normalizeBirthTime } from "./chartTime";

export type AuthProvider = "google";

export type AuthAccount = {
  id: string;
  email: string;
  phone?: string;
  name: string;
  provider: string;
  avatarUrl?: string;
};

export type PersistedProfileData = unknown;

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function normalizePersistedProfileBirthTimes(data: PersistedProfileData): PersistedProfileData {
  const root = recordValue(data);
  if (!root) return data;
  const profile = recordValue(root.profile) ?? root;
  if (!Array.isArray(profile.charts)) return data;
  let changed = false;
  const charts = profile.charts.map((entry) => {
    const chart = recordValue(entry);
    if (!chart || typeof chart.birthTime !== "string") return entry;
    const raw = chart.birthTime.trim();
    if (!raw || raw === "Time unknown" || raw === "Birth time needed") return entry;
    const normalized = normalizeBirthTime(raw);
    if (normalized === chart.birthTime) return entry;
    changed = true;
    return { ...chart, birthTime: normalized };
  });
  if (!changed) return data;
  const nextProfile = { ...profile, charts };
  return root.profile ? { ...root, profile: nextProfile } : nextProfile;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || import.meta.env.VITE_SUPABASE_ANON_KEY
) as string | undefined;
const authRedirectUrl = import.meta.env.VITE_AUTH_REDIRECT_URL as string | undefined;

export const isAuthConfigured = Boolean(supabaseUrl && supabasePublishableKey);
export const isPhoneAuthEnabled = (
  isAuthConfigured
  && import.meta.env.VITE_PHONE_AUTH_ENABLED === "true"
);

let supabaseClientPromise: Promise<SupabaseClient | null> | null = null;
let verifiedAuthUserRequest: {
  accessToken: string;
  promise: Promise<User | null>;
} | null = null;

async function normalizeUsPhoneNumber(value: string) {
  const { normalizeUsPhoneNumber: normalizePhone } = await import("./phoneAuthValidation");

  return normalizePhone(value);
}

export async function getSupabaseClient() {
  if (!isAuthConfigured) {
    return null;
  }

  supabaseClientPromise ??= import("@supabase/supabase-js").then(({ createClient }) => (
    createClient(supabaseUrl as string, supabasePublishableKey as string)
  ));

  return supabaseClientPromise;
}

export async function getVerifiedAuthUser(client?: SupabaseClient | null) {
  const supabase = client ?? await getSupabaseClient();

  if (!supabase) {
    return null;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    return null;
  }

  if (verifiedAuthUserRequest?.accessToken !== accessToken) {
    verifiedAuthUserRequest = {
      accessToken,
      promise: supabase.auth.getUser().then(({ data }) => data.user ?? null)
    };
  }

  return verifiedAuthUserRequest.promise;
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
    phone: user.phone || undefined,
    name: typeof metadataName === "string" && metadataName.trim()
      ? metadataName
      : user.email?.split("@")[0] ?? "New stargazer",
    provider,
    avatarUrl: typeof avatarUrl === "string" && avatarUrl.trim() ? avatarUrl : undefined
  };
}

export async function getAuthAccount() {
  const supabase = await getSupabaseClient();

  if (!supabase) {
    return null;
  }

  const user = await getVerifiedAuthUser(supabase);

  if (!user) {
    return null;
  }

  return authAccountFromUser(user);
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

  return data?.data == null ? null : normalizePersistedProfileBirthTimes(data.data);
}

export async function upsertPersistedProfile(userId: string, data: PersistedProfileData) {
  const supabase = await getSupabaseClient();

  if (!supabase) {
    return;
  }

  const normalizedData = normalizePersistedProfileBirthTimes(data);
  const { error } = await supabase
    .from("user_profiles")
    .upsert({
      user_id: userId,
      data: normalizedData,
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

export async function sendPhoneSignInCode(
  phone: string,
  {
    shouldCreateUser = true
  }: {
    shouldCreateUser?: boolean;
  } = {}
) {
  const supabase = await getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase auth is not configured.");
  }

  const normalizedPhone = await normalizeUsPhoneNumber(phone);
  const { error } = await supabase.auth.signInWithOtp({
    phone: normalizedPhone,
    options: {
      shouldCreateUser
    }
  });

  if (error) {
    if (/unsupported phone provider/i.test(error.message)) {
      throw new Error("Phone sign-in is not available right now. Please use Google or email.");
    }

    throw error;
  }

  return normalizedPhone;
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
    phone: await normalizeUsPhoneNumber(phone),
    token: code.trim(),
    type: "sms"
  });

  if (error) {
    throw error;
  }

  return data.user ? authAccountFromUser(data.user) : null;
}

export async function startPhoneNumberChange(phone: string) {
  const supabase = await getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase auth is not configured.");
  }

  const normalizedPhone = await normalizeUsPhoneNumber(phone);
  const { error } = await supabase.auth.updateUser({
    phone: normalizedPhone
  });

  if (error) {
    throw error;
  }

  return normalizedPhone;
}

export async function resendPhoneNumberChangeCode(phone: string) {
  const supabase = await getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase auth is not configured.");
  }

  const normalizedPhone = await normalizeUsPhoneNumber(phone);
  const { error } = await supabase.auth.resend({
    type: "phone_change",
    phone: normalizedPhone
  });

  if (error) {
    throw error;
  }

  return normalizedPhone;
}

export async function verifyPhoneNumberChange({
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

  const normalizedPhone = await normalizeUsPhoneNumber(phone);
  const { data, error } = await supabase.auth.verifyOtp({
    phone: normalizedPhone,
    token: code.trim(),
    type: "phone_change"
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
