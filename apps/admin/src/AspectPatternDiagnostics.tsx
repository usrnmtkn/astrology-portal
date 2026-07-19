import { AlertTriangle, BarChart3, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";

type DiagnosticsMode = "real" | "fixture";
type FixtureId = "grand_square" | "t_square" | "grand_trine" | "kite" | "yod" | "mystic_rectangle";

type AspectPatternsResponse = {
  ok?: boolean;
  error?: string;
  source?: string;
  fixture?: { id: string; label: string };
  sky?: {
    aspects?: SnapshotAspect[];
    aspectPatterns?: AspectPatternsPayload;
  };
  aspectPatterns?: AspectPatternsPayload;
};

type SnapshotAspect = {
  id?: string;
  pointA?: string;
  pointB?: string;
  from?: string;
  to?: string;
  bodyA?: string;
  bodyB?: string;
  type?: string;
  exactAngle?: number;
  separation?: number;
  orb?: number;
  applying?: boolean;
};

type AspectPatternsPayload = {
  orbPolicyId?: string;
  patterns?: PatternRecord[];
  relationships?: RelationshipRecord[];
  diagnostics?: {
    warnings?: string[];
    [key: string]: unknown;
  };
  ranking?: {
    policyId?: string;
    rankings?: RankingRecord[];
    displayOrder?: string[];
  };
};

type PatternRecord = {
  id: string;
  type: string;
  planets?: string[];
  sourceAspectIds?: string[];
  roles?: Record<string, unknown>;
  derivedPoints?: Array<Record<string, unknown>>;
  geometry?: {
    confidence?: string;
    maximumOrb?: number;
    averageOrb?: number;
    warnings?: string[];
    [key: string]: unknown;
  };
};

type RelationshipRecord = {
  parentPatternId: string;
  childPatternId: string;
  relationship: string;
};

type RankingRecord = {
  patternId: string;
  score?: {
    geometry?: number;
    natalProminence?: number;
    structuralContext?: number;
    baseDisplayPriority?: number;
  };
  reasons?: Array<{
    code: string;
    planet?: string;
    value: number;
  }>;
};

const fixtureOptions: Array<{ id: FixtureId; label: string }> = [
  { id: "grand_square", label: "Grand Square" },
  { id: "t_square", label: "T-Square" },
  { id: "grand_trine", label: "Grand Trine" },
  { id: "kite", label: "Kite" },
  { id: "yod", label: "Yod" },
  { id: "mystic_rectangle", label: "Mystic Rectangle" }
];

function titlePart(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatNumber(value: unknown) {
  return typeof value === "number" ? value.toFixed(value % 1 === 0 ? 0 : 2) : "n/a";
}

function formatPoint(value: unknown) {
  if (!value || typeof value !== "object") return String(value ?? "n/a");
  const point = value as { longitude?: number; sign?: string; house?: number };
  const sign = point.sign ? ` ${titlePart(point.sign)}` : "";
  const house = typeof point.house === "number" ? `, house ${point.house}` : "";
  return `${formatNumber(point.longitude)} deg${sign}${house}`;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function pairText(value: unknown) {
  const pair = asStringArray(value);
  return pair.length ? pair.map(titlePart).join(" <-> ") : "n/a";
}

function patternLabel(patternId: string, patternById: Map<string, PatternRecord>) {
  const pattern = patternById.get(patternId);
  return pattern ? `${titlePart(pattern.type)} (${pattern.planets?.map(titlePart).join(" / ") || pattern.id})` : patternId;
}

function slugPart(value: string | number | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizedSourceAspectId(aspect: SnapshotAspect) {
  const pointA = slugPart(aspect.pointA ?? aspect.from ?? aspect.bodyA);
  const pointB = slugPart(aspect.pointB ?? aspect.to ?? aspect.bodyB);
  const type = slugPart(aspect.type);
  if (!pointA || !pointB || !type) return null;
  const [first, second] = [pointA, pointB].sort();
  return `snapshot.aspect.${first}.${type}.${second}`;
}

function sourceAspectMap(response: AspectPatternsResponse | null) {
  const map = new Map<string, SnapshotAspect>();
  for (const aspect of response?.sky?.aspects ?? []) {
    if (aspect.id) map.set(aspect.id, aspect);
    const normalizedId = normalizedSourceAspectId(aspect);
    if (normalizedId) map.set(normalizedId, aspect);
  }
  return map;
}

function canonicalAspectPatterns(response: AspectPatternsResponse | null) {
  return response?.sky?.aspectPatterns ?? null;
}

function rankedPatterns(payload: AspectPatternsPayload | null) {
  const patterns = payload?.patterns ?? [];
  const patternById = new Map(patterns.map((pattern, index) => [pattern.id, { pattern, index }]));
  const displayOrder = payload?.ranking?.displayOrder ?? patterns.map((pattern) => pattern.id);
  const seen = new Set<string>();
  const ordered = displayOrder.flatMap((patternId) => {
    const found = patternById.get(patternId);
    if (!found) return [];
    seen.add(patternId);
    return [{ ...found, displayRank: seen.size }];
  });
  const remaining = patterns
    .map((pattern, index) => ({ pattern, index, displayRank: ordered.length + index + 1 }))
    .filter((item) => !seen.has(item.pattern.id));
  return ordered.concat(remaining);
}

function roleRows(pattern: PatternRecord) {
  const roles = pattern.roles ?? {};
  switch (pattern.type) {
    case "t_square":
      return [
        ["Opposition", pairText(roles.oppositionAxis)],
        ["Apex", titlePart(String(roles.apex ?? "n/a"))],
        ["Empty leg", formatPoint(roles.emptyLeg)]
      ];
    case "grand_square":
      return [
        ["Opposition axis", pairText((roles.oppositionAxes as unknown[] | undefined)?.[0])],
        ["Opposition axis", pairText((roles.oppositionAxes as unknown[] | undefined)?.[1])],
        ["Apex", "none"]
      ];
    case "grand_trine":
      return [
        ["Planets", asStringArray(roles.planets).map(titlePart).join(" / ") || "n/a"],
        ["Element consistency", titlePart(String(roles.elementConsistency ?? "n/a"))]
      ];
    case "kite":
      return [
        ["Grand Trine planets", asStringArray(roles.grandTrinePlanets).map(titlePart).join(" / ") || "n/a"],
        ["Focal planet", titlePart(String(roles.focalPlanet ?? "n/a"))],
        ["Opposed trine planet", titlePart(String(roles.opposedTrinePlanet ?? "n/a"))],
        ["Spine", pairText(roles.spine)],
        ["Resource planets", asStringArray(roles.resourcePlanets).map(titlePart).join(" / ") || "n/a"]
      ];
    case "yod":
      return [
        ["Sextile base", pairText(roles.basePlanets)],
        ["Apex", titlePart(String(roles.apex ?? "n/a"))],
        ["Fallout point", formatPoint(roles.falloutPoint)]
      ];
    case "mystic_rectangle":
      return [
        ["Opposition axis", pairText((roles.oppositionAxes as unknown[] | undefined)?.[0])],
        ["Opposition axis", pairText((roles.oppositionAxes as unknown[] | undefined)?.[1])],
        ["Variant", titlePart(String(roles.variant ?? "n/a"))],
        ["Apex", "none"]
      ];
    default:
      return Object.entries(roles).map(([key, value]) => [titlePart(key), typeof value === "string" ? titlePart(value) : JSON.stringify(value)]);
  }
}

function sourceAspectRows(pattern: PatternRecord, sourceAspects: Map<string, SnapshotAspect>) {
  const ids = pattern.sourceAspectIds ?? [];
  return ids.map((id) => {
    const sourceAspect = sourceAspects.get(id);
    const parts = id.split(".");
    const compact = id.split("-");
    const type = parts.length >= 4 ? parts[3] : compact.find((part) => /conjunction|sextile|square|trine|quincunx|opposition/.test(part));
    return {
      id,
      type: titlePart(sourceAspect?.type ?? type ?? "n/a"),
      separation: sourceAspect?.separation,
      orb: sourceAspect?.orb
    };
  });
}

function rankingFor(payload: AspectPatternsPayload | null, patternId: string) {
  return payload?.ranking?.rankings?.find((ranking) => ranking.patternId === patternId) ?? null;
}

export function AspectPatternDiagnostics() {
  const [mode, setMode] = useState<DiagnosticsMode>("fixture");
  const [fixture, setFixture] = useState<FixtureId>("grand_square");
  const [date, setDate] = useState("2026-01-01");
  const [time, setTime] = useState("12:00");
  const [latitude, setLatitude] = useState("40.7128");
  const [longitude, setLongitude] = useState("-74.006");
  const [includeCopy, setIncludeCopy] = useState(false);
  const [response, setResponse] = useState<AspectPatternsResponse | null>(null);
  const [requestedUrl, setRequestedUrl] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const payload = canonicalAspectPatterns(response);
  const patterns = payload?.patterns ?? [];
  const relationships = payload?.relationships ?? [];
  const orderedPatterns = useMemo(() => rankedPatterns(payload), [payload]);
  const patternById = useMemo(() => new Map(patterns.map((pattern) => [pattern.id, pattern])), [patterns]);
  const sourceAspects = useMemo(() => sourceAspectMap(response), [response]);

  async function runDiagnostics() {
    setIsLoading(true);
    setError("");
    setResponse(null);

    const copyParam = includeCopy ? "&includeAspectPatternCopy=true" : "";
    const url = mode === "fixture"
      ? `/api/admin/aspect-pattern-fixtures?fixture=${encodeURIComponent(fixture)}${copyParam}`
      : `/api/astrology-facts?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&date=${encodeURIComponent(`${date}T${time}:00`)}&includeAspectPatterns=true${copyParam}`;

    setRequestedUrl(url);

    try {
      const result = await fetch(url, { method: "GET" });
      const json = await result.json() as AspectPatternsResponse;
      if (!result.ok || json.ok === false) {
        throw new Error(json.error || `Diagnostics request failed with ${result.status}.`);
      }
      setResponse(json);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Diagnostics request failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="admin-template-page aspect-diagnostics-page" aria-label="Aspect pattern diagnostics">
      <section className="admin-panel aspect-diagnostics-controls" aria-label="Diagnostics controls">
        <div>
          <p className="admin-eyebrow">Read-only diagnostics</p>
          <h2>Aspect Pattern Inspector</h2>
          <p>Inspect detector output, structural relationships, and base ranking before anything reaches reader-facing copy.</p>
        </div>
        <div className="aspect-diagnostics-mode" role="tablist" aria-label="Diagnostics mode">
          <button type="button" className={mode === "fixture" ? "active" : ""} onClick={() => setMode("fixture")}>Fixture mode</button>
          <button type="button" className={mode === "real" ? "active" : ""} onClick={() => setMode("real")}>Real chart mode</button>
        </div>
        {mode === "fixture" ? (
          <label className="admin-title-field">
            <span>Fixture</span>
            <select value={fixture} onChange={(event) => setFixture(event.target.value as FixtureId)} aria-label="Aspect pattern fixture">
              {fixtureOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
        ) : (
          <fieldset className="admin-metadata-fields aspect-diagnostics-real-chart">
            <label className="admin-metadata-field">
              <span>Date</span>
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
            <label className="admin-metadata-field">
              <span>Time</span>
              <input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
            </label>
            <label className="admin-metadata-field">
              <span>Latitude</span>
              <input inputMode="decimal" value={latitude} onChange={(event) => setLatitude(event.target.value)} />
            </label>
            <label className="admin-metadata-field">
              <span>Longitude</span>
              <input inputMode="decimal" value={longitude} onChange={(event) => setLongitude(event.target.value)} />
            </label>
          </fieldset>
        )}
        <label className="admin-metadata-field aspect-diagnostics-copy-toggle">
          <span>Resolved copy</span>
          <input type="checkbox" checked={includeCopy} onChange={(event) => setIncludeCopy(event.target.checked)} />
        </label>
        <div className="admin-toolbar-actions">
          <button className="admin-primary-button" type="button" onClick={() => void runDiagnostics()} disabled={isLoading}>
            {isLoading ? <RefreshCw size={16} aria-hidden="true" /> : <Search size={16} aria-hidden="true" />}
            Run diagnostics
          </button>
          {requestedUrl && <code className="aspect-diagnostics-request">{requestedUrl}</code>}
        </div>
      </section>

      {!response && !error && (
        <section className="admin-panel aspect-diagnostics-empty" aria-label="Diagnostics empty state">
          <BarChart3 size={22} aria-hidden="true" />
          <p>Run diagnostics to inspect aspect-pattern output. No API request is made until you ask for it.</p>
        </section>
      )}

      {error && (
        <section className="admin-panel aspect-diagnostics-error" role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <p>{error}</p>
        </section>
      )}

      {payload && (
        <>
          <section className="admin-status-grid aspect-diagnostics-summary" aria-label="Diagnostics summary">
            <article className="admin-status-card">
              <span>Detected patterns</span>
              <strong className="admin-stat-value">{patterns.length}</strong>
              <small>{response?.fixture?.label ?? "Real chart API"}</small>
            </article>
            <article className="admin-status-card">
              <span>Relationships</span>
              <strong className="admin-stat-value">{relationships.length}</strong>
              <small>Structural graph rows</small>
            </article>
            <article className="admin-status-card">
              <span>Orb policy</span>
              <strong>{payload.orbPolicyId ?? "n/a"}</strong>
              <small>Detector policy</small>
            </article>
            <article className="admin-status-card">
              <span>Ranking policy</span>
              <strong>{payload.ranking?.policyId ?? "n/a"}</strong>
              <small>Base display priority</small>
            </article>
          </section>

          <section className="admin-panel aspect-diagnostics-display-order" aria-label="Display order">
            <h3>Final displayOrder</h3>
            <ol>
              {(payload.ranking?.displayOrder ?? []).map((patternId) => (
                <li key={patternId}><code>{patternId}</code></li>
              ))}
            </ol>
            {(payload.diagnostics?.warnings ?? []).length > 0 && (
              <div className="aspect-warning-list">
                <strong>Diagnostics warnings</strong>
                {(payload.diagnostics?.warnings ?? []).map((warning) => <span key={warning}>{warning}</span>)}
              </div>
            )}
          </section>

          <section className="aspect-pattern-card-list" aria-label="Ranked patterns">
            {orderedPatterns.map(({ pattern, index, displayRank }) => (
              <PatternCard
                key={pattern.id}
                displayRank={displayRank}
                canonicalIndex={index}
                pattern={pattern}
                ranking={rankingFor(payload, pattern.id)}
                relationships={relationships}
                patternById={patternById}
                sourceAspects={sourceAspects}
              />
            ))}
          </section>

          <section className="admin-panel aspect-relationship-table" aria-label="Structural relationships">
            <h3>Relationships</h3>
            <table>
              <thead>
                <tr>
                  <th>Parent pattern</th>
                  <th>Relationship</th>
                  <th>Child pattern</th>
                </tr>
              </thead>
              <tbody>
                {relationships.map((relationship) => (
                  <tr key={`${relationship.parentPatternId}-${relationship.relationship}-${relationship.childPatternId}`}>
                    <td>{patternLabel(relationship.parentPatternId, patternById)}</td>
                    <td><code>{relationship.relationship}</code></td>
                    <td>{patternLabel(relationship.childPatternId, patternById)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {relationships.length === 0 && <p className="admin-empty">No structural relationships detected.</p>}
          </section>

          <section className="admin-panel aspect-diagnostics-raw" aria-label="Raw JSON">
            <h3>Raw output</h3>
            <RawJson title="patterns" value={payload.patterns ?? []} />
            <RawJson title="relationships" value={payload.relationships ?? []} />
            <RawJson title="ranking" value={payload.ranking ?? null} />
            <RawJson title="diagnostics" value={payload.diagnostics ?? null} />
            <RawJson title="complete aspectPatterns response" value={payload} />
          </section>
        </>
      )}
    </section>
  );
}

function PatternCard({
  displayRank,
  canonicalIndex,
  pattern,
  ranking,
  relationships,
  patternById,
  sourceAspects
}: {
  displayRank: number;
  canonicalIndex: number;
  pattern: PatternRecord;
  ranking: RankingRecord | null;
  relationships: RelationshipRecord[];
  patternById: Map<string, PatternRecord>;
  sourceAspects: Map<string, SnapshotAspect>;
}) {
  const geometryWarnings = pattern.geometry?.warnings ?? [];
  const parentRelationships = relationships.filter((relationship) => relationship.childPatternId === pattern.id);
  const childRelationships = relationships.filter((relationship) => relationship.parentPatternId === pattern.id);

  return (
    <article className="admin-panel aspect-pattern-card" aria-label={`${titlePart(pattern.type)} diagnostics`}>
      <header>
        <div>
          <p className="admin-eyebrow">Rank {displayRank} / canonical index {canonicalIndex}</p>
          <h3>{titlePart(pattern.type)}</h3>
          <p>{pattern.planets?.map(titlePart).join(" / ") || "No member planets"}</p>
          <code>{pattern.id}</code>
        </div>
        <span className={`ui-pill admin-status ${pattern.geometry?.confidence === "exact" || pattern.geometry?.confidence === "strong" ? "status-live" : "status-draft"}`}>
          {pattern.geometry?.confidence ?? "unknown"}
        </span>
      </header>

      <div className="aspect-pattern-card-grid">
        <section>
          <h4>Geometry</h4>
          <dl>
            <dt>Maximum orb</dt>
            <dd>{formatNumber(pattern.geometry?.maximumOrb)} deg</dd>
            <dt>Average orb</dt>
            <dd>{formatNumber(pattern.geometry?.averageOrb)} deg</dd>
          </dl>
          <div className="aspect-warning-list">
            <strong>Geometry warnings</strong>
            {geometryWarnings.length ? geometryWarnings.map((warning) => <span key={warning}>{warning}</span>) : <span>none</span>}
          </div>
        </section>

        <section>
          <h4>Roles</h4>
          <dl>
            {roleRows(pattern).map(([label, value], rowIndex) => (
              <div key={`${label}-${rowIndex}`}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <h4>Ranking</h4>
          <dl>
            <dt>Geometry</dt>
            <dd>{formatNumber(ranking?.score?.geometry)}</dd>
            <dt>Natal prominence</dt>
            <dd>{formatNumber(ranking?.score?.natalProminence)}</dd>
            <dt>Structural context</dt>
            <dd>{formatNumber(ranking?.score?.structuralContext)}</dd>
            <dt>Total</dt>
            <dd>{formatNumber(ranking?.score?.baseDisplayPriority)}</dd>
          </dl>
          <div className="aspect-reason-list">
            <strong>Reasons</strong>
            {(ranking?.reasons ?? []).map((reason, index) => (
              <span key={`${reason.code}-${reason.planet ?? "none"}-${index}`}>
                {reason.value >= 0 ? "+" : ""}{formatNumber(reason.value)} {titlePart(reason.code)}{reason.planet ? `: ${titlePart(reason.planet)}` : ""}
              </span>
            ))}
            {(ranking?.reasons ?? []).length === 0 && <span>none</span>}
          </div>
        </section>
      </div>

      <section className="aspect-source-aspects">
        <h4>Source aspects</h4>
        <ul>
          {sourceAspectRows(pattern, sourceAspects).map((aspect) => (
            <li key={aspect.id}>
              <code>{aspect.id}</code>
              <span>{aspect.type}</span>
              <span>{typeof aspect.separation === "number" ? `${formatNumber(aspect.separation)} deg separation` : "separation n/a"}</span>
              <span>{typeof aspect.orb === "number" ? `${formatNumber(aspect.orb)} deg orb` : "orb n/a"}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="aspect-derived-points">
        <h4>Derived points</h4>
        {pattern.derivedPoints?.length ? (
          <ul>
            {pattern.derivedPoints.map((point, index) => (
              <li key={`${point.type}-${index}`}>
                <code>{String(point.type ?? "point")}</code>
                <span>{formatPoint(point)}</span>
              </li>
            ))}
          </ul>
        ) : <p>none</p>}
      </section>

      <section className="aspect-contained-links">
        <h4>Parent and child relationships</h4>
        {parentRelationships.map((relationship) => (
          <p key={`${relationship.parentPatternId}-${relationship.relationship}`}>
            Contained by {patternLabel(relationship.parentPatternId, patternById)} via <code>{relationship.relationship}</code>
          </p>
        ))}
        {childRelationships.map((relationship) => (
          <p key={`${relationship.childPatternId}-${relationship.relationship}`}>
            Contains {patternLabel(relationship.childPatternId, patternById)} via <code>{relationship.relationship}</code>
          </p>
        ))}
        {parentRelationships.length === 0 && childRelationships.length === 0 && <p>none</p>}
      </section>
    </article>
  );
}

function RawJson({ title, value }: { title: string; value: unknown }) {
  return (
    <details>
      <summary>{title}</summary>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </details>
  );
}
