import type { CSSProperties, KeyboardEvent, MouseEvent, ReactNode } from "react";
import { memo, useEffect, useId, useMemo, useRef, useState } from "react";
import type { PlanetPosition, SkySnapshot } from "../../types";
import { isDisplayRetrograde } from "../../services/astrologyDisplay";
import { FloatingTooltipPortal } from "../ui/FloatingTooltip";
import {
  aspectIconFiles,
  normalizeAspectType,
  pointIconFiles,
  wheelAngleIconFiles,
  wheelPlanetIconFiles,
  wheelPlanetRetrogradeIconFiles,
  zodiacAssetHref,
  zodiacSignIconFiles
} from "./chartAssets";
import { aspectLineClass, aspectLineStyle } from "./chartAspectLines";
import {
  angleAxisOuterPadding,
  angleLabelOuterPadding,
  chartAngularLabelGeometry,
  chartHouseLabelGeometry,
  chartHouseLabelRadiusFactor,
  chartSignLabelGeometry,
  inwardMarkerOffset,
  longitudeToChartAngle,
  polarToCartesian,
  wheelMarkerLayouts,
  wheelViewBox
} from "./wheelGeometry";

export type HouseSignLabelStyle = "text" | "glyph";
type WheelVariant = "zodiac" | "natal" | "synastry" | "composite";

export type InterChartAspectLine = {
  id: string;
  fromLongitude: number;
  toLongitude: number;
  type: string;
  orb: number;
  fromPointId?: string;
  toPointId?: string;
};

const signs = [
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

const planetIconSize = 28;
const sunIconSize = 30;
const planetDegreeOffset = 28;
const planetHitAreaRadius = 22;
const angleIconSize = 34;
const signIconSize = 27;
const longSignIconSize = 29;
const relationshipClusterTangentSpacing = 23;
const relationshipClusterTangentLimit = 40;
const relationshipOuterClusterRadialOffsets = [0, 16, -12, 30, -24, 42, -34];
const relationshipInnerClusterRadialOffsets = [0, -14, 14, -28, 28, -40, 40];

type ChartPoint = {
  x: number;
  y: number;
};

type WholeSignInspectorAspectType = "conjunction" | "sextile" | "square" | "trine" | "opposition";

type InspectorPoint = {
  id: string;
  label: string;
  glyph: string;
  longitude: number;
  sign: number;
  position?: PlanetPosition;
  kind: "position" | "transit-position" | "angle";
};

type InspectorAspect = {
  point: InspectorPoint;
  type: string | null;
  orb: number | null;
};

type InspectorAspectSource = {
  fromId: string;
  toId: string;
  type: string;
  orb: number;
};

const aspectLegendLabels: Record<string, string> = {
  conjunction: "Conjunction",
  opposition: "Opposition",
  quincunx: "Quincunx",
  semisextile: "Semisextile",
  semisquare: "Semisquare",
  sextile: "Sextile",
  sesquiquadrate: "Sesquiquadrate",
  square: "Square",
  trine: "Trine"
};
const aspectLegendAngles: Record<string, number> = {
  conjunction: 0,
  semisextile: 30,
  semisquare: 45,
  sextile: 60,
  square: 90,
  trine: 120,
  sesquiquadrate: 135,
  quincunx: 150,
  opposition: 180
};
const wholeSignInspectorAspectTypes: WholeSignInspectorAspectType[] = ["conjunction", "sextile", "square", "trine", "opposition"];

function transitInspectorPointId(planet: string) {
  return `transit:${planet}`;
}

function zodiacLongitude(position?: PlanetPosition) {
  if (!position) {
    return 0;
  }

  const signIndex = signs.indexOf(position.sign);

  return (Math.max(signIndex, 0) * 30 + position.degree) % 360;
}

function formatPlanetDegree(position: PlanetPosition) {
  const degree = Math.floor(position.degree);
  const minutes = Math.round((position.degree - degree) * 60);

  if (minutes === 60) {
    return `${degree + 1}°00'`;
  }

  return `${degree}°${String(minutes).padStart(2, "0")}'`;
}

function formatWheelDegree(position: PlanetPosition) {
  return `${Math.floor(position.degree)}°`;
}

function formatPlanetPlacementTitle(position: PlanetPosition) {
  return `${position.planet}${isDisplayRetrograde(position) ? " Rx" : ""} in ${position.sign}`;
}

function formatPlanetPlacementLine(position: PlanetPosition) {
  return `${formatPlanetPlacementTitle(position)} ${formatPlanetDegree(position)}`;
}

function normalizedLongitude(longitude: number) {
  return ((longitude % 360) + 360) % 360;
}

function angularSeparation(first: number, second: number) {
  return Math.abs(((second - first + 540) % 360) - 180);
}

function wholeSignAspectType(fromSign: number, toSign: number): WholeSignInspectorAspectType | null {
  const distance = ((toSign - fromSign) % 12 + 12) % 12;

  if (distance === 0) return "conjunction";
  if (distance === 2 || distance === 10) return "sextile";
  if (distance === 3 || distance === 9) return "square";
  if (distance === 4 || distance === 8) return "trine";
  if (distance === 6) return "opposition";
  return null;
}

function exactAspectAngle(type: WholeSignInspectorAspectType) {
  switch (type) {
    case "conjunction":
      return 0;
    case "sextile":
      return 60;
    case "square":
      return 90;
    case "trine":
      return 120;
    case "opposition":
      return 180;
  }
}

function aspectLegendLabel(type: string) {
  const normalizedType = normalizeAspectType(type);
  return aspectLegendLabels[normalizedType]
    ?? normalizedType
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
}

function aspectLegendSortValue(type: string) {
  return aspectLegendAngles[normalizeAspectType(type)] ?? 999;
}

function wholeSignAspectStyle(type: WholeSignInspectorAspectType, orb: number): CSSProperties {
  const base = aspectLineStyle(type, orb);
  const typeStyle: Record<WholeSignInspectorAspectType, { stroke: string; dash: string; widthBoost: number }> = {
    conjunction: { stroke: "#252833", dash: "none", widthBoost: 0.2 },
    sextile: { stroke: "#1d8fd7", dash: "3 6", widthBoost: 0 },
    square: { stroke: "#e24eb9", dash: "9 4", widthBoost: 0.1 },
    trine: { stroke: "#17a978", dash: "none", widthBoost: 0 },
    opposition: { stroke: "#c5202f", dash: "none", widthBoost: 0.18 }
  };
  const aspectStyle = typeStyle[type];

  if (orb <= 3) {
    return {
      ...base,
      "--aspect-line-stroke": aspectStyle.stroke,
      "--aspect-line-dash": aspectStyle.dash,
      "--aspect-line-opacity": "1",
      "--aspect-line-width": String(2.6 + aspectStyle.widthBoost),
      "--aspect-line-backdrop-width": String(5 + aspectStyle.widthBoost)
    } as CSSProperties;
  }

  if (orb <= 7) {
    return {
      ...base,
      "--aspect-line-stroke": aspectStyle.stroke,
      "--aspect-line-dash": aspectStyle.dash,
      "--aspect-line-opacity": "0.8",
      "--aspect-line-width": String(2.15 + aspectStyle.widthBoost),
      "--aspect-line-backdrop-width": String(4.45 + aspectStyle.widthBoost)
    } as CSSProperties;
  }

  if (orb <= 12) {
    return {
      ...base,
      "--aspect-line-stroke": aspectStyle.stroke,
      "--aspect-line-dash": aspectStyle.dash,
      "--aspect-line-opacity": "0.62",
      "--aspect-line-width": String(1.7 + aspectStyle.widthBoost),
      "--aspect-line-backdrop-width": String(3.9 + aspectStyle.widthBoost)
    } as CSSProperties;
  }

  return {
    ...base,
    "--aspect-line-stroke": aspectStyle.stroke,
    "--aspect-line-dash": aspectStyle.dash === "none" ? "3 8" : aspectStyle.dash,
    "--aspect-line-opacity": "0.38",
    "--aspect-line-width": String(1.25 + aspectStyle.widthBoost),
    "--aspect-line-backdrop-width": String(3.3 + aspectStyle.widthBoost)
  } as CSSProperties;
}

function inspectorLineStyle(type: string, orb: number, mode: "exact" | "whole-sign") {
  const normalizedType = normalizeAspectType(type);
  const isWholeSignType = wholeSignInspectorAspectTypes.includes(normalizedType as WholeSignInspectorAspectType);

  if (mode === "whole-sign" && isWholeSignType) {
    return wholeSignAspectStyle(normalizedType as WholeSignInspectorAspectType, orb);
  }

  return aspectLineStyle(type, orb);
}

function selectedInspectorLineStyle(type: string, orb: number, mode: "exact" | "whole-sign") {
  const base = inspectorLineStyle(type, orb, mode) as CSSProperties & Record<string, string>;
  const width = Number.parseFloat(base["--aspect-line-width"] ?? "1.8");
  const opacity = Number.parseFloat(base["--aspect-line-opacity"] ?? "0.72");
  const backdropWidth = Number.parseFloat(base["--aspect-line-backdrop-width"] ?? "");

  return {
    ...base,
    "--aspect-line-opacity": String(Math.max(Number.isFinite(opacity) ? opacity : 0.72, 0.86)),
    "--aspect-line-width": String(Math.max(Number.isFinite(width) ? width : 1.8, 2.35)),
    "--aspect-line-backdrop-width": String(Math.max(Number.isFinite(backdropWidth) ? backdropWidth : width + 3.2, 5.4))
  } as CSSProperties;
}

function formatInspectorOrb(orb: number) {
  if (!Number.isFinite(orb)) {
    return "";
  }

  if (orb < 0.05) {
    return "exact";
  }

  return `${orb.toFixed(1)}° orb`;
}

function wheelPlanetIconFile(position: PlanetPosition) {
  if (isDisplayRetrograde(position)) {
    return wheelPlanetRetrogradeIconFiles[position.planet] ?? wheelPlanetIconFiles[position.planet];
  }

  return wheelPlanetIconFiles[position.planet];
}

function WheelPlanetGlyph({ position, yOffset = -4 }: { position: PlanetPosition; yOffset?: number }) {
  const iconHref = zodiacAssetHref(wheelPlanetIconFile(position));
  const iconSize = position.planet === "Sun" ? sunIconSize : planetIconSize;

  if (iconHref) {
    return (
      <image
        href={iconHref}
        x={-iconSize / 2}
        y={-iconSize / 2 + yOffset}
        width={iconSize}
        height={iconSize}
        className="planet-glyph planet-glyph-image wheel-placement__glyph"
        aria-hidden="true"
        preserveAspectRatio="xMidYMid meet"
      />
    );
  }

  if (position.planet === "Sun") {
    return (
      <g className="planet-glyph planet-glyph-sun-symbol wheel-placement__glyph" transform={`translate(0 ${yOffset}) scale(0.64)`} aria-hidden="true">
        <path transform="translate(-25 -25)" d="m7,25a18,18 0 1,1 0,.1zm3,0a15,15 0 1,0 0-.1zm11,0a4,4 0 1,0 0-.1z" />
      </g>
    );
  }

  return (
    <text x={0} y={yOffset} className="planet-glyph wheel-placement__glyph">
      {position.glyph}
    </text>
  );
}

type SkyWheelProps = {
  positions: PlanetPosition[];
  aspects: SkySnapshot["aspects"];
  transitPositions?: PlanetPosition[];
  transitAspects?: InterChartAspectLine[];
  ascendant?: string;
  ascendantLongitude?: number;
  midheavenLongitude?: number;
  showHouses?: boolean;
  houseSignLabelStyle?: HouseSignLabelStyle;
  variant?: Exclude<WheelVariant, "synastry">;
  aspectInspector?: boolean;
  aspectInspectorControls?: ReactNode;
};

export const SkyWheel = memo(function SkyWheel({
  positions,
  aspects,
  transitPositions = [],
  transitAspects = [],
  ascendant,
  ascendantLongitude,
  midheavenLongitude,
  showHouses = false,
  houseSignLabelStyle = "text",
  variant = "zodiac",
  aspectInspector = false,
  aspectInspectorControls
}: SkyWheelProps) {
  const isAscendantAnchored = typeof ascendantLongitude === "number";
  const isNatalWheel = showHouses && isAscendantAnchored;
  const hasAscendantAxis = typeof ascendantLongitude === "number";
  const ascendantSignIndex = ascendant ? signs.indexOf(ascendant) : -1;
  const wholeHouseStartLongitude = ascendantSignIndex >= 0 ? ascendantSignIndex * 30 : 0;
  const center = 300;
  const radius = {
    outer: 284,
    signInner: 240,
    planet: 200,
    transitPlanet: 304,
    transitBand: 314,
    transitBandOuter: 344,
    transitDegree: 330,
    aspect: 132,
    house: 240 * chartHouseLabelRadiusFactor,
    inner: 44
  };

  function point(angle: number, distance: number) {
    return polarToCartesian(center, center, distance, angle);
  }

  function angleForLongitude(longitude: number) {
    return longitudeToChartAngle(longitude, ascendantLongitude, isAscendantAnchored);
  }

  function planetAngle(position: PlanetPosition) {
    return angleForLongitude(zodiacLongitude(position));
  }

  const positionsByPlanet = useMemo(() => new Map(positions.map((position) => [position.planet, position])), [positions]);
  const aspectPairs = useMemo(() => aspects
    .map((aspect) => {
      const from = positionsByPlanet.get(aspect.from);
      const to = positionsByPlanet.get(aspect.to);

      if (!from || !to) {
        return null;
      }

      return {
        ...aspect,
        from,
        to,
        className: aspectLineClass(aspect.type),
        lineStyle: aspectLineStyle(aspect.type, aspect.orb)
      };
    })
    .filter(
      (
        aspect
      ): aspect is {
        from: PlanetPosition;
        to: PlanetPosition;
        type: string;
        orb: number;
        meaning: string;
        className: string;
        lineStyle: CSSProperties;
      } => Boolean(aspect)
    ), [aspects, positionsByPlanet]);
  const tooltipDetailsByPlanet = useMemo(() => {
    const aspectLinesByPlanet = new Map<string, string[]>();

    aspects.forEach((aspect) => {
      const fromLines = aspectLinesByPlanet.get(aspect.from) ?? [];
      fromLines.push(`${aspect.type} ${aspect.to} (${aspect.orb.toFixed(1)}° orb)`);
      aspectLinesByPlanet.set(aspect.from, fromLines);

      const toLines = aspectLinesByPlanet.get(aspect.to) ?? [];
      toLines.push(`${aspect.type} ${aspect.from} (${aspect.orb.toFixed(1)}° orb)`);
      aspectLinesByPlanet.set(aspect.to, toLines);
    });

    return new Map(
      positions.map((position) => {
        const activeAspects = aspectLinesByPlanet.get(position.planet) ?? [];
        const visibleAspects = activeAspects.slice(0, 4);

        if (activeAspects.length > visibleAspects.length) {
          visibleAspects.push(`+${activeAspects.length - visibleAspects.length} more`);
        }

        const placementLine = formatPlanetPlacementLine(position);

        return [
          position.planet,
          {
            aspectLine: visibleAspects.join(" · "),
            lines: [placementLine, ...visibleAspects],
            placementLine
          }
        ];
      })
    );
  }, [aspects, positions]);
  const signLabelRadius = (radius.outer + radius.signInner) / 2;
  const signDividerInnerRadius = radius.signInner - 2;
  const signDividerOuterRadius = radius.outer;
  const wheelClipId = `wheel-clip-${useId().replace(/:/g, "")}`;
  const signLabelPathPrefix = `${wheelClipId}-sign-label`;
  const hasTransitOverlay = transitPositions.length > 0;
  const angleAxisRadius = hasTransitOverlay ? radius.transitBandOuter + 16 : radius.outer + angleAxisOuterPadding;
  const angularLabelRadius = hasTransitOverlay ? radius.transitBandOuter + 26 : radius.outer + angleLabelOuterPadding;
  const houseLabels = useMemo(() => chartHouseLabelGeometry({
    ascendant,
    ascendantLongitude,
    angleForLongitude,
    center,
    radius: radius.house,
    signs
  }), [ascendant, ascendantLongitude, isAscendantAnchored]);
  const angularLabels = useMemo(() => chartAngularLabelGeometry({
    ascendantLongitude,
    midheavenLongitude,
    angleForLongitude,
    center,
    radius: angularLabelRadius
  }), [ascendantLongitude, midheavenLongitude, isAscendantAnchored, angularLabelRadius]);
  const [activeTooltipPlanet, setActiveTooltipPlanet] = useState<string | null>(null);
  const [focusedInspectorPointId, setFocusedInspectorPointId] = useState<string | null>(null);
  const planetMarkerRefs = useRef(new Map<string, SVGGElement>());
  const wheelShellRef = useRef<HTMLElement | null>(null);
  const signLabels = useMemo(() => chartSignLabelGeometry({
    angleForLongitude,
    center,
    radius: signLabelRadius,
    signs
  }), [ascendantLongitude, isAscendantAnchored, signLabelRadius]);
  const activeTooltipPosition = activeTooltipPlanet
    ? positionsByPlanet.get(activeTooltipPlanet) ?? null
    : null;
  const planetLayouts = useMemo(() => wheelMarkerLayouts(
    positions,
    (position) => position.planet,
    (position) => angleForLongitude(zodiacLongitude(position)),
    {
      baseRadius: radius.planet,
      center,
      clusterThreshold: 6,
      maxClusterSpan: 24,
      clusterTangentSpacing: relationshipClusterTangentSpacing,
      maxClusterTangentOffset: relationshipClusterTangentLimit,
      useClusterLane: true,
    }
  ), [positions, ascendantLongitude, isAscendantAnchored]);
  const transitLayouts = useMemo(() => wheelMarkerLayouts(
    transitPositions,
    (position) => position.planet,
    (position) => angleForLongitude(zodiacLongitude(position)),
    {
      baseRadius: radius.transitPlanet,
      center,
      clusterThreshold: 7,
      maxClusterSpan: 24,
      clusterTangentSpacing: relationshipClusterTangentSpacing,
      maxClusterTangentOffset: relationshipClusterTangentLimit,
      useClusterLane: true,
      radialOffsets: [0],
      minMarkerRadius: radius.outer + 11,
      maxMarkerRadius: radius.outer + 30
    }
  ), [transitPositions, ascendantLongitude, isAscendantAnchored]);
  const transitAspectPairs = useMemo(() => transitAspects.map((aspect) => ({
    ...aspect,
    className: aspectLineClass(aspect.type),
    lineStyle: aspectLineStyle(aspect.type, aspect.orb)
  })), [transitAspects]);
  const inspectorEnabled = aspectInspector;
  const inspectorPoints = useMemo(() => {
    if (!inspectorEnabled) {
      return [];
    }

    const pointMap = new Map<string, InspectorPoint>();

    positions.forEach((position) => {
      const longitude = normalizedLongitude(zodiacLongitude(position));
      pointMap.set(position.planet, {
        id: position.planet,
        label: position.planet,
        glyph: position.glyph,
        longitude,
        sign: Math.floor(longitude / 30),
        position,
        kind: "position"
      });
    });

    transitPositions.forEach((position) => {
      const longitude = normalizedLongitude(zodiacLongitude(position));
      pointMap.set(transitInspectorPointId(position.planet), {
        id: transitInspectorPointId(position.planet),
        label: `Current ${position.planet}`,
        glyph: position.glyph,
        longitude,
        sign: Math.floor(longitude / 30),
        position,
        kind: "transit-position"
      });
    });

    if (typeof ascendantLongitude === "number") {
      const ascLongitude = normalizedLongitude(ascendantLongitude);
      const dscLongitude = normalizedLongitude(ascendantLongitude + 180);
      pointMap.set("Ascendant", {
        id: "Ascendant",
        label: "Ascendant",
        glyph: "ASC",
        longitude: ascLongitude,
        sign: Math.floor(ascLongitude / 30),
        kind: "angle"
      });
      pointMap.set("Descendant", {
        id: "Descendant",
        label: "Descendant",
        glyph: "DSC",
        longitude: dscLongitude,
        sign: Math.floor(dscLongitude / 30),
        kind: "angle"
      });
    }

    if (typeof midheavenLongitude === "number") {
      const mcLongitude = normalizedLongitude(midheavenLongitude);
      const icLongitude = normalizedLongitude(midheavenLongitude + 180);
      pointMap.set("Midheaven", {
        id: "Midheaven",
        label: "Midheaven",
        glyph: "MC",
        longitude: mcLongitude,
        sign: Math.floor(mcLongitude / 30),
        kind: "angle"
      });
      pointMap.set("Imum Coeli", {
        id: "Imum Coeli",
        label: "Imum Coeli",
        glyph: "IC",
        longitude: icLongitude,
        sign: Math.floor(icLongitude / 30),
        kind: "angle"
      });
    }

    return Array.from(pointMap.values());
  }, [inspectorEnabled, positions, transitPositions, ascendantLongitude, midheavenLongitude]);
  const focusedInspectorPoint = focusedInspectorPointId
    ? inspectorPoints.find((candidate) => candidate.id === focusedInspectorPointId) ?? null
    : null;
  const inspectorMode: "exact" | "whole-sign" = variant === "natal" && !hasTransitOverlay ? "whole-sign" : "exact";
  const exactInspectorAspectSources = useMemo((): InspectorAspectSource[] => {
    if (!inspectorEnabled || inspectorMode !== "exact") {
      return [];
    }

    if (hasTransitOverlay) {
      return transitAspectPairs.flatMap((aspect) => {
        if (!aspect.fromPointId || !aspect.toPointId) {
          return [];
        }

        return [{
          fromId: aspect.fromPointId,
          toId: aspect.toPointId,
          type: aspect.type,
          orb: aspect.orb
        }];
      });
    }

    return aspectPairs.map((aspect) => ({
      fromId: aspect.from.planet,
      toId: aspect.to.planet,
      type: aspect.type,
      orb: aspect.orb
    }));
  }, [inspectorEnabled, inspectorMode, hasTransitOverlay, transitAspectPairs, aspectPairs]);
  const inspectorAspects = useMemo(() => {
    if (!focusedInspectorPoint) {
      return [];
    }

    if (inspectorMode === "exact") {
      const exactAspectsByTargetId = new Map<string, InspectorAspectSource>();

      exactInspectorAspectSources.forEach((aspect) => {
        if (aspect.fromId === focusedInspectorPoint.id) {
          exactAspectsByTargetId.set(aspect.toId, aspect);
        } else if (aspect.toId === focusedInspectorPoint.id) {
          exactAspectsByTargetId.set(aspect.fromId, aspect);
        }
      });

      return inspectorPoints
        .filter((candidate) => candidate.id !== focusedInspectorPoint.id)
        .map((candidate): InspectorAspect => {
          const exactAspect = exactAspectsByTargetId.get(candidate.id);

          return {
            point: candidate,
            type: exactAspect?.type ?? null,
            orb: exactAspect?.orb ?? null
          };
        });
    }

    return inspectorPoints
      .filter((candidate) => candidate.id !== focusedInspectorPoint.id)
      .map((candidate): InspectorAspect => {
        const type = wholeSignAspectType(focusedInspectorPoint.sign, candidate.sign);

        if (!type) {
          return {
            point: candidate,
            type: null,
            orb: null
          };
        }

        return {
          point: candidate,
          type,
          orb: Math.abs(angularSeparation(focusedInspectorPoint.longitude, candidate.longitude) - exactAspectAngle(type))
        };
      });
  }, [exactInspectorAspectSources, focusedInspectorPoint, inspectorMode, inspectorPoints]);
  const inspectorConfiguredPointIds = useMemo(() => new Set(
    inspectorAspects
      .filter((aspect) => aspect.type)
      .map((aspect) => aspect.point.id)
  ), [inspectorAspects]);
  const inspectorAversePointIds = useMemo(() => new Set(
    inspectorAspects
      .filter((aspect) => !aspect.type)
      .map((aspect) => aspect.point.id)
  ), [inspectorAspects]);
  const inspectorAspectRows = useMemo(() => {
    if (!focusedInspectorPoint) {
      return [];
    }

    return inspectorAspects
      .filter((aspect): aspect is InspectorAspect & { type: string; orb: number } => Boolean(aspect.type) && typeof aspect.orb === "number")
      .sort((first, second) => {
        const aspectSort = aspectLegendSortValue(first.type) - aspectLegendSortValue(second.type);

        if (aspectSort !== 0) {
          return aspectSort;
        }

        return first.point.label.localeCompare(second.point.label);
      })
      .map((aspect) => ({
        ...aspect,
        label: aspectLegendLabel(aspect.type),
        lineStyle: inspectorLineStyle(aspect.type, aspect.orb, inspectorMode)
      }));
  }, [focusedInspectorPoint, inspectorAspects, inspectorMode]);
  useEffect(() => {
    if (!inspectorEnabled || !focusedInspectorPointId) {
      return;
    }

    function clearInspectorOnOutsidePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node) || wheelShellRef.current?.contains(target)) {
        return;
      }

      setFocusedInspectorPointId(null);
    }

    document.addEventListener("pointerdown", clearInspectorOnOutsidePointerDown);

    return () => {
      document.removeEventListener("pointerdown", clearInspectorOnOutsidePointerDown);
    };
  }, [inspectorEnabled, focusedInspectorPointId]);
  function inspectorPointState(pointId: string) {
    if (!focusedInspectorPoint) {
      return "idle";
    }

    if (pointId === focusedInspectorPoint.id) {
      return "selected";
    }

    if (inspectorConfiguredPointIds.has(pointId)) {
      return "participant";
    }

    if (inspectorAversePointIds.has(pointId)) {
      return "averse";
    }

    return "idle";
  }
  const activeWheelViewBox = hasTransitOverlay ? "-76 -76 752 752" : wheelViewBox;

  return (
    <>
      <figure
        ref={wheelShellRef}
        className={`sky-wheel-shell sky-wheel-shell-${variant}${inspectorEnabled ? " sky-wheel-shell--aspect-inspector" : ""}${focusedInspectorPoint ? " is-inspecting-aspects" : ""}`}
      >
        <svg
          className={`sky-wheel sky-wheel-${variant}${hasTransitOverlay ? " sky-wheel-transit-overlay" : ""}${inspectorEnabled ? " sky-wheel--aspect-inspector" : ""}${focusedInspectorPoint ? " is-inspecting-aspects" : ""}`}
          viewBox={activeWheelViewBox}
          role="img"
          aria-label="Planet positions"
          onClick={inspectorEnabled ? () => {
            setFocusedInspectorPointId(null);
            setActiveTooltipPlanet(null);
          } : undefined}
        >
        <defs>
          <clipPath id={wheelClipId}>
            <circle cx={center} cy={center} r={radius.outer} />
          </clipPath>
          {signLabels.map(({ sign, path }) => (
            <path key={`${sign}-label-path`} id={`${signLabelPathPrefix}-${sign}`} d={path} />
          ))}
        </defs>
        {hasTransitOverlay ? (
          <g className="transit-planet-row" aria-hidden="true">
            <circle className="transit-planet-band" cx={center} cy={center} r={radius.transitBand} />
            <circle className="transit-planet-band-outline transit-planet-band-outline--inner" cx={center} cy={center} r={radius.outer} />
            <circle className="transit-planet-band-outline transit-planet-band-outline--outer" cx={center} cy={center} r={radius.transitBandOuter} />
          </g>
        ) : null}
        <circle className="sign-band" cx={center} cy={center} r={(radius.outer + radius.signInner) / 2} />
        <g className="wheel-rings">
          <circle cx={center} cy={center} r={radius.outer} />
          <circle cx={center} cy={center} r={radius.signInner} />
          <circle cx={center} cy={center} r={radius.aspect} className="faint" />
          <circle cx={center} cy={center} r={radius.inner} />
        </g>
        <g className="wheel-sectors">
          {signs.map((sign, index) => {
            const a = angleForLongitude((isNatalWheel ? wholeHouseStartLongitude : 0) + index * 30);
            const outer = point(a, radius.signInner);
            const inner = point(a, radius.inner);
            return <line key={sign} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} />;
          })}
        </g>
        <g className="sign-band-dividers" clipPath={`url(#${wheelClipId})`}>
          {signs.map((sign, index) => {
            const a = angleForLongitude(index * 30);
            const outer = point(a, signDividerOuterRadius);
            const inner = point(a, signDividerInnerRadius);
            return <line key={sign} className="zodiac-wheel__divider" x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} />;
          })}
        </g>
        <g className="aspect-lines">
          {inspectorEnabled ? (
            focusedInspectorPoint ? inspectorAspects.map(({ point: targetPoint, type, orb }) => {
              if (!type || typeof orb !== "number") {
                return null;
              }

              const a = point(angleForLongitude(focusedInspectorPoint.longitude), radius.aspect);
              const b = point(angleForLongitude(targetPoint.longitude), radius.aspect);

              return (
                <g
                  key={`${focusedInspectorPoint.id}-${targetPoint.id}`}
                  className={`${aspectLineClass(type)} ${normalizeAspectType(type)} aspect-inspector-line`}
                  style={selectedInspectorLineStyle(type, orb, inspectorMode)}
                >
                  <line className="aspect-inspector-line-backdrop" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
                </g>
              );
            }) : null
          ) : (
            aspectPairs.map(({ from, to, type, className, lineStyle }) => {
              const a = point(planetAngle(from), radius.aspect);
              const b = point(planetAngle(to), radius.aspect);

              return (
                <g key={`${from.planet}-${to.planet}`} className={`${className} ${normalizeAspectType(type)}`} style={lineStyle}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
                </g>
              );
            })
          )}
        </g>
        {transitAspectPairs.length > 0 && !focusedInspectorPoint && (
          <g className="aspect-lines transit-to-natal-aspect-lines" aria-label="Transit to natal aspects">
            {transitAspectPairs.map(({ id, fromLongitude, toLongitude, type, className, lineStyle }) => {
              const a = point(angleForLongitude(fromLongitude), radius.aspect);
              const b = point(angleForLongitude(toLongitude), radius.aspect);

              return (
                <g key={id} className={`${className} ${normalizeAspectType(type)}`} style={lineStyle}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
                </g>
              );
            })}
          </g>
        )}
        {hasAscendantAxis && (
          <g className="natal-angle-lines" aria-label="Chart angle axes">
            {(() => {
              if (typeof ascendantLongitude !== "number") {
                return null;
              }

              const ascAngle = angleForLongitude(ascendantLongitude);
              const dscAngle = angleForLongitude(ascendantLongitude + 180);
              const asc = point(ascAngle, angleAxisRadius);
              const dsc = point(dscAngle, angleAxisRadius);
              const midheavenAxis = typeof midheavenLongitude === "number"
                ? (() => {
                    const mcAngle = angleForLongitude(midheavenLongitude);
                    const icAngle = angleForLongitude(midheavenLongitude + 180);
                    const mc = point(mcAngle, angleAxisRadius);
                    const ic = point(icAngle, angleAxisRadius);

                    return <line className="midheaven-axis" x1={mc.x} y1={mc.y} x2={ic.x} y2={ic.y} />;
                  })()
                : null;

              return (
                <>
                  <line className="ascendant-axis" x1={asc.x} y1={asc.y} x2={dsc.x} y2={dsc.y} />
                  {midheavenAxis}
                </>
              );
            })()}
          </g>
        )}
        <g className="house-labels" aria-label={ascendant ? "Whole sign houses" : "House labels"}>
          {houseLabels.map(({ house, x, y, ariaLabel }) => (
            <text key={house} x={x} y={y} className="zodiac-house-number zodiac-wheel__house-label" aria-label={ariaLabel}>
              {house}
            </text>
          ))}
        </g>
        {hasAscendantAxis && (
          <g className="angular-labels" aria-label="Chart angles">
            {angularLabels.map(({ label, x, y }) => {
              const iconHref = zodiacAssetHref(wheelAngleIconFiles[label]);
              const iconSize = angleIconSize;
              const anglePointId = label === "ASC"
                ? "Ascendant"
                : label === "DSC"
                  ? "Descendant"
                  : label === "MC"
                    ? "Midheaven"
                    : label === "IC"
                      ? "Imum Coeli"
                      : label;
              const angleInspectorState = inspectorPointState(anglePointId);
              const angleClassName = `zodiac-wheel__angle-icon aspect-inspector-point aspect-inspector-point--${angleInspectorState}`;
              const angleProps = inspectorEnabled ? {
                role: "button",
                tabIndex: 0,
                onClick: (event: MouseEvent<SVGImageElement | SVGTextElement>) => {
                  event.stopPropagation();
                  event.currentTarget.blur();
                  setActiveTooltipPlanet(null);
                  setFocusedInspectorPointId((current) => current === anglePointId ? null : anglePointId);
                },
                onKeyDown: (event: KeyboardEvent<SVGImageElement | SVGTextElement>) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    event.stopPropagation();
                    setActiveTooltipPlanet(null);
                    setFocusedInspectorPointId((current) => current === anglePointId ? null : anglePointId);
                  }
                }
              } : {};

              return iconHref ? (
                <image
                  key={label}
                  href={iconHref}
                  x={x - iconSize / 2}
                  y={y - iconSize / 2}
                  width={iconSize}
                  height={iconSize}
                  className={angleClassName}
                  aria-label={label}
                  preserveAspectRatio="xMidYMid meet"
                  {...angleProps}
                />
              ) : (
                <text key={label} x={x} y={y} className={`aspect-inspector-point aspect-inspector-point--${angleInspectorState}`} {...angleProps}>
                  {label}
                </text>
              );
            })}
          </g>
        )}
        <g className="planet-labels">
          {positions.map((position) => {
            const layout = planetLayouts.get(position.planet);
            const marker = layout?.marker ?? point(planetAngle(position), radius.planet);
            const tickAngle = planetAngle(position);
            const tickOuter = point(tickAngle, radius.signInner - 5);
            const tickInner = point(tickAngle, radius.signInner - 17);
            const degreeOffset = inwardMarkerOffset(center, marker, planetDegreeOffset);
            const tooltipLines = tooltipDetailsByPlanet.get(position.planet)?.lines ?? [];
            const inspectorState = inspectorPointState(position.planet);
            const inspectorActiveLines = focusedInspectorPoint && inspectorState === "averse"
              ? [`${focusedInspectorPoint.label} is in aversion to ${position.planet}.`]
              : tooltipLines;

            return (
              <g
                key={position.planet}
                ref={(node) => {
                  if (node) {
                    planetMarkerRefs.current.set(position.planet, node);
                  } else {
                    planetMarkerRefs.current.delete(position.planet);
                  }
                }}
                className={`planet-marker aspect-inspector-point aspect-inspector-point--${inspectorState}`}
                tabIndex={0}
                role={inspectorEnabled ? "button" : "img"}
                aria-label={inspectorActiveLines.join(". ")}
                onBlur={() => setActiveTooltipPlanet((current) => (current === position.planet ? null : current))}
                onFocus={() => setActiveTooltipPlanet(position.planet)}
                onClick={inspectorEnabled ? (event) => {
                  event.stopPropagation();
                  event.currentTarget.blur();
                  setActiveTooltipPlanet(null);
                  setFocusedInspectorPointId((current) => current === position.planet ? null : position.planet);
                } : undefined}
                onKeyDown={inspectorEnabled ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    event.stopPropagation();
                    setActiveTooltipPlanet(null);
                    setFocusedInspectorPointId((current) => current === position.planet ? null : position.planet);
                  }
                } : undefined}
                onPointerEnter={() => setActiveTooltipPlanet(position.planet)}
                onPointerLeave={() => setActiveTooltipPlanet((current) => (current === position.planet ? null : current))}
              >
                {inspectorState === "selected" ? (
                  <circle
                    cx={point(tickAngle, radius.aspect).x}
                    cy={point(tickAngle, radius.aspect).y}
                    r={7}
                    className="aspect-inspector-focus-ring"
                    aria-hidden="true"
                  />
                ) : null}
                <line x1={tickInner.x} y1={tickInner.y} x2={tickOuter.x} y2={tickOuter.y} className="planet-tick wheel-placement__tick" />
                <g className="planet-label-group wheel-placement" transform={`translate(${marker.x.toFixed(2)} ${marker.y.toFixed(2)})`}>
                  <circle cx={0} cy={0} r={planetHitAreaRadius} className="planet-hit-area" />
                  <WheelPlanetGlyph position={position} yOffset={variant === "composite" ? 0 : -4} />
                  <text x={degreeOffset.x.toFixed(2)} y={degreeOffset.y.toFixed(2)} className="planet-degree wheel-placement__degree">
                    {formatWheelDegree(position)}
                  </text>
                </g>
              </g>
            );
          })}
        </g>
        {transitPositions.length > 0 && (
          <g className="planet-labels transit-planet-labels" aria-label="Current transiting planets">
            {transitPositions.map((position) => {
              const layout = transitLayouts.get(position.planet);
              const tickAngle = planetAngle(position);
              const layoutMarker = layout?.marker;
              const markerAngle = layoutMarker
                ? (Math.atan2(center - layoutMarker.y, layoutMarker.x - center) * 180) / Math.PI
                : tickAngle;
              const marker = point(markerAngle, radius.transitPlanet);
              const tickOuter = point(tickAngle, radius.outer + 7);
              const tickInner = point(tickAngle, radius.outer + 5);
              const degreeMarker = point(markerAngle, radius.transitDegree);
              const transitPointId = transitInspectorPointId(position.planet);
              const inspectorState = inspectorPointState(transitPointId);
              const inspectorActiveLines = focusedInspectorPoint && inspectorState === "averse"
                ? [`${focusedInspectorPoint.label} is in aversion to Current ${position.planet}.`]
                : [`Current ${formatPlanetPlacementLine(position)}`];

              return (
                <g
                  key={`transit-${position.planet}`}
                  className={`planet-marker planet-marker-transit aspect-inspector-point aspect-inspector-point--${inspectorState}`}
                  role={inspectorEnabled ? "button" : "img"}
                  tabIndex={inspectorEnabled ? 0 : undefined}
                  aria-label={inspectorActiveLines.join(". ")}
                  onClick={inspectorEnabled ? (event) => {
                    event.stopPropagation();
                    event.currentTarget.blur();
                    setActiveTooltipPlanet(null);
                    setFocusedInspectorPointId((current) => current === transitPointId ? null : transitPointId);
                  } : undefined}
                  onKeyDown={inspectorEnabled ? (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      setActiveTooltipPlanet(null);
                      setFocusedInspectorPointId((current) => current === transitPointId ? null : transitPointId);
                    }
                  } : undefined}
                >
                  {inspectorState === "selected" ? (
                    <circle
                      cx={point(tickAngle, radius.aspect).x}
                      cy={point(tickAngle, radius.aspect).y}
                      r={7}
                      className="aspect-inspector-focus-ring"
                      aria-hidden="true"
                    />
                  ) : null}
                  <line x1={tickInner.x} y1={tickInner.y} x2={tickOuter.x} y2={tickOuter.y} className="planet-tick wheel-placement__tick transit-planet-tick" />
                  <g className="planet-label-group wheel-placement" transform={`translate(${marker.x.toFixed(2)} ${marker.y.toFixed(2)})`}>
                    <circle cx={0} cy={0} r={planetHitAreaRadius} className="planet-hit-area" />
                    <WheelPlanetGlyph position={position} yOffset={-4} />
                  </g>
                  <text x={degreeMarker.x.toFixed(2)} y={degreeMarker.y.toFixed(2)} className="planet-degree wheel-placement__degree transit-planet-degree">
                    {formatWheelDegree(position)}
                  </text>
                </g>
              );
            })}
          </g>
        )}
        <g className="sign-labels">
          {signLabels.map(({ sign, isLong, x, y }) => {
            const iconHref = zodiacAssetHref(zodiacSignIconFiles[sign]);
            const iconSize = sign === "Sagittarius" ? longSignIconSize : signIconSize;
            const className = isLong ? "sign-label-long" : undefined;

            return (
              <g key={sign} className={houseSignLabelStyle === "glyph" ? "zodiac-wheel__sign-icon" : className} aria-label={sign}>
                {houseSignLabelStyle === "glyph" && iconHref ? (
                  <image href={iconHref} x={x - iconSize / 2} y={y - iconSize / 2} width={iconSize} height={iconSize} preserveAspectRatio="xMidYMid meet" />
                ) : (
                  <text className="zodiac-wheel__sign-label" stroke="none" paintOrder="normal" filter="none">
                    <textPath href={`#${signLabelPathPrefix}-${sign}`} startOffset="50%">
                      {sign}
                    </textPath>
                  </text>
                )}
              </g>
            );
          })}
        </g>
        {!hasTransitOverlay ? (
          <text x={center} y={626} className="chart-house-system-label">
            Houses: Whole Sign
          </text>
        ) : null}
        </svg>
        {aspectInspectorControls}
        {focusedInspectorPoint ? (
          <div className="aspect-inspector-summary" role="status" aria-live="polite">
            <div className="aspect-inspector-summary__head">
              <strong>{focusedInspectorPoint.label}</strong>
              <span>{inspectorMode === "whole-sign" ? "Whole-sign aspects" : "Aspects"}</span>
            </div>
            {inspectorAspectRows.length > 0 ? (
              <ul className="aspect-inspector-summary__list">
                {inspectorAspectRows.map(({ point: targetPoint, type, label, orb, lineStyle }) => (
                  <li key={`${focusedInspectorPoint.id}-${targetPoint.id}-${type}`} className="aspect-inspector-summary__item">
                    <svg className="aspect-wheel-legend__swatch" viewBox="0 0 38 8" aria-hidden="true" focusable="false">
                      <line
                        className={`${aspectLineClass(type)} ${normalizeAspectType(type)}`}
                        style={lineStyle}
                        x1="2"
                        y1="4"
                        x2="36"
                        y2="4"
                      />
                    </svg>
                    <span className="aspect-inspector-summary__copy">
                      <strong>{label}</strong> {targetPoint.label}
                    </span>
                    <span className="aspect-inspector-summary__orb">{formatInspectorOrb(orb)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="aspect-inspector-summary__empty">No configured aspects from this point.</p>
            )}
          </div>
        ) : null}
      </figure>
      <FloatingTooltipPortal
        anchor={activeTooltipPlanet ? planetMarkerRefs.current.get(activeTooltipPlanet) ?? null : null}
        className="floating-tooltip--planet"
        content={
          activeTooltipPosition
            ? (() => {
                const { aspectLine, placementLine } = tooltipDetailsByPlanet.get(activeTooltipPosition.planet) ?? {
                  aspectLine: "",
                  placementLine: formatPlanetPlacementLine(activeTooltipPosition)
                };

                return (
                  <>
                    <strong>{placementLine}</strong>
                    {aspectLine ? <span>{aspectLine}</span> : null}
                  </>
                );
              })()
            : null
        }
        open={Boolean(activeTooltipPosition)}
      />
    </>
  );
});

type SynastryWheelProps = {
  outerPositions: PlanetPosition[];
  innerPositions: PlanetPosition[];
  interAspects: InterChartAspectLine[];
  ascendant?: string;
  ascendantLongitude?: number;
  midheavenLongitude?: number;
  innerAscendant?: string;
  innerAscendantLongitude?: number;
  houseSignLabelStyle?: HouseSignLabelStyle;
};

export const SynastryWheel = memo(function SynastryWheel({
  outerPositions,
  innerPositions,
  interAspects,
  ascendant,
  ascendantLongitude,
  midheavenLongitude,
  innerAscendant,
  innerAscendantLongitude,
  houseSignLabelStyle = "text"
}: SynastryWheelProps) {
  const center = 300;
  const radius = {
    outer: 284,
    signInner: 240,
    outerHouse: 226,
    outerPlanet: 202,
    innerRingOuter: 176,
    innerRingInner: 110,
    innerPlanet: 140,
    innerHouse: 158,
    aspect: 64,
    inner: 28
  };
  const houseLabelRadius = {
    outer: radius.innerRingOuter + 18,
    inner: radius.innerRingOuter - 12
  };
  const isNatalWheel = typeof ascendantLongitude === "number";
  const ascendantSignIndex = ascendant ? signs.indexOf(ascendant) : -1;
  const wholeHouseStartLongitude = ascendantSignIndex >= 0 ? ascendantSignIndex * 30 : 0;

  function point(angle: number, distance: number) {
    return polarToCartesian(center, center, distance, angle);
  }

  function annularSectorPath(startAngle: number, endAngle: number, outerRadius: number, innerRadius: number) {
    const delta = ((endAngle - startAngle + 540) % 360) - 180;
    const resolvedEndAngle = startAngle + delta;
    const largeArc = Math.abs(delta) > 180 ? 1 : 0;
    const sweep = delta >= 0 ? 0 : 1;
    const outerStart = point(startAngle, outerRadius);
    const outerEnd = point(resolvedEndAngle, outerRadius);
    const innerEnd = point(resolvedEndAngle, innerRadius);
    const innerStart = point(startAngle, innerRadius);

    return [
      `M ${outerStart.x.toFixed(2)} ${outerStart.y.toFixed(2)}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArc} ${sweep} ${outerEnd.x.toFixed(2)} ${outerEnd.y.toFixed(2)}`,
      `L ${innerEnd.x.toFixed(2)} ${innerEnd.y.toFixed(2)}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} ${sweep ? 0 : 1} ${innerStart.x.toFixed(2)} ${innerStart.y.toFixed(2)}`,
      "Z"
    ].join(" ");
  }

  function angleForLongitude(longitude: number) {
    return longitudeToChartAngle(longitude, ascendantLongitude, isNatalWheel);
  }

  const signLabelRadius = (radius.outer + radius.signInner) / 2;
  const wheelClipId = `wheel-clip-${useId().replace(/:/g, "")}`;
  const signLabelPathPrefix = `${wheelClipId}-sign-label`;
  const outerHouseLabels = useMemo(() => chartHouseLabelGeometry({
    ascendant,
    ascendantLongitude,
    angleForLongitude,
    center,
    radius: houseLabelRadius.outer,
    signs
  }), [ascendant, ascendantLongitude, isNatalWheel, houseLabelRadius.outer]);
  const innerHouseLabels = useMemo(() => chartHouseLabelGeometry({
    ascendant: innerAscendant,
    ascendantLongitude: innerAscendantLongitude,
    angleForLongitude,
    center,
    radius: houseLabelRadius.inner,
    signs
  }), [innerAscendant, innerAscendantLongitude, ascendantLongitude, isNatalWheel, houseLabelRadius.inner]);
  const angularLabels = useMemo(() => chartAngularLabelGeometry({
    ascendantLongitude,
    midheavenLongitude,
    angleForLongitude,
    center,
    radius: radius.outer + angleLabelOuterPadding
  }), [ascendantLongitude, midheavenLongitude, isNatalWheel]);
  const signLabels = useMemo(() => chartSignLabelGeometry({
    angleForLongitude,
    center,
    radius: signLabelRadius,
    signs
  }), [ascendantLongitude, isNatalWheel, signLabelRadius]);
  const interAspectPairs = useMemo(() => interAspects.map((aspect) => ({
    ...aspect,
    className: aspectLineClass(aspect.type),
    lineStyle: aspectLineStyle(aspect.type, aspect.orb)
  })), [interAspects]);
  const interAspectRadius = radius.aspect + 8;
  const outerPlanetLayouts = useMemo(() => wheelMarkerLayouts(
    outerPositions,
    (position) => position.planet,
    (position) => angleForLongitude(zodiacLongitude(position)),
    {
      baseRadius: radius.outerPlanet,
      center,
      clusterThreshold: 6,
      maxClusterSpan: 22,
      clusterTangentSpacing: relationshipClusterTangentSpacing,
      maxClusterTangentOffset: relationshipClusterTangentLimit,
      useClusterLane: true,
      radialOffsets: relationshipOuterClusterRadialOffsets,
      minMarkerRadius: radius.innerRingOuter + 10,
      maxMarkerRadius: radius.signInner - 14
    }
  ), [outerPositions, ascendantLongitude, isNatalWheel]);
  const innerPlanetLayouts = useMemo(() => wheelMarkerLayouts(
    innerPositions,
    (position) => position.planet,
    (position) => angleForLongitude(zodiacLongitude(position)),
    {
      baseRadius: radius.innerPlanet,
      center,
      clusterThreshold: 6,
      maxClusterSpan: 22,
      clusterTangentSpacing: relationshipClusterTangentSpacing,
      maxClusterTangentOffset: relationshipClusterTangentLimit,
      useClusterLane: true,
      radialOffsets: relationshipInnerClusterRadialOffsets,
      minMarkerRadius: radius.innerRingInner + 12,
      maxMarkerRadius: radius.innerRingOuter - 12
    }
  ), [innerPositions, ascendantLongitude, isNatalWheel]);
  const planetCollisionGeometry = useMemo(() => {
    function collisionItems(positions: PlanetPosition[], ring: "outer" | "inner") {
      const isOuter = ring === "outer";
      const layouts = isOuter ? outerPlanetLayouts : innerPlanetLayouts;
      const baseRadius = isOuter ? radius.outerPlanet : radius.innerPlanet;
      const tickInnerRadius = isOuter ? radius.signInner - 17 : radius.innerRingOuter - 17;
      const tickOuterRadius = isOuter ? radius.signInner - 5 : radius.innerRingOuter - 5;
      const degreeDistance = isOuter ? 19 : 18;

      return positions.map((position) => {
        const angle = angleForLongitude(zodiacLongitude(position));
        const marker = layouts.get(position.planet)?.marker ?? point(angle, baseRadius);
        const degreeOffset = inwardMarkerOffset(center, marker, degreeDistance);

        return {
          degree: {
            x: marker.x + degreeOffset.x,
            y: marker.y + degreeOffset.y
          },
          tick: {
            start: point(angle, tickInnerRadius),
            end: point(angle, tickOuterRadius)
          }
        };
      });
    }

    return {
      outer: collisionItems(outerPositions, "outer"),
      inner: collisionItems(innerPositions, "inner")
    };
  }, [outerPositions, innerPositions, outerPlanetLayouts, innerPlanetLayouts, ascendantLongitude, isNatalWheel]);

  function distanceToSegment(pointToCheck: ChartPoint, start: ChartPoint, end: ChartPoint) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) {
      return Math.hypot(pointToCheck.x - start.x, pointToCheck.y - start.y);
    }

    const progress = Math.max(0, Math.min(1, ((pointToCheck.x - start.x) * dx + (pointToCheck.y - start.y) * dy) / lengthSquared));
    const projected = {
      x: start.x + progress * dx,
      y: start.y + progress * dy
    };

    return Math.hypot(pointToCheck.x - projected.x, pointToCheck.y - projected.y);
  }

  function adjustedHouseLabels(
    labels: typeof outerHouseLabels,
    ring: "outer" | "inner"
  ) {
    const collisions = planetCollisionGeometry[ring];
    const baseRadius = ring === "outer" ? houseLabelRadius.outer : houseLabelRadius.inner;
    const minRadius = ring === "outer" ? radius.innerRingOuter + 10 : radius.innerRingInner + 20;
    const maxRadius = ring === "outer" ? radius.signInner - 24 : radius.innerRingOuter - 8;
    const radialOffsets = ring === "outer" ? [0, -18, 18, -30, 30, -10, 10] : [0, -16, 12, -28, 24, -8, 8];
    const tangentOffsets = [0, -14, 14, -24, 24];

    function score(candidate: ChartPoint) {
      return collisions.reduce((total, collision) => {
        const degreeDistance = Math.hypot(candidate.x - collision.degree.x, candidate.y - collision.degree.y);
        const tickDistance = distanceToSegment(candidate, collision.tick.start, collision.tick.end);
        const degreeOverlap = Math.max(0, 21 - degreeDistance);
        const tickOverlap = Math.max(0, 15 - tickDistance);

        return total + degreeOverlap * degreeOverlap + tickOverlap * tickOverlap;
      }, 0);
    }

    return labels.map((label) => {
      const candidates = radialOffsets.flatMap((radialOffset) => {
        const candidateRadius = Math.max(minRadius, Math.min(maxRadius, baseRadius + radialOffset));
        const radialPoint = point(label.angle, candidateRadius);
        const tangentRad = ((label.angle + 90) * Math.PI) / 180;

        return tangentOffsets.map((tangentOffset) => ({
          x: radialPoint.x + Math.cos(tangentRad) * tangentOffset,
          y: radialPoint.y - Math.sin(tangentRad) * tangentOffset
        }));
      });
      const best = candidates.reduce((bestCandidate, candidate) => {
        const candidateScore = score(candidate);

        if (candidateScore < bestCandidate.score) {
          return { point: candidate, score: candidateScore };
        }

        return bestCandidate;
      }, { point: { x: label.x, y: label.y }, score: score({ x: label.x, y: label.y }) });
      const adjustedDistance = Math.hypot(best.point.x - label.x, best.point.y - label.y);

      return {
        ...label,
        x: best.point.x,
        y: best.point.y,
        collisionAdjusted: adjustedDistance > 0.5
      };
    });
  }
  const adjustedOuterHouseLabels = useMemo(
    () => adjustedHouseLabels(outerHouseLabels, "outer"),
    [outerHouseLabels, planetCollisionGeometry, houseLabelRadius.outer]
  );
  const adjustedInnerHouseLabels = useMemo(
    () => adjustedHouseLabels(innerHouseLabels, "inner"),
    [innerHouseLabels, planetCollisionGeometry, houseLabelRadius.inner]
  );

  function renderPlanet(position: PlanetPosition, ring: "outer" | "inner") {
    const angle = angleForLongitude(zodiacLongitude(position));
    const layout = ring === "outer" ? outerPlanetLayouts.get(position.planet) : innerPlanetLayouts.get(position.planet);
    const baseRadius = ring === "outer" ? radius.outerPlanet : radius.innerPlanet;
    const truePoint = point(angle, baseRadius);
    const rawMarker = layout?.marker ?? point(angle, baseRadius);
    const marker = rawMarker;
    const tickInner = ring === "outer"
      ? point(angle, radius.signInner - 17)
      : point(angle, radius.innerRingOuter - 17);
    const tickOuter = ring === "outer"
      ? point(angle, radius.signInner - 5)
      : point(angle, radius.innerRingOuter - 5);
    const degreeOffset = inwardMarkerOffset(center, marker, ring === "outer" ? 19 : 18);
    const markerDelta = Math.hypot(marker.x - truePoint.x, marker.y - truePoint.y);
    const hasDisplacement = Boolean(layout && (layout.clusterSize > 1 || markerDelta > 0.5));

    return (
      <g
        key={`${ring}-${position.planet}`}
        className={`planet-marker ${ring === "inner" ? "planet-marker-inner" : "planet-marker-outer"}`}
        role="img"
        aria-label={`${ring === "outer" ? "Outer" : "Inner"} chart ${formatPlanetPlacementLine(position)}`}
      >
        <line
          x1={tickInner.x}
          y1={tickInner.y}
          x2={tickOuter.x}
          y2={tickOuter.y}
          className={`planet-tick wheel-placement__tick synastry-planet-tick synastry-planet-tick--${ring}`}
          data-ring={ring}
          data-planet={position.planet}
        />
        <g className={`planet-label-group wheel-placement${hasDisplacement ? " planet-label-group--displaced" : ""}`} transform={`translate(${marker.x.toFixed(2)} ${marker.y.toFixed(2)})`}>
          <circle cx={0} cy={0} r={ring === "outer" ? planetHitAreaRadius + 3 : planetHitAreaRadius + 2} className="planet-hit-area" />
          <WheelPlanetGlyph position={position} yOffset={-4} />
          <text x={degreeOffset.x.toFixed(2)} y={degreeOffset.y.toFixed(2)} className="planet-degree wheel-placement__degree">
            {formatWheelDegree(position)}
          </text>
        </g>
      </g>
    );
  }

  return (
    <svg className="sky-wheel synastry-wheel sky-wheel-synastry" viewBox={wheelViewBox} role="img" aria-label="Synastry chart with two rings">
      <defs>
        <clipPath id={wheelClipId}>
          <circle cx={center} cy={center} r={radius.outer} />
        </clipPath>
        {signLabels.map(({ sign, path }) => (
          <path key={`${sign}-label-path`} id={`${signLabelPathPrefix}-${sign}`} d={path} />
        ))}
      </defs>
      <circle className="sign-band" cx={center} cy={center} r={(radius.outer + radius.signInner) / 2} />
      <g className="wheel-rings synastry-base-rings">
        <circle cx={center} cy={center} r={radius.outer} />
        <circle cx={center} cy={center} r={radius.signInner} />
        <circle cx={center} cy={center} r={radius.innerRingOuter} />
        <circle cx={center} cy={center} r={radius.innerRingInner} />
        <circle cx={center} cy={center} r={radius.aspect} className="faint" />
        <circle cx={center} cy={center} r={radius.inner} />
      </g>
      <g className="synastry-house-band-guides" aria-hidden="true">
        <circle cx={center} cy={center} r={radius.outerHouse + 10} />
        <circle cx={center} cy={center} r={radius.outerHouse - 10} />
        <circle cx={center} cy={center} r={radius.innerHouse + 10} />
        <circle cx={center} cy={center} r={radius.innerHouse - 10} />
      </g>
      <g className="wheel-sectors">
        {signs.map((sign, index) => {
          const a = angleForLongitude((isNatalWheel ? wholeHouseStartLongitude : 0) + index * 30);
          const outer = point(a, radius.signInner);
          const inner = point(a, radius.innerRingInner);
          return <line key={sign} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} />;
        })}
      </g>
      <g className="synastry-ring-zebra synastry-ring-zebra-outer" aria-hidden="true">
        {signs.map((sign, index) => (
          <path
            key={`outer-zebra-${sign}`}
            className={index % 2 === 0 ? "zebra-even" : "zebra-odd"}
            d={annularSectorPath(angleForLongitude(index * 30), angleForLongitude(index * 30 + 30), radius.signInner - 3, radius.innerRingOuter + 3)}
          />
        ))}
      </g>
      <g className="synastry-ring-zebra synastry-ring-zebra-inner" aria-hidden="true">
        {signs.map((sign, index) => (
          <path
            key={`inner-zebra-${sign}`}
            className={index % 2 === 0 ? "zebra-even" : "zebra-odd"}
            d={annularSectorPath(angleForLongitude(index * 30), angleForLongitude(index * 30 + 30), radius.innerRingOuter - 3, radius.innerRingInner + 3)}
          />
        ))}
      </g>
      <g className="sign-band-dividers" clipPath={`url(#${wheelClipId})`}>
        {signs.map((sign, index) => {
          const a = angleForLongitude(index * 30);
          const outer = point(a, radius.outer);
          const inner = point(a, radius.signInner - 2);
          return <line key={sign} className="zodiac-wheel__divider" x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} />;
        })}
      </g>
      {interAspectPairs.length > 0 && (
        <g className="aspect-lines interchart-aspect-lines" aria-label="Inter-chart aspects">
          {interAspectPairs.map(({ id, fromLongitude, toLongitude, type, className, lineStyle }) => {
            const a = point(angleForLongitude(fromLongitude), interAspectRadius);
            const b = point(angleForLongitude(toLongitude), interAspectRadius);

            return (
              <g key={id} className={`${className} ${normalizeAspectType(type)}`} style={lineStyle}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
              </g>
            );
          })}
        </g>
      )}
      {isNatalWheel && (
        <g className="natal-angle-lines" aria-label="Chart angle axes">
          {(() => {
            const asc = point(angleForLongitude(ascendantLongitude), radius.outer + angleAxisOuterPadding);
            const dsc = point(angleForLongitude(ascendantLongitude + 180), radius.outer + angleAxisOuterPadding);
            const midheavenAxis = typeof midheavenLongitude === "number"
              ? (() => {
                  const mc = point(angleForLongitude(midheavenLongitude), radius.outer + angleAxisOuterPadding);
                  const ic = point(angleForLongitude(midheavenLongitude + 180), radius.outer + angleAxisOuterPadding);

                  return <line className="midheaven-axis" x1={mc.x} y1={mc.y} x2={ic.x} y2={ic.y} />;
                })()
              : null;

            return (
              <>
                <line className="ascendant-axis" x1={asc.x} y1={asc.y} x2={dsc.x} y2={dsc.y} />
                {midheavenAxis}
              </>
            );
          })()}
        </g>
      )}
      <g className="house-labels synastry-house-labels synastry-outer-house-labels" aria-label={ascendant ? "Outer chart whole sign houses" : "Outer chart natural house labels"}>
        {adjustedOuterHouseLabels.map(({ house, x, y, ariaLabel, collisionAdjusted }) => (
          <text
            key={house}
            x={x}
            y={y}
            className={`zodiac-house-number zodiac-wheel__house-label synastry-house-number synastry-house-number--outer${collisionAdjusted ? " synastry-house-number--collision-adjusted" : ""}`}
            aria-label={`Outer chart ${ariaLabel}`}
            data-collision-adjusted={collisionAdjusted ? "true" : undefined}
          >
            {house}
          </text>
        ))}
      </g>
      <g className="house-labels synastry-house-labels synastry-inner-house-labels" aria-label={innerAscendant ? "Inner chart whole sign houses" : "Inner chart natural house labels"}>
        {adjustedInnerHouseLabels.map(({ house, x, y, ariaLabel, collisionAdjusted }) => (
          <text
            key={house}
            x={x}
            y={y}
            className={`zodiac-house-number zodiac-wheel__house-label synastry-house-number synastry-house-number--inner${collisionAdjusted ? " synastry-house-number--collision-adjusted" : ""}`}
            aria-label={`Inner chart ${ariaLabel}`}
            data-collision-adjusted={collisionAdjusted ? "true" : undefined}
          >
            {house}
          </text>
        ))}
      </g>
      {isNatalWheel && (
        <g className="angular-labels" aria-label="Chart angles">
          {angularLabels.map(({ label, x, y }) => {
            const iconHref = zodiacAssetHref(wheelAngleIconFiles[label]);
            const iconSize = angleIconSize;

            return iconHref ? (
              <image
                key={label}
                href={iconHref}
                x={x - iconSize / 2}
                y={y - iconSize / 2}
                width={iconSize}
                height={iconSize}
                className="zodiac-wheel__angle-icon"
                aria-label={label}
                preserveAspectRatio="xMidYMid meet"
              />
            ) : (
              <text key={label} x={x} y={y}>
                {label}
              </text>
            );
          })}
        </g>
      )}
      <g className="sign-labels">
        {signLabels.map(({ sign, isLong, x, y }) => {
          const iconHref = zodiacAssetHref(zodiacSignIconFiles[sign]);
          const iconSize = sign === "Sagittarius" ? longSignIconSize : signIconSize;
          const className = isLong ? "sign-label-long" : undefined;

          return (
            <g key={sign} className={houseSignLabelStyle === "glyph" ? "zodiac-wheel__sign-icon" : className} aria-label={sign}>
              {houseSignLabelStyle === "glyph" && iconHref ? (
                <image href={iconHref} x={x - iconSize / 2} y={y - iconSize / 2} width={iconSize} height={iconSize} preserveAspectRatio="xMidYMid meet" />
              ) : (
                <text className="zodiac-wheel__sign-label" stroke="none" paintOrder="normal" filter="none">
                  <textPath href={`#${signLabelPathPrefix}-${sign}`} startOffset="50%">
                    {sign}
                  </textPath>
                </text>
              )}
            </g>
          );
        })}
      </g>
      <g className="planet-labels synastry-outer-planet-labels" aria-label="Outer chart planets">
        {outerPositions.map((position) => renderPlanet(position, "outer"))}
      </g>
      <g className="planet-labels inner-planet-labels" aria-label="Inner chart planets">
        {innerPositions.map((position) => renderPlanet(position, "inner"))}
      </g>
      <text x={center} y={626} className="chart-house-system-label">
        Whole-sign houses · angles exact
      </text>
    </svg>
  );
});
