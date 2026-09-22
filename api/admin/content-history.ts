import type { IncomingMessage, ServerResponse } from 'node:http';
import { isContentAdminAuthorized } from '../_lib/admin-auth.js';
import { loadLocalWebEnv } from '../_lib/local-env.js';
import { AdminHttpError, adminFetchJson, adminErrorStatus, sendAdminJson } from '../_lib/admin-http.js';
loadLocalWebEnv();

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!await isContentAdminAuthorized(req)) return sendAdminJson(res, 401, { ok: false, error: 'Unauthorized.' });
  if (req.method !== 'GET') return sendAdminJson(res, 405, { ok: false, error: 'Use GET.' });
  try {
    const query = new URL(req.url ?? '', 'https://studio.invalid').searchParams;
    const id = query.get('id'); const before = query.get('before');
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu.test(id ?? '')
      || before !== null && (!/^[1-9][0-9]{0,18}$/u.test(before) || BigInt(before) > 9223372036854775807n)) throw new AdminHttpError(400, 'Select a saved row and valid history cursor.');
    const base = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!base || !key) throw new Error('History storage unavailable.');
    const response = await adminFetchJson(`${base}/rest/v1/rpc/content_studio_row_history`, {
      method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_row_id: id, p_before: before })
    });
    if (!response.ok || !Array.isArray(response.payload)) throw new Error('History request failed.');
    const versions = response.payload;
    return sendAdminJson(res, 200, { ok: true, versions, nextCursor: versions.length === 25 ? versions.at(-1).versionId : null });
  } catch (error) { return sendAdminJson(res, adminErrorStatus(error), { ok: false, error: 'Could not load saved history. Reload before trying again.' }); }
}
