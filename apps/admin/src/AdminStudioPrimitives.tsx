import { StudioButton } from "./StudioControls";
import { AlertTriangle, BarChart3, Plus, type LucideIcon } from "lucide-react";
import { PageLoading } from "../../web/src/components/PageLoading";
import { lazy, Suspense, useEffect, useRef, type ComponentProps, type KeyboardEvent } from "react";

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

export function AdminPageHeader({
  breadcrumbs,
  createActions,
  createDisabled = false,
  createMenuOpen,
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
    if (event.key === "Escape") {
      event.preventDefault();
      createButtonRef.current?.focus();
      onCloseCreateMenu();
      return;
    }
    if (event.key === "Tab") {
      createButtonRef.current?.focus();
      onCloseCreateMenu();
      return;
    }
    const items = Array.from(createMenuRef.current?.querySelectorAll<HTMLButtonElement>("[role='menuitem']") ?? []);
    if (!items.length || !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1
      : (current + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  }

  return (
    <header className="admin-dashboard-header">
      <div className="admin-page-heading">
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
      </div>
      <div className="admin-page-actions">
        <div className="admin-create-menu">
          <StudioButton
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
          </StudioButton>
          {createMenuOpen && (
            <>
              <StudioButton
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
                    <StudioButton key={item.key} type="button" role="menuitem" onClick={item.onSelect}>
                      <Icon size={16} aria-hidden="true" />
                      <span>{item.label}</span>
                      <small>{item.description}</small>
                    </StudioButton>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
      <nav className="admin-page-utilities" aria-label="Content health">
        <a
          className="admin-page-link"
          href="/admin/content/coverage?view=attention"
          title="Open the short queue of content work that can affect required reader coverage"
        >
          <AlertTriangle size={16} aria-hidden="true" />
          Needs attention
        </a>
        <a
          className="admin-page-link"
          href="/admin/content/coverage"
          title="See content coverage: complete and missing content corpora"
        >
          <BarChart3 size={16} aria-hidden="true" />
          Content coverage
        </a>
      </nav>
    </header>
  );
}

const DeferredAccessGate = lazy(() => import("./AdminAccessGate"));

export function AdminAccessGate(props: ComponentProps<typeof DeferredAccessGate>) {
  return (
    <Suspense fallback={<PageLoading compact message="Loading sign-in…" />}>
      <DeferredAccessGate {...props} />
    </Suspense>
  );
}
