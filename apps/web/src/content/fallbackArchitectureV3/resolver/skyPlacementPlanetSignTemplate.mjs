/** Opt-in planet-in-sign article structure. Existing saved articles are not
 * rewritten. Sky Placement uses the ingress template; natal wording is stored
 * separately and is not inserted into Sky.
 */
export const SKY_PLACEMENT_PLANET_SIGN_INGRESS_TEMPLATE = `From {{entryDate}} to {{exitDate}}, {{planetTitle}} moves through {{signTitle}}. {{planetTitle}} describes {{planetFunction}}, while {{signTitle}} pursues {{signCoreDrive}} through {{signMethod}}. {{placementThesis}}

{{placementDignityMeaning}}

{{experienceGeneral}} {{placementOpportunity}}

The challenge

{{placementPressure}}

{{responseSentence}} {{practiceClosingLine}}`;

export const SKY_PLACEMENT_PLANET_SIGN_NATAL_TEMPLATE = `{{planetTitle}} was in {{signTitle}} when you were born. {{planetTitle}} describes {{planetFunction}}, while {{signTitle}} pursues {{signCoreDrive}} through {{signMethod}}. {{placementThesis}}

{{placementDignityMeaning}}

{{experienceGeneral}} {{placementOpportunity}}

The challenge

{{placementPressure}}

{{responseSentence}} {{practiceClosingLine}}`;
