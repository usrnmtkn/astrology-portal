// Live-status uses POST for a batch read; its HTTP method is not save intent.
export const studioReadTimeoutMessage = "Loading content timed out. Try again; no changes were submitted.";

export function isStudioReadRequest(path: string, method = "GET") {
  return /^(GET|HEAD)$/i.test(method)
    || method.toUpperCase() === "POST" && path.split("?")[0] === "/api/admin/content-live-status";
}

// Studio requests include owner authentication plus bounded storage operations.
// Use one aggregate deadline; the HTTP method determines the warning, not the wait.
export function studioRequestTimeoutMs(path: string, _method?: string) {
  const pathname = path.split("?")[0];
  if (/^\/api\/admin\/(sky-draft-writing|sky-article-template-slots)$/.test(pathname)) return 305_000;
  return 45_000;
}
