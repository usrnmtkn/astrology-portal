const storageKey = "tldrastro:readerAuthReturn";
const maxAgeMs = 24 * 60 * 60 * 1000;

export function validReaderReturnPath(value: string | null) {
  if (!value || value.length > 1024 || !value.startsWith("/")) return null;
  try {
    const url = new URL(value, "https://reader.invalid");
    if (url.origin !== "https://reader.invalid" || url.search) return null;
    if (url.pathname === "/" && /^#(?:you|friends|calendar|account)(?:[/?]|$)/u.test(url.hash)) {
      return `/${url.hash}`;
    }
    if (/^\/reports(?:\/[a-zA-Z0-9_-]+)*\/?$/u.test(url.pathname) && !url.hash) return url.pathname;
  } catch { /* An invalid destination never becomes a navigation target. */ }
  return null;
}

export function clearReaderReturnPath() {
  try { window.sessionStorage.removeItem(storageKey); } catch { /* Optional storage. */ }
}

export function rememberReaderReturnPath(captureCurrent = false) {
  const url = new URL(window.location.href);
  const explicit = url.searchParams.get("readerReturn");
  const current = captureCurrent ? validReaderReturnPath(`${url.pathname}${url.hash}`) : null;
  const requested = explicit !== null ? validReaderReturnPath(explicit) : current;
  if (explicit !== null || current) {
    clearReaderReturnPath();
    if (requested) {
      try { window.sessionStorage.setItem(storageKey, JSON.stringify({ path: requested, at: Date.now() })); } catch { /* The callback URL also carries it. */ }
    }
    return requested;
  }
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(storageKey) ?? "null");
    if (saved && Date.now() >= saved.at && Date.now() - saved.at < maxAgeMs) return validReaderReturnPath(saved.path);
  } catch { /* Missing, blocked, or malformed storage. */ }
  clearReaderReturnPath();
  return null;
}

export function returnToReaderAfterSignIn() {
  const path = rememberReaderReturnPath();
  clearReaderReturnPath();
  if (!path) return false;
  window.location.replace(path);
  return true;
}
