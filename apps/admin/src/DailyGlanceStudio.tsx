import { useEffect, useMemo, useState } from "react";
import { Save, X } from "lucide-react";

import {
  dailyGlancePackageField,
  dailyGlancePairSearchText,
  type DailyGlancePair
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
          <input aria-label="Daily At-a-Glance person or chart" value={person} onChange={(event) => setPerson(event.target.value)} placeholder="Name or chart ID" required />
        </label>
        <label>
          <span>Local date</span>
          <input aria-label="Daily At-a-Glance local date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
        </label>
        <label>
          <span>Day boundary</span>
          <input aria-label="Daily At-a-Glance timezone" value={timeZone} readOnly />
        </label>
        <button className="admin-primary-button" type="submit" disabled={contextLoading || !person.trim()}>
          {contextLoading ? "Calculating…" : "Load current Moon write-up"}
        </button>
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
              <p>{dailyGlancePackageField(activePair.passageRow, "body_you")}</p>
              <hr />
              <p>{context.detailLine}</p>
              <button type="button" onClick={() => onOpenPair(activePair.selector)}>Edit this headline and passage</button>
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
              <small>{dailyGlancePackageField(pair.passageRow, "body_you")}</small>
            </div>
            <button type="button" onClick={() => onOpenPair(pair.selector)}>Edit write-up</button>
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
  onSave: (pair: DailyGlancePair, edits: DailyGlancePairEdits) => Promise<void>;
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

export function DailyGlancePairEditor({ context, isSaving, onClose, onSave, pair }: DailyGlancePairEditorProps) {
  const matchingContext = context?.selector === pair.selector ? context : null;
  const initial = useMemo<DailyGlancePairEdits>(() => ({
    headlineYou: dailyGlancePackageField(pair.headlineRow, "body_you"),
    headlineThey: dailyGlancePackageField(pair.headlineRow, "body_they"),
    passageYou: dailyGlancePackageField(pair.passageRow, "body_you"),
    passageThey: dailyGlancePackageField(pair.passageRow, "body_they")
  }), [pair]);
  const [edits, setEdits] = useState(initial);
  const [previewName, setPreviewName] = useState(() => matchingContext?.chart.name ?? "Alex");
  const [previewPronouns, setPreviewPronouns] = useState<DailyGlanceFriendPreviewPronouns>("they");

  useEffect(() => setEdits(initial), [initial]);
  useEffect(() => setPreviewName(matchingContext?.chart.name ?? "Alex"), [matchingContext?.chart.name, pair.selector]);

  const dirty = JSON.stringify(edits) !== JSON.stringify(initial);
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
      <button type="button" className="admin-editor-backdrop" aria-label="Close Daily At-a-Glance editor" onClick={close} disabled={isSaving} />
      <aside className="admin-editor-panel admin-review-detail admin-daily-glance-pair-editor" role="dialog" aria-modal="true" aria-label="Daily At-a-Glance paired editor" aria-busy={isSaving}>
        <div className="admin-editor-toolbar">
          <div>
            <p className="admin-eyebrow">Daily At-a-Glance</p>
            <h2>Edit {pair.label}</h2>
            <p>Headline and passage remain separate source keys, but are reviewed and saved here as one reader write-up.</p>
          </div>
          <div className="admin-editor-toolbar-actions">
            <button type="button" onClick={close} disabled={isSaving}><X size={16} aria-hidden="true" />Close</button>
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

          <section className="admin-daily-glance-audience" aria-label="You version">
            <div><p className="admin-eyebrow">You</p><h3>Signed-in reader</h3></div>
            <label className="admin-review-copy-editor"><span>Headline · You</span><textarea value={edits.headlineYou} onChange={(event) => setEdits((value) => ({ ...value, headlineYou: event.target.value }))} /></label>
            <label className="admin-review-copy-editor"><span>Passage · You</span><textarea value={edits.passageYou} onChange={(event) => setEdits((value) => ({ ...value, passageYou: event.target.value }))} /></label>
            <div className="admin-daily-glance-reader-card" aria-label="You reader preview">
              <h4>{edits.headlineYou}</h4><p>{edits.passageYou}</p>
              {matchingContext && <><hr /><p>{matchingContext.detailLine}</p></>}
            </div>
          </section>

          <section className="admin-daily-glance-audience" aria-label="Friend version">
            <div><p className="admin-eyebrow">Friend</p><h3>Selected person</h3></div>
            <p className="admin-daily-glance-name-contract">
              Daily uses <code>{"{{personPreferredName}}"}</code> for <strong>Name</strong> so the app can use the selected person's preferred name and fall back to their display name. <code>{"{{Name}}"}</code> is not part of this renderer's variable contract.
            </p>
            <label className="admin-review-copy-editor"><span>Headline · Friend</span><textarea value={edits.headlineThey} onChange={(event) => setEdits((value) => ({ ...value, headlineThey: event.target.value }))} /></label>
            <label className="admin-review-copy-editor"><span>Passage · Friend</span><textarea value={edits.passageThey} onChange={(event) => setEdits((value) => ({ ...value, passageThey: event.target.value }))} /></label>
            <div className="admin-daily-glance-preview-controls" aria-label="Friend preview values">
              <label>
                <span>Preview name</span>
                <input aria-label="Friend preview name" value={previewName} onChange={(event) => setPreviewName(event.target.value)} placeholder="Alex" />
              </label>
              <label>
                <span>Preview pronouns</span>
                <select aria-label="Friend preview pronouns" value={previewPronouns} onChange={(event) => setPreviewPronouns(event.target.value as DailyGlanceFriendPreviewPronouns)}>
                  <option value="they">They / them</option>
                  <option value="she">She / her</option>
                  <option value="he">He / him</option>
                </select>
              </label>
              <p>Preview values only. They are not saved into the approved source.</p>
            </div>
            <div className="admin-daily-glance-reader-card admin-daily-glance-friend-preview" aria-label="Friend reader preview">
              <p className="admin-eyebrow">Rendered Friend write-up</p>
              <h4>{renderFriendPreviewParts(friendHeadlineParts)}</h4>
              <p>{renderFriendPreviewParts(friendPassageParts)}</p>
              {matchingContext && <><hr /><p>{matchingContext.detailLine}</p></>}
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

          <details className="admin-advanced admin-editor-key-details">
            <summary>Source keys</summary>
            <code>{pair.headlineRow.content_key}</code>
            <code>{pair.passageRow.content_key}</code>
          </details>
        </section>

        <div className="admin-toolbar-actions admin-editor-savebar">
          <span className={`admin-editor-save-state ${dirty ? "is-unsaved" : "is-saved"}`} aria-live="polite">{isSaving ? "Saving both sources…" : dirty ? "Unsaved changes" : "All changes saved"}</span>
          <button className="admin-primary-button" type="button" onClick={() => void onSave(pair, edits)} disabled={!dirty || isSaving}><Save size={16} aria-hidden="true" />Save headline and passage</button>
        </div>
      </aside>
    </>
  );
}
