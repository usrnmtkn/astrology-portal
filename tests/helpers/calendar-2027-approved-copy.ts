import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { getCalendarSubscriptionEvents, type LunarCalendarEvent } from "../../apps/web/src/services/ephemeris.js";
import { contentStudioExactSkyAspectKeys } from "../../apps/web/src/services/skyAspectContent.js";
import { calendarEventGeneratedContentKeys } from "../../src/shared/features/calendar/calendarContentKeys.js";
import { servingPackageRecords } from "../../api/_lib/serving-package-records.js";
import { publicationTimestamp } from "../../apps/web/src/content/contentPublicationState.js";
import { calendarLocalDateKey } from "../../apps/web/src/features/calendar/calendarPhaseLabel.js";

type Snapshot = { rows: Record<string, any>[]; publications: Record<string, any>[] };
const slug = (s: string) => s.toLowerCase().replaceAll(" ", "-");
const fixtureDate = "2026-11-17T12:00:00.000Z";

function baselineAspectRow(key: string) {
  const [, , a, aspect, b] = key.split(".");
  const paths = [`${a}-${aspect}-${b}`, `${b}-${aspect}-${a}`].map(id => new URL(`../../packages/astro-knowledge/data/transits/${id}.json`, import.meta.url));
  let source: any;
  for (const path of paths) { try { source = JSON.parse(readFileSync(path, "utf8")); break; } catch {} }
  assert(source?.status === "LIVE" && source.readerCopy?.body && source.readerCopy.approvedVia, `${key}: approved source required`);
  const body = source.readerCopy.body;
  const record = { contentKey: key, content_role: "full_copy", review_status: "approved", Body: body,
    render_policy: "content-studio-exact-sky-aspect-v1", nodeAxisPole: a.endsWith("node") ? a : null };
  return { id: randomUUID(), content_key: key, body, summary: null, headline: null, target_date: null, surface: "sky", mode: "feed",
    status: "LIVE", lane: "serving", review_state: null, updated_at: fixtureDate, event_type: "sky-aspect-owner-approved-exact",
    provider: "tldrastro-fallback-architecture-v3", flags: [], facts: {}, sections: { packageRecord: record },
    source_snapshot: { contentStudioExactAspect: true, exactSkyAspectIdentity: { a, aspect, b }, content_role: "full_copy", review_status: "approved" } };
}

export async function calendar2027ApprovedCopyCases() {
  const expected = JSON.parse(readFileSync(new URL("../fixtures/calendar-2027-coverage.json", import.meta.url), "utf8"));
  const all = await getCalendarSubscriptionEvents(2027);
  const events: LunarCalendarEvent[] = expected.map((r: any) => {
    const event = all.find(e => e.type === r.type && Math.abs(Date.parse(e.startsAt) - Date.parse(r.at)) < 60_001
      && (r.planets ? e.aspect === r.aspect && [...e.planets ?? []].sort().join("|") === r.planets.join("|")
        : e.planet === r.planet && (r.type === "station" ? e.direction === r.direction : e.toSign === r.sign)));
    assert(event); return { ...event, dateKey: calendarLocalDateKey(event.startsAt, "America/New_York") };
  });
  let snapshot: Snapshot;
  if (process.env.TLDR_CALENDAR_APPROVED_SNAPSHOT) {
    snapshot = JSON.parse(readFileSync(process.env.TLDR_CALENDAR_APPROVED_SNAPSHOT, "utf8"));
  } else {
    const rows = new Map<string, Record<string, any>>();
    for (const event of events) {
      if (event.type === "aspect") {
        for (const key of contentStudioExactSkyAspectKeys(event.planets![0], event.aspect!, event.planets![1])) {
          if (!rows.has(key)) rows.set(key, baselineAspectRow(key));
        }
      } else {
        const keys = event.type === "ingress" ? ["sky-placement/article/chiron/taurus"] : calendarEventGeneratedContentKeys(event);
        for (const key of keys) {
          const record = servingPackageRecords.get(key);
          if (!record || record.review_status !== "approved" || record.content_role !== "full_copy") continue;
          // This isolated publication serves the unchanged approved corpus as
          // a revision. A pinned baseline row deliberately fails closed.
          const publishedRecord = event.type === "ingress" ? { ...record, studio_version_status: "approved-serving-revision" } : record;
          rows.set(key, { id: randomUUID(), content_key: key, body: record.body ?? "", summary: null, headline: null,
            target_date: null, surface: "sky", mode: "feed", status: "LIVE", lane: "serving", review_state: null, updated_at: fixtureDate,
            event_type: "fallback-architecture-v3", provider: "tldrastro-fallback-architecture-v3", flags: [], facts: {},
            sections: { packageRecord: publishedRecord }, source_snapshot: { sourcePackage: "tldrastro-fallback-architecture-v3", contentType: "authored-content", content_role: "full_copy", review_status: "approved" } });
        }
      }
    }
    snapshot = { rows: [...rows.values()], publications: [...rows.values()].map(r => ({ content_key: r.content_key, state: "live", revision: 1,
      row_id: r.id, row_updated_at: r.updated_at, updated_at: r.updated_at })) };
  }
  const relevantKeys = new Set([...snapshot.rows.map(r => r.content_key), ...events.flatMap(calendarEventGeneratedContentKeys)]);
  for (const event of events.filter(e => e.type === "aspect")) {
    const [a, b] = event.planets!.map(slug);
    relevantKeys.add(`sky.aspect.${a}.${event.aspect}.${b}`);
    relevantKeys.add(`sky.aspect.${b}.${event.aspect}.${a}`);
  }
  // Isolated storage contains these published sources, not the rest of the
  // production catalog. Retain every lifecycle record in their source closure.
  snapshot = { rows: snapshot.rows, publications: snapshot.publications.filter(r => relevantKeys.has(r.content_key)) };
  const ledger = new Map(snapshot.publications.map(r => [r.content_key, r]));
  function rowFor(key: string) {
    const pub = ledger.get(key);
    const row = snapshot.rows.find(r => r.content_key === key && r.id === pub?.row_id && publicationTimestamp(r.updated_at) === publicationTimestamp(pub.row_updated_at));
    assert(row && pub?.state === "live" && row.status === "LIVE" && row.lane === "serving" && !row.review_state && !row.sections?.packageDraft, `${key}: exact published source required`);
    assert.equal(row.sections?.packageRecord?.review_status ?? row.source_snapshot?.review_status, "approved");
    return row;
  }
  const cases = events.map(event => {
    const sourceKeys = event.type === "aspect" ? contentStudioExactSkyAspectKeys(event.planets![0], event.aspect!, event.planets![1])
      : event.type === "ingress" ? ["sky-placement/article/chiron/taurus"]
        : calendarEventGeneratedContentKeys(event).filter(key => snapshot.rows.some(r => r.content_key === key && r.body?.trim())).slice(0, 1);
    assert(sourceKeys.length);
    const sources = sourceKeys.map(rowFor);
    const units = sources.flatMap(row => {
      if (event.type !== "ingress") return [row.body];
      const record = row.sections?.packageRecord?.studio_version_status === "approved-serving-revision" ? row.sections.packageRecord : servingPackageRecords.get(row.content_key)!;
      return [record.tldrWhat, record.tldrTakeaway, record.placementArticle];
    });
    assert(units.every(body => typeof body === "string" && body.trim() && !body.includes("{{")));
    return { event, sourceKeys, units: units as string[], sources };
  });
  return { cases, snapshot };
}

export async function installCalendarApprovedSnapshot(db: any, snapshot: Snapshot) {
  const columns = new Set(["id", "content_key", "target_date", "status", "lane", "review_state", "updated_at", "body", "summary", "headline", "sections", "source_snapshot", "facts", "provider", "flags", "event_type", "surface"]);
  for (const row of snapshot.rows) {
    const keys = Object.keys(row).filter(k => columns.has(k));
    await db.query(`insert into generated_interpretations(${keys.join(",")}) values(${keys.map((_, i) => `$${i + 1}`).join(",")})`, keys.map(k => ["sections", "source_snapshot", "facts"].includes(k) ? JSON.stringify(row[k]) : row[k]));
  }
  await db.query("insert into content_publications select * from json_populate_recordset(null::content_publications,$1::json)", [JSON.stringify(snapshot.publications)]);
}

export function unfoldCalendarDescription(entry: string) {
  const value = entry.replace(/\r\n[ \t]/gu, "").match(/(?:^|\r\n)DESCRIPTION:([^\r]*)/)?.[1] ?? "";
  return value.replace(/\\([nN,;\\])/gu, (_, c) => /n/iu.test(c) ? "\n" : c);
}

export function visiblePassage(value: string) { return value.replace(/\*\*|__/gu, "").replace(/\s+/gu, " ").trim(); }

export async function verifyCalendar2027ApprovedReadings() {
  const { calendarSubscriptionFixture } = await import("./calendar-subscription-fixture.js");
  const { calendarFeedCategories } = await import("../../apps/web/src/features/calendar/calendarSubscription.js");
  const { cases, snapshot } = await calendar2027ApprovedCopyCases();
  const fixture = await calendarSubscriptionFixture();
  try {
    await installCalendarApprovedSnapshot(fixture.db, snapshot);
    const subscription = (await fixture.invoke("/api/calendar-subscriptions", "POST", { include: [...calendarFeedCategories], reminder: "None", timeZone: "America/New_York" })).json().subscription;
    const feed = await fixture.invoke(`/feed/${subscription.token}.ics`);
    assert.equal(feed.status, 200);
    const entries = feed.body.replace(/\r\n[ \t]/gu, "").split("BEGIN:VEVENT");
    for (const { event, units } of cases) {
      const response = await fixture.invoke(`/api/calendar-reading?${new URLSearchParams({ id: event.id, date: event.dateKey, timeZone: "America/New_York" })}`);
      assert.equal(response.status, 200);
      const entry = entries.find(e => e.includes(`event=${encodeURIComponent(event.id)}`));
      assert(entry, event.title);
      const description = unfoldCalendarDescription(entry);
      for (const unit of units) {
        assert(response.json().reading.body.includes(unit), `${event.title}: complete approved passage in linked reading`);
        assert(description.includes(unit), `${event.title}: complete approved passage in serialized ICS`);
      }
    }
    for (const [planet, fault] of [["Sun", "retired"], ["Mercury", "stale"], ["Venus", "wrong-identity"]] as const) {
      const item = cases.find(c => c.event.type === "aspect" && c.event.planets?.includes(planet) && c.event.planets.includes("Chiron"))!;
      const source = item.sources[0];
      if (fault === "retired") await fixture.db.query("update content_publications set state='retired',revision=revision+1 where content_key=$1", [source.content_key]);
      else if (fault === "stale") await fixture.db.query("update generated_interpretations set updated_at=updated_at+interval '1 second' where id=$1", [source.id]);
      else await fixture.db.query("update generated_interpretations set source_snapshot=jsonb_set(source_snapshot,'{exactSkyAspectIdentity,a}','\"mars\"'::jsonb) where id=$1", [source.id]);
      const response = await fixture.invoke(`/api/calendar-reading?${new URLSearchParams({ id: item.event.id, date: item.event.dateKey, timeZone: "America/New_York" })}`);
      assert.equal(response.status, 200);
      assert.equal(response.json().reading.body, "", `${fault}: do not revive an older source or select another identity`);
    }
    console.log("PASS all 23 approved reading sources in actual ICS and reading handlers; both node poles, complete passages, retired/stale/wrong-identity denial");
  } finally { await fixture.close(); }
}
