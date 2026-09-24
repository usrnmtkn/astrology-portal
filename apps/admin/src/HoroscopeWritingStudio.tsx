import { useEffect, useRef, useState } from "react";
import { AdminDisclosureSummary } from "./AdminNativeControls";
import { StudioButton, StudioTabs, StudioTextarea } from "./StudioControls";
import { adminCredentialHeaders } from "./adminSecret";
import { PageLoading } from "../../web/src/components/PageLoading";
import { HOROSCOPE_PERIODS, HOROSCOPE_PROFILE_FIELDS, HOROSCOPE_PROMPT_VARIABLES, horoscopeEditorialPrompt, validateHoroscopeProfile, type HoroscopePeriod, type HoroscopeProfile, type SavedHoroscopeProfile } from "../../../src/astro-writing/horoscopeWritingProfiles.mjs";

const endpoint = "/api/admin/generated-content?writingProfiles=true";
const labels = { voiceGuidance: "Voice guidance", structure: "Reading structure", sourceGuidance: "Source guidance", prompt: "Prompt" };
type ProfileField = typeof HOROSCOPE_PROFILE_FIELDS[number];
const sections = [
  { value: "voiceGuidance", label: "Voice" },
  { value: "structure", label: "Structure" },
  { value: "sourceGuidance", label: "Sources" },
  { value: "prompt", label: "Prompt" },
  { value: "preview", label: "Preview" },
] as const;
const hints: Record<ProfileField, string> = {
  voiceGuidance: "Describe the tone, language, and point of view you want the writing to use.",
  structure: "Set how each reading opens, develops, and ends for this period.",
  sourceGuidance: "Explain how the writer should use your examples and supporting astrology.",
  prompt: "Combine your instructions with the variables below. Select a variable to insert it at the cursor.",
};
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
  const [section, setSection] = useState<ProfileField | "preview">("voiceGuidance");
  const promptField = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState<HoroscopeProfile>(initial.profile);
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [reloadCandidate, setReloadCandidate] = useState<SavedHoroscopeProfile | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved.profile);
  let preview = "", validation = "";
  try { preview = horoscopeEditorialPrompt(draft); } catch (reason) { validation = (reason as Error).message.replace(/^(voiceGuidance|structure|sourceGuidance|prompt)\b/u, field => labels[field as ProfileField]); }
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
      if (dirty) { setReloadCandidate(next); setMessage("Saved instructions are ready to compare. Your unsaved edits are preserved."); }
      else { setSaved(next); setDraft(next.profile); onSaved(next); setMessage("Loaded the saved version."); }
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(saved, null, 2) + "\n"], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = `${saved.profile.period}-horoscope-writing-profile.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function edit(field: ProfileField, value: string) {
    setDraft(current => ({ ...current, [field]: value })); setMessage(""); setReloadCandidate(null);
  }
  function insertVariable(name: string) {
    const field = promptField.current;
    if (!field) return;
    const start = field.selectionStart, end = field.selectionEnd, token = `{{${name}}}`;
    const value = draft.prompt.slice(0, start) + token + draft.prompt.slice(end);
    if (value.length > 12000) return;
    edit("prompt", value);
    requestAnimationFrame(() => { field.focus(); field.setSelectionRange(start + token.length, start + token.length); });
  }
  async function copyPreview() {
    setError(""); setMessage("");
    try { await navigator.clipboard.writeText(preview); setMessage("Prompt preview copied."); }
    catch { setError("The prompt could not be copied. You can select and copy the preview text."); }
  }
  const stateLabel = dirty ? "Unsaved changes" : saved.id ? "All changes saved" : "Starter profile · not saved";
  return <form className="admin-writing-profile" onSubmit={event => { event.preventDefault(); void save(); }}>
    <header className="admin-writing-profile-header">
      <h2>{title(saved.profile.period)} instructions</h2>
      <span className={`admin-pill${dirty || !saved.id ? " status-draft" : ""}`}>{saved.id ? `Revision ${saved.revision}` : "Starter profile"}</span>
      <p className="admin-field-hint">Edit your writing guidance, then review the assembled prompt.</p>
    </header>
    <StudioTabs label="Writing profile sections" tabs={sections} value={section} onValueChange={setSection}>
      {section === "preview" ? <section className="admin-writing-preview" aria-label="Writing prompt preview">
        <div className="admin-writing-preview-header">
          <h3>Writing prompt preview</h3>
          <StudioButton disabled={Boolean(validation)} onClick={() => void copyPreview()}>Copy prompt</StudioButton>
        </div>
        <p className="admin-field-hint">{dirty || !saved.id ? "Preview of your unsaved instructions." : `Instructions from saved revision ${saved.revision}.`} Dates and supporting source material are added when a draft is prepared.</p>
        <div className="admin-writing-preview-text" role="document" aria-label="Assembled writing prompt"><p>{preview || "Complete the instructions to preview your prompt."}</p></div>
      </section> : <div className="admin-writing-field" key={section}>
        <div className="admin-writing-field-heading">
          <label htmlFor={`${saved.profile.period}-${section}`}>{labels[section]}</label>
          <span className="admin-textarea-counter">{draft[section].length.toLocaleString()} / 12,000</span>
        </div>
        <p className="admin-field-hint" id={`${saved.profile.period}-${section}-hint`}>{hints[section]}</p>
        <StudioTextarea id={`${saved.profile.period}-${section}`} aria-label={labels[section]}
          aria-describedby={`${saved.profile.period}-${section}-hint`} ref={section === "prompt" ? promptField : undefined}
          formatting={false} value={draft[section]} rows={12} maxLength={12000} disabled={busy}
          onChange={event => edit(section, event.target.value)} />
        {section === "prompt" && <div className="admin-writing-variables" role="group" aria-label="Insert prompt variable">
          {HOROSCOPE_PROMPT_VARIABLES.map(name => <StudioButton key={name} disabled={busy} onClick={() => insertVariable(name)} aria-label={`Insert ${name} variable`}>{`{{${name}}}`}</StudioButton>)}
        </div>}
      </div>}
    </StudioTabs>
    {reloadCandidate && <section className="admin-writing-conflict" aria-label="Compare saved version">
      <h3>Saved revision {reloadCandidate.revision}</h3>
      <p>Your edits are still here. Review the saved instructions before replacing them.</p>
      {HOROSCOPE_PROFILE_FIELDS.map(field => <details key={field} className="admin-workspace-details">
        <AdminDisclosureSummary>{labels[field]}</AdminDisclosureSummary>
        <StudioTextarea formatting={false} readOnly aria-label={`Saved ${labels[field].toLowerCase()}`} value={reloadCandidate.profile[field]} rows={6} />
      </details>)}
      <div className="admin-toolbar-actions">
        <StudioButton onClick={() => { setSaved(reloadCandidate); setDraft(reloadCandidate.profile); onSaved(reloadCandidate); setReloadCandidate(null); setError(""); setMessage("Loaded the saved version. Unsaved edits were replaced."); }}>Replace my edits with saved version</StudioButton>
        <StudioButton onClick={() => { setReloadCandidate(null); setMessage("Your unsaved edits have been kept."); }}>Keep my edits</StudioButton>
      </div>
    </section>}
    <footer className="admin-writing-savebar">
      {validation && <p role="alert">{validation}</p>}
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <div className="admin-writing-savebar-row">
        <div className="admin-writing-save-state">
          <span>{stateLabel}</span>
          <small>Saving instructions does not generate or publish readings.</small>
        </div>
        <div className="admin-toolbar-actions">
          <StudioButton aria-label="Reload saved version" disabled={busy} onClick={() => void reload()}>Reload saved</StudioButton>
          <StudioButton aria-label="Export saved profile" disabled={busy || dirty || !saved.id} onClick={download} title={dirty || !saved.id ? "Save this profile before exporting." : "Download the saved profile and revision."}>Export profile</StudioButton>
          <StudioButton className="admin-primary-button" type="submit" disabled={busy || Boolean(validation) || Boolean(saved.id && !dirty)}>{busy ? "Working…" : "Save writing profile"}</StudioButton>
        </div>
      </div>
    </footer>
  </form>;
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
  return <section className="admin-writing-workspace" aria-label="Horoscope writing profiles">
    <div className="admin-writing-period-bar">
      <span>Horoscope period</span>
      <div className="admin-writing-periods" role="group" aria-label="Horoscope period">
        {HOROSCOPE_PERIODS.map(value => <StudioButton key={value} aria-pressed={period === value} onClick={() => setPeriod(value)}>{title(value)}</StudioButton>)}
      </div>
    </div>
    {loading ? <PageLoading message="Loading writing profiles…" /> : error ? <><p role="alert">{error}</p><StudioButton onClick={() => setAttempt(value => value + 1)}>Retry loading profiles</StudioButton></> : profiles.map(profile => <div key={profile.profile.period} hidden={profile.profile.period !== period}><ProfileEditor initial={profile} secret={secret} onSaved={next => setProfiles(current => current.map(entry => entry.profile.period === next.profile.period ? next : entry))} /></div>)}
  </section>;
}
