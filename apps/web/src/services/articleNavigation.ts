/** Keep the immediate reader parent on the browser entry, including across reloads. */
export function pushArticleUrl(url: URL) {
  const parent = window.location.href;
  if (url.href === parent) return;
  window.history.pushState({ articleParent: parent, articleUrl: url.href }, "", url.href);
}

export function returnToArticleParent() {
  const state = window.history.state;
  if (state?.articleUrl !== window.location.href || typeof state.articleParent !== "string") return false;
  const parent = new URL(state.articleParent, window.location.href);
  if (parent.origin !== window.location.origin) return false;
  window.history.back();
  return true;
}
