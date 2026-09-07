import { AlertTriangle, BarChart3, LogIn, Plus, RefreshCw, type LucideIcon } from "lucide-react";
import { useEffect, useRef, type KeyboardEvent } from "react";
import "./admin-content-studio-ux-compat.css";
import "./admin-content-studio-editor-redesign.css";
import "./admin-access-feedback.css";

export type AdminBreadcrumb = {
  current?: boolean;
  href?: string;
  key: string;
  label: string;
  onSelect?: () => void;
};

export type AdminCreateAction = {
  description: string;
  icon: LucideIcon;
  key: string;
  label: string;
  onSelect: () => void;
};

type AdminPageHeaderProps = {
  breadcrumbs: AdminBreadcrumb[];
  createActions: AdminCreateAction[];
  createDisabled?: boolean;
  createMenuOpen: boolean;
  description: string;
  onCloseCreateMenu: () => void;
  onToggleCreateMenu: () => void;
  title: string;
};

const coverageActionStyle = {
  alignItems: "center",
  borderRadius: "var(--admin-radius-md)",
  borderStyle: "solid",
  borderWidth: "var(--border-width-thin)",
  cursor: "pointer",
  display: "inline-flex",
  fontWeight: "var(--weight-semibold)",
  gap: "var(--admin-space-sm)",
  justifyContent: "center",
  maxWidth: "100%",
  minHeight: "var(--admin-control-height-md)",
  padding: "var(--admin-space-sm) var(--admin-space-lg)",
  textDecoration: "none",
  whiteSpace: "nowrap"
} as const;

export function AdminPageHeader({
  breadcrumbs,
  createActions,
  createDisabled = false,
  createMenuOpen,
  description,
  onCloseCreateMenu,
  onToggleCreateMenu,
  title
}: AdminPageHeaderProps) {
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const createMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!createMenuOpen) return;
    createMenuRef.current?.querySelector<HTMLButtonElement>("[role='menuitem']")?.focus();
  }, [createMenuOpen]);

  function handleCreateMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    createButtonRef.current?.focus();
    onCloseCreateMenu();
  }

  return (
    <header className="admin-dashboard-header">
      <div>
        <nav className="admin-breadcrumb" aria-label="Breadcrumb">
          <ol>
            {breadcrumbs.map((item, index) => (
              <li key={item.key}>
                {index > 0 && <span className="admin-breadcrumb-separator" aria-hidden="true"> / </span>}
                {item.current
                  ? <span aria-current="page">{item.label}</span>
                  : (
                    <a
                      href={item.href}
                      onClick={(event) => {
                        if (!item.onSelect) return;
                        event.preventDefault();
                        item.onSelect();
                      }}
                    >
                      {item.label}
                    </a>
                  )}
              </li>
            ))}
          </ol>
        </nav>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
        <a
          className="admin-create-button admin-attention-button"
          href="/admin/content/coverage?view=attention"
          style={coverageActionStyle}
          title="Open the short queue of content work that can affect required reader coverage"
        >
          <AlertTriangle size={16} aria-hidden="true" />
          Needs attention
        </a>
        <a
          className="admin-create-button admin-secondary-button"
          href="/admin/content/coverage"
          style={coverageActionStyle}
          title="See content coverage: complete and missing content corpora"
        >
          <BarChart3 size={16} aria-hidden="true" />
          Content coverage
        </a>
        <div className="admin-create-menu">
          <button
            ref={createButtonRef}
            className="admin-create-button"
            type="button"
            onClick={onToggleCreateMenu}
            aria-haspopup="menu"
            aria-expanded={createMenuOpen}
            disabled={createDisabled}
            title={createDisabled ? "Verify admin access before creating content." : undefined}
          >
            <Plus size={16} aria-hidden="true" />
            Create
          </button>
          {createMenuOpen && (
            <>
              <button
                className="admin-create-menu-backdrop"
                type="button"
                aria-label="Close create menu"
                onClick={onCloseCreateMenu}
              />
              <div
                ref={createMenuRef}
                className="admin-create-menu-panel"
                role="menu"
                onKeyDown={handleCreateMenuKeyDown}
              >
                {createActions.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button key={item.key} type="button" role="menuitem" onClick={item.onSelect}>
                      <Icon size={16} aria-hidden="true" />
                      <span>{item.label}</span>
                      <small>{item.description}</small>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

type AdminAccessGateProps = {
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  value: string;
};

/** Vercel preview hosts carry the branch or deployment id in the hostname. */
function isPreviewDeployment() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host.includes("-git-") || /-[a-z0-9]{6,}-[a-z0-9-]+\.vercel\.app$/u.test(host) || host === "localhost" || host === "127.0.0.1";
}

export function AdminAccessGate({ disabled, onChange, onSubmit, value }: AdminAccessGateProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") onSubmit();
  }

  return (
    <section className="admin-content-toolbar admin-access-gate" aria-label="Admin access required">
      <div>
        <p className="admin-eyebrow">Owner access required</p>
        <h2>Sign in to Content Studio</h2>
        <p>
          Content Studio needs the owner account. Sign in here, or use the emergency admin secret for this deployment.
          {isPreviewDeployment() && " This preview uses a separate site address, so a production sign-in does not carry over."}
        </p>
      </div>
      <div className="admin-access-gate-actions">
        <a
          className="admin-access-owner-signin"
          href="/?auth=login"
          target="_blank"
          rel="noreferrer"
        >
          <LogIn size={16} aria-hidden="true" />
          Sign in as owner
        </a>
        <p className="admin-access-gate-note">
          After you sign in, return to this tab. Content Studio should reconnect automatically.
        </p>
        <div className="admin-access-divider" aria-hidden="true">
          <span>Or use emergency access</span>
        </div>
        <label className="admin-access-inline-field">
          <span>Emergency admin secret</span>
          <input
            aria-label="Emergency admin secret"
            type="password"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste emergency admin secret"
          />
        </label>
        <p className="admin-access-secret-note">
          Use the <code>CONTENT_GENERATION_SECRET</code> configured for this deployment. This is not a content key.
        </p>
        <button type="button" onClick={onSubmit} disabled={disabled}>
          <RefreshCw size={16} aria-hidden="true" />
          Verify emergency access
        </button>
      </div>
    </section>
  );
}
