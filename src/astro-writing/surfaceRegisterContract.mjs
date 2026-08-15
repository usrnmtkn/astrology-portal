const SURFACE_RULES = Object.freeze({
  "sky-placement-page": Object.freeze({
    route: "sky",
    renderers: Object.freeze(["renderSkyPlacement"]),
    temporalities: Object.freeze(["current_sky"]),
    voiceModes: Object.freeze(["current_sky_direct_address"]),
    registers: Object.freeze(["collective", "second_person"])
  }),
  calendar: Object.freeze({
    route: "calendar",
    renderers: Object.freeze([
      "renderSkyAspectCard",
      "renderCalendarPhase",
      "renderSkyPlacement",
      "renderVoidOfCourse",
      "renderSeasonMarker",
      "renderWeeklyMoon",
      "renderLunationEventCard"
    ]),
    temporalities: Object.freeze(["current_sky"]),
    voiceModes: Object.freeze(["collective"]),
    registers: Object.freeze(["collective"])
  }),
  "you-natal": Object.freeze({
    route: "you",
    renderers: Object.freeze(["renderNatalPlacement", "renderNatalAspect", "renderAspectPattern"]),
    temporalities: Object.freeze(["natal"]),
    voiceModes: Object.freeze(["second_person"]),
    registers: Object.freeze(["second_person"])
  }),
  "you-transit": Object.freeze({
    route: "you",
    renderers: Object.freeze(["renderTransitAspect", "renderTransitHouse", "renderTransitReturn"]),
    temporalities: Object.freeze(["personal_transit"]),
    voiceModes: Object.freeze(["second_person"]),
    registers: Object.freeze(["second_person"])
  }),
  "friends-natal": Object.freeze({
    route: "friends",
    renderers: Object.freeze(["renderNatalPlacement", "renderNatalAspect", "renderAspectPattern"]),
    temporalities: Object.freeze(["natal"]),
    voiceModes: Object.freeze(["friend"]),
    registers: Object.freeze(["friend"])
  }),
  "friends-transit": Object.freeze({
    route: "friends",
    renderers: Object.freeze(["renderTransitAspect", "renderTransitHouse", "renderTransitReturn"]),
    temporalities: Object.freeze(["personal_transit"]),
    voiceModes: Object.freeze(["friend"]),
    registers: Object.freeze(["friend"])
  }),
  "friends-relationship": Object.freeze({
    route: "friends",
    renderers: Object.freeze(["renderSynastryAspect", "renderPairDaily", "renderCompat", "renderBondTransit"]),
    temporalities: Object.freeze(["relationship"]),
    voiceModes: Object.freeze(["relationship"]),
    registers: Object.freeze(["relationship"])
  })
});

const REQUIRED_TARGET_FIELDS = Object.freeze([
  "surface",
  "route",
  "renderer",
  "contentKeyFamily",
  "temporality",
  "voiceMode"
]);

export class SurfaceRegisterContractError extends Error {
  constructor(detail) {
    super(`SURFACE_REGISTER_GAP:${detail}`);
    this.name = "SurfaceRegisterContractError";
    this.code = "SURFACE_REGISTER_GAP";
    this.detail = detail;
  }
}

function requireText(target, field) {
  const value = target?.[field];
  if (typeof value !== "string" || !value.trim()) {
    throw new SurfaceRegisterContractError(`missing_${field}`);
  }
  return value.trim();
}

function requireAllowed(field, value, allowed) {
  if (!allowed.includes(value)) {
    throw new SurfaceRegisterContractError(`${field}_mismatch:${value}`);
  }
}

export function assertSurfaceRegisterContract(target, { surface, register } = {}) {
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    throw new SurfaceRegisterContractError("unresolved_target");
  }

  const normalized = Object.fromEntries(REQUIRED_TARGET_FIELDS.map((field) => [field, requireText(target, field)]));
  const rule = SURFACE_RULES[normalized.surface];
  if (!rule) throw new SurfaceRegisterContractError(`unknown_surface:${normalized.surface}`);

  requireAllowed("route", normalized.route, [rule.route]);
  requireAllowed("renderer", normalized.renderer, rule.renderers);
  requireAllowed("temporality", normalized.temporality, rule.temporalities);
  requireAllowed("voice_mode", normalized.voiceMode, rule.voiceModes);

  if (surface != null && normalized.surface !== surface) {
    throw new SurfaceRegisterContractError(`surface_argument_mismatch:${surface}`);
  }
  if (register != null) requireAllowed("register", register, rule.registers);

  return Object.freeze(normalized);
}

export function surfaceRegisterRules() {
  return SURFACE_RULES;
}
