const ARTICLE_TEMPLATE_ID = "sky-placement-v4-article-compile";
const PAGE_TEMPLATE_ID = "sky-placement-v4-page";
const FALLBACK_TEMPLATE_ID = "sky-placement-v4-fallback";

export const SKY_PLACEMENT_V4_REVIEWED_TEMPLATES = Object.freeze([
  { template_id: PAGE_TEMPLATE_ID, purpose: "Canonical reader page", template: "# {{planetTitle}} in {{signTitle}}\n\n{{dateLine}}\n\n## TLDR\n\n**What:** {{tldrWhat}}\n\n**Takeaway:** {{tldrTakeaway}}\n\n{{#seasonalContext}}\n{{seasonalContext}}\n\n{{/seasonalContext}}\n{{placementArticle}}\n\n{{#hasCurrentConditions}}\n## What is shaping this transit now\n\n{{currentConditions}}\n{{/hasCurrentConditions}}" },
  { template_id: ARTICLE_TEMPLATE_ID, purpose: "Deterministic article compilation", template: "{{opening}}\n\n{{tension}}\n\n{{development}}\n\n{{close}}" },
  { template_id: FALLBACK_TEMPLATE_ID, purpose: "Exact planet-sign fallback only", template: "{{placementHook}}\n\n{{placementLived}}\n\n{{placementTurn}}" },
  { template_id: "sky-placement-v4-current-conditions", purpose: "All active supported conditions", template: "{{#retrogradeConditions}}\n### {{headline}}\n{{dateLine}}\n\n{{body}}\n\n{{/retrogradeConditions}}\n{{#aspectConditions}}\n### {{headline}}\n{{dateLine}}\n\n{{body}}\n\n{{/aspectConditions}}" }
]);
const REVIEWED_TEMPLATES = new Map(SKY_PLACEMENT_V4_REVIEWED_TEMPLATES.map((entry) => [entry.template_id, entry.template]));

function requiredText(value, label) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`SKY_PLACEMENT_V4_STAGE_GAP: ${label}`);
  return text;
}

function normalized(value) {
  return String(value ?? "").trim().toLowerCase();
}

function articleField(article, camelName, legacyName) {
  return article?.[camelName] ?? article?.[legacyName];
}

function fallbackField(article, slot) {
  return article?.fallback?.[slot] ?? article?.[`fallback_${slot}`];
}

function articleContentKey(article) {
  return article?.contentKey ?? article?.content_key;
}

export function skyPlacementV4Articles(corpus) {
  const sunArticles = corpus.sun_corpus ?? corpus.sun_articles ?? [];
  const planetBatches = Object.values(corpus.planets ?? {}).flatMap((articles) => (
    Array.isArray(articles) ? articles : []
  ));
  return [...sunArticles, ...planetBatches];
}

function assertStageGovernance(corpus) {
  const reviewedSunStage = corpus.status === "proposed_v4_source_verified"
    && corpus.serving_enabled === false
    && corpus.handoff_status === "reviewed_for_codex_staging";
  const reviewedPlanetBatch = corpus.status === "reviewed_source_led_proposed"
    && corpus.implementation_status === "next_codex_batch"
    && corpus.owner_approved === false;

  if (!reviewedSunStage && !reviewedPlanetBatch) {
    throw new Error("SKY_PLACEMENT_V4_STAGE_GOVERNANCE: preview accepts reviewed, non-serving V4 staging corpora only.");
  }
}

function templateById(corpus, templateId) {
  const found = (corpus.templates ?? []).find((entry) => entry.template_id === templateId);
  const template = found?.template ?? REVIEWED_TEMPLATES.get(templateId);
  if (!template) throw new Error(`SKY_PLACEMENT_V4_STAGE_GAP: template ${templateId}`);
  return template;
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
  const contentKey = articleContentKey(article);
  const compiled = fillScalarSlots(fillScalarSlots(templateById(corpus, ARTICLE_TEMPLATE_ID), {
    opening: requiredText(article.opening, `${contentKey} opening`),
    tension: requiredText(article.tension, `${contentKey} tension`),
    development: requiredText(article.development, `${contentKey} development`),
    close: requiredText(article.close, `${contentKey} close`)
  }), facts);
  return assertResolved(compiled);
}

export function compileSkyPlacementV4Fallback(corpus, article, facts = {}) {
  const contentKey = articleContentKey(article);
  const compiled = fillScalarSlots(fillScalarSlots(templateById(corpus, FALLBACK_TEMPLATE_ID), {
    placementHook: requiredText(fallbackField(article, "hook"), `${contentKey} fallback hook`),
    placementLived: requiredText(fallbackField(article, "lived"), `${contentKey} fallback lived`),
    placementTurn: requiredText(fallbackField(article, "turn"), `${contentKey} fallback turn`)
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
  return (corpus.seasonal_context ?? corpus.seasonal_contexts ?? []).find((entry) => (
    normalized(entry.sign) === signKey && entry.hemisphere === hemisphere
  ))?.copy ?? "";
}

export function retrogradeModifierRecordFor(corpus, planet) {
  const planetKey = normalized(planet);
  return (corpus.retrograde_modifiers ?? []).find((modifier) => normalized(modifier.planet) === planetKey) ?? null;
}

export function retrogradeModifierFor(corpus, planet) {
  const modifier = retrogradeModifierRecordFor(corpus, planet);
  if (
    !modifier
    || modifier.body_approved !== true
    || modifier.allow_paraphrase !== false
    || !/^exact(?:_|$)/u.test(String(modifier.copy_policy ?? ""))
  ) {
    return null;
  }
  return { ...modifier, copy: requiredText(modifier.body, `${modifier.content_key} approved body`) };
}

export function renderSkyPlacementV4Conditions(corpus, planet, conditions = []) {
  const activeApproved = conditions.filter((condition) => condition?.approved === true && condition?.active === true);
  const signRetrogrades = activeApproved.filter((condition) => condition.kind === "retrograde" && condition.scope === "sign");
  const planetRetrogrades = activeApproved.filter((condition) => condition.kind === "retrograde" && condition.scope !== "sign");
  const aspects = activeApproved.filter((condition) => condition.kind !== "retrograde");
  const exactPlanetModifier = retrogradeModifierFor(corpus, planet);
  const governedPlanetModifier = retrogradeModifierRecordFor(corpus, planet);
  const selectedRetrogrades = signRetrogrades.length
    ? signRetrogrades
    : planetRetrogrades.flatMap((condition) => exactPlanetModifier
      ? [{ ...condition, body: exactPlanetModifier.copy, contentKey: exactPlanetModifier.content_key }]
      : governedPlanetModifier
        ? []
        : [condition]);
  const selected = [...selectedRetrogrades, ...aspects];

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
  assertStageGovernance(corpus);

  const planet = normalized(input.planet);
  const sign = normalized(input.sign);
  const keys = skyPlacementV4ContentKeys(planet, sign);
  const article = skyPlacementV4Articles(corpus).find((entry) => (
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
  const currentConditions = renderSkyPlacementV4Conditions(corpus, planet, input.conditions);
  const seasonalContext = seasonalContextFor(corpus, sign, input.latitude);
  let page = templateById(corpus, PAGE_TEMPLATE_ID);

  page = fillConditional(page, "seasonalContext", seasonalContext);
  page = fillConditional(page, "hasCurrentConditions", currentConditions);
  page = fillScalarSlots(page, {
    planetTitle: requiredText(input.planetTitle ?? input.planet, "planet title"),
    signTitle: requiredText(input.signTitle ?? input.sign, "sign title"),
    dateLine: requiredText(input.dateLine, "date line"),
    tldrWhat: articleField(article, "tldrWhat", "tldr_what") ?? "",
    tldrTakeaway: articleField(article, "tldrTakeaway", "tldr_takeaway") ?? "",
    placementArticle,
    currentConditions,
    ...facts
  });
  if (resolution === "facts-only") {
    page = page.replace(/## TLDR\s+\*\*What:\*\*\s+\*\*Takeaway:\*\*\s*/u, "");
  }

  return {
    resolution,
    contentKey: articleContentKey(article) ?? keys.canonical,
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
      contentKey: articleContentKey(article) ?? keys.canonical,
      occurrenceId: `sky-placement/transit/${planet}/${sign}/${requiredText(input.cycleStartDate, "cycle start date")}`,
      approvalStatus: article?.owner_approved === true ? "owner-approved" : corpus.status,
      dateModified: input.dateModified ?? null
    }
  };
}
