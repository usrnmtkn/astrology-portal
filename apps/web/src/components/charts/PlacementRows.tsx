import { ChevronRight } from "lucide-react";
import type { PlanetPosition, SkySnapshot } from "../../types";
import {
  aspectGlyph,
  aspectIconFiles,
  normalizeAspectType,
  pointGlyph,
  pointIconFiles,
  pointRetrogradeIconFiles,
  zodiacAssetHref
} from "./chartAssets";

export type SocialPlacementRow = {
  id: string;
  glyph: string;
  label: string;
  sign: string;
  degree: number;
  house: number | null;
  retrograde: boolean;
};

type EssentialDignity = "domicile" | "exaltation" | "detriment" | "fall";
type DignityTone = "good" | "weak" | "neutral";

export type PlacementDignity = {
  dignity: EssentialDignity;
  label: string;
  tone: DignityTone;
};

export type PlacementRowStatus = {
  label: string;
  tone: "muted" | "alert" | "retrograde";
};

export const placementPlanetOrder = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
const socialPlacementOrder = [...placementPlanetOrder, "Ascendant"];

const natalSignatureDescriptions: Record<string, string> = {
  Ascendant: "Your motivation for living life",
  Sun: "Your identity and where you shine",
  Moon: "Your inner world and emotions",
  Mercury: "How and where you communicate",
  Venus: "How and where you connect",
  Mars: "How and where you take action",
  Jupiter: "How and where you grow",
  Saturn: "Where you build and commit",
  Uranus: "How and where you break free",
  Neptune: "How and where you dream",
  Pluto: "How and where you transform"
};

const dignityLabelParts: Record<EssentialDignity, { adjective: string; name: string; tone: DignityTone }> = {
  domicile: { adjective: "Natural", name: "Domicile", tone: "good" },
  exaltation: { adjective: "Empowered", name: "Exaltation", tone: "good" },
  detriment: { adjective: "Constrained", name: "Detriment", tone: "weak" },
  fall: { adjective: "Weakened", name: "Fall", tone: "weak" }
};

const planetDignities: Record<string, Partial<Record<string, EssentialDignity>>> = {
  Sun: {
    Leo: "domicile",
    Aries: "exaltation",
    Aquarius: "detriment",
    Libra: "fall"
  },
  Moon: {
    Cancer: "domicile",
    Taurus: "exaltation",
    Capricorn: "detriment",
    Scorpio: "fall"
  },
  Mercury: {
    Gemini: "domicile",
    Virgo: "domicile",
    Sagittarius: "detriment",
    Pisces: "fall"
  },
  Venus: {
    Taurus: "domicile",
    Libra: "domicile",
    Pisces: "exaltation",
    Aries: "detriment",
    Scorpio: "detriment",
    Virgo: "fall"
  },
  Mars: {
    Aries: "domicile",
    Scorpio: "domicile",
    Capricorn: "exaltation",
    Taurus: "detriment",
    Libra: "detriment",
    Cancer: "fall"
  },
  Jupiter: {
    Sagittarius: "domicile",
    Pisces: "domicile",
    Cancer: "exaltation",
    Gemini: "detriment",
    Virgo: "detriment",
    Capricorn: "fall"
  },
  Saturn: {
    Capricorn: "domicile",
    Aquarius: "domicile",
    Libra: "exaltation",
    Cancer: "detriment",
    Leo: "detriment",
    Aries: "fall"
  }
};

function normalizedAngle(value: number) {
  return ((value % 360) + 360) % 360;
}

export function ordinalHouse(house: number) {
  const rem100 = house % 100;

  if (rem100 >= 11 && rem100 <= 13) {
    return `${house}th`;
  }

  const suffixes: Record<number, string> = {
    1: "st",
    2: "nd",
    3: "rd"
  };

  return `${house}${suffixes[house % 10] ?? "th"}`;
}

export function socialPlacementRows(sky: SkySnapshot | null): SocialPlacementRow[] {
  if (!sky) {
    return [];
  }

  const positionMap = new Map(sky.positions.map((position) => [position.planet, position]));

  return socialPlacementOrder.flatMap((point) => {
    if (point === "Ascendant") {
      return [{
        id: "Ascendant",
        glyph: pointGlyph("Ascendant"),
        label: "Ascendant",
        sign: sky.ascendant,
        degree: normalizedAngle(sky.ascendantLongitude ?? 0) % 30,
        house: 1,
        retrograde: false
      }];
    }

    const position = positionMap.get(point);

    if (!position) {
      return [];
    }

    return [{
      id: point,
      glyph: position.glyph || pointGlyph(point),
      label: point,
      sign: position.sign,
      degree: position.degree,
      house: position.house || null,
      retrograde: position.motion === "retrograde"
    }];
  });
}

export function socialPlacementDegree(degree: number) {
  const rounded = Math.round(degree);
  return `${rounded === 30 ? 0 : rounded}°`;
}

export function dignityFor(planet: string, sign: string): PlacementDignity | null {
  const dignity = planetDignities[planet]?.[sign] ?? null;

  if (!dignity) {
    return null;
  }

  const labelParts = dignityLabelParts[dignity];

  return {
    dignity,
    label: `${labelParts.adjective} · ${labelParts.name}`,
    tone: labelParts.tone
  };
}

export function placementDignity(position: PlanetPosition) {
  return dignityFor(position.planet, position.sign);
}

export function placementTitleFromParts(planet: string, sign: string, retrograde = false) {
  return `${planet}${retrograde ? " Rx" : ""} in ${sign}`;
}

export function natalPlacementDescription(planet: string) {
  return natalSignatureDescriptions[planet] ?? "A signature in your chart";
}

export function InlineGlyphIcon({ fallback, href, label }: { fallback: string; href: string | null; label: string }) {
  if (!href) {
    return <span>{fallback}</span>;
  }

  return (
    <span className="inline-glyph-icon" aria-label={label}>
      <img src={href} alt="" aria-hidden="true" />
    </span>
  );
}

export function AspectGlyphs({ from, aspect, to }: { from: string; aspect: string; to: string }) {
  return (
    <span className="aspect-row-glyphs" aria-hidden="true">
      <InlineGlyphIcon fallback={pointGlyph(from)} href={zodiacAssetHref(pointIconFiles[from])} label={from} />
      <InlineGlyphIcon fallback={aspectGlyph(aspect)} href={zodiacAssetHref(aspectIconFiles[normalizeAspectType(aspect)])} label={aspect} />
      <InlineGlyphIcon fallback={pointGlyph(to)} href={zodiacAssetHref(pointIconFiles[to])} label={to} />
    </span>
  );
}

function uppercaseDignityLabel(dignity: PlacementDignity) {
  return dignity.label.toUpperCase();
}

export function DignityBadge({ dignity, uppercase = false }: { dignity: PlacementDignity | null; uppercase?: boolean }) {
  if (!dignity) {
    return null;
  }

  return (
    <span className={`spl-dig spl-dig--${dignity.tone}`}>
      {uppercase ? uppercaseDignityLabel(dignity) : dignity.label}
    </span>
  );
}

function placementTableMeta(house?: number | null, degree?: string | null) {
  const houseLabel = typeof house === "number" ? `${ordinalHouse(house)} House` : degree ? "House pending" : null;

  if (degree && houseLabel) {
    return `${houseLabel} · ${degree}`;
  }

  if (degree) {
    return degree;
  }

  return houseLabel;
}

export function PlacementGlyphIcon({
  className,
  fallback,
  pointName,
  retrograde = false
}: {
  className: string;
  fallback: string;
  pointName?: string;
  retrograde?: boolean;
}) {
  const fileName = pointName
    ? retrograde
      ? pointRetrogradeIconFiles[pointName] ?? pointIconFiles[pointName]
      : pointIconFiles[pointName]
    : undefined;
  const href = zodiacAssetHref(fileName);

  return (
    <span className={className} aria-hidden="true">
      {href ? <img className="placement-glyph-svg" src={href} alt="" aria-hidden="true" /> : fallback}
    </span>
  );
}

export function PlacementTableRow({
  ariaLabel,
  asButton = false,
  degree,
  description,
  dignity,
  glyph,
  house,
  onClick,
  pointName,
  retrograde = false,
  title,
  variant = "natal"
}: {
  ariaLabel?: string;
  asButton?: boolean;
  degree?: string | null;
  description?: string | null;
  dignity?: PlacementDignity | null;
  glyph: string;
  house?: number | null;
  onClick?: () => void;
  pointName?: string;
  retrograde?: boolean;
  title: string;
  variant?: "natal" | "friend" | "composite";
}) {
  const meta = placementTableMeta(house, degree);
  const className = [
    "placement-table-row",
    `placement-table-row--${variant}`,
    retrograde ? "is-retrograde" : ""
  ].filter(Boolean).join(" ");
  const content = (
    <>
      <PlacementGlyphIcon className="placement-table-row__glyph" fallback={glyph} pointName={pointName} retrograde={retrograde} />
      <span className="placement-table-row__body">
        <span className="placement-table-row__topline">
          <span className="placement-table-row__title">{title}</span>
          <DignityBadge dignity={dignity ?? null} />
        </span>
        {description ? <span className="placement-table-row__description">{description}</span> : null}
      </span>
      {meta ? <span className="placement-table-row__meta placement-row__house placement-row__degree">{meta}</span> : null}
    </>
  );

  if (asButton || onClick) {
    return (
      <button className={className} type="button" aria-label={ariaLabel ?? title} onClick={onClick}>
        {content}
      </button>
    );
  }

  return (
    <div className={className} aria-label={ariaLabel ?? title}>
      {content}
    </div>
  );
}

export function PlanetPlacementRow({
  ariaLabel,
  chevron = false,
  degree,
  description,
  dignity,
  durationLabel,
  glyph,
  house,
  onClick,
  pointName,
  rangeLabel,
  retrograde = false,
  statuses = [],
  title,
  variant
}: {
  ariaLabel?: string;
  chevron?: boolean;
  degree: string;
  description?: string | null;
  dignity?: PlacementDignity | null;
  durationLabel?: string | null;
  glyph: string;
  house?: number | null;
  onClick?: () => void;
  pointName?: string;
  rangeLabel?: string | null;
  retrograde?: boolean;
  statuses?: PlacementRowStatus[];
  title: string;
  variant: "sky" | "natal" | "friend" | "synastry" | "composite";
}) {
  if (variant !== "sky") {
    return (
      <PlacementTableRow
        ariaLabel={ariaLabel}
        asButton={Boolean(onClick)}
        degree={degree}
        description={description}
        dignity={dignity}
        glyph={glyph}
        house={house}
        onClick={onClick}
        pointName={pointName}
        retrograde={retrograde}
        title={title}
        variant={variant === "composite" ? "composite" : variant === "friend" ? "friend" : "natal"}
      />
    );
  }

  const hasTiming = Boolean(durationLabel || rangeLabel);
  const houseLabel = typeof house === "number" ? `${ordinalHouse(house)} House` : "House pending";
  const rowClassName = [
    "planet-placement-row",
    `planet-placement-row--${variant}`,
    retrograde ? "is-retrograde" : ""
  ].filter(Boolean).join(" ");
  const content = (
    <>
      <PlacementGlyphIcon className="planet-placement-row__glyph" fallback={glyph} pointName={pointName} retrograde={retrograde} />
      <span className="planet-placement-row__body">
        <span className="planet-placement-row__topline">
          <span className="planet-placement-row__title">{title}</span>
          <span className="planet-placement-row__degree placement-row__degree">{degree}</span>
          <DignityBadge dignity={dignity ?? null} uppercase={variant === "sky"} />
        </span>
        {hasTiming ? (
          <span className="planet-placement-row__meta planet-placement-row__meta--timing">
            {durationLabel ? <span className="planet-placement-row__duration">{durationLabel}</span> : null}
            {durationLabel && rangeLabel ? <span aria-hidden="true">·</span> : null}
            {rangeLabel ? <span>{rangeLabel}</span> : null}
          </span>
        ) : (
          <span className="planet-placement-row__meta placement-row__house">{houseLabel}</span>
        )}
        {statuses.length > 0 ? (
          <span className="planet-placement-row__status" aria-label={`${title} status`}>
            {statuses.map((status) => (
              <span className={`spl-status-item spl-status-${status.tone}`} key={status.label}>
                {status.label.toUpperCase()}
              </span>
            ))}
          </span>
        ) : null}
      </span>
      {chevron ? <ChevronRight className="planet-placement-row__chevron" aria-hidden="true" /> : null}
    </>
  );

  if (onClick) {
    return (
      <button
        className={rowClassName}
        type="button"
        aria-label={ariaLabel ?? title}
        onClick={onClick}
      >
        {content}
      </button>
    );
  }

  return (
    <article className={rowClassName} aria-label={ariaLabel ?? title}>
      {content}
    </article>
  );
}

export function FriendPlacementTable({
  title,
  rows,
  compact = false,
  generatedContent,
  generatedContext = "natal",
  showTitle = true
}: {
  title: string;
  rows: SocialPlacementRow[];
  compact?: boolean;
  generatedContent?: unknown;
  generatedContext?: "natal" | "composite";
  showTitle?: boolean;
}) {
  void generatedContent;

  return (
    <section className={`friend-placement-column ${compact ? "friend-placement-column-compact" : ""}`} aria-label={`${title} placements`}>
      {showTitle ? <h3 className="friend-placement-column-title">{title}</h3> : null}
      <div className="friend-placement-table">
        {rows.map((row) => {
          const dignity = dignityFor(row.label, row.sign);

          return (
            <div className={`friend-placement-row${compact ? " friend-placement-row-compact" : ""}`} key={row.id}>
              <PlanetPlacementRow
                degree={socialPlacementDegree(row.degree)}
                description={natalPlacementDescription(row.label)}
                dignity={dignity}
                glyph={row.glyph}
                house={row.house}
                pointName={row.label}
                retrograde={row.retrograde}
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

const relationshipPlacementOrder = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "True Node"];

function relationshipPlacementPreview(sky: SkySnapshot | null | undefined) {
  if (!sky) {
    return [];
  }

  return relationshipPlacementOrder
    .map((planet) => sky.positions.find((position) => position.planet === planet))
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

  return (
    <section className="synastry-placements-comparison" aria-label="Synastry placements comparison">
      <span className="eyebrow section-label friend-section-label">Placements</span>
      <div className="synastry-placement-columns">
        <SynastryPlacementColumn
          title={outerName}
          ringLabel="Outer ring"
          placements={relationshipPlacementPreview(outerSky)}
          variant="outer"
        />
        <SynastryPlacementColumn
          title={innerTitle}
          ringLabel="Inner ring"
          placements={relationshipPlacementPreview(innerSky)}
          variant="inner"
        />
      </div>
    </section>
  );
}

function SynastryPlacementColumn({
  title,
  ringLabel,
  placements,
  variant
}: {
  title: string;
  ringLabel: string;
  placements: PlanetPosition[];
  variant: "outer" | "inner";
}) {
  return (
    <section className={`synastry-placement-column synastry-placement-column-${variant}`}>
      <div className="synastry-placement-column-header">
        <h3>{title}</h3>
        <strong className="synastry-placement-panel-ring">{ringLabel}</strong>
      </div>
      {placements.length > 0 ? (
        <div className="synastry-placement-table">
          {placements.map((position) => (
            <div className={`synastry-placement-row${position.motion === "retrograde" ? " is-retrograde" : ""}`} key={`${ringLabel}-${position.planet}`}>
              <SynastryPlacementLead position={position} />
              <span className="synastry-placement-sign">{position.sign}</span>
              <span className="synastry-placement-meta">
                <span>{formatPlacementDegree(position)}</span>
                <span aria-hidden="true">·</span>
                <span>{typeof position.house === "number" ? `H${position.house}` : "H-"}</span>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="synastry-placement-empty">Complete this birth chart to show natal placements here.</p>
      )}
    </section>
  );
}

function SynastryPlacementLead({ position }: { position: PlanetPosition }) {
  const isRetrograde = position.motion === "retrograde" && position.planet !== "Ascendant";
  const retrogradeHref = isRetrograde ? zodiacAssetHref(pointRetrogradeIconFiles[position.planet]) : null;

  return (
    <span className="synastry-placement-lead" aria-hidden="true">
      <span className="synastry-placement-glyph">
        {retrogradeHref ? (
          <img className="synastry-rx-glyph-svg" src={retrogradeHref} alt="" aria-hidden="true" />
        ) : (
          position.glyph
        )}
      </span>
      {isRetrograde ? <span className="synastry-placement-rx-mark">Rx</span> : null}
    </span>
  );
}
