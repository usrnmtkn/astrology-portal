type StoredSupabaseSession = {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_at?: unknown;
  expires_in?: unknown;
  user?: unknown;
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || import.meta.env.VITE_SUPABASE_ANON_KEY
) as string | undefined;

export function ownerSessionStorageKey(url = supabaseUrl) {
  if (!url) return "";
  try {
    const projectRef = new URL(url).hostname.split(".")[0];
    return projectRef ? `sb-${projectRef}-auth-token` : "";
  } catch {
    return "";
  }
}

function storedSession(): StoredSupabaseSession | null {
  const key = ownerSessionStorageKey();
  if (!key) return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "null") as StoredSupabaseSession | null;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function accessToken(session: StoredSupabaseSession | null) {
  return typeof session?.access_token === "string" ? session.access_token : "";
}

function sessionNeedsRefresh(session: StoredSupabaseSession | null) {
  if (!session) return false;
  const expiresAt = typeof session.expires_at === "number" ? session.expires_at : 0;
  return expiresAt > 0 && expiresAt <= Math.floor(Date.now() / 1000) + 60;
}

async function refreshSession(session: StoredSupabaseSession) {
  const refreshToken = typeof session.refresh_token === "string" ? session.refresh_token : "";
  if (!supabaseUrl || !supabasePublishableKey || !refreshToken) return "";
  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/u, "")}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { apikey: supabasePublishableKey, "content-type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    const payload = await response.json().catch(() => null) as StoredSupabaseSession | null;
    if (!response.ok || !accessToken(payload)) return "";
    const key = ownerSessionStorageKey();
    if (key) window.localStorage.setItem(key, JSON.stringify({ ...session, ...payload }));
    return accessToken(payload);
  } catch {
    return "";
  }
}

export async function loadOwnerSessionAccessToken() {
  const session = storedSession();
  if (!session) return "";
  if (sessionNeedsRefresh(session)) return refreshSession(session);
  return accessToken(session);
}

export function watchOwnerSessionAccessToken(callback: (accessToken: string) => void) {
  const key = ownerSessionStorageKey();
  if (!key) return () => {};
  let cancelled = false;
  const refresh = () => {
    void loadOwnerSessionAccessToken().then((token) => {
      if (!cancelled && token) callback(token);
    });
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === key) refresh();
  };
  window.addEventListener("storage", onStorage);
  const interval = window.setInterval(refresh, 30_000);
  return () => {
    cancelled = true;
    window.clearInterval(interval);
    window.removeEventListener("storage", onStorage);
  };
}
