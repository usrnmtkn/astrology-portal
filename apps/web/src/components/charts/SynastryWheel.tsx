import { useRelationshipWheelDisplay } from "./useRelationshipWheelDisplay";
import type { KeyboardEvent, MouseEvent } from "react";
import { memo, useEffect, useId, useMemo, useRef, useState } from "react";
import type { PlanetPosition } from "../../types";
import {
  normalizeAspectType,
  wheelAngleIconFiles,
  zodiacAssetHref,
  zodiacSignIconFiles
} from "./chartAssets";
import { aspectLineClass, aspectLineStyle, type AspectColorMode } from "./chartAspectLines";
import {
  chartAngularLabelGeometry,
  chartHouseLabelGeometry,
  chartSignLabelGeometry,
  avoidWheelLabelCollisions,
  wheelAngleBadgeBounds,
  wheelAngleBadgeWidth,
  wheelDegreeOffset,
  wheelPlacementBounds,
  wheelTickGeometry,
  longitudeToChartAngle,
  polarToCartesian
} from "./wheelGeometry";
import { fittedWheelMarkerLayouts } from "./fittedWheelGeometry";
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
const synastryPlanetHitAreaRadius = 14;
const synastryPlanetDegreeOffset = 22;

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
  aspectColorMode?: AspectColorMode;
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
  innerLabel = "Inner chart",
  aspectColorMode: colorModeOverride
}: SynastryWheelProps) {
  const display = useRelationshipWheelDisplay();
  const aspectColorMode = colorModeOverride ?? display.aspectColorMode;
  const center = 300;
  const radius = {
    outer: 284,
    signInner: 240,
    outerPlanet: 210,
    houseBandOuter: 132,
    houseBandMiddle: 96,
    houseBandInner: 96,
    innerPlanet: 162,
    innerPlanetBandInner: 132,
    aspect: 96
  };
  const isNatalWheel = typeof ascendantLongitude === "number";
  const ascendantSignIndex = ascendant ? signs.indexOf(ascendant) : -1;
  const wholeHouseStartLongitude = ascendantSignIndex >= 0 ? ascendantSignIndex * 30 : 0;

  function point(angle: number, distance: number) {
    return polarToCartesian(center, center, distance, angle);
  }

  function angleForLongitude(longitude: number) {
    return longitudeToChartAngle(longitude, ascendantLongitude, isNatalWheel);
  }

  // Use the natal canvas size. Crowded labels spread within the fixed rings;
  // exact longitude ticks and aspect anchors remain unchanged.
  const angularLabels = useMemo(() => chartAngularLabelGeometry({
    ascendantLongitude,
    midheavenLongitude,
    angleForLongitude,
    center,
    radius: radius.signInner
  }), [ascendantLongitude, midheavenLongitude, isNatalWheel, radius.outer]);
  const outerTicks = useMemo(() => new Map(outerPositions.map(position => [position.planet,
    wheelTickGeometry(center, angleForLongitude(zodiacLongitude(position)), radius.signInner - 6, radius.signInner)
  ])), [outerPositions, ascendantLongitude, isNatalWheel]);
  const innerTicks = useMemo(() => new Map(innerPositions.map(position => [position.planet,
    wheelTickGeometry(center, angleForLongitude(zodiacLongitude(position)), 184, 190)
  ])), [innerPositions, ascendantLongitude, isNatalWheel]);
  const tickBounds = useMemo(() => [...outerTicks.values()].map(tick => tick.bounds), [outerTicks]);
  const innerPlanetLayouts = useMemo(() => avoidWheelLabelCollisions(fittedWheelMarkerLayouts(
    innerPositions, position => position.planet, position => zodiacLongitude(position),
    { radius: 162, minimumRadius: 148, center, minimumSpacing: 33, rowSpacing: 40, glyphSize: 22,
      annotationOffset: synastryPlanetDegreeOffset, angleForLongitude }
  ), center, 22, synastryPlanetDegreeOffset, tickBounds), [innerPositions, ascendantLongitude, isNatalWheel, tickBounds]);
  const outerPlanetLayouts = useMemo(() => avoidWheelLabelCollisions(fittedWheelMarkerLayouts(
    outerPositions, position => position.planet, position => zodiacLongitude(position),
    { radius: radius.outerPlanet, minimumRadius: 202, center, minimumSpacing: 37.5, rowSpacing: 40,
      glyphSize: 26, annotationOffset: synastryPlanetDegreeOffset, angleForLongitude }
  ), center, 26, synastryPlanetDegreeOffset, [
    ...wheelAngleBadgeBounds(angularLabels, center),
    ...tickBounds,
    ...[...innerPlanetLayouts.values()].flatMap(layout => wheelPlacementBounds(center, layout.marker, 22, synastryPlanetDegreeOffset))
  ]), [outerPositions, ascendantLongitude, isNatalWheel, innerPlanetLayouts, angularLabels, tickBounds]);
  const houseLabelRadius = {
    outer: (radius.houseBandOuter + radius.houseBandMiddle) / 2,
    inner: (radius.houseBandMiddle + radius.houseBandInner) / 2
  };

  const signLabelRadius = (radius.outer + radius.signInner) / 2;
  const wheelClipId = `wheel-clip-${useId().replace(/:/g, "")}`;
  const tickMaskId = `${wheelClipId}-ticks`;
  const tickClearance = useMemo(() => [
    ...wheelAngleBadgeBounds(angularLabels, center),
    ...[...innerPlanetLayouts.values()].flatMap(layout => wheelPlacementBounds(center, layout.marker, 22, synastryPlanetDegreeOffset)),
    ...[...outerPlanetLayouts.values()].flatMap(layout => wheelPlacementBounds(center, layout.marker, 26, synastryPlanetDegreeOffset))
  ], [angularLabels, innerPlanetLayouts, outerPlanetLayouts]);
  const signLabelPathPrefix = `${wheelClipId}-sign-label`;
  const outerHouseLabels = useMemo(() => chartHouseLabelGeometry({
    ascendant,
    ascendantLongitude,
    angleForLongitude,
    center,
    radius: houseLabelRadius.outer,
    signs
  }), [ascendant, ascendantLongitude, isNatalWheel, houseLabelRadius.outer]);
  const signLabels = useMemo(() => chartSignLabelGeometry({
    angleForLongitude,
    center,
    radius: signLabelRadius,
    signs
  }), [ascendantLongitude, isNatalWheel, signLabelRadius]);
  const interAspectPairs = useMemo(() => interAspects.map((aspect) => ({
    ...aspect,
    className: aspectLineClass(aspect.type),
    lineStyle: aspectLineStyle(aspect.type, aspect.orb, aspectColorMode, true)
  })), [interAspects, aspectColorMode]);
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
        lineStyle: inspectorLineStyle(aspect.type, aspect.orb, "exact", aspectColorMode, true)
      }));
  }, [focusedInspectorPoint, inspectorAspects, aspectColorMode]);
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

    const clearInspectorOnEscape = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") setFocusedInspectorPointId(null); };
    document.addEventListener("pointerdown", clearInspectorOnOutsidePointerDown);
    document.addEventListener("keydown", clearInspectorOnEscape);

    return () => {
      document.removeEventListener("pointerdown", clearInspectorOnOutsidePointerDown);
      document.removeEventListener("keydown", clearInspectorOnEscape);
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
  const interAspectRadius = radius.aspect;

  function renderPlanet(position: PlanetPosition, ring: "outer" | "inner") {
    const angle = angleForLongitude(zodiacLongitude(position));
    const layout = ring === "outer" ? outerPlanetLayouts.get(position.planet) : innerPlanetLayouts.get(position.planet);
    const baseRadius = ring === "outer" ? radius.outerPlanet : radius.innerPlanet;
    const truePoint = point(angle, baseRadius);
    const marker = layout?.marker ?? point(angle, baseRadius);
    const { inner: tickInner, outer: tickOuter } = (ring === "outer" ? outerTicks : innerTicks).get(position.planet)!;
    const degreeOffset = wheelDegreeOffset(center, marker, ring === "outer" ? 26 : 22, synastryPlanetDegreeOffset);
    const markerDelta = Math.hypot(marker.x - truePoint.x, marker.y - truePoint.y);
    const hasDisplacement = markerDelta > 0.5;
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
          mask={`url(#${tickMaskId})`}
          data-ring={ring}
          data-planet={position.planet}
        />
        <g className={`planet-label-group wheel-placement${hasDisplacement ? " planet-label-group--displaced" : ""}`} transform={`translate(${marker.x.toFixed(2)} ${marker.y.toFixed(2)})`}>
          <circle cx={0} cy={0} r={synastryPlanetHitAreaRadius} className="planet-hit-area" />
          <WheelPlanetGlyph position={position} yOffset={0} size={ring === "outer" ? 26 : 22} />
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
      className={`sky-wheel sky-wheel--handoff synastry-wheel sky-wheel-synastry${inspectorEnabled ? " sky-wheel--aspect-inspector" : ""}${focusedInspectorPoint ? " is-inspecting-aspects" : ""}`}
      viewBox="-4 -4 608 648"
      role="img"
      aria-label="Synastry chart with two rings"
      onClick={inspectorEnabled ? () => setFocusedInspectorPointId(null) : undefined}
    >
      <defs>
        <mask id={tickMaskId} maskUnits="userSpaceOnUse" x={0} y={0} width={600} height={600}>
          <rect x={0} y={0} width={600} height={600} fill="white" />
          {tickClearance.map((box, index) => <rect key={index} data-wheel-label-cutout
            x={box.x - box.halfWidth - 3} y={box.y - box.halfHeight - 3}
            width={(box.halfWidth + 3) * 2} height={(box.halfHeight + 3) * 2} fill="black" />)}
        </mask>
        <clipPath id={wheelClipId}>
          <circle cx={center} cy={center} r={radius.outer} />
        </clipPath>
        {signLabels.map(({ sign, path }) => (
          <path key={`${sign}-label-path`} id={`${signLabelPathPrefix}-${sign}`} d={path} />
        ))}
      </defs>
      <g className="wheel-surfaces" aria-hidden="true">
        <circle className="wheel-surface--signs" cx={center} cy={center} r={radius.outer} />
        <circle className="wheel-surface--planets" cx={center} cy={center} r={radius.signInner} />
        <circle className="wheel-surface--inner-planets" cx={center} cy={center} r={190} />
        <circle className="wheel-surface--houses" cx={center} cy={center} r={132} />
        <circle className="wheel-surface--aspects" cx={center} cy={center} r={radius.aspect} />
      </g>
      <circle className="sign-band" cx={center} cy={center} r={(radius.outer + radius.signInner) / 2} />
      <g className="wheel-rings synastry-base-rings">
        <circle cx={center} cy={center} r={radius.outer} />
        <circle cx={center} cy={center} r={radius.signInner} />
        <circle cx={center} cy={center} r={radius.innerPlanetBandInner} className="faint" />
      </g>
      <g className="wheel-sectors">
        {signs.map((sign, index) => {
          const a = angleForLongitude((isNatalWheel ? wholeHouseStartLongitude : 0) + index * 30);
          const outer = point(a, radius.signInner);
          const inner = point(a, radius.aspect);
          return <line key={sign} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} />;
        })}
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
                style={isSelectedAspect ? selectedInspectorLineStyle(type, orb, "exact", aspectColorMode, true) : lineStyle}
                data-from-point-id={fromPointId}
                data-to-point-id={toPointId}
              >
                {isSelectedAspect ? (
                  <line className="aspect-inspector-line-backdrop" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
                ) : null}
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
                <circle className="aspect-endpoint" cx={a.x} cy={a.y} r={2.5} />
                <circle className="aspect-endpoint" cx={b.x} cy={b.y} r={2.5} />
              </g>
            );
          })}
        </g>
      )}
      {isNatalWheel && (
        <g className="natal-angle-lines" aria-label="Chart angle axes">
          {[{longitude:ascendantLongitude,className:"ascendant-axis"},{longitude:midheavenLongitude,className:"midheaven-axis"}].flatMap(axis => typeof axis.longitude === "number" ? [axis.longitude,axis.longitude+180].map(longitude => {
            const inner=point(angleForLongitude(longitude),radius.aspect),outer=point(angleForLongitude(longitude),225);
            return <line key={`${axis.className}-${longitude}`} className={axis.className} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}/>;
          }) : [])}

        </g>
      )}
      <g className="house-labels synastry-house-labels synastry-outer-house-labels" aria-label={ascendant ? "Outer chart whole sign houses" : "Outer chart natural house labels"}>
        {outerHouseLabels.map(({ house, x, y, ariaLabel }) => (
          <text
            key={house}
            x={x}
            y={y}
            className="zodiac-house-number zodiac-wheel__house-label synastry-house-number synastry-house-number--outer"
            transform={(() => { let rotation=90-Math.atan2(center-y,x-center)*180/Math.PI; while(rotation>90)rotation-=180;while(rotation< -90)rotation+=180;return `rotate(${rotation} ${x} ${y})`; })()}
            aria-label={`Outer chart ${ariaLabel}`}
          >
            {house}
          </text>
        ))}
      </g>
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
              onClick: (event: MouseEvent<SVGElement>) => {
                event.stopPropagation();
                event.currentTarget.blur();
                setFocusedInspectorPointId((current) => current === inspectorPointId ? null : inspectorPointId);
              },
              onKeyDown: (event: KeyboardEvent<SVGElement>) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  setFocusedInspectorPointId((current) => current === inspectorPointId ? null : inspectorPointId);
                }
              }
            } : {};

            const angle=Math.atan2(center-y,x-center)*180/Math.PI;
            let rotation=90-angle;
            while(rotation>90)rotation-=180;
            while(rotation< -90)rotation+=180;
            const width=wheelAngleBadgeWidth(label);
            return <g key={label} className={`zodiac-wheel__angle-badge aspect-inspector-point aspect-inspector-point--${inspectorState}`} transform={`translate(${x} ${y}) rotate(${rotation})`} aria-label={`${outerLabel} ${pointName}`} {...angleProps}>
              <rect x={-width/2} y={-12} width={width} height={24} rx={12}/><text x={0} y={0}>{label}</text>
            </g>;
          })}
        </g>
      )}
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
