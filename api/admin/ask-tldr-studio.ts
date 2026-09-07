import type { IncomingMessage, ServerResponse } from "node:http";
import manifest from "../../config/ask-tldr/manifest.json";
import answerModel from "../../config/ask-tldr/answer-model-v1.json";
import ascendantAuthority from "../../config/ask-tldr/authorities/natal-ascendant-v1.json";
import self from "../../config/ask-tldr/pillars/self.json";
import love from "../../config/ask-tldr/pillars/love.json";
import career from "../../config/ask-tldr/pillars/career.json";
import money from "../../config/ask-tldr/pillars/money.json";
import education from "../../config/ask-tldr/pillars/education.json";
import homeFamily from "../../config/ask-tldr/pillars/home_family.json";
import dailyLifeHealth from "../../config/ask-tldr/pillars/daily_life_health.json";
import social from "../../config/ask-tldr/pillars/social.json";
import spirituality from "../../config/ask-tldr/pillars/spirituality.json";
import frozenReportWindow from "../../scripts/fixtures/marie-report-frozen-facts.json";
import { isContentAdminAuthorized } from "../_lib/admin-auth.js";
import { buildAskTldrEvergreenSupportAudit } from "../_lib/ask-tldr-evergreen-support-audit.js";
import { loadLocalWebEnv } from "../_lib/local-env.js";

loadLocalWebEnv();

const calibrationAsOf = "2026-09-05T12:00:00.000Z";

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

export function buildAskTldrStudioPayload() {
  const audit = buildAskTldrEvergreenSupportAudit({
    reportWindow: frozenReportWindow,
    now: new Date(calibrationAsOf)
  });

  return {
    ok: true as const,
    generatedAt: new Date().toISOString(),
    calibrationAsOf,
    reviewOnly: true as const,
    taxonomy: {
      version: manifest.version,
      status: manifest.status,
      ownerApproved: manifest.ownerApproved,
      promotionAuthorized: manifest.promotionAuthorized,
      runtimeEnabled: manifest.runtimeEnabled,
      pillarCount: manifest.pillarCount,
      questionCount: manifest.questionCount,
      routingPolicy: manifest.routingPolicy
    },
    answerModel: {
      version: answerModel.version,
      status: answerModel.status,
      ownerApproved: answerModel.ownerApproved,
      promotionAuthorized: answerModel.promotionAuthorized,
      runtimeEnabled: answerModel.runtimeEnabled,
      principles: answerModel.principles,
      evidenceKinds: answerModel.evidenceKinds,
      sourceContracts: answerModel.sourceContracts,
      answerContracts: answerModel.answerContracts
    },
    pillars: [self, love, career, money, education, homeFamily, dailyLifeHealth, social, spirituality],
    authorities: {
      natalAscendant: ascendantAuthority
    },
    audit
  };
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET") {
    sendJson(res, 405, { ok: false, error: "Use GET." });
    return;
  }
  if (!await isContentAdminAuthorized(req)) {
    sendJson(res, 401, { ok: false, error: "Unauthorized." });
    return;
  }
  try {
    sendJson(res, 200, buildAskTldrStudioPayload());
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Ask TLDR Content Studio data could not be built."
    });
  }
}
