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

function buildPrompt(input: GenerateContentInput) {
  const styleGuide = readTextFile("packages/astro-knowledge/voice/tldr-astro/style-guide.md");
  const headlineRule = input.headline
    ? [
        "HEADLINE RULE",
        `Return this exact headline string: ${JSON.stringify(input.headline)}.`,
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
    "EXTRA VOICE NOTES",
    input.voiceNotes ?? "None."
  ].join("\n");
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
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: buildPrompt(input),
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
    ...parseResponseJson(outputText, input.headline),
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
