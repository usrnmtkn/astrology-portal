import type { IncomingMessage, ServerResponse } from 'node:http';
import { requireInternalRunner } from '../_lib/report-http.js';
import { sendAdminJson } from '../_lib/admin-http.js';
import { publishDueSkyArticles } from '../admin/generated-content.js';
export const maxDuration = 300;
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!['GET', 'POST'].includes(req.method ?? '')) return sendAdminJson(res, 405, { ok: false });
  if (!requireInternalRunner(req)) return sendAdminJson(res, 401, { ok: false, error: 'Unauthorized.' });
  try { return sendAdminJson(res, 200, { ok: true, ...await publishDueSkyArticles() }); }
  catch { return sendAdminJson(res, 503, { ok: false, error: 'Scheduled publications could not advance. Saved drafts are retained.' }); }
}
