export type StudioTheme = "light" | "dark";
export type StudioPalette = "neutral" | "green";

const themeKey = "tldrastro:studio-theme";
const paletteKey = "tldrastro:studio-palette";
let activeTheme: StudioTheme | undefined;
let activePalette: StudioPalette | undefined;

export function getStudioTheme(): StudioTheme {
  if (activeTheme) return activeTheme;
  try { return localStorage.getItem(themeKey) === "light" ? "light" : "dark"; }
  catch { return "dark"; }
}

export function saveStudioTheme(theme: StudioTheme) {
  activeTheme = theme;
  try { localStorage.setItem(themeKey, theme); }
  catch { /* Keep the active theme during error recovery when storage is unavailable. */ }
}

export function getStudioPalette(): StudioPalette {
  if (activePalette) return activePalette;
  try { return localStorage.getItem(paletteKey) === "green" ? "green" : "neutral"; }
  catch { return "neutral"; }
}

export function saveStudioPalette(palette: StudioPalette) {
  activePalette = palette;
  try { localStorage.setItem(paletteKey, palette); }
  catch { /* Keep the active palette during error recovery when storage is unavailable. */ }
}

export function studioShellAttributes(theme = getStudioTheme(), palette = getStudioPalette()) {
  return {
    "data-studio-theme": theme,
    "data-theme": theme,
    "data-studio-palette": palette
  } as const;
}
