import { useEffect, useState } from "react";
import { calendarSeasonPhraseSourceKeys, type CalendarSeasonSourceRow } from "../../../src/content-studio/calendarSeasonPhrases";

type Loader = (keys: string[]) => Promise<CalendarSeasonSourceRow[]>;
/** Reuse the owner's authenticated exact-key loader; do not create another credential store. */
export function useCalendarSeasonPhraseSources(sections: unknown, loadRows: Loader, enabled: boolean, revision: string) {
  const keysJson = JSON.stringify(enabled ? calendarSeasonPhraseSourceKeys(sections) : []);
  const key = `${keysJson}|${revision}`;
  const [state, setState] = useState<{ key: string; loadRows: Loader; rows?: CalendarSeasonSourceRow[]; error?: string }>();
  useEffect(() => {
    const keys: string[] = JSON.parse(keysJson);
    if (!keys.length) return;
    let active = true;
    // Avoid an authenticated request for each keystroke in a source-token input.
    const timer = window.setTimeout(() => {
      void loadRows(keys).then(rows => {
        if (!Array.isArray(rows) || rows.some(row => !keys.includes(row.content_key) || row.inventory_only)) throw new Error("Could not verify the selected phrase sources.");
        if (active) setState({ key, loadRows, rows });
      }).catch(reason => { if (active) setState({ key, loadRows, error: reason instanceof Error ? reason.message : "Could not load seasonal phrase sources." }); });
    }, 200);
    return () => { active = false; window.clearTimeout(timer); };
  }, [key, loadRows]);
  const current = state?.key === key && state.loadRows === loadRows ? state : undefined;
  return { rows: current?.rows ?? [], loading: keysJson !== "[]" && !current, error: current?.error };
}
