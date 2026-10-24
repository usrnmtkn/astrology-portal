import type { ReactNode } from 'react';

/** A reading-order index; callers own their template syntax and editing rules. */
export function AssemblySections({ label, children }: { label: string; children: ReactNode }) {
  return <ol className="studio-assembly-sections" aria-label={label}>{children}</ol>;
}
