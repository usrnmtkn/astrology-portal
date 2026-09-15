/** Public-safe receipt metadata. No private correction text or provider prompt belongs here. */
export type CalendarMemoryReference = {
  id: string; role: string; path: string; sha256: string; title: string;
};
export type CalendarMemoryReceipt = {
  schema: "calendar-writing-memory/v1"; revision: string | null; fingerprint: string; checkedAt: string;
  references: CalendarMemoryReference[]; privateFeedback: "not-enabled" | "checked-scope-excluded";
  excludedPrivateCorrections: number;
};
export type CalendarPhraseReceipt = {
  id: string; month: string; timeZone: string; generatedAt: string; provider: string; model: string;
  inputsHash: string; templateHash: string; factsHash: string; memory: CalendarMemoryReceipt;
  phrases: Array<{ key: string; valueHash: string; knowledgeIds: string[] }>;
  signature: string;
};

export type CalendarPhraseSourceSupport = Record<string, { status: "ready" | "needs-source"; knowledgeIds: string[]; message?: string }>;
