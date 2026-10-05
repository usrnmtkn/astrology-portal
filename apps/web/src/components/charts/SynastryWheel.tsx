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
  angleAxisOuterPadding,
  angleLabelOuterPadding,
  chartAngularLabelGeometry,
  chartHouseLabelGeometry,
  chartSignLabelGeometry,
  inwardMarkerOffset,
  longitudeToChartAngle,
  polarToCartesian,
  fittedWheelMarkerLayouts,
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
    outerPlanet: 220,
    houseBandOuter: 184,
    houseBandMiddle: 162,
    houseBandInner: 140,
    innerPlanet: 123,
    innerPlanetBandInner: 84,
    aspect: 78
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

  // Use the natal canvas size. Crowded labels spread within the fixed rings;
  // exact longitude ticks and aspect anchors remain unchanged.
  const innerPlanetLayouts = useMemo(() => fittedWheelMarkerLayouts(
    innerPositions, position => position.planet, position => zodiacLongitude(position),
    { radius: 123, center, minimumSpacing: 33, rowSpacing: 54, glyphSize: 22,
      annotationOffset: synastryPlanetDegreeOffset, angleForLongitude }
  ), [innerPositions, ascendantLongitude, isNatalWheel]);
  const outerPlanetLayouts = useMemo(() => fittedWheelMarkerLayouts(
    outerPositions, position => position.planet, position => zodiacLongitude(position),
    { radius: 220, center, minimumSpacing: 37.5, rowSpacing: 54,
      glyphSize: 26, annotationOffset: synastryPlanetDegreeOffset, angleForLongitude }
  ), [outerPositions, ascendantLongitude, isNatalWheel]);
  const houseLabelRadius = {
    outer: (radius.houseBandOuter + radius.houseBandMiddle) / 2,
    inner: (radius.houseBandMiddle + radius.houseBandInner) / 2
  };

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
  }), [ascendantLongitude, midheavenLongitude, isNatalWheel, radius.outer]);
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
  const interAspectRadius = radius.aspect;

  function renderPlanet(position: PlanetPosition, ring: "outer" | "inner") {
    const angle = angleForLongitude(zodiacLongitude(position));
    const layout = ring === "outer" ? outerPlanetLayouts.get(position.planet) : innerPlanetLayouts.get(position.planet);
    const baseRadius = ring === "outer" ? radius.outerPlanet : radius.innerPlanet;
    const truePoint = point(angle, baseRadius);
    const marker = layout?.marker ?? point(angle, baseRadius);
    const tickInner = ring === "outer"
      ? point(angle, radius.signInner - 6)
      : point(angle, radius.houseBandInner - 6);
    const tickOuter = ring === "outer"
      ? point(angle, radius.signInner)
      : point(angle, radius.houseBandInner);
    const degreeOffset = inwardMarkerOffset(center, marker, synastryPlanetDegreeOffset);
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
      <g className="synastry-inner-glyph-band" aria-hidden="true">
        {signs.map((sign, index) => (
          <path key={sign} d={annularSectorPath(angleForLongitude(index * 30), angleForLongitude(index * 30 + 30), radius.houseBandInner, radius.innerPlanetBandInner)} />
        ))}
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
          const inner = point(a, radius.innerPlanetBandInner);
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
                <circle className="aspect-endpoint" cx={a.x} cy={a.y} r={1.6} />
                <circle className="aspect-endpoint" cx={b.x} cy={b.y} r={1.6} />
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
      <g className="synastry-house-bands" aria-hidden="true">
        {(["outer", "inner"] as const).map(ring => (
          <g key={ring} className={`synastry-house-band synastry-house-band--${ring}`}>
            {signs.map((sign, index) => (
              <path
                key={sign}
                d={annularSectorPath(
                  angleForLongitude(index * 30), angleForLongitude(index * 30 + 30),
                  ring === "outer" ? radius.houseBandOuter : radius.houseBandMiddle,
                  ring === "outer" ? radius.houseBandMiddle : radius.houseBandInner
                )}
              />
            ))}
          </g>
        ))}
      </g>
      <g className="house-labels synastry-house-labels synastry-outer-house-labels" aria-label={ascendant ? "Outer chart whole sign houses" : "Outer chart natural house labels"}>
        {outerHouseLabels.map(({ house, x, y, ariaLabel }) => (
          <text
            key={house}
            x={x}
            y={y}
            className="zodiac-house-number zodiac-wheel__house-label synastry-house-number synastry-house-number--outer"
            aria-label={`Outer chart ${ariaLabel}`}
          >
            {house}
          </text>
        ))}
      </g>
      <g className="house-labels synastry-house-labels synastry-inner-house-labels" aria-label={innerAscendant ? "Inner chart whole sign houses" : "Inner chart natural house labels"}>
        {innerHouseLabels.map(({ house, x, y, ariaLabel }) => (
          <text
            key={house}
            x={x}
            y={y}
            className="zodiac-house-number zodiac-wheel__house-label synastry-house-number synastry-house-number--inner"
            aria-label={`Inner chart ${ariaLabel}`}
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
