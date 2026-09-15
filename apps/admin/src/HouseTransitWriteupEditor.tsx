import { Save, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { StudioButton, StudioTabs, StudioTextarea } from "./StudioControls";

export type HouseTransitEditorSource = {
  key: string;
  label: string;
  scope: string;
  optional?: boolean;
  friendsUnavailable?: string;
  body_you: string;
  body_they: string;
};

type SourceEdits = Pick<HouseTransitEditorSource, "body_you" | "body_they">;
type EditorSource = HouseTransitEditorSource & { baseline: SourceEdits; edits: SourceEdits };
type HouseTransitWriteupEditorProps = {
  title: string;
  initialAudience: "you" | "friends";
  sources: HouseTransitEditorSource[];
  onSave: (key: string, edits: SourceEdits) => Promise<void>;
  onClose: () => void;
  registerCloseGuard?: (guard: (() => boolean) | null) => void;
};

function sourceChanged(source: EditorSource): boolean {
  return source.edits.body_you !== source.baseline.body_you
    || source.edits.body_they !== source.baseline.body_they;
}

export default function HouseTransitWriteupEditor({
  title, initialAudience, sources, onSave, onClose, registerCloseGuard
}: HouseTransitWriteupEditorProps) {
  // The editor owns this snapshot until it closes. A successful save updates only
  // that source's baseline, so a later failure cannot discard another source's edits.
  const [sourceEdits, setSourceEdits] = useState<EditorSource[]>(() => sources.map((source) => ({
    ...source,
    baseline: { body_you: source.body_you, body_they: source.body_they },
    edits: { body_you: source.body_you, body_they: source.body_they }
  })));
  const [audience, setAudience] = useState(initialAudience);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [saveError, setSaveError] = useState("");
  const panelRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const savingRef = useRef(false);
  const dirty = sourceEdits.some(sourceChanged);
  const dirtyRef = useRef(dirty);
  const closeCallbackRef = useRef(onClose);
  dirtyRef.current = dirty;
  closeCallbackRef.current = onClose;
  const previewHeadingId = useId();
  const sourceDescriptionId = useId();
  const audienceLabel = audience === "you" ? "You" : "Friends";
  const field = audience === "you" ? "body_you" : "body_they";
  const currentCopy = (source: EditorSource) => audience === "friends" && source.friendsUnavailable ? "" : source.edits[field];
  const missingSources = sourceEdits.filter((source) => !source.optional && !currentCopy(source).trim());
  const preview = sourceEdits.map(currentCopy).filter((copy) => copy.trim()).join("\n\n");

  const canClose = useCallback(() => {
    if (savingRef.current) return false;
    return !dirtyRef.current || window.confirm("Discard the unsaved House Transit changes?");
  }, []);

  function requestClose() {
    if (canClose()) closeCallbackRef.current();
  }

  useEffect(() => {
    registerCloseGuard?.(canClose);
    return () => registerCloseGuard?.(null);
  }, [canClose, registerCloseGuard]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    headingRef.current?.focus({ preventScroll: true });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        requestClose();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [href], [tabindex]:not([tabindex="-1"])'
      )).filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) {
        event.preventDefault();
        panel.focus();
      } else if (!focusable.includes(document.activeElement as HTMLElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function warnBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirtyRef.current && !savingRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    }

    document.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("beforeunload", warnBeforeUnload);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  function editSource(key: string, value: string) {
    if (savingRef.current) return;
    setSaveStatus("");
    setSourceEdits((current) => current.map((source) => source.key === key && !(audience === "friends" && source.friendsUnavailable)
      ? { ...source, edits: { ...source.edits, [field]: value } }
      : source));
  }

  async function saveAllChanges() {
    if (savingRef.current) return;
    const pending = sourceEdits.filter(sourceChanged).map((source) => ({
      key: source.key, label: source.label, edits: { ...source.edits }
    }));
    if (!pending.length) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError("");
    let saved = 0;
    try {
      for (const source of pending) {
        setSaveStatus(`Saving ${source.label}…`);
        try {
          await onSave(source.key, { ...source.edits });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Please try again.";
          setSaveError(`Could not save ${source.label}. ${message}`);
          setSaveStatus(`${saved} of ${pending.length} changed passages saved. Remaining changes are kept here.`);
          return;
        }
        saved += 1;
        setSourceEdits((current) => current.map((item) => item.key === source.key
          ? { ...item, baseline: { ...source.edits } }
          : item));
      }
      setSaveStatus("All changes saved.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <>
      <StudioButton
        className="admin-editor-backdrop"
        aria-label="Close House Transit write-up editor"
        tabIndex={-1}
        onClick={requestClose}
        disabled={saving}
      />
      <aside
        ref={panelRef}
        className="admin-editor-panel admin-review-detail"
        role="dialog"
        aria-modal="true"
        aria-label="House Transit write-up editor"
        aria-busy={saving}
        tabIndex={-1}
      >
        <header className="admin-editor-header">
          <h2 ref={headingRef} tabIndex={-1}>{title}</h2>
          <div className="admin-editor-toolbar-actions">
            <StudioButton onClick={requestClose} disabled={saving}><X size={16} aria-hidden="true" />Close</StudioButton>
          </div>
        </header>

        <div className="admin-post-editor">
          <StudioTabs
            label="Write-up audience"
            tabs={[{ value: "you", label: "You" }, { value: "friends", label: "Friends" }] as const}
            value={audience}
            onValueChange={setAudience}
          >
            <div className="admin-review-stack">
              {sourceEdits.map((source, index) => (
                <section className="admin-hook-detail-section" key={source.key}>
                  <h3>{source.label}</h3>
                  <p className="admin-field-hint">{source.scope}</p>
                  <label className="admin-review-copy-editor">
                    <span>{audienceLabel} copy</span>
                    <StudioTextarea
                      aria-label={`${source.label} — ${audienceLabel} copy`}
                      aria-describedby={audience === "friends" && source.friendsUnavailable ? `${sourceDescriptionId}-${index}` : undefined}
                      rows={10}
                      value={currentCopy(source)}
                      onChange={(event) => editSource(source.key, event.target.value)}
                      disabled={saving || (audience === "friends" && Boolean(source.friendsUnavailable))}
                    />
                  </label>
                  {audience === "friends" && source.friendsUnavailable && (
                    <p className="admin-field-hint" id={`${sourceDescriptionId}-${index}`}>{source.friendsUnavailable}</p>
                  )}
                  {sourceChanged(source) && <p className="admin-field-hint">Unsaved changes</p>}
                </section>
              ))}
              <section className="admin-natal-source-card" aria-labelledby={previewHeadingId}>
                <h3 id={previewHeadingId}>Combined draft preview</h3>
                {missingSources.length > 0 && (
                  <p className="admin-field-hint" role="status">
                    Partial preview: missing {audienceLabel} copy for {missingSources.map((source) => source.label).join(", ")}.
                  </p>
                )}
                <div className="admin-natal-source-card-copy">
                  <blockquote aria-label={`${audienceLabel} combined draft preview`}>{preview}</blockquote>
                </div>
              </section>
            </div>
          </StudioTabs>
        </div>

        <footer className="admin-toolbar-actions admin-editor-savebar">
          <span className={`admin-editor-save-state ${dirty ? "is-unsaved" : "is-saved"}`} role="status">
            {saveStatus || (dirty ? "Unsaved changes" : "No unsaved changes")}
          </span>
          <StudioButton className="admin-primary-button" onClick={() => void saveAllChanges()} disabled={!dirty || saving}>
            <Save size={16} aria-hidden="true" />Save all changes
          </StudioButton>
          {saveError && <div className="admin-savebar-next-step" role="alert">{saveError}</div>}
        </footer>
      </aside>
    </>
  );
}
