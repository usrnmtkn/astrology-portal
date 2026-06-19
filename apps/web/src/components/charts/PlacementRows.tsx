import type { PlanetPosition, SkySnapshot } from "../../types";
import { FloatingTooltip } from "../ui/FloatingTooltip";
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
  description: string;
};

export type PlacementRowStatus = {
  label: string;
  tone: "muted" | "alert" | "retrograde";
};

export type PlacementHouseInsight = {
  houseLabel: string;
  naturalLensLabel: string;
  houseBody?: string;
  lensBody: string;
  naturalLensBody?: string;
  rulerBody?: string;
};

export const placementPlanetOrder = [
  "Sun",
  "Moon",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
  "Pluto",
  "Chiron",
  "Lilith"
];
const socialPlacementOrder = ["Sun", "Moon", "Ascendant", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "Chiron", "Lilith"];

const natalSignatureDescriptions: Record<string, string> = {
  Sun: "Your core self and vitality",
  Moon: "Your inner world and what you need to feel safe",
  Ascendant: "How you meet the world and come across",
  Mercury: "How you think and communicate",
  Venus: "What you value and who you're drawn to",
  Mars: "How you direct your energy and act",
  Jupiter: "Where you grow and reach for more",
  Saturn: "What you commit to and build",
  Uranus: "Where you break the pattern",
  Neptune: "Where you dream and idealize",
  Pluto: "Where you transform and reclaim power",
  Chiron: "Where old tenderness asks for care",
  Lilith: "Where the untamed part of you refuses to be managed"
};

type PlacementDescriptionContext = "self" | "person" | "chart" | "composite";

const chartPlacementDescriptions: Record<string, string> = {
  Ascendant: "How this chart meets the world",
  Sun: "This chart's identity and life force",
  Moon: "This chart's emotional rhythm",
  Mercury: "How this chart communicates",
  Venus: "How this chart connects",
  Mars: "How this chart takes action",
  Jupiter: "How this chart grows",
  Saturn: "Where this chart builds and commits",
  Uranus: "How this chart breaks from pattern",
  Neptune: "How this chart dreams and imagines",
  Pluto: "How this chart transforms",
  Chiron: "Where this chart touches repair and old tenderness",
  Lilith: "Where this chart carries the untamed and uncontained"
};

const compositePlacementDescriptions: Record<string, string> = {
  Ascendant: "How the relationship meets the world",
  Sun: "The relationship's identity and life force",
  Moon: "The relationship's emotional rhythm",
  Mercury: "How the relationship communicates",
  Venus: "How the relationship connects",
  Mars: "How the relationship takes action",
  Jupiter: "How the relationship grows",
  Saturn: "Where the relationship builds and commits",
  Uranus: "How the relationship breaks from pattern",
  Neptune: "How the relationship dreams and imagines",
  Pluto: "How the relationship transforms"
};

function possessiveName(name: string) {
  const trimmed = name.trim();

  if (!trimmed) {
    return "Their";
  }

  return trimmed.endsWith("s") ? `${trimmed}'` : `${trimmed}'s`;
}

function namedPlacementDescription(planet: string, ownerName: string) {
  const owner = ownerName.trim();
  const possessive = possessiveName(owner);
  const subject = owner || "they";

  const descriptions: Record<string, string> = {
    Sun: `${possessive} core self and vitality`,
    Moon: `${possessive} inner world and what they need to feel safe`,
    Ascendant: `How ${subject} meets the world and comes across`,
    Mercury: `How ${subject} thinks and communicates`,
    Venus: `What ${subject} values and who they're drawn to`,
    Mars: `How ${subject} directs their energy and acts`,
    Jupiter: `Where ${subject} grows and reaches for more`,
    Saturn: `What ${subject} commits to and builds`,
    Uranus: `Where ${subject} breaks the pattern`,
    Neptune: `Where ${subject} dreams and idealizes`,
    Pluto: `Where ${subject} transforms and reclaims power`
  };

  return descriptions[planet] ?? "";
}

const dignityLabelParts: Record<EssentialDignity, { adjective: string; name: string; tone: DignityTone }> = {
  domicile: { adjective: "Natural", name: "Domicile", tone: "good" },
  exaltation: { adjective: "Empowered", name: "Exaltation", tone: "good" },
  detriment: { adjective: "Constrained", name: "Detriment", tone: "weak" },
  fall: { adjective: "Weakened", name: "Fall", tone: "weak" }
};

const dignityDescriptions: Record<EssentialDignity, string> = {
  domicile: "Domicile: the planet is in one of its own signs, so its topics tend to have direct access and familiar tools.",
  exaltation: "Exaltation: the planet is honored in this sign, so its topics can be amplified, supported, or especially visible.",
  detriment: "Detriment: the planet is opposite one of its own signs, so its topics may need translation, effort, or less familiar tools.",
  fall: "Fall: the planet is opposite its exaltation, so its topics can feel less supported and may need extra care or adjustment."
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
    tone: labelParts.tone,
    description: dignityDescriptions[dignity]
  };
}

export function placementDignity(position: PlanetPosition) {
  return dignityFor(position.planet, position.sign);
}

export function placementTitleFromParts(planet: string, sign: string, retrograde = false) {
  return `${planet}${retrograde ? " Rx" : ""} in ${sign}`;
}

export function natalPlacementDescription(planet: string, context: PlacementDescriptionContext = "self", ownerName?: string) {
  if (context === "person" && ownerName?.trim()) {
    return namedPlacementDescription(planet, ownerName);
  }

  if (context === "chart") {
    return chartPlacementDescriptions[planet] ?? "";
  }

  if (context === "composite") {
    return compositePlacementDescriptions[planet] ?? "";
  }

  return natalSignatureDescriptions[planet] ?? "";
}

export function InlineGlyphIcon({ fallback, href, label }: { fallback: string; href: string | null; label: string }) {
  if (!href) {
    return (
      <span className="inline-glyph-icon inline-glyph-icon--fallback" aria-label={label}>
        {fallback}
      </span>
    );
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

  const label = uppercase ? uppercaseDignityLabel(dignity) : dignity.label;

  return (
    <FloatingTooltip
      ariaLabel={`${label}. ${dignity.description}`}
      className={`spl-dig spl-dig--${dignity.tone}`}
      content={dignity.description}
    >
      {label}
    </FloatingTooltip>
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
  const hasStatusLine = Boolean(dignity || retrograde);
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
        </span>
        {meta ? (
          <span className="placement-table-row__meta placement-row__house placement-row__degree">
            <span>{meta}</span>
          </span>
        ) : null}
        {hasStatusLine ? (
          <span className="placement-table-row__status" aria-label={`${title} status`}>
            <DignityBadge dignity={dignity ?? null} />
            {retrograde ? <span className="spl-status-item spl-status-retrograde">Retrograde</span> : null}
          </span>
        ) : null}
        {description ? <span className="placement-table-row__description">{description}</span> : null}
      </span>
    </>
  );

  if (onClick) {
    return (
      <div
        className={className}
        role="link"
        tabIndex={0}
        aria-label={ariaLabel ?? title}
        onClick={onClick}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick();
          }
        }}
      >
        {content}
      </div>
    );
  }

  if (asButton) {
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
  retrogradeDurationLabel,
  statuses = [],
  title,
  variant
}: {
  ariaLabel?: string;
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
  retrogradeDurationLabel?: string | null;
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

  const hasTiming = Boolean(durationLabel || retrogradeDurationLabel || rangeLabel);
  const hasDignity = Boolean(dignity);
  const titleStatuses = statuses.filter((status) => status.tone === "retrograde");
  const rowStatuses = statuses.filter((status) => status.tone !== "retrograde");
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
          {!hasDignity ? <span className="planet-placement-row__degree placement-row__degree">{degree}</span> : null}
          {titleStatuses.map((status) => (
            <span className={`spl-status-item spl-status-${status.tone}`} key={status.label}>
              {status.label}
            </span>
          ))}
        </span>
        {hasTiming ? (
          <span className="planet-placement-row__meta planet-placement-row__meta--timing">
            {durationLabel ? <span className="planet-placement-row__duration">{durationLabel}</span> : null}
            {retrogradeDurationLabel ? (
              <span className="spl-status-item spl-status-retrograde">{retrogradeDurationLabel}</span>
            ) : null}
            {rangeLabel ? <span>{rangeLabel}</span> : null}
          </span>
        ) : (
          <span className="planet-placement-row__meta placement-row__house">
            <span>{houseLabel}</span>
            {hasDignity ? <span>{degree}</span> : null}
          </span>
        )}
        {hasDignity || rowStatuses.length > 0 ? (
          <span className="planet-placement-row__status" aria-label={`${title} status`}>
            <DignityBadge dignity={dignity ?? null} uppercase={variant === "sky"} />
            {rowStatuses.map((status) => (
              <span className={`spl-status-item spl-status-${status.tone}`} key={status.label}>
                {status.label.toUpperCase()}
              </span>
            ))}
          </span>
        ) : null}
      </span>
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
                description={natalPlacementDescription(row.label, generatedContext === "composite" ? "composite" : descriptionContext, ownerName)}
                dignity={dignity}
                glyph={row.glyph}
                house={row.house}
                onClick={onPlacementClick ? () => onPlacementClick(row) : undefined}
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

const relationshipPlacementOrder = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "Chiron", "Lilith", "North Node", "True Node"];

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
  const iconHref = zodiacAssetHref(isRetrograde ? pointRetrogradeIconFiles[position.planet] ?? pointIconFiles[position.planet] : pointIconFiles[position.planet]);

  return (
    <span className="synastry-placement-lead" aria-hidden="true">
      <span className="synastry-placement-glyph">
        {iconHref ? (
          <img className="synastry-rx-glyph-svg" src={iconHref} alt="" aria-hidden="true" />
        ) : (
          position.glyph
        )}
      </span>
      {isRetrograde ? <span className="synastry-placement-rx-mark">Rx</span> : null}
    </span>
  );
}
