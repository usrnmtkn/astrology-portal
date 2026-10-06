import {adminCredentialHeaders} from './adminSecret';
import {loadOwnerSessionAccessToken, ownerCredentialIdentity} from './ownerSession';

export const ownerSignInMessage = 'Content Studio could not verify your sign-in. Your saved readings are kept. Sign in with the owner account, then check saved progress.';
export async function fetchWithOwnerSession(url: string, credential: string, init: RequestInit) {
  const session = Boolean(adminCredentialHeaders(credential)['x-content-admin-session']);
  const currentCredential = async (rejectedToken?: string) => {
    if (!session) return credential;
    const current = await loadOwnerSessionAccessToken(rejectedToken, true);
    if (!current || ownerCredentialIdentity(current) !== ownerCredentialIdentity(credential)) {
      throw Object.assign(new Error(ownerSignInMessage), {status: 401});
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
  if (response.status === 401) throw Object.assign(new Error(ownerSignInMessage), {status: 401});
  return response;
}
