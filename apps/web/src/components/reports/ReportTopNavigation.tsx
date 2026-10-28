import {
  Asterisk,
  CalendarDays,
  BookOpen,
  Moon,
  FileText,
  Settings,
  Smile,
  User
} from "lucide-react";
import { useEffect, useState } from "react";
import { getAuthAccount, type AuthAccount } from "../../services/auth";
import { NavigationPill } from "../NavigationPill";
import { SiteMenuSheet } from "../SiteMenuSheet";
import { ThemeToggleButton, type UiThemeOption } from "../ThemeControls";

export type ReportTheme = UiThemeOption;

function ReportSkyNavIcon({ size = 18 }: { size?: number }) {
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

function goToAppRoute(hash: "sky" | "calendar" | "horoscopes" | "articles" | "you" | "friends" | "account" | "settings" | "learn") {
  window.location.assign(`/#${hash}`);
}

export function ReportTopNavigation({
  theme,
  onThemeChange
}: {
  theme: ReportTheme;
  onThemeChange: (theme: ReportTheme) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [account, setAccount] = useState<AuthAccount | null>(null);
  const signedIn = Boolean(account);

  useEffect(() => {
    let cancelled = false;
    void getAuthAccount().then((account) => {
      if (!cancelled) setAccount(account);
    }).catch(() => {
      if (!cancelled) setAccount(null);
    });
    return () => { cancelled = true; };
  }, []);

  const changeTheme = (nextTheme: ReportTheme) => {
    window.localStorage.setItem("tldrastro:theme", nextTheme);
    onThemeChange(nextTheme);
  };

  const navigate = (hash: "sky" | "calendar" | "horoscopes" | "articles" | "you" | "friends" | "account" | "settings" | "learn") => {
    setMenuOpen(false);
    goToAppRoute(hash);
  };

  return (
    <header className="topbar report-topbar">
      <NavigationPill>
        <button className="brand-dot" type="button" aria-label="Home" onClick={() => goToAppRoute("sky")}>
          <Asterisk size={18} aria-hidden="true" />
        </button>
        <button className="brand-word" type="button" onClick={() => goToAppRoute("sky")}>
          TLDR Astro
        </button>
        <nav className="site-nav" aria-label="Primary navigation">
          <button type="button" onClick={() => goToAppRoute("sky")}>
            <ReportSkyNavIcon size={18} />
            <span>Sky</span>
          </button>
          <button type="button" onClick={() => goToAppRoute("calendar")}>
            <CalendarDays size={18} aria-hidden="true" />
            <span>Calendar</span>
          </button>
          <button type="button" onClick={() => goToAppRoute("horoscopes")}>
            <Moon size={18} aria-hidden="true" />
            <span>Horoscopes</span>
          </button>
          <button type="button" onClick={() => goToAppRoute("articles")}>
            <BookOpen size={18} aria-hidden="true" />
            <span>Guide</span>
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
      </NavigationPill>

      <div className="topbar-actions">
        <ThemeToggleButton theme={theme} onThemeChange={changeTheme} />
        <button
          className="menu-toggle"
          id="report-menu-toggle"
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
          <SiteMenuSheet onClose={() => setMenuOpen(false)} restoreFocusId="report-menu-toggle" theme={theme} onThemeChange={changeTheme} profile={account}>
          <div className="site-menu" id="report-site-overflow-menu" role="menu" aria-label="Site menu">
            <button type="button" role="menuitem" onClick={() => navigate("sky")}>
              <ReportSkyNavIcon size={20} />
              <span>Sky</span>
            </button>
            <button type="button" role="menuitem" onClick={() => navigate("calendar")}>
              <CalendarDays size={20} aria-hidden="true" />
              <span>Calendar</span>
            </button>
            <button type="button" role="menuitem" onClick={() => navigate("horoscopes")}>
              <Moon size={20} aria-hidden="true" />
              <span>Horoscopes</span>
            </button>
            <button type="button" role="menuitem" onClick={() => navigate("articles")}>
              <BookOpen size={20} aria-hidden="true" />
              <span>Guide</span>
            </button>
            <button type="button" role="menuitem" onClick={() => navigate("you")}>
              <Smile size={20} aria-hidden="true" />
              <span>You</span>
            </button>
            <button type="button" role="menuitem" onClick={() => navigate("friends")}>
              <FriendsNavIcon size={20} />
              <span>Friends</span>
            </button>
            <button type="button" role="menuitem" onClick={() => navigate("learn")}><BookOpen size={20} aria-hidden="true"/><span>Learn</span></button>
            <button className="active" type="button" role="menuitem" onClick={() => { setMenuOpen(false); window.location.assign("/reports/"); }}>
              <FileText size={20} aria-hidden="true" />
              <span>Reports</span>
            </button>
            {signedIn ? (
              <button type="button" role="menuitem" onClick={() => navigate("account")}>
                <User size={20} aria-hidden="true" />
                <span>Account</span>
              </button>
            ) : null}
            <button type="button" role="menuitem" onClick={() => navigate("settings")}>
              <Settings size={20} aria-hidden="true" />
              <span>Settings</span>
            </button>
            {!signedIn ? (
              <div className="site-menu-auth" aria-label="Account actions">
                <button type="button" role="menuitem" onClick={() => window.location.assign("/?auth=login")}>Login</button>
              </div>
            ) : null}
          </div>
          </SiteMenuSheet>
        ) : null}
      </div>
    </header>
  );
}
