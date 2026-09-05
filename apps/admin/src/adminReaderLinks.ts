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

export function setupAdminReaderLinkTargets(root: HTMLElement | null = document.getElementById("root")) {
  if (!root) return () => {};

  const applyTargets = () => {
    root.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((anchor) => {
      if (!isReaderAppHref(anchor.getAttribute("href"))) return;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
    });
  };

  applyTargets();
  const observer = new MutationObserver(applyTargets);
  observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["href"] });
  return () => observer.disconnect();
}
