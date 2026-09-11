type StudioTheme = "light" | "dark";
const storageKey = "tldrastro:studio-theme";
let activeTheme: StudioTheme | undefined;

export function getStudioTheme(): StudioTheme {
  if (activeTheme) return activeTheme;
  try { return localStorage.getItem(storageKey) === "light" ? "light" : "dark"; }
  catch { return "dark"; }
}

export function saveStudioTheme(theme: StudioTheme) {
  activeTheme = theme;
  try { localStorage.setItem(storageKey, theme); }
  catch { /* Keep the active theme during error recovery when storage is unavailable. */ }
}
