const ARTICLE_TEMPLATE_ID = "sky-placement-v4-article-compile";
const PAGE_TEMPLATE_ID = "sky-placement-v4-page";
const FALLBACK_TEMPLATE_ID = "sky-placement-v4-fallback";

function requiredText(value, label) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`SKY_PLACEMENT_V4_STAGE_GAP: ${label}`);
  return text;
}

function normalized(value) {
  return String(value ?? "").trim().toLowerCase();
}

function templateById(corpus, templateId) {
  const found = (corpus.templates ?? []).find((entry) => entry.template_id === templateId);
  if (!found) throw new Error(`SKY_PLACEMENT_V4_STAGE_GAP: template ${templateId}`);
  return found.template;
}

function fillScalarSlots(template, values) {
  return String(template).replace(/\{\{([A-Za-z][A-Za-z0-9]*)\}\}/gu, (match, key) => (
    Object.hasOwn(values, key) ? String(values[key] ?? "") : match
  ));
}

function fillConditional(template, key, value) {
  const pattern = new RegExp(`\\{\\{#${key}\\}\\}([\\s\\S]*?)\\{\\{\\/${key}\\}\\}`, "gu");
  return String(template).replace(pattern, value ? (_match, body) => fillScalarSlots(body, { [key]: value }) : "");
}

function assertResolved(rendered) {
  const unresolved = rendered.match(/\{\{[^}]+\}\}/gu) ?? [];
  if (unresolved.length) {
    throw new Error(`SKY_PLACEMENT_V4_STAGE_GAP: unresolved slots ${[...new Set(unresolved)].join(", ")}`);
  }
  return rendered.replace(/\n{3,}/gu, "\n\n").trim();
}

export function compileSkyPlacementV4Article(corpus, article, facts = {}) {
  const compiled = fillScalarSlots(fillScalarSlots(templateById(corpus, ARTICLE_TEMPLATE_ID), {
    opening: requiredText(article.opening, `${article.content_key} opening`),
    tension: requiredText(article.tension, `${article.content_key} tension`),
    development: requiredText(article.development, `${article.content_key} development`),
    close: requiredText(article.close, `${article.content_key} close`)
  }), facts);
  return assertResolved(compiled);
}

export function compileSkyPlacementV4Fallback(corpus, article, facts = {}) {
  const compiled = fillScalarSlots(fillScalarSlots(templateById(corpus, FALLBACK_TEMPLATE_ID), {
    placementHook: requiredText(article.fallback_hook, `${article.content_key} fallback hook`),
    placementLived: requiredText(article.fallback_lived, `${article.content_key} fallback lived`),
    placementTurn: requiredText(article.fallback_turn, `${article.content_key} fallback turn`)
  }), facts);
  return assertResolved(compiled);
}

export function seasonalContextFor(corpus, sign, latitude) {
  const signKey = normalized(sign);
  const hemisphere = Number.isFinite(Number(latitude)) && Number(latitude) > 0
    ? "northern"
    : Number.isFinite(Number(latitude)) && Number(latitude) < 0
      ? "southern"
      : "neutral";
  return (corpus.seasonal_contexts ?? []).find((entry) => (
    normalized(entry.sign) === signKey && entry.hemisphere === hemisphere
  ))?.copy ?? "";
}

export function renderSkyPlacementV4Conditions(conditions = []) {
  const activeApproved = conditions.filter((condition) => condition?.approved === true && condition?.active === true);
  const signRetrogrades = activeApproved.filter((condition) => condition.kind === "retrograde" && condition.scope === "sign");
  const planetRetrogrades = activeApproved.filter((condition) => condition.kind === "retrograde" && condition.scope !== "sign");
  const aspects = activeApproved.filter((condition) => condition.kind !== "retrograde");
  const selected = [...(signRetrogrades.length ? signRetrogrades : planetRetrogrades), ...aspects];

  return selected
    .sort((left, right) => String(left.exactDate ?? "").localeCompare(String(right.exactDate ?? "")))
    .map((condition) => [
      `### ${requiredText(condition.headline, "condition headline")}`,
      requiredText(condition.dateLine, `${condition.headline} date line`),
      requiredText(condition.body, `${condition.headline} body`)
    ].join("\n"))
    .join("\n\n");
}

export function skyPlacementV4PublicUrl(planet, sign, cycleStartDate) {
  return `/astrology/transits/${normalized(planet)}-in-${normalized(sign)}/${requiredText(cycleStartDate, "cycle start date")}/`;
}

export function skyPlacementV4AlternateJsonUrl(planet, sign, cycleStartDate) {
  return `/api/content/sky-placement/${normalized(planet)}/${normalized(sign)}/${requiredText(cycleStartDate, "cycle start date")}.json`;
}

export function skyPlacementV4ContentKeys(planet, sign) {
  const planetKey = normalized(planet);
  const signKey = normalized(sign);
  return {
    canonical: `sky-placement/article/${planetKey}/${signKey}`,
    legacyAlias: `fallback-hook/sky-sign-copy/${planetKey}/${signKey}`
  };
}

export function resolveSkyPlacementV4Record(records, planet, sign) {
  const keys = skyPlacementV4ContentKeys(planet, sign);
  const get = records instanceof Map
    ? (key) => records.get(key)
    : (key) => records?.[key];
  return get(keys.canonical) ?? get(keys.legacyAlias) ?? null;
}

export function renderSkyPlacementV4Preview(corpus, input) {
  if (corpus.editorial_status !== "proposed_v4" || corpus.implementation_status !== "stage_only" || corpus.owner_approved !== false) {
    throw new Error("SKY_PLACEMENT_V4_STAGE_GOVERNANCE: preview accepts proposed_v4/stage_only/non-approved corpus only.");
  }

  const planet = normalized(input.planet);
  const sign = normalized(input.sign);
  const keys = skyPlacementV4ContentKeys(planet, sign);
  const article = (corpus.sun_articles ?? []).find((entry) => (
    normalized(entry.planet) === planet && normalized(entry.sign) === sign
  ));
  const facts = input.facts ?? {};
  const fullArticleEligible = article && input.articleAvailable !== false;
  const fallbackEligible = article && input.fallbackAvailable !== false;
  const placementArticle = fullArticleEligible
    ? compileSkyPlacementV4Article(corpus, article, facts)
    : fallbackEligible
      ? compileSkyPlacementV4Fallback(corpus, article, facts)
      : "";
  const resolution = fullArticleEligible ? "full-article" : fallbackEligible ? "exact-fallback" : "facts-only";
  const currentConditions = renderSkyPlacementV4Conditions(input.conditions);
  const seasonalContext = seasonalContextFor(corpus, sign, input.latitude);
  let page = templateById(corpus, PAGE_TEMPLATE_ID);

  page = fillConditional(page, "seasonalContext", seasonalContext);
  page = fillConditional(page, "hasCurrentConditions", currentConditions);
  page = fillScalarSlots(page, {
    planetTitle: requiredText(input.planetTitle ?? input.planet, "planet title"),
    signTitle: requiredText(input.signTitle ?? input.sign, "sign title"),
    dateLine: requiredText(input.dateLine, "date line"),
    tldrWhat: article?.tldr_what ?? "",
    tldrTakeaway: article?.tldr_takeaway ?? "",
    placementArticle,
    currentConditions,
    ...facts
  });
  if (resolution === "facts-only") {
    page = page.replace(/## TLDR\s+\*\*What:\*\*\s+\*\*Takeaway:\*\*\s*/u, "");
  }

  return {
    resolution,
    contentKey: article?.content_key ?? keys.canonical,
    resolverKeys: keys,
    page: assertResolved(page),
    publicUrl: skyPlacementV4PublicUrl(planet, sign, input.cycleStartDate),
    alternateJsonUrl: skyPlacementV4AlternateJsonUrl(planet, sign, input.cycleStartDate),
    machineReadable: {
      contentType: "sky-placement",
      planet,
      sign,
      cycleStart: requiredText(input.cycleStartDate, "cycle start date"),
      cycleEnd: input.cycleEndDate ?? null,
      currentMotion: input.currentMotion ?? null,
      retrogradeWindows: input.retrogradeWindows ?? [],
      activeAspects: (input.conditions ?? []).filter((condition) => condition.kind !== "retrograde" && condition.active === true && condition.approved === true),
      contentKey: article?.content_key ?? keys.canonical,
      occurrenceId: `sky-placement/transit/${planet}/${sign}/${requiredText(input.cycleStartDate, "cycle start date")}`,
      approvalStatus: article?.owner_approved === true ? "owner-approved" : "proposed_v4",
      dateModified: input.dateModified ?? null
    }
  };
}
