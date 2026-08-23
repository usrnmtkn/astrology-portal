export const adminSecretStorageKey = "tldrastro:contentAdminSecret";

const jwtPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u;

const adminSecretAssignment = /^(?:export\s+)?CONTENT_GENERATION_SECRET\s*=\s*(.*)$/iu;
const adminSecretName = /^(?:export\s+)?CONTENT_GENERATION_SECRET\s*=?$/iu;

function unquote(value: string) {
  const trimmed = value.trim();
  const quote = trimmed[0];
  return (quote === "\"" || quote === "'") && trimmed.endsWith(quote)
    ? trimmed.slice(1, -1).trim()
    : trimmed;
}

export function normalizeAdminSecret(value: string) {
  const trimmed = value.trim();
  const assignment = trimmed
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .find((line) => adminSecretAssignment.test(line));
  const candidate = assignment?.match(adminSecretAssignment)?.[1] ?? trimmed;
  const normalized = unquote(candidate);
  return adminSecretName.test(normalized) ? "" : normalized;
}

export function adminCredentialHeaders(value: string): Record<string, string> {
  const credential = normalizeAdminSecret(value);
  if (!credential) return {};
  return jwtPattern.test(credential)
    ? { authorization: `Bearer ${credential}`, "x-content-admin-session": credential }
    : { authorization: `Bearer ${credential}`, "x-content-generation-secret": credential };
}
