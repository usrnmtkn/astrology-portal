import fs from "node:fs";
import path from "node:path";

type ContentMode = "feed" | "in_depth" | "article";
type Surface = "sky" | "you" | "natal" | "synastry" | "composite" | "relationship";

export type GenerateContentInput = {
  contentKey: string;
  surface: Surface;
  mode: ContentMode;
  eventType: string;
  headline?: string;
  targetDate?: string;
  facts: Record<string, unknown>;
  knowledgeIds?: string[];
  sourceSnapshot?: Record<string, unknown>;
  voiceNotes?: string;
};

type GeneratedContent = {
  headline: string;
  summary: string;
  body: string;
  sections?: Array<{
    heading: string;
    body: string;
  }>;
};

type StoredGeneratedContent = GeneratedContent & {
  responseId?: string;
  model: string;
};

type ApprovedExampleRow = {
  content_key?: string | null;
  surface?: string | null;
  mode?: string | null;
  event_type?: string | null;
  target_date?: string | null;
  headline?: string | null;
  summary?: string | null;
  body?: string | null;
  sections?: unknown;
  status?: string | null;
};

type ApprovedExample = {
  contentKey: string;
  surface: string;
  mode: string;
  eventType: string;
  targetDate: string;
  headline: string;
  summary: string;
  body: string;
};

const promptVersion = "tldr-astro-v1";
const defaultModel = "gpt-4.1-mini";
const fallbackStyleGuide = [
  "# TLDR Astro Voice",
  "",
  "TLDR Astro translates astrology into lived experience.",
  "Write like an insightful observer who can also give useful advice. The voice should feel human, direct, emotionally intelligent, and grounded in real life.",
  "",
  "Core rules:",
  "- Start with lived experience.",
  "- Let astrology explain the experience, not replace it.",
  "- Use soft certainty for natal identity: may, can, often, might, there can be, you may notice.",
  "- Use clearer action language for transits and current sky: get it in writing, narrow the field, wait a day, name the issue, make the call.",
  "- Do not use em dashes.",
  "- Do not use self-help language.",
  "- Do not use therapy language unless explicitly source-backed.",
  "- Do not invent childhood causes, trauma claims, karmic explanations, or psychological diagnoses.",
  "- Do not use \"you are\" as an identity statement.",
  "- Do not use \"this placement asks you to,\" \"this aspect teaches you,\" or \"the lesson is.\"",
  "- Do not call out backend distinctions in user-facing copy, such as \"this is not a permanent trait,\" \"source-backed,\" or \"authored from approved material.\"",
  "- Translate source symbolism into concrete human experience.",
  "",
  "Preferred short structure: headline, what the reader may notice, why, what to do, timing.",
  "The reader should leave knowing why they may feel, think, remember, want, avoid, or react a certain way, and what is useful to do with that information.",
  "",
  "Sky content is current weather. Write about the moment, the day, the season, or the active transit. Do not write it as a natal personality trait.",
  "Relationship content should describe what happens between two people, not two separate natal descriptions stitched together.",
  "If a factual astrology headline is supplied, preserve it exactly. Put the human theme in the summary or body, not in the headline."
].join("\n");

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function readTextFile(relativePath: string) {
  try {
    return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
  } catch {
    return fallbackStyleGuide;
  }
}

function modeRules(mode: ContentMode) {
  if (mode === "feed") {
    return [
      "Feed Mode: quick daily insight.",
      "Length: one or two paragraphs.",
      "Structure: headline, what the reader may notice, why, what to do, timing.",
      "Tone: immediate, social, specific, and useful."
    ].join("\n");
  }

  if (mode === "in_depth") {
    return [
      "In-Depth Mode: explain a major transit, placement, or relationship pattern.",
      "Length: three to five paragraphs.",
      "Structure: what is being activated, likely lived experience, why it feels that way, useful action or reflection.",
      "Tone: direct, readable, emotionally specific."
    ].join("\n");
  }

  return [
    "Article Mode: collective astrology and lunar events.",
    "Length: full essay.",
    "Structure: event opening, key aspects, collective meaning, personal application, reflection questions when useful.",
    "Tone: lyrical but concrete, mythic but understandable."
  ].join("\n");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function compactBody(value: string, maxLength = 1400) {
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength).trim()}...` : trimmed;
}

function exampleFromRow(row: ApprovedExampleRow): ApprovedExample | null {
  const headline = stringValue(row.headline);
  const summary = stringValue(row.summary);
  const body = stringValue(row.body);

  if (!headline || !body) {
    return null;
  }

  return {
    contentKey: stringValue(row.content_key),
    surface: stringValue(row.surface),
    mode: stringValue(row.mode),
    eventType: stringValue(row.event_type),
    targetDate: stringValue(row.target_date),
    headline,
    summary,
    body: compactBody(body)
  };
}

function factRecord(facts: Record<string, unknown>, key: string) {
  const value = facts[key];
  return isRecord(value) ? value : null;
}

function aspectHeadline(aspect: Record<string, unknown>) {
  const from = stringValue(aspect.from);
  const type = stringValue(aspect.type);
  const to = stringValue(aspect.to);

  return from && type && to ? `${from} ${type} ${to}` : "";
}

function seasonHeadline(sun: Record<string, unknown> | null) {
  const sign = stringValue(sun?.sign);
  return sign ? `${sign} Season` : "";
}

function moonHeadline(facts: Record<string, unknown>) {
  const moon = factRecord(facts, "moon");
  const sign = stringValue(moon?.sign);
  const supportingAspect = factRecord(facts, "supportingAspect");

  if (!sign) {
    return "";
  }

  if (supportingAspect) {
    const type = stringValue(supportingAspect.type);
    const from = stringValue(supportingAspect.from);
    const to = stringValue(supportingAspect.to);
    const otherPlanet = from === "Moon" ? to : from;

    if (type && otherPlanet) {
      return `Moon in ${sign} ${type} ${otherPlanet}`;
    }
  }

  return `Moon in ${sign}`;
}

function retrogradeHeadline(facts: Record<string, unknown>) {
  const planet = factRecord(facts, "planet");
  const planetName = stringValue(planet?.planet);
  return planetName ? `${planetName} retrograde` : "";
}

function lunationHeadline(facts: Record<string, unknown>) {
  const moonEvent = factRecord(facts, "moonEvent");
  const name = stringValue(moonEvent?.name);
  const sign = stringValue(moonEvent?.sign);

  return name && sign ? `${name} in ${sign}` : "";
}

function dailySkyHeadline(facts: Record<string, unknown>) {
  const sunSign = stringValue(factRecord(facts, "sun")?.sign);
  const moonSign = stringValue(factRecord(facts, "moon")?.sign);
  const parts = [
    sunSign ? `${sunSign} Season` : "",
    moonSign ? `${moonSign} Moon` : ""
  ].filter(Boolean);

  return parts.join(", ");
}

function factualHeadlineFor(input: GenerateContentInput) {
  const supplied = stringValue(input.headline);

  if (supplied) {
    return supplied;
  }

  const facts = input.facts;
  const type = stringValue(facts.type) || input.eventType;
  const aspect = factRecord(facts, "aspect");

  if (aspect) {
    const headline = aspectHeadline(aspect);
    if (headline) {
      return headline;
    }
  }

  if (type === "seasonal_weather") {
    return seasonHeadline(factRecord(facts, "sun"));
  }

  if (type === "lunar_weather") {
    return moonHeadline(facts);
  }

  if (type === "retrograde") {
    return retrogradeHeadline(facts);
  }

  if (type === "lunation") {
    return lunationHeadline(facts);
  }

  if (type === "daily_overview" || input.eventType === "daily-sky") {
    return dailySkyHeadline(facts);
  }

  return "";
}

function approvedExamplesPrompt(examples: ApprovedExample[]) {
  if (!examples.length) {
    return "No approved examples available yet.";
  }

  return examples.map((example, index) => [
    `APPROVED EXAMPLE ${index + 1}`,
    `Surface: ${example.surface || "unknown"}`,
    `Mode: ${example.mode || "unknown"}`,
    `Event type: ${example.eventType || "unknown"}`,
    example.targetDate ? `Target date: ${example.targetDate}` : "",
    `Headline: ${example.headline}`,
    example.summary ? `Summary: ${example.summary}` : "",
    "Body:",
    example.body
  ].filter(Boolean).join("\n")).join("\n\n");
}

function buildPrompt(input: GenerateContentInput, approvedExamples: ApprovedExample[] = []) {
  const styleGuide = readTextFile("packages/astro-knowledge/voice/tldr-astro/style-guide.md");
  const lockedHeadline = factualHeadlineFor(input);
  const headlineRule = lockedHeadline
    ? [
        "HEADLINE RULE",
        `Return this exact headline string: ${JSON.stringify(lockedHeadline)}.`,
        "Do not rewrite it as a human-theme title. Keep the headline as the astrology aspect, placement, transit, season, retrograde, or lunation label.",
        "Put the readable hook, advice, and emotional interpretation in summary and body."
      ].join("\n")
    : [
        "HEADLINE RULE",
        "Use a factual astrology headline whenever possible, such as Mercury square Neptune, Moon in Aquarius trine Uranus, Gemini Season, Pluto retrograde, or New Moon in Cancer.",
        "Do not replace the astrology headline with a purely editorial theme."
      ].join("\n");

  return [
    styleGuide,
    "",
    "TASK",
    "Write one TLDR Astro interpretation from the provided astrology facts and source material.",
    "Do not invent astrology. Every interpretive claim must be supported by the facts or source snapshot.",
    "Do not mention the knowledge base, source rows, backend, prompt, or review status.",
    "Do not use em dashes.",
    "Return JSON only.",
    "",
    headlineRule,
    "",
    "CONTENT MODE",
    modeRules(input.mode),
    "",
    "SURFACE",
    input.surface,
    "",
    "EVENT TYPE",
    input.eventType,
    "",
    "TARGET DATE",
    input.targetDate ?? "not specified",
    "",
    "ASTROLOGY FACTS",
    JSON.stringify(input.facts, null, 2),
    "",
    "SOURCE SNAPSHOT",
    JSON.stringify(input.sourceSnapshot ?? {}, null, 2),
    "",
    "APPROVED TLDR ASTRO EXAMPLES",
    "Use these only as examples of voice, pacing, specificity, structure, and editorial quality.",
    "Do not copy their astrology facts unless they are also present in ASTROLOGY FACTS for the current task.",
    approvedExamplesPrompt(approvedExamples),
    "",
    "EXTRA VOICE NOTES",
    input.voiceNotes ?? "None."
  ].join("\n");
}

function supabaseUrl() {
  return process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
}

function approvedExampleQueryUrl(input: GenerateContentInput, eventType?: string, limit = 3) {
  const baseUrl = supabaseUrl();

  if (!baseUrl) {
    return "";
  }

  const params = new URLSearchParams({
    select: "content_key,surface,mode,event_type,target_date,headline,summary,body,sections,status",
    status: "in.(LIVE,REVIEWED)",
    surface: `eq.${input.surface}`,
    mode: `eq.${input.mode}`,
    content_key: `neq.${input.contentKey}`,
    order: "updated_at.desc",
    limit: String(limit)
  });

  if (eventType) {
    params.set("event_type", `eq.${eventType}`);
  }

  return `${baseUrl}/rest/v1/generated_interpretations?${params.toString()}`;
}

async function loadApprovedExamples(input: GenerateContentInput) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    return [];
  }

  const eventType = input.eventType.trim();
  const queries = [
    approvedExampleQueryUrl(input, eventType, 3),
    approvedExampleQueryUrl(input, undefined, 3)
  ].filter(Boolean);
  const examples: ApprovedExample[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    if (examples.length >= 3) {
      break;
    }

    try {
      const response = await fetch(query, {
        headers: {
          apikey: serviceRoleKey,
          authorization: `Bearer ${serviceRoleKey}`
        }
      });

      if (!response.ok) {
        continue;
      }

      const rows = await response.json() as ApprovedExampleRow[];

      for (const row of rows) {
        const example = exampleFromRow(row);
        const key = example?.contentKey;

        if (!example || !key || seen.has(key)) {
          continue;
        }

        seen.add(key);
        examples.push(example);

        if (examples.length >= 3) {
          break;
        }
      }
    } catch {
      continue;
    }
  }

  return examples;
}

function parseResponseJson(raw: string, lockedHeadline?: string): GeneratedContent {
  const parsed = JSON.parse(raw) as Partial<GeneratedContent>;

  if (!parsed.headline || !parsed.summary || !parsed.body) {
    throw new Error("OpenAI response did not include headline, summary, and body.");
  }

  return {
    headline: lockedHeadline ?? parsed.headline,
    summary: parsed.summary,
    body: parsed.body,
    sections: parsed.sections ?? []
  };
}

function responseOutputText(payload: {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
    }>;
  }>;
}) {
  if (payload.output_text) {
    return payload.output_text;
  }

  return payload.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .filter((text): text is string => Boolean(text))
    .join("\n")
    .trim();
}

export async function generateWithOpenAI(input: GenerateContentInput): Promise<StoredGeneratedContent> {
  const apiKey = requireEnv("OPENAI_API_KEY");
  const model = process.env.OPENAI_MODEL ?? defaultModel;
  const lockedHeadline = factualHeadlineFor(input);
  const approvedExamples = await loadApprovedExamples(input);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: buildPrompt(input, approvedExamples),
      text: {
        format: {
          type: "json_schema",
          name: "tldr_astro_generated_content",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["headline", "summary", "body", "sections"],
            properties: {
              headline: { type: "string" },
              summary: { type: "string" },
              body: { type: "string" },
              sections: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["heading", "body"],
                  properties: {
                    heading: { type: "string" },
                    body: { type: "string" }
                  }
                }
              }
            }
          }
        }
      }
    })
  });

  const payload = await response.json() as {
    id?: string;
    output_text?: string;
    output?: Array<{
      content?: Array<{
        text?: string;
      }>;
    }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message ?? `OpenAI request failed with ${response.status}.`);
  }

  const outputText = responseOutputText(payload);

  if (!outputText) {
    throw new Error("OpenAI response did not include generated text.");
  }

  return {
    ...parseResponseJson(outputText, lockedHeadline || undefined),
    responseId: payload.id,
    model
  };
}

export async function saveGeneratedInterpretation(input: GenerateContentInput, generated: StoredGeneratedContent) {
  const supabaseUrl = process.env.SUPABASE_URL ?? requireEnv("VITE_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(`${supabaseUrl}/rest/v1/generated_interpretations?on_conflict=content_key,target_date,mode`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify({
      content_key: input.contentKey,
      surface: input.surface,
      mode: input.mode,
      status: "DRAFT",
      event_type: input.eventType,
      target_date: input.targetDate,
      facts: input.facts,
      knowledge_ids: input.knowledgeIds ?? [],
      source_snapshot: input.sourceSnapshot ?? {},
      prompt_version: promptVersion,
      model: generated.model,
      headline: generated.headline,
      summary: generated.summary,
      body: generated.body,
      sections: generated.sections ?? {},
      openai_response_id: generated.responseId
    })
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Supabase save failed with ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload;
}

export function loadSkySourceSnapshot() {
  const skyPath = path.join(process.cwd(), "packages/astro-knowledge/dist/sky.json");
  const sky = JSON.parse(fs.readFileSync(skyPath, "utf8")) as {
    transits?: Array<Record<string, unknown>>;
    primitives?: Record<string, unknown>;
  };

  return {
    primitives: sky.primitives,
    transits: (sky.transits ?? []).slice(0, 12)
  };
}
