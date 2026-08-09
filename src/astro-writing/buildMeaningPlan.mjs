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

  return Object.freeze({
    object,
    sign,
    eventType: input.eventType ? String(input.eventType).trim().toLowerCase() : null,
    house,
    objectFunction,
    signMechanics,
    actualHouseDomain: house == null ? null : requiredText(input.actualHouseDomain, "actual house domain"),
    allowedLivedDomains: textList(input.allowedLivedDomains),
    prohibitedDomainAssumptions: [...new Set(prohibitedDomainAssumptions)],
    coreTension,
    likelyObservableBehaviors,
    likelyConsequences,
    risks: textList(input.risks ?? input.shadowExpression),
    DO_NOT_ASSUME: textList(input.DO_NOT_ASSUME).concat(
      house == null ? ["a house or life domain that was not supplied"] : [],
      ["a specific event, motive, relationship type, or biography not present in governed facts"]
    )
  });
}
