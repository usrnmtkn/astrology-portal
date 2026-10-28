import { useEffect, useReducer } from "react";
import { natalReadingRoute } from "../services/natalReadingPath";
import { articleHistoryChangeEvent } from "../services/articleNavigation";

export function useNatalReadingRoute() {
  const [, refresh] = useReducer(value => value + 1, 0);
  useEffect(() => {
    const sync = () => refresh();
    const events = ["popstate", "hashchange", articleHistoryChangeEvent];
    events.forEach(event => window.addEventListener(event, sync));
    return () => { events.forEach(event => window.removeEventListener(event, sync)); };
  }, []);
  return natalReadingRoute(window.location.pathname);
}
