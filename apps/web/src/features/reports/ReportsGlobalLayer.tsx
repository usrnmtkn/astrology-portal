import { FileText, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  listReportLibrary,
  markReportSeen,
  reportReadyEvent,
  unreadReadyReports,
  type ReportLibraryItem,
  type ReportReadyEventDetail
} from "../../services/reportLibrary";
import "../../styles/report-notifications.css";

const pollIntervalMs = 30_000;

function findSiteMenuSlot() {
  const menu = document.querySelector<HTMLElement>(".site-menu");
  if (!menu) return null;

  let slot = menu.querySelector<HTMLElement>("[data-reports-menu-slot]");
  if (slot) return slot;

  const accountButton = [...menu.querySelectorAll<HTMLButtonElement>("button[role='menuitem']")]
    .find((button) => button.textContent?.trim() === "Account");
  if (!accountButton) return null;

  slot = document.createElement("span");
  slot.dataset.reportsMenuSlot = "true";
  slot.className = "reports-menu-slot";
  accountButton.before(slot);
  return slot;
}

export function ReportsGlobalLayer() {
  const [items, setItems] = useState<ReportLibraryItem[]>([]);
  const [menuSlot, setMenuSlot] = useState<HTMLElement | null>(null);
  const [toast, setToast] = useState<ReportReadyEventDetail | null>(null);
  const notifiedThisSessionRef = useRef(new Set<string>());
  const pathIsReport = window.location.pathname.startsWith("/reports/") || window.location.pathname === "/reports";

  const refresh = useCallback(async () => {
    try {
      const nextItems = await listReportLibrary();
      setItems(nextItems);
      const unseen = unreadReadyReports(nextItems);
      const nextToast = unseen.find((item) => !notifiedThisSessionRef.current.has(item.id));
      if (nextToast && !pathIsReport) {
        notifiedThisSessionRef.current.add(nextToast.id);
        setToast({
          sourceKind: nextToast.sourceKind,
          sourceId: nextToast.sourceId,
          title: `${nextToast.title} is ready`,
          route: nextToast.route
        });
      }
    } catch {
      // Reports are additive to the main app. A library refresh failure must not
      // interrupt Sky, Calendar, You, Friends, Account, or Settings.
    }
  }, [pathIsReport]);

  useEffect(() => {
    if (pathIsReport) return undefined;
    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, pollIntervalMs);
    const handleVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", handleVisible);
    document.addEventListener("visibilitychange", handleVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", handleVisible);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, [pathIsReport, refresh]);

  useEffect(() => {
    if (pathIsReport) return undefined;
    const handleReady = (event: Event) => {
      const detail = (event as CustomEvent<ReportReadyEventDetail>).detail;
      if (detail?.sourceId && detail.route) {
        const key = `${detail.sourceKind}:${detail.sourceId}`;
        notifiedThisSessionRef.current.add(key);
        setToast(detail);
      }
      void refresh();
    };
    window.addEventListener(reportReadyEvent, handleReady);
    return () => window.removeEventListener(reportReadyEvent, handleReady);
  }, [pathIsReport, refresh]);

  useEffect(() => {
    if (pathIsReport) return undefined;
    const syncMenuSlot = () => setMenuSlot(findSiteMenuSlot());
    syncMenuSlot();
    const observer = new MutationObserver(syncMenuSlot);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathIsReport]);

  const unreadCount = useMemo(() => unreadReadyReports(items).length, [items]);

  const openReport = useCallback(async (detail: ReportReadyEventDetail) => {
    const item = items.find((candidate) => (
      candidate.sourceKind === detail.sourceKind && candidate.sourceId === detail.sourceId
    ));
    if (item) {
      try {
        await markReportSeen(item);
      } catch {
        // Opening the saved report is more important than clearing its badge.
      }
    }
    window.location.assign(detail.route);
  }, [items]);

  if (pathIsReport) return null;

  return (
    <>
      {menuSlot ? createPortal(
        <button
          className="site-menu-reports"
          type="button"
          role="menuitem"
          aria-label={`Reports${unreadCount > 0 ? `, ${unreadCount} new` : ""}`}
          onClick={() => window.location.assign("/reports/")}
        >
          <FileText size={20} aria-hidden="true" />
          <span>Reports</span>
          {unreadCount > 0 ? <span className="friends-nav-badge friends-nav-badge-menu reports-nav-badge" aria-hidden="true">{unreadCount}</span> : null}
        </button>,
        menuSlot
      ) : null}
      {toast ? (
        <aside className="report-ready-toast" role="status" aria-live="polite">
          <button className="report-ready-toast__open" type="button" onClick={() => void openReport(toast)}>
            <span className="report-ready-toast__eyebrow">Report ready</span>
            <strong>{toast.title}</strong>
            <span>View report</span>
          </button>
          <button className="report-ready-toast__dismiss" type="button" aria-label="Dismiss report notification" onClick={() => setToast(null)}>
            <X size={18} aria-hidden="true" />
          </button>
        </aside>
      ) : null}
    </>
  );
}
