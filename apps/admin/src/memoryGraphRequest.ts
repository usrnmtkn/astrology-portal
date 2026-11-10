import { adminCredentialHeaders } from './adminSecret';
import { fetchWithOwnerSession } from './ownerSessionRequest';

/** Only graph GETs may retry a confirmed temporary owner-verification failure. */
export async function readMemoryGraph(params: string, credential: string, signal: AbortSignal) {
  const url = `/api/admin/memory-graph?${params}`;
  const headers = adminCredentialHeaders(credential);
  const request = () => {
    signal.throwIfAborted();
    return headers['x-content-admin-session']
      ? fetchWithOwnerSession(url, credential, { method: 'GET', signal, cache: 'no-store' })
      : fetch(url, { method: 'GET', headers, signal, cache: 'no-store' });
  };
  for (let attempt = 0; ; attempt++) {
    const response = await request();
    const body = await response.json();
    signal.throwIfAborted();
    if (attempt === 0 && response.status === 503 && body.authFailure === 'content_admin_verification_unavailable') continue;
    if (!response.ok || !body.ok) throw Object.assign(new Error(body.error || 'Memory could not be loaded.'), { status: response.status });
    return body;
  }
}
