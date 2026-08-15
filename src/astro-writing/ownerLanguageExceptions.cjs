"use strict";

/**
 * Owner language exceptions.
 *
 * Every entry here is a decision the owner has already made. A check that
 * fires on one of these is the check being wrong, not the writing. This file
 * exists so those decisions live in code instead of being re-asked.
 *
 * Add to it whenever the owner says "that one is fine." Never remove an entry
 * without the owner saying so.
 */

const EXCEPTIONS = [
  // ---------------------------------------------------------------- diction
  {
    id: "natural-things",
    rule: 'the word "things" is allowed when used naturally',
    decided: "2026-08-14, daily at-a-glance voice pass; listed under Protected owner-liked language",
    // Banned only as vague filler ("things will shift", "manage things").
    // Allowed in ordinary idiom.
    allow: [
      /\bthe small things\b/i,
      /\bthings are running\b/i,
      /\bmake things that\b/i,
      /\bthings that don't\b/i
    ],
    check: "banned-word-things"
  },
  {
    id: "real-work-idiom",
    rule: '"real work" and similar idioms are allowed; the ban targets "real" as a vague intensifier',
    decided: "2026-08-14, owner confirmed row 62 is fine",
    allow: [/\breal work\b/i, /\breal life\b/i, /\bthe real thing\b/i],
    check: "banned-word-real"
  },

  // ------------------------------------------------------------- constructions
  {
    id: "ordinary-contrast",
    rule: "ordinary contrastive not/but is allowed; only the rhetorical not-this-but-that flourish is banned",
    decided: "2026-08-14, owner confirmed rows 4 and 15 are fine",
    // Correct: "A quick response is not always the wrong one, but it gives you less time."
    // Banned:  "This is not X. It is Y." used as a definitional turn.
    allow: [
      /\bnot always\b[^.]{0,60}\bbut\b/i,
      /\bnot\b[^.]{0,40}\byet\b[^.]{0,40}\bbut\b/i,
      /\bdid not\b[^.]{0,50}\bbut\b/i,
      /\bcannot\b[^.]{0,50}\bbut\b/i
    ],
    check: "not-x-but-y"
  },

  // --------------------------------------------------------------- register
  {
    id: "daily-surface-invitation",
    rule: "gentle invitational phrasing is allowed on the daily surface; the coaching ban is a Friends-card rule",
    decided: "2026-08-14, owner confirmed row 7 is fine",
    surfaces: ["daily", "sky", "you-transit"],
    allow: [/\blet yourself\b/i, /\btake a long\b/i, /\bgive yourself enough\b/i],
    check: "coaching-permission"
  },

  // ------------------------------------------------- protected exact phrases
  // Owner-liked language recorded in the voice-pass summary. No check may
  // flag these, on any surface, for any reason.
  {
    id: "protected-phrases",
    rule: "exact owner-liked phrases; never flag",
    decided: "2026-08-14, Protected owner-liked language, daily voice pass",
    allow: [
      /you preach balance while practicing burnout/i,
      /someone else's pressure can easily b/i
    ],
    check: "*"
  }
];

/** True when this hit sits inside something the owner has already allowed. */
function isAllowed(checkId, text, matchIndex = 0, surface = null) {
  const window = String(text).slice(Math.max(0, matchIndex - 120), matchIndex + 160);
  for (const e of EXCEPTIONS) {
    if (e.check !== "*" && e.check !== checkId) continue;
    if (e.surfaces && surface && !e.surfaces.includes(surface)) continue;
    if (e.allow.some((p) => p.test(window))) return { allowed: true, exception: e.id, rule: e.rule, decided: e.decided };
  }
  return { allowed: false };
}

module.exports = { EXCEPTIONS, isAllowed };
