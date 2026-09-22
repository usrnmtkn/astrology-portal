import { getAuthAccount, isAuthSessionStorageKey, onAuthAccountChange } from "./auth";

export type VerifiedAccountState = { id: string | null; checked: boolean; error: boolean };

// Auth callbacks are signals, not verification. Keep nested SDK calls outside
// its auth lock, and invalidate old responses before resolving a new account.
export function observeVerifiedAccount(notify: (state: VerifiedAccountState) => void) {
  let generation = 0;
  let disposed = false;
  let id: string | null = null;
  const recover = () => {
    const version = ++generation;
    void getAuthAccount().then((account) => {
      if (disposed || version !== generation) return;
      id = account?.id ?? null;
      notify({ id, checked: true, error: false });
    }).catch(() => {
      if (!disposed && version === generation) notify({ id: null, checked: true, error: true });
    });
  };
  const unsubscribe = onAuthAccountChange((account, event) => {
    if (event === "INITIAL_SESSION") return;
    if (event === "SIGNED_OUT" || account?.id !== id) {
      ++generation;
      id = null;
      notify({ id: null, checked: event === "SIGNED_OUT", error: false });
    }
    if (event !== "SIGNED_OUT") queueMicrotask(recover);
  });
  const storage = (event: StorageEvent) => {
    if (!isAuthSessionStorageKey(event.key)) return;
    let nextId: string | null = null;
    try { nextId = JSON.parse(event.newValue ?? "null")?.user?.id ?? null; } catch { /* Invalid storage is unverified. */ }
    if (nextId !== id) {
      ++generation;
      id = null;
      notify({ id: null, checked: false, error: false });
    }
    recover();
  };
  const visible = () => { if (document.visibilityState === "visible") recover(); };
  window.addEventListener("focus", recover);
  window.addEventListener("pageshow", recover);
  window.addEventListener("online", recover);
  window.addEventListener("storage", storage);
  document.addEventListener("visibilitychange", visible);
  recover();
  return () => {
    disposed = true;
    ++generation;
    unsubscribe();
    window.removeEventListener("focus", recover);
    window.removeEventListener("pageshow", recover);
    window.removeEventListener("online", recover);
    window.removeEventListener("storage", storage);
    document.removeEventListener("visibilitychange", visible);
  };
}
