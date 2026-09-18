/** Shade-shaped semantic roles. Concrete values live in admin-theme.css. */
export const studioTokenRoles = {
  surfacePage: "--studio-surface-page",
  surfacePanel: "--studio-surface-panel",
  surfaceElevated: "--studio-surface-elevated",
  surfaceOverlay: "--studio-surface-overlay",
  previewCanvas: "--studio-preview-canvas",
  textPrimary: "--studio-text-primary",
  textSecondary: "--studio-text-secondary",
  borderDefault: "--studio-border-default",
  borderStrong: "--studio-border-strong",
  tableRowHover: "--studio-table-row-hover",
  tableRowSelected: "--studio-table-row-selected",
  controlHeight: "--studio-control-height"
} as const;

export const studioTokenAliases = {
  "--studio-surface-page": "--workspace-canvas",
  "--studio-surface-panel": "--workspace-surface",
  "--studio-surface-elevated": "--workspace-raised",
  "--studio-surface-overlay": "--workspace-surface-highest",
  "--studio-preview-canvas": "--workspace-canvas",
  "--studio-text-primary": "--workspace-ink",
  "--studio-text-secondary": "--workspace-muted",
  "--studio-border-default": "--workspace-line",
  "--studio-border-strong": "--workspace-line-strong",
  "--studio-table-row-hover": "--workspace-hover",
  "--studio-table-row-selected": "--workspace-selected",
  "--studio-control-height": "--studio-button-height"
} as const;
