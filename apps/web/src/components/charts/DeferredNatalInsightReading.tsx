import { lazy, Suspense, type ComponentProps } from "react";

const Reading = lazy(() => import("./NatalInsightReading").then(module => ({ default: module.NatalInsightReading })));

/** Load the reading and its formatting parser only after a topic is opened. */
export function DeferredNatalInsightReading(props: ComponentProps<typeof Reading>) {
  return <Suspense fallback={<p role="status">Loading the reading…</p>}><Reading {...props} /></Suspense>;
}
