import type { ReactNode } from "react";

export function ListPage({ children }: { children: ReactNode }) {
  return <section className="admin-main">{children}</section>;
}
