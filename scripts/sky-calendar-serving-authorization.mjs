#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { componentSetSha256 } from "./sky-calendar-component-approval.mjs";

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const SKY_CALENDAR_COMPOSER_VERSION = "sky-calendar-two-part-composer-v2.2.0";
export const SKY_CALENDAR_SERVING_AUTHORIZATION_RECORD_PATH =
  "packages/astro-knowledge/review/sky-calendar-meaning-components-v1/serving-authorization.json";
export const SKY_CALENDAR_COMPOSER_SOURCE_FILES = Object.freeze([
  "scripts/sky-calendar-component-approval.mjs",
  "scripts/sky-calendar-frame-uniqueness.mjs",
  "scripts/sky-calendar-realization-types.mjs",
  "scripts/sky-calendar-serving-authorization.mjs",
  "scripts/sky-calendar-two-part-composer.mjs",
]);

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function allRegistryUnits(registry) {
  return [
    ...(registry.signUnits ?? []),
    ...(registry.aspectMechanisms ?? []),
    ...(registry.modalityUnits ?? []),
    ...(registry.elementUnits ?? []),
  ];
}

export function composerSourceSha256(repoRoot = moduleRoot) {
  const source = SKY_CALENDAR_COMPOSER_SOURCE_FILES.map((relativePath) => ({
    path: relativePath,
    sha256: sha256(fs.readFileSync(path.join(repoRoot, relativePath))),
  }));
  return sha256(JSON.stringify(source));
}

export function loadSkyCalendarServingAuthorization(
  recordPath = path.join(moduleRoot, SKY_CALENDAR_SERVING_AUTHORIZATION_RECORD_PATH),
) {
  return JSON.parse(fs.readFileSync(recordPath, "utf8"));
}

export class SkyCalendarServingAuthorizationError extends Error {
  constructor(code, message, detail = {}) {
    super(message);
    this.name = "SkyCalendarServingAuthorizationError";
    this.code = code;
    Object.assign(this, detail);
  }
}

export function assertSkyCalendarServingAuthorization(
  registry,
  authorization,
  { repoRoot = moduleRoot } = {},
) {
  const currentComponentSetSha256 = componentSetSha256(allRegistryUnits(registry));
  const currentComposerSourceSha256 = composerSourceSha256(repoRoot);

  if (authorization.composerVersion !== SKY_CALENDAR_COMPOSER_VERSION) {
    throw new SkyCalendarServingAuthorizationError(
      "sky-calendar-composer-version-mismatch",
      `Serving refused: authorized composer version ${authorization.composerVersion ?? "missing"} does not match ${SKY_CALENDAR_COMPOSER_VERSION}`,
      { authorized: authorization.composerVersion ?? null, current: SKY_CALENDAR_COMPOSER_VERSION },
    );
  }
  if (authorization.composerSourceSha256 !== currentComposerSourceSha256) {
    throw new SkyCalendarServingAuthorizationError(
      "sky-calendar-composer-hash-mismatch",
      "Serving refused: the composer or one of its gates changed after owner authorization",
      { authorized: authorization.composerSourceSha256 ?? null, current: currentComposerSourceSha256 },
    );
  }
  if (authorization.componentSetSha256 !== currentComponentSetSha256) {
    throw new SkyCalendarServingAuthorizationError(
      "sky-calendar-component-set-hash-mismatch",
      "Serving refused: the approved component set changed after owner authorization",
      { authorized: authorization.componentSetSha256 ?? null, current: currentComponentSetSha256 },
    );
  }
  if (authorization.pilot?.ownerConfirmed !== true || authorization.servingAuthorization !== true) {
    throw new SkyCalendarServingAuthorizationError(
      "sky-calendar-serving-authorization-inactive",
      "Serving refused: the owner has not yet confirmed the eight-card unscripted pilot",
      {
        pilotOwnerConfirmed: authorization.pilot?.ownerConfirmed === true,
        servingAuthorization: authorization.servingAuthorization === true,
      },
    );
  }

  return {
    authorizationId: authorization.authorizationId,
    authorizationRecordPath: SKY_CALENDAR_SERVING_AUTHORIZATION_RECORD_PATH,
    composerVersion: SKY_CALENDAR_COMPOSER_VERSION,
    composerSourceSha256: currentComposerSourceSha256,
    componentSetSha256: currentComponentSetSha256,
  };
}
