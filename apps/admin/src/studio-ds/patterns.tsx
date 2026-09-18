import type { ReactNode } from "react";

export { AdminPageHeader as PageHeader } from "../AdminStudioPrimitives";
export { AdminFilterBar as Filters } from "./components";

export function MetricCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <article className="admin-status-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
