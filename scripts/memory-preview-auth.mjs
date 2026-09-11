// Local review uses the working Content Studio authority. This module is never
// imported by the deployed API. Only credentials go upstream, never graph data.
export const studioAccessCheckUrl = 'https://tldrastro.vercel.app/api/admin/generated-content?sourceDrafts=sky-aspects';
export function createPreviewMemoryAuthorizer(localAuthorize, fetchImpl = fetch) {
  return async request => {
    if (await localAuthorize(request)) return true;
    const headers = {};
    for (const name of ['authorization', 'x-content-admin-session', 'x-content-generation-secret']) {
      const value = request.headers[name];
      const first = Array.isArray(value) ? value[0] : value;
      if (typeof first === 'string' && first.trim()) headers[name] = first.trim();
    }
    if (!Object.keys(headers).length) return false;
    // This read-only branch verifies admin access before returning repository
    // source drafts, so it does not depend on database availability or writes.
    const response = await fetchImpl(studioAccessCheckUrl, {
      method: 'GET', headers, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 401 || response.status === 403) return false;
    if (!response.ok) throw new Error('Content Studio access verification is temporarily unavailable. Please retry.');
    const body = await response.json();
    if (body?.ok !== true || !Array.isArray(body.rows)) throw new Error('Content Studio returned an unexpected access response. Please retry.');
    return true;
  };
}
