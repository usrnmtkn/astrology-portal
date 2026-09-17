import { StudioButton, StudioInput, StudioTextarea } from "./StudioControls";
import { AdminDisclosureSummary, AdminSelect } from "./AdminNativeControls";
import { useEffect, useMemo, useRef, useState } from "react";
import { skyRetrogradeBodies, type SkyPlacementSelection } from "./skyPlacementAssembly";
import SkyPlacementVariableKey, { SkyVariableText } from "./SkyPlacementVariableKey";
import SkyPlacementArticleVariables from "./SkyPlacementArticleVariables";
import SkyArticleAiWriter from "./SkyArticleAiWriter";
import { PageLoading } from "../../web/src/components/PageLoading";
// @ts-ignore Shared article-token validator used by publishing and readers.
import { isSkyPlacementArticleField, skyPlacementArticleVariableIssues, skyPlacementArticlePhraseNames } from "../../web/src/content/fallbackArchitectureV3/resolver/skyPlacementArticleVariables.mjs";
import SkyPhraseCompositionEditor from "./SkyPhraseCompositionEditor";
import SkyIngressComposer from "./SkyIngressComposer";
import SkyWritingLibraryEditor from "./SkyWritingLibraryEditor";
import SkyWritingSystemDetails from "./SkyWritingSystemDetails";
import SkySectionPacketEditor from "./SkySectionPacketEditor";
import {
  SKY_WRITING_LIBRARY_GROUPS,
  installSkyWritingLibrary,
  loadSkyWritingLibrarySeeds,
  preferSkyWritingLibrary,
  skyWritingLibraryInstalled,
  type SkyWritingLibraryComposition
} from "./skyWritingLibrary";
import { makeSkyArticleOutline, SKY_ARTICLE_OUTLINES, type SkyEditorialSection } from "./skyArticleOutlines";
// @ts-ignore Shared inline-variable contract used by the reader and save API.
import { isSkyPlacementVariableField, skyPlacementVariableFacts, skyPlacementVariableIssues } from "../../web/src/content/fallbackArchitectureV3/resolver/skyPlacementVariables.mjs";
// @ts-ignore Shared reader/editor schema; editor labels are never rendered as prose.
import { skyEvergreenLayout, SKY_EVERGREEN_SECTIONS_PATH } from "../../web/src/content/fallbackArchitectureV3/resolver/skyEvergreenSections.mjs";
// @ts-ignore Shared deterministic placement-composition starter.
import { makeSkyIngressComposition } from "../../web/src/content/fallbackArchitectureV3/resolver/skyIngressComposition.mjs";

type Field = { key: string; label: string; value: string };
type Props = {
  contentKey: string;
  fields: Field[];
  source?: Record<string, unknown>;
  kind: string;
  initialField?: string;
  selection?: SkyPlacementSelection;
  disabled: boolean;
  onChange: (path: string, value: unknown) => void;
  onLoadSource?: (key: string) => Promise<Record<string, any> | undefined>;
  onOpenSource: (key: string, path: string) => void;
};
const title = (value: string) => value.split("-").map(word => word[0]?.toUpperCase() + word.slice(1)).join(" ");

type EvergreenSection = SkyEditorialSection;

export default function SkyFallbackFieldsEditor({ contentKey, kind, fields: sourceFields, source, initialField, selection, disabled, onChange, onOpenSource, onLoadSource }: Props) {
  const [selectedField, setSelectedField] = useState(initialField ?? "");
  const [outline, setOutline] = useState("ingress");
  const [installingLibrary, setInstallingLibrary] = useState(false);
  const [libraryError, setLibraryError] = useState("");
  const [preparedLibrary, setPreparedLibrary] = useState<SkyWritingLibraryComposition | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const installRequestKey = useRef("");
  const placement = contentKey.match(/^sky-placement\/article\/([^/]+)\/([^/]+)$/u);
  const retrograde = contentKey.match(/^sky-placement\/retrograde\/([^/]+)$/u);
  const planet = placement?.[1] ?? retrograde?.[1] ?? "";
  const fields = planet ? sourceFields.map(field => ({ ...field, label: field.label.replace(/ draft$/u, "") })) : sourceFields;
  const sign = placement?.[2] ?? (selection?.planet === planet ? selection.sign : "");
  const hasSign = Boolean(sign && sign !== "all");
  const rxContext = Boolean(retrograde || skyRetrogradeBodies.has(planet) && selection?.planet === planet && selection.motion === "retrograde");
  const fallbackField = fields.find(field => field.key === (retrograde ? "Body" : "placementArticle")) ?? fields[0];
  const field = fields.find(item => item.key === selectedField) ?? fallbackField;
  const supportsVariables = field && isSkyPlacementVariableField(contentKey, field.key);
  const variableFacts = skyPlacementVariableFacts({ planet, sign, isRetrograde: rxContext });
  const supportsArticlePhrases = field && isSkyPlacementArticleField(contentKey, field.key);
  const variableIssues: string[] = supportsVariables ? supportsArticlePhrases
    ? skyPlacementArticleVariableIssues(field.value, { ...source, contentKey })
    : skyPlacementVariableIssues(field.value) : [];
  const evergreen: EvergreenSection[] = placement ? skyEvergreenLayout(source) : [];
  const initialLibrarySourceId = initialField?.match(/^ingress\.sources\.([A-Za-z][A-Za-z0-9]*)$/u)?.[1] ?? "";
  const initialLibraryField = SKY_WRITING_LIBRARY_GROUPS.flatMap(group => group.fields).find(item => item.id === initialLibrarySourceId);
  const ingressComposition = (source as Record<string, any> | undefined)?.ingress as SkyWritingLibraryComposition | undefined;
  const savedLibraryReady = skyWritingLibraryInstalled(ingressComposition);
  // Existing libraries may predate newly registered sign fields. Make those
  // fields editable immediately without changing the saved section order.
  const activeLibrary = useMemo(() => savedLibraryReady && ingressComposition
    ? { ...installSkyWritingLibrary(ingressComposition), modules: ingressComposition.modules }
    : preparedLibrary, [savedLibraryReady, ingressComposition, preparedLibrary]);
  const libraryReady = skyWritingLibraryInstalled(activeLibrary);
  const sourceRef = useRef(source);
  const onChangeRef = useRef(onChange);
  const onLoadSourceRef = useRef(onLoadSource);
  const ingressCompositionRef = useRef(ingressComposition);
  sourceRef.current = source;
  onChangeRef.current = onChange;
  onLoadSourceRef.current = onLoadSource;
  ingressCompositionRef.current = ingressComposition;
  const move = (index: number, offset: number) => {
    const next = [...evergreen];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    onChange(SKY_EVERGREEN_SECTIONS_PATH, next);
  };
  const selectedSection = evergreen.find(section => `${SKY_EVERGREEN_SECTIONS_PATH}.${section.id}` === field?.key && !section.source);
  const selectedBlock = evergreen.find(section => (section.source ? `fallback.${section.source}` : `${SKY_EVERGREEN_SECTIONS_PATH}.${section.id}`) === field?.key);
  const changeSection = (patch: Partial<EvergreenSection>) => onChange(SKY_EVERGREEN_SECTIONS_PATH,
    evergreen.map(section => section.id === selectedSection?.id ? { ...section, ...patch } : section));
  const changeWriting = (value: string) => selectedSection ? changeSection({ body: value }) : field && onChange(field.key, value);
  const insertVariable = (token: string) => {
    const input = textarea.current;
    if (!input || !field || disabled) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    changeWriting(field.value.slice(0, start) + token + field.value.slice(end));
    requestAnimationFrame(() => {
      input.focus({ preventScroll: true });
      input.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const articleNeedsLibrary = ["placementArticle", "placementArticleDirect", "placementArticleRetrograde"]
    .some(path => skyPlacementArticlePhraseNames((source as Record<string, any> | undefined)?.[path]).some((name: string) => !(source as Record<string, any> | undefined)?._studioVariables?.some((item: any) => item.name === name)));
  const [articleLibraryRequested, setArticleLibraryRequested] = useState(false);
  const [showComposition, setShowComposition] = useState(false);
  const [showLibraryComposer, setShowLibraryComposer] = useState(false);
  const libraryRequested = Boolean(initialLibrarySourceId || articleNeedsLibrary || articleLibraryRequested);

  // Article insertion, pasted templates, and direct phrase edits prepare the Writing Library in draft
  // and open the exact named source, rather than falling back to Placement article.
  // Keep the prepared composition locally too: the parent draft update is
  // asynchronous, and the field editor must not sit on a permanent Loading state
  // while waiting for that updated source prop to round-trip back into this modal.
  // Parent inventory/loading renders also recreate callbacks, so read callback/source
  // identities through refs instead of restarting and cancelling the seed request.
  useEffect(() => {
    const attemptKey = contentKey;
    if (!placement || !libraryRequested || libraryReady || disabled || installRequestKey.current === attemptKey) return;
    installRequestKey.current = attemptKey;
    let cancelled = false;
    setInstallingLibrary(true);
    setLibraryError("");
    void (async () => {
      const sourceRecord = { ...(sourceRef.current ?? {}), contentKey } as Record<string, any>;
      const { values } = await loadSkyWritingLibrarySeeds(sourceRecord, planet, sign, onLoadSourceRef.current);
      if (cancelled) return;
      const starter = ingressCompositionRef.current ?? makeSkyIngressComposition() as SkyWritingLibraryComposition;
      const installed = installSkyWritingLibrary(starter, values);
      const prepared = articleLibraryRequested
        ? preferSkyWritingLibrary(installed)
        : installed;
      if (!articleLibraryRequested && articleNeedsLibrary && !initialLibrarySourceId) prepared.modules = starter.modules;
      setPreparedLibrary(prepared);
      onChangeRef.current("ingress", prepared);
    })().catch(reason => {
      if (!cancelled) setLibraryError(reason instanceof Error ? reason.message : "The Writing Library could not be prepared.");
    }).finally(() => {
      if (!cancelled) setInstallingLibrary(false);
      if (installRequestKey.current === attemptKey) installRequestKey.current = "";
    });
    return () => {
      cancelled = true;
      if (installRequestKey.current === attemptKey) installRequestKey.current = "";
    };
  }, [contentKey, libraryRequested, libraryReady, disabled, planet, sign, Boolean(placement)]);

  // This component is deferred. Focus after it mounts, rather than racing the
  // dashboard's scroll request against a lazy-loaded editor.
  useEffect(() => {
    if (!initialLibrarySourceId) setSelectedField(initialField ?? "");
  }, [initialField, initialLibrarySourceId]);

  useEffect(() => {
    if (!initialField || initialLibrarySourceId) return;
    const frame = requestAnimationFrame(() => {
      textarea.current?.focus({ preventScroll: true });
      textarea.current?.scrollIntoView({ block: "center", behavior: "auto" });
    });
    return () => cancelAnimationFrame(frame);
  }, [initialField, initialLibrarySourceId, field?.key]);

  if (placement && initialLibrarySourceId) return <section className="admin-sky-writing-editor" aria-label="Phrase variable editor">
    <p className="admin-field-hint">This phrase belongs to {title(planet)} in {title(sign)}. It is separate from the placement article. Nothing is published until you use Save &amp; publish.</p>
    {libraryError && <p role="alert">{libraryError}</p>}
    {!libraryReady || !activeLibrary ? <PageLoading compact message={installingLibrary ? `Loading ${initialLibraryField?.label ?? initialLibrarySourceId} for ${title(planet)} in ${title(sign)}…` : `Preparing ${initialLibraryField?.label ?? initialLibrarySourceId}…`} />
      : <>
        <SkyWritingLibraryEditor
          contentKey={contentKey}
          planet={planet}
          sign={sign}
          sourceRecord={{ ...(source ?? {}), contentKey, ingress: activeLibrary }}
          composition={activeLibrary}
          disabled={disabled}
          initialSourceId={initialLibrarySourceId}
          onChange={value => { setPreparedLibrary(value); onChange("ingress", value); }}
          onOpenSource={onOpenSource}
          onLoadSource={onLoadSource}
          onAdvancedSource={() => setShowComposition(true)}
        />
        <details className="admin-workspace-details" open={showComposition} onToggle={event => setShowComposition(event.currentTarget.open)}>
          <AdminDisclosureSummary>Placement composition</AdminDisclosureSummary>
          <p>Section templates, motion, and aspect modules. Open this only when you need to assemble the placement, not to edit this phrase.</p>
          {showComposition && <SkyIngressComposer source={{ ...(source ?? {}), contentKey, ingress: activeLibrary }} motion={rxContext ? "retrograde" : "direct"} disabled={disabled}
            hideLibrary initialField={initialField} onChange={value => { setPreparedLibrary(value); onChange("ingress", value); }} onOpenSource={onOpenSource} onLoadSource={onLoadSource} />}
        </details>
      </>}
  </section>;

  if (!planet) return <section className="admin-sky-edition-fields" aria-label="Editable fallback fields">
    <header>
      <p className="admin-eyebrow">Editable copy</p>
      <h3>{kind === "article" ? "Article paragraphs" : "Aspect audience versions"}</h3>
      <p>{kind === "article" ? "Each field is a section of the complete article, not a reusable variable." : "Each field is the complete aspect passage for its named reader surface."}</p>
    </header>
    {fields.map(item => <label className="admin-review-copy-editor" key={item.key}>
      <span>{item.label}</span>
      <small className="admin-field-hint">Internal source field: <code>{item.key}</code></small>
      <StudioTextarea ref={item.key === initialField ? textarea : undefined} disabled={disabled} aria-label={`Fallback field ${item.label}`} data-sky-field={item.key} value={item.value} onChange={event => onChange(item.key, event.target.value)} />
    </label>)}
  </section>;

  return <section className="admin-sky-writing-editor" aria-label="Writing editor">
    {planet && <div className="admin-sky-writing-context" aria-label="Placement writing context">
      <strong>{title(planet)}{rxContext ? " Rx" : ""}{hasSign ? ` in ${title(sign)}` : " · all signs"}</strong>
      <p>{retrograde
        ? `This is the retrograde opening. It appears before the shared placement writing and is reused for ${title(planet)} retrograde in every sign.`
        : skyRetrogradeBodies.has(planet) ? `Choose a shared article or a motion-specific article for ${title(planet)} in ${title(sign)}. Each fallback block can also target direct or retrograde motion.` : `The placement article and fallback hooks describe ${title(planet)} in ${title(sign)}.`}</p>
      <div className="admin-sky-writing-source-actions" role="group" aria-label="Choose writing source">
        {retrograde
          ? <><span className="ui-pill">Editing retrograde writing</span>{hasSign && <StudioButton type="button" disabled={disabled} onClick={() => onOpenSource(`sky-placement/article/${planet}/${sign}`, "placementArticle")}>Edit shared placement writing</StudioButton>}</>
          : <><span className="ui-pill">Editing placement writing</span>{skyRetrogradeBodies.has(planet) && <StudioButton type="button" disabled={disabled} onClick={() => onOpenSource(`sky-placement/retrograde/${planet}`, "Body")}>Edit retrograde writing</StudioButton>}</>}
      </div>
    </div>}
    {field ? <>
      <label className="admin-field-wide">
        <span>Writing section</span>
        <AdminSelect aria-label="Writing section" value={field.key} onChange={event => setSelectedField(event.target.value)}>
          {fields.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
        </AdminSelect>
      </label>
      {selectedSection && <label className="admin-field-wide"><span>Section name</span>
        <StudioInput aria-label="Section name" value={selectedSection.label ?? ""} maxLength={120} disabled={disabled} onChange={event => changeSection({ label: event.target.value })} />
        <small className="admin-field-hint">For organizing your writing in Studio. Readers see the passage only.</small>
      </label>}
      {selectedBlock && !selectedSection?.paragraphs && !selectedSection?.items && <StudioButton type="button" disabled={disabled} onClick={() => {
        const { source: _source, body: _body, phrases, ...block } = selectedBlock;
        onChange(SKY_EVERGREEN_SECTIONS_PATH, evergreen.map(section => section.id === block.id ? {
          ...block, label: field.label, role: block.role ?? "main", depth: block.depth ?? "standard",
          paragraphs: [{ id: `paragraph-${crypto.randomUUID()}`, job: "Existing passage", phrases: phrases ?? [{ id: `phrase-${crypto.randomUUID()}`, text: field.value, joinBefore: "", source: `${contentKey}#${field.key}` }] }]
        } : section));
        setSelectedField(`${SKY_EVERGREEN_SECTIONS_PATH}.${block.id}`);
      }}>Organize into paragraphs</StudioButton>}
      {selectedBlock && !selectedSection?.phrases && !selectedSection?.paragraphs && !selectedSection?.items && <StudioButton type="button" disabled={disabled} onClick={() => {
        const { source: originalSource, body: _body, ...block } = selectedBlock;
        onChange(SKY_EVERGREEN_SECTIONS_PATH, evergreen.map(section => section.id === block.id ? {
          ...block, label: field.label, phrases: [{ id: `phrase-${crypto.randomUUID()}`, text: field.value, joinBefore: "", source: `${contentKey}#${field.key}` }]
        } : section));
        setSelectedField(`${SKY_EVERGREEN_SECTIONS_PATH}.${block.id}`);
      }}>Compose from phrases</StudioButton>}
      {selectedSection && (selectedSection.paragraphs || selectedSection.items) ? <SkySectionPacketEditor section={selectedSection} disabled={disabled} facts={variableFacts} onChange={changeSection} /> : selectedSection?.phrases ? <SkyPhraseCompositionEditor phrases={selectedSection.phrases} disabled={disabled} facts={variableFacts} onChange={phrases => changeSection({ phrases })} /> : <label className="admin-review-copy-editor">
        <span>{field.label}</span>
        {retrograde && <small className="admin-field-hint">{field.key === "Body" ? "The full opening paragraph on the retrograde detail page." : "The short version used by retrograde cards. It does not replace the detail-page opening."}</small>}
        {field.key.startsWith("fallback.") && <small className="admin-field-hint">Legacy fallback field. It remains available for existing serving copy, but new reusable writing belongs in the Writing library below.</small>}
        <StudioTextarea ref={textarea} className="admin-copy-field-body" aria-label={`Fallback field ${field.label}`} data-sky-field={field.key}
          value={field.value} disabled={disabled} aria-invalid={variableIssues.length > 0 || undefined} onChange={event => changeWriting(event.target.value)} />
      </label>}
      <p className="admin-sky-writing-count">{field.value.trim() ? field.value.trim().split(/\s+/u).length : 0} words · {field.value.length} characters</p>
      {placement && ["placementArticle", "placementArticleDirect", "placementArticleRetrograde"].includes(field.key)
        && !selectedSection?.phrases && !selectedSection?.paragraphs && !selectedSection?.items
        && <SkyArticleAiWriter planet={planet} sign={sign} field={field.key} currentText={field.value} disabled={disabled} onUse={changeWriting} />}
      {supportsVariables && !selectedSection?.phrases && !selectedSection?.paragraphs && !selectedSection?.items && (supportsArticlePhrases
        ? <SkyPlacementArticleVariables key={contentKey} contentKey={contentKey} planet={planet} sign={sign} motion={rxContext ? "retrograde" : "direct"}
          fieldPath={field.key} value={field.value} source={activeLibrary ? { ...source, ingress: activeLibrary } : source} disabled={disabled} onInsert={insertVariable}
          preparing={installingLibrary} preparationError={libraryError} onLoadSource={onLoadSource} onOpenSource={onOpenSource}
          onPrepareLibrary={() => setArticleLibraryRequested(true)}
          onApplyPlanetSignTemplate={() => {
            setArticleLibraryRequested(true);
            const current = activeLibrary ?? ingressComposition;
            if (!current || !skyWritingLibraryInstalled(current)) return;
            const preferred = preferSkyWritingLibrary(current);
            setPreparedLibrary(preferred);
            onChange("ingress", preferred);
          }}
          onReplaceBody={changeWriting}
          onCompositionChange={value => { setPreparedLibrary(value); onChange("ingress", value); }} />
        : <SkyPlacementVariableKey facts={variableFacts} onInsert={insertVariable} disabled={disabled} />)}
      {variableIssues.length > 0 && <div role="alert">{variableIssues.map(issue => <p key={issue}>{issue}</p>)}</div>}
      {!supportsArticlePhrases && <details className="admin-workspace-details">
        <AdminDisclosureSummary>Preview this section</AdminDisclosureSummary>
        <p className="admin-sky-writing-preview">{field.value ? supportsVariables ? <SkyVariableText value={field.value} facts={variableFacts} /> : field.value : "No writing saved for this section."}</p>
      </details>}
    </> : <p>No editable writing fields are available for this source.</p>}
    {placement && <SkyWritingSystemDetails system="placement" />}
    {placement && <details className="admin-workspace-details" open={showLibraryComposer} onToggle={event => setShowLibraryComposer(event.currentTarget.open)}>
      <AdminDisclosureSummary>Writing library & placement composition</AdminDisclosureSummary>
      <p>Edit reusable planet language, zodiac-sign lore, planet × sign synthesis, experience hooks, aspect writing, and optional context here. Open this only when you need the library or to assemble sections.</p>
      {showLibraryComposer && <SkyIngressComposer source={{ ...source, contentKey }} motion={rxContext ? "retrograde" : "direct"} disabled={disabled}
        initialField={initialField} onChange={value => onChange("ingress", value)} onOpenSource={onOpenSource} onLoadSource={onLoadSource} />}
    </details>}
    {placement && <details className="admin-workspace-details admin-evergreen-sections" open={field?.key.startsWith("fallback.") || undefined}>
      <AdminDisclosureSummary>Legacy evergreen sections</AdminDisclosureSummary>
      <p>These blocks remain editable so existing serving fallbacks can be reviewed or repaired without losing history. For new reusable placement writing, use the Writing library above. Complete placement articles and eligible placement composition still keep their existing resolver priority.</p>
      <ol aria-label="Evergreen section order">
        {evergreen.map((section, index) => {
          const path = section.source ? `fallback.${section.source}` : `${SKY_EVERGREEN_SECTIONS_PATH}.${section.id}`;
          const item = fields.find(item => item.key === path);
          return <li key={section.id}>
            <StudioButton type="button" className="admin-evergreen-section-name" aria-pressed={field?.key === path} onClick={() => { setSelectedField(path); textarea.current?.focus({ preventScroll: true }); }}>
              {item?.label || "Untitled section"}<small>{item?.value.trim() ? "Has writing" : "Empty · skipped"} · {section.motion && section.motion !== "all" ? section.motion : "shared"}</small>
            </StudioButton>
            <label>Motion<AdminSelect aria-label={`Motion for ${item?.label || "section"}`} disabled={disabled} value={section.motion ?? "all"} onChange={event => onChange(SKY_EVERGREEN_SECTIONS_PATH, evergreen.map(block => block.id === section.id ? { ...block, motion: event.target.value } : block))}>
              <option value="all">Shared</option><option value="direct">Direct</option>{skyRetrogradeBodies.has(planet) && <option value="retrograde">Retrograde</option>}
            </AdminSelect></label>
            <div role="group" aria-label={`Arrange ${item?.label || "section"}`}>
              <StudioButton type="button" disabled={disabled || index === 0} aria-label={`Move ${item?.label || "section"} up`} onClick={() => move(index, -1)}>↑</StudioButton>
              <StudioButton type="button" disabled={disabled || index === evergreen.length - 1} aria-label={`Move ${item?.label || "section"} down`} onClick={() => move(index, 1)}>↓</StudioButton>
              {!section.source && <StudioButton type="button" disabled={disabled} aria-label={`Remove ${item?.label || "section"}`} onClick={() => {
                if ((item?.value.trim() || section.paragraphs || section.items || section.phrases?.some(phrase => phrase.text.trim())) && !window.confirm("Remove this section from the evergreen passage? Save & publish applies the removal.")) return;
                onChange(SKY_EVERGREEN_SECTIONS_PATH, evergreen.filter(item => item.id !== section.id));
                if (selectedSection?.id === section.id) setSelectedField("fallback.hook");
              }}>Remove</StudioButton>}
            </div>
          </li>;
        })}
      </ol>
      <StudioButton type="button" disabled={disabled || evergreen.length >= 24} onClick={() => {
        const id = `section-${crypto.randomUUID()}`;
        onChange(SKY_EVERGREEN_SECTIONS_PATH, [...evergreen, { id, label: "New section", body: "", motion: rxContext ? "retrograde" : "direct" }]);
        setSelectedField(`${SKY_EVERGREEN_SECTIONS_PATH}.${id}`);
        textarea.current?.focus({ preventScroll: true });
      }}>Add section</StudioButton>
      <label className="admin-field-wide"><span>Article structure</span>
        <AdminSelect aria-label="Article structure" value={outline} disabled={disabled} onChange={event => setOutline(event.target.value)}>
          {SKY_ARTICLE_OUTLINES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </AdminSelect>
      </label>
      <p>Add an empty editorial outline after your existing sections. Choose a structure appropriate to this source. It supplies paragraph jobs, not writing or additional calculated facts. The existing article, date, and personal-horoscope sections keep their current behavior.</p>
      <StudioButton type="button" disabled={disabled || evergreen.length + (SKY_ARTICLE_OUTLINES.find(item => item.id === outline)?.sections.length ?? 0) > 24} onClick={() => {
        const additions = makeSkyArticleOutline(outline, rxContext ? "retrograde" : "direct");
        onChange(SKY_EVERGREEN_SECTIONS_PATH, [...evergreen, ...additions]);
        if (additions[0]) setSelectedField(`${SKY_EVERGREEN_SECTIONS_PATH}.${additions[0].id}`);
      }}>Add article outline</StudioButton>
    </details>}

  </section>;
}