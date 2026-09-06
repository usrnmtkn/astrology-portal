export function isReaderAppHref(href: string | null) {
  if (!href) return false;
  if (href.startsWith("#/") || href.startsWith("/#/")) return true;
  if (!href.startsWith("/")) return false;
  return !(
    href === "/admin/content" ||
    href === "/content/admin" ||
    href.startsWith("/admin/") ||
    href.startsWith("/api/")
  );
}

export function normalizeAdminContentHref(href: string | null) {
  if (!href || !href.startsWith("#articles")) return href;

  const [route, query = ""] = href.split("?", 2);
  if (route !== "#articles") return href;

  const params = new URLSearchParams(query);
  if ((params.get("q") ?? "").trim().toLowerCase() !== "sky") return href;

  params.delete("q");
  const remainder = params.toString();
  return `#sky-writeups${remainder ? `?${remainder}` : ""}`;
}

export function setupAdminReaderLinkTargets(root: HTMLElement | null = document.getElementById("root")) {
  const normalizeCurrentHash = () => {
    const currentHash = window.location.hash;
    const normalizedHash = normalizeAdminContentHref(currentHash);
    if (!normalizedHash || normalizedHash === currentHash) return;

    const nextUrl = `${window.location.pathname}${window.location.search}${normalizedHash}`;
    window.history.replaceState(null, "", nextUrl);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };

  normalizeCurrentHash();
  window.addEventListener("hashchange", normalizeCurrentHash);

  if (!root) {
    return () => window.removeEventListener("hashchange", normalizeCurrentHash);
  }

  const applyTargets = () => {
    root.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((anchor) => {
      const href = anchor.getAttribute("href");
      const normalizedHref = normalizeAdminContentHref(href);
      if (normalizedHref && normalizedHref !== href) anchor.setAttribute("href", normalizedHref);
      if (!isReaderAppHref(normalizedHref)) return;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
    });
  };

  applyTargets();
  const observer = new MutationObserver(applyTargets);
  observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["href"] });
  return () => {
    observer.disconnect();
    window.removeEventListener("hashchange", normalizeCurrentHash);
  };
}
