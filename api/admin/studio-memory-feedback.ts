import type { IncomingMessage, ServerResponse } from 'node:http';
import { authorizeMemoryRequest } from './memory-graph.js';
import { adminErrorMessage, adminErrorStatus, AdminHttpError, readAdminJsonBody, sendAdminJson, sendAdminMethodNotAllowed } from '../_lib/admin-http.js';
import { feedbackRequest, readStudioFeedback, studioFeedbackEnabled } from '../_lib/studio-memory-feedback.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!['GET','POST'].includes(req.method ?? '')) return sendAdminMethodNotAllowed(res, ['GET','POST']);
  try {
    if (!await authorizeMemoryRequest(req)) return sendAdminJson(res, 401, { ok: false, error: 'Owner access required.' });
    if (!studioFeedbackEnabled()) {
      if (req.method === 'POST') throw new AdminHttpError(503, 'Studio memory review is not enabled. No decision was saved.');
      return sendAdminJson(res, 200, { ok: true, enabled: false, rows: [] });
    }
    if (req.method === 'GET') {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const historyId = url.searchParams.get('historyId');
      if (historyId) {
        if (!/^[0-9a-f-]{36}$/i.test(historyId)) throw new AdminHttpError(400, 'Invalid memory history.');
        const decisions = await feedbackRequest(`studio_memory_feedback_decisions?${new URLSearchParams({ feedback_id: `eq.${historyId}`, select: 'version,status,scope,reason,decided_at', order: 'version.desc', limit: '100' })}`);
        return sendAdminJson(res, 200, { ok: true, decisions });
      }
      const offset = Number(url.searchParams.get('offset') ?? 0);
      if (!Number.isInteger(offset) || offset < 0) throw new AdminHttpError(400, 'Invalid page.');
      const rows = await readStudioFeedback({ key: url.searchParams.get('contentKey') ?? undefined, offset, limit: 50 });
      return sendAdminJson(res, 200, { ok: true, enabled: true, rows, offset, hasMore: rows.length === 50, fetchedAt: new Date().toISOString() });
    }
    const body: any = (req as any).body ?? await readAdminJsonBody(req);
    if (!body || Array.isArray(body) || Object.keys(body).some(k => !['id','version','status','scope','reason'].includes(k))
      || !/^[0-9a-f-]{36}$/i.test(body.id ?? '') || !Number.isInteger(body.version) || body.version < 1
      || !['active','retired'].includes(body.status) || !['passage','family','sky'].includes(body.scope)
      || typeof body.reason !== 'string' || body.reason.length > 4000 || body.scope !== 'passage' && !body.reason.trim())
      throw new AdminHttpError(400, 'Choose a memory decision and scope. Broader guidance needs a reason.');
    const rows = await feedbackRequest('rpc/review_studio_memory_feedback', { method: 'POST', body: JSON.stringify({
      p_id: body.id, p_version: body.version, p_status: body.status, p_scope: body.scope, p_reason: body.reason,
    }) });
    if (rows.length !== 1) throw new AdminHttpError(409, 'Memory changed. Reload before retrying.');
    sendAdminJson(res, 200, { ok: true, enabled: true, rows });
  } catch (error) { sendAdminJson(res, adminErrorStatus(error), { ok: false, error: adminErrorMessage(error, 'Studio memory could not be updated.') }); }
}
