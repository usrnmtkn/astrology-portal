import type { IncomingMessage, ServerResponse } from "node:http";
import { isContentAdminAuthorized } from "../_lib/admin-auth.js";
import { AdminHttpError, readAdminJsonBody, sendAdminJson, sendAdminMethodNotAllowed } from "../_lib/admin-http.js";
// @ts-ignore Governed JavaScript module intentionally has no declaration file.
import {
  normalizeSkyContinuousFallbackVariantFamily,
  renderSkyContinuousFallbackVariant,
  skyContinuousFallbackVariantFamilyStatus
} from "../../apps/web/src/content/fallbackArchitectureV3/resolver/skyContinuousFallbackVariants.mjs";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function boundedString(value: unknown, max = 20_000) {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function assertBoundedFamily(value: unknown) {
  const source = record(value);
  const lanes = Array.isArray(source.lanes) ? source.lanes : [];
  if (lanes.length > 8) throw new Error("Fallback variant families may contain at most 8 lanes.");
  for (const laneValue of lanes) {
    const lane = record(laneValue);
    for (const key of ["hooks", "developments", "shadows", "closes"]) {
      const variants = Array.isArray(lane[key]) ? lane[key] as unknown[] : [];
      if (variants.length > 12) throw new Error(`Fallback variant lane ${String(lane.id ?? "")} has too many ${key}.`);
      for (const variantValue of variants) {
        const variant = record(variantValue);
        if (boundedString(variant.text, 8_001).length > 8_000) {
          throw new Error(`Fallback variant ${String(variant.id ?? "")} exceeds 8,000 characters.`);
        }
      }
    }
  }
}

export function normalizeSkyFallbackVariantPreviewInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Fallback variant preview is missing.");
  const input = value as Record<string, unknown>;
  const contentKey = boundedString(input.contentKey, 300);
  if (!/^sky-placement\/article\/[^/]+\/[^/]+$/u.test(contentKey)) {
    throw new Error("Choose a continuous Sky placement record.");
  }
  const eventInstanceId = boundedString(input.eventInstanceId, 500).trim();
  if (!eventInstanceId) throw new Error("An event instance ID is required so the preview cannot reroll on refresh.");
  assertBoundedFamily(input.family);
  const family = normalizeSkyContinuousFallbackVariantFamily(input.family, { contentKey });
  return {
    contentKey,
    eventInstanceId,
    headline: boundedString(input.headline, 500),
    dateLine: boundedString(input.dateLine, 500),
    family
  };
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!await isContentAdminAuthorized(req)) {
    sendAdminJson(res, 401, { ok: false, error: "Unauthorized." });
    return;
  }
  if (req.method !== "POST") {
    sendAdminMethodNotAllowed(res, ["POST"]);
    return;
  }
  try {
    const input = normalizeSkyFallbackVariantPreviewInput(await readAdminJsonBody<unknown>(req, 1_000_000));
    const status = skyContinuousFallbackVariantFamilyStatus(input.family, { contentKey: input.contentKey });
    const selected = renderSkyContinuousFallbackVariant(input.family, {
      contentKey: input.contentKey,
      eventInstanceId: input.eventInstanceId
    });
    const blocks = [
      input.headline ? `# ${input.headline}` : "",
      input.dateLine,
      selected.body
    ].filter(Boolean);
    sendAdminJson(res, 200, {
      ok: true,
      rendered: {
        contentKey: input.contentKey,
        page: blocks.join("\n\n").trim(),
        servingEnabled: false,
        familyStatus: status,
        selection: {
          familyVersion: selected.familyVersion,
          eventInstanceId: selected.eventInstanceId,
          selectionLockKey: selected.selectionLockKey,
          laneId: selected.laneId,
          laneLabel: selected.laneLabel,
          hookId: selected.hookId,
          developmentId: selected.developmentId,
          shadowId: selected.shadowId,
          closeId: selected.closeId
        }
      }
    });
  } catch (error) {
    const status = error instanceof AdminHttpError ? error.statusCode : 400;
    sendAdminJson(res, status, { ok: false, error: error instanceof Error ? error.message : "The fallback variant preview could not be assembled." });
  }
}
