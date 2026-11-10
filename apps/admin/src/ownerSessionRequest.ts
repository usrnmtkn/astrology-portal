import {adminCredentialHeaders} from './adminSecret';
import {loadOwnerSessionAccessToken, ownerCredentialIdentity} from './ownerSession';

export const ownerSignInMessage = 'Content Studio could not verify your sign-in. Your saved readings are kept. Sign in with the owner account, then check saved progress.';
function failRequest(status: number, message = ownerSignInMessage): never {
  throw Object.assign(new Error(message), {status});
}
export async function fetchWithOwnerSession(url: string, credential: string, init: RequestInit, throwOnUnauthorized = true) {
  const session = Boolean(adminCredentialHeaders(credential)['x-content-admin-session']);
  const currentCredential = async (rejectedToken?: string) => {
    if (!session) return credential;
    const current = await loadOwnerSessionAccessToken(rejectedToken, true);
    if (!current || ownerCredentialIdentity(current) !== ownerCredentialIdentity(credential)) {
      failRequest(401);
    }
    return current;
  };
  const send = (token: string) => {
    init.signal?.throwIfAborted();
    return fetch(url, {...init, headers: {...init.headers, ...adminCredentialHeaders(token)}});
  };
  const token = await currentCredential();
  let response = await send(token);
  // Only this server-auth refusal proves the handler did not start. Never
  // replay a timeout, lost response, provider failure, or arbitrary 401.
  if (session && response.status === 401 && (await response.clone().json().catch(() => null))?.authFailure === 'content_admin_unauthorized') {
    const refreshed = await currentCredential(token);
    if (refreshed !== token) response = await send(refreshed);
  }
  if (response.status === 401 && throwOnUnauthorized) failRequest(401);
  return response;
}

/** Only graph GETs may retry a confirmed temporary owner-verification failure. */
export async function readMemoryGraph(params: string, credential: string, signal: AbortSignal) {
  for (let retry = 2; retry--;) {
    // Preserve the graph's existing inline denial text for emergency keys.
    const response = await fetchWithOwnerSession(`/api/admin/memory-graph?${params}`, credential,
      { signal, cache: 'no-store' }, false);
    const body = await response.json();
    signal.throwIfAborted();
    if (retry && response.status === 503 && body.authFailure === 'temporary') continue;
    if (!response.ok || !body.ok) failRequest(response.status, body.error || 'Memory could not be loaded.');
    return body;
  }
}
