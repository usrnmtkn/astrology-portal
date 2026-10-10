const storageKey = "tldrastro:studioAuthReturn";

/** Only Studio routes on this origin can be post-login destinations. */
export function validStudioReturnPath(value: string | null) {
  if (!value?.startsWith("/admin/content")) return null;
  try {
    const url = new URL(value, "https://studio.invalid");
    if (url.origin !== "https://studio.invalid"
      || !(url.pathname === "/admin/content" || url.pathname.startsWith("/admin/content/"))) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function studioSignInHref(path: string) {
  return `/?${new URLSearchParams({ auth: "login", returnTo: validStudioReturnPath(path) ?? "/admin/content" })}`;
}

export function rememberStudioReturnPath() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("returnTo")) {
    const path = validStudioReturnPath(params.get("returnTo"));
    try {
      if (path) window.sessionStorage.setItem(storageKey, path);
      else window.sessionStorage.removeItem(storageKey);
    } catch { /* The URL still carries the destination when storage is unavailable. */ }
    return path;
  }
  try {
    return validStudioReturnPath(window.sessionStorage.getItem(storageKey));
  } catch {
    return null;
  }
}

/** Call after session sign-in. Studio still authorizes every request on the server. */
export function returnToStudioAfterSignIn() {
  const path = rememberStudioReturnPath();
  if (!path) return false;
  try { window.sessionStorage.removeItem(storageKey); } catch { /* Navigation still works. */ }
  window.location.replace(path);
  return true;
}
