import { useEffect, useState } from "react";
import { AdminSelect } from "./AdminNativeControls";
import { PageLoading } from "../../web/src/components/PageLoading";
import { StudioButton, StudioInput } from "./StudioControls";
import {
  aspectTechnicalVerb,
  bondActivationHeadline,
  bondCalculatedFactLine,
  bondEffectPageHeadline,
  fillNamedSlots,
  parseBondEffectContentKey,
  synastryBodiesFromPayload,
  synastryHolderSlots,
  synastryPairLookupOrder
} from "./bondEffectPageAssembly";
import { requestStudioJson } from "./generatedContentClient";
import {
  transitNatalHouses,
  transitNatalPointGroups,
  transitNatalPoints,
  transitNatalSigns,
  type TransitNatalAspect,
  type TransitNatalHouse,
  type TransitNatalPoint,
  type TransitNatalSign
} from "./transitNatalSources";

type SynastryLoad = {
  contentKey: string;
  forward: boolean;
  body: string;
} | null;

export default function BondEffectPagePreview({
  contentKey,
  youText,
  theyText,
  secret,
  onOpenSource,
  previewNatalPoint
}: {
  contentKey: string;
  youText: string;
  theyText: string;
  secret: string;
  onOpenSource: (contentKey: string, label: string, field?: string) => void;
  previewNatalPoint?: TransitNatalPoint;
}) {
  const contact = parseBondEffectContentKey(contentKey);
  const [audience, setAudience] = useState<"you" | "they">("they");
  const [friendName, setFriendName] = useState("Name");
  const [natalPoint, setNatalPoint] = useState<TransitNatalPoint>(previewNatalPoint ?? "ascendant");
  const [friendPoint, setFriendPoint] = useState<TransitNatalPoint>("saturn");
  const [activationAspect, setActivationAspect] = useState<TransitNatalAspect>("square");
  const [transitSign, setTransitSign] = useState<TransitNatalSign>("libra");
  const [natalSign, setNatalSign] = useState<TransitNatalSign>("gemini");
  const [transitHouse, setTransitHouse] = useState<TransitNatalHouse>("5");
  const [synastry, setSynastry] = useState<{ key: string; load?: SynastryLoad; error?: string }>({ key: "" });

  useEffect(() => {
    if (previewNatalPoint) setNatalPoint(previewNatalPoint);
  }, [previewNatalPoint]);

  const lookup = synastryPairLookupOrder(natalPoint, friendPoint, activationAspect);
  const lookupKey = lookup.map((item) => item.contentKey).join("|");

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setSynastry({ key: lookupKey });
    void (async () => {
      try {
        for (const candidate of lookup) {
          const payload = await requestStudioJson(
            `/api/admin/generated-content?status=all&visibility=all&contentKey=${encodeURIComponent(candidate.contentKey)}&limit=1&includePackageSource=true`,
            secret,
            { signal: controller.signal }
          );
          const bodies = synastryBodiesFromPayload(payload);
          const raw = candidate.forward ? bodies?.body_you : bodies?.body_they;
          if (raw?.trim()) {
            if (!cancelled) {
              setSynastry({
                key: lookupKey,
                load: {
                  contentKey: bodies?.contentKey || candidate.contentKey,
                  forward: candidate.forward,
                  body: raw
                }
              });
            }
            return;
          }
        }
        if (!cancelled) setSynastry({ key: lookupKey, load: null });
      } catch (error) {
        if (!cancelled) {
          setSynastry({
            key: lookupKey,
            error: error instanceof Error ? error.message : "The synastry source could not be opened."
          });
        }
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [lookupKey, secret]);

  if (!contact) return null;

  const openingRaw = audience === "you" ? youText : theyText;
  const opening = fillNamedSlots(openingRaw, { holder1: friendName.trim() || "Name" }).trim();
  const headline = bondEffectPageHeadline(contact.planet, contact.aspect, natalPoint);
  const activationTitle = bondActivationHeadline(natalPoint, activationAspect, friendName, friendPoint);
  const fact = bondCalculatedFactLine({
    planet: contact.planet,
    transitSign,
    transitHouse,
    aspect: contact.aspect,
    natalPoint,
    natalSign
  });
  const loadedSynastry = synastry.load;
  const synastryBody = loadedSynastry
    ? fillNamedSlots(loadedSynastry.body, synastryHolderSlots(loadedSynastry.forward, friendName)).trim()
    : "";
  const loadingSynastry = synastry.key !== lookupKey || (loadedSynastry === undefined && !synastry.error);

  return (
    <section className="admin-natal-source-card" aria-label="Between you two composition" data-bond-page-preview="true">
      <header className="admin-natal-source-card-heading">
        <div>
          <p className="admin-eyebrow">Between you two composition</p>
          <strong>{headline}</strong>
        </div>
      </header>
      <p>
        This compatibility-effect row is only the opening. The live Between you two write-up also includes What this activates and a calculated astrology line. Those are not saved on this row.
      </p>
      <fieldset className="admin-metadata-fields" aria-label="Between you two example">
        <legend>Example chart for this page</legend>
        <label>
          <span>Opening</span>
          <AdminSelect aria-label="Opening audience" value={audience} onChange={(event) => setAudience(event.target.value as "you" | "they")}>
            <option value="you">You, when the transit hits your chart</option>
            <option value="they">They, when the transit hits their chart</option>
          </AdminSelect>
        </label>
        <label>
          <span>Friend name</span>
          <StudioInput aria-label="Preview friend name" value={friendName} onChange={(event) => setFriendName(event.target.value)} />
        </label>
        <label>
          <span>Your natal point</span>
          <AdminSelect aria-label="Preview natal point" value={natalPoint} onChange={(event) => setNatalPoint(event.target.value as TransitNatalPoint)}>
            {transitNatalPointGroups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.values.map((point) => <option key={point} value={point}>{point.replace(/-/gu, " ")}</option>)}
              </optgroup>
            ))}
          </AdminSelect>
        </label>
        <label>
          <span>Their planet or point</span>
          <AdminSelect aria-label="Preview friend point" value={friendPoint} onChange={(event) => setFriendPoint(event.target.value as TransitNatalPoint)}>
            {transitNatalPoints.map((point) => <option key={point} value={point}>{point.replace(/-/gu, " ")}</option>)}
          </AdminSelect>
        </label>
        <label>
          <span>What this activates</span>
          <AdminSelect aria-label="Preview synastry aspect" value={activationAspect} onChange={(event) => setActivationAspect(event.target.value as TransitNatalAspect)}>
            {(["square", "opposition", "conjunction", "trine", "sextile"] as const).map((aspect) => (
              <option key={aspect} value={aspect}>{aspectTechnicalVerb(aspect)}</option>
            ))}
          </AdminSelect>
        </label>
        <label>
          <span>Transit sign</span>
          <AdminSelect aria-label="Preview transit sign" value={transitSign} onChange={(event) => setTransitSign(event.target.value as TransitNatalSign)}>
            {transitNatalSigns.map((sign) => <option key={sign} value={sign}>{sign}</option>)}
          </AdminSelect>
        </label>
        <label>
          <span>Transit house</span>
          <AdminSelect aria-label="Preview transit house" value={transitHouse} onChange={(event) => setTransitHouse(event.target.value as TransitNatalHouse)}>
            {transitNatalHouses.map((house) => <option key={house} value={house}>{house}</option>)}
          </AdminSelect>
        </label>
        <label>
          <span>Natal sign</span>
          <AdminSelect aria-label="Preview natal sign" value={natalSign} onChange={(event) => setNatalSign(event.target.value as TransitNatalSign)}>
            {transitNatalSigns.map((sign) => <option key={sign} value={sign}>{sign}</option>)}
          </AdminSelect>
        </label>
      </fieldset>
      <div className="admin-natal-source-card-copy admin-copy-preview">
        <p>{opening || "The You or They opening for this row is empty."}</p>
        <p className="admin-eyebrow">What this activates</p>
        <strong>{activationTitle}</strong>
        {loadingSynastry
          ? <PageLoading compact message="Opening the synastry source…" />
          : synastry.error
            ? <p role="alert">{synastry.error}</p>
            : synastryBody
              ? <p>{synastryBody}</p>
              : <p>No stored synastry pair was found for this activation. Write that natal contact separately, then return here to see it on the assembled page.</p>}
        <p className="admin-field-hint">{fact} This last line is calculated from the chart. It is not authored on this row.</p>
      </div>
      {loadedSynastry?.contentKey ? (
        <StudioButton
          type="button"
          onClick={() => onOpenSource(
            loadedSynastry.contentKey,
            activationTitle,
            loadedSynastry.forward ? "body_you" : "body_they"
          )}
        >
          Edit this activation <code>{loadedSynastry.contentKey}</code>
        </StudioButton>
      ) : null}
      {!loadingSynastry && !loadedSynastry && lookup[0] && (
        <StudioButton
          type="button"
          onClick={() => onOpenSource(lookup[0].contentKey, activationTitle, "body_you")}
        >
          Open synastry source <code>{lookup[0].contentKey}</code>
        </StudioButton>
      )}
    </section>
  );
}
