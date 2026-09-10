import type bankShape from "./skySummarySourceBank.json";
export type SkySummarySourceBank = typeof bankShape;

// Fetch this editorial artifact only when its workspace opens. It is not part
// of the Admin JavaScript budget or the reader's content bundle.
let pendingBank: Promise<SkySummarySourceBank> | undefined;
export function loadSkySummarySourceBank(): Promise<SkySummarySourceBank> {
  if (!pendingBank) {
    pendingBank = fetch(new URL("./skySummarySourceBank.json", import.meta.url)).then(async response => {
      if (!response.ok) throw new Error("Supplied summary wording could not load. Please retry.");
      return await response.json() as SkySummarySourceBank;
    }).catch(error => { pendingBank = undefined; throw error; });
  }
  return pendingBank;
}

// Supplied approval labels are evidence to review, never a replacement for
// the publication lifecycle or current app copy.
export function suppliedSkySummaryCandidate(key: string, bank?: SkySummarySourceBank) {
  const row = bank?.rows.find(row => row.key === key);
  return row?.importAction === "skip_if_present" ? undefined : row;
}
export function skySummaryCandidateReceipt(key: string, body: string, bank: SkySummarySourceBank) {
  const candidate = suppliedSkySummaryCandidate(key, bank);
  return candidate?.body === body ? { ...bank.provenance, sourceKey: candidate.sourceKey,
    bodySha256: candidate.sha256, wordCount: candidate.wordCount, sourceUrl: candidate.sourceUrl } : undefined;
}
