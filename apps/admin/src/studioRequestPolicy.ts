// Live-status uses POST for a batch read; its HTTP method is not save intent.
export function isStudioReadRequest(path: string, method = "GET") {
  return /^(GET|HEAD)$/i.test(method)
    || method.toUpperCase() === "POST" && path.split("?")[0] === "/api/admin/content-live-status";
}

// Inventory/status requests include owner authentication plus multiple bounded
// storage reads. Keep an aggregate deadline instead of cancelling at 10 seconds.
export function studioRequestTimeoutMs(path: string, _method?: string) {
  const pathname = path.split("?")[0];
  if (/^\/api\/admin\/(sky-draft-writing|sky-article-template-slots)$/.test(pathname)) return 305_000;
  if (/^\/api\/admin\/(?:generated-content(?:-inventory)?|content-(?:publication|live-status|review-events)|review-records|user-generated-content)$/.test(pathname)) return 45_000;
  return 10_000;
}
