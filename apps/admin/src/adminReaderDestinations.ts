export type ReaderDestinationMode = "exact-context" | "context-required" | "not-reader";

export type ReaderDestinationPolicy = {
  mode: ReaderDestinationMode;
  reason: string;
};

/**
 * Reader destination policy for every surface tracked by the Composition Map.
 *
 * `exact-context` means Content Studio can build a meaningful reader URL once
 * the current record supplies its identity. `context-required` means a generic
 * link would lose the person/date/chart/event needed to understand the copy, so
 * the UI must not fall back to an app landing page. `not-reader` is internal.
 */
export const readerDestinationPolicyBySurface: Record<string, ReaderDestinationPolicy> = {
  "friends-compatibility-planet-cards": {
    mode: "context-required",
    reason: "Requires the selected friend and comparison chart; a generic Friends link would lose the edited card context."
  },
  "friends-compatibility-exact-dynamics": {
    mode: "context-required",
    reason: "Requires the selected friend and exact synastry contact."
  },
  "friends-synastry-contact": {
    mode: "context-required",
    reason: "Requires the selected friend and exact synastry contact."
  },
  "friends-house-overlays": {
    mode: "context-required",
    reason: "Requires the selected friend, overlay body, and calculated house."
  },
  "friends-composite": {
    mode: "context-required",
    reason: "Requires the selected relationship chart and exact composite placement or aspect."
  },
  "friends-pair-daily": {
    mode: "context-required",
    reason: "Requires the selected friend and that pair's calculated daily drivers."
  },
  "natal-placement-detail": {
    mode: "exact-context",
    reason: "Planet, sign, and house identify an exact natal placement reader route."
  },
  "natal-aspect-detail": {
    mode: "context-required",
    reason: "Natal aspect detail is reached through a specific chart/placement context rather than a safe generic landing route."
  },
  "natal-aspect-patterns": {
    mode: "context-required",
    reason: "Pattern and Active Now copy require the reader's calculated natal pattern and, for activation copy, the current trigger."
  },
  "sky-placement-detail": {
    mode: "exact-context",
    reason: "Planet and sign identify an exact current-sky placement route."
  },
  "sky-aspect-detail": {
    mode: "exact-context",
    reason: "The two bodies and aspect identify an exact current-sky aspect route."
  },
  "sky-retrograde-summary": {
    mode: "context-required",
    reason: "The summary depends on the selected date's calculated retrograde set; a generic Sky link would not preserve that context."
  },
  "personal-transit-detail": {
    mode: "context-required",
    reason: "Requires a specific reader chart, transit, natal point, houses, and timing window."
  },
  "sky-daily-timing": {
    mode: "context-required",
    reason: "Requires the active date and reader timing context."
  },
  "daily-at-a-glance": {
    mode: "context-required",
    reason: "Requires a specific reader or friend chart and the calculated civil-day driver."
  },
  "sky-calendar-event-cards": {
    mode: "context-required",
    reason: "Requires the exact calendar event and date; a calendar landing page is not enough context."
  },
  "sky-lunar-day-editorial": {
    mode: "context-required",
    reason: "Requires the exact lunar date/day detail being edited."
  },
  "sky-calendar-day-cards": {
    mode: "context-required",
    reason: "Requires the exact calendar date and calculated Moon/phase facts."
  },
  "sky-horoscopes": {
    mode: "context-required",
    reason: "Requires the reader chart and the exact daily or weekly period."
  },
  "chart-placement-row-microcopy": {
    mode: "context-required",
    reason: "Requires the exact chart placement row whose microcopy is being inspected."
  },
  "natal-empty-house": {
    mode: "context-required",
    reason: "Requires the exact natal chart, house, sign, and ruler placement."
  },
  "personal-transit-house": {
    mode: "context-required",
    reason: "Requires the reader chart and exact transit house calculation."
  },
  "generated-reports": {
    mode: "exact-context",
    reason: "The report id identifies the exact delivered report route."
  },
  "surface-specs-builders": {
    mode: "not-reader",
    reason: "This is an internal composition system and has no reader destination."
  }
};

function routeSlug(value: string | number) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/gu, "-")
    .replace(/[^a-z0-9-]/gu, "")
    .replace(/-+/gu, "-")
    .replace(/^-|-$/gu, "");
}

function requiredSlug(value: string | number, label: string) {
  const slug = routeSlug(value);
  if (!slug) throw new Error(`Reader destination requires ${label}.`);
  return slug;
}

export function natalPlacementReaderHref(planet: string, sign: string, house: string | number) {
  const houseSlug = requiredSlug(house, "house").replace(/h$/u, "");
  return `/#/you/placement/${requiredSlug(planet, "planet")}-${requiredSlug(sign, "sign")}-${houseSlug}h`;
}

export function skyPlacementReaderHref(planet: string, sign: string) {
  return `/#/sky/placement/${requiredSlug(planet, "planet")}/${requiredSlug(sign, "sign")}`;
}

export function skyAspectReaderHref(firstBody: string, aspect: string, secondBody: string) {
  return `/#/sky/aspect/${requiredSlug(firstBody, "first body")}/${requiredSlug(aspect, "aspect")}/${requiredSlug(secondBody, "second body")}`;
}

export function reportReaderHref(reportId: string) {
  const normalized = reportId.trim();
  if (!normalized) throw new Error("Reader destination requires report id.");
  return `/reports/${encodeURIComponent(normalized)}`;
}

/**
 * A Content Studio "View in app" destination must identify a record/detail,
 * not merely a product area. Generic app roots intentionally fail this test.
 */
export function isContextualReaderHref(href: string | null) {
  if (!href) return false;
  const normalized = href.startsWith("#/") ? `/${href}` : href;
  return (
    /^\/#\/you\/placement\/[^/?#]+$/u.test(normalized)
    || /^\/#\/sky\/placement\/[^/?#]+\/[^/?#]+$/u.test(normalized)
    || /^\/#\/sky\/aspect\/[^/?#]+\/[^/?#]+\/[^/?#]+$/u.test(normalized)
    || /^\/reports\/[^/?#]+$/u.test(normalized)
  );
}

export function openContextualReaderHref(href: string) {
  if (!isContextualReaderHref(href)) {
    throw new Error(`Refusing to open a contextless reader destination: ${href || "(empty)"}`);
  }
  return window.open(href, "_blank", "noopener,noreferrer");
}
