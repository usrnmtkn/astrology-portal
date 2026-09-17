import type { IncomingMessage, ServerResponse } from "node:http";
import { isContentAdminAuthorized } from "../_lib/admin-auth.js";
import {
  AdminHttpError,
  adminErrorMessage,
  adminErrorStatus,
  readAdminJsonBody,
  sendAdminJson,
  sendAdminMethodNotAllowed
} from "../_lib/admin-http.js";
import { loadLocalWebEnv } from "../_lib/local-env.js";
import {
  generatePersonalTransitAudienceDrafts,
  nextMissingPersonalTransitWriteup,
  parsePersonalTransitContact,
  reviewPersonalTransitCopy,
  type PersonalTransitAudience
} from "../_lib/personal-transit-writing.js";

loadLocalWebEnv();
export const maxDuration = 300;

type RequestBody = {
  action?: string;
  transiting?: string;
  natal?: string;
  aspect?: string;
  planet?: string;
  house?: string;
  sign?: string;
  transitHouse?: string;
  natalHouse?: string;
  contentKey?: string;
  afterContentKey?: string;
  youText?: string;
  friendText?: string;
  instruction?: string;
  audience?: PersonalTransitAudience;
  provider?: "openai" | "claude" | "anthropic";
};

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") return sendAdminMethodNotAllowed(res, ["POST"]);
  if (!await isContentAdminAuthorized(req)) return sendAdminJson(res, 401, { ok: false, error: "Unauthorized." });

  try {
    const body = await readAdminJsonBody<RequestBody>(req, 96_000);
    const action = typeof body.action === "string" ? body.action : "generate";
    if (action === "next-missing") {
      const next = await nextMissingPersonalTransitWriteup(
        typeof body.afterContentKey === "string" ? body.afterContentKey : ""
      );
      return sendAdminJson(res, 200, {
        ok: true,
        action: "next-missing",
        next,
        saved: false,
        published: false
      });
    }
    const youText = typeof body.youText === "string" ? body.youText : "";
    const friendText = typeof body.friendText === "string" ? body.friendText : "";
    if (action === "recheck") {
      return sendAdminJson(res, 200, {
        ok: true,
        action: "recheck",
        saved: false,
        published: false,
        approved: false,
        ...reviewPersonalTransitCopy({
          contact: parsePersonalTransitContact(body),
          you: youText,
          friend: friendText
        })
      });
    }
    if (action !== "generate") throw new AdminHttpError(400, "Choose Generate You + Friend draft, Run writing checks, or Next missing write-up.");

    const instruction = typeof body.instruction === "string" ? body.instruction.trim() : "";
    const audience = body.audience === "you" || body.audience === "friend" ? body.audience : "both";
    if (instruction.length > 6000) throw new AdminHttpError(413, "The writing request is too long. Keep it under 6,000 characters.");
    if (youText.length > 60_000 || friendText.length > 60_000) {
      throw new AdminHttpError(413, "The current writing is too long for this request.");
    }
    if (body.provider !== undefined && !["openai", "claude", "anthropic"].includes(body.provider)) {
      throw new AdminHttpError(400, "Invalid provider.");
    }

    const result = await generatePersonalTransitAudienceDrafts({
      contact: parsePersonalTransitContact(body),
      youText,
      friendText,
      instruction,
      audience,
      provider: body.provider === "anthropic" ? "claude" : body.provider
    });

    sendAdminJson(res, 200, {
      ok: true,
      action: "generate",
      saved: false,
      published: false,
      approved: false,
      ...result
    });
  } catch (error) {
    sendAdminJson(res, adminErrorStatus(error), {
      ok: false,
      error: adminErrorMessage(error, "Personal Transit writing failed. Existing writing was not changed."),
      saved: false,
      published: false
    });
  }
}
