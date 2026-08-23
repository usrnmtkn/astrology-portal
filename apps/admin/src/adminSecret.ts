export const adminSecretStorageKey = "tldrastro:contentAdminSecret";

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
