import type { IncomingMessage, ServerResponse } from "node:http";

export const defaultAdminJsonBodyLimitBytes = 256 * 1024;
export const defaultAdminUpstreamTimeoutMs = 8_000;

export class AdminHttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "AdminHttpError";
    this.statusCode = statusCode;
  }
}

export function sendAdminJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

export function sendAdminMethodNotAllowed(res: ServerResponse, methods: string[]) {
  res.setHeader("allow", methods.join(", "));
  sendAdminJson(res, 405, {
    ok: false,
    error: `Use ${methods.join(" or ")}.`
  });
}

export async function readAdminJsonBody<T>(
  req: IncomingMessage,
  maxBytes = defaultAdminJsonBodyLimitBytes
): Promise<T> {
  const contentLength = Number(req.headers["content-length"] ?? 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new AdminHttpError(413, `Request body exceeds ${maxBytes} bytes.`);
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > maxBytes) {
      throw new AdminHttpError(413, `Request body exceeds ${maxBytes} bytes.`);
    }
    chunks.push(buffer);
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) throw new AdminHttpError(400, "A JSON request body is required.");

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new AdminHttpError(400, "Request body must be valid JSON.");
  }
}

export async function adminFetch(
  input: string | URL,
  init: RequestInit = {},
  timeoutMs = defaultAdminUpstreamTimeoutMs
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AdminHttpError(504, "Upstream storage request timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function adminErrorStatus(error: unknown) {
  return error instanceof AdminHttpError ? error.statusCode : 500;
}

export function adminErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
