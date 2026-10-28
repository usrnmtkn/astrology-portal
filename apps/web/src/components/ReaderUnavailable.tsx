import { useEffect, useId } from "react";
import { EightBall } from "./EightBall";
import "../styles/reader-unavailable.css";

export type ReaderUnavailableKind = "page" | "article" | "removed-article" | "placement" | "date" | "horoscope" | "profile" | "connection" | "chart" | "invite" | "report" | "signed-out";
const states: Record<ReaderUnavailableKind, [string, string, string, string]> = {
  page: ["Page not found", "This link doesn’t go anywhere. It may be mistyped or out of date.", "Go to Sky", "/#sky"],
  article: ["Article unavailable", "This article isn’t published right now.", "Go to the Guide", "/#articles"],
  "removed-article": ["This article was removed", "It’s no longer on TLDR Astro.", "Go to the Guide", "/#articles"],
  placement: ["We couldn’t find that placement", "Check the planet and sign in the link.", "Go to Sky", "/#sky"],
  date: ["Date not found", "We couldn’t read the date in this link.", "Go to today", "/#calendar"],
  horoscope: ["We couldn’t find that horoscope", "The sign or date in the link isn’t one we publish.", "Go to Horoscopes", "/#horoscopes"],
  profile: ["There’s no one at this handle", "The handle may have changed.", "Search people", "/#friends?tab=circle"],
  connection: ["You’re not connected", "Their profile is only visible to their circle.", "Go to your circle", "/#friends?tab=circle"],
  chart: ["This chart was removed", "It may have been deleted from your saved charts.", "Go to Charts", "/#friends?tab=charts"],
  invite: ["This invite has expired", "Invite links work once and expire after 30 days. Ask for a new one.", "Go to Friends", "/#friends"],
  report: ["Report not found", "It may have been deleted.", "Go to Reports", "/reports/"],
  "signed-out": ["Log in to see this page", "This page is only visible to signed-in members.", "Log in", "/?auth=login"],
};

export function ReaderUnavailable({ kind, name, onAction }: { kind: ReaderUnavailableKind; name?: string; onAction?: () => void }) {
  const id = useId();
  const [fallbackTitle, body, action, href] = states[kind];
  const title = name && kind === "profile" ? `There’s no one at @${name}` : name && kind === "connection" ? `You’re not connected to ${name}` : fallbackTitle;
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} · TLDR Astro`;
    return () => { document.title = previous; };
  }, [title]);
  return <section className="reader-unavailable" aria-labelledby={`${id}-title`}>
    <div className="reader-unavailable__card">
      <EightBall className="reader-unavailable__art"/>
      <h1 id={`${id}-title`}>{title}</h1><p>{body}</p>
      {onAction ? <button type="button" onClick={onAction}>{action}</button> : <a href={href}>{action}</a>}
    </div>
  </section>;
}
