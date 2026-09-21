import { PLANET_GLYPHS, SIGN_GLYPHS, aspectGlyph, normalizeGlyphKey } from "../../components/charts/chartAssets";
import type { LunarCalendarEvent } from "../../services/ephemeris";
import { AstroGlyph } from "./AstroGlyph";
import { calendarKindClass, calendarKindFromEvent, calendarKindLabel, type CalendarEventKind } from "./calendarKinds";

export function eventGlyphText(event: LunarCalendarEvent) {
  if (event.type === "lunation") {
    if (/new moon/i.test(event.title)) return "🌑";
    if (/full moon/i.test(event.title)) return "🌕";
    if (/first quarter/i.test(event.title)) return "◐";
    if (/last quarter/i.test(event.title)) return "◑";
  }
  if (event.eclipseType === "solar") return "◉";
  if (event.eclipseType === "lunar") return "◍";
  const planet = event.planet ? PLANET_GLYPHS[normalizeGlyphKey(event.planet)] : "";
  const fromPlanet = event.planets?.[0] ? PLANET_GLYPHS[normalizeGlyphKey(event.planets[0])] : planet;
  const toPlanet = event.planets?.[1] ? PLANET_GLYPHS[normalizeGlyphKey(event.planets[1])] : "";
  const sign = SIGN_GLYPHS[normalizeGlyphKey(event.toSign ?? event.sign ?? "")];
  if (event.type === "aspect" && event.aspect) {
    return `${fromPlanet}${aspectGlyph(event.aspect)}${toPlanet}`;
  }
  if (event.type === "ingress") {
    return `${planet}→${sign}`;
  }
  if (event.type === "station") {
    return `${planet}${event.direction === "direct" ? "D" : "Rx"}`;
  }
  return planet || sign || event.glyph;
}

export function monthChipGlyph(event: LunarCalendarEvent) {
  if (calendarKindFromEvent(event) === "key") return "⭐";
  if (event.type === "lunation") {
    return SIGN_GLYPHS[normalizeGlyphKey(event.sign ?? event.toSign ?? "")] || eventGlyphText(event);
  }
  if (event.type === "station") {
    return event.planet ? PLANET_GLYPHS[normalizeGlyphKey(event.planet)] : event.glyph;
  }
  return eventGlyphText(event);
}

export function monthChipText(event: LunarCalendarEvent) {
  if (event.type === "lunation") {
    if (/new moon/i.test(event.title)) return "New";
    if (/full moon/i.test(event.title)) return "Full";
    if (/first quarter/i.test(event.title)) return "First Quarter";
    if (/last quarter/i.test(event.title)) return "Last Quarter";
    return event.title.replace(/\s+Moon.*$/i, "");
  }
  if (event.type === "station") {
    const planet = event.planet ?? event.title.split(" ")[0] ?? "";
    return `${planet} ${event.direction === "direct" ? "direct" : "Rx"}`.trim();
  }
  if (event.type === "ingress") {
    return event.toSign ?? event.sign ?? "";
  }
  return "";
}

export function CalendarMonthChip({ event }: { event: LunarCalendarEvent }) {
  const kind = calendarKindFromEvent(event);
  const text = monthChipText(event);

  return (
    <span className={`calendar-month-chip ${calendarKindClass(kind)}`} title={event.title}>
      <AstroGlyph text={monthChipGlyph(event)} />
      {text ? <span className="calendar-month-chip__text">{text}</span> : null}
    </span>
  );
}

export function CalendarKindTag({
  kind,
  event,
  glyph
}: {
  kind: CalendarEventKind;
  event?: LunarCalendarEvent;
  glyph?: string;
}) {
  const text = glyph ?? (kind === "void" ? "VOC" : event ? eventGlyphText(event) : "");
  const moonEmoji = text === "🌑" || text === "🌕";

  return (
    <span className={`${calendarKindClass(kind)}${moonEmoji ? " calendar-kind--bare" : ""}`}>
      {text ? <AstroGlyph text={text} size="14" /> : null}
    </span>
  );
}

export function CalendarKindLabel({ kind, event }: { kind: CalendarEventKind; event?: LunarCalendarEvent }) {
  return <span className="eyebrow calendar-kind-label">{calendarKindLabel(kind, event)}</span>;
}

export { calendarKindFromEvent };
