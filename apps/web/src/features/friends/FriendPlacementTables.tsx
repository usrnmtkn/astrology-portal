import type { PlanetPosition, SkySnapshot } from "../../types";
import { SKY_BODY_ORDER, normalizeSkyBodyName } from "../../astrologyConfig";
import { isDisplayRetrograde } from "../../services/astrologyDisplay";
import {
  PlanetPlacementRow,
  dignitiesFor,
  friendPlacementDescription,
  placementTitleFromParts,
  socialPlacementDegree,
  type SocialPlacementRow
} from "../../components/charts/PlacementRows";
import {
  pointGlyph,
  pointIconFiles,
  pointRetrogradeIconFiles,
  signGlyph,
  zodiacAssetHref,
  zodiacSignIconFiles
} from "../../components/charts/chartAssets";

type PlacementDescriptionContext = "self" | "person" | "chart" | "composite";

export function FriendPlacementTable({
  title,
  rows,
  compact = false,
  descriptionContext = "person",
  generatedContent,
  generatedContext = "natal",
  onPlacementClick,
  ownerName,
  showTitle = true
}: {
  title: string;
  rows: SocialPlacementRow[];
  compact?: boolean;
  descriptionContext?: PlacementDescriptionContext;
  generatedContent?: unknown;
  generatedContext?: "natal" | "composite";
  onPlacementClick?: (row: SocialPlacementRow) => void;
  ownerName?: string;
  showTitle?: boolean;
}) {
  void generatedContent;
  void descriptionContext;
  void ownerName;

  return (
    <section className={`friend-placement-column ${compact ? "friend-placement-column-compact" : ""}`} aria-label={`${title} placements`}>
      {showTitle ? <h3 className="friend-placement-column-title">{title}</h3> : null}
      <div className="friend-placement-table">
        {rows.map((row) => {
          const dignity = generatedContext === "composite" ? [] : dignitiesFor(row.label, row.sign, "they");

          return (
            <div className={`friend-placement-row${compact ? " friend-placement-row-compact" : ""}`} key={row.id}>
              <PlanetPlacementRow
                degree={socialPlacementDegree(row.degree)}
                description={row.description ?? (generatedContext === "composite" ? "" : friendPlacementDescription(row.label, row.sign))}
                dignity={dignity}
                glyph={row.glyph}
                house={row.house}
                onClick={onPlacementClick ? () => onPlacementClick(row) : undefined}
                pointName={row.label}
                retrograde={row.retrograde}
                sign={row.sign}
                title={placementTitleFromParts(row.label, row.sign, row.retrograde)}
                variant={generatedContext === "composite" ? "composite" : "friend"}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

const relationshipPlacementOrder = ["Sun", "Moon", "Ascendant", ...SKY_BODY_ORDER.slice(2)];

function normalizedAngle(value: number) {
  return ((value % 360) + 360) % 360;
}

function relationshipAscendantPlacement(sky: SkySnapshot): PlanetPosition {
  const longitude = typeof sky.ascendantLongitude === "number" ? normalizedAngle(sky.ascendantLongitude) : undefined;

  return {
    planet: "Ascendant",
    glyph: pointGlyph("Ascendant"),
    longitude,
    latitude: null,
    speed: null,
    sign: sky.ascendant,
    signGlyph: signGlyph(sky.ascendant),
    degree: typeof longitude === "number" ? longitude % 30 : 0,
    house: 1,
    houseSystem: "whole_sign",
    motion: "direct"
  };
}

function relationshipPlacementPreview(sky: SkySnapshot | null | undefined) {
  if (!sky) {
    return [];
  }

  return relationshipPlacementOrder
    .map((planet) => {
      if (planet === "Ascendant") {
        return relationshipAscendantPlacement(sky);
      }

      return sky.positions.find((position) => normalizeSkyBodyName(position.planet) === planet);
    })
    .filter((position): position is PlanetPosition => Boolean(position))
    .slice(0, 8);
}

function formatPlacementDegree(position: PlanetPosition) {
  const degree = Math.floor(position.degree);
  const minutes = Math.round((position.degree - degree) * 60);

  if (minutes === 60) {
    return `${degree + 1}°00'`;
  }

  return `${degree}°${String(minutes).padStart(2, "0")}'`;
}

export function SynastryPlacementsComparison({
  outerName,
  outerSky,
  innerName,
  innerSky,
  innerIsSelf
}: {
  outerName: string;
  outerSky: SkySnapshot | null | undefined;
  innerName: string;
  innerSky: SkySnapshot | null | undefined;
  innerIsSelf: boolean;
}) {
  const innerTitle = innerIsSelf ? "You" : innerName;
  const outerPlacements = relationshipPlacementPreview(outerSky);
  const innerPlacements = relationshipPlacementPreview(innerSky);
  const hasPlacements = outerPlacements.length > 0 || innerPlacements.length > 0;

  return (
    <section className="synastry-placements-comparison" aria-label="Synastry placements comparison">
      <span className="eyebrow section-label friend-section-label">Placements</span>
      {hasPlacements ? (
        <div className="synastry-placement-columns">
          <SynastryPlacementColumn name={outerName} placements={outerPlacements} variant="outer" />
          <SynastryPlacementColumn name={innerTitle} placements={innerPlacements} variant="inner" />
        </div>
      ) : (
        <div className="synastry-placement-columns">
          <p className="synastry-placement-empty">Complete this birth chart to show natal placements here.</p>
          <p className="synastry-placement-empty">Complete this birth chart to show natal placements here.</p>
        </div>
      )}
    </section>
  );
}

function SynastryPlacementColumn({
  name,
  placements,
  variant
}: {
  name: string;
  placements: PlanetPosition[];
  variant: "outer" | "inner";
}) {
  return (
    <section className={`synastry-placement-column synastry-placement-column-${variant}`} aria-label={`${name} placements`}>
      <div className="synastry-placement-column-header">
        <h3>{name}</h3>
      </div>
      <div className="synastry-placement-table">
        {placements.length > 0 ? (
          placements.map((position) => (
            <SynastryPlacementCard key={`${variant}-${position.planet}`} position={position} variant={variant} />
          ))
        ) : (
          <p className="synastry-placement-empty">Complete this birth chart to show natal placements here.</p>
        )}
      </div>
    </section>
  );
}

function SynastryPlacementCard({
  position,
  variant
}: {
  position: PlanetPosition | null;
  variant: "outer" | "inner";
}) {
  if (!position) {
    return <div className={`synastry-placement-row synastry-placement-row-empty synastry-placement-row-${variant}`} aria-hidden="true" />;
  }

  const isRetrograde = isDisplayRetrograde(position);

  return (
    <div
      className={`synastry-placement-row synastry-placement-row-${variant}${isRetrograde ? " is-retrograde" : ""}`}
      aria-label={`${position.planet}${isRetrograde ? " retrograde" : ""} in ${position.sign}, ${formatPlacementDegree(position)}${typeof position.house === "number" ? `, house ${position.house}` : ""}`}
    >
      <SynastryPlacementLead position={position} />
      <SynastryPlacementSign sign={position.sign} />
      <span className="synastry-placement-meta">
        <span className="synastry-placement-degree">{formatPlacementDegree(position)}</span>
        <span className="synastry-placement-meta-separator" aria-hidden="true">·</span>
        <span className="synastry-placement-house">{typeof position.house === "number" ? `H${position.house}` : "H-"}</span>
      </span>
    </div>
  );
}

function SynastryPlacementSign({ sign }: { sign: string }) {
  const signKey = Object.keys(zodiacSignIconFiles).find((key) => key.toLowerCase() === sign.toLowerCase());
  const iconHref = zodiacAssetHref(signKey ? zodiacSignIconFiles[signKey] : undefined);

  return (
    <span className="synastry-placement-sign" aria-label={sign}>
      {iconHref ? (
        <img className="synastry-placement-sign-svg" src={iconHref} alt="" aria-hidden="true" />
      ) : (
        sign
      )}
    </span>
  );
}

function SynastryPlacementLead({ position }: { position: PlanetPosition }) {
  const isRetrograde = isDisplayRetrograde(position) && position.planet !== "Ascendant";
  const iconHref = zodiacAssetHref(isRetrograde ? pointRetrogradeIconFiles[position.planet] ?? pointIconFiles[position.planet] : pointIconFiles[position.planet]);

  return (
    <span className="synastry-placement-lead" aria-hidden="true">
      <span className="synastry-placement-glyph">
        {iconHref ? <img className="synastry-rx-glyph-svg" src={iconHref} alt="" aria-hidden="true" /> : position.glyph}
      </span>
      {isRetrograde ? <span className="synastry-placement-rx-mark">Rx</span> : null}
    </span>
  );
}
