export const MUSTACHE_MADLIBS_VERSION = "tldr-astro-content-runtime-correction-v2.3.0";

export type MustacheTemplateId =
  | "home.daily"
  | "home.moon_phase"
  | "home.moon_sign"
  | "home.planetary.card"
  | "home.planetary.detail"
  | "transit.short"
  | "transit.long"
  | "natal.placement"
  | "natal.angle"
  | "natal.aspect"
  | "sky.planet_sign.card"
  | "sky.planet_sign.detail"
  | "sky.aspect"
  | "sky.retrograde.passage"
  | "sky.station"
  | "sky.ingress"
  | "source_gap";

export type MustacheContext = Record<string, unknown>;

export const MUSTACHE_MADLIB_TEMPLATES: Record<MustacheTemplateId, string> = {
  "home.daily": "{{#primary}}\n{{ui.headline}}\n\n{{primary.lived_situation}}\n{{#primary.development}}\n\n{{primary.development}}\n{{/primary.development}}\n{{#action.proportionate_response}}\n\n{{action.proportionate_response}}\n{{/action.proportionate_response}}\n{{/primary}}\n{{^primary}}\n{{> source_gap}}\n{{/primary}}",
  "home.moon_phase": "{{#primary}}\n{{ui.phase_label}}\n{{ui.phase_name}}\n\n{{primary.cycle_function}}\n{{#action.phase_appropriate_action}} {{action.phase_appropriate_action}}{{/action.phase_appropriate_action}}\n{{/primary}}\n{{^primary}}\n{{> source_gap}}\n{{/primary}}",
  "home.moon_sign": "{{#primary}}\n{{ui.sign_label}}\n{{facts.moon_sign}}\n\n{{primary.embodied_weather}}\n{{#action.short_guidance}} {{action.short_guidance}}{{/action.short_guidance}}\n{{/primary}}\n{{^primary}}\n{{> source_gap}}\n{{/primary}}",
  "home.planetary.card": "{{facts.body}} in {{facts.sign}}\n{{facts.start_date}} - {{facts.end_date}}\n{{#primary.compact_claim}}{{primary.compact_claim}}{{/primary.compact_claim}}",
  "home.planetary.detail": "{{facts.body}} in {{facts.sign}}\n{{facts.start_date}} - {{facts.end_date}}\n\n{{#primary}}\n{{primary.house_localized_claim}}\n{{#primary.reflective_development}}\n\n{{primary.reflective_development}}\n{{/primary.reflective_development}}\n{{#action.personal_response}}\n\n{{action.personal_response}}\n{{/action.personal_response}}\n{{/primary}}\n{{^primary}}\n{{> source_gap}}\n{{/primary}}",
  "transit.short": "{{ui.editorial_headline}}\n\n{{facts.start_date}} - {{facts.end_date}}{{#facts.exact_date}} · Exact {{facts.exact_date}}{{/facts.exact_date}}\n\n{{#primary}}\n{{primary.immediate_situation}}\n{{#primary.consequence_or_tension}}\n\n{{primary.consequence_or_tension}}\n{{/primary.consequence_or_tension}}\n{{#action.immediate_response}}\n\n{{action.immediate_response}}\n{{/action.immediate_response}}\n\nThe astro: {{technical.transiting_body}} {{technical.aspect_phrase}} your natal {{technical.natal_point}}{{#technical.natal_sign}} in {{technical.natal_sign}}{{/technical.natal_sign}}{{#technical.natal_house}} in the {{technical.natal_house}}{{/technical.natal_house}}.{{#technical.orb}} Orb: {{technical.orb}}.{{/technical.orb}}\n{{/primary}}\n{{^primary}}\n{{> source_gap}}\n{{/primary}}",
  "transit.long": "{{ui.editorial_headline}}\n\n{{facts.start_date}} - {{facts.end_date}} · Long-term{{#facts.pass_label}} · {{facts.pass_label}}{{/facts.pass_label}}\n\n{{#primary}}\n{{primary.recognizable_situation}}\n{{#primary.repeating_pattern}}\n\n{{primary.repeating_pattern}}\n{{/primary.repeating_pattern}}\n{{#primary.deeper_pressure}}\n\n{{primary.deeper_pressure}}\n{{/primary.deeper_pressure}}\n{{#action.long_term_response}}\n\n{{action.long_term_response}}\n{{/action.long_term_response}}\n{{#modifier.pass_context}}\n\n{{modifier.pass_context}}\n{{/modifier.pass_context}}\n\nThe astro: {{technical.transiting_body}} {{technical.aspect_phrase}} your natal {{technical.natal_point}}{{#technical.natal_sign}} in {{technical.natal_sign}}{{/technical.natal_sign}}{{#technical.natal_house}} in the {{technical.natal_house}}{{/technical.natal_house}}.{{#technical.orb}} Orb: {{technical.orb}}.{{/technical.orb}}\n{{/primary}}\n{{^primary}}\n{{> source_gap}}\n{{/primary}}",
  "natal.placement": "{{facts.body}} in {{facts.sign}} in the {{facts.house}}\n\n{{#primary}}\n{{primary.body_sign_story}}\n{{#primary.house_development}}\n\n{{primary.house_development}}\n{{/primary.house_development}}\n{{#modifier.sect}}\n\n{{modifier.sect}}\n{{/modifier.sect}}\n{{#modifier.retrograde}}\n\n{{modifier.retrograde}}\n{{/modifier.retrograde}}\n{{#modifier.dignity}}\n\n{{modifier.dignity}}\n{{/modifier.dignity}}\n{{#modifier.ruler_bridge}}\n\n{{modifier.ruler_bridge}}\n{{/modifier.ruler_bridge}}\n{{#modifier.supportive_aspect}}\n\n{{modifier.supportive_aspect}}\n{{/modifier.supportive_aspect}}\n{{#modifier.challenging_aspect}}\n\n{{modifier.challenging_aspect}}\n{{/modifier.challenging_aspect}}\n{{/primary}}\n{{^primary}}\n{{> source_gap}}\n{{/primary}}",
  "natal.angle": "{{facts.angle}} in {{facts.sign}}\n\n{{#primary}}\n{{primary.angle_lived_expression}}\n{{#primary.sign_development}}\n\n{{primary.sign_development}}\n{{/primary.sign_development}}\n{{#modifier.ruler_bridge}}\n\n{{modifier.ruler_bridge}}\n{{/modifier.ruler_bridge}}\n{{#modifier.exact_aspect}}\n\n{{modifier.exact_aspect}}\n{{/modifier.exact_aspect}}\n{{/primary}}\n{{^primary}}\n{{> source_gap}}\n{{/primary}}",
  "natal.aspect": "{{facts.body_a}} {{facts.aspect_name}} {{facts.body_b}}\n\n{{#primary}}\n{{primary.fused_or_conflicted_situation}}\n{{#primary.repeating_expression}}\n\n{{primary.repeating_expression}}\n{{/primary.repeating_expression}}\n{{#action.integration}}\n\n{{action.integration}}\n{{/action.integration}}\n{{/primary}}\n{{^primary}}\n{{> source_gap}}\n{{/primary}}",
  "sky.planet_sign.card": "{{facts.body}} in {{facts.sign}}: {{primary.compact_collective_claim}}",
  "sky.planet_sign.detail": "{{facts.body}} in {{facts.sign}}\n{{facts.start_date}} - {{facts.end_date}}\n\n{{#primary}}\n{{primary.collective_shift}}\n{{#primary.recognizable_collective_situation}}\n\n{{primary.recognizable_collective_situation}}\n{{/primary.recognizable_collective_situation}}\n{{#action.collective_response}}\n\n{{action.collective_response}}\n{{/action.collective_response}}\n{{/primary}}\n{{^primary}}\n{{> source_gap}}\n{{/primary}}",
  "sky.aspect": "{{facts.body_a}} {{facts.aspect_name}} {{facts.body_b}}\n{{#facts.exact_date}}{{facts.exact_date}}{{/facts.exact_date}}\n\n{{#primary}}\n{{primary.collective_contact_situation}}\n{{#primary.development}}\n\n{{primary.development}}\n{{/primary.development}}\n{{#action.response}}\n\n{{action.response}}\n{{/action.response}}\n{{/primary}}\n{{^primary}}\n{{> source_gap}}\n{{/primary}}",
  "sky.retrograde.passage": "{{facts.body}} Rx in {{facts.sign}}\n{{facts.retrograde_start}} - {{facts.retrograde_end}}\n\n{{#primary}}\n{{primary.review_situation}}\n{{#primary.return_or_complication}}\n\n{{primary.return_or_complication}}\n{{/primary.return_or_complication}}\n{{#action.review_action}}\n\n{{action.review_action}}\n{{/action.review_action}}\n{{#modifier.phase_context}}\n\n{{modifier.phase_context}}\n{{/modifier.phase_context}}\n{{/primary}}\n{{^primary}}\n{{> source_gap}}\n{{/primary}}",
  "sky.station": "{{facts.body}} stations {{facts.station_type}} in {{facts.sign}}\n{{facts.station_date}}\n\n{{#primary}}\n{{primary.turning_point}}\n{{#action.station_response}}\n\n{{action.station_response}}\n{{/action.station_response}}\n{{/primary}}\n{{^primary}}\n{{> source_gap}}\n{{/primary}}",
  "sky.ingress": "{{ui.event_title}}\n{{facts.start_date}}{{#facts.end_date}} - {{facts.end_date}}{{/facts.end_date}}\n\n{{#primary}}\n{{primary.event_change}}\n{{#primary.recognizable_situation}}\n\n{{primary.recognizable_situation}}\n{{/primary.recognizable_situation}}\n{{#action.event_response}}\n\n{{action.event_response}}\n{{/action.event_response}}\n{{/primary}}\n{{^primary}}\n{{> source_gap}}\n{{/primary}}",
  source_gap: "{{#ui.diagnostic_mode}}\nSOURCE_GAP: No eligible reviewed source exists for {{facts.surface_key}}.\n{{/ui.diagnostic_mode}}"
};

export function renderMustacheMadlib(templateId: MustacheTemplateId, context: MustacheContext) {
  const template = MUSTACHE_MADLIB_TEMPLATES[templateId];
  if (!template) {
    throw new Error(`Unknown v2.3.0 Mustache template: ${templateId}`);
  }

  return normalizeRenderedWhitespace(renderTemplate(expandPartials(template), context));
}

export function unresolvedMustacheTokens(value: string) {
  return value.match(/\{\{[^}]+\}\}/g) ?? [];
}

function expandPartials(template: string) {
  return template.replace(/\{\{>\s*source_gap\s*\}\}/g, MUSTACHE_MADLIB_TEMPLATES.source_gap);
}

function renderTemplate(template: string, context: MustacheContext): string {
  const withSections = template
    .replace(/\{\{#([a-zA-Z0-9_.-]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_match, key: string, body: string) => {
      const value = lookup(context, key);
      if (Array.isArray(value)) {
        return value.map((item) => renderTemplate(body.replace(/\{\{\.\}\}/g, String(item)), { ...context, ".": item })).join("");
      }
      return isTruthy(value) ? renderTemplate(body, context) : "";
    })
    .replace(/\{\{\^([a-zA-Z0-9_.-]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_match, key: string, body: string) => (
      isTruthy(lookup(context, key)) ? "" : renderTemplate(body, context)
    ));

  return withSections.replace(/\{\{([a-zA-Z0-9_.-]+)\}\}/g, (_match, key: string) => {
    const value = lookup(context, key);
    return value === undefined || value === null ? "" : escapeMustacheValue(String(value));
  });
}

function lookup(context: MustacheContext, key: string): unknown {
  if (key === ".") return context["."];
  return key.split(".").reduce<unknown>((value, part) => {
    if (value && typeof value === "object" && part in value) {
      return (value as Record<string, unknown>)[part];
    }
    return undefined;
  }, context);
}

function isTruthy(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
}

function escapeMustacheValue(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizeRenderedWhitespace(value: string) {
  return value
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
