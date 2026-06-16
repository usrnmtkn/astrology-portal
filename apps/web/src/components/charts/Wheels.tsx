import type { CSSProperties } from "react";
import { memo, useId, useMemo, useRef, useState } from "react";
import type { PlanetPosition, SkySnapshot } from "../../types";
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
const planetHitAreaRadius = 16;
const angleIconSize = 34;
const signIconSize = 27;
const longSignIconSize = 29;

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
  return `${position.planet}${position.motion === "retrograde" ? " Rx" : ""} in ${position.sign}`;
}

function formatPlanetPlacementLine(position: PlanetPosition) {
  return `${formatPlanetPlacementTitle(position)} ${formatPlanetDegree(position)}`;
}

function wheelPlanetIconFile(position: PlanetPosition) {
  if (position.motion === "retrograde") {
    return wheelPlanetRetrogradeIconFiles[position.planet] ?? wheelPlanetIconFiles[position.planet];
  }

  return wheelPlanetIconFiles[position.planet];
}

function WheelPlanetGlyph({ position }: { position: PlanetPosition }) {
  const iconHref = zodiacAssetHref(wheelPlanetIconFile(position));
  const iconSize = position.planet === "Sun" ? sunIconSize : planetIconSize;

  if (iconHref) {
    return (
      <image
        href={iconHref}
        x={-iconSize / 2}
        y={-iconSize / 2 - 4}
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
      <g className="planet-glyph planet-glyph-sun-symbol wheel-placement__glyph" transform="translate(0 -4) scale(0.64)" aria-hidden="true">
        <path transform="translate(-25 -25)" d="m7,25a18,18 0 1,1 0,.1zm3,0a15,15 0 1,0 0-.1zm11,0a4,4 0 1,0 0-.1z" />
      </g>
    );
  }

  return (
    <text x={0} y={-4} className="planet-glyph wheel-placement__glyph">
      {position.glyph}
    </text>
  );
}

type SkyWheelProps = {
  positions: PlanetPosition[];
  aspects: SkySnapshot["aspects"];
  ascendant?: string;
  ascendantLongitude?: number;
  midheavenLongitude?: number;
  showHouses?: boolean;
  houseSignLabelStyle?: HouseSignLabelStyle;
  variant?: Exclude<WheelVariant, "synastry">;
};

export const SkyWheel = memo(function SkyWheel({
  positions,
  aspects,
  ascendant,
  ascendantLongitude,
  midheavenLongitude,
  showHouses = false,
  houseSignLabelStyle = "text",
  variant = "zodiac"
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
    radius: radius.outer + angleLabelOuterPadding
  }), [ascendantLongitude, midheavenLongitude, isAscendantAnchored]);
  const [activeTooltipPlanet, setActiveTooltipPlanet] = useState<string | null>(null);
  const planetMarkerRefs = useRef(new Map<string, SVGGElement>());
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
      maxClusterSpan: 24
    }
  ), [positions, ascendantLongitude, isAscendantAnchored]);

  return (
    <>
      <svg className={`sky-wheel sky-wheel-${variant}`} viewBox={wheelViewBox} role="img" aria-label="Planet positions">
        <defs>
          <clipPath id={wheelClipId}>
            <circle cx={center} cy={center} r={radius.outer} />
          </clipPath>
          {signLabels.map(({ sign, path }) => (
            <path key={`${sign}-label-path`} id={`${signLabelPathPrefix}-${sign}`} d={path} />
          ))}
        </defs>
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
          {aspectPairs.map(({ from, to, type, className, lineStyle }) => {
            const a = point(planetAngle(from), radius.aspect);
            const b = point(planetAngle(to), radius.aspect);

            return (
              <g key={`${from.planet}-${to.planet}`} className={`${className} ${normalizeAspectType(type)}`} style={lineStyle}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
              </g>
            );
          })}
        </g>
        {hasAscendantAxis && (
          <g className="natal-angle-lines" aria-label="Chart angle axes">
            {(() => {
              if (typeof ascendantLongitude !== "number") {
                return null;
              }

              const ascAngle = angleForLongitude(ascendantLongitude);
              const dscAngle = angleForLongitude(ascendantLongitude + 180);
              const asc = point(ascAngle, radius.outer + angleAxisOuterPadding);
              const dsc = point(dscAngle, radius.outer + angleAxisOuterPadding);
              const midheavenAxis = typeof midheavenLongitude === "number"
                ? (() => {
                    const mcAngle = angleForLongitude(midheavenLongitude);
                    const icAngle = angleForLongitude(midheavenLongitude + 180);
                    const mc = point(mcAngle, radius.outer + angleAxisOuterPadding);
                    const ic = point(icAngle, radius.outer + angleAxisOuterPadding);

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
        <g className="planet-labels">
          {positions.map((position) => {
            const layout = planetLayouts.get(position.planet);
            const marker = layout?.marker ?? point(planetAngle(position), radius.planet);
            const tickAngle = planetAngle(position);
            const tickOuter = point(tickAngle, radius.signInner - 5);
            const tickInner = point(tickAngle, radius.signInner - 17);
            const degreeOffset = inwardMarkerOffset(center, marker, planetDegreeOffset);
            const tooltipLines = tooltipDetailsByPlanet.get(position.planet)?.lines ?? [];

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
                className="planet-marker"
                tabIndex={0}
                role="img"
                aria-label={tooltipLines.join(". ")}
                onBlur={() => setActiveTooltipPlanet((current) => (current === position.planet ? null : current))}
                onFocus={() => setActiveTooltipPlanet(position.planet)}
                onPointerEnter={() => setActiveTooltipPlanet(position.planet)}
                onPointerLeave={() => setActiveTooltipPlanet((current) => (current === position.planet ? null : current))}
              >
                <line x1={tickInner.x} y1={tickInner.y} x2={tickOuter.x} y2={tickOuter.y} className="planet-tick wheel-placement__tick" />
                <g className="planet-label-group wheel-placement" transform={`translate(${marker.x.toFixed(2)} ${marker.y.toFixed(2)})`}>
                  <circle cx={0} cy={0} r={planetHitAreaRadius} className="planet-hit-area" />
                  <WheelPlanetGlyph position={position} />
                  <text x={degreeOffset.x.toFixed(2)} y={degreeOffset.y.toFixed(2)} className="planet-degree wheel-placement__degree">
                    {formatWheelDegree(position)}
                  </text>
                </g>
              </g>
            );
          })}
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
      </svg>
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
  houseSignLabelStyle?: HouseSignLabelStyle;
};

export const SynastryWheel = memo(function SynastryWheel({
  outerPositions,
  innerPositions,
  interAspects,
  ascendant,
  ascendantLongitude,
  midheavenLongitude,
  houseSignLabelStyle = "text"
}: SynastryWheelProps) {
  const center = 300;
  const radius = {
    outer: 284,
    signInner: 240,
    outerPlanet: 212,
    innerRingOuter: 178,
    innerRingInner: 116,
    innerPlanet: 150,
    aspect: 92,
    house: 240 * chartHouseLabelRadiusFactor,
    inner: 44
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
  const houseLabels = useMemo(() => chartHouseLabelGeometry({
    ascendant,
    ascendantLongitude,
    angleForLongitude,
    center,
    radius: radius.house,
    signs
  }), [ascendant, ascendantLongitude, isNatalWheel]);
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
  const interAspectRadius = radius.aspect + 12;
  const outerPlanetLayouts = useMemo(() => wheelMarkerLayouts(
    outerPositions,
    (position) => position.planet,
    (position) => angleForLongitude(zodiacLongitude(position)),
    { baseRadius: radius.outerPlanet, center, clusterThreshold: 6, maxClusterSpan: 22 }
  ), [outerPositions, ascendantLongitude, isNatalWheel]);
  const innerPlanetLayouts = useMemo(() => wheelMarkerLayouts(
    innerPositions,
    (position) => position.planet,
    (position) => angleForLongitude(zodiacLongitude(position)),
    { baseRadius: radius.innerPlanet, center, clusterThreshold: 6, maxClusterSpan: 22 }
  ), [innerPositions, ascendantLongitude, isNatalWheel]);

  function renderPlanet(position: PlanetPosition, ring: "outer" | "inner") {
    const angle = angleForLongitude(zodiacLongitude(position));
    const layout = ring === "outer" ? outerPlanetLayouts.get(position.planet) : innerPlanetLayouts.get(position.planet);
    const marker = layout?.marker ?? point(angle, ring === "outer" ? radius.outerPlanet : radius.innerPlanet);
    const tickOuterRadius = ring === "outer" ? radius.signInner - 5 : radius.innerRingOuter - 5;
    const tickInnerRadius = ring === "outer" ? radius.signInner - 17 : radius.innerRingOuter - 17;
    const tickOuter = point(angle, tickOuterRadius);
    const tickInner = point(angle, tickInnerRadius);
    const degreeOffset = inwardMarkerOffset(center, marker, planetDegreeOffset);

    return (
      <g
        key={`${ring}-${position.planet}`}
        className={`planet-marker ${ring === "inner" ? "planet-marker-inner" : "planet-marker-outer"}`}
        role="img"
        aria-label={`${ring === "outer" ? "Outer" : "Inner"} chart ${formatPlanetPlacementLine(position)}`}
      >
        <line x1={tickInner.x} y1={tickInner.y} x2={tickOuter.x} y2={tickOuter.y} className="planet-tick wheel-placement__tick" />
        <g className="planet-label-group wheel-placement" transform={`translate(${marker.x.toFixed(2)} ${marker.y.toFixed(2)})`}>
          <circle cx={0} cy={0} r={ring === "outer" ? planetHitAreaRadius : planetHitAreaRadius - 1} className="planet-hit-area" />
          <WheelPlanetGlyph position={position} />
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
      <g className="synastry-chart-rings" aria-hidden="true">
        <circle cx={center} cy={center} r={radius.innerRingOuter} />
        <circle cx={center} cy={center} r={radius.innerRingInner} />
        {signs.map((sign, index) => {
          const a = angleForLongitude((isNatalWheel ? wholeHouseStartLongitude : 0) + index * 30);
          const outer = point(a, radius.innerRingOuter);
          const inner = point(a, radius.innerRingInner);

          return <line key={`inner-ring-${sign}`} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} />;
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
      <g className="house-labels" aria-label={ascendant ? "Whole sign houses" : "Natural house labels"}>
        {houseLabels.map(({ house, x, y, ariaLabel }) => (
          <text key={house} x={x} y={y} className="zodiac-house-number zodiac-wheel__house-label" aria-label={ariaLabel}>
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
      <g className="planet-labels synastry-outer-planet-labels" aria-label="Outer chart planets">
        {outerPositions.map((position) => renderPlanet(position, "outer"))}
      </g>
      <g className="planet-labels inner-planet-labels" aria-label="Inner chart planets">
        {innerPositions.map((position) => renderPlanet(position, "inner"))}
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
    </svg>
  );
});
