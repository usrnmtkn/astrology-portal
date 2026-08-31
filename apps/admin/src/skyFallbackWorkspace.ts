export type SkyFallbackField = {
  key: string;
  label: string;
  value: string;
};

export type SkyFallbackWorkspace = {
  kind: "article" | "aspect" | "legacy";
  title: string;
  fields: SkyFallbackField[];
  variables: string[];
};

export type SkyFallbackIdentity = {
  title: string;
  typeLabel: string;
  description?: string;
  groupKey: "articles" | "houses" | "sky-aspects" | "personal-transits" | "supporting";
  groupLabel: string;
};

export const skyPlacementFrameTemplateKey = "fallback-template/sky-placement-frame-v3";

export type SkyPlacementCompositionOption = "includePlanetLore" | "includeSignLore";

export type SkyPlacementCompositionOptions = Record<SkyPlacementCompositionOption, boolean>;

export const skyPlacementFallbackSectionOutline = [
  {
    key: "tagline",
    label: "Short headline",
    description: "The brief headline shown with the placement."
  },
  {
    key: "hook",
    label: "Opening",
    description: "Introduces the planet in the sign and the main idea."
  },
  {
    key: "lived",
    label: "How it shows up",
    description: "Shows the placement through recognizable situations and behavior."
  },
  {
    key: "turn",
    label: "Challenge and response",
    description: "Names what becomes difficult and the useful response."
  }
] as const;

const articleFieldOrder = [
  ["fact_line", "Calculated date line"],
  ["opening", "Opening paragraphs"],
  ["tension", "Complication paragraphs"],
  ["development", "Development / turn"],
  ["era_layer.frame", "Era frame"],
  ["era_layer.handoff", "Era handoff"],
  ["era_layer.recurrence", "Recurrence"],
  ["era_layer.collective_lesson", "Collective lesson"],
  ["close", "Final paragraph"]
] as const;

const aspectFieldOrder = [
  ["body", "Collective Sky copy"],
  ["body_you", "Reader transit copy"],
  ["body_they", "Friend transit copy"]
] as const;

function words(value: string) {
  return value
    .replace(/[-_]/gu, " ")
    .replace(/\b\w/gu, (match) => match.toUpperCase());
}

function planetWithDefiniteArticle(planetTitle: string) {
  return ["Sun", "Moon", "North Node", "South Node"].includes(planetTitle)
    ? `the ${planetTitle}`
    : planetTitle;
}

const natalPlanetInSignTemplatePattern = /^fallback-template\/natal\.planet-in-sign\/([a-z-]+)$/u;

export function natalPlanetInSignTemplateHeadline(contentKey: string, headline: string) {
  const planet = contentKey.match(natalPlanetInSignTemplatePattern)?.[1];
  if (!planet) return headline;

  const planetTitle = words(planet);
  const normalizedHeadline = headline.trim();
  if (!normalizedHeadline || /^(?:\{\{\s*planetTitle\s*\}\}|planet)\s+in\s+(?:\{\{\s*signTitle\s*\}\}|sign)$/iu.test(normalizedHeadline)) {
    return `${planetTitle} in {{signTitle}}`;
  }

  return headline.replace(/\{\{\s*planetTitle\s*\}\}/gu, planetTitle);
}

export function natalPlanetInSignTemplateTitle(contentKey: string, headline: string) {
  if (!natalPlanetInSignTemplatePattern.test(contentKey)) return null;

  return natalPlanetInSignTemplateHeadline(contentKey, headline)
    .replace(/\{\{\s*signTitle\s*\}\}/gu, "a Sign");
}

export function houseHoroscopeCoreHeadline(contentKey: string, headline: string) {
  const identity = skyFallbackIdentity(contentKey);
  return identity?.groupKey === "houses" ? identity.title : headline;
}

function ordinalHouse(value: string) {
  const house = Number(value.replace(/^house-/u, ""));
  if (!Number.isInteger(house)) return words(value);
  const mod100 = house % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${house}th House`;
  if (house % 10 === 1) return `${house}st House`;
  if (house % 10 === 2) return `${house}nd House`;
  if (house % 10 === 3) return `${house}rd House`;
  return `${house}th House`;
}

export function skyFallbackIdentity(contentKey: string): SkyFallbackIdentity | null {
  const parts = contentKey.split("/").filter(Boolean);

  if (contentKey.startsWith("sky-placement/article/") && parts.length === 4) {
    return {
      title: `${words(parts[2])} in ${words(parts[3])}`,
      typeLabel: "Canonical SKY V4 placement article",
      description: "Stage-only canonical article with its exact planet-sign fallback, provenance, immutable source baseline, and versioned Content Studio draft.",
      groupKey: "articles",
      groupLabel: "Sky Placement articles"
    };
  }

  if (contentKey.startsWith("sky-context/")) {
    return {
      title: parts.slice(1).map(words).join(" · "),
      typeLabel: "Contextual transit overlay",
      description: "Reviewed contextual copy with a fact-matched trigger. Trigger facts stay read-only; only the full-page and fallback overlay copy are editable drafts.",
      groupKey: "supporting",
      groupLabel: "Sky current conditions"
    };
  }

  if (contentKey.startsWith("sky-v4/template/")) {
    return {
      title: words(parts.at(-1) ?? "SKY V4 template"),
      typeLabel: "Canonical SKY V4 Mustache template",
      description: "Stage-only template. Content Studio preview must resolve it through the same canonical resolver as production.",
      groupKey: "supporting",
      groupLabel: "SKY V4 templates"
    };
  }

  if (contentKey === skyPlacementFrameTemplateKey) {
    return {
      title: "Sky Placement fallback page template",
      typeLabel: "Canonical Sky Placement fallback template",
      description: "Assembles the complete fallback page from transit dates, the planet explanation, sign history and symbolism, the planet-in-sign interpretation, and any approved current aspects.",
      groupKey: "supporting",
      groupLabel: "Sky Placement template parts"
    };
  }

  const placementOpeningIndex = parts.indexOf("sky-placement");
  if (placementOpeningIndex >= 0 && parts.length === placementOpeningIndex + 2) {
    const planetTitle = words(parts[placementOpeningIndex + 1]);
    return {
      title: `${planetTitle} · Transit dates and opening`,
      typeLabel: "Transit dates and opening",
      description: `Shared ${planetTitle} opening with calculated sign, entry date, and exit date. Used across all ${planetTitle} placement pages.`,
      groupKey: "supporting",
      groupLabel: "Sky Placement template parts"
    };
  }

  const placementFrameIndex = parts.indexOf("sky-placement-frame");
  if (placementFrameIndex >= 0 && parts.length === placementFrameIndex + 2) {
    const planetTitle = words(parts[placementFrameIndex + 1]);
    const describedPlanet = planetWithDefiniteArticle(planetTitle);
    return {
      title: `${planetTitle} · About ${describedPlanet}`,
      typeLabel: `About ${describedPlanet}`,
      description: `Shared explanation of what ${describedPlanet} governs and how its transit shows up. Used across all ${planetTitle} placement pages.`,
      groupKey: "supporting",
      groupLabel: "Sky Placement template parts"
    };
  }

  const placementLoreIndex = parts.indexOf("sky-placement-lore");
  if (placementLoreIndex >= 0 && parts.length === placementLoreIndex + 2) {
    const signTitle = words(parts[placementLoreIndex + 1]);
    return {
      title: `${signTitle} · About the sign`,
      typeLabel: "About the sign",
      description: `Reusable ${signTitle} history, symbol, ruler, and seasonal context for Sky Placement fallback pages. This is an independent copy of the Sky Season lore and can be reviewed separately.`,
      groupKey: "supporting",
      groupLabel: "Sky Placement template parts"
    };
  }

  const placementSignIndex = parts.indexOf("sky-placement-sign");
  if (placementSignIndex >= 0 && parts.length >= placementSignIndex + 3) {
    const planetTitle = words(parts[placementSignIndex + 1]);
    const signTitle = words(parts[placementSignIndex + 2]);
    return {
      title: `${planetTitle} in ${signTitle}`,
      typeLabel: "Planet-in-sign interpretation",
      description: `Sign-specific interpretation used when ${planetTitle} is in ${signTitle}.`,
      groupKey: "supporting",
      groupLabel: "Sky Placement template parts"
    };
  }

  const skyArticleIndex = parts.indexOf("sky-sign-copy");
  if (skyArticleIndex >= 0 && parts.length >= skyArticleIndex + 3) {
    return {
      title: `${words(parts[skyArticleIndex + 1])} in ${words(parts[skyArticleIndex + 2])}`,
      typeLabel: "Full Sky Placement article",
      groupKey: "articles",
      groupLabel: "Sky Placement articles"
    };
  }

  const houseIndex = parts.indexOf("house-horoscope-core");
  if (houseIndex >= 0 && parts.length >= houseIndex + 4) {
    return {
      title: `${words(parts[houseIndex + 1])} in ${words(parts[houseIndex + 2])} · ${ordinalHouse(parts[houseIndex + 3])}`,
      typeLabel: "House horoscope",
      groupKey: "houses",
      groupLabel: "House horoscopes"
    };
  }

  const legacyPlacementIndex = parts.findIndex((part) => /^sky-placement-(tagline|hook|lived|turn)$/u.test(part));
  if (legacyPlacementIndex >= 0 && parts.length >= legacyPlacementIndex + 3) {
    const slot = parts[legacyPlacementIndex].replace(/^sky-placement-/u, "");
    const slotLabel = skyPlacementFallbackSectionOutline.find((section) => section.key === slot)?.label ?? words(slot);
    return {
      title: `${words(parts[legacyPlacementIndex + 1])} in ${words(parts[legacyPlacementIndex + 2])} · ${slotLabel}`,
      typeLabel: "Sky Placement fallback article section",
      groupKey: "supporting",
      groupLabel: "Sky Placement fallback articles"
    };
  }

  const signedAspectIndex = parts.indexOf("sky-aspect-sign");
  if (signedAspectIndex >= 0 && parts.length >= signedAspectIndex + 6) {
    const [planetA, signA, aspect, planetB, signB] = parts.slice(signedAspectIndex + 1);
    return {
      title: `${words(planetA)} in ${words(signA)} ${words(aspect)} ${words(planetB)} in ${words(signB)}`,
      typeLabel: "Collective Sky aspect",
      groupKey: "sky-aspects",
      groupLabel: "Sky aspects"
    };
  }

  const placementAspectIndex = parts.indexOf("sky-placement-aspect");
  if (placementAspectIndex >= 0 && parts.length >= placementAspectIndex + 4) {
    const [planetA, planetB, aspect, sign] = parts.slice(placementAspectIndex + 1);
    return {
      title: `${words(planetA)} ${words(aspect)} ${words(planetB)}${sign ? ` · ${words(sign)}` : ""}`,
      typeLabel: "Sky Placement aspect",
      groupKey: "sky-aspects",
      groupLabel: "Sky aspects"
    };
  }

  const transitAspectIndex = parts.indexOf("transit-aspect");
  if (transitAspectIndex >= 0 && parts.length >= transitAspectIndex + 4) {
    const [planet, natalPoint, aspect] = parts.slice(transitAspectIndex + 1);
    return {
      title: `${words(planet)} ${words(aspect)} your ${words(natalPoint)}`,
      typeLabel: "Transit to natal",
      groupKey: "personal-transits",
      groupLabel: "Transits to natal"
    };
  }

  return null;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function skyPlacementCompositionOptions(source: unknown): SkyPlacementCompositionOptions {
  const options = record(record(source).compositionOptions);
  return {
    includePlanetLore: options.includePlanetLore !== false,
    includeSignLore: options.includeSignLore !== false
  };
}

export function setSkyPlacementCompositionOption(
  source: Record<string, unknown>,
  option: SkyPlacementCompositionOption,
  enabled: boolean
) {
  return {
    ...source,
    compositionOptions: {
      ...record(source.compositionOptions),
      [option]: enabled
    }
  };
}

export function packageValueAt(source: Record<string, unknown>, path: string): string {
  const value = path.split(".").reduce<unknown>((current, part) => record(current)[part], source);
  return typeof value === "string" ? value : "";
}

export function setPackageValueAt(source: Record<string, unknown>, path: string, value: unknown) {
  const next = structuredClone(source);
  const parts = path.split(".");
  let cursor = next;
  parts.slice(0, -1).forEach((part) => {
    cursor[part] = { ...record(cursor[part]) };
    cursor = cursor[part] as Record<string, unknown>;
  });
  cursor[parts.at(-1) ?? path] = value;
  return next;
}

export function packageDraftForSections(sections: unknown) {
  const sectionRecord = record(sections);
  return record(sectionRecord.packageDraft);
}

export function effectivePackageRecord(sections: unknown) {
  const sectionRecord = record(sections);
  return {
    ...record(sectionRecord.packageRecord),
    ...record(sectionRecord.packageDraft)
  };
}

export function placeholdersInPackage(source: Record<string, unknown>) {
  const slots = new Set<string>();
  const visit = (value: unknown) => {
    if (typeof value === "string") {
      for (const match of value.matchAll(/\{\{\s*([\w.-]+)\s*\}\}/gu)) slots.add(match[1]);
      return;
    }
    if (Array.isArray(value)) return value.forEach(visit);
    Object.values(record(value)).forEach(visit);
  };
  visit(source);
  return [...slots].sort();
}

export function skyFallbackWorkspace(contentKey: string, sections: unknown): SkyFallbackWorkspace | null {
  const source = effectivePackageRecord(sections);
  const renderPolicy = String(source.render_policy ?? "");
  const studioFields = Array.isArray(source.studio_editable_fields)
    ? source.studio_editable_fields
      .map((value) => record(value))
      .filter((value) => typeof value.path === "string" && typeof value.label === "string")
      .map((value) => [String(value.path), String(value.label)] as const)
    : [];
  const isArticle = contentKey.startsWith("fallback-hook/sky-sign-copy/") || renderPolicy === "sky-placement-continuous-v2";
  const isAspect = contentKey.includes("sky-aspect") || contentKey.includes("sky-placement-aspect");
  const configuredFields = studioFields.length
    ? studioFields
    : isArticle ? articleFieldOrder : isAspect ? aspectFieldOrder : [];
  const fields = configuredFields
    .filter(([key]) => packageValueAt(source, key) !== "")
    .map(([key, label]) => ({ key, label, value: packageValueAt(source, key) }));

  if (!fields.length) return null;

  return {
    kind: studioFields.length || isArticle ? "article" : isAspect ? "aspect" : "legacy",
    title: studioFields.length
      ? `${String(source.studio_content_type ?? "SKY V4")} workspace`
      : isArticle ? "Sky Placement article workspace" : "Sky aspect workspace",
    fields,
    variables: placeholdersInPackage(record(record(sections).packageRecord))
  };
}

export function packageDraftChanges(sections: unknown) {
  const sectionRecord = record(sections);
  const original = record(sectionRecord.packageRecord);
  const draft = record(sectionRecord.packageDraft);
  if (!Object.keys(draft).length) return [];
  const workspace = skyFallbackWorkspace(String(original.contentKey ?? ""), sections);
  const fieldChanges = (workspace?.fields ?? [])
    .map((field) => ({
      key: field.key,
      label: field.label,
      before: packageValueAt(original, field.key),
      after: packageValueAt(draft, field.key)
    }))
    .filter((change) => change.before !== change.after);
  const compositionChanges = String(original.contentKey ?? "") === skyPlacementFrameTemplateKey
    ? ([
        ["includePlanetLore", "Include planet explanation"],
        ["includeSignLore", "Include sign history and symbolism"]
      ] as const).map(([key, label]) => ({
        key: `compositionOptions.${key}`,
        label,
        before: skyPlacementCompositionOptions(original)[key] ? "Included" : "Excluded",
        after: skyPlacementCompositionOptions(draft)[key] ? "Included" : "Excluded"
      })).filter((change) => change.before !== change.after)
    : [];
  return [...compositionChanges, ...fieldChanges];
}

export function renderWorkspacePreview(fields: SkyFallbackField[], values: Record<string, string> = {}) {
  const fill = (copy: string) => copy.replace(/\{\{\s*([\w.-]+)\s*\}\}/gu, (_match, slot: string) => values[slot] ?? `{{${slot}}}`);
  return fields
    .filter((field) => field.key !== "fact_line")
    .map((field) => fill(field.value).trim())
    .filter(Boolean);
}
