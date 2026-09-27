import assert from "node:assert/strict";
import { test } from "node:test";
import { formatLunationTemplateInstruction } from "../api/_lib/content-generation.ts";

// Requires packages/astro-knowledge/dist/sky.json (npm run build -w @tldr/astro-knowledge).
const base = { surface: "sky", mode: "article", eventType: "full-moon", targetDate: "2026-09-26", sourceSnapshot: {} };

test("a Full Moon article prompt receives the reasoning chain and full-moon logic", () => {
  const text = formatLunationTemplateInstruction({
    ...base,
    facts: { type: "lunation", moonEvent: { name: "Full Moon", sign: "Aries" }, reasoning: { status: "complete" } }
  });
  assert.match(text, /^LUNATION AND INGRESS FRAMEWORK/u);
  assert.match(text, /Reasoning Chain:/u);
  assert.match(text, /1\. Sky anchor/u);
  assert.match(text, /Full Moon Logic:/u);
  assert.match(text, /reasoning\.governingPlanet/u);
  assert.doesNotMatch(text, /Eclipse Logic:/u);
});

test("without reasoning facts the prompt forbids uncalculated claims", () => {
  const text = formatLunationTemplateInstruction({ ...base, facts: { type: "lunation", moonEvent: { name: "New Moon" } } });
  assert.match(text, /No calculated reasoning facts were supplied/u);
  assert.match(text, /New Moon Logic:/u);
});

test("eclipses get eclipse logic and no ritual framework", () => {
  const text = formatLunationTemplateInstruction({ ...base, facts: { type: "lunation", moonEvent: { name: "Lunar Eclipse" } } });
  assert.match(text, /Eclipse Logic:/u);
  assert.doesNotMatch(text, /RITUAL PRACTICE FRAMEWORK/u);
});

test("ingress articles get ingress logic", () => {
  const text = formatLunationTemplateInstruction({ ...base, eventType: "ingress", facts: { type: "ingress" } });
  assert.match(text, /Ingress Logic:/u);
  assert.match(text, /True Lilith/u);
});

test("other Sky rows and other surfaces are untouched", () => {
  assert.equal(formatLunationTemplateInstruction({ ...base, facts: { type: "current_aspect" } }), "");
  assert.equal(formatLunationTemplateInstruction({ ...base, facts: { type: "daily_sky", moonEvent: { name: "Full Moon" } } }), "");
  assert.equal(formatLunationTemplateInstruction({ ...base, surface: "natal", facts: { type: "lunation" } }), "");
});
