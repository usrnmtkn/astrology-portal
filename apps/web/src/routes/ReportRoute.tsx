import {
  CalendarDays,
  FileText,
  LogOut,
  Moon,
  Settings,
  Smile,
  Sun,
  User
} from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ReportCheckoutResultView, ReportDeliveryView } from "../components/reports/ReportDeliveryView";
import { signOutAuth } from "../services/auth";
import "../styles/report-article.css";
import "../styles/report-library.css";

const ReportLibraryView = lazy(() =>
  import("../components/reports/ReportLibraryView").then((module) => ({ default: module.ReportLibraryView }))
);

const GeneratedReportDeliveryView = lazy(() =>
  import("../components/reports/ReportLibraryView").then((module) => ({ default: module.GeneratedReportDeliveryView }))
);

type ReportTheme = "light" | "dark";

function LibraryFallback() {
  return <main className="report-delivery-state" role="status" />;
}

function storedReportTheme(): ReportTheme {
  return window.localStorage.getItem("tldrastro:theme") === "dark" ? "dark" : "light";
}

function ReportBrandIcon({ size = 18 }: { size?: number }) {
  return (
    <svg aria-hidden="true" fill="none" height={size} viewBox="0 0 24 24" width={size} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 3.75 14.35 9.65 20.25 12 14.35 14.35 12 20.25 9.65 14.35 3.75 12 9.65 9.65 12 3.75Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    </svg>
  );
}

function FriendsNavIcon({ size = 18 }: { size?: number }) {
  return (
    <svg aria-hidden="true" fill="none" height={size} viewBox="0 0 24 24" width={size} xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="15" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <span className="hamburger-icon" aria-hidden="true">
      <span className="hamburger-line hamburger-line-top" />
      <span className="hamburger-line hamburger-line-middle" />
      <span className="hamburger-line hamburger-line-bottom" />
    </span>
  );
}

function goToAppRoute(hash: "sky" | "calendar" | "you" | "friends" | "account" | "settings") {
  window.location.assign(`/#${hash}`);
}

function ReportTopNavigation({
  theme,
  onThemeChange
}: {
  theme: ReportTheme;
  onThemeChange: (theme: ReportTheme) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (menuRef.current?.contains(event.target) || menuTriggerRef.current?.contains(event.target)) return;
      setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuTriggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const toggleTheme = () => {
    const nextTheme: ReportTheme = theme === "dark" ? "light" : "dark";
    window.localStorage.setItem("tldrastro:theme", nextTheme);
    onThemeChange(nextTheme);
  };

  const navigate = (hash: "sky" | "calendar" | "you" | "friends" | "account" | "settings") => {
    setMenuOpen(false);
    goToAppRoute(hash);
  };

  return (
    <header className="topbar report-topbar">
      <div className="nav-pill">
        <button className="brand-dot" type="button" aria-label="Home" onClick={() => goToAppRoute("sky")}>
          <ReportBrandIcon size={18} />
        </button>
        <button className="brand-word" type="button" onClick={() => goToAppRoute("sky")}>
          TLDR Astro
        </button>
        <nav className="site-nav" aria-label="Primary navigation">
          <button type="button" onClick={() => goToAppRoute("sky")}>
            <ReportBrandIcon size={18} />
            <span>Sky</span>
          </button>
          <button type="button" onClick={() => goToAppRoute("calendar")}>
            <CalendarDays size={18} aria-hidden="true" />
            <span>Calendar</span>
          </button>
          <button type="button" onClick={() => goToAppRoute("you")}>
            <Smile size={18} aria-hidden="true" />
            <span>You</span>
          </button>
          <button type="button" onClick={() => goToAppRoute("friends")}>
            <FriendsNavIcon size={18} />
            <span>Friends</span>
          </button>
        </nav>
      </div>

      <div className="topbar-actions">
        <button
          className="theme-toggle"
          type="button"
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          onClick={toggleTheme}
        >
          {theme === "dark" ? <Moon size={22} aria-hidden="true" /> : <Sun size={22} aria-hidden="true" />}
        </button>
        <button
          className="menu-toggle"
          ref={menuTriggerRef}
          type="button"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-controls="report-site-overflow-menu"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((current) => !current)}
        >
          <HamburgerIcon />
        </button>
        {menuOpen ? (
          <div className="site-menu" id="report-site-overflow-menu" ref={menuRef} role="menu" aria-label="Site menu">
            <button type="button" role="menuitem" onClick={() => navigate("sky")}>
              <ReportBrandIcon size={20} />
              <span>Sky</span>
            </button>
            <button type="button" role="menuitem" onClick={() => navigate("calendar")}>
              <CalendarDays size={20} aria-hidden="true" />
              <span>Calendar</span>
            </button>
            <button type="button" role="menuitem" onClick={() => navigate("you")}>
              <Smile size={20} aria-hidden="true" />
              <span>You</span>
            </button>
            <button type="button" role="menuitem" onClick={() => navigate("friends")}>
              <FriendsNavIcon size={20} />
              <span>Friends</span>
            </button>
            <button className="active" type="button" role="menuitem" onClick={() => { setMenuOpen(false); window.location.assign("/reports/"); }}>
              <FileText size={20} aria-hidden="true" />
              <span>Reports</span>
            </button>
            <button type="button" role="menuitem" onClick={() => navigate("account")}>
              <User size={20} aria-hidden="true" />
              <span>Account</span>
            </button>
            <button type="button" role="menuitem" onClick={() => navigate("settings")}>
              <Settings size={20} aria-hidden="true" />
              <span>Settings</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                void signOutAuth().finally(() => goToAppRoute("sky"));
              }}
            >
              <LogOut size={20} aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}

function ReportThemeBoundary({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ReportTheme>(storedReportTheme);

  useEffect(() => {
    const previousTheme = document.documentElement.dataset.theme;
    document.documentElement.dataset.theme = theme;
    return () => {
      if (previousTheme) document.documentElement.dataset.theme = previousTheme;
      else delete document.documentElement.dataset.theme;
    };
  }, [theme]);

  return (
    <div className={`app-shell mode-detail report-route-root theme-${theme}`}>
      <ReportTopNavigation theme={theme} onThemeChange={setTheme} />
      {children}
    </div>
  );
}

export function ReportRoute() {
  const path = window.location.pathname.replace(/\/+$/u, "") || "/";
  let content: ReactNode;

  if (path === "/reports/checkout/success") content = <ReportCheckoutResultView result="success" />;
  else if (path === "/reports/checkout/cancel") content = <ReportCheckoutResultView result="cancel" />;
  else if (path === "/reports") content = <Suspense fallback={<LibraryFallback />}><ReportLibraryView /></Suspense>;
  else if (/^\/reports\/generated\/[^/]+$/u.test(path)) {
    content = <Suspense fallback={<LibraryFallback />}><GeneratedReportDeliveryView /></Suspense>;
  } else content = <ReportDeliveryView />;

  return <ReportThemeBoundary>{content}</ReportThemeBoundary>;
}
