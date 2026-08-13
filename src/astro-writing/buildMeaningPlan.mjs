const SIGN_HOUSE_DEFAULTS = Object.freeze({
  taurus: "money",
  cancer: "home/family",
  virgo: "work/health",
  libra: "relationship status",
  scorpio: "debt/shared resources",
  sagittarius: "travel/education/legal",
  capricorn: "career/title",
  aquarius: "friendships/groups",
  pisces: "retreat/12th-house material"
});

function requiredText(value, label) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new Error(`Meaning plan requires ${label}.`);
  return normalized;
}

function textList(value) {
  return [...new Set((Array.isArray(value) ? value : []).map((entry) => String(entry).trim()).filter(Boolean))];
}

export function buildMeaningPlan(input) {
  const sourceRowKey = requiredText(input.rowKey ?? input.row_key, "source row key");
  const astrologySupport = requiredText(input.astrologySupport ?? input.astrology_support, "AstrologySupport");
  const sourceConstraints = textList(input.sourceConstraints ?? input.source_constraints);
  if (!sourceConstraints.length) throw new Error("Meaning plan requires source constraints.");
  const object = requiredText(input.object ?? input.planet ?? input.point, "object / point").toLowerCase();
  const sign = requiredText(input.sign, "sign").toLowerCase();
  const house = input.house == null ? null : Number(input.house);
  if (house != null && (!Number.isInteger(house) || house < 1 || house > 12)) {
    throw new Error("Meaning plan house must be an integer from 1 through 12 when supplied.");
  }

  const objectFunction = requiredText(input.objectFunction, "object function");
  const signMechanics = requiredText(input.signMechanics, "sign mechanics");
  const coreTension = requiredText(input.coreTension, "core tension");
  const likelyObservableBehaviors = textList(input.likelyObservableBehaviors);
  const likelyConsequences = textList(input.likelyConsequences);
  if (!likelyObservableBehaviors.length || !likelyConsequences.length) {
    throw new Error("Meaning plan requires observable behaviors and consequences from governed astrology.");
  }

  const prohibitedDomainAssumptions = textList(input.prohibitedDomainAssumptions);
  if (SIGN_HOUSE_DEFAULTS[sign] && house == null) prohibitedDomainAssumptions.push(SIGN_HOUSE_DEFAULTS[sign]);

  const doNotAssume = textList(input.DO_NOT_ASSUME).concat(
    house == null ? ["a house or life domain that was not supplied"] : [],
    ["a specific event, motive, relationship type, or biography not present in governed facts"]
  );
  const risks = textList(input.risks ?? input.shadowExpression);
  const plan = {
    source_row_key: sourceRowKey,
    astrology_support: astrologySupport,
    source_constraints: sourceConstraints,
    content_type: String(input.contentType ?? input.content_type ?? "placement"),
    object,
    sign,
    house,
    event_type: input.eventType ? String(input.eventType).trim().toLowerCase() : null,
    object_function: [objectFunction],
    sign_mechanics: [signMechanics],
    actual_house_domain: house == null ? null : requiredText(input.actualHouseDomain, "actual house domain"),
    core_tension: coreTension,
    what_changes: requiredText(input.whatChanges ?? likelyConsequences[0], "what changes"),
    constructive_expression: requiredText(input.constructiveExpression ?? likelyObservableBehaviors[0], "constructive expression"),
    overcorrection: requiredText(input.overcorrection ?? risks[0] ?? coreTension, "overcorrection"),
    observable_behaviors: likelyObservableBehaviors,
    possible_consequences: likelyConsequences,
    allowed_life_domain_examples: textList(input.allowedLivedDomains),
    do_not_assume: doNotAssume,
    house_bleed_risks: [...new Set(prohibitedDomainAssumptions)],
    stock_trope_risks: textList(input.stockTropeRisks),
    unearned_motives: textList(input.unearnedMotives),
    // Compatibility aliases for existing retrieval and generation call sites.
    rowKey: sourceRowKey,
    astrologySupport,
    sourceConstraints,
    eventType: input.eventType ? String(input.eventType).trim().toLowerCase() : null,
    objectFunction,
    signMechanics,
    actualHouseDomain: house == null ? null : requiredText(input.actualHouseDomain, "actual house domain"),
    allowedLivedDomains: textList(input.allowedLivedDomains),
    prohibitedDomainAssumptions: [...new Set(prohibitedDomainAssumptions)],
    coreTension,
    likelyObservableBehaviors,
    likelyConsequences,
    risks,
    DO_NOT_ASSUME: doNotAssume
  };
  return Object.freeze(plan);
}
