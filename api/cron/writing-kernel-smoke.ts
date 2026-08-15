import type { IncomingMessage, ServerResponse } from "node:http";
import knowledgeResolver from "../../packages/astro-knowledge/scripts/knowledge-resolver.js";
import { loadLocalWebEnv } from "../_lib/local-env.js";

loadLocalWebEnv();

const { assertIndexCurrent } = knowledgeResolver as unknown as {
  assertIndexCurrent: () => { indexSha256: string };
};

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

function isAuthorized(req: IncomingMessage) {
  const secret = process.env.CRON_SECRET ?? process.env.CONTENT_GENERATION_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.authorization === `Bearer ${secret}`;
}

export default function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Use GET." });
    return;
  }
  if (!isAuthorized(req)) {
    sendJson(res, 401, { error: "Unauthorized." });
    return;
  }

  try {
    const { indexSha256 } = assertIndexCurrent();
    sendJson(res, 200, {
      ok: true,
      check: "writing-kernel-index-current",
      indexSha256
    });
  } catch (error) {
    sendJson(res, 503, {
      ok: false,
      check: "writing-kernel-index-current",
      error: error instanceof Error ? error.message : "Unknown writing-kernel smoke failure."
    });
  }
}
