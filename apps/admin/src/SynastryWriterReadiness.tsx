import { useEffect, useRef, useState } from "react";
import { StudioButton, StudioInput } from "./StudioControls";
import { fetchWithOwnerSession } from "./ownerSessionRequest";

type Readiness = {
  ok: true;
  status: "ready";
  editorialVersion: string;
  revision: string;
  primaryStyleReferenceCount: 4;
  supportingReferenceCount: 28;
  detailedKnowledgeSourceCount: 20;
  currentFeedback: "verified";
  providerConfigured: true;
  generationPerformed: false;
};

function verified(value: unknown): value is Readiness {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<Readiness>;
  return row.ok === true && row.status === "ready"
    && typeof row.editorialVersion === "string" && /^synastry-aspect\/v\d+-\d{4}-\d{2}-\d{2}$/u.test(row.editorialVersion)
    && typeof row.revision === "string" && /^[a-f0-9]{40}$/u.test(row.revision)
    && row.primaryStyleReferenceCount === 4 && row.supportingReferenceCount === 28
    && row.detailedKnowledgeSourceCount === 20 && row.currentFeedback === "verified"
    && row.providerConfigured === true && row.generationPerformed === false;
}

/** Owner-triggered, read-only verification. No generation or content mutations. */
export default function SynastryWriterReadiness({ secret }: { secret: string }) {
  const request = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Readiness | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setResult(null);
    setFailed(false);
    setBusy(false);
    return () => request.current?.abort();
  }, [secret]);

  async function check() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setResult(null);
    setFailed(false);
    setBusy(true);
    try {
      const response = await fetchWithOwnerSession("/api/admin/synastry-writer-status", secret,
        { method: "GET", cache: "no-store", signal: controller.signal });
      const body: unknown = await response.json();
      controller.signal.throwIfAborted();
      if (!response.ok || !verified(body)) throw new Error("Readiness unavailable");
      // Retain only the endpoint's public readiness metadata, never extra fields.
      setResult({ ok: true, status: "ready", editorialVersion: body.editorialVersion, revision: body.revision,
        primaryStyleReferenceCount: 4, supportingReferenceCount: 28, detailedKnowledgeSourceCount: 20,
        currentFeedback: "verified", providerConfigured: true, generationPerformed: false });
    } catch {
      if (!controller.signal.aborted) setFailed(true);
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return <div className="studio-surface">
    <StudioButton type="button" disabled={!secret || busy} onClick={() => void check()}>
      {busy ? "Checking Synastry writer…" : "Check Synastry writer readiness"}
    </StudioButton>
    <p>This checks the deployed writer's sources and configuration. It does not generate or save writing.</p>
    <div role="status" aria-label="Synastry writer readiness">
      {result && <>
        <p>Ready. 4 primary style references, 28 supporting references, and 20 detailed meaning sources verified.</p>
        <p>Current feedback verified. Provider configured. No generation performed.</p>
        <p>{result.editorialVersion}</p>
        <label className="admin-field-wide"><span>Verified deployed revision</span><StudioInput readOnly value={result.revision} /></label>
      </>}
      {failed && <p>The deployed writer could not be verified. Check your owner sign-in and try again. No generation was started.</p>}
    </div>
  </div>;
}
