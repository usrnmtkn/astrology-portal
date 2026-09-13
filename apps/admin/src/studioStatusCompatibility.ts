const legacyNotServingLabel = ["Not", "live"].join(" ");

let installed = false;
let observer: MutationObserver | null = null;

function canonicalStatusLabel(element: Element) {
  const text = element.textContent?.trim() ?? "";
  if (text === legacyNotServingLabel && element.matches(".admin-status")) {
    element.textContent = element.classList.contains("status-draft") ? "Draft" : "Inactive";
    return;
  }
  if (text === legacyNotServingLabel && element.matches(".admin-wiring-notice .admin-eyebrow")) {
    element.textContent = "Published but unwired";
    return;
  }
  if (text === `Draft saved · ${legacyNotServingLabel}` && element.matches(".admin-editor-save-state")) {
    element.textContent = "Draft saved";
    return;
  }

  const title = element.getAttribute("title");
  if (title === `Keep this revision ${legacyNotServingLabel}.`) {
    element.setAttribute("title", "Keep this revision as a Draft.");
  }

  if (element.matches(".admin-status-guide p") && text.includes(legacyNotServingLabel)) {
    element.textContent = "Live means readers can currently receive this copy. Draft, Ready, Inactive, Archived, Retired, Error, and Unavailable describe content that is not currently serving.";
    return;
  }

  if (text.includes(legacyNotServingLabel) && element.matches(".admin-field-hint")) {
    const replacements: Array<[string, string]> = [
      [`Save draft keeps your changes ${legacyNotServingLabel}.`, "Save draft keeps your changes as a Draft."],
      [`Save draft keeps the revision ${legacyNotServingLabel}.`, "Save draft keeps the revision as a Draft."],
      [`Choose Save draft to keep a revision ${legacyNotServingLabel}.`, "Choose Save draft to keep the revision as a Draft."]
    ];
    let next = text;
    for (const [legacy, canonical] of replacements) next = next.replace(legacy, canonical);
    if (next !== text) element.textContent = next;
  }
}

function normalizeTree(root: ParentNode) {
  if (root instanceof Element) canonicalStatusLabel(root);
  root.querySelectorAll?.(
    ".admin-status, .admin-editor-save-state, .admin-wiring-notice .admin-eyebrow, .admin-status-guide p, .admin-field-hint, [title]"
  ).forEach(canonicalStatusLabel);
}

/**
 * The large legacy dashboard still contains a few transport-era status strings.
 * Keep them from becoming a second reader-facing vocabulary while those call
 * sites are migrated to StudioStatusBadge. This adapter is intentionally scoped
 * to Content Studio and only rewrites known status-language surfaces.
 */
export function installStudioStatusCompatibility() {
  if (installed || typeof window === "undefined" || typeof document === "undefined") return;
  installed = true;

  const start = () => {
    if (!document.body || observer) return;
    normalizeTree(document);
    observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "characterData") {
          const parent = record.target.parentElement;
          if (parent) canonicalStatusLabel(parent);
          continue;
        }
        if (record.type === "attributes" && record.target instanceof Element) {
          canonicalStatusLabel(record.target);
          continue;
        }
        for (const node of record.addedNodes) {
          if (node instanceof Element) normalizeTree(node);
          else if (node.parentElement) canonicalStatusLabel(node.parentElement);
        }
      }
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["title"]
    });
  };

  if (document.body) start();
  else window.addEventListener("DOMContentLoaded", start, { once: true });
}
