// @ts-ignore Shared deterministic dignity resolution and explicit draft migration.
import { placementDignityForSource, migrateLegacyDignityComposition } from "../../web/src/content/fallbackArchitectureV3/resolver/placementDignityMeaning.mjs";
import { zodiacSeasonSourceKey } from "../../web/src/content/fallbackArchitectureV3/resolver/zodiacSeasonVariables.mjs";
import { useEffect, useRef, useState } from "react";
import { StudioButton, StudioTextarea } from "./StudioControls";
import { AdminDisclosureSummary } from "./AdminNativeControls";
import {
  SKY_WRITING_LIBRARY_FIELD_IDS,
  SKY_WRITING_LIBRARY_GROUPS,
  installSkyWritingLibrary,
  loadSkyWritingLibrarySeeds,
  preferSkyWritingLibrary,
  skyWritingLibraryInstalled,
  skyWritingLibraryIsPrimary,
  skyWritingLibrarySourceModuleEnabled,
  toggleSkyWritingLibrarySourceModule,
  type SkyWritingLibraryComposition,
  type SkyWritingLibrarySource
} from "./skyWritingLibrary";

type RecordValue = Record<string, any>;
type Props = {
  contentKey: string;
  planet: string;
  sign: string;
  sourceRecord: RecordValue;
  composition: SkyWritingLibraryComposition;
  disabled: boolean;
  initialSourceId?: string;
  onChange: (composition: SkyWritingLibraryComposition) => void;
  onOpenSource: (contentKey: string, field: string) => void;
  onLoadSource?: (contentKey: string) => Promise<RecordValue | undefined>;
  onAdvancedSource: (sourceId: string) => void;
};

function updateSource(composition: SkyWritingLibraryComposition, id: string, source: SkyWritingLibrarySource) {
  return { ...composition, sources: { ...composition.sources, [id]: source } };
}

function filledLibraryFields(composition: SkyWritingLibraryComposition) {
  return SKY_WRITING_LIBRARY_FIELD_IDS.filter(id => {
    const source = composition.sources[id];
    return Boolean(source?.reference || source?.text?.trim());
  }).length;
}

function libraryFieldText(source?: SkyWritingLibrarySource) {
  if (!source || source.reference) return "";
  return typeof source.text === "string" ? source.text : "";
}

export default function SkyWritingLibraryEditor({ contentKey, planet, sign, sourceRecord, composition, disabled, initialSourceId, onChange, onOpenSource, onLoadSource, onAdvancedSource }: Props) {
  const installed = skyWritingLibraryInstalled(composition);
  const workingComposition = installed ? installSkyWritingLibrary(composition) : composition;
  const primary = skyWritingLibraryIsPrimary(workingComposition);
  const [seeding, setSeeding] = useState(false);
  const [seedStatus, setSeedStatus] = useState("");
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const initialTextarea = useRef<HTMLTextAreaElement>(null);
  const initialField = initialSourceId
    ? SKY_WRITING_LIBRARY_GROUPS.flatMap(group => group.fields.map(item => ({ ...item, groupId: group.id, groupLabel: group.label }))).find(item => item.id === initialSourceId)
    : undefined;

  useEffect(() => {
    if (!installed || !initialSourceId) return;
    const frame = requestAnimationFrame(() => {
      initialTextarea.current?.focus({ preventScroll: true });
      initialTextarea.current?.scrollIntoView({ block: "center", behavior: "auto" });
    });
    return () => cancelAnimationFrame(frame);
  }, [installed, initialSourceId]);

  const loadSourceRef = useRef(onLoadSource);
  loadSourceRef.current = onLoadSource;
  const previewKey = JSON.stringify(Object.fromEntries(
    SKY_WRITING_LIBRARY_FIELD_IDS.map(id => [id, workingComposition.sources[id]?.reference?.contentKey ?? workingComposition.sources[id]?.text ?? ""])
  ));
  useEffect(() => {
    let active = true;
    const load = loadSourceRef.current;
    void (async () => {
      const next: Record<string, string> = {};
      const linked = new Map<string, RecordValue | undefined>();
      for (const field of SKY_WRITING_LIBRARY_GROUPS.flatMap(group => group.fields)) {
        const source = workingComposition.sources[field.id];
        const local = libraryFieldText(source);
        if (local) {
          next[field.id] = local;
          continue;
        }
        const key = source?.reference?.contentKey
          ?? (field.shared ? zodiacSeasonSourceKey(field.id, sign) : "");
        if (!key || !load) continue;
        let row = linked.get(key);
        if (!linked.has(key)) {
          try { row = await load(key); } catch { row = undefined; }
          linked.set(key, row);
        }
        const path = source?.reference?.field ?? "body";
        const nested = path.match(/^ingress\.sources\.([A-Za-z][A-Za-z0-9]*)$/u)?.[1];
        next[field.id] = nested
          ? libraryFieldText(row?.ingress?.sources?.[nested])
          : typeof row?.body === "string" ? row.body : typeof row?.body_you === "string" ? row.body_you : "";
      }
      if (active) setPreviews(next);
    })();
    return () => { active = false; };
  }, [previewKey, sign]);

  const dignity = placementDignityForSource({ contentKey }, { planet, sign });
  const legacyDignity = workingComposition.sources.dignitySentence;
  const hasLegacyDignity = Boolean(legacyDignity?.reference || legacyDignity?.text?.trim());
  function migrateDignity() {
    if (disabled) return;
    try {
      onChange(migrateLegacyDignityComposition(workingComposition, { contentKey }));
      setSeedStatus("Saved dignity wording copied exactly to placementDignityMeaning in this draft. The legacy source remains intact. Save and publication are separate actions.");
    } catch (reason) {
      setSeedStatus(reason instanceof Error ? reason.message : "Dignity migration could not be completed.");
    }
  }
  const dignityDetails = <div className="admin-editor-guidance" data-testid="placement-dignity-selection">
    <p>Calculated dignity: <code>{dignity.status === "known" ? dignity.dignities.join(" and ") || "no major sign condition" : dignity.status === "not_applicable" ? "not applicable" : "invalid placement"}</code></p>
    <p>{dignity.status === "not_applicable"
      ? dignity.reason
      : dignity.status !== "known"
        ? dignity.reason || "A valid planet and zodiac sign are required for dignity selection."
        : "The selected planet and sign choose the paragraph variation. Complete the placement-specific fields below, or preserve a complete authored paragraph. No model chooses the condition or fills missing writing."}</p>
    {hasLegacyDignity && <StudioButton type="button" disabled={disabled} onClick={migrateDignity}>Migrate saved dignity paragraph</StudioButton>}
  </div>;

  async function fillFromGovernedSources() {
    if (disabled || seeding) return;
    setSeeding(true);
    setSeedStatus("");
    try {
      const before = filledLibraryFields(workingComposition);
      const { values, provenance } = await loadSkyWritingLibrarySeeds(sourceRecord, planet, sign, onLoadSource);
      const next = installSkyWritingLibrary(workingComposition, values);
      const after = filledLibraryFields(next);
      onChange(next);
      const added = Math.max(0, after - before);
      const available = Object.values(values).filter(value => value.trim()).length;
      setSeedStatus(`${added} empty field${added === 1 ? "" : "s"} filled. ${available} governed source value${available === 1 ? " was" : "s were"} available; existing writing was not overwritten.${Object.keys(provenance).length ? "" : " No reusable source copy was available."}`);
    } catch (reason) {
      setSeedStatus(reason instanceof Error ? reason.message : "Writing library sources could not be loaded.");
    } finally {
      setSeeding(false);
    }
  }

  function openLibraryField(fieldId: string) {
    const field = SKY_WRITING_LIBRARY_GROUPS.flatMap(group => group.fields).find(item => item.id === fieldId);
    const target = workingComposition.sources[fieldId];
    if (field?.shared && !target) {
      onOpenSource(zodiacSeasonSourceKey(fieldId, sign), "body");
      return;
    }
    if (target?.reference) {
      onOpenSource(target.reference.contentKey, target.reference.field);
      return;
    }
    onOpenSource(contentKey, `ingress.sources.${fieldId}`);
  }

  const phraseCatalog = initialSourceId ? <section className="admin-sky-writing-library-catalog" aria-label="Other writing library phrases">
    <p>Other phrases for this placement. Read them here; open one only when you need to change it.</p>
    {SKY_WRITING_LIBRARY_GROUPS.map(group => (
      <div className="admin-review-stack" key={group.id}>
        <p><strong>{group.label}</strong></p>
        {group.fields.filter(item => item.id !== initialSourceId).map(item => (
          <article className="admin-editor-guidance" key={item.id}>
            <p><strong>{item.label}</strong> <code>{`{{${item.id}}}`}</code></p>
            <p className="studio-variable-value">{previews[item.id]?.trim() || "No writing saved yet."}</p>
            <StudioButton type="button" disabled={disabled} onClick={() => openLibraryField(item.id)}>Edit {item.label.toLowerCase()}</StudioButton>
          </article>
        ))}
      </div>
    ))}
  </section> : null;

  if (initialField && initialSourceId && initialField.shared && !workingComposition.sources[initialSourceId]) {
    const sharedKey = zodiacSeasonSourceKey(initialSourceId, sign);
    return <>
      <section className="admin-sky-writing-editor admin-sky-single-variable-editor" aria-label={`Edit ${initialField.label}`}>
        <header className="admin-sky-writing-context">
          <p className="admin-eyebrow">{initialField.groupLabel}</p>
          <h4>{initialField.label} <code>{`{{${initialSourceId}}}`}</code></h4>
          <p>{initialField.description} One source per sign is shared across Content Studio.</p>
        </header>
        <p className="studio-variable-value">{previews[initialSourceId]?.trim() || "No writing saved yet."}</p>
        <p><code>{sharedKey}#body</code></p>
        <StudioButton type="button" disabled={disabled} onClick={() => onOpenSource(sharedKey, "body")}>Edit {initialField.label.toLowerCase()}</StudioButton>
      </section>
      {phraseCatalog}
    </>;
  }

  if (!installed) return <section className="admin-sky-writing-context" aria-label="Sky writing library">
    <p className="admin-eyebrow">Editable writing library</p>
    <h4>{initialField?.label ?? "Planet · sign · placement · experiences"}</h4>
    <p>{initialField
      ? `Prepare the governed Writing Library value for ${initialField.label.toLowerCase()}. Nothing is generated and nothing is published by this action.`
      : "Add the reusable phrase fields and prefill only fields that have a clean existing source. Nothing new is generated and nothing is published by this action."}</p>
    <StudioButton type="button" disabled={disabled || seeding} onClick={() => void fillFromGovernedSources()}>{seeding ? "Loading governed sources…" : initialField ? `Prepare ${initialField.label.toLowerCase()}` : "Add prefilled writing library"}</StudioButton>
    {seedStatus && <p role="status">{seedStatus}</p>}
  </section>;

  if (initialField && initialSourceId) {
    const source = workingComposition.sources[initialSourceId];
    if (!source) return <p role="alert">This Writing Library field is not available.</p>;
    const reference = source.reference;
    return <>
    <section className="admin-sky-writing-editor admin-sky-single-variable-editor" aria-label={`Edit ${initialField.label}`}>
      <header className="admin-sky-writing-context">
        <p className="admin-eyebrow">{initialField.groupLabel}</p>
        <h4>{initialField.label} <code>{`{{${initialSourceId}}}`}</code></h4>
        <p>{initialField.description}</p>
      </header>
      {initialSourceId.startsWith("placementDignity") && dignityDetails}
      {seedStatus && <p role="status">{seedStatus}</p>}
      <label className="admin-review-copy-editor">
        <span>{initialField.label}</span>
        {reference ? <>
          <p>Linked source: <code>{reference.contentKey}#{reference.field}</code></p>
          {previews[initialSourceId]?.trim() ? <p className="studio-variable-value">{previews[initialSourceId]}</p> : null}
          <div className="admin-sky-writing-source-actions">
            <StudioButton type="button" onClick={() => onOpenSource(reference.contentKey, reference.field)}>Edit linked source</StudioButton>
            <StudioButton type="button" disabled={disabled} onClick={() => onChange(updateSource(workingComposition, initialSourceId, { kind: source.kind, text: "" }))}>Use local writing</StudioButton>
          </div>
        </> : <StudioTextarea
          ref={initialTextarea}
          rows={initialField.rows ?? 4}
          aria-label={`Writing library ${initialField.label}`}
          className="admin-copy-field-body"
          disabled={disabled}
          value={source.text ?? ""}
          onChange={event => onChange(updateSource(workingComposition, initialSourceId, { ...source, text: event.target.value }))}
        />}
      </label>
      {initialField.groupId === "experiences" && <StudioButton
        type="button"
        aria-pressed={skyWritingLibrarySourceModuleEnabled(workingComposition, initialSourceId)}
        disabled={disabled || (!skyWritingLibrarySourceModuleEnabled(workingComposition, initialSourceId) && workingComposition.modules.length >= 32)}
        onClick={() => onChange(toggleSkyWritingLibrarySourceModule(workingComposition, initialSourceId, initialField.label))}
      >{skyWritingLibrarySourceModuleEnabled(workingComposition, initialSourceId) ? "Remove from fallback" : "Include in fallback"}</StudioButton>}
      <details className="admin-workspace-details">
        <AdminDisclosureSummary>Source details</AdminDisclosureSummary>
        <p><code>{contentKey}#ingress.sources.{initialSourceId}</code></p>
        <StudioButton type="button" disabled={disabled} onClick={() => onAdvancedSource(initialSourceId)}>Advanced source tools</StudioButton>
      </details>
    </section>
    {phraseCatalog}
    </>;
  }

  return <section className="admin-sky-writing-editor" aria-label="Sky writing library">
    <div className="admin-sky-writing-context">
      <p className="admin-eyebrow">Editable writing library</p>
      <h4>Planet · sign · placement · experiences</h4>
      <p>Edit reusable writing here. Empty optional fields stay empty instead of receiving invented prose.</p>
      <div className="admin-sky-writing-source-actions">
        <StudioButton type="button" disabled={disabled || seeding} onClick={() => void fillFromGovernedSources()}>{seeding ? "Loading governed sources…" : "Fill empty fields from source library"}</StudioButton>
        {!primary && <StudioButton type="button" disabled={disabled} onClick={() => onChange(preferSkyWritingLibrary(workingComposition))}>Use writing library as primary fallback structure</StudioButton>}
      </div>
      {seedStatus && <p role="status">{seedStatus}</p>}
      <p role="status"><strong>{primary ? "Writing library is the primary V5 fallback structure in this draft." : "The existing V5 structure still controls required fallback sections."}</strong></p>
      <p>Source filling never overwrites writing you have already saved or linked. Save & publish remains a separate owner action.</p>
    </div>

    {SKY_WRITING_LIBRARY_GROUPS.map((group, groupIndex) => <details className="admin-workspace-details" key={group.id} open={groupIndex < 3 || undefined}>
      <AdminDisclosureSummary>{group.label}</AdminDisclosureSummary>
      <p>{group.description}</p>
      {group.id === "placement" && dignityDetails}
      {group.id === "experiences" && <p>An experience can live in the library without appearing in reader copy. Include only manifestations that genuinely belong in this article.</p>}
      <div className="admin-review-stack">
        {group.fields.map(item => {
          if (item.shared && !workingComposition.sources[item.id]) return <div className="admin-editor-guidance" key={item.id}>
            <p>{item.label} <code>{`{{${item.id}}}`}</code></p>
            <p>{item.description} One source per sign is shared across Content Studio.</p>
            <p className="studio-variable-value">{previews[item.id]?.trim() || "No writing saved yet."}</p>
            <StudioButton type="button" disabled={disabled} onClick={() => onOpenSource(zodiacSeasonSourceKey(item.id, sign), "body")}>Edit {item.label.toLowerCase()}</StudioButton>
          </div>;
          const source = workingComposition.sources[item.id];
          if (!source) return null;
          const reference = source.reference;
          const included = group.id === "experiences" && skyWritingLibrarySourceModuleEnabled(workingComposition, item.id);
          return <div className="admin-editor-guidance" key={item.id}>
            <label className="admin-review-copy-editor">
              <span><strong>{item.label}</strong> <code>{`{{${item.id}}}`}</code></span>
              <small>{item.description}</small>
              {reference ? <>
                <p>Linked source: <code>{reference.contentKey}#{reference.field}</code></p>
                {previews[item.id]?.trim() ? <p className="studio-variable-value">{previews[item.id]}</p> : null}
                <div className="admin-sky-writing-source-actions">
                  <StudioButton type="button" onClick={() => onOpenSource(reference.contentKey, reference.field)}>Edit linked source</StudioButton>
                  <StudioButton type="button" disabled={disabled} onClick={() => onChange(updateSource(workingComposition, item.id, { kind: source.kind, text: "" }))}>Use local writing</StudioButton>
                </div>
              </> : <StudioTextarea
                rows={item.rows ?? 4}
                aria-label={`Writing library ${item.label}`}
                className="admin-copy-field-body"
                disabled={disabled}
                value={source.text ?? ""}
                onChange={event => onChange(updateSource(workingComposition, item.id, { ...source, text: event.target.value }))}
              />}
            </label>
            <div className="admin-sky-writing-source-actions">
              {group.id === "experiences" && <StudioButton
                type="button"
                aria-pressed={included}
                disabled={disabled || (!included && workingComposition.modules.length >= 32)}
                onClick={() => onChange(toggleSkyWritingLibrarySourceModule(workingComposition, item.id, item.label))}
              >{included ? "Remove from fallback" : "Include in fallback"}</StudioButton>}
              <details className="admin-workspace-details">
                <AdminDisclosureSummary>Source details</AdminDisclosureSummary>
                <p><code>{contentKey}#ingress.sources.{item.id}</code> · scope: {item.kind}</p>
                <StudioButton type="button" disabled={disabled} onClick={() => onAdvancedSource(item.id)}>Advanced source tools</StudioButton>
              </details>
            </div>
          </div>;
        })}
      </div>
    </details>)}
  </section>;
}
