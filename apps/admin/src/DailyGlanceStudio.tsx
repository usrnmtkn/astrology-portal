import { StudioButton, StudioInput, StudioTextarea } from "./StudioControls";
import { containedDisclosure, surfaceSection } from "./studio-ds/recipes";
import { AdminDisclosureSummary, AdminSelect } from "./AdminNativeControls";
import { useEffect, useMemo, useState } from "react";
import { Save, X } from "lucide-react";

import {
  dailyGlancePackageField,
  dailyGlancePairSearchText,
  type DailyGlancePair,
  type DailyGlanceAdminRow
} from "./dailyGlanceAdmin";
import {
  dailyGlanceFriendPreviewParts,
  dailyGlanceFriendPreviewSlots,
  type DailyGlanceFriendPreviewPart,
  type DailyGlanceFriendPreviewPronouns
} from "./dailyGlanceFriendPreview";

export type DailyGlanceContext = {
  date: string;
  timeZone: string;
  chart: { id: string; name: string; birthTimeKnown: boolean };
  moon: { sign: string; degree: number };
  driver: {
    kind: "aspect" | "house";
    label: string;
    orb?: number;
  };
  selector: string;
  headlineKey: string;
  passageKey: string;
  detailLine: string;
};

export type DailyGlancePairEdits = {
  headlineYou: string;
  headlineThey: string;
  passageYou: string;
  passageThey: string;
};

type DailyGlanceStudioProps = {
  context: DailyGlanceContext | null;
  contextError: string | null;
  contextLoading: boolean;
  pairs: DailyGlancePair[];
  query: string;
  onLoadContext: (input: { date: string; person: string; timeZone: string }) => Promise<void>;
  onOpenPair: (selector: string) => void;
};

function localDate(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function normalizedSearch(value: string) {
  return value.toLowerCase().replace(/[-_/.:,"{}[\]]+/gu, " ").trim().split(/\s+/u).filter(Boolean);
}

function matchesPair(pair: DailyGlancePair, query: string) {
  const tokens = normalizedSearch(query);
  if (tokens.length === 0) return true;
  const haystack = dailyGlancePairSearchText(pair).replace(/[-_/.:,"{}[\]]+/gu, " ");
  return tokens.every((token) => haystack.includes(token));
}

export function DailyGlanceStudio({
  context,
  contextError,
  contextLoading,
  pairs,
  query,
  onLoadContext,
  onOpenPair
}: DailyGlanceStudioProps) {
  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", []);
  const [date, setDate] = useState(() => localDate(timeZone));
  const [person, setPerson] = useState("");
  const visiblePairs = useMemo(() => pairs.filter((pair) => matchesPair(pair, query)), [pairs, query]);
  const activePair = context ? pairs.find((pair) => pair.selector === context.selector) ?? null : null;

  return (
    <section className="admin-daily-glance-studio" aria-label="Daily At-a-Glance editor">
      <header className="admin-section-heading-row">
        <div>
          <p className="admin-eyebrow">Daily At-a-Glance editor</p>
          <h3>Edit the complete write-up</h3>
          <p>Load a chart and date to see the Moon-driven source the app selects. Calculated astrology stays read-only; the matching headline and passage open together.</p>
        </div>
        <p>{pairs.length} matched write-ups</p>
      </header>

      <form
        className="admin-daily-glance-context-form"
        onSubmit={(event) => {
          event.preventDefault();
          void onLoadContext({ date, person: person.trim(), timeZone });
        }}
      >
        <label>
          <span>Person or chart</span>
          <StudioInput aria-label="Daily At-a-Glance person or chart" value={person} onChange={(event) => setPerson(event.target.value)} placeholder="Name or chart ID" required />
        </label>
        <label>
          <span>Local date</span>
          <StudioInput aria-label="Daily At-a-Glance local date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
        </label>
        <label>
          <span>Day boundary</span>
          <StudioInput aria-label="Daily At-a-Glance timezone" value={timeZone} readOnly />
        </label>
        <StudioButton className="admin-primary-button" type="submit" disabled={contextLoading || !person.trim()}>
          {contextLoading ? "Calculating…" : "Load current Moon write-up"}
        </StudioButton>
      </form>

      {contextError && <p className="admin-inline-error" role="alert">{contextError}</p>}

      {context && (
        <article className="admin-daily-glance-current" aria-label="Calculated Daily At-a-Glance preview">
          <div className="admin-daily-glance-current-facts">
            <span className="ui-pill admin-status status-reviewed">Moon in {context.moon.sign}</span>
            <span className="ui-pill admin-status">{context.driver.label}</span>
            <span className="ui-pill admin-status">{context.chart.name}</span>
            <span className="ui-pill admin-status">{context.date}</span>
          </div>
          {activePair ? (
            <div className="admin-daily-glance-reader-card">
              <h4>{dailyGlancePackageField(activePair.headlineRow, "body_you")}</h4>
              <p className="admin-copy-preview">{dailyGlancePackageField(activePair.passageRow, "body_you")}</p>
              <p>{context.detailLine}</p>
              <StudioButton type="button" onClick={() => onOpenPair(activePair.selector)}>Edit this headline and passage</StudioButton>
            </div>
          ) : (
            <div className="admin-inline-warning" role="status">
              <strong>The calculated source is not available as a complete editable pair.</strong>
              <code>{context.headlineKey}</code>
              <code>{context.passageKey}</code>
            </div>
          )}
        </article>
      )}

      <div className="admin-daily-glance-pair-list" aria-label="Daily At-a-Glance matched write-ups">
        {visiblePairs.map((pair) => (
          <article key={pair.selector}>
            <div>
              <strong>{pair.label}</strong>
              <p>{dailyGlancePackageField(pair.headlineRow, "body_you")}</p>
              <p className="admin-copy-preview">{dailyGlancePackageField(pair.passageRow, "body_you")}</p>
            </div>
            <StudioButton type="button" onClick={() => onOpenPair(pair.selector)}>Edit write-up</StudioButton>
          </article>
        ))}
        {visiblePairs.length === 0 && <p className="admin-empty">No complete Daily At-a-Glance write-ups match this search.</p>}
      </div>
    </section>
  );
}

type DailyGlancePairEditorProps = {
  context: DailyGlanceContext | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (pair: DailyGlancePair, edits: DailyGlancePairEdits) => Promise<DailyGlancePair>;
  onPublish: (pair: DailyGlancePair, edits: DailyGlancePairEdits) => Promise<DailyGlancePair>;
  publicationPending: boolean;
  onCheckPublication: () => Promise<{row: DailyGlanceAdminRow; live: boolean} | undefined>;
  pair: DailyGlancePair;
};

function renderFriendPreviewParts(parts: DailyGlanceFriendPreviewPart[]) {
  return parts.map((part, index) => part.kind === "text"
    ? <span key={`text-${index}`}>{part.text}</span>
    : (
      <mark
        className={`admin-daily-glance-variable is-${part.category}`}
        data-variable={part.variable}
        key={`${part.variable}-${index}`}
        title={`${part.source} · ${part.meaning}`}
      >
        {part.value}
      </mark>
    ));
}

function pairEdits(pair: DailyGlancePair): DailyGlancePairEdits {
  return {
    headlineYou: dailyGlancePackageField(pair.headlineRow, "body_you"),
    headlineThey: dailyGlancePackageField(pair.headlineRow, "body_they"),
    passageYou: dailyGlancePackageField(pair.passageRow, "body_you"),
    passageThey: dailyGlancePackageField(pair.passageRow, "body_they")
  };
}

// Loaded with the paired editor, keeping its publication orchestration out of Studio startup.
export async function saveDailyGlancePair(
  pair: DailyGlancePair, edits: DailyGlancePairEdits, publish: boolean,
  save: (row: DailyGlanceAdminRow, you: string, they: string) => Promise<DailyGlanceAdminRow>,
  approve: (row: DailyGlanceAdminRow) => Promise<DailyGlanceAdminRow | undefined>
): Promise<DailyGlancePair> {
  const savedPair = { ...pair };
  const completed: string[] = [];
  let phase = "Headline";
  try {
    for (const [field, label, you, they] of [
      ["headlineRow", "Headline", edits.headlineYou, edits.headlineThey],
      ["passageRow", "Passage", edits.passageYou, edits.passageThey]
    ] as const) {
      phase = label;
      let row = savedPair[field];
      if (publish || you !== dailyGlancePackageField(row, "body_you") || they !== dailyGlancePackageField(row, "body_they")) {
        row = await save(row, you, they);
        savedPair[field] = row;
      }
      if (publish) {
        const result = await approve(row);
        if (!result || result.status !== "LIVE" || result.lane !== "serving" || result.review_state
          || dailyGlancePackageField(result, "body_you") !== you || dailyGlancePackageField(result, "body_they") !== they) {
          throw new Error("Publication of the complete saved source was not confirmed.");
        }
        savedPair[field] = result;
      }
      completed.push(label);
    }
    return savedPair;
  } catch (error) {
    const message = `${completed.length ? `${completed.join(" and ")} ${publish ? "published" : "saved"}. ` : ""}${phase}: ${error instanceof Error ? error.message : String(error)}`;
    throw Object.assign(new Error(message), { savedPair });
  }
}

export function DailyGlancePairEditor({ context, isSaving, onClose, onSave, onPublish, pair, publicationPending, onCheckPublication }: DailyGlancePairEditorProps) {
  const matchingContext = context?.selector === pair.selector ? context : null;
  // Keep the opened versions for CAS checks. Background inventory refreshes
  // must not silently rebase local writing onto somebody else's newer edit.
  const [baselinePair, setBaselinePair] = useState(pair);
  const initial = useMemo(() => pairEdits(baselinePair), [baselinePair]);
  const [edits, setEdits] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState(() => matchingContext?.chart.name ?? "Alex");
  const [previewPronouns, setPreviewPronouns] = useState<DailyGlanceFriendPreviewPronouns>("they");

  useEffect(() => {
    if (pair.selector === baselinePair.selector) return;
    setBaselinePair(pair); setEdits(pairEdits(pair)); setError(null);
  }, [pair, baselinePair.selector]);
  useEffect(() => setPreviewName(matchingContext?.chart.name ?? "Alex"), [matchingContext?.chart.name, pair.selector]);

  const dirty = JSON.stringify(edits) !== JSON.stringify(initial);
  const busy = isSaving || submitting;
  const blocked = busy || publicationPending;
  const complete = Object.values(edits).every(value => value.trim());
  const submit = async (publish: boolean) => {
    if (blocked) return;
    setSubmitting(true); setError(null);
    try {
      const saved = await (publish ? onPublish : onSave)(baselinePair, edits);
      setBaselinePair(saved); setEdits(pairEdits(saved));
    } catch (failure) {
      const saved = (failure as {savedPair?: DailyGlancePair})?.savedPair;
      // A confirmed first source stays acknowledged if the second fails.
      if (saved?.selector === baselinePair.selector) setBaselinePair(saved);
      setError(failure instanceof Error ? failure.message : "Could not save this write-up. Your writing is retained.");
    } finally { setSubmitting(false); }
  };
  const checkPublication = async () => {
    setSubmitting(true); setError(null);
    try {
      const result = await onCheckPublication();
      if (!result?.row) {
        setError("Publication is still awaiting confirmation. Your writing is retained; check its status again before publishing.");
        return;
      }
      const field = result.row.content_key === baselinePair.headlineRow.content_key ? "headlineRow"
        : result.row.content_key === baselinePair.passageRow.content_key ? "passageRow" : null;
      if (!field) throw new Error("Reopen this write-up to check its publication identity.");
      const you = field === "headlineRow" ? edits.headlineYou : edits.passageYou;
      const they = field === "headlineRow" ? edits.headlineThey : edits.passageThey;
      if (dailyGlancePackageField(result.row, "body_you") !== you || dailyGlancePackageField(result.row, "body_they") !== they) {
        throw new Error("The saved source changed. Reopen it before publishing; your local writing is retained here.");
      }
      setBaselinePair(current => ({ ...current, [field]: result.row }));
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not check publication."); }
    finally { setSubmitting(false); }
  };
  const friendPreviewSlots = useMemo(
    () => dailyGlanceFriendPreviewSlots(previewName, previewPronouns),
    [previewName, previewPronouns]
  );
  const friendHeadlineParts = useMemo(
    () => dailyGlanceFriendPreviewParts(edits.headlineThey, friendPreviewSlots),
    [edits.headlineThey, friendPreviewSlots]
  );
  const friendPassageParts = useMemo(
    () => dailyGlanceFriendPreviewParts(edits.passageThey, friendPreviewSlots),
    [edits.passageThey, friendPreviewSlots]
  );
  const friendVariableGuide = useMemo(() => {
    const variables = new Map<string, Extract<DailyGlanceFriendPreviewPart, { kind: "variable" }>>();
    [...friendHeadlineParts, ...friendPassageParts].forEach((part) => {
      if (part.kind === "variable" && !variables.has(part.variable)) variables.set(part.variable, part);
    });
    return [...variables.values()];
  }, [friendHeadlineParts, friendPassageParts]);
  const close = () => {
    if (dirty && !window.confirm("Discard the unsaved Daily At-a-Glance changes?")) return;
    onClose();
  };

  return (
    <>
      <StudioButton type="button" className="admin-editor-backdrop" aria-label="Close Daily At-a-Glance editor" onClick={close} disabled={busy} />
      <aside className="admin-editor-panel admin-review-detail admin-daily-glance-pair-editor" role="dialog" aria-modal="true" aria-label="Daily At-a-Glance paired editor" aria-busy={busy}>
        <div className="admin-editor-toolbar">
          <div>
            <p className="admin-eyebrow">Daily At-a-Glance</p>
            <h2>Edit {pair.label}</h2>
            <p>Headline and passage remain separate source keys, but are reviewed and saved here as one reader write-up.</p>
          </div>
          <div className="admin-editor-toolbar-actions">
            <StudioButton type="button" onClick={close} disabled={busy}><X size={16} aria-hidden="true" />Close</StudioButton>
          </div>
        </div>

        <section className="admin-post-editor">
          {matchingContext && (
            <div className="admin-daily-glance-current-facts" aria-label="Current calculated context">
              <span className="ui-pill admin-status status-reviewed">Moon in {matchingContext.moon.sign}</span>
              <span className="ui-pill admin-status">{matchingContext.driver.label}</span>
              <span className="ui-pill admin-status">{matchingContext.chart.name}</span>
            </div>
          )}

          <section className={`${surfaceSection} admin-daily-glance-audience`} aria-label="You version">
            <div><p className="admin-eyebrow">You</p><h3>Signed-in reader</h3></div>
            <label className="admin-review-copy-editor"><span>Headline · You</span><StudioTextarea disabled={blocked} value={edits.headlineYou} onChange={(event) => setEdits((value) => ({ ...value, headlineYou: event.target.value }))} /></label>
            <label className="admin-review-copy-editor"><span>Passage · You</span><StudioTextarea disabled={blocked} value={edits.passageYou} onChange={(event) => setEdits((value) => ({ ...value, passageYou: event.target.value }))} /></label>
            <div className="admin-daily-glance-reader-card" aria-label="You reader preview">
              <h4>{edits.headlineYou}</h4><p className="admin-copy-preview">{edits.passageYou}</p>
              {matchingContext && <><p>{matchingContext.detailLine}</p></>}
            </div>
          </section>

          <section className={`${surfaceSection} admin-daily-glance-audience`} aria-label="Friend version">
            <div><p className="admin-eyebrow">Friend</p><h3>Selected person</h3></div>
            <p className="admin-daily-glance-name-contract">
              Daily uses <code>{"{{personPreferredName}}"}</code> for <strong>Name</strong> so the app can use the selected person's preferred name and fall back to their display name. <code>{"{{Name}}"}</code> is not part of this renderer's variable contract.
            </p>
            <label className="admin-review-copy-editor"><span>Headline · Friend</span><StudioTextarea disabled={blocked} value={edits.headlineThey} onChange={(event) => setEdits((value) => ({ ...value, headlineThey: event.target.value }))} /></label>
            <label className="admin-review-copy-editor"><span>Passage · Friend</span><StudioTextarea disabled={blocked} value={edits.passageThey} onChange={(event) => setEdits((value) => ({ ...value, passageThey: event.target.value }))} /></label>
            <div className="admin-daily-glance-preview-controls" aria-label="Friend preview values">
              <label>
                <span>Preview name</span>
                <StudioInput aria-label="Friend preview name" value={previewName} onChange={(event) => setPreviewName(event.target.value)} placeholder="Alex" />
              </label>
              <label>
                <span>Preview pronouns</span>
                <AdminSelect aria-label="Friend preview pronouns" value={previewPronouns} onChange={(event) => setPreviewPronouns(event.target.value as DailyGlanceFriendPreviewPronouns)}>
                  <option value="they">They / them</option>
                  <option value="she">She / her</option>
                  <option value="he">He / him</option>
                </AdminSelect>
              </label>
              <p>Preview values only. They are not saved into the approved source.</p>
            </div>
            <div className="admin-daily-glance-reader-card admin-daily-glance-friend-preview" aria-label="Friend reader preview">
              <p className="admin-eyebrow">Rendered Friend write-up</p>
              <h4>{renderFriendPreviewParts(friendHeadlineParts)}</h4>
              <p>{renderFriendPreviewParts(friendPassageParts)}</p>
              {matchingContext && <><p>{matchingContext.detailLine}</p></>}
            </div>
            {friendVariableGuide.length > 0 && (
              <div className="admin-daily-glance-variable-guide" aria-label="Friend variable guide">
                <div>
                  <p className="admin-eyebrow">Variable guide</p>
                  <h4>What the Friend placeholders mean</h4>
                </div>
                <dl>
                  {friendVariableGuide.map((variable) => (
                    <div key={variable.variable}>
                      <dt>
                        <code>{variable.source}</code>
                        <mark className={`admin-daily-glance-variable is-${variable.category}`}>{variable.value || "(no suffix)"}</mark>
                      </dt>
                      <dd><strong>{variable.label}.</strong> {variable.meaning}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </section>

          <details className={`${containedDisclosure} admin-advanced admin-editor-key-details`}>
            <AdminDisclosureSummary>Source keys</AdminDisclosureSummary>
            <code>{pair.headlineRow.content_key}</code>
            <code>{pair.passageRow.content_key}</code>
          </details>
        </section>

        <div className="admin-toolbar-actions admin-editor-savebar studio-surface">
          <span className={`admin-editor-save-state ${dirty ? "is-unsaved" : "is-saved"}`} aria-live="polite">{busy ? "Saving headline and passage…" : dirty ? "Unsaved changes" : "No unsaved changes"}</span>
          {error && <p role="alert" className="admin-field-hint">{error}</p>}
          {publicationPending && <StudioButton type="button" disabled={busy} onClick={() => void checkPublication()}>Check publication status</StudioButton>}
          <StudioButton className="admin-publish-button" type="button" onClick={() => void submit(true)} disabled={blocked || !complete}>Save &amp; publish</StudioButton>
          <StudioButton type="button" onClick={() => void submit(false)} disabled={!dirty || blocked}><Save size={16} aria-hidden="true" />Save draft</StudioButton>
        </div>
      </aside>
    </>
  );
}
