#!/usr/bin/env node
"use strict";

const assert = require("assert");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const { buildFactGatedStructure, buildPacket, factStatusAllowsWriting, renderModelInput } = require(path.join(repoRoot, ".agents", "skills", "marie-satori-writer", "scripts", "compile-writing-packet.js"));
const { lintArticle } = require("./lint-placement-voice.js");
const { buildJudgePrompt } = require("./judge-placement-voice.js");
const placementSpec = require(path.join("..", "voice", "tldr-astro", "sky-placement.json"));

function packet(engineFacts = {}) {
  return buildPacket({
    planet: "jupiter",
    sign: "libra",
    requestedBeat: "full_article",
    emphasisBeat: "turn",
    task: "Compile a no-call Jupiter in Libra structural-slot dry run.",
    engineFacts
  });
}

function baseArticle(extra = {}) {
  return {
    planet: "jupiter",
    sign: "libra",
    hook: "A shared decision changes after someone says no. Jupiter in Libra makes fairness visible.",
    lived: "Jupiter spends about a year in a sign. The agreement changes after the answer.",
    turn: "The delay becomes the cost. The choice cannot stay open.",
    moves: ["Name the answer before agreeing.", "Change the plan after someone says no."],
    ...extra
  };
}

function main() {
  const noEngineFacts = packet();
  const noEnginePrompt = renderModelInput(noEngineFacts);
  assert.strictEqual(factStatusAllowsWriting("DRAFT"), false);
  assert.strictEqual(factStatusAllowsWriting("REVIEWED"), true);
  assert.strictEqual(factStatusAllowsWriting("LIVE"), true);
  assert.strictEqual(factStatusAllowsWriting("APPROVED"), true);
  assert(noEngineFacts.structuralSlots.active.some((entry) => entry.id === "cycle-line"));
  assert(!noEngineFacts.structuralSlots.active.some((entry) => entry.id === "prior-sign-handoff"));
  assert(!noEngineFacts.structuralSlots.active.some((entry) => entry.id === "concurrent-events"));
  assert(!/PRIOR-SIGN-HANDOFF\n/u.test(noEnginePrompt));
  assert(!/CONCURRENT-EVENTS\n/u.test(noEnginePrompt));

  const handoff = packet({
    priorSign: "cancer",
    priorSignEntryDate: "{{priorSignEntryDate}}",
    priorSignExitDate: "{{priorSignExitDate}}",
    eventsDuringTransit: []
  });
  const handoffPrompt = renderModelInput(handoff);
  assert(handoff.structuralSlots.active.some((entry) => entry.id === "prior-sign-handoff"));
  assert.match(handoffPrompt, /PRIOR-SIGN-HANDOFF[\s\S]*?"priorSign": "cancer"/u);
  assert(!/CONCURRENT-EVENTS\n/u.test(handoffPrompt));
  assert.strictEqual(handoff.voiceDevices.maxPerArticle, 2, "structural slots must not consume the two-device voice cap");

  const cycleLocation = packet({ previousResidency: { sign: "libra", entryDate: "{{previousResidencyEntryDate}}", exitDate: "{{previousResidencyExitDate}}" } });
  assert.strictEqual(cycleLocation.structuralSlots.active.find((entry) => entry.id === "cycle-location")?.continuousFallbackTarget, "development");

  const moonStructure = buildFactGatedStructure({
    planet: "moon",
    surface: placementSpec,
    engineFacts: {
      priorSign: "cancer",
      priorSignEntryDate: "{{priorSignEntryDate}}",
      priorSignExitDate: "{{priorSignExitDate}}"
    }
  });
  assert(!moonStructure.active.some((entry) => ["prior-sign-handoff", "cycle-line"].includes(entry.id)), "Moon ingress structure remains excluded");

  const withEvents = packet({
    eventsDuringTransit: [
      {
        id: "south-node-enters-libra",
        body: "south-node",
        eventType: "ingress",
        date: "{{eventDate1}}",
        meaning: "The South Node audits what has become excessive or automatic.",
        meaningSource: "packages/astro-knowledge/data/modifiers/node-meanings.json"
      }
    ]
  });
  const eventPrompt = renderModelInput(withEvents);
  assert(withEvents.structuralSlots.active.some((entry) => entry.id === "concurrent-events"));
  assert(withEvents.structuralSlots.active.every((entry) => entry.maxOccurrences === 1));
  assert.match(eventPrompt, /CONCURRENT-EVENTS[\s\S]*?south-node-enters-libra/u);
  assert.match(eventPrompt, /The engine renders this block; do not add a new output key/u);

  const suppliedRange = lintArticle(baseArticle({
    cycleLocation: "Jupiter was last in Leo from July 2014 to August 2015.",
    factContext: { previousResidency: { entryDate: "July 2014", exitDate: "August 2015" } }
  }));
  assert.strictEqual(suppliedRange.score, 3);
  assert(!suppliedRange.findings.some((entry) => entry.source === "fact-trace"));

  const unsuppliedRange = lintArticle(baseArticle({
    cycleLocation: "Jupiter was last in Leo from July 2014 to August 2015."
  }));
  assert.strictEqual(unsuppliedRange.score, 1);
  assert(unsuppliedRange.findings.some((entry) => entry.term === "untraced-date"));

  const wrongEvent = lintArticle(baseArticle({
    concurrentEvents: "Saturn enters Libra in September 2028.",
    factContext: { eventsDuringTransit: [{ id: "south-node-enters-libra", body: "south-node", date: "September 2028" }] }
  }));
  assert.strictEqual(wrongEvent.score, 1);
  assert(wrongEvent.findings.some((entry) => entry.term === "event-not-supplied" && entry.match === "saturn"));

  const appositive = lintArticle(baseArticle({
    priorSignHandoff: "Jupiter, the planet of growth, abundance, and luck, leaves Cancer."
  }));
  assert.strictEqual(appositive.score, 1);
  assert(appositive.findings.some((entry) => entry.term === "appositive-planet-definition"));

  const celebrity = lintArticle(baseArticle({
    cycleLocation: "Taylor Swift became famous during the last cycle."
  }));
  assert.strictEqual(celebrity.score, 1);
  assert(celebrity.findings.some((entry) => entry.term === "celebrity-reference"));

  const celebrityShortForm = lintArticle(baseArticle({
    cycleLocation: "Taylor became famous during the last cycle."
  }));
  assert(!celebrityShortForm.findings.some((entry) => entry.term === "celebrity-reference"), "unregistered celebrity short forms are judge-only");

  const meme = lintArticle(baseArticle({
    turn: "The delay becomes the main character era. The choice cannot stay open."
  }));
  assert.strictEqual(meme.score, 1);
  assert(meme.findings.some((entry) => /main character/u.test(entry.match || "")));

  const judgePrompt = buildJudgePrompt(baseArticle(), { planet: "jupiter", sign: "libra", tier: "social" });
  assert.match(judgePrompt, /neither a cycle line nor any clear teaching/u);
  assert.match(judgePrompt, /event absent from the supplied eventsDuringTransit facts/u);
  assert.match(judgePrompt, /Celebrity references, pop-culture examples/u);
  assert.match(judgePrompt, /recognizable short forms, surnames, mononyms, stage names, and nicknames/u);

  console.log("Sky Placement fact-gated structural slots: packet gating, temporal provenance, event validation, exclusions, and judge rules passed.");
}

main();
