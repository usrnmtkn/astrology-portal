// Editorial section layout for canonical planet-in-sign evergreen copy.
// Existing approved fields remain untouched. A missing layout keeps their
// original order; an explicitly empty layout renders no evergreen prose.
export const SKY_EVERGREEN_SECTIONS_PATH = "fallback.sections";
export const SKY_EVERGREEN_DEFAULT_SECTIONS = [
  { id: "hook", source: "hook" },
  { id: "lived", source: "lived" },
  { id: "turn", source: "turn" }
];
const labels = { hook: "Fallback opening", lived: "Fallback: how it shows up", turn: "Fallback: challenge and response" };

export function isSkyEvergreenSource(source) {
  return source?.studio_content_type === "continuous-placement"
    && /^sky-placement\/article\/[^/]+\/[^/]+$/u.test(source.contentKey ?? "");
}

export function validateSkyEvergreenSections(value) {
  if (value === undefined) return;
  if (!Array.isArray(value) || value.length > 24) throw new Error("Evergreen sections must be a list of at most 24 sections.");
  const ids = new Set();
  const sources = new Set();
  for (const section of value) {
    if (!section || typeof section !== "object" || Array.isArray(section)
      || typeof section.id !== "string" || !/^[a-z][a-z0-9-]{0,63}$/u.test(section.id) || ids.has(section.id)) {
      throw new Error("Each evergreen section needs a unique, valid identifier.");
    }
    ids.add(section.id);
    if (Object.hasOwn(section, "source")) {
      if (typeof section.source !== "string" || !Object.hasOwn(labels, section.source) || sources.has(section.source)
        || Object.keys(section).some(key => !["id", "source"].includes(key))) {
        throw new Error("An evergreen section may reference each existing hook only once.");
      }
      sources.add(section.source);
    } else if (typeof section.label !== "string" || section.label.length > 120
      || typeof section.body !== "string" || section.body.length > 20000
      || Object.keys(section).some(key => !["id", "label", "body"].includes(key))) {
      throw new Error("An added evergreen section needs an editor label and a text body.");
    }
  }
}

export function skyEvergreenLayout(source) {
  const value = source?.fallback?.sections;
  validateSkyEvergreenSections(value);
  return value === undefined ? SKY_EVERGREEN_DEFAULT_SECTIONS.map(section => ({ ...section })) : value;
}

export function skyEvergreenFields(source) {
  return skyEvergreenLayout(source).map(section => ({
    id: section.id,
    path: section.source ? `fallback.${section.source}` : `${SKY_EVERGREEN_SECTIONS_PATH}.${section.id}`,
    label: section.source ? labels[section.source] : section.label.trim() || "Untitled section",
    value: section.source ? (source?.fallback?.[section.source] ?? "") : section.body,
    custom: !section.source
  }));
}

// Configuration is editable only for this canonical family. It is deliberately
// separate from the immutable list of already approved prose fields.
export function skyEvergreenEditableFields(source) {
  const fields = source?.studio_editable_fields ?? [];
  return isSkyEvergreenSource(source)
    ? [...fields.filter(field => field.path !== SKY_EVERGREEN_SECTIONS_PATH), { path: SKY_EVERGREEN_SECTIONS_PATH, label: "Evergreen sections and order" }]
    : fields;
}
