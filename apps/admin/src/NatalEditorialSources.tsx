import { Suspense, useEffect, useState } from "react";
import { studioLazy as lazy } from "./studioLazy";
import { AdminSelect } from "./AdminNativeControls";
import { StudioButton, StudioInput } from "./StudioControls";
import { Stack, Text } from "./studio-ds/primitives";
import { readStudioContentDocument } from "./generatedContentClient";
import { natalEditorialIdentity, natalEditorialSelection, natalSectPlanets, type NatalEditorialArea, type NatalEditorialSelection } from "./natalEditorialLibrary";
import { natalSectSigns } from "../../../src/shared/natalSectPlacement";

const NatalSectPlacementComparison = lazy(() => import("./NatalSectPlacementComparison"));

export default function NatalEditorialSources({ area, secret, disabled, revision, onOpen }: {
  area: NatalEditorialArea; secret: string; disabled: boolean; revision: string;
  onOpen: (contentKey: string, label: string) => void;
}) {
  const [selection, setSelection] = useState(() => natalEditorialSelection(area, window.location.hash));
  const [friendName, setFriendName] = useState("Maya");
  const [retry, setRetry] = useState(0);
  const [compare, setCompare] = useState(false);
  const { contentKey, title } = natalEditorialIdentity(selection);
  const [document, setDocument] = useState<{ key: string; body: string; status: string; error: string } | null>(null);
  const current = document?.key === contentKey ? document : null;
  useEffect(() => {
    const controller = new AbortController();
    setDocument(null);
    void readStudioContentDocument(contentKey, secret, { signal: controller.signal }).then(({ rows }) => {
      if (controller.signal.aborted) return;
      const row = rows[0];
      setDocument({ key: contentKey, body: typeof row?.body === "string" ? row.body : "", status: typeof row?.status === "string" ? row.status : "", error: "" });
    }).catch(error => {
      if (!controller.signal.aborted) setDocument({ key: contentKey, body: "", status: "", error: error instanceof Error ? error.message : "Could not load this passage." });
    });
    return () => controller.abort();
  }, [contentKey, secret, revision, retry]);
  function change(next: Partial<NatalEditorialSelection>) {
    const value = { ...selection, ...next };
    if (value.passage === "overview") delete value.placement;
    setSelection(value);
    const params = new URLSearchParams(window.location.hash.split("?")[1] ?? "");
    params.set("natalView", area); params.set("natalAudience", value.audience); params.set("natalPassage", value.passage); params.set("natalSect", value.sect);
    if (value.placement) {
      params.set("natalSign", value.placement.sign);
      if (value.placement.house === undefined) params.delete("natalHouse"); else params.set("natalHouse", String(value.placement.house));
    }
    else { params.delete("natalSign"); params.delete("natalHouse"); }
    window.history.replaceState(null, "", `#exact-content?${params}`);
  }
  const heading = area === "rulership" ? "Twelfth-house rulership" : "Day and night charts";
  const preview = current?.body.replace(/\{\{\s*ownerName\s*\}\}/gu, () => friendName.trim() || "Maya");
  return <section className="admin-natal-source-group" aria-label={heading}>
    <header><Stack gap="sm"><h3>{heading}</h3><Text size="body" tone="secondary">{area === "rulership"
      ? "Edit Understanding Undoing and the twelve passages connecting the twelfth house with its Hellenistic ruler’s house. Existing empty-house readings are edited in Empty houses."
      : "Edit the chart overview or a planet’s day and night passage. You and Friend each have separate wording."}</Text></Stack></header>
    <div className="admin-natal-placement-selectors">
      <label><span>Audience</span><AdminSelect disabled={disabled} aria-label="Natal reading audience" value={selection.audience} onChange={event => change({ audience: event.target.value as "you" | "they" })}>
        <option value="you">You</option><option value="they">Friend</option>
      </AdminSelect></label>
      <label><span>Passage</span><AdminSelect disabled={disabled} aria-label="Natal reading passage" value={selection.passage} onChange={event => change({ passage: event.target.value })}>
        {area === "rulership" ? <><option value="introduction">Introduction · Understanding Undoing</option>{Array.from({ length: 12 }, (_, index) => index + 1).map(house => <option key={house} value={house}>Twelfth-house ruler in house {house}</option>)}</>
          : <><option value="overview">Chart overview</option>{natalSectPlanets.map(planet => <option key={planet} value={planet}>{planet.charAt(0).toUpperCase() + planet.slice(1)}</option>)}</>}
      </AdminSelect></label>
      {area === "day-night" && <label><span>Day or night chart</span><AdminSelect disabled={disabled} aria-label="Natal reading sect" value={selection.sect} onChange={event => change({ sect: event.target.value as "day" | "night" })}>
        <option value="day">Day chart</option><option value="night">Night chart</option>
      </AdminSelect></label>}
      {area === "day-night" && selection.passage !== "overview" && <>
        <label><span>Passage scope</span><AdminSelect disabled={disabled} aria-label="Natal sect passage scope" value={selection.placement ? "placement" : "general"} onChange={event => change({ placement: event.target.value === "placement" ? { sign: "leo", house: 3 } : undefined })}>
          <option value="general">General planet passage</option><option value="placement">Specific sign</option>
        </AdminSelect></label>
        {selection.placement && <>
          <label><span>Zodiac sign</span><AdminSelect disabled={disabled} aria-label="Natal sect placement sign" value={selection.placement.sign} onChange={event => change({ placement: { ...selection.placement!, sign: event.target.value } })}>
            {natalSectSigns.map(sign => <option key={sign} value={sign}>{sign.charAt(0).toUpperCase() + sign.slice(1)}</option>)}
          </AdminSelect></label>
          <label><span>House (optional)</span><AdminSelect disabled={disabled} aria-label="Natal sect placement house" value={selection.placement.house ?? ""} onChange={event => change({ placement: { ...selection.placement!, house: event.target.value ? Number(event.target.value) : undefined } })}>
            <option value="">All houses</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(house => <option key={house} value={house}>House {house}</option>)}
          </AdminSelect></label>
        </>}
      </>}
      {selection.audience === "they" && <label><span>Friend’s name in preview</span><StudioInput aria-label="Friend’s name in preview" value={friendName} onChange={event => setFriendName(event.target.value)} /></label>}
    </div>
    {selection.placement && <Text size="body" tone="secondary">This passage applies to the selected planet, sign, {selection.placement.house === undefined ? "all houses" : `whole-sign house ${selection.placement.house}`}, sect and audience. Once approved and published, the reader uses the most specific matching passage.</Text>}
    <article className="admin-natal-source-card">
      <div className="admin-natal-source-card-copy">
        <div className="admin-natal-source-card-heading"><h4>{title}</h4></div>
        {!current ? <p role="status">Loading saved passage…</p> : current.error ? <p role="alert">{current.error} <StudioButton type="button" onClick={() => setRetry(value => value + 1)}>Retry passage</StudioButton></p>
          : <>{current.status && <Text size="body" tone="secondary">Saved status: {current.status}</Text>}{current.body ? <div className="admin-natal-reader-preview-part">{preview?.split(/\n\s*\n/u).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div> : <p>No passage has been saved for this selection.</p>}</>}
        <p className="admin-natal-source-key"><span>Source key</span><code>{contentKey}</code></p>
      </div>
      <StudioButton type="button" disabled={disabled || !current || Boolean(current.error)} onClick={() => onOpen(contentKey, title)}>{current?.status ? "Edit saved passage" : "Create passage draft"}</StudioButton>
    </article>
    {selection.placement && <>
      <StudioButton type="button" aria-expanded={compare} onClick={() => setCompare(value => !value)}>{compare ? "Hide reading comparison" : "Compare complete reading"}</StudioButton>
      {compare && <Suspense fallback={<p role="status">Loading reading comparison…</p>}>
        <NatalSectPlacementComparison key={contentKey} selection={selection} secret={secret} friendName={friendName} body={current?.body ?? ""} status={current?.status ?? ""} revision={revision} />
      </Suspense>}
    </>}
  </section>;
}
