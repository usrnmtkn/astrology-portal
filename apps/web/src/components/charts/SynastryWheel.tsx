import type { KeyboardEvent, MouseEvent } from "react";
import { memo, useEffect, useId, useMemo, useRef, useState } from "react";
import type { PlanetPosition } from "../../types";
import {
  normalizeAspectType,
  wheelAngleIconFiles,
  zodiacAssetHref,
  zodiacSignIconFiles
} from "./chartAssets";
import { aspectLineClass, aspectLineStyle } from "./chartAspectLines";
import {
  angleAxisOuterPadding,
  angleLabelOuterPadding,
  chartAngularLabelGeometry,
  chartHouseLabelGeometry,
  chartSignLabelGeometry,
  inwardMarkerOffset,
  longitudeToChartAngle,
  polarToCartesian,
  wheelMarkerLayouts,
  wheelViewBox
} from "./wheelGeometry";
import {
  WheelPlanetGlyph,
  aspectLegendLabel,
  aspectLegendSortValue,
  formatInspectorOrb,
  formatPlanetPlacementLine,
  formatWheelDegree,
  inspectorLineStyle,
  normalizedLongitude,
  selectedInspectorLineStyle,
  signs,
  zodiacLongitude,
  type HouseSignLabelStyle,
  type InterChartAspectLine
} from "./Wheels";

const angleIconSize = 34;
const signIconSize = 27;
const longSignIconSize = 29;
const synastryClusterTangentSpacing = 30;
const relationshipClusterTangentLimit = 40;
const synastryPlanetHitAreaRadius = 14;
const relationshipOuterClusterRadialOffsets = [0, 16, -12, 30, -24, 42, -34];
const relationshipInnerClusterRadialOffsets = [0, -14, 14, -28, 28, -40, 40];

type ChartPoint = {
  x: number;
  y: number;
};

type InspectorPoint = {
  id: string;
  label: string;
  glyph: string;
  longitude: number;
  sign: number;
  position?: PlanetPosition;
  kind: "outer-position" | "inner-position" | "outer-angle" | "inner-angle";
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

function synastryInspectorPointId(ring: "outer" | "inner", point: string) {
  return `${ring}:${point}`;
}

type SynastryWheelProps = {
  outerPositions: PlanetPosition[];
  innerPositions: PlanetPosition[];
  interAspects: InterChartAspectLine[];
  ascendant?: string;
  ascendantLongitude?: number;
  midheavenLongitude?: number;
  innerAscendant?: string;
  innerAscendantLongitude?: number;
  innerMidheavenLongitude?: number;
  houseSignLabelStyle?: HouseSignLabelStyle;
  aspectInspector?: boolean;
  outerLabel?: string;
  innerLabel?: string;
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
  innerMidheavenLongitude,
  houseSignLabelStyle = "text",
  aspectInspector = false,
  outerLabel = "Outer chart",
  innerLabel = "Inner chart"
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
  const inspectorEnabled = aspectInspector;
  const [focusedInspectorPointId, setFocusedInspectorPointId] = useState<string | null>(null);
  const wheelShellRef = useRef<HTMLElement | null>(null);
  const inspectorPoints = useMemo(() => {
    if (!inspectorEnabled) {
      return [];
    }

    const points: InspectorPoint[] = [
      ...outerPositions.map((position): InspectorPoint => {
        const longitude = normalizedLongitude(zodiacLongitude(position));

        return {
          id: synastryInspectorPointId("outer", position.planet),
          label: `${outerLabel} ${position.planet}`,
          glyph: position.glyph,
          longitude,
          sign: Math.floor(longitude / 30),
          position,
          kind: "outer-position"
        };
      }),
      ...innerPositions.map((position): InspectorPoint => {
        const longitude = normalizedLongitude(zodiacLongitude(position));

        return {
          id: synastryInspectorPointId("inner", position.planet),
          label: `${innerLabel} ${position.planet}`,
          glyph: position.glyph,
          longitude,
          sign: Math.floor(longitude / 30),
          position,
          kind: "inner-position"
        };
      })
    ];

    function addAngle(
      ring: "outer" | "inner",
      pointName: "Ascendant" | "Descendant" | "Midheaven" | "Imum Coeli",
      longitude: number | undefined,
      glyph: string
    ) {
      if (typeof longitude !== "number") {
        return;
      }

      const normalized = normalizedLongitude(longitude);
      const label = ring === "outer" ? outerLabel : innerLabel;
      points.push({
        id: synastryInspectorPointId(ring, pointName),
        label: `${label} ${pointName}`,
        glyph,
        longitude: normalized,
        sign: Math.floor(normalized / 30),
        kind: ring === "outer" ? "outer-angle" : "inner-angle"
      });
    }

    addAngle("outer", "Ascendant", ascendantLongitude, "ASC");
    addAngle("outer", "Descendant", typeof ascendantLongitude === "number" ? ascendantLongitude + 180 : undefined, "DSC");
    addAngle("outer", "Midheaven", midheavenLongitude, "MC");
    addAngle("outer", "Imum Coeli", typeof midheavenLongitude === "number" ? midheavenLongitude + 180 : undefined, "IC");
    addAngle("inner", "Ascendant", innerAscendantLongitude, "ASC");
    addAngle("inner", "Descendant", typeof innerAscendantLongitude === "number" ? innerAscendantLongitude + 180 : undefined, "DSC");
    addAngle("inner", "Midheaven", innerMidheavenLongitude, "MC");
    addAngle("inner", "Imum Coeli", typeof innerMidheavenLongitude === "number" ? innerMidheavenLongitude + 180 : undefined, "IC");

    return points;
  }, [
    inspectorEnabled,
    outerPositions,
    innerPositions,
    ascendantLongitude,
    midheavenLongitude,
    innerAscendantLongitude,
    innerMidheavenLongitude,
    outerLabel,
    innerLabel
  ]);
  const focusedInspectorPoint = focusedInspectorPointId
    ? inspectorPoints.find((candidate) => candidate.id === focusedInspectorPointId) ?? null
    : null;
  const exactInspectorAspectSources = useMemo((): InspectorAspectSource[] => (
    inspectorEnabled
      ? interAspectPairs.flatMap((aspect) => (
        aspect.fromPointId && aspect.toPointId
          ? [{
              fromId: aspect.fromPointId,
              toId: aspect.toPointId,
              type: aspect.type,
              orb: aspect.orb
            }]
          : []
      ))
      : []
  ), [inspectorEnabled, interAspectPairs]);
  const inspectorAspects = useMemo(() => {
    if (!focusedInspectorPoint) {
      return [];
    }

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
  }, [exactInspectorAspectSources, focusedInspectorPoint, inspectorPoints]);
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
        lineStyle: inspectorLineStyle(aspect.type, aspect.orb, "exact")
      }));
  }, [focusedInspectorPoint, inspectorAspects]);
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
      clusterTangentSpacing: synastryClusterTangentSpacing,
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
      clusterTangentSpacing: synastryClusterTangentSpacing,
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
    const inspectorPointId = synastryInspectorPointId(ring, position.planet);
    const inspectorState = inspectorPointState(inspectorPointId);
    const chartLabel = ring === "outer" ? outerLabel : innerLabel;

    return (
      <g
        key={`${ring}-${position.planet}`}
        className={`planet-marker ${ring === "inner" ? "planet-marker-inner" : "planet-marker-outer"} aspect-inspector-point aspect-inspector-point--${inspectorState}`}
        role={inspectorEnabled ? "button" : "img"}
        tabIndex={inspectorEnabled ? 0 : undefined}
        aria-label={`${chartLabel} ${formatPlanetPlacementLine(position)}`}
        data-inspector-point-id={inspectorPointId}
        onClick={inspectorEnabled ? (event) => {
          event.stopPropagation();
          event.currentTarget.blur();
          setFocusedInspectorPointId((current) => current === inspectorPointId ? null : inspectorPointId);
        } : undefined}
        onKeyDown={inspectorEnabled ? (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            setFocusedInspectorPointId((current) => current === inspectorPointId ? null : inspectorPointId);
          }
        } : undefined}
      >
        {inspectorState === "selected" ? (
          <circle
            cx={point(angle, interAspectRadius).x}
            cy={point(angle, interAspectRadius).y}
            r={7}
            className="aspect-inspector-focus-ring"
            aria-hidden="true"
          />
        ) : null}
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
          <circle cx={0} cy={0} r={synastryPlanetHitAreaRadius} className="planet-hit-area" />
          <WheelPlanetGlyph position={position} yOffset={-4} />
          <text x={degreeOffset.x.toFixed(2)} y={degreeOffset.y.toFixed(2)} className="planet-degree wheel-placement__degree">
            {formatWheelDegree(position)}
          </text>
        </g>
      </g>
    );
  }

  return (
    <figure
      ref={wheelShellRef}
      className={`sky-wheel-shell sky-wheel-shell-synastry${inspectorEnabled ? " sky-wheel-shell--aspect-inspector" : ""}${focusedInspectorPoint ? " is-inspecting-aspects" : ""}`}
    >
    <svg
      className={`sky-wheel synastry-wheel sky-wheel-synastry${inspectorEnabled ? " sky-wheel--aspect-inspector" : ""}${focusedInspectorPoint ? " is-inspecting-aspects" : ""}`}
      viewBox={wheelViewBox}
      role="img"
      aria-label="Synastry chart with two rings"
      onClick={inspectorEnabled ? () => setFocusedInspectorPointId(null) : undefined}
    >
      <defs>
        <clipPath id={wheelClipId}>
          <circle cx={center} cy={center} r={radius.outer} />
        </clipPath>
        {signLabels.map(({ sign, path }) => (
          <path key={`${sign}-label-path`} id={`${signLabelPathPrefix}-${sign}`} d={path} />
        ))}
      </defs>
      <circle
        className="synastry-inner-planet-band"
        cx={center}
        cy={center}
        r={(radius.innerRingOuter + radius.innerRingInner) / 2}
        aria-hidden="true"
      />
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
          {interAspectPairs.map(({ id, fromLongitude, toLongitude, type, orb, fromPointId, toPointId, className, lineStyle }) => {
            if (
              focusedInspectorPoint
              && fromPointId !== focusedInspectorPoint.id
              && toPointId !== focusedInspectorPoint.id
            ) {
              return null;
            }

            const a = point(angleForLongitude(fromLongitude), interAspectRadius);
            const b = point(angleForLongitude(toLongitude), interAspectRadius);
            const isSelectedAspect = Boolean(focusedInspectorPoint);

            return (
              <g
                key={id}
                className={`${className} ${normalizeAspectType(type)}${isSelectedAspect ? " aspect-inspector-line" : ""}`}
                style={isSelectedAspect ? selectedInspectorLineStyle(type, orb, "exact") : lineStyle}
                data-from-point-id={fromPointId}
                data-to-point-id={toPointId}
              >
                {isSelectedAspect ? (
                  <line className="aspect-inspector-line-backdrop" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
                ) : null}
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
            const pointName = label === "ASC"
              ? "Ascendant"
              : label === "DSC"
                ? "Descendant"
                : label === "MC"
                  ? "Midheaven"
                  : "Imum Coeli";
            const inspectorPointId = synastryInspectorPointId("outer", pointName);
            const inspectorState = inspectorPointState(inspectorPointId);
            const angleClassName = `zodiac-wheel__angle-icon aspect-inspector-point aspect-inspector-point--${inspectorState}`;
            const angleProps = inspectorEnabled ? {
              role: "button",
              tabIndex: 0,
              "data-inspector-point-id": inspectorPointId,
              onClick: (event: MouseEvent<SVGImageElement | SVGTextElement>) => {
                event.stopPropagation();
                event.currentTarget.blur();
                setFocusedInspectorPointId((current) => current === inspectorPointId ? null : inspectorPointId);
              },
              onKeyDown: (event: KeyboardEvent<SVGImageElement | SVGTextElement>) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  setFocusedInspectorPointId((current) => current === inspectorPointId ? null : inspectorPointId);
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
                aria-label={`${outerLabel} ${pointName}`}
                preserveAspectRatio="xMidYMid meet"
                {...angleProps}
              />
            ) : (
              <text
                key={label}
                x={x}
                y={y}
                className={`aspect-inspector-point aspect-inspector-point--${inspectorState}`}
                aria-label={`${outerLabel} ${pointName}`}
                {...angleProps}
              >
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
    {focusedInspectorPoint ? (
      <div className="aspect-inspector-summary" role="status" aria-live="polite">
        <div className="aspect-inspector-summary__head">
          <strong>{focusedInspectorPoint.label}</strong>
          <span>Inter-chart aspects</span>
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
          <p className="aspect-inspector-summary__empty">No configured inter-chart aspects from this point.</p>
        )}
      </div>
    ) : null}
    </figure>
  );
});
