import { useEffect, useState } from "react";
import { AdminDisclosureSummary, AdminSelect } from "./AdminNativeControls";
import { PageLoading } from "../../web/src/components/PageLoading";
import { StudioButton, StudioInput, StudioTabs } from "./StudioControls";
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

const views = [
  { id: "preview", label: "Saved preview" },
  { id: "template", label: "Main template" },
  { id: "assembly", label: "Assembly" }
] as const;

function Fact({ children, title }: { children: string; title: string }) {
  return (
    <span className="admin-composition-variable variable-fact" data-variable-color="1" title={title}>
      {children}
    </span>
  );
}

function Passage({
  ariaLabel,
  children,
  kind,
  onClick
}: {
  ariaLabel: string;
  children: string;
  kind: "hook" | "copy";
  onClick: () => void;
}) {
  const color = kind === "hook" ? "2" : "3";
  return (
    <StudioButton
      type="button"
      className={`admin-composition-variable variable-${kind}`}
      data-variable-color={color}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      {children}
    </StudioButton>
  );
}

function titleFromKey(value: string) {
  return value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

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
  const [view, setView] = useState<(typeof views)[number]["id"]>("preview");
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

  const openingField = audience === "you" ? "body_you" : "body_they";
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
  const synastryField = loadedSynastry?.forward === false ? "body_they" : "body_you";
  const synastryKey = loadedSynastry?.contentKey || lookup[0]?.contentKey;
  const openOpening = () => onOpenSource(contentKey, "Between you two opening", openingField);
  const openActivation = () => {
    if (!synastryKey) return;
    onOpenSource(synastryKey, activationTitle, synastryField);
  };

  return (
    <section className="admin-composition-surface-actions admin-sky-placement-composition" aria-label="Between you two composition map" data-bond-page-preview="true">
      <header>
        <div>
          <p className="admin-eyebrow">Composition Map</p>
          <h3>{headline}</h3>
        </div>
      </header>
      <p>
        This is the compiled Friends article: opening, What this activates, and the calculated astrology line. Saved previews can include drafts. Select a colored passage to edit its source.
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
      <div className="admin-sky-writing-source-actions" role="group" aria-label="Open Between you two section editors">
        <StudioButton type="button" onClick={openOpening}>Open opening editor</StudioButton>
        <StudioButton type="button" disabled={!synastryKey} onClick={openActivation}>Open activation editor</StudioButton>
      </div>
      <StudioTabs label="Between you two composition views" value={view} onValueChange={setView} tabs={views.map((item) => ({ value: item.id, label: item.label }))}>
        <div className="admin-composition-variable-legend" aria-label="Composition color key">
          <span className="variable-fact" data-variable-color="1">Calculated fact</span>
          <span className="variable-hook" data-variable-color="2">Authored hook</span>
          <span className="variable-copy" data-variable-color="3">Saved copy</span>
        </div>
        {view === "preview" && (
          <div className="admin-template-reader-surface">
            <div className="admin-composition-preview-chrome">
              <span>Between you two</span>
              <span>Saved source preview</span>
            </div>
            <div className="admin-template-reader-copy">
              <div className="admin-composition-preview-field">
                <span className="admin-eyebrow">Headline</span>
                <p>
                  <Fact title="Transiting planet comes from the selected contact">{titleFromKey(contact.planet)}</Fact>
                  {" "}
                  <Fact title="Aspect comes from the selected contact">{aspectTechnicalVerb(contact.aspect)}</Fact>
                  {" your "}
                  <Fact title="Natal point comes from the selected chart example">{titleFromKey(natalPoint)}</Fact>
                </p>
              </div>
              <div className="admin-composition-preview-field field-body">
                <span className="admin-eyebrow">Opening</span>
                <p>
                  <Passage ariaLabel="Edit opening" kind="copy" onClick={openOpening}>
                    {opening || "No writing saved. Select to write this section."}
                  </Passage>
                </p>
              </div>
              <div className="admin-composition-preview-field field-body">
                <span className="admin-eyebrow">What this activates</span>
                <p>
                  <Fact title="This heading is composed from the natal point, aspect, friend name, and their planet">{activationTitle}</Fact>
                </p>
                {loadingSynastry
                  ? <PageLoading compact message="Opening the synastry source…" />
                  : synastry.error
                    ? <p role="alert">{synastry.error}</p>
                    : (
                      <p>
                        <Passage ariaLabel="Edit this activation" kind="hook" onClick={openActivation}>
                          {synastryBody || "No stored synastry pair was found for this activation. Write that natal contact separately, then return here to see it on the compiled page."}
                        </Passage>
                      </p>
                    )}
              </div>
              <div className="admin-composition-preview-field">
                <span className="admin-eyebrow">Calculated astrology</span>
                <p>
                  <Fact title="This last line is calculated from the chart. It is not authored on this row.">{fact}</Fact>
                </p>
              </div>
            </div>
          </div>
        )}
        {view === "template" && (
          <div className="admin-sky-placement-template">
            <p>The live article joins these sections in order. Opening is one saved row. What this activates is a separate synastry pair. The astrology line is calculated and is not stored on either row.</p>
            <ol aria-label="Between you two template order">
              <li>
                <span className="admin-composition-variable variable-fact" data-variable-color="1">Headline</span>
                <code className="admin-sky-section-reference">calculated · planet + aspect + natal point</code>
                <p className="admin-composition-source-copy">{headline}</p>
              </li>
              <li>
                <StudioButton type="button" className="admin-composition-variable variable-copy" data-variable-color="3" onClick={openOpening} aria-label="Edit opening">
                  Opening
                </StudioButton>
                <code className="admin-sky-section-reference">{`${contentKey}#${openingField}`}</code>
                <p className="admin-composition-source-copy">{opening || "Empty · skipped"}</p>
              </li>
              <li>
                <StudioButton type="button" className="admin-composition-variable variable-hook" data-variable-color="2" disabled={!synastryKey} onClick={openActivation} aria-label="Edit this activation">
                  What this activates
                </StudioButton>
                <code className="admin-sky-section-reference">{synastryKey ? `${synastryKey}#${synastryField}` : "synastry-pair · not saved"}</code>
                <p className="admin-composition-source-copy">{synastryBody || "Empty · skipped"}</p>
              </li>
              <li>
                <span className="admin-composition-variable variable-fact" data-variable-color="1">Calculated astrology</span>
                <code className="admin-sky-section-reference">calculated · sign, house, natal sign</code>
                <p className="admin-composition-source-copy">{fact}</p>
              </li>
            </ol>
          </div>
        )}
        {view === "assembly" && (
          <>
            <article className="admin-composition-source-card" aria-label="Opening source">
              <strong>Opening</strong>
              <small>Included in this writing path</small>
              <p className="admin-composition-source-copy">{opening || "No writing saved for this section."}</p>
              <StudioButton type="button" onClick={openOpening}>Edit opening</StudioButton>
              <details className="admin-workspace-details">
                <AdminDisclosureSummary>Source details</AdminDisclosureSummary>
                <code>{contentKey}</code>
              </details>
            </article>
            <article className="admin-composition-source-card" aria-label="What this activates source">
              <strong>What this activates</strong>
              <small>{synastryBody ? "Included in this writing path" : "No saved synastry pair for this example"}</small>
              <p className="admin-composition-source-copy">{synastryBody || "No writing saved for this section."}</p>
              <StudioButton type="button" disabled={!synastryKey} onClick={openActivation}>Edit this activation</StudioButton>
              <details className="admin-workspace-details">
                <AdminDisclosureSummary>Source details</AdminDisclosureSummary>
                <code>{synastryKey || "not saved"}</code>
              </details>
            </article>
          </>
        )}
      </StudioTabs>
    </section>
  );
}
