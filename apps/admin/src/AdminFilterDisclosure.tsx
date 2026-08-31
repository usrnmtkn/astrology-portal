import { useEffect, useState, type ReactNode } from "react";

export default function AdminFilterDisclosure({ children, summary }: { children: ReactNode; summary: string }) {
  const [open, setOpen] = useState(() => typeof window === "undefined" || !window.matchMedia("(max-width: 860px)").matches);
  useEffect(() => {
    const viewport = window.matchMedia("(max-width: 860px)");
    const sync = () => setOpen(!viewport.matches);
    viewport.addEventListener("change", sync);
    return () => viewport.removeEventListener("change", sync);
  }, []);
  return <section className="admin-filter-disclosure" data-open={open ? "true" : "false"}>
    <button className="admin-filter-disclosure-toggle" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <span>Filters</span><small>{summary}</small>
    </button>
    <div className="admin-filter-disclosure-content" hidden={!open}>{children}</div>
  </section>;
}
