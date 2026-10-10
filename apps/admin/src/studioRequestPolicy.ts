// Reads remain short. CRUD writes can perform several bounded storage operations
// (version check, draft save, history/publication receipt) before responding.
export function studioRequestTimeoutMs(path: string, method = "GET") {
  const pathname = path.split("?")[0];
  if (["/api/admin/sky-draft-writing", "/api/admin/sky-article-template-slots"].includes(pathname)) return 305_000;
  if (["POST", "PATCH", "DELETE"].includes(method.toUpperCase())
    && ["/api/admin/generated-content", "/api/admin/content-publication", "/api/admin/user-generated-content"].includes(pathname)) return 45_000;
  return 10_000;
}
