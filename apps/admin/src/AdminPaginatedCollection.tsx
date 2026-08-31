import { useEffect, useMemo, useState, type ReactNode } from "react";

type AdminPaginatedCollectionProps<T> = {
  items: readonly T[];
  label: string;
  pageSize: number;
  resetKey?: string;
  children: (visibleItems: readonly T[]) => ReactNode;
};

export function AdminPaginatedCollection<T>({
  items,
  label,
  pageSize,
  resetKey = "",
  children
}: AdminPaginatedCollectionProps<T>) {
  const [requestedPage, setRequestedPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(requestedPage, pageCount - 1);
  const start = page * pageSize;
  const end = Math.min(start + pageSize, items.length);
  const visibleItems = useMemo(() => items.slice(start, end), [items, start, end]);

  useEffect(() => {
    setRequestedPage(0);
  }, [resetKey]);

  useEffect(() => {
    if (requestedPage !== page) setRequestedPage(page);
  }, [page, requestedPage]);

  return (
    <>
      {children(visibleItems)}
      {items.length > pageSize && (
        <nav className="admin-pagination" aria-label={`${label} pagination`}>
          <span role="status" aria-live="polite">
            Showing {start + 1}–{end} of {items.length}
          </span>
          <div>
            <button type="button" onClick={() => setRequestedPage(0)} disabled={page === 0}>First</button>
            <button type="button" onClick={() => setRequestedPage((current) => Math.max(0, current - 1))} disabled={page === 0}>Previous</button>
            <span>Page {page + 1} of {pageCount}</span>
            <button type="button" onClick={() => setRequestedPage((current) => Math.min(pageCount - 1, current + 1))} disabled={page >= pageCount - 1}>Next</button>
            <button type="button" onClick={() => setRequestedPage(pageCount - 1)} disabled={page >= pageCount - 1}>Last</button>
          </div>
        </nav>
      )}
    </>
  );
}

export default AdminPaginatedCollection;
