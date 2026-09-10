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
export const SKY_SECTION_ROLES = ["main", "complication", "history", "return", "phase", "theme", "response", "education", "orientation", "axis", "key-event", "practical"];
export const SKY_INGREDIENT_ROLES = ["meaning", "mechanism", "context", "example", "collective-example", "tension", "question", "response", "closing-point"];

// Joins are authored text, including whitespace. Never infer punctuation,
// trim individual phrases, or serve an incomplete combination.
export function skyEvergreenSectionText(section) {
  if (section.paragraphs) return section.paragraphs.map(paragraph => skyEvergreenSectionText(paragraph)).filter(Boolean).join("\n\n");
  if (section.items) return section.items.map(item => {
    if (!item.action.trim() || item.phrases.some(phrase => !phrase.text.trim())) return "";
    return item.action + skyEvergreenSectionText(item);
  }).filter(Boolean).join("\n\n");
  if (!section.phrases) return section.body;
  if (!section.phrases.length || section.phrases.some(phrase => !phrase.text.trim())) return "";
  return section.phrases.map(phrase => phrase.joinBefore + phrase.text).join("");
}

// Includes incomplete drafts so validation never hides an invalid fragment.
export function skyEvergreenSectionFragments(section) {
  if (section.paragraphs) return section.paragraphs.flatMap(skyEvergreenSectionFragments);
  if (section.items) return section.items.flatMap(item => [item.action, ...skyEvergreenSectionFragments(item)]);
  return section.phrases ? section.phrases.flatMap(phrase => [phrase.joinBefore, phrase.text]) : [section.body ?? ""];
}

function validatePhrases(phrases) {
  if (!Array.isArray(phrases) || phrases.length > 24) throw new Error("A phrase composition supports at most 24 phrases.");
  const ids = new Set();
  let length = 0;
  for (const phrase of phrases) {
    if (!phrase || typeof phrase !== "object" || Array.isArray(phrase)
      || typeof phrase.id !== "string" || !/^[a-z][a-z0-9-]{0,63}$/u.test(phrase.id) || ids.has(phrase.id)
      || typeof phrase.text !== "string" || typeof phrase.joinBefore !== "string"
      || phrase.joinBefore.length > 2000
      || (phrase.source !== undefined && (typeof phrase.source !== "string" || phrase.source.length > 1000))
      || (phrase.role !== undefined && !SKY_INGREDIENT_ROLES.includes(phrase.role))
      || Object.keys(phrase).some(key => !["id", "text", "joinBefore", "source", "role"].includes(key))) {
      throw new Error("Each phrase needs a unique identifier, exact text, and authored joining text; source notes are optional.");
    }
    ids.add(phrase.id);
    length += phrase.text.length + phrase.joinBefore.length;
  }
  if (length > 20000) throw new Error("A composed section must be at most 20000 characters.");
}

function validatePacket(section, kind) {
  const units = section[kind];
  if (!Array.isArray(units) || units.length > 24) throw new Error("A section supports at most 24 paragraphs or practical items.");
  const ids = new Set();
  for (const unit of units) {
    if (!unit || typeof unit !== "object" || Array.isArray(unit)
      || typeof unit.id !== "string" || !/^[a-z][a-z0-9-]{0,63}$/u.test(unit.id) || ids.has(unit.id)
      || (kind === "paragraphs" && (typeof unit.job !== "string" || unit.job.length > 120))
      || (kind === "items" && typeof unit.action !== "string")
      || Object.keys(unit).some(key => !["id", "phrases", kind === "items" ? "action" : "job"].includes(key))) throw new Error("Each paragraph or practical item needs a unique identifier and its authored fields.");
    ids.add(unit.id);
    validatePhrases(unit.phrases);
  }
  if (skyEvergreenSectionFragments(section).join("").length > 20000) throw new Error("A composed section must be at most 20000 characters.");
}

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
    if (section.motion !== undefined && !["all", "direct", "retrograde"].includes(section.motion)) {
      throw new Error("Section motion must be all, direct, or retrograde.");
    }
    if (Object.hasOwn(section, "source")) {
      if (typeof section.source !== "string" || !Object.hasOwn(labels, section.source) || sources.has(section.source)
        || Object.keys(section).some(key => !["id", "source", "motion"].includes(key))) {
        throw new Error("An evergreen section may reference each existing hook only once.");
      }
      sources.add(section.source);
    } else {
      if (typeof section.label !== "string" || section.label.length > 120
        || Object.keys(section).some(key => !["id", "label", "body", "phrases", "paragraphs", "items", "role", "depth", "motion"].includes(key))) {
        throw new Error("An added evergreen section needs an editor label and writing.");
      }
      if (section.role !== undefined && !SKY_SECTION_ROLES.includes(section.role)) throw new Error("Unknown section role.");
      if (section.depth !== undefined && !["short", "standard", "deep"].includes(section.depth)) throw new Error("Unknown section depth.");
      if (section.role === "practical" && !Object.hasOwn(section, "items")) throw new Error("A practical section requires action items.");
      if (["body", "phrases", "paragraphs", "items"].filter(key => Object.hasOwn(section, key)).length !== 1) throw new Error("Choose one writing format per section.");
      if (Object.hasOwn(section, "paragraphs")) validatePacket(section, "paragraphs");
      else if (Object.hasOwn(section, "items")) {
        if (section.role !== "practical") throw new Error("Practical items require a practical section role.");
        validatePacket(section, "items");
      } else if (Object.hasOwn(section, "phrases")) {
        validatePhrases(section.phrases);
      } else if (typeof section.body !== "string" || section.body.length > 20000) {
        throw new Error("An added evergreen section needs a text body.");
      }
    }
  }
}

export function skyEvergreenLayout(source) {
  const value = source?.fallback?.sections;
  validateSkyEvergreenSections(value);
  return value === undefined ? SKY_EVERGREEN_DEFAULT_SECTIONS.map(section => ({ ...section })) : value;
}

export function skyEvergreenFields(source, motion) {
  return skyEvergreenLayout(source).filter(section => !motion || !section.motion || section.motion === "all" || section.motion === motion).map(section => ({
    motion: section.motion ?? "all",
    id: section.id,
    path: section.source ? `fallback.${section.source}` : `${SKY_EVERGREEN_SECTIONS_PATH}.${section.id}`,
    label: section.source ? labels[section.source] : section.label.trim() || "Untitled section",
    value: section.source ? (source?.fallback?.[section.source] ?? "") : skyEvergreenSectionText(section),
    custom: !section.source
  }));
}

// Configuration is editable only for this canonical family. It is deliberately
// separate from the immutable list of already approved prose fields.
export function skyEvergreenEditableFields(source) {
  const fields = source?.studio_editable_fields ?? [];
  return isSkyEvergreenSource(source)
    ? [...fields.filter(field => field.path !== SKY_EVERGREEN_SECTIONS_PATH && !["placementArticleDirect", "placementArticleRetrograde"].includes(field.path)),
      { path: "placementArticleDirect", label: "Direct placement article" },
      { path: "placementArticleRetrograde", label: "Retrograde placement article" }, { path: SKY_EVERGREEN_SECTIONS_PATH, label: "Evergreen sections and order" }]
    : fields;
}

// Empty optional variants inherit the shared article. Clearing the shared
// article selects the ordered evergreen blocks for the selected motion.
export function skyPlacementArticlePath(source, motion) {
  const path = motion === "retrograde" ? "placementArticleRetrograde" : "placementArticleDirect";
  return typeof source?.[path] === "string" && source[path].trim() ? path : "placementArticle";
}
