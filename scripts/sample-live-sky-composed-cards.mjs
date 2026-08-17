#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  componentApprovalPayload,
  componentPayloadSha256,
} from "./sky-calendar-component-approval.mjs";
import {
  assertSkyCalendarServingAuthorization,
  loadSkyCalendarServingAuthorization,
} from "./sky-calendar-serving-authorization.mjs";
import {
  loadSkyCalendarComponentRegistry,
} from "./sky-calendar-two-part-composer.mjs";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function registryIndex(registry) {
  return new Map([
    ...(registry.signUnits ?? []),
    ...(registry.aspectMechanisms ?? []),
    ...(registry.modalityUnits ?? []),
    ...(registry.elementUnits ?? []),
  ].map((unit) => [unit.key, unit]));
}

function normalizeCards(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.cards)) return value.cards;
  throw new Error("Live composed-card input must be an array or an object with a cards array");
}

function assertLiveCard(card, authorizationMetadata) {
  if (card.status !== "COMPOSER AUTHORIZED" || card.generationAllowed !== true) {
    throw new Error(`${card.contentKey ?? "unknown"}: audit input is not a live composer-authorized card`);
  }
  for (const field of ["composerVersion", "composerSourceSha256", "componentSetSha256"]) {
    if (card.servingAuthorization?.[field] !== authorizationMetadata[field]) {
      throw new Error(`${card.contentKey}: live card ${field} does not match the active serving authorization`);
    }
  }
}

export function sampleLiveSkyComposedCards({
  cards,
  registry,
  authorization,
  count,
  seed = crypto.randomBytes(16).toString("hex"),
  repoRoot = process.cwd(),
  sampledAt = new Date().toISOString(),
}) {
  const authorizationMetadata = assertSkyCalendarServingAuthorization(registry, authorization, { repoRoot });
  const liveCards = normalizeCards(cards);
  if (!Number.isInteger(count) || count < 1) throw new Error("--count must be a positive integer");
  if (count > liveCards.length) {
    throw new Error(`Requested ${count} cards, but the live input contains only ${liveCards.length}`);
  }
  const duplicateKeys = liveCards
    .map((card) => card.contentKey)
    .filter((key, index, values) => values.indexOf(key) !== index);
  if (duplicateKeys.length > 0) throw new Error(`Live input contains duplicate content keys: ${[...new Set(duplicateKeys)].join(", ")}`);
  liveCards.forEach((card) => assertLiveCard(card, authorizationMetadata));

  const index = registryIndex(registry);
  const selected = liveCards
    .map((card) => ({ card, rank: sha256(`${seed}\u0000${card.contentKey}`) }))
    .sort((left, right) => left.rank.localeCompare(right.rank))
    .slice(0, count)
    .map(({ card }) => {
      const componentInputs = Object.fromEntries(
        Object.entries(card.inputs?.componentKeys ?? {})
          .filter(([, key]) => Boolean(key))
          .map(([slot, key]) => {
            const unit = index.get(key);
            if (!unit) throw new Error(`${card.contentKey}: missing component input ${key}`);
            return [slot, {
              key,
              payloadSha256: componentPayloadSha256(unit),
              payload: componentApprovalPayload(unit),
            }];
          }),
      );
      return {
        contentKey: card.contentKey,
        forecast: card.forecast,
        details: card.details,
        entryMode: card.entryMode,
        closingFunction: card.closingFunction,
        componentInputs,
        realizationSelections: card.inputs?.realizationSelections ?? null,
        servingAuthorization: card.servingAuthorization,
      };
    });

  return {
    schema: "tldr.sky-calendar.composed-card-owner-audit-sample.v1",
    sampledAt,
    seed,
    requestedCount: count,
    livePopulationCount: liveCards.length,
    authorization: authorizationMetadata,
    cards: selected,
  };
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) throw new Error(`Unexpected argument ${value}`);
    const [name, inline] = value.slice(2).split("=", 2);
    args[name] = inline ?? argv[++index];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input) {
    throw new Error("Usage: node scripts/sample-live-sky-composed-cards.mjs --input <live-cards.json> --count <N> [--out <sample.json>] [--seed <seed>]");
  }
  const registry = loadSkyCalendarComponentRegistry();
  const authorization = loadSkyCalendarServingAuthorization();
  const cards = JSON.parse(fs.readFileSync(path.resolve(args.input), "utf8"));
  const sample = sampleLiveSkyComposedCards({
    cards,
    registry,
    authorization,
    count: Number(args.count ?? 12),
    seed: args.seed,
  });
  const rendered = `${JSON.stringify(sample, null, 2)}\n`;
  if (args.out) {
    fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
    fs.writeFileSync(path.resolve(args.out), rendered);
    console.log(`Wrote ${sample.cards.length} live composed cards to ${path.resolve(args.out)}`);
  } else {
    process.stdout.write(rendered);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
