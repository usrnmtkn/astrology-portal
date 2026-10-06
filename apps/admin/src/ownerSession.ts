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
      signal: AbortSignal.timeout(8_000),
      headers: { apikey: supabasePublishableKey, "content-type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    const payload = await response.json().catch(() => null) as StoredSupabaseSession | null;
    if (response.status === 429 || response.status >= 500) throw new Error('Refresh unavailable');
    if (!response.ok) return "";
    if (!accessToken(payload)) throw new Error('Invalid refresh response');
    const key = ownerSessionStorageKey();
    // A refresh must not resurrect a signed-out session or overwrite a newer
    // sign-in/refresh that completed in another tab while this request waited.
    const current = storedSession();
    if (accessToken(current) !== accessToken(session) || current?.refresh_token !== session.refresh_token) return accessToken(current);
    const expiresAt = typeof payload?.expires_at === "number" ? payload.expires_at
      : typeof payload?.expires_in === "number" ? Math.floor(Date.now() / 1000) + payload.expires_in : undefined;
    if (!expiresAt) throw new Error('Missing refresh expiry');
    if (key) window.localStorage.setItem(key, JSON.stringify({ ...session, ...payload, expires_at: expiresAt }));
    return accessToken(payload);
  } catch {
    throw Object.assign(new Error('Content Studio could not renew your sign-in yet. Your saved readings are kept. Check saved progress when the connection returns.'), {status: 503});
  }
}

let pendingRefresh: Promise<string> | null = null;
export async function loadOwnerSessionAccessToken(rejectedToken?: string, reportUnavailable = false) {
  const read = async () => {
    const session = storedSession();
    if (!session) return "";
    if (sessionNeedsRefresh(session) || rejectedToken && accessToken(session) === rejectedToken) return refreshSession(session);
    return accessToken(session);
  };
  const session = storedSession();
  if (!sessionNeedsRefresh(session) && (!rejectedToken || accessToken(session) !== rejectedToken)) return accessToken(session);
  // Share renewal within the tab and use the Supabase client's lock name across
  // tabs. Re-read inside the lock so a rotated refresh token is never reused.
  if (!pendingRefresh) {
    const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
    pendingRefresh = (async () => locks ? await locks.request(`lock:${ownerSessionStorageKey()}`, {signal: AbortSignal.timeout(10_000)}, read) : await read())()
      .finally(() => { pendingRefresh = null; });
  }
  try { return await pendingRefresh; }
  catch (reason) {
    if (reportUnavailable) throw Object.assign(new Error('Content Studio could not renew your sign-in yet. Your saved readings are kept. Check saved progress when the connection returns.'), {status: 503});
    return "";
  }
}

// Identity affinity only; the server still verifies every token and permission.
export function ownerCredentialIdentity(credential: string) {
  try {
    const part = credential.split('.')[1];
    const payload = JSON.parse(atob(part.replace(/-/gu, '+').replace(/_/gu, '/')));
    return typeof payload.sub === 'string' && payload.sub ? `session:${payload.sub}` : credential;
  } catch { return credential; }
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
