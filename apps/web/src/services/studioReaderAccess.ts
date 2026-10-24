import { adminCredentialHeaders, adminSecretStorageKey } from '../../../admin/src/adminSecret';
import { loadOwnerSessionAccessToken } from '../../../admin/src/ownerSession';

type Access = 'allowed' | 'denied' | 'unavailable';
const pending = new Map<string, Promise<Access>>();
/** Verify through the existing read-only owner endpoint; client session data grants no access. */
export async function verifyReaderStudioAccess() {
  const session = await loadOwnerSessionAccessToken(), emergency = window.localStorage.getItem(adminSecretStorageKey) || '';
  const credential = session || emergency;
  if (!credential) return false;
  const result = await verify(credential);
  return result === 'allowed' || Boolean(result === 'denied' && emergency && emergency !== credential && await verify(emergency) === 'allowed');
}

async function verify(credential: string): Promise<Access> {
  if (!pending.has(credential)) pending.set(credential, (async () => {
    try {
      const response = await fetch('/api/admin/content-live-status', { method: 'POST',
        headers: { 'content-type': 'application/json', ...adminCredentialHeaders(credential) },
        body: JSON.stringify({ ids: [] }), signal: AbortSignal.timeout(8000), cache: 'no-store' });
      if (response.status === 401 || response.status === 403) return 'denied';
      const payload = await response.json();
      return response.ok && payload.ok === true && Array.isArray(payload.statuses) ? 'allowed' : 'unavailable';
    } catch { return 'unavailable'; }
    finally { pending.delete(credential); }
  })());
  return pending.get(credential)!;
}
