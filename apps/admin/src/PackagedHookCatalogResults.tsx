import { AdminPaginatedCollection } from "./AdminPaginatedCollection";

export type PackagedHookCatalogItem = {
  type: "fallback";
  key: string;
  label: string;
  section: string;
};

type Props = {
  items: PackagedHookCatalogItem[];
  savedKeys: Set<string>;
  resetKey: string;
  onOpen: (item: PackagedHookCatalogItem) => void;
};

const canonicalKey = (key: string) => key.startsWith("fallback-hook/") ? key : `fallback-hook/${key}`;

export function PackagedHookCatalogResults({ items, savedKeys, resetKey, onOpen }: Props) {
  return (
    <section className="admin-hook-catalog-results" aria-label="Packaged fallback source phrases">
      <header className="admin-section-heading-row">
        <div>
          <p className="admin-eyebrow">Packaged source phrases</p>
          <h3>Source material used by the app</h3>
          <p>These are authoring sources, not final reader cards. Saving creates an editable Content Studio source row.</p>
        </div>
        <span className="ui-pill admin-status">{items.length} sources</span>
      </header>
      <AdminPaginatedCollection items={items} label="Packaged source phrases" pageSize={24} resetKey={resetKey}>
        {(visibleItems) => (
          <div className="admin-fallback-row-list">
            {visibleItems.map((item) => {
              const contentKey = canonicalKey(item.key);
              const saved = savedKeys.has(item.key) || savedKeys.has(contentKey);
              return (
                <article key={item.key} className="admin-fallback-row admin-source-only-row">
                  <div className="admin-fallback-row-main">
                    <p className="admin-eyebrow">{item.section} / packaged source</p>
                    <h3>{item.label}</h3>
                    <code>{contentKey}</code>
                  </div>
                  <div className="admin-fallback-row-actions">
                    <span className={`ui-pill admin-status ${saved ? "status-live" : "status-draft"}`}>{saved ? "Saved source" : "Source only"}</span>
                    <button type="button" onClick={() => onOpen(item)}>{saved ? "Edit source" : "View source"}</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </AdminPaginatedCollection>
    </section>
  );
}
