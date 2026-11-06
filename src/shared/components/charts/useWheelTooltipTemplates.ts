import { useEffect, useMemo, useState } from "react";
import { subscribeToContentPublications } from "../../../../apps/web/src/content/contentPublicationState";
import { wheelTooltipFields } from "../../../../apps/web/src/content/wheelTooltipCatalog";
import { wheelTooltipTemplates } from "../../../../apps/web/src/content/wheelTooltipCopy";
import { subscribeToContentUpdates } from "../../../../apps/web/src/services/contentUpdateSignal";
import { loadReaderRows } from "../../../../apps/web/src/services/readerContentClient";
import type { GeneratedContentRow } from "../../../../apps/web/src/services/generatedContent";

export function useWheelTooltipTemplates(enabled = true) {
  const [revision, setRevision] = useState(0);
  const [rows, setRows] = useState<GeneratedContentRow[]>([]);
  useEffect(() => {
    if (!enabled) return;
    const refresh = () => setRevision(value => value + 1);
    const stopPublications = subscribeToContentPublications(refresh);
    const stopUpdates = subscribeToContentUpdates(refresh);
    window.addEventListener("focus", refresh);
    return () => { stopPublications(); stopUpdates(); window.removeEventListener("focus", refresh); };
  }, [enabled]);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void loadReaderRows({ keys: wheelTooltipFields.map(field => field.key) }, controller.signal).then(result => {
      if (!controller.signal.aborted) setRows(result.data ?? []);
    });
    return () => controller.abort();
  }, [revision, enabled]);
  return useMemo(() => wheelTooltipTemplates(rows), [rows, revision]);
}
