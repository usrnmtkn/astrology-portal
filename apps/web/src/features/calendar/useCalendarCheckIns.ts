import { useEffect, useRef, useState } from "react";
import { getVerifiedAuthUser, onAuthAccountChange } from "../../services/auth";
import {
  listCalendarCheckInLibrary, listCalendarCheckInSummaries, loadCalendarCheckIn,
  type CalendarCheckInEntry, type CalendarCheckInLibrary, type CalendarCheckInSummary
} from "../../services/calendarCheckIns";
import { startReaderMeasurement } from "../../services/readerPerformance";
import { withRequestDeadline } from "../../services/requestDeadline";

type LoadState = "loading" | "ready" | "error";
const emptyLibrary: CalendarCheckInLibrary = { tags: [], people: [] };

export function useCalendarCheckIns({ dateKey, fromDateKey, toDateKey, editorOpen, closeEditor }: {
  dateKey: string;
  fromDateKey?: string;
  toDateKey?: string;
  editorOpen: boolean;
  closeEditor: () => void;
}) {
  const [account, setAccount] = useState<{ id: string | null; state: LoadState }>({ id: null, state: "loading" });
  const accountId = useRef<string | null>(null);
  const closeRef = useRef(closeEditor);
  closeRef.current = closeEditor;
  const [retry, setRetry] = useState(0);
  const [libraryRetry, setLibraryRetry] = useState(0);
  const [entry, setEntry] = useState<{ accountId: string; dateKey: string; state: LoadState; value?: CalendarCheckInEntry }>();
  const [summaries, setSummaries] = useState<{ accountId: string; values: Record<string, CalendarCheckInSummary> }>();
  const [library, setLibrary] = useState<{ accountId: string; state: LoadState; value: CalendarCheckInLibrary }>();
  const savedSummaries = useRef<Record<string, CalendarCheckInSummary>>({});

  useEffect(() => {
    let request: AbortController | undefined;
    const verify = () => {
      request?.abort();
      const controller = new AbortController();
      request = controller;
      void withRequestDeadline(() => getVerifiedAuthUser(), { signal: controller.signal }).then(user => {
        if (controller.signal.aborted) return;
        const id = user?.id ?? null;
        if (accountId.current !== id) {
          if (accountId.current) closeRef.current();
          accountId.current = id;
          savedSummaries.current = {};
          setEntry(undefined);
          setLibrary(undefined);
          setSummaries(undefined);
        }
        setAccount({ id, state: "ready" });
      }).catch(() => {
        if (!controller.signal.aborted) setAccount(current => ({ ...current, state: "error" }));
      });
    };
    verify();
    const unsubscribe = onAuthAccountChange((next) => {
      // Invalidate immediately on account switches, before asynchronous verification.
      if (accountId.current && next?.id !== accountId.current) {
        closeRef.current();
        accountId.current = null;
        savedSummaries.current = {};
        setAccount({ id: null, state: "loading" });
        setEntry(undefined);
        setLibrary(undefined);
        setSummaries(undefined);
      }
      verify();
    });
    return () => { request?.abort(); unsubscribe(); };
  }, [retry]);

  const userId = account.state === "ready" ? account.id : null;
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    const finish = startReaderMeasurement("checkin.entry");
    setEntry({ accountId: userId, dateKey, state: "loading" });
    void loadCalendarCheckIn(dateKey, { signal: controller.signal, expectedUserId: userId }).then(value => {
      if (!controller.signal.aborted && accountId.current === userId) {
        setEntry({ accountId: userId, dateKey, value, state: "ready" });
        requestAnimationFrame(() => finish("ready"));
      }
    }).catch(error => {
      finish(error?.name === "TimeoutError" ? "timeout" : controller.signal.aborted ? "cancelled" : "error");
      if (!controller.signal.aborted && accountId.current === userId) setEntry({ accountId: userId, dateKey, state: "error" });
    });
    return () => { controller.abort(); finish("cancelled"); };
  }, [userId, dateKey, retry]);

  useEffect(() => {
    if (!userId || !fromDateKey || !toDateKey) return;
    const controller = new AbortController();
    void listCalendarCheckInSummaries({ fromDateKey, toDateKey }, { signal: controller.signal, expectedUserId: userId }).then(values => {
      if (!controller.signal.aborted && accountId.current === userId) {
        setSummaries({ accountId: userId, values: { ...values, ...savedSummaries.current } });
      }
    }).catch(() => { /* Indicators are optional; the selected entry has its own retry. */ });
    return () => controller.abort();
  }, [userId, fromDateKey, toDateKey, retry]);

  useEffect(() => {
    if (!userId || !editorOpen) return;
    const controller = new AbortController();
    const finish = startReaderMeasurement("checkin.library");
    setLibrary(current => ({ accountId: userId, state: "loading", value: current?.accountId === userId ? current.value : emptyLibrary }));
    void listCalendarCheckInLibrary({ signal: controller.signal, expectedUserId: userId }).then(value => {
      if (!controller.signal.aborted && accountId.current === userId) {
        setLibrary({ accountId: userId, state: "ready", value });
        requestAnimationFrame(() => finish("ready"));
      }
    }).catch(error => {
      finish(error?.name === "TimeoutError" ? "timeout" : controller.signal.aborted ? "cancelled" : "error");
      if (!controller.signal.aborted && accountId.current === userId) {
        setLibrary(current => ({ accountId: userId, state: "error", value: current?.accountId === userId ? current.value : emptyLibrary }));
      }
    });
    return () => { controller.abort(); finish("cancelled"); };
  }, [userId, editorOpen, libraryRetry]);

  const currentEntry = entry?.accountId === userId && entry.dateKey === dateKey ? entry : undefined;
  const currentLibrary = library?.accountId === userId ? library : undefined;
  return {
    signedIn: Boolean(userId),
    accountId: userId,
    loadState: account.state !== "ready" ? account.state : !userId ? "ready" as const : currentEntry?.state ?? "loading",
    value: currentEntry?.value,
    summaries: summaries?.accountId === userId ? summaries.values : {},
    library: currentLibrary?.value ?? emptyLibrary,
    libraryState: !userId ? "ready" as const : currentLibrary?.state ?? "loading",
    retry: () => setRetry(value => value + 1),
    retryLibrary: () => setLibraryRetry(value => value + 1),
    updateLibrary: (update: (value: CalendarCheckInLibrary) => CalendarCheckInLibrary) => {
      if (userId !== accountId.current || !userId) return;
      setLibrary(current => ({ accountId: userId, state: current?.state ?? "ready", value: update(current?.value ?? emptyLibrary) }));
    },
    saved: (value: CalendarCheckInEntry) => {
      if (userId !== accountId.current || !userId) return;
      setEntry({ accountId: userId, dateKey, value, state: "ready" });
      savedSummaries.current[dateKey] = { mood: value.mood };
      setSummaries(current => ({ accountId: userId, values: { ...current?.values, [dateKey]: { mood: value.mood } } }));
    }
  };
}
