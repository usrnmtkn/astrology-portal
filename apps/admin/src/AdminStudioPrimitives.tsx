import { AlertTriangle, BarChart3, Plus, type LucideIcon } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, type ComponentProps, type KeyboardEvent } from "react";
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

const DeferredAccessGate = lazy(() => import("./AdminAccessGate"));

export function AdminAccessGate(props: ComponentProps<typeof DeferredAccessGate>) {
  return (
    <Suspense fallback={<section className="admin-content-toolbar" role="status">Loading sign-in…</section>}>
      <DeferredAccessGate {...props} />
    </Suspense>
  );
}
