import type { PlanetPosition, SkySnapshot } from "../../types";
import { SKY_BODY_ORDER, normalizeSkyBodyName } from "../../astrologyConfig";
import { isDisplayRetrograde } from "../../services/astrologyDisplay";
import { FloatingTooltip } from "../ui/FloatingTooltip";
import { natalCardTagline } from "../../services/natalPlacementTaglines";
import {
  fallbackV3DignityGlossary,
  fallbackV3DignityLine,
  fallbackV3PlacementSentence
} from "../../content/fallbackArchitectureV3Runtime";
import { isReaderFacingCopy } from "../../content/readerSafety";
import {
  aspectGlyph,
  aspectIconFiles,
  normalizeAspectType,
  pointGlyph,
  pointIconFiles,
  pointRetrogradeIconFiles,
  signGlyph,
  zodiacAssetHref,
  zodiacSignIconFiles
} from "./chartAssets";

export type SocialPlacementRow = {
  id: string;
  glyph: string;
  label: string;
  sign: string;
  degree: number;
  house: number | null;
  retrograde: boolean;
  description?: string;
};

type EssentialDignity = "domicile" | "exaltation" | "detriment" | "fall";
type DignityTone = "good" | "weak" | "neutral";

export type PlacementDignity = {
  dignity: EssentialDignity;
  label: string;
  tone: DignityTone;
  description: string;
  glossaryDescription: string;
  specificDescription: string;
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

export const placementPlanetOrder = [...SKY_BODY_ORDER];
const socialPlacementOrder = [
  "Sun",
  "Moon",
  "Ascendant",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
  "Pluto",
  "Chiron",
  "Lilith",
  "North Node",
  "South Node",
  "Midheaven"
];

type PlacementDescriptionContext = "self" | "person" | "chart" | "composite";
type PlacementMicrocopyLayer = "authored" | "fallback";

type NormalizedPlacementMicrocopySection = {
  slot: "description" | "dignity";
  required: boolean;
  layer: PlacementMicrocopyLayer;
  tier: string;
  sourceKeys: string[];
  body: string;
};

function possessiveName(name: string) {
  const trimmed = name.trim();

  if (!trimmed) {
    return "Their";
  }

  return trimmed.endsWith("s") ? `${trimmed}'` : `${trimmed}'s`;
}

function namedPlacementDescription(_planet: string, _ownerName: string) {
  return "";
}

const dignityLabelParts: Record<EssentialDignity, { adjective: string; name: string; tone: DignityTone }> = {
  domicile: { adjective: "Natural", name: "Domicile", tone: "good" },
  exaltation: { adjective: "Empowered", name: "Exaltation", tone: "good" },
  detriment: { adjective: "Constrained", name: "Detriment", tone: "weak" },
  fall: { adjective: "Weakened", name: "Fall", tone: "weak" }
};


function normalizePlacementMicrocopySection(
  slot: NormalizedPlacementMicrocopySection["slot"],
  body: string,
  sourceKeys: string[],
  required = false
): NormalizedPlacementMicrocopySection | null {
  const copy = body.trim();

  if (!isReaderFacingCopy(copy)) {
    return null;
  }

  return {
    slot,
    required,
    layer: "fallback",
    tier: "source-based-local-placement-microcopy",
    sourceKeys,
    body: copy
  };
}

type EssentialDignityValue = EssentialDignity | EssentialDignity[];

const planetDignities: Record<string, Partial<Record<string, EssentialDignityValue>>> = {
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
    Virgo: ["domicile", "exaltation"],
    Sagittarius: "detriment",
    Pisces: ["detriment", "fall"]
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

function wholeSignHouseForSign(sign: string, ascendant: string) {
  const zodiacSigns = [
    "Aries",
    "Taurus",
    "Gemini",
    "Cancer",
    "Leo",
    "Virgo",
    "Libra",
    "Scorpio",
    "Sagittarius",
    "Capricorn",
    "Aquarius",
    "Pisces"
  ];
  const signIndex = zodiacSigns.indexOf(sign);
  const ascendantIndex = zodiacSigns.indexOf(ascendant);

  if (signIndex < 0 || ascendantIndex < 0) {
    return null;
  }

  return ((signIndex - ascendantIndex + 12) % 12) + 1;
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

  const positionMap = new Map(sky.positions.map((position) => [normalizeSkyBodyName(position.planet), position]));

  return socialPlacementOrder.flatMap((point) => {
    if (point === "Ascendant") {
      return [{
        id: "Ascendant",
        glyph: pointGlyph("Ascendant"),
        label: "Ascendant",
        sign: sky.ascendant,
        degree: normalizedAngle(sky.ascendantLongitude ?? 0) % 30,
        house: null,
        retrograde: false
      }];
    }

    if (point === "Midheaven" && typeof sky.midheavenLongitude === "number") {
      return [{
        id: "Midheaven",
        glyph: "MC",
        label: "Midheaven",
        sign: sky.midheaven,
        degree: normalizedAngle(sky.midheavenLongitude) % 30,
        house: sky.ascendant ? wholeSignHouseForSign(sky.midheaven, sky.ascendant) ?? null : null,
        retrograde: false
      }];
    }

    const position = positionMap.get(point);

    if (!position) {
      return [];
    }

    return [{
      id: normalizeSkyBodyName(position.planet),
      glyph: position.glyph || pointGlyph(point),
      label: normalizeSkyBodyName(position.planet),
      sign: position.sign,
      degree: position.degree,
      house: position.house || null,
      retrograde: isDisplayRetrograde(position)
    }];
  });
}

export function socialPlacementDegree(degree: number) {
  const rounded = Math.round(degree);
  return `${rounded === 30 ? 0 : rounded}°`;
}

function placementDignityFromValue(dignity: EssentialDignity, planet: string, voice: "you" | "they" | "sky"): PlacementDignity {
  const labelParts = dignityLabelParts[dignity];
  const glossaryDescription = fallbackV3DignityGlossary(dignity);
  const specificDescription = fallbackV3DignityLine(dignity, planet, voice);
  const description = [glossaryDescription, specificDescription]
    .filter(isReaderFacingCopy)
    .join(" ");

  return {
    dignity,
    label: `${labelParts.adjective} · ${labelParts.name}`,
    tone: labelParts.tone,
    description,
    glossaryDescription,
    specificDescription
  };
}

export function dignitiesFor(planet: string, sign: string, voice: "you" | "they" | "sky" = "you"): PlacementDignity[] {
  const dignity = planetDignities[planet]?.[sign] ?? null;

  if (!dignity) {
    return [];
  }

  return (Array.isArray(dignity) ? dignity : [dignity]).map((value) => placementDignityFromValue(value, planet, voice));
}

export function dignityFor(planet: string, sign: string, voice: "you" | "they" | "sky" = "you"): PlacementDignity | null {
  return dignitiesFor(planet, sign, voice)[0] ?? null;
}

export function placementDignity(position: PlanetPosition, voice: "you" | "they" | "sky" = "you") {
  return dignityFor(position.planet, position.sign, voice);
}

export function placementTitleFromParts(planet: string, sign: string, retrograde = false) {
  return `${planet}${retrograde ? " Rx" : ""} in ${sign}`;
}

// Friend/event placement description: approved third-person ("they") placement
// sentence from the v3 source. Ascendant and Midheaven are covered in 23c;
// Descendant and IC stay empty until their rows are supplied. Never substitutes copy.
export function friendPlacementDescription(planet: string, sign: string) {
  const body = fallbackV3PlacementSentence(planet, sign, "they");

  return isReaderFacingCopy(body) ? body : "";
}

export function natalPlacementDescription(planet: string, context: PlacementDescriptionContext = "self", ownerName?: string) {
  const sourceKeys = [`placement.description.${context}.${normalizeSkyBodyName(planet).toLowerCase().replace(/\s+/g, "-")}`];
  let body = "";

  if (context === "person" && ownerName?.trim()) {
    body = namedPlacementDescription(planet, ownerName);
  } else if (context === "chart" || context === "composite") {
    body = "";
  } else {
    body = natalCardTagline(planet);
  }

  return normalizePlacementMicrocopySection("description", body, sourceKeys, false)?.body ?? "";
}

export function InlineGlyphIcon({
  fallback,
  href,
  label
}: {
  fallback: string;
  href: string | null;
  label: string;
  preferTextGlyph?: boolean;
}) {
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
      <InlineGlyphIcon fallback={pointGlyph(from)} href={zodiacAssetHref(pointIconFiles[from])} label={from} preferTextGlyph />
      <InlineGlyphIcon fallback={aspectGlyph(aspect)} href={zodiacAssetHref(aspectIconFiles[normalizeAspectType(aspect)])} label={aspect} preferTextGlyph />
      <InlineGlyphIcon fallback={pointGlyph(to)} href={zodiacAssetHref(pointIconFiles[to])} label={to} preferTextGlyph />
    </span>
  );
}

export function DurationLabelText({ label }: { label: string }) {
  const match = label.match(/^(.*?)(\s+left)$/iu);

  if (!match) {
    const className = /\d/u.test(label) ? "duration-label__value" : "duration-label__text";

    return <span className={className}>{label}</span>;
  }

  return (
    <>
      <span className="duration-label__value">{match[1]}</span>
      <span className="duration-label__suffix">{"\u00A0left"}</span>
    </>
  );
}

function uppercaseDignityLabel(dignity: PlacementDignity) {
  return dignity.label.toUpperCase();
}

function dignityPillClassName(tone: PlacementDignity["tone"]) {
  return [
    "ui-pill",
    tone === "good" ? "ui-pill--dignity-good" : "ui-pill--dignity",
    "spl-dig",
    `spl-dig--${tone}`
  ].join(" ");
}

function statusPillClassName(tone: PlacementRowStatus["tone"]) {
  const variantClass =
    tone === "retrograde"
      ? "ui-pill--retrograde"
      : tone === "alert"
        ? "ui-pill--alert"
        : tone === "muted"
          ? "ui-pill--muted"
          : "ui-pill--neutral";

  return ["ui-pill", variantClass, "spl-status-item", `spl-status-${tone}`].join(" ");
}

export function DignityBadge({ dignity, uppercase = false }: { dignity: PlacementDignity | PlacementDignity[] | null; uppercase?: boolean }) {
  const dignities = Array.isArray(dignity) ? dignity : dignity ? [dignity] : [];

  if (dignities.length === 0) {
    return null;
  }

  return (
    <>
      {dignities.map((item) => {
        const label = uppercase ? uppercaseDignityLabel(item) : item.label;

        if (!item.glossaryDescription) {
          return (
            <span className={dignityPillClassName(item.tone)} key={item.dignity}>
              {label}
            </span>
          );
        }

        return (
          <FloatingTooltip
            ariaLabel={`${label}. ${item.description}`}
            className={dignityPillClassName(item.tone)}
            content={(
              <span className="dignity-tooltip-copy">
                <span>{item.glossaryDescription}</span>
                {isReaderFacingCopy(item.specificDescription) ? (
                  <span className="dignity-tooltip-copy__specific">{item.specificDescription}</span>
                ) : null}
              </span>
            )}
            key={item.dignity}
          >
            {label}
          </FloatingTooltip>
        );
      })}
    </>
  );
}

function displayHouseForPoint(house?: number | null, pointName?: string) {
  if (typeof house === "number" && house > 0) {
    return house;
  }

  return pointName === "Ascendant" ? 1 : null;
}

function placementTableMeta(house?: number | null, degree?: string | null, pointName?: string) {
  const displayHouse = displayHouseForPoint(house, pointName);
  const houseLabel = displayHouse ? `${ordinalHouse(displayHouse)} House` : degree ? "House pending" : null;

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
  retrograde = false,
  signName
}: {
  className: string;
  fallback: string;
  pointName?: string;
  retrograde?: boolean;
  preferTextGlyph?: boolean;
  signName?: string | null;
}) {
  const retrogradeFileName = pointName && retrograde ? pointRetrogradeIconFiles[pointName] : undefined;
  const fileName = pointName ? retrogradeFileName ?? pointIconFiles[pointName] : undefined;
  const href = zodiacAssetHref(fileName);
  const useTextGlyph = !href;
  const signKey = signName
    ? Object.keys(zodiacSignIconFiles).find((key) => key.toLowerCase() === signName.toLowerCase())
    : undefined;
  const signHref = zodiacAssetHref(signKey ? zodiacSignIconFiles[signKey] : undefined);
  const glyphClassName = [
    className,
    useTextGlyph ? "placement-glyph--text" : "",
    signName ? "placement-glyph-pair" : ""
  ].filter(Boolean).join(" ");

  if (signName) {
    return (
      <span className={glyphClassName} aria-hidden="true">
        <span className="placement-glyph-pair__planet">
          {href ? <img className="placement-glyph-svg" src={href} alt="" aria-hidden="true" /> : fallback}
        </span>
        <span className="placement-glyph-pair__sign">
          {signHref ? (
            <img className="placement-sign-glyph-svg" src={signHref} alt="" aria-hidden="true" />
          ) : (
            signGlyph(signName)
          )}
        </span>
      </span>
    );
  }

  return (
    <span className={glyphClassName} aria-hidden="true">
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
  sign,
  title,
  variant = "natal"
}: {
  ariaLabel?: string;
  asButton?: boolean;
  degree?: string | null;
  description?: string | null;
  dignity?: PlacementDignity | PlacementDignity[] | null;
  glyph: string;
  house?: number | null;
  onClick?: () => void;
  pointName?: string;
  retrograde?: boolean;
  sign?: string | null;
  title: string;
  variant?: "natal" | "friend" | "composite";
}) {
  const meta = placementTableMeta(house, degree, pointName);
  const dignityItems = Array.isArray(dignity) ? dignity : dignity ? [dignity] : [];
  const hasDignity = dignityItems.length > 0;
  const className = [
    "placement-table-row",
    `placement-table-row--${variant}`,
    retrograde ? "is-retrograde" : ""
  ].filter(Boolean).join(" ");
  const content = (
    <>
      <PlacementGlyphIcon
        className="placement-table-row__glyph"
        fallback={glyph}
        pointName={pointName}
        retrograde={retrograde}
        signName={sign}
      />
      <span className="placement-table-row__body">
        <span className="placement-table-row__topline">
          <span className="placement-table-row__title">{title}</span>
          {retrograde ? (
            <span className="ui-pill ui-pill--retrograde spl-status-item spl-status-retrograde placement-table-row__retrograde">
              RETROGRADE
            </span>
          ) : null}
        </span>
        {meta ? (
          <span className="placement-table-row__meta placement-row__house placement-row__degree">
            <span>{meta}</span>
          </span>
        ) : null}
        {description ? <span className="placement-table-row__description">{description}</span> : null}
        {hasDignity ? (
          <span className="placement-table-row__status" aria-label={`${title} status`}>
            <DignityBadge dignity={dignityItems} />
          </span>
        ) : null}
      </span>
    </>
  );

  if (onClick && asButton) {
    return (
      <button className={className} type="button" aria-label={ariaLabel ?? title} onClick={onClick}>
        {content}
      </button>
    );
  }

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
      <button className={className} type="button" aria-label={ariaLabel ?? title}>
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
  sign,
  statuses = [],
  title,
  variant
}: {
  ariaLabel?: string;
  degree: string;
  description?: string | null;
  dignity?: PlacementDignity | PlacementDignity[] | null;
  durationLabel?: string | null;
  glyph: string;
  house?: number | null;
  onClick?: () => void;
  pointName?: string;
  rangeLabel?: string | null;
  retrograde?: boolean;
  retrogradeDurationLabel?: string | null;
  sign?: string | null;
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
        sign={sign}
        title={title}
        variant={variant === "composite" ? "composite" : variant === "friend" ? "friend" : "natal"}
      />
    );
  }

  const hasTiming = Boolean(durationLabel || retrogradeDurationLabel || rangeLabel);
  const dignityItems = Array.isArray(dignity) ? dignity : dignity ? [dignity] : [];
  const hasFooterTags = statuses.length > 0 || dignityItems.length > 0;
  const displayHouse = displayHouseForPoint(house, pointName);
  const houseLabel = displayHouse ? `${ordinalHouse(displayHouse)} House` : "House pending";
  const rowClassName = [
    "sky-card",
    "planet-placement-row",
    `planet-placement-row--${variant}`,
    onClick ? "planet-placement-row--clickable" : "",
    retrograde ? "is-retrograde" : ""
  ].filter(Boolean).join(" ");
  const content = (
    <>
      <PlacementGlyphIcon
        className="planet-placement-row__glyph"
        fallback={glyph}
        pointName={pointName}
        preferTextGlyph
        retrograde={retrograde}
        signName={sign}
      />
      <span className="planet-placement-row__body">
        <span className="planet-placement-row__topline">
          <span className="planet-placement-row__title">{title}</span>
          <span className="planet-placement-row__degree placement-row__degree">{degree}</span>
        </span>
        {hasTiming ? (
          <span className="planet-placement-row__meta planet-placement-row__meta--timing">
            {durationLabel ? (
              <span className="ui-pill ui-pill--neutral ui-pill--mixed planet-placement-row__duration">
                <DurationLabelText label={durationLabel} />
              </span>
            ) : null}
            {retrogradeDurationLabel ? (
              <span className="ui-pill ui-pill--neutral ui-pill--mixed planet-placement-row__duration">
                <DurationLabelText label={retrogradeDurationLabel} />
              </span>
            ) : null}
            {rangeLabel ? <span>{rangeLabel}</span> : null}
          </span>
        ) : (
          <span className="planet-placement-row__meta placement-row__house">
            <span>{houseLabel}</span>
          </span>
        )}
        {description ? (
          <span className="planet-placement-row__description">{description}</span>
        ) : null}
        {hasFooterTags ? (
          <span className="planet-placement-row__tags">
            {statuses.map((status) => (
              <span className={statusPillClassName(status.tone)} key={status.label}>
                {status.label}
              </span>
            ))}
            <DignityBadge dignity={dignityItems} uppercase={variant === "sky"} />
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
