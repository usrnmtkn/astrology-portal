import type { IncomingMessage, ServerResponse } from "node:http";
import { isContentAdminAuthorized } from "../_lib/admin-auth.js";
import { readAdminJsonBody, sendAdminJson, AdminHttpError, adminErrorStatus, adminErrorMessage } from "../_lib/admin-http.js";
import { loadLocalWebEnv } from "../_lib/local-env.js";
import { calculateMonthlyWritingFacts, validateCalendarEdition, calendarWritingHash } from "../_lib/calendar-writing-facts.js";
import { readCalendarWritingDocument, saveCalendarWritingDocument } from "../_lib/calendar-writing-storage.js";
import { generateCalendarPhrases, calendarPhraseSourceSupport } from "../_lib/calendar-phrase-generation.js";
import { calendarWritingMemory } from "../_lib/calendar-writing-memory.js";
import { MONTHLY_TEMPLATE_KEY, monthlyEditionKey, monthlyCompositionStarter, initialMonthlySelection, validateMonthlySelection, monthlyTemplateContext, suggestMonthlyEvents } from "../../src/content-studio/monthlyComposition.js";
import { validateWritingTemplate, validatePhraseValues, composeWriting } from "../../src/content-studio/phraseTemplates.js";

import { assertCalendarReceiptSigning, signCalendarPhraseReceipt, checkedCalendarReceipts } from "../_lib/calendar-phrase-receipts.js";

loadLocalWebEnv();
export async function authorizeCalendarWriting(req: IncomingMessage) {
  if (!process.env.CONTENT_GENERATION_SECRET?.trim() && !String(req.headers["x-content-admin-session"] ?? "").trim()) return false;
  return isContentAdminAuthorized(req);
}
export const config = { maxDuration: 300 };
export function createCalendarPhraseHandler(overrides: Partial<{
  authorize: typeof isContentAdminAuthorized; calculate: typeof calculateMonthlyWritingFacts;
  read: typeof readCalendarWritingDocument; save: typeof saveCalendarWritingDocument;
  generate: typeof generateCalendarPhrases; memory: typeof calendarWritingMemory;
}> = {}) {
  const deps = { authorize: authorizeCalendarWriting, calculate: calculateMonthlyWritingFacts, read: readCalendarWritingDocument,
    save: saveCalendarWritingDocument, generate: generateCalendarPhrases, memory: calendarWritingMemory, ...overrides };
  return async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== "POST") { res.setHeader("Allow", "POST"); sendAdminJson(res, 405, { ok: false, error: "Use POST." }); return; }
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Vary", "Authorization, x-content-admin-session, x-content-generation-secret");
    res.setHeader("X-Content-Type-Options", "nosniff");
    try {
      const hasCredential = ["authorization", "x-content-admin-session", "x-content-generation-secret"].some(key => Boolean(req.headers[key]));
      // No anonymous-development shortcut on this private, billable authoring surface.
      if (!hasCredential || !await deps.authorize(req)) throw new AdminHttpError(401, "Sign in with the Content Studio owner account.");
      const body = await readAdminJsonBody<Record<string, any>>(req);
      let edition: ReturnType<typeof validateCalendarEdition>;
      try { edition = validateCalendarEdition(body.month, body.timeZone); } catch (e) { throw new AdminHttpError(400, (e as Error).message); }
      const { month, timeZone } = edition;
      const key = monthlyEditionKey(month, timeZone);
      if (body.action === "load") {
        const [facts, templateRow, editionRow] = await Promise.all([deps.calculate(month, timeZone), deps.read(MONTHLY_TEMPLATE_KEY), deps.read(key)]);
        const sharedTemplate = templateRow ? validateWritingTemplate(templateRow.sections.calendarPhraseDocument) : monthlyCompositionStarter();
        const stored = editionRow?.sections.calendarPhraseDocument as Record<string, any> | undefined;
        if (stored && (stored.month !== month || stored.timeZone !== timeZone || stored.schema !== "calendar-phrase-edition/v1")) throw new AdminHttpError(409, "Saved monthly edition identity does not match the selection.");
        const template = stored ? validateWritingTemplate(stored.template) : sharedTemplate;
        const selection = stored ? validateMonthlySelection(stored.selection, facts) : initialMonthlySelection(facts);
        const values = validatePhraseValues(stored?.values ?? {});
        const memory = await deps.memory(facts, selection).then(result => ({ receipt: result.receipt, error: null as string | null }))
          .catch(() => ({ receipt: null, error: "Memory support is unavailable. Saved templates can still be edited; AI drafting will retry source retrieval before any provider call." }));
        sendAdminJson(res, 200, { ok: true, facts, factsHash: calendarWritingHash(facts), template, sharedTemplate, selection, values,
          templateVersion: templateRow?.updated_at ?? null, editionVersion: editionRow?.updated_at ?? null,
          sourceSupport: calendarPhraseSourceSupport({ template, values, facts, selection }), suggestions: suggestMonthlyEvents(facts.events), memory: memory.receipt, memoryError: memory.error, receipts: stored?.receipts ?? [],
          factsChanged: !!stored?.factsHash && stored.factsHash !== calendarWritingHash(facts) });
        return;
      }
      if (!["generate", "saveTemplate", "saveEdition", "checkSources"].includes(body.action)) throw new AdminHttpError(400, "Unknown Calendar writing action.");
      let template: ReturnType<typeof validateWritingTemplate>;
      try { template = validateWritingTemplate(body.template); } catch (e) { throw new AdminHttpError(400, (e as Error).message); }
      if (body.action === "saveTemplate") {
        const saved = await deps.save(MONTHLY_TEMPLATE_KEY, template, body.expectedUpdatedAt ?? null);
        sendAdminJson(res, 200, { ok: true, updatedAt: saved.updated_at, published: false }); return;
      }
      const facts = await deps.calculate(month, timeZone);
      if (body.factsHash !== calendarWritingHash(facts)) throw new AdminHttpError(409, "The calculated month changed. Reload its facts before drafting or saving.");
      let selection: ReturnType<typeof validateMonthlySelection>, values: ReturnType<typeof validatePhraseValues>;
      try { selection = validateMonthlySelection(body.selection, facts); values = validatePhraseValues(body.values); } catch (e) { throw new AdminHttpError(400, (e as Error).message); }
      const composed = composeWriting(template, monthlyTemplateContext(facts, selection), values);
      if (composed.errors.length) throw new AdminHttpError(400, composed.errors.join(" "));
      if (body.action === "checkSources") {
        sendAdminJson(res, 200, { ok: true, sourceSupport: calendarPhraseSourceSupport({ template, values, facts, selection }) }); return;
      }
      if (body.action === "generate") {
        assertCalendarReceiptSigning();
        const generation = await deps.generate({ template, values, facts, selection, requested: body.requested });
        const receipt = signCalendarPhraseReceipt({ month, timeZone, templateHash: calendarWritingHash(template), factsHash: calendarWritingHash(facts), ...generation });
        sendAdminJson(res, 200, { ok: true, ...generation, receipt, factsHash: calendarWritingHash(facts), published: false }); return;
      }
      const previous = await deps.read(key);
      const receipts = checkedCalendarReceipts(body.receipts ?? [], (previous?.sections.calendarPhraseDocument as { receipts?: unknown } | undefined)?.receipts, values, month, timeZone);
      const saved = await deps.save(key, { schema: "calendar-phrase-edition/v1", month, timeZone, template,
        factsHash: calendarWritingHash(facts), selection, values, receipts, origin: "owner-review-draft", published: false }, body.expectedUpdatedAt ?? null);
      sendAdminJson(res, 200, { ok: true, updatedAt: saved.updated_at, published: false });
    } catch (error) {
      sendAdminJson(res, adminErrorStatus(error), { ok: false, error: adminErrorMessage(error, "Calendar writing is unavailable. No changes were applied.") });
    }
  };
}
export default createCalendarPhraseHandler();
