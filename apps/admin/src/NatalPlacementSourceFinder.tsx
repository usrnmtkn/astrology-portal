import NatalPlacementReaderPreview, { natalPlacementOverrideDraft } from "./NatalPlacementReaderPreview";
import {
  natalPlacementHouses,
  natalPlacementLabel,
  natalPlacementPlanets,
  natalPlacementSignLabel,
  natalPlacementSigns,
  natalPlacementSourceGroups,
  type NatalPlacementHouse,
  type NatalPlacementPlanet,
  type NatalPlacementSign
} from "./natalPlacementSources";

type PreviewRow = {
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
  onOpenSource: (contentKey: string, label: string, previewTemplate?: boolean) => void;
  onSelectionChange: (next: { house?: NatalPlacementHouse | ""; planet?: NatalPlacementPlanet | ""; sign?: NatalPlacementSign | "" }) => void;
  planet: NatalPlacementPlanet | "";
  rows: PreviewRow[];
  secret: string;
  sign: NatalPlacementSign | "";
};

export { natalPlacementOverrideDraft };

function titleFromKey(value: string) {
  return value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function statusLabel(status: string) {
  if (status === "LIVE") return "Published";
  if (status === "REVIEWED") return "Reviewed";
  if (status === "ARCHIVED") return "Archived";
  if (status === "ERROR") return "Error";
  return "Draft";
}

export default function NatalPlacementSourceFinder({ house, isLoading, onCreateOverride, onOpenSource, onSelectionChange, planet, rows, secret, sign }: Props) {
  const signSelectionComplete = Boolean(planet && sign);
  const fullSelectionComplete = Boolean(signSelectionComplete && house);
  const groups = signSelectionComplete
    ? natalPlacementSourceGroups(planet as NatalPlacementPlanet, sign as NatalPlacementSign, house)
    : [];

  const renderSource = (source: ReturnType<typeof natalPlacementSourceGroups>[number]["sources"][number], previewTemplate = false) => {
    const savedRow = rows.find((row) => row.content_key === source.key);
    const isOptionalExactOverride = source.key.startsWith("fallback-hook/natal-you-placement-complete-final/");
    const preview = savedRow ? normalizeText(savedRow.body) || normalizeText(savedRow.summary) || normalizeText(savedRow.headline) : "";
    return (
      <article className="admin-natal-source-card" key={source.key}>
        <div className="admin-natal-source-card-copy">
          <div className="admin-natal-source-card-heading">
            <h4>{source.label}</h4>
            {savedRow && <span className={`ui-pill admin-status status-${savedRow.status.toLowerCase()}`}>{statusLabel(savedRow.status)}</span>}
          </div>
          <p>{source.scope}</p>
          <p className="admin-natal-source-key"><span>Source key</span><code>{source.key}</code></p>
          {preview && <blockquote>{preview}</blockquote>}
          {isOptionalExactOverride && !savedRow && <p className="admin-field-hint">No exact override is saved. The reader currently receives the composed preview shown above.</p>}
        </div>
        {(!isOptionalExactOverride || savedRow) && (
          <button type="button" onClick={() => onOpenSource(source.key, source.label, previewTemplate)} disabled={isLoading}>
            {previewTemplate ? savedRow ? "Preview template" : "Load preview" : savedRow ? "Edit source" : "Load and edit"}
          </button>
        )}
      </article>
    );
  };

  return (
    <section className="admin-natal-placement-finder" aria-label="Find natal placement source writing">
      <div className="admin-natal-placement-finder-heading">
        <div>
          <p className="admin-eyebrow">Natal placement source finder</p>
          <h3>{fullSelectionComplete
            ? natalPlacementLabel(planet as NatalPlacementPlanet, sign as NatalPlacementSign, house as NatalPlacementHouse)
            : signSelectionComplete
              ? natalPlacementSignLabel(planet as NatalPlacementPlanet, sign as NatalPlacementSign)
              : "Choose a natal placement"}</h3>
          <p>Pick one value in each field. This workspace contains natal placements only; current transits and Sky placements are kept in Sky Write-ups.</p>
        </div>
        {fullSelectionComplete && <p className="admin-natal-placement-key"><span>Reader path</span><code>you/placement/{planet}-{sign}-{house}h</code></p>}
      </div>
      <div className="admin-natal-placement-selectors">
        <label>
          <span>1. Planet or point</span><small>What is placed</small>
          <select aria-label="Natal placement planet or point" value={planet} onChange={(event) => onSelectionChange({ planet: event.target.value as NatalPlacementPlanet | "" })}>
            <option value="">Choose planet or point</option>
            {natalPlacementPlanets.map((item) => <option value={item} key={item}>{titleFromKey(item)}</option>)}
          </select>
        </label>
        <label>
          <span>2. Zodiac sign</span><small>How it expresses itself</small>
          <select aria-label="Natal placement zodiac sign" value={sign} onChange={(event) => onSelectionChange({ sign: event.target.value as NatalPlacementSign | "" })}>
            <option value="">Choose sign</option>
            {natalPlacementSigns.map((item) => <option value={item} key={item}>{titleFromKey(item)}</option>)}
          </select>
        </label>
        <label>
          <span>3. House</span><small>Where it shows up in life</small>
          <select aria-label="Natal placement house" value={house} onChange={(event) => onSelectionChange({ house: event.target.value as NatalPlacementHouse | "" })}>
            <option value="">Choose house</option>
            {natalPlacementHouses.map((item) => <option value={item} key={item}>{item}</option>)}
          </select>
        </label>
      </div>
      {!signSelectionComplete && <p className="admin-natal-placement-prompt">Choose a planet or point and zodiac sign to read the planet-in-sign write-up.</p>}
      {signSelectionComplete && !house && <p className="admin-natal-placement-prompt">The planet-in-sign write-up is shown below. Choose a house to add the house paragraph and exact full-placement override.</p>}
      {signSelectionComplete && (
        <NatalPlacementReaderPreview
          house={house}
          onCreateOverride={onCreateOverride}
          onOpenSource={onOpenSource}
          planet={planet as NatalPlacementPlanet}
          rows={rows}
          secret={secret}
          sign={sign as NatalPlacementSign}
        />
      )}
      {groups.filter((group) => group.key !== "structure").map((group) => (
        <section className="admin-natal-source-group" key={group.key}>
          <header><h3>{group.label}</h3><p>{group.description}</p></header>
          <div className="admin-natal-source-grid">{group.sources.map((source) => renderSource(source))}</div>
        </section>
      ))}
      {groups.filter((group) => group.key === "structure").map((group) => (
        <details className="admin-natal-source-group admin-natal-source-advanced" key={group.key}>
          <summary>{group.label}</summary><p>{group.description}</p>
          <div className="admin-natal-source-grid">{group.sources.map((source) => renderSource(source, true))}</div>
        </details>
      ))}
    </section>
  );
}
