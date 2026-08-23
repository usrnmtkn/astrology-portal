import { timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "node:http";

export const CONTENT_ADMIN_SECRET_HEADER = "x-content-generation-secret";

function firstHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function bearerSecret(req: IncomingMessage) {
  return firstHeader(req.headers.authorization)?.match(/^Bearer\s+(.+)$/iu)?.[1];
}

function normalizeSecret(value: string | undefined) {
  return value?.trim() ?? "";
}

function suppliedSecrets(req: IncomingMessage) {
  return [
    firstHeader(req.headers[CONTENT_ADMIN_SECRET_HEADER]),
    bearerSecret(req)
  ]
    .map(normalizeSecret)
    .filter(Boolean);
}

function secretsMatch(supplied: string, expected: string) {
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  return suppliedBytes.length === expectedBytes.length && timingSafeEqual(suppliedBytes, expectedBytes);
}

export function isContentAdminAuthorized(req: IncomingMessage) {
  const expected = normalizeSecret(process.env.CONTENT_GENERATION_SECRET);
  if (!expected) return process.env.NODE_ENV !== "production";
  return suppliedSecrets(req).some((supplied) => secretsMatch(supplied, expected));
}
