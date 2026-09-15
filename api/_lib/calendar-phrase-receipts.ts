import { createHmac, timingSafeEqual } from "node:crypto";
import { AdminHttpError } from "./admin-http.js";
import { calendarWritingHash } from "./calendar-writing-facts.js";
import type { CalendarPhraseReceipt, CalendarMemoryReceipt } from "../../src/content-studio/calendarWritingTypes.js";
import type { PhraseValues } from "../../src/content-studio/phraseTemplates.js";

function secret() {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.CONTENT_GENERATION_SECRET;
  if (!value) throw new Error("Private receipt signing is unavailable. No writing request was made.");
  return value;
}
const unsigned = (receipt: CalendarPhraseReceipt) => {
  const { signature: _signature, ...body } = receipt;
  return body;
};
const signature = (receipt: Omit<CalendarPhraseReceipt, "signature">) => createHmac("sha256", secret())
  .update(`calendar-phrase-receipt/v1:${JSON.stringify(receipt)}`).digest("hex");
export function assertCalendarReceiptSigning() { secret(); }

/** This receipt is attribution only. It never authorizes serving or memory activation. */
export function signCalendarPhraseReceipt(input: {
  month: string; timeZone: string; templateHash: string; factsHash: string; proposals: Record<string, string>;
  memory: CalendarMemoryReceipt; generation: { generatedAt: string; provider: string; model: string; inputsHash: string; sources: Array<{ key: string; knowledgeIds: string[] }> };
}): CalendarPhraseReceipt {
  const { generation } = input;
  const body = {
    id: `calendar-generation:${calendarWritingHash({ inputs: generation.inputsHash, at: generation.generatedAt, proposals: input.proposals })}`,
    month: input.month, timeZone: input.timeZone, generatedAt: generation.generatedAt, provider: generation.provider, model: generation.model,
    inputsHash: generation.inputsHash, templateHash: input.templateHash, factsHash: input.factsHash, memory: input.memory,
    phrases: generation.sources.map(source => ({ ...source, valueHash: calendarWritingHash(input.proposals[source.key]) }))
  };
  return { ...body, signature: signature(body) };
}

export function checkedCalendarReceipts(input: unknown, previous: unknown, values: PhraseValues, month: string, timeZone: string): CalendarPhraseReceipt[] {
  if (!Array.isArray(input) || input.length > 60 || JSON.stringify(input).length > 140_000) throw new AdminHttpError(400, "Invalid generation receipts.");
  const prior = Array.isArray(previous) ? previous as CalendarPhraseReceipt[] : [];
  const checked: CalendarPhraseReceipt[] = [];
  for (const receipt of input as CalendarPhraseReceipt[]) {
    if (!receipt || receipt.month !== month || receipt.timeZone !== timeZone || typeof receipt.id !== "string" || !/^calendar-generation:[a-f0-9]{64}$/u.test(receipt.id)
      || typeof receipt.signature !== "string" || !/^[a-f0-9]{64}$/u.test(receipt.signature) || !Array.isArray(receipt.phrases)) throw new AdminHttpError(400, "The generation receipt does not match this monthly edition.");
    // Already stored receipts survive signing-key rotation, but cannot be edited by the caller.
    const persisted = prior.some(item => item.id === receipt.id && JSON.stringify(item) === JSON.stringify(receipt));
    if (!persisted && !timingSafeEqual(Buffer.from(signature(unsigned(receipt)), "hex"), Buffer.from(receipt.signature, "hex"))) throw new AdminHttpError(400, "A generation receipt was modified or cannot be verified.");
    if (checked.some(item => item.id === receipt.id)) throw new AdminHttpError(400, "Duplicate generation receipt.");
    checked.push(receipt);
  }
  for (const [key, value] of Object.entries(values)) {
    if (value.origin === "approved-source") throw new AdminHttpError(400, "Monthly source approval must use its separate review workflow.");
    if (value.origin === "ai-draft" && value.text) {
      const receipt = checked.find(item => item.id === value.sourceId);
      if (!receipt?.phrases.some(item => item.key === key && item.valueHash === calendarWritingHash(value.text))) throw new AdminHttpError(400, "An AI phrase is missing its matching source receipt. Keep edited wording marked as an owner edit.");
    }
  }
  return checked.filter(receipt => Object.values(values).some(value => value.sourceId === receipt.id));
}
