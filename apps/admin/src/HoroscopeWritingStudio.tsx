import { useEffect, useState } from "react";
import { AdminDisclosureSummary, AdminSelect } from "./AdminNativeControls";
import { StudioButton, StudioTextarea } from "./StudioControls";
import { adminCredentialHeaders } from "./adminSecret";
import { PageLoading } from "../../web/src/components/PageLoading";
import { HOROSCOPE_PERIODS, HOROSCOPE_PROFILE_FIELDS, HOROSCOPE_PROMPT_VARIABLES, horoscopeEditorialPrompt, validateHoroscopeProfile, type HoroscopePeriod, type HoroscopeProfile, type SavedHoroscopeProfile } from "../../../src/astro-writing/horoscopeWritingProfiles.mjs";

const endpoint = "/api/admin/generated-content?writingProfiles=true";
const labels = { voiceGuidance: "Voice guidance", structure: "Reading structure", sourceGuidance: "Source guidance", prompt: "Prompt" };
const title = (value: string) => value[0].toUpperCase() + value.slice(1);
async function request(secret: string, body?: unknown, signal?: AbortSignal) {
  const timeout = AbortSignal.timeout(15000);
  const response = await fetch(endpoint, { method: body ? "POST" : "GET", headers: { ...adminCredentialHeaders(secret), "content-type": "application/json" }, cache: "no-store", signal: signal ? AbortSignal.any([signal, timeout]) : timeout, ...(body ? { body: JSON.stringify(body) } : {}) });
  let data;
  try { data = await response.json(); } catch { throw new Error("The writing profile response could not be read. Reload before retrying."); }
  if (!response.ok || data.ok !== true) throw new Error(data.error ?? "Writing profiles could not be loaded.");
  return data;
}
function validateSaved(value: SavedHoroscopeProfile) {
  validateHoroscopeProfile(value?.profile);
  if (!Number.isInteger(value.revision) || value.revision < 0 || !/^[a-f0-9]{64}$/u.test(value.sha256)
    || (value.revision === 0 ? value.id !== null || value.updatedAt !== null : typeof value.id !== "string" || !value.id || typeof value.updatedAt !== "string" || !Number.isFinite(Date.parse(value.updatedAt)))) throw new Error("The saved writing profile could not be confirmed. Reload before retrying.");
  return value;
}

function ProfileEditor({ initial, secret, onSaved }: { initial: SavedHoroscopeProfile; secret: string; onSaved: (value: SavedHoroscopeProfile) => void }) {
  const [draft, setDraft] = useState<HoroscopeProfile>(initial.profile);
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [reloadCandidate, setReloadCandidate] = useState<SavedHoroscopeProfile | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved.profile);
  let preview = "", validation = "";
  try { preview = horoscopeEditorialPrompt(draft); } catch (reason) { validation = (reason as Error).message; }
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function save() {
    setBusy(true); setError(""); setMessage("");
    try {
      const data = await request(secret, { profile: draft, expectedUpdatedAt: saved.updatedAt });
      const next = validateSaved(data.profile);
      if (!next.id || next.revision !== saved.revision + 1 || JSON.stringify(next.profile) !== JSON.stringify(draft)) throw new Error("Storage did not confirm your exact edit. Reload before retrying.");
      setSaved(next); onSaved(next); setReloadCandidate(null); setMessage(`Saved ${title(next.profile.period)} profile, revision ${next.revision}.`);
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }
  async function reload() {
    setBusy(true); setError("");
    try {
      const data = await request(secret);
      const next = validateSaved(data.profiles.find((entry: SavedHoroscopeProfile) => entry.profile.period === saved.profile.period));
      if (dirty) { setReloadCandidate(next); setMessage("The saved version is ready below. Your unsaved edits are preserved."); }
      else { setSaved(next); setDraft(next.profile); onSaved(next); setMessage("Loaded the saved version."); }
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(saved, null, 2) + "\n"], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = `${saved.profile.period}-horoscope-writing-profile.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="admin-hook-detail-section">
    <p className="admin-field-hint">{saved.id ? `Saved revision ${saved.revision}` : "Starter profile · not saved"}{dirty ? " · Unsaved changes" : ""}</p>
    <p>Edit the instructions for future horoscope drafts. Each reading also uses verified astrology and selected examples of your writing. Saving a profile does not generate or publish a reading.</p>
    <form onSubmit={event => { event.preventDefault(); void save(); }}>
      {HOROSCOPE_PROFILE_FIELDS.map(field => <label className="admin-review-copy-editor" key={field}>
        <span>{labels[field]}</span>
        <StudioTextarea aria-label={labels[field]} value={draft[field]} rows={field === "prompt" ? 12 : 6} maxLength={12000} disabled={busy}
          onChange={event => { setDraft(current => ({ ...current, [field]: event.target.value })); setMessage(""); }} />
      </label>)}
      <p className="admin-field-hint">Prompt variables: {HOROSCOPE_PROMPT_VARIABLES.map(name => `{{${name}}}`).join(", ")}. The preview below expands them.</p>
      {validation && <p role="alert">{validation}</p>}
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <div className="admin-toolbar-actions">
        <StudioButton type="submit" disabled={busy || Boolean(validation) || Boolean(saved.id && !dirty)}>Save writing profile</StudioButton>
        <StudioButton disabled={busy} onClick={() => void reload()}>Reload saved version</StudioButton>
        <StudioButton disabled={busy || dirty || !saved.id} onClick={download}>Export saved profile</StudioButton>
      </div>
    </form>
    {reloadCandidate && <details className="admin-workspace-details" open><AdminDisclosureSummary>Compare saved version · revision {reloadCandidate.revision}</AdminDisclosureSummary>
      {HOROSCOPE_PROFILE_FIELDS.map(field => <label className="admin-review-copy-editor" key={field}><span>Saved {labels[field].toLowerCase()}</span><StudioTextarea readOnly aria-label={`Saved ${labels[field].toLowerCase()}`} value={reloadCandidate.profile[field]} rows={6} /></label>)}
      <StudioButton onClick={() => { setSaved(reloadCandidate); setDraft(reloadCandidate.profile); onSaved(reloadCandidate); setReloadCandidate(null); setMessage("Loaded the saved version. Unsaved edits were replaced."); }}>Replace my edits with saved version</StudioButton>
    </details>}
    <details className="admin-workspace-details" open><AdminDisclosureSummary>Writing prompt preview</AdminDisclosureSummary>
      <p className="admin-field-hint">{dirty || !saved.id ? "Preview of your unsaved instructions." : `Instructions from saved revision ${saved.revision}.`} Dates and supporting source material are added when a draft is prepared.</p>
      <StudioTextarea aria-label="Assembled writing prompt" readOnly value={preview} rows={16} />
    </details>
  </div>;
}

export default function HoroscopeWritingStudio({ secret }: { secret: string }) {
  const [profiles, setProfiles] = useState<SavedHoroscopeProfile[]>([]);
  const [period, setPeriod] = useState<HoroscopePeriod>("weekly");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    void request(secret, undefined, controller.signal).then(data => {
      if (!Array.isArray(data.profiles) || data.profiles.length !== 3) throw new Error("The writing profile library is incomplete.");
      const values = data.profiles.map(validateSaved);
      if (new Set(values.map((entry: SavedHoroscopeProfile) => entry.profile.period)).size !== 3) throw new Error("The writing profile library contains duplicate periods.");
      if (!controller.signal.aborted) setProfiles(values);
    }).catch(reason => { if (!controller.signal.aborted) setError((reason as Error).message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [secret, attempt]);
  return <section className="admin-panel" aria-label="Horoscope writing profiles">
    <div className="admin-toolbar"><label><span>Horoscope period</span><AdminSelect aria-label="Horoscope period" value={period} onChange={event => setPeriod(event.target.value as HoroscopePeriod)}>{HOROSCOPE_PERIODS.map(value => <option key={value} value={value}>{title(value)}</option>)}</AdminSelect></label></div>
    {loading ? <PageLoading message="Loading writing profiles…" /> : error ? <><p role="alert">{error}</p><StudioButton onClick={() => setAttempt(value => value + 1)}>Retry loading profiles</StudioButton></> : profiles.map(profile => <div key={profile.profile.period} hidden={profile.profile.period !== period}><ProfileEditor initial={profile} secret={secret} onSaved={next => setProfiles(current => current.map(entry => entry.profile.period === next.profile.period ? next : entry))} /></div>)}
  </section>;
}
