import type { IncomingMessage, ServerResponse } from "node:http";
import {
  FRIEND_TRANSIT_READING_PROVIDER_SCHEMA,
  generateFriendTransitReadingForUser
} from "./_lib/friend-transit-reading-generation.js";
import { jsonRequestBody, requireReportUser, sendJson } from "./_lib/report-http.js";

type FriendTransitReadingRequest = {
  subjectType?: string;
  subjectId?: string;
  targetDate?: string;
  facts?: Record<string, unknown>;
};

export { FRIEND_TRANSIT_READING_PROVIDER_SCHEMA };

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Use POST." });

  try {
    const user = await requireReportUser(req);
    const input = await jsonRequestBody<FriendTransitReadingRequest>(req);
    if (input.subjectType !== "friend_transit_reading") {
      return sendJson(res, 400, { ok: false, error: "Unsupported reading request." });
    }

    const result = await generateFriendTransitReadingForUser({
      userId: user.id,
      subjectId: stringValue(input.subjectId),
      targetDate: stringValue(input.targetDate),
      facts: input.facts
    });
    return sendJson(res, 200, { ok: true, ...result });
  } catch (error) {
    console.error("generate-friend-transit-reading failed", error);
    return sendJson(res, 500, {
      ok: false,
      errorType: "paid_reading_unavailable",
      error: "This paid reading is currently unavailable."
    });
  }
}
