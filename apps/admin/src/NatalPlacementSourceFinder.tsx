import { useState } from "react";
import { StudioButton, StudioTabs } from "./StudioControls";
import { AdminDisclosureSummary, AdminSelect } from "./AdminNativeControls";
import ContentLiveStatusBadge from "./ContentLiveStatus";
import EmptyHouseReaderPreview from "./EmptyHouseReaderPreview";
import NatalPlacementSourceEditor, { type NatalEditableRow, type NatalSourceEdits } from "./NatalPlacementSourceEditor";
import NatalPlacementReaderPreview, { natalPlacementOverrideDraft } from "./NatalPlacementReaderPreview";
import { natalPlacementReaderHref, openContextualReaderHref } from "./adminReaderDestinations";
import { emptyHouseRulers, emptyHouseSourceKeys } from "./emptyHouseSources";
import {
  natalPlacementHouses,
  natalPlacementLabel,
  natalPlacementMotionIsFixed,
  natalPlacementMotions,
  natalPlacementPlanets,
  natalPlacementPointLabel,
  natalPlacementSigns,
  natalPlacementSourceGroups,
  type NatalPlacementHouse,
  type NatalPlacementMotion,
  type NatalPlacementPlanet,
  type NatalPlacementSign
} from "./natalPlacementSources";

type PreviewRow = {
  id?: string | null;
  inventory_only?: boolean;
  updated_at?: string | null;
  body: string | null;
  content_key: string;
  headline: string | null;
  sections: unknown;
  status: string;
  summary: string | null;
};

type Props = {
  house: NatalPlacementHouse | "";
  isLoading: boolean;
  onCreateOverride: (contentKey: string, label: string, body: string) => void;
  onDirtyChange: (key: string, dirty: boolean) => void;
  onSaveSource: (row: NatalEditableRow, edits: NatalSourceEdits, publish: boolean) => Promise<boolean>;
  onOpenSource: (contentKey: string, label: string, previewTemplate?: boolean) => void;
  motion: NatalPlacementMotion;
  onSelectionChange: (next: { house?: NatalPlacementHouse | ""; motion?: NatalPlacementMotion; planet?: NatalPlacementPlanet | ""; sign?: NatalPlacementSign | "" }) => void;
  planet: NatalPlacementPlanet | "";
  rows: PreviewRow[];
  secret: string;
  sign: NatalPlacementSign | "";
};

type NatalChartWritingView = "placements" | "empty-houses";

type EmptyHouseSourceGroup = {
  id: string;
  label: string;
  description: string;
  keys: string[];
};

export { natalPlacementOverrideDraft };

function titleFromKey(value: string) {
  return value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function ordinalHouseLabel(value: number) {
  const mod100 = value % 100;
  const suffix = mod100 >= 11 && mod100 <= 13 ? "th" : value % 10 === 1 ? "st" : value % 10 === 2 ? "nd" : value % 10 === 3 ? "rd" : "th";
  return `${value}${suffix} house`;
}

function emptyHouseSourceLabel(key: string, house: number, sign: string, ruler: string, rulerHouse: number) {
  if (key === `fallback-hook/empty-house/base/${house}`) return `${ordinalHouseLabel(house)} foundation`;
  if (key === `fallback-hook/empty-house/sign/${house}/${sign}`) return `${titleFromKey(sign)} on the ${ordinalHouseLabel(house)}`;
  if (key.includes("/rising-ruler/")) return `Chart ruler: ${titleFromKey(ruler)} in the ${ordinalHouseLabel(rulerHouse)}`;
  if (key.includes("/ruler-planet/")) return `${titleFromKey(ruler)} ruling the ${ordinalHouseLabel(house)}`;
  if (key.includes("/ruler-house/")) return `Ruler in the ${ordinalHouseLabel(rulerHouse)}`;
  if (key.includes("/bridge-template/")) return "House-to-ruler bridge";
  if (key.includes("empty-house-ruler-jurisdiction")) return `${ordinalHouseLabel(rulerHouse)} life area`;
  if (key.includes("empty-house-bridge-topic-short")) return `${ordinalHouseLabel(house)} bridge topic`;
  if (key === "fallback-template/natal.empty-house-v14") return "Empty-house assembly template";
  return titleFromKey(key.split("/").pop() ?? key);
}

function emptyHouseSourceScope(key: string) {
  if (key.includes("/base/")) return "The house meaning that stays the same regardless of the cusp sign.";
  if (key.includes("/sign/")) return "How the cusp sign changes the way this house is approached.";
  if (key.includes("/rising-ruler/") || key.includes("/ruler-planet/")) return "The planet that rules the cusp sign and carries the house story elsewhere in the chart.";
  if (key.includes("/ruler-house/")) return "How the ruler's house placement redirects the empty-house topic.";
  if (key.includes("/bridge-template/")) return "The sentence structure that connects the empty house to its ruler placement.";
  if (key.includes("ruler-jurisdiction")) return "Reusable language for the life area where the ruler lands.";
  if (key.includes("bridge-topic-short")) return "Short reusable language for the empty-house topic.";
  if (key.startsWith("fallback-template/")) return "The complete assembly structure used by the empty-house renderer.";
  return "Reusable empty-house source writing.";
}

export default function NatalPlacementSourceFinder({ house, isLoading, motion, onCreateOverride, onDirtyChange, onSaveSource, onOpenSource, onSelectionChange, planet, rows, secret, sign }: Props) {
  const [view, setView] = useState<NatalChartWritingView>("placements");
  const [emptyHouse, setEmptyHouse] = useState(1);
  const [emptyHouseSign, setEmptyHouseSign] = useState("aries");
  const [emptyHouseRulerHouse, setEmptyHouseRulerHouse] = useState(2);
  const selectionKey = `${planet}/${sign}/${house}/${motion}`;
  const signSelectionComplete = Boolean(planet && sign);
  const fullSelectionComplete = Boolean(signSelectionComplete && house);
  const readerHref = fullSelectionComplete
    ? natalPlacementReaderHref(planet, sign, house)
    : "";
  const groups = signSelectionComplete
    ? natalPlacementSourceGroups(planet as NatalPlacementPlanet, sign as NatalPlacementSign, house, motion)
    : [];
  const emptyHouseRuler = emptyHouseRulers[emptyHouseSign] ?? "";
  const emptyHouseKeys = emptyHouseSourceKeys(emptyHouse, emptyHouseSign, emptyHouseRulerHouse);
  const emptyHouseGroups: EmptyHouseSourceGroup[] = [
    {
      id: "meaning",
      label: "House meaning",
      description: "Start with the house itself, then add the cusp sign. These two sources establish what the empty house is about and how the person approaches it.",
      keys: emptyHouseKeys.filter((key) => key.includes("/base/") || key.includes("/sign/"))
    },
    {
      id: "ruler",
      label: "Follow the ruler",
      description: `The ${titleFromKey(emptyHouseSign)} cusp is ruled by ${titleFromKey(emptyHouseRuler)}. These sources show where that house story goes when ${titleFromKey(emptyHouseRuler)} lands in the ${ordinalHouseLabel(emptyHouseRulerHouse)}.`,
      keys: emptyHouseKeys.filter((key) => key.includes("/rising-ruler/") || key.includes("/ruler-planet/") || key.includes("/ruler-house/"))
    },
    {
      id: "bridge",
      label: "Connection language",
      description: "These shared pieces connect the house topic to the ruler's house without repeating the same explanation in every combination.",
      keys: emptyHouseKeys.filter((key) => key.includes("/bridge-template/") || key.includes("empty-house-ruler-jurisdiction") || key.includes("empty-house-bridge-topic-short"))
    },
    {
      id: "template",
      label: "Assembly template",
      description: "The final template controls how the selected pieces are assembled into the empty-house reading.",
      keys: emptyHouseKeys.filter((key) => key.startsWith("fallback-template/"))
    }
  ].filter((group) => group.keys.length > 0);

  const renderSource = (source: ReturnType<typeof natalPlacementSourceGroups>[number]["sources"][number], previewTemplate = false) => {
    if (source.key.startsWith("fallback-template/natal.planet-in-sign/") && !rows.some((row) => row.content_key === source.key)) {
      source = { ...source, key: "fallback-template/natal.planet-in-sign" };
    }
    if (source.key.startsWith("fallback-hook/planet-intro/")) {
      const preferredKey = source.key.replace("/planet-intro/", "/planet-lived/");
      if (rows.some((row) => row.content_key === preferredKey)) {
        source = { ...source, key: preferredKey, scope: `Preferred You-view introduction for ${titleFromKey(planet)} when the shared sign assembly is used.` };
      }
    }
    if (source.key.includes("/natal-you-placement-house-final/")) {
      const preferredKey = source.key.replace("/natal-you-placement-house-final/", "/placement-house-lived/");
      if (!rows.some((row) => row.content_key === source.key) && rows.some((row) => row.content_key === preferredKey)) source = { ...source, key: preferredKey };
      if (!rows.some((row) => row.content_key === source.key)) return null;
    }
    const savedRow = rows.find((row) => row.content_key === source.key);
    const isOptionalExactOverride = source.key.startsWith("fallback-hook/natal-you-placement-complete-final/") || source.key.startsWith("fallback-hook/natal-you-placement-sign-final/");
    const preview = savedRow ? normalizeText(savedRow.body) || normalizeText(savedRow.summary) || normalizeText(savedRow.headline) : "";
    return (
      <article className={`admin-natal-source-card${source.key.includes("placement-sign-final/") ? " admin-natal-source-complete" : ""}`} key={source.key}>
        <div className="admin-natal-source-card-copy">
          <div className="admin-natal-source-card-heading">
            <h4>{source.label}</h4>
            {savedRow && <ContentLiveStatusBadge row={savedRow} />}
          </div>
          <p>{source.scope}</p>
          <p className="admin-natal-source-key"><span>Source key</span><code>{source.key}</code></p>
          {preview && (previewTemplate || savedRow?.inventory_only) && <blockquote>{preview}</blockquote>}
          {isOptionalExactOverride && !savedRow && <p className="admin-field-hint">No exact override is saved. The reader currently receives the composed preview shown above.</p>}
        </div>
        {savedRow && !savedRow.inventory_only && !previewTemplate && (
          <NatalPlacementSourceEditor row={savedRow} onDirtyChange={onDirtyChange} label={source.label} disabled={isLoading} onSave={onSaveSource} />
        )}
        {(!isOptionalExactOverride || savedRow) && (
          <StudioButton type="button" onClick={() => onOpenSource(source.key, source.label, previewTemplate)} disabled={isLoading}>
            {previewTemplate ? savedRow ? "Preview template" : "Load preview" : savedRow ? "Edit source" : "Load and edit"}
          </StudioButton>
        )}
      </article>
    );
  };

  const renderEmptyHouseSource = (contentKey: string) => {
    const savedRow = rows.find((row) => row.content_key === contentKey);
    const label = emptyHouseSourceLabel(contentKey, emptyHouse, emptyHouseSign, emptyHouseRuler, emptyHouseRulerHouse);
    const preview = savedRow ? normalizeText(savedRow.body) || normalizeText(savedRow.summary) || normalizeText(savedRow.headline) : "";
    return (
      <article className="admin-natal-source-card" key={contentKey}>
        <div className="admin-natal-source-card-copy">
          <div className="admin-natal-source-card-heading">
            <h4>{label}</h4>
            {savedRow && <ContentLiveStatusBadge row={savedRow} />}
          </div>
          <p>{emptyHouseSourceScope(contentKey)}</p>
          <p className="admin-natal-source-key"><span>Source key</span><code>{contentKey}</code></p>
          {preview ? <blockquote>{preview}</blockquote> : <p className="admin-field-hint">Open this source to load or author its writing.</p>}
        </div>
        <StudioButton type="button" disabled={isLoading} onClick={() => onOpenSource(contentKey, label, contentKey.startsWith("fallback-template/"))}>
          {savedRow?.inventory_only ? "Load and edit" : savedRow ? "Edit source" : "Load and edit"}
        </StudioButton>
      </article>
    );
  };

  return (
    <section className="admin-natal-placement-finder" aria-label="Find natal chart source writing">
      <h2 className="sr-only">Natal chart writing</h2>
      <StudioTabs
        label="Natal Chart writing areas"
        value={view}
        onValueChange={setView}
        tabs={[
          { value: "placements", label: "Planet placements" },
          { value: "empty-houses", label: "Empty houses" }
        ] as const}
      >
        {view === "placements" ? <>
          {fullSelectionComplete && (
            <div className="admin-natal-placement-finder-heading">
              <StudioButton type="button" onClick={() => openContextualReaderHref(readerHref)}
                aria-label={`View ${natalPlacementLabel(planet as NatalPlacementPlanet, sign as NatalPlacementSign, house as NatalPlacementHouse)} in app`}>
                View in app
              </StudioButton>
            </div>
          )}
          <div className="admin-natal-placement-selectors">
            <label>
              <span>Planet or point</span>
              <AdminSelect
                aria-label="Natal placement planet or point"
                value={planet}
                onChange={(event) => {
                  const nextPlanet = event.target.value as NatalPlacementPlanet | "";
                  onSelectionChange({
                    planet: nextPlanet,
                    ...(natalPlacementMotionIsFixed(nextPlanet) ? { motion: "direct" as const } : {})
                  });
                }}
              >
                <option value="">Choose planet or point</option>
                {natalPlacementPlanets.map((item) => <option value={item} key={item}>{natalPlacementPointLabel(item)}</option>)}
              </AdminSelect>
            </label>
            <label>
              <span>Zodiac sign</span>
              <AdminSelect aria-label="Natal placement zodiac sign" value={sign} onChange={(event) => onSelectionChange({ sign: event.target.value as NatalPlacementSign | "" })}>
                <option value="">Choose sign</option>
                {natalPlacementSigns.map((item) => <option value={item} key={item}>{titleFromKey(item)}</option>)}
              </AdminSelect>
            </label>
            <label>
              <span>House (optional)</span>
              <AdminSelect aria-label="Natal placement house" value={house} onChange={(event) => onSelectionChange({ house: event.target.value as NatalPlacementHouse | "" })}>
                <option value="">Choose house</option>
                {natalPlacementHouses.map((item) => <option value={item} key={item}>{item}</option>)}
              </AdminSelect>
            </label>
            <label>
              <span>Motion preview</span>
              <AdminSelect aria-label="Natal placement motion" value={motion} onChange={(event) => onSelectionChange({ motion: event.target.value as NatalPlacementMotion })}>
                {natalPlacementMotions.map((item) => (
                  <option value={item} key={item} disabled={item === "retrograde" && natalPlacementMotionIsFixed(planet)}>
                    {titleFromKey(item)}{item === "retrograde" && natalPlacementMotionIsFixed(planet) ? " (not possible)" : ""}
                  </option>
                ))}
              </AdminSelect>
            </label>
          </div>
          {signSelectionComplete && (
            <NatalPlacementReaderPreview
              key={selectionKey}
              house={house}
              motion={motion}
              onCreateOverride={onCreateOverride}
              onOpenSource={onOpenSource}
              planet={planet as NatalPlacementPlanet}
              rows={rows}
              secret={secret}
              sign={sign as NatalPlacementSign}
            />
          )}
          {groups.filter((group) => group.key !== "structure").map((group) => (
            <section className="admin-natal-source-group" key={`${selectionKey}/${group.key}`}>
              <header><h3>{group.label}</h3><p>{group.description}</p></header>
              <div className="admin-natal-source-grid">{group.sources.map((source) => renderSource(source))}</div>
            </section>
          ))}
          {groups.filter((group) => group.key === "structure").map((group) => (
            <details className="admin-workspace-details admin-natal-source-group admin-natal-source-advanced" key={`${selectionKey}/${group.key}`}>
              <AdminDisclosureSummary>{group.label}</AdminDisclosureSummary><p>{group.description}</p>
              <div className="admin-natal-source-grid">{group.sources.map((source) => renderSource(source, true))}</div>
            </details>
          ))}
        </> : <section className="admin-empty-house-workspace" aria-label="Empty house writing">
          <header className="admin-natal-source-group">
            <p className="admin-eyebrow">Empty houses</p>
            <h3>Choose the house, cusp sign, and where its ruler lands</h3>
            <p>The full reader assembly and the source list below update with the selected context.</p>
          </header>
          <div className="admin-natal-placement-selectors" aria-label="Empty house context">
            <label>
              <span>Empty house</span>
              <AdminSelect aria-label="Empty house" value={emptyHouse} onChange={(event) => {
                const next = Number(event.target.value);
                setEmptyHouse(next);
                if (next === emptyHouseRulerHouse) setEmptyHouseRulerHouse(next === 12 ? 1 : next + 1);
              }}>
                {Array.from({ length: 12 }, (_, index) => index + 1).map((item) => <option key={item} value={item}>{ordinalHouseLabel(item)}</option>)}
              </AdminSelect>
            </label>
            <label>
              <span>Cusp sign</span>
              <AdminSelect aria-label="Empty house cusp sign" value={emptyHouseSign} onChange={(event) => setEmptyHouseSign(event.target.value)}>
                {Object.keys(emptyHouseRulers).map((item) => <option key={item} value={item}>{titleFromKey(item)}</option>)}
              </AdminSelect>
            </label>
            <label>
              <span>Ruler's house</span>
              <AdminSelect aria-label="Empty house ruler house" value={emptyHouseRulerHouse} onChange={(event) => setEmptyHouseRulerHouse(Number(event.target.value))}>
                {Array.from({ length: 12 }, (_, index) => index + 1).filter((item) => item !== emptyHouse).map((item) => <option key={item} value={item}>{ordinalHouseLabel(item)}</option>)}
              </AdminSelect>
            </label>
          </div>
          <div className="admin-empty-house-context-summary" aria-label="Selected empty house context">
            <p className="admin-eyebrow">Selected reading</p>
            <h4>{ordinalHouseLabel(emptyHouse)} in {titleFromKey(emptyHouseSign)}</h4>
            <p><strong>{titleFromKey(emptyHouseRuler)}</strong> rules the cusp and lands in the <strong>{ordinalHouseLabel(emptyHouseRulerHouse)}</strong>.</p>
          </div>
          <EmptyHouseReaderPreview
            secret={secret}
            house={emptyHouse}
            onOpenSource={onOpenSource}
            rulerHouse={emptyHouseRulerHouse}
            sign={emptyHouseSign}
          />
          <section className="admin-natal-source-group" aria-label="Sources used by the selected empty house assembly">
            <header>
              <h3>Edit the assembly sources</h3>
              <p>These are the exact passages, vocabulary, and template pieces used to build the preview above.</p>
            </header>
          </section>
          {emptyHouseGroups.map((group) => (
            <section className="admin-natal-source-group" key={`empty-house/${emptyHouse}/${emptyHouseSign}/${emptyHouseRulerHouse}/${group.id}`}>
              <header><h3>{group.label}</h3><p>{group.description}</p></header>
              <div className="admin-natal-source-grid">{group.keys.map(renderEmptyHouseSource)}</div>
            </section>
          ))}
        </section>}
      </StudioTabs>
    </section>
  );
}
