import { Fragment, memo, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronRight, X } from "lucide-react";
import { angularSeparation } from "@tldr/astro-knowledge/sky-aspect-engine";
import { FloatingTooltipPortal } from "../FloatingTooltip";
import { CardReadMore } from "../CardReadMore";
import { pointGlyph, signGlyph } from "./chartAssets";
import { interactiveWheelRadii as radii, wheelFanLongitudes, wheelPointAt, wheelSector } from "./interactiveWheelGeometry";
import {
  traditionalRulers, wheelDegree, wheelOrdinal, wheelSigns, zodiacWheelFacts,
  type WheelAngle, type WheelAspect, type WheelPoint, type WheelSelection, type ZodiacWheelFacts, type ZodiacWheelSnapshot
} from "../../../../apps/web/src/services/zodiacWheelFacts";
import type { PronounChoice } from "../../../../apps/web/src/services/personReferences";
import { fillWheelTooltip, wheelTooltipHouseWording, type WheelTooltipTemplates } from "../../../../apps/web/src/content/wheelTooltipCopy";
import type { WheelTooltipName } from "../../../../apps/web/src/content/wheelTooltipCatalog";
import { useWheelTooltipTemplates } from "./useWheelTooltipTemplates";
import "../../../../apps/web/src/styles/interactive-zodiac-wheel.css";

type Props = {
  snapshot: ZodiacWheelSnapshot;
  mode?: "sky" | "natal";
  birthTimeUnknown?: boolean;
  ownerName?: string;
  pronouns?: PronounChoice;
  tooltipPreview?: { templates: WheelTooltipTemplates; house: number; source?: WheelTooltipName; disabled?: boolean;
    onHouseChange?: (house: number) => void; onSourcePick?: (source: WheelTooltipName, house: number) => void };
};

function sameSelection(first: WheelSelection | null, second: WheelSelection | null) {
  return first?.type === second?.type && (first?.type === "planet" && second?.type === "planet" ? first.name === second.name
    : first?.type === "house" && second?.type === "house" ? first.house === second.house
      : first?.type === "angle" && second?.type === "angle" ? first.key === second.key : !first && !second);
}
function glyph(name: string) { return `${name === "Lot of Fortune" ? "⊗" : pointGlyph(name)}\uFE0E`; }
function signSymbol(sign: string) { return `${signGlyph(sign)}\uFE0E`; }
function pointTitle(point: WheelPoint) { return `${point.name}${point.retrograde ? " Rx" : ""}`; }
function placement(point: WheelPoint) { return `${wheelDegree(point.degree)} ${point.sign}${point.house === null ? "" : ` · ${wheelOrdinal(point.house)}`}`; }
function aspectTitle(type: string) { return type.charAt(0).toUpperCase() + type.slice(1); }
function keyboardPick<T extends Element>(event: KeyboardEvent<T>, pick: () => void) {
  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); pick(); }
}

export const InteractiveZodiacWheel = memo(function InteractiveZodiacWheel({ snapshot, mode = "sky", birthTimeUnknown = false, ownerName, pronouns, tooltipPreview }: Props) {
  const facts = useMemo(() => zodiacWheelFacts(snapshot, mode, birthTimeUnknown), [snapshot, mode, birthTimeUnknown]);
  // A changed chart clears transient inspection. Natal chart identity does not
  // include the app's selected transit date.
  const identity = `${mode}:${ownerName ?? "you"}:${snapshot.generatedAt ?? ""}:${facts.ascendant}:${facts.angles.map(angle => `${angle.key}:${angle.longitude}`).join("|")}:${facts.planets.map(point => `${point.name}:${point.longitude}:${point.retrograde}`).join("|")}`;
  return <WheelInteraction key={identity} facts={facts} mode={mode} ownerName={ownerName} pronouns={pronouns} tooltipPreview={tooltipPreview} />;
});

function WheelInteraction({ facts, mode, ownerName, pronouns, tooltipPreview }: { facts: ZodiacWheelFacts; mode: "sky" | "natal"; ownerName?: string; pronouns?: PronounChoice; tooltipPreview?: Props["tooltipPreview"] }) {
  const publishedTemplates = useWheelTooltipTemplates(!tooltipPreview);
  const templates = tooltipPreview?.templates ?? publishedTemplates;
  const previewHouse = tooltipPreview?.house;
  const [selected, setSelected] = useState<WheelSelection | null>(() => previewHouse && facts.hasHouses ? { type: "house", house: previewHouse } : null);
  const [hovered, setHovered] = useState<{ target: WheelSelection; anchor: Element } | null>(null);
  const [lordOpen, setLordOpen] = useState(Boolean(previewHouse && facts.hasHouses));
  useEffect(() => {
    if (previewHouse && facts.hasHouses) { setSelected({ type: "house", house: previewHouse }); setLordOpen(true); }
  }, [previewHouse, facts.hasHouses, tooltipPreview?.source]);
  const rootRef = useRef<HTMLDivElement>(null);
  const touchFocusRef = useRef<Element | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const id = useId().replace(/:/g, "");
  const fan = useMemo(() => wheelFanLongitudes(facts.planets), [facts.planets]);
  const pointsByName = useMemo(() => new Map(facts.planets.map(point => [point.name, point])), [facts.planets]);
  const at = (longitude: number, radius: number) => wheelPointAt(longitude, radius, facts.ascendant);
  const selectedPoint = selected?.type === "planet" ? pointsByName.get(selected.name) : undefined;
  const selectedAngle = selected?.type === "angle" ? facts.angles.find(angle => angle.key === selected.key) : undefined;
  const house = selected?.type === "house" ? selected.house : null;
  const houseSignIndex = house === null ? null : facts.signOfHouse(house);
  const lord = mode === "natal" && houseSignIndex !== null ? pointsByName.get(traditionalRulers[houseSignIndex]) : undefined;
  const selectedAspects = selectedPoint ? facts.aspects.filter(aspect => aspect.from === selectedPoint.name || aspect.to === selectedPoint.name) : [];
  const litPlanets = new Set(selectedPoint ? [selectedPoint.name, ...selectedAspects.flatMap(aspect => [aspect.from, aspect.to])]
    : house !== null ? [...facts.planets.filter(point => point.house === house).map(point => point.name), ...(lord ? [lord.name] : [])]
      : selectedAngle ? facts.planets.filter(point => angularSeparation(point.longitude, selectedAngle.longitude) <= 8).map(point => point.name) : []);
  const litAngles = new Set(house !== null ? facts.angles.filter(angle => angle.house === house).map(angle => angle.key) : selectedAngle ? [selectedAngle.key] : []);
  const dim = (lit: boolean) => selected && !lit ? "true" : undefined;
  const pick = (target: WheelSelection) => {
    if (tooltipPreview?.disabled) return;
    if (target.type === "house" && tooltipPreview?.onHouseChange) {
      setSelected(target); setHovered(null); setLordOpen(true); clearTimeout(closeTimer.current);
      tooltipPreview.onHouseChange(target.house);
      return;
    }
    setSelected(current => sameSelection(current, target) ? null : target);
    setHovered(null); setLordOpen(false); clearTimeout(closeTimer.current);
  };
  const clear = () => { setSelected(null); setHovered(null); setLordOpen(false); };
  const keepLord = () => { clearTimeout(closeTimer.current); setHovered(null); setLordOpen(true); };
  const dropLord = () => { if (tooltipPreview) return; clearTimeout(closeTimer.current); closeTimer.current = setTimeout(() => setLordOpen(false), 160); };
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  useEffect(() => {
    if (!selected) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (lordOpen) setLordOpen(false);
      else clear();
    };
    const onOutside = (event: PointerEvent) => { if (event.target instanceof Node && !rootRef.current?.contains(event.target)) clear(); };
    window.addEventListener("keydown", onKey);
    if (!tooltipPreview) document.addEventListener("pointerdown", onOutside);
    return () => { window.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onOutside); };
  }, [selected, lordOpen, Boolean(tooltipPreview)]);

  const interaction = (target: WheelSelection, label: string) => ({
    role: "button", tabIndex: 0, "aria-label": label, "aria-pressed": sameSelection(selected, target),
    "aria-disabled": tooltipPreview?.disabled || undefined,
    "aria-describedby": hovered && sameSelection(hovered.target, target) ? `${id}-tip` : undefined,
    onPointerDown: (event: React.PointerEvent<SVGGElement>) => { touchFocusRef.current = event.pointerType === "touch" ? event.currentTarget : null; },
    onPointerCancel: () => { touchFocusRef.current = null; },
    onClick: (event: React.MouseEvent<SVGGElement>) => { event.stopPropagation(); pick(target); touchFocusRef.current = null; },
    onKeyDown: (event: KeyboardEvent<SVGGElement>) => keyboardPick(event, () => pick(target)),
    onPointerEnter: (event: React.PointerEvent<SVGGElement>) => {
      if (event.pointerType !== "mouse") return;
      const anchor = event.currentTarget;
      // Resizing can move another sector under the pointer while a glyph owns keyboard focus.
      setHovered(current => current && document.activeElement === current.anchor ? current : { target, anchor });
    },
    onPointerLeave: () => setHovered(current => current && document.activeElement === current.anchor ? current : null),
    onFocus: (event: React.FocusEvent<SVGGElement>) => {
      // Programmatic focus after opening a chart need not match :focus-visible.
      // A touch tap still selects details without opening a hover tooltip.
      if (touchFocusRef.current !== event.currentTarget || event.currentTarget.matches(":focus-visible")) setHovered({ target, anchor: event.currentTarget });
    },
    onBlur: () => { touchFocusRef.current = null; setHovered(null); }
  });
  const tip = hovered ? tooltipFacts(hovered.target, facts, mode, templates) : null;
  const connector = house !== null && lord && lord.house !== house ? (() => {
    const start = at(houseSignIndex! * 30 + 15, (radii.aspect + radii.house) / 2 - 14);
    const end = at(fan.get(lord.name)!, radii.planet - 22);
    return { start, end, middle: { x: start.x / 4 + 150 + end.x / 4, y: start.y / 4 + 150 + end.y / 4 } };
  })() : null;
  const lordCopy = house !== null && lord ? houseRulerCopy(house, lord, facts, templates, ownerName, pronouns) : null;
  const editPart = (source: WheelTooltipName, content: ReactNode) => tooltipPreview?.onSourcePick && house !== null
    ? <span role="button" tabIndex={0} className="interactive-wheel-copy-target" data-source={source} data-selected={tooltipPreview.source === source || undefined}
      onClick={() => tooltipPreview.onSourcePick!(source, house)}
      onKeyDown={event => keyboardPick(event, () => tooltipPreview.onSourcePick!(source, house))}>{content}</span>
    : content;

  return <div ref={rootRef} className="interactive-zodiac-wheel" data-mode={mode} data-has-houses={facts.hasHouses} data-selected-type={selected?.type}>
    <div className="interactive-zodiac-wheel__drawing">
      <svg className="interactive-zodiac-wheel__svg" viewBox="0 0 600 600" role="group" aria-label={mode === "sky" ? "Interactive sky chart" : ownerName ? `${ownerName} interactive natal chart` : "Your interactive natal chart"} onClick={clear}>
        <desc>Select a planet{facts.hasHouses ? ", house, or angle" : ""} to explore its chart details. Press Escape to clear the selection.</desc>
        <defs>{wheelSigns.map((sign, index) => {
          const angle = ((180 + index * 30 + 15 - (facts.ascendant ?? 0)) % 360 + 360) % 360;
          const lower = angle > 180, radius = (radii.outer + radii.sign) / 2 + (lower ? 7 : -7);
          const start = at(index * 30 + (lower ? 0.5 : 29.5), radius), end = at(index * 30 + (lower ? 29.5 : 0.5), radius);
          return <path key={sign} id={`${id}-sign-${index}`} d={`M${start.x} ${start.y} A${radius} ${radius} 0 0 ${lower ? 0 : 1} ${end.x} ${end.y}`} />;
        })}</defs>
        <circle className="interactive-wheel-paper" cx={300} cy={300} r={radii.outer} />
        {wheelSigns.map((sign, index) => {
          const n = facts.houseOf(index * 30);
          const target: WheelSelection | null = n === null ? null : { type: "house", house: n };
          const paths = <>
            <path className="interactive-wheel-sector__wedge" d={wheelSector(index * 30, radii.house, radii.sign, facts.ascendant)} />
            <path className="interactive-wheel-sector__band" d={wheelSector(index * 30, radii.aspect, radii.house, facts.ascendant)} />
            <path className="interactive-wheel-sector__sign" d={wheelSector(index * 30, radii.sign, radii.outer, facts.ascendant)} />
          </>;
          return target ? <g key={sign} className="interactive-wheel-sector" data-house={n} data-selected={house === n || undefined} data-dimmed={dim(house === n)}
            {...interaction(target, `${wheelOrdinal(n!)} house in ${sign}`)}>{paths}</g>
            : <g key={sign} className="interactive-wheel-sector" aria-hidden="true">{paths}</g>;
        })}
        <circle className="interactive-wheel-paper" cx={300} cy={300} r={radii.aspect} />
        <g className="interactive-wheel-labels" aria-hidden="true">{wheelSigns.map((sign, index) => {
          const n = facts.houseOf(index * 30), label = at(index * 30 + 15, (radii.aspect + radii.house) / 2);
          return <g key={sign} data-dimmed={dim(house === n)}>
            <text className="interactive-wheel-sign"><textPath href={`#${id}-sign-${index}`} startOffset="50%" textAnchor="middle">{sign.toUpperCase()}</textPath></text>
            {n !== null ? <text className="interactive-wheel-house" x={label.x} y={label.y}>{n}</text> : null}
          </g>;
        })}</g>
        <g className="interactive-wheel-aspects" aria-hidden="true">{facts.aspects.map(aspect => {
          const first = at(pointsByName.get(aspect.from)!.longitude, radii.aspect), second = at(pointsByName.get(aspect.to)!.longitude, radii.aspect);
          const active = selectedPoint && (aspect.from === selectedPoint.name || aspect.to === selectedPoint.name);
          const visible = selected ? active : aspect.close;
          if (!visible) return null;
          return <g key={`${aspect.from}-${aspect.to}`} data-aspect={aspect.type} data-close={aspect.close} data-active={active || undefined}>
            {active && aspect.close ? <line className="interactive-wheel-aspect-halo" x1={first.x} y1={first.y} x2={second.x} y2={second.y} /> : null}
            <line className="interactive-wheel-aspect-line" x1={first.x} y1={first.y} x2={second.x} y2={second.y} />
            <circle cx={first.x} cy={first.y} r={3.5} /><circle cx={second.x} cy={second.y} r={3.5} />
          </g>;
        })}</g>
        {connector && lordCopy ? <g className="interactive-wheel-lord-connector">
          <path d={`M${connector.start.x} ${connector.start.y} Q300 300 ${connector.end.x} ${connector.end.y}`} />
          <circle cx={connector.start.x} cy={connector.start.y} r={4.5} />
          <g className="interactive-wheel-lord-pill" role="button" tabIndex={0} aria-label="Explore house ruler" aria-expanded={lordOpen} aria-controls={`${id}-lord`}
            transform={`translate(${connector.middle.x} ${connector.middle.y})`}
            onPointerEnter={event => { if (event.pointerType === "mouse") keepLord(); }} onPointerLeave={dropLord}
            onFocus={keepLord} onBlur={dropLord} onClick={event => { event.stopPropagation(); keepLord(); }}
            onKeyDown={event => keyboardPick(event, keepLord)}>
            <rect x={-28} y={-18} width={56} height={36} rx={15} className="interactive-wheel-hit" />
            <rect x={-24} y={-11} width={48} height={22} rx={11} /><text>LORD</text>
          </g>
        </g> : null}
        {facts.angles.map(angle => {
          const first = at(angle.longitude, radii.aspect), second = at(angle.longitude, radii.sign - 16);
          return <line key={angle.key} className="interactive-wheel-axis" x1={first.x} y1={first.y} x2={second.x} y2={second.y} data-dimmed={dim(litAngles.has(angle.key))} />;
        })}
        {facts.planets.map(point => {
          const marker = at(fan.get(point.name)!, radii.planet), degree = at(fan.get(point.name)!, radii.planet - 38);
          const first = at(point.longitude, radii.sign - 12), second = at(point.longitude, radii.sign);
          const endpoint = at(point.longitude, radii.aspect), active = selectedPoint?.name === point.name;
          return <g key={point.name} className="interactive-wheel-planet" data-planet={point.name} data-dimmed={dim(litPlanets.has(point.name))}>
            {active ? <circle className="interactive-wheel-selection-ring" cx={endpoint.x} cy={endpoint.y} r={7} /> : null}
            <line className="interactive-wheel-tick" x1={first.x} y1={first.y} x2={second.x} y2={second.y} />
            <g className="interactive-wheel-planet-button" data-selected={active || undefined} transform={`translate(${marker.x} ${marker.y})`}
              {...interaction({ type: "planet", name: point.name }, `${pointTitle(point)} · ${placement(point)}`)}>
              <circle r={24} className="interactive-wheel-hit" />
              {active ? <circle r={18.5} className="interactive-wheel-selected-disc" /> : null}
              <text className="interactive-wheel-glyph" x={active && point.retrograde ? -4 : 0} y={1}>{glyph(point.name)}</text>
              {point.retrograde ? <text className="interactive-wheel-rx" x={active ? 4 : 13} y={active ? 11 : 16}>Rx</text> : null}
            </g>
            <text className="interactive-wheel-degree" x={degree.x} y={degree.y}>{Math.floor(point.degree)}°</text>
          </g>;
        })}
        {facts.angles.map(angle => {
          const position = at(angle.longitude, radii.sign);
          let rotation = 90 - (180 + angle.longitude - (facts.ascendant ?? 0));
          while (rotation > 90) rotation -= 180;
          while (rotation < -90) rotation += 180;
          return <g key={angle.key} className="interactive-wheel-angle" data-angle={angle.key} data-dimmed={dim(litAngles.has(angle.key))}
            transform={`translate(${position.x} ${position.y}) rotate(${rotation})`}
            {...interaction({ type: "angle", key: angle.key }, `${angle.name} · ${wheelDegree(angle.longitude % 30)} ${wheelSigns[Math.floor(angle.longitude / 30)]}`)}>
            <rect x={-40} y={-17} width={80} height={34} rx={17} /><text>{angle.key} {Math.floor(angle.longitude % 30)}°</text>
          </g>;
        })}
      </svg>
      {lordOpen && lordCopy ? <div className="interactive-wheel-lord-overlay" onClick={event => event.stopPropagation()}>
          <div id={`${id}-lord`} className="interactive-wheel-lord-tooltip" role="dialog" aria-label="House ruler" onPointerEnter={keepLord} onPointerLeave={dropLord}
            onFocus={keepLord} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) dropLord(); }}>
            <button type="button" className="interactive-wheel-lord-close" aria-label="Close house ruler details" onClick={() => setLordOpen(false)}><X aria-hidden="true" focusable="false" /></button>
            <strong>{editPart(lordCopy.titleSource, lordCopy.title)}</strong><p>{editPart(lordCopy.openingSource, lordCopy.first)} {lordCopy.afterOpening}</p>
          </div>
      </div> : null}
      <FloatingTooltipPortal anchor={hovered?.anchor ?? null} open={Boolean(tip) && !lordOpen} id={`${id}-tip`} className="interactive-wheel-tooltip"
        content={tip ? <><strong>{tip.title}</strong><span>{tip.line}</span></> : null} />
    </div>
    {facts.hasHouses ? <span className="interactive-zodiac-wheel__caption">HOUSES: WHOLE SIGN</span> : null}
    {selected ? <WheelDetail selected={selected} facts={facts} mode={mode} lord={lord} pick={pick} clear={clear}
      onLord={lordCopy ? () => { clearTimeout(closeTimer.current); setLordOpen(value => !value); } : undefined} lordOpen={Boolean(lordCopy) && lordOpen} lordId={`${id}-lord`} /> : null}
  </div>;
}

function tooltipFacts(target: WheelSelection, facts: ZodiacWheelFacts, mode: "sky" | "natal", templates: WheelTooltipTemplates) {
  const text = (name: WheelTooltipName, slots: Record<string, string | number> = {}) => fillWheelTooltip(templates(name), slots);
  const result = (title: string | null, line: string | null) => title === null || line === null ? null : { title, line };
  if (target.type === "planet") {
    const point = facts.planets.find(value => value.name === target.name)!;
    const aspects = facts.aspects.filter(value => value.close && (value.from === point.name || value.to === point.name));
    const summary = aspects.map(value => `${aspectTitle(value.type)} ${value.from === point.name ? value.to : value.from} ${wheelDegree(value.orb)}`).join(" · ");
    return result(text("hover/planet-title", { planet: pointTitle(point), degree: wheelDegree(point.degree), sign: point.sign, house: point.house === null ? "" : ` · ${wheelOrdinal(point.house)}` }),
      summary ? text("hover/aspects", { aspects: summary }) : text(point.kind === "point" ? "hover/point" : "hover/no-aspects"));
  }
  if (target.type === "house") {
    const index = facts.signOfHouse(target.house)!;
    const occupants = [...facts.planets.filter(point => point.house === target.house).map(point => point.name), ...facts.angles.filter(angle => angle.house === target.house).map(angle => angle.key)];
    return result(text(mode === "natal" ? "hover/natal-house-title" : "hover/sky-house-title", { houseOrdinal: wheelOrdinal(target.house), sign: wheelSigns[index], ruler: traditionalRulers[index] }),
      occupants.length ? text("hover/occupants", { occupants: occupants.join(", ") }) : text("hover/empty-house"));
  }
  const angle = facts.angles.find(value => value.key === target.key)!;
  return result(text("hover/angle-title", { angle: angle.name, degree: wheelDegree(angle.longitude % 30), sign: wheelSigns[Math.floor(angle.longitude / 30)] }),
    text("hover/angle-house", { houseOrdinal: wheelOrdinal(angle.house) }));
}

function WheelDetail({ selected, facts, mode, lord, pick, clear, onLord, lordOpen, lordId }: {
  selected: WheelSelection; facts: ZodiacWheelFacts; mode: "sky" | "natal"; lord?: WheelPoint;
  pick: (target: WheelSelection) => void; clear: () => void; onLord?: () => void; lordOpen: boolean; lordId: string;
}) {
  const point = selected.type === "planet" ? facts.planets.find(value => value.name === selected.name) : undefined;
  const angle = selected.type === "angle" ? facts.angles.find(value => value.key === selected.key) : undefined;
  const house = selected.type === "house" ? selected.house : null;
  const sign = point?.sign ?? (angle ? wheelSigns[Math.floor(angle.longitude / 30)] : wheelSigns[facts.signOfHouse(house!)!]);
  const occupants = house === null ? [] : facts.planets.filter(value => value.house === house);
  const angles = house === null ? [] : facts.angles.filter(value => value.house === house);
  const aspects = point ? facts.aspects.filter(value => value.from === point.name || value.to === point.name).sort((a, b) => a.orb - b.orb) : [];
  const title = point ? `${pointTitle(point)} in ${point.sign}` : angle ? `${angle.name} in ${sign}` : `${wheelOrdinal(house!)} house in ${sign}`;
  const line = point ? `${wheelDegree(point.degree)}${point.house === null ? "" : ` · ${wheelOrdinal(point.house)} house`}`
    : angle ? `${wheelDegree(angle.longitude % 30)} · ${wheelOrdinal(angle.house)} house`
      : lord ? `Lord: ${lord.name} in ${lord.sign} · ${wheelOrdinal(lord.house!)}${lord.conditions.filter(value => value.label === "Rx" || ["Domicile", "Exalted", "Detriment", "Fall"].includes(value.label)).map(value => ` · ${value.label}`).join("")}`
        : occupants.map(value => value.name).join(", ") || "Empty house";
  const group = (label: string, children: ReactNode, note?: string) => <div className="interactive-wheel-detail__group" key={label}>
    <div className="interactive-wheel-detail__group-label"><strong>{label}</strong>{note ? <span>{note}</span> : null}</div>{children}
  </div>;
  const aspectRow = (value: WheelAspect) => {
    const partner = facts.planets.find(candidate => candidate.name === (value.from === point!.name ? value.to : value.from))!;
    return <button key={partner.name} type="button" className="interactive-wheel-detail__row interactive-wheel-detail__aspect" data-aspect={value.type} data-close={value.close}
      aria-label={`${aspectTitle(value.type)} ${pointTitle(partner)} · ${placement(partner)} · ${wheelDegree(value.orb)} orb${!value.close ? " · Wide" : value.applying === undefined ? "" : value.applying ? " · Applying" : " · Separating"}`}
      onClick={() => pick({ type: "planet", name: partner.name })}>
      <svg className="interactive-wheel-detail__swatch" viewBox="0 0 38 8" aria-hidden="true" focusable="false"><line className="interactive-wheel-aspect-line" x1={2} y1={4} x2={36} y2={4} /></svg>
      <span className="interactive-wheel-detail__aspect-copy"><strong>{aspectTitle(value.type)}</strong>{" "}<span className="interactive-wheel-detail__partner">{pointTitle(partner)}</span></span>
      <span className="interactive-wheel-detail__orb">{wheelDegree(value.orb)} orb</span>
    </button>;
  };
  const pointRow = (value: WheelPoint) => <button type="button" key={value.name} className="interactive-wheel-detail__row" onClick={() => pick({ type: "planet", name: value.name })}>
    <span className="interactive-wheel-detail__symbol" aria-hidden="true">{glyph(value.name)}</span><span className="interactive-wheel-detail__row-copy"><strong>{pointTitle(value)}</strong><span>{placement(value)}</span></span>
  </button>;
  const angleRow = (value: WheelAngle) => <button type="button" key={value.key} className="interactive-wheel-detail__row" onClick={() => pick({ type: "angle", key: value.key })}>
    <span className="interactive-wheel-detail__symbol interactive-wheel-detail__symbol--angle" aria-hidden="true">{value.key}</span><span className="interactive-wheel-detail__row-copy"><strong>{value.name}</strong><span>{wheelDegree(value.longitude % 30)} {wheelSigns[Math.floor(value.longitude / 30)]}</span></span>
  </button>;
  const close = aspects.filter(value => value.close), wide = aspects.filter(value => !value.close);
  const nearAngle = angle ? facts.planets.filter(value => angularSeparation(value.longitude, angle.longitude) <= 8) : [];
  const placementHref = point && point.name !== "Lot of Fortune"
    ? `#sky/placement/${encodeURIComponent(point.name.toLowerCase().replaceAll(" ", "-"))}/${encodeURIComponent(point.sign.toLowerCase())}` : null;
  const header = <>
      {!point ? <span className="interactive-wheel-detail__icon interactive-wheel-detail__icon--label" aria-hidden="true">{angle?.key ?? house}
        <span className="interactive-wheel-detail__sign">{signSymbol(sign)}</span></span> : null}
      <span className="interactive-wheel-detail__heading"><strong>{title}</strong><span>{line}</span>
        {point?.conditions.length ? <span className="interactive-wheel-detail__conditions">{point.conditions.map(value => value.label).join(" · ")}</span> : null}
      </span>
      {placementHref ? <CardReadMore appearance="icon" className="interactive-wheel-detail__open" />
        : <button type="button" className="interactive-wheel-detail__clear" aria-label="Clear chart selection" onClick={clear}><X aria-hidden="true" focusable="false" /></button>}
  </>;
  return <section className={`interactive-wheel-detail${point ? " interactive-wheel-detail--planet" : ""}`} aria-label="Selected chart details">
    {placementHref ? <a className="interactive-wheel-detail__header interactive-wheel-detail__header--link" href={placementHref} aria-label={`Read about ${point!.name} in ${point!.sign}`}>{header}</a>
      : <div className="interactive-wheel-detail__header">{header}</div>}
    {mode === "natal" && lord && onLord ? <button type="button" className="interactive-wheel-detail__lord-button" onClick={onLord} aria-expanded={lordOpen} aria-controls={lordId}>House ruler details <ChevronRight aria-hidden="true" focusable="false" /></button> : null}
    {point ? <>
      {close.length ? group("Aspects", close.map(aspectRow)) : null}
      {wide.length ? group("By sign", wide.map(aspectRow)) : null}
      {!aspects.length ? <p className="interactive-wheel-detail__empty">{point.name === "Lot of Fortune" ? "The Lot of Fortune is a calculated point, so it doesn't form aspects." : point.kind === "point" ? "Point" : "No aspects by sign"}</p> : null}
    </> : null}
    {house !== null ? <>
      {occupants.some(value => value.kind === "planet") ? group("Occupants", occupants.filter(value => value.kind === "planet").map(pointRow)) : null}
      {angles.length ? group("Angles", angles.map(angleRow)) : null}
      {occupants.some(value => value.kind === "point") ? group("Points", occupants.filter(value => value.kind === "point").map(pointRow)) : null}
      {!occupants.length && !angles.length ? <p className="interactive-wheel-detail__empty">No occupants</p> : null}
    </> : null}
    {angle && nearAngle.length ? group("Conjunctions", nearAngle.map(value => <button type="button" key={value.name} className="interactive-wheel-detail__row" onClick={() => pick({ type: "planet", name: value.name })}>
      <span className="interactive-wheel-detail__symbol" aria-hidden="true">{glyph(value.name)}</span><span className="interactive-wheel-detail__row-copy"><strong>{pointTitle(value)}</strong><span>{placement(value)}</span></span><span>{wheelDegree(angularSeparation(value.longitude, angle.longitude))}</span>
    </button>)) : null}
  </section>;
}

function houseRulerCopy(house: number, lord: WheelPoint, facts: ZodiacWheelFacts, templates: WheelTooltipTemplates, ownerName?: string, pronouns?: PronounChoice) {
  const signIndex = facts.signOfHouse(house)!, sign = wheelSigns[signIndex], own = lord.house === house;
  const name = ownerName?.trim().split(/\s+/u)[0];
  const article = (capitalize = false) => lord.name === "Sun" || lord.name === "Moon" ? `${capitalize ? "The" : "the"} ${lord.name}` : lord.name;
  let unavailable = false;
  const plain = (name: WheelTooltipName, slots: Record<string, string | number> = {}) => {
    const value = fillWheelTooltip(templates(name), slots);
    if (value === null) unavailable = true;
    return value ?? "";
  };
  const owner = (title = false) => name ? plain("variables/owner-friend", { ownerName: name }) : plain(title ? "variables/owner-you-title" : "variables/owner-you-body");
  const possessive = () => plain(!name ? "variables/possessive-you" : pronouns === "she" ? "variables/possessive-she" : pronouns === "he" ? "variables/possessive-he" : pronouns === "they" ? "variables/possessive-they" : "variables/possessive-unspecified");
  const ordinal = (value: number, ruler = false) => {
    const result = wheelTooltipHouseWording(templates, value, wheelOrdinal(value), ruler);
    if (result === null) unavailable = true;
    return result ?? "";
  };
  const render = (name: WheelTooltipName, slots: Record<string, ReactNode> = {}) => {
    const template = templates(name);
    if (template === null) { unavailable = true; return null; }
    return template.split(/(\{\{\w+\}\})/u).map((part, index) => {
      const slot = /^\{\{(\w+)\}\}$/u.exec(part)?.[1];
      if (slot && !Object.hasOwn(slots, slot)) unavailable = true;
      return <Fragment key={index}>{slot ? slots[slot] : part}</Fragment>;
    });
  };
  const link = (term: "own-sign" | "other-sign" | "exalted" | "detriment" | "fall" | "detriment-fall") => <a href="/learn">{plain(`terms/${term}`)}</a>;
  const conditions = new Set(lord.conditions.map(value => value.label));
  const titleSource: WheelTooltipName = own ? "ruler/title-own" : "ruler/title";
  const openingSource: WheelTooltipName = house === 1 ? "ruler/rising" : "ruler/house";
  const title = plain(titleSource, { ownerPossessive: owner(true), houseOrdinal: ordinal(house),
    ...(!own ? { possessive: possessive(), rulerHouseOrdinal: ordinal(lord.house!, true) } : {}) });
  const first = render(openingSource, { sign, ownerPossessive: owner(), ruler: article(), houseOrdinal: ordinal(house),
    ...(house === 1 ? { possessive: name && !["she", "he", "they"].includes(pronouns ?? "") ? owner() : possessive() } : {}) });
  const exaltation = () => conditions.has("Exalted") ? render("dignity/and-exalted", { exalted: link("exalted") }) : "";
  let dignity: ReactNode = null;
  if (!own) {
    if (conditions.has("Domicile")) dignity = render("dignity/domicile", { ownSign: link("other-sign"), exaltation: exaltation() });
    else if (conditions.has("Detriment") && conditions.has("Fall")) dignity = render("dignity/detriment-fall", { dignity: link("detriment-fall") });
    else if (conditions.has("Exalted")) dignity = render("dignity/exalted", { exalted: link("exalted") });
    else if (conditions.has("Detriment")) dignity = render("dignity/detriment", { dignity: link("detriment") });
    else if (conditions.has("Fall")) dignity = render("dignity/fall", { dignity: link("fall") });
  }
  const otherSign = traditionalRulers.findIndex((ruler, index) => ruler === lord.name && index !== signIndex);
  const otherHouse = otherSign < 0 ? null : facts.houseOf(otherSign * 30);
  const second = render(own ? "ruler/placement-own" : "ruler/placement", { ruler: article(true), motion: lord.retrograde ? `${plain("terms/retrograde")} ` : "", sign: lord.sign,
    ...(!own ? { houseOrdinal: ordinal(lord.house!, true) } : {}), dignity, ownSign: own ? link("own-sign") : "", exaltation: own ? exaltation() : "" });
  const other = otherHouse !== null && otherHouse !== lord.house ? render("ruler/also-rules", { ruler: article(true), houseOrdinal: ordinal(otherHouse) }) : null;
  return unavailable ? null : { title, titleSource, openingSource, first, afterOpening: <>{second}{other ? <> {other}</> : null}</> };
}
