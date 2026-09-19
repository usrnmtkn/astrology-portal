import { AdminDataTable, StudioButton } from "./studio-ds/components";
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
          <AdminDataTable label="Packaged source phrases" columns={["Phrase", "Source key", "Status", "Edit"]}>
            {visibleItems.map((item) => {
              const contentKey = canonicalKey(item.key);
              const saved = savedKeys.has(item.key) || savedKeys.has(contentKey);
              return (
                <tr key={item.key}>
                  <th scope="row">
                    <span className="admin-content-row-title">{item.label}</span>
                    <small className="admin-field-hint">{item.section} / packaged source</small>
                  </th>
                  <td><code className="admin-content-row-key">{contentKey}</code></td>
                  <td><span className="admin-field-hint">{saved ? "Saved source" : "Source only"}</span></td>
                  <td>
                    <StudioButton type="button" onClick={() => onOpen(item)}>{saved ? "Edit source" : "View source"}</StudioButton>
                  </td>
                </tr>
              );
            })}
          </AdminDataTable>
        )}
      </AdminPaginatedCollection>
    </section>
  );
}
