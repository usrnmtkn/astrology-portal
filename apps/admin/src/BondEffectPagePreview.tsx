import { useEffect, useState } from "react";
import { AdminDisclosureSummary, AdminSelect } from "./AdminNativeControls";
import { PageLoading } from "../../web/src/components/PageLoading";
import { StudioButton, StudioInput, StudioTabs } from "./StudioControls";
import {
  aspectTechnicalVerb,
  bondActivationHeadline,
  bondCalculatedFactLine,
  bondEffectExactContentKey,
  bondEffectPageHeadline,
  fillNamedSlots,
  parseBondEffectContentKey,
  synastryBodiesFromPayload,
  synastryHolderSlots,
  synastryPairLookupOrder
} from "./bondEffectPageAssembly";
import { requestStudioJson } from "./generatedContentClient";
import {
  transitNatalAspects,
  transitNatalHouses,
  transitNatalPlanets,
  transitNatalPointGroups,
  transitNatalPoints,
  transitNatalSigns,
  type TransitNatalAspect,
  type TransitNatalHouse,
  type TransitNatalPlanet,
  type TransitNatalPoint,
  type TransitNatalSign
} from "./transitNatalSources";

type SynastryLoad = {
  contentKey: string;
  forward: boolean;
  bodyYou: string;
  bodyThey: string;
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

function asPlanet(value: string | undefined): TransitNatalPlanet {
  return transitNatalPlanets.includes(value as TransitNatalPlanet) ? value as TransitNatalPlanet : "sun";
}

function asAspect(value: string | undefined): TransitNatalAspect | "soft" | "hard" {
  if (value === "soft" || value === "hard") return value;
  return transitNatalAspects.includes(value as TransitNatalAspect) ? value as TransitNatalAspect : "square";
}

function asNatalPoint(value: string | undefined): TransitNatalPoint {
  return transitNatalPoints.includes(value as TransitNatalPoint) ? value as TransitNatalPoint : "ascendant";
}

function asFriendPoint(value: string | undefined): TransitNatalPoint {
  return transitNatalPoints.includes(value as TransitNatalPoint) ? value as TransitNatalPoint : "saturn";
}

function asActivationAspect(value: string | undefined): TransitNatalAspect {
  return transitNatalAspects.includes(value as TransitNatalAspect) ? value as TransitNatalAspect : "square";
}

export default function BondEffectPagePreview({
  contentKey,
  youText,
  theyText,
  secret,
  onOpenSource,
  onContactChange,
  onActivationChange,
  previewNatalPoint,
  previewFriendPoint,
  previewActivationAspect
}: {
  contentKey: string;
  youText: string;
  theyText: string;
  secret: string;
  onOpenSource: (contentKey: string, label: string, field?: string) => void;
  onContactChange?: (contact: { planet: string; aspect: string; natalPoint: string }) => void;
  onActivationChange?: (activation: { friendPoint: string; aspect: string }) => void;
  previewNatalPoint?: TransitNatalPoint;
  previewFriendPoint?: string;
  previewActivationAspect?: string;
}) {
  const contact = parseBondEffectContentKey(contentKey);
  const [view, setView] = useState<(typeof views)[number]["id"]>("preview");
  const [audience, setAudience] = useState<"you" | "they">("they");
  const [friendName, setFriendName] = useState("Name");
  const [transitingPlanet, setTransitingPlanet] = useState<TransitNatalPlanet>(asPlanet(contact?.planet));
  const [transitAspect, setTransitAspect] = useState<TransitNatalAspect | "soft" | "hard">(asAspect(contact?.aspect));
  const [natalPoint, setNatalPoint] = useState<TransitNatalPoint>(asNatalPoint(previewNatalPoint));
  const [friendPoint, setFriendPoint] = useState<TransitNatalPoint>(asFriendPoint(previewFriendPoint));
  const [activationAspect, setActivationAspect] = useState<TransitNatalAspect>(asActivationAspect(previewActivationAspect));
  const [transitSign, setTransitSign] = useState<TransitNatalSign>("libra");
  const [natalSign, setNatalSign] = useState<TransitNatalSign>("gemini");
  const [transitHouse, setTransitHouse] = useState<TransitNatalHouse>("5");
  const [synastry, setSynastry] = useState<{ key: string; load?: SynastryLoad; error?: string }>({ key: "" });

  useEffect(() => {
    const next = parseBondEffectContentKey(contentKey);
    if (!next) return;
    setTransitingPlanet(asPlanet(next.planet));
    setTransitAspect(asAspect(next.aspect));
  }, [contentKey]);

  useEffect(() => {
    if (previewNatalPoint) setNatalPoint(previewNatalPoint);
  }, [previewNatalPoint]);

  useEffect(() => {
    if (previewFriendPoint) setFriendPoint(previewFriendPoint);
  }, [previewFriendPoint]);

  useEffect(() => {
    if (previewActivationAspect) setActivationAspect(previewActivationAspect);
  }, [previewActivationAspect]);

  function commitContact(next: {
    planet?: TransitNatalPlanet;
    aspect?: TransitNatalAspect | "soft" | "hard";
    natalPoint?: TransitNatalPoint;
  }) {
    const planet = next.planet ?? transitingPlanet;
    const aspect = next.aspect ?? transitAspect;
    const nextNatal = next.natalPoint ?? natalPoint;
    if (next.planet) setTransitingPlanet(next.planet);
    if (next.aspect) setTransitAspect(next.aspect);
    if (next.natalPoint) setNatalPoint(next.natalPoint);
    onContactChange?.({ planet, aspect, natalPoint: nextNatal });
  }

  function commitActivation(next: { friendPoint?: TransitNatalPoint; aspect?: TransitNatalAspect }) {
    const nextFriend = next.friendPoint ?? friendPoint;
    const nextAspect = next.aspect ?? activationAspect;
    if (next.friendPoint) setFriendPoint(next.friendPoint);
    if (next.aspect) setActivationAspect(next.aspect);
    onActivationChange?.({ friendPoint: nextFriend, aspect: nextAspect });
  }

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
          if (bodies && (bodies.body_you.trim() || bodies.body_they.trim())) {
            if (!cancelled) {
              setSynastry({
                key: lookupKey,
                load: {
                  contentKey: bodies.contentKey || candidate.contentKey,
                  forward: candidate.forward,
                  bodyYou: bodies.body_you,
                  bodyThey: bodies.body_they
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

  if (!contact && !onContactChange) return null;

  const openingField = audience === "you" ? "body_you" : "body_they";
  const openingYou = fillNamedSlots(youText, { holder1: friendName.trim() || "Name" }).trim();
  const openingThey = fillNamedSlots(theyText, { holder1: friendName.trim() || "Name" }).trim();
  const opening = audience === "you" ? openingYou : openingThey;
  const headline = bondEffectPageHeadline(transitingPlanet, transitAspect, natalPoint);
  const openingKey = onContactChange ? bondEffectExactContentKey(transitingPlanet, transitAspect) : contentKey;
  const activationTitle = bondActivationHeadline(natalPoint, activationAspect, friendName, friendPoint);
  const fact = bondCalculatedFactLine({
    planet: transitingPlanet,
    transitSign,
    transitHouse,
    aspect: transitAspect,
    natalPoint,
    natalSign
  });
  const loadedSynastry = synastry.load;
  const synastryYou = loadedSynastry
    ? fillNamedSlots(loadedSynastry.bodyYou, synastryHolderSlots(loadedSynastry.forward, friendName)).trim()
    : "";
  const synastryThey = loadedSynastry
    ? fillNamedSlots(loadedSynastry.bodyThey, synastryHolderSlots(loadedSynastry.forward, friendName)).trim()
    : "";
  const synastryBody = audience === "you" ? synastryYou : synastryThey;
  const loadingSynastry = synastry.key !== lookupKey || (loadedSynastry === undefined && !synastry.error);
  const synastryField = audience === "you" ? "body_you" : "body_they";
  const synastryKey = loadedSynastry?.contentKey || lookup[0]?.contentKey;
  const openOpening = () => onOpenSource(openingKey, "Between you two opening", openingField);
  const openActivation = (field = synastryField) => {
    if (!synastryKey) return;
    onOpenSource(synastryKey, activationTitle, field);
  };

  return (
    <section className="admin-composition-surface-actions admin-sky-placement-composition" aria-label="Between you two composition map" data-bond-page-preview="true">
      <p>
        This page has two compiled maps. Between you two is the transiting contact. What this activates is a separate synastry pair from the friend chart. Change either set of dropdowns to reload that map.
      </p>
      <fieldset className="admin-metadata-fields" aria-label="Between you two transit">
        <legend>Between you two</legend>
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
          <span>Transiting planet</span>
          <AdminSelect
            aria-label="Transiting planet"
            value={transitingPlanet}
            onChange={(event) => commitContact({ planet: event.target.value as TransitNatalPlanet })}
          >
            {transitNatalPlanets.map((planet) => (
              <option key={planet} value={planet}>{planet.replace(/-/gu, " ")}</option>
            ))}
          </AdminSelect>
        </label>
        <label>
          <span>Aspect</span>
          <AdminSelect
            aria-label="Transit aspect"
            value={transitAspect}
            onChange={(event) => commitContact({ aspect: event.target.value as TransitNatalAspect })}
          >
            {(transitAspect === "soft" || transitAspect === "hard" ? [transitAspect, ...transitNatalAspects] : transitNatalAspects).map((aspect) => (
              <option key={aspect} value={aspect}>{aspect === "soft" || aspect === "hard" ? aspect : aspectTechnicalVerb(aspect)}</option>
            ))}
          </AdminSelect>
        </label>
        <label>
          <span>Your natal point</span>
          <AdminSelect
            aria-label="Preview natal point"
            value={natalPoint}
            onChange={(event) => commitContact({ natalPoint: event.target.value as TransitNatalPoint })}
          >
            {transitNatalPointGroups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.values.map((point) => <option key={point} value={point}>{point.replace(/-/gu, " ")}</option>)}
              </optgroup>
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
      <div className="admin-sky-writing-source-actions" role="group" aria-label="Open Between you two opening">
        <StudioButton type="button" onClick={() => openOpening()}>Open opening editor</StudioButton>
      </div>
      <fieldset className="admin-metadata-fields" aria-label="What this activates synastry">
        <legend>What this activates</legend>
        <label>
          <span>Their planet or point</span>
          <AdminSelect aria-label="Preview friend point" value={friendPoint} onChange={(event) => commitActivation({ friendPoint: event.target.value as TransitNatalPoint })}>
            {transitNatalPoints.map((point) => <option key={point} value={point}>{point.replace(/-/gu, " ")}</option>)}
          </AdminSelect>
        </label>
        <label>
          <span>Activation aspect</span>
          <AdminSelect aria-label="Preview synastry aspect" value={activationAspect} onChange={(event) => commitActivation({ aspect: event.target.value as TransitNatalAspect })}>
            {(["square", "opposition", "conjunction", "trine", "sextile"] as const).map((aspect) => (
              <option key={aspect} value={aspect}>{aspectTechnicalVerb(aspect)}</option>
            ))}
          </AdminSelect>
        </label>
      </fieldset>
      <div className="admin-sky-writing-source-actions" role="group" aria-label="Open What this activates">
        <StudioButton type="button" disabled={!synastryKey} onClick={() => openActivation("body_you")}>Open You activation</StudioButton>
        <StudioButton type="button" disabled={!synastryKey} onClick={() => openActivation("body_they")}>Open Friend activation</StudioButton>
      </div>
      <StudioTabs label="Friends composition views" value={view} onValueChange={setView} tabs={views.map((item) => ({ value: item.id, label: item.label }))}>
        <div className="admin-composition-variable-legend" aria-label="Composition color key">
          <span className="variable-fact" data-variable-color="1">Calculated fact</span>
          <span className="variable-hook" data-variable-color="2">Authored hook</span>
          <span className="variable-copy" data-variable-color="3">Saved copy</span>
        </div>
        {view === "preview" && (
          <>
            <div className="admin-template-reader-surface">
              <div className="admin-composition-preview-chrome">
                <span>Between you two</span>
                <span>Saved source preview</span>
              </div>
              <header>
                <p className="admin-eyebrow">Composition Map</p>
                <h3>{headline}</h3>
              </header>
              <div className="admin-template-reader-copy">
                <div className="admin-composition-preview-field">
                  <span className="admin-eyebrow">Headline</span>
                  <p>
                    <Fact title="Transiting planet comes from the selected contact">{titleFromKey(transitingPlanet)}</Fact>
                    {" "}
                    <Fact title="Aspect comes from the selected contact">{aspectTechnicalVerb(transitAspect)}</Fact>
                    {" your "}
                    <Fact title="Natal point comes from the selected chart example">{titleFromKey(natalPoint)}</Fact>
                  </p>
                </div>
                <div className="admin-composition-preview-field field-body">
                  <span className="admin-eyebrow">Opening · They</span>
                  <p>
                    <Passage ariaLabel="Edit Friend opening" kind="copy" onClick={() => onOpenSource(openingKey, "Between you two opening", "body_they")}>
                      {openingThey || "No Friend opening saved. Select to write this section."}
                    </Passage>
                  </p>
                </div>
                <div className="admin-composition-preview-field field-body">
                  <span className="admin-eyebrow">Opening · You</span>
                  <p>
                    <Passage ariaLabel="Edit You opening" kind="copy" onClick={() => onOpenSource(openingKey, "Between you two opening", "body_you")}>
                      {openingYou || "No You opening saved. Select to write this section."}
                    </Passage>
                  </p>
                </div>
                <div className="admin-composition-preview-field">
                  <span className="admin-eyebrow">Calculated astrology</span>
                  <p>
                    <Fact title="This last line is calculated from the chart. It is not authored on this row.">{fact}</Fact>
                  </p>
                </div>
              </div>
            </div>
            <div className="admin-template-reader-surface">
              <div className="admin-composition-preview-chrome">
                <span>What this activates</span>
                <span>Saved source preview</span>
              </div>
              <header>
                <p className="admin-eyebrow">Composition Map</p>
                <h3>{activationTitle}</h3>
              </header>
              <div className="admin-template-reader-copy">
                <div className="admin-composition-preview-field">
                  <span className="admin-eyebrow">Heading</span>
                  <p>
                    <Fact title="This heading is composed from the natal point, aspect, friend name, and their planet">{activationTitle}</Fact>
                  </p>
                </div>
                {loadingSynastry
                  ? <PageLoading compact message="Opening the synastry source…" />
                  : synastry.error
                    ? <p role="alert">{synastry.error}</p>
                    : (
                      <>
                        <div className="admin-composition-preview-field field-body">
                          <span className="admin-eyebrow">You</span>
                          <p>
                            <Passage ariaLabel="Edit You activation" kind="hook" onClick={() => openActivation("body_you")}>
                              {synastryYou || "No You activation saved for this pair."}
                            </Passage>
                          </p>
                        </div>
                        <div className="admin-composition-preview-field field-body">
                          <span className="admin-eyebrow">Friend</span>
                          <p>
                            <Passage ariaLabel="Edit Friend activation" kind="hook" onClick={() => openActivation("body_they")}>
                              {synastryThey || "No Friend activation saved for this pair."}
                            </Passage>
                          </p>
                        </div>
                      </>
                    )}
              </div>
            </div>
          </>
        )}
        {view === "template" && (
          <div className="admin-sky-placement-template">
            <p>The live article joins Between you two and What this activates in that order. Each map has its own saved row. The astrology line is calculated.</p>
            <ol aria-label="Between you two template order">
              <li>
                <span className="admin-composition-variable variable-fact" data-variable-color="1">Headline</span>
                <code className="admin-sky-section-reference">calculated · planet + aspect + natal point</code>
                <p className="admin-composition-source-copy">{headline}</p>
              </li>
              <li>
                <StudioButton type="button" className="admin-composition-variable variable-copy" data-variable-color="3" onClick={() => openOpening()} aria-label="Edit opening">
                  Opening
                </StudioButton>
                <code className="admin-sky-section-reference">{`${openingKey}#${openingField}`}</code>
                <p className="admin-composition-source-copy">{opening || "Empty · skipped"}</p>
              </li>
            </ol>
            <ol aria-label="What this activates template order">
              <li>
                <span className="admin-composition-variable variable-fact" data-variable-color="1">Heading</span>
                <code className="admin-sky-section-reference">calculated · natal point + aspect + their planet</code>
                <p className="admin-composition-source-copy">{activationTitle}</p>
              </li>
              <li>
                <StudioButton type="button" className="admin-composition-variable variable-hook" data-variable-color="2" disabled={!synastryKey} onClick={() => openActivation()} aria-label="Edit this activation">
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
            <article className="admin-composition-source-card" aria-label="Between you two opening source">
              <strong>Between you two</strong>
              <small>Opening row for the transiting contact</small>
              <p className="admin-composition-source-copy">{openingThey || openingYou || "No writing saved for this section."}</p>
              <StudioButton type="button" onClick={() => openOpening()}>Edit opening</StudioButton>
              <details className="admin-workspace-details">
                <AdminDisclosureSummary>Source details</AdminDisclosureSummary>
                <code>{openingKey}</code>
              </details>
            </article>
            <article className="admin-composition-source-card" aria-label="What this activates source">
              <strong>What this activates</strong>
              <small>{synastryYou || synastryThey ? "Synastry pair from the friend chart" : "No saved synastry pair for this example"}</small>
              <p className="admin-composition-source-copy">{synastryThey || synastryYou || "No writing saved for this section."}</p>
              <StudioButton type="button" disabled={!synastryKey} onClick={() => openActivation()}>Edit this activation</StudioButton>
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
