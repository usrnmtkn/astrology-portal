from pathlib import Path


def replace_block(path: str, start_marker: str, end_marker: str, replacement: str) -> None:
    file = Path(path)
    text = file.read_text()
    start = text.index(start_marker)
    end = text.index(end_marker, start)
    file.write_text(text[:start] + replacement + text[end:])


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one anchor, found {count}")
    file.write_text(text.replace(old, new, 1))


app_builder = '''function relatedSkyAspectSectionsForPlacement({
  aspects,
  generatedAt,
  generatedContent,
  pointName,
  positions
}: {
  aspects: SkySnapshot["aspects"];
  generatedAt: string;
  generatedContent: GeneratedContentMap;
  pointName: string;
  positions: PlanetPosition[];
}): SkyDetailSection[] {
  const resolvedSections = aspects
    .filter((aspect) => aspect.from === pointName || aspect.to === pointName)
    .filter((aspect, index, matchingAspects) => uniqueNatalAspectRows(matchingAspects).includes(aspect))
    .flatMap((aspect) => {
      const aspectDetail = currentSkyAspectDetailArticle(aspect, generatedAt, generatedContent, positions);
      const body = aspectDetail.body
        .filter((paragraph): paragraph is string => typeof paragraph === "string")
        .map((paragraph) => stripLegacySkyArticleScaffoldPrefix(stripTldrPrefix(paragraph)).trim())
        .filter((paragraph) => paragraph && isReaderFacingCopy(paragraph))
        .join("\\n\\n");
      const exactMoment = skyPlacementAspectExactMoment(aspect, generatedAt, positions);
      const exactDate = skyPlacementAspectExactDate(aspect, generatedAt, positions);

      if (!body) return [];

      return [{
        body,
        exactDate,
        exactTime: exactMoment.getTime(),
        section: {
          heading: aspectDetail.title,
          body,
          role: "aspect" as const,
          aspectType: aspect.type,
          group: normalizedAspectToneBucket(aspect.type)
        } satisfies SkyDetailSection
      }];
    });
  const groupedSections = new Map<string, {
    body: string;
    dates: Array<{ label: string; time: number }>;
    firstExactTime: number;
    section: SkyDetailSection;
  }>();

  for (const candidate of resolvedSections) {
    const key = `${candidate.section.heading}|${candidate.section.aspectType ?? ""}|${candidate.body}`;
    const existing = groupedSections.get(key);

    if (existing) {
      existing.dates.push({ label: candidate.exactDate, time: candidate.exactTime });
      existing.firstExactTime = Math.min(existing.firstExactTime, candidate.exactTime);
      continue;
    }

    groupedSections.set(key, {
      body: candidate.body,
      dates: [{ label: candidate.exactDate, time: candidate.exactTime }],
      firstExactTime: candidate.exactTime,
      section: candidate.section
    });
  }

  const naturalDateList = (values: string[]) => {
    if (values.length <= 1) return values[0] ?? "";
    if (values.length === 2) return `${values[0]} and ${values[1]}`;
    return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
  };

  return Array.from(groupedSections.values())
    .map(({ body, dates, firstExactTime, section }) => {
      const exactDates = dates
        .slice()
        .sort((first, second) => first.time - second.time)
        .filter((date, index, sortedDates) => index === 0 || date.label !== sortedDates[index - 1]?.label)
        .map((date) => date.label);

      return {
        firstExactTime,
        section: {
          ...section,
          body: `${naturalDateList(exactDates)}\\n\\n${body}`
        }
      };
    })
    .sort((first, second) => first.firstExactTime - second.firstExactTime)
    .map(({ section }) => section);
}
'''
replace_block(
    "apps/web/src/App.tsx",
    'function relatedSkyAspectSectionsForPlacement({',
    '\nfunction skyPlacementAspectExactMoment(',
    app_builder,
)

replace_once(
    "apps/web/src/features/sky/SkyDetailArticle.tsx",
    'const skyAspectExactDateLinePattern = /^(?:January|February|March|April|May|June|July|August|September|October|November|December)\\s+\\d{1,2}(?:,\\s+\\d{4})?$/iu;',
    'const skyAspectExactDateLinePattern = /^(?:January|February|March|April|May|June|July|August|September|October|November|December)\\s+\\d{1,2}(?:,\\s+\\d{4})?(?:(?:,\\s+and\\s+|,\\s+|\\s+and\\s+)(?:January|February|March|April|May|June|July|August|September|October|November|December)\\s+\\d{1,2}(?:,\\s+\\d{4})?)*$/iu;'
)

residency_source = '''import { approvedExactSkyAspectCopy } from "../content/skyRegistry";
import type { AspectToneBucket, SkyDetailSection } from "../features/sky/SkyDetailArticle";
import { isReaderFacingCopy } from "../content/readerSafety";
import { normalizedArticleAspectToneBucket } from "../utils/articleAspects";
import { getSkyPlacementTransitFacts } from "./ephemeris";

export type SkyPlacementResidencyAspectRequest = {
  planet: string;
  sign: string;
  referenceDate: string;
  timeZone: string;
};

export type SkyPlacementResidencyAspectAuditEvent = {
  id: string;
  occursAt: string;
  dateLine: string;
  heading: string;
  aspect: string;
  otherPlanet: string;
  resolution: "resolved-approved-exact" | "unresolved-exact";
  sourceId: string | null;
  contentId: string | null;
};

export type SkyPlacementResidencyAspectResult = {
  status: "resolved" | "unsupported-pilot";
  sections: SkyDetailSection[];
  events: SkyPlacementResidencyAspectAuditEvent[];
  unresolvedEventIds: string[];
};

const PILOT_PLANETS = new Set(["sun"]);

function normalizedPart(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
}

function titleCase(value: string) {
  return value
    .split(/[-_\\s]+/gu)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(" ");
}

function dateLine(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone
  }).format(new Date(value));
}

function naturalDateList(values: string[]) {
  if (values.length <= 1) return values[0] ?? "";
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function joinedExactDateLines(values: string[]) {
  const unique = [...new Set(values)];

  if (unique.length <= 1) {
    return unique[0] ?? "";
  }

  const parsed = unique.map((value) => value.match(/^(.*), (\\d{4})$/u));
  const sharedYear = parsed[0]?.[2];

  if (sharedYear && parsed.every((match) => match?.[2] === sharedYear)) {
    return `${naturalDateList(parsed.map((match) => match?.[1] ?? ""))}, ${sharedYear}`;
  }

  return naturalDateList(unique);
}

function exactAspectSection({
  aspect,
  contentId,
  date,
  body,
  first,
  second,
  sourceId
}: {
  aspect: string;
  contentId: string;
  date: string;
  body: string;
  first: string;
  second: string;
  sourceId: string;
}): SkyDetailSection {
  return {
    heading: `${first} ${titleCase(aspect)} ${second}`,
    body: `${date}\\n\\n${body}`,
    role: "aspect",
    aspectType: aspect,
    group: normalizedArticleAspectToneBucket(aspect) as AspectToneBucket,
    sourceKeys: [
      contentId,
      `packages/astro-knowledge/data/transits/${sourceId}.json`
    ]
  };
}

export async function skyPlacementResidencyAspectSections(
  request: SkyPlacementResidencyAspectRequest
): Promise<SkyPlacementResidencyAspectResult> {
  const planet = normalizedPart(request.planet);
  const sign = normalizedPart(request.sign);

  if (!PILOT_PLANETS.has(planet)) {
    return {
      status: "unsupported-pilot",
      sections: [],
      events: [],
      unresolvedEventIds: []
    };
  }

  const referenceDate = new Date(request.referenceDate);
  if (Number.isNaN(referenceDate.getTime())) {
    throw new Error(`Invalid Sky Placement residency aspect reference date: ${request.referenceDate}`);
  }

  const facts = await getSkyPlacementTransitFacts({
    planet,
    sign,
    referenceDate,
    timeZone: request.timeZone
  });

  const events = [...facts.rankedEventsDuringTransit]
    .sort((first, second) => first.occursAt.localeCompare(second.occursAt));
  const seen = new Set<string>();
  const sectionGroups = new Map<string, {
    aspect: string;
    body: string;
    contentId: string;
    dateLines: string[];
    first: string;
    firstOccursAt: string;
    second: string;
    sourceId: string;
  }>();
  const auditEvents: SkyPlacementResidencyAspectAuditEvent[] = [];
  const unresolvedEventIds: string[] = [];

  for (const event of events) {
    if (seen.has(event.id)) {
      continue;
    }
    seen.add(event.id);

    const copy = approvedExactSkyAspectCopy(event.planet, event.aspect, event.otherPlanet);
    const eventDateLine = dateLine(event.occursAt, facts.timeZone);
    const heading = `${event.planet} ${titleCase(event.aspect)} ${event.otherPlanet}`;
    const body = copy?.body?.trim() ?? "";
    const copyNeedsCalendarComposition = copy?.calendarLeadIn === "date-placements-collective-level";
    const copyHasSlots = /\\{\\{[^}]+\\}\\}/u.test(body);
    const resolved = Boolean(
      copy
      && body
      && !copyNeedsCalendarComposition
      && !copyHasSlots
      && isReaderFacingCopy(body)
    );

    auditEvents.push({
      id: event.id,
      occursAt: event.occursAt,
      dateLine: eventDateLine,
      heading,
      aspect: event.aspect,
      otherPlanet: event.otherPlanet,
      resolution: resolved ? "resolved-approved-exact" : "unresolved-exact",
      sourceId: resolved ? copy?.sourceId ?? null : null,
      contentId: resolved ? copy?.contentId ?? null : null
    });

    if (!resolved || !copy) {
      unresolvedEventIds.push(event.id);
      continue;
    }

    const sectionKey = `${heading}|${copy.contentId}|${body}`;
    const existingSection = sectionGroups.get(sectionKey);

    if (existingSection) {
      existingSection.dateLines.push(eventDateLine);
      if (event.occursAt < existingSection.firstOccursAt) {
        existingSection.firstOccursAt = event.occursAt;
      }
      continue;
    }

    sectionGroups.set(sectionKey, {
      aspect: event.aspect,
      body,
      contentId: copy.contentId,
      dateLines: [eventDateLine],
      first: event.planet,
      firstOccursAt: event.occursAt,
      second: event.otherPlanet,
      sourceId: copy.sourceId
    });
  }

  const sections = Array.from(sectionGroups.values())
    .sort((first, second) => first.firstOccursAt.localeCompare(second.firstOccursAt))
    .map((section) => exactAspectSection({
      aspect: section.aspect,
      contentId: section.contentId,
      date: joinedExactDateLines(section.dateLines),
      body: section.body,
      first: section.first,
      second: section.second,
      sourceId: section.sourceId
    }));

  return {
    status: "resolved",
    sections,
    events: auditEvents,
    unresolvedEventIds
  };
}
'''
Path("apps/web/src/services/skyPlacementResidencyAspects.ts").write_text(residency_source)

replace_once(
    "scripts/test-sky-placement-exact-aspect-authority.mjs",
    '''assert.match(builder, /const resolvedSections = aspects[\\s\\S]*?\\.sort\\(\\(first, second\\) => first\\.orb - second\\.orb\\)/u);
assert.match(builder, /const exactDate = skyPlacementAspectExactDate\\(aspect, generatedAt, positions\\);/u);
assert.match(builder, /body: `\\$\\{exactDate\\}\\\\n\\\\n\\$\\{body\\}`/u);
assert.match(builder, /return resolvedSections\\.map\\(\\(\\{ section \\}\\) => section\\);/u);
''',
    '''assert.match(builder, /const resolvedSections = aspects/u);
assert.match(builder, /const exactMoment = skyPlacementAspectExactMoment\\(aspect, generatedAt, positions\\);/u);
assert.match(builder, /const exactDate = skyPlacementAspectExactDate\\(aspect, generatedAt, positions\\);/u);
assert.match(builder, /const groupedSections = new Map/u);
assert.match(builder, /existing\\.dates\\.push/u);
assert.match(builder, /naturalDateList\\(exactDates\\)/u);
assert.match(builder, /\\.sort\\(\\(first, second\\) => first\\.firstExactTime - second\\.firstExactTime\\)/u);
assert.doesNotMatch(builder, /\\.sort\\(\\(first, second\\) => first\\.orb - second\\.orb\\)/u);
'''
)

residency_test_path = Path("scripts/test-sky-placement-residency-aspects.mts")
residency_test = residency_test_path.read_text()
insert_marker = '''  const unsupported = await residency.skyPlacementResidencyAspectSections({
'''
insert = '''  const sunVirgo = await residency.skyPlacementResidencyAspectSections({
    planet: "sun",
    sign: "virgo",
    referenceDate: "2026-09-07T12:00:00.000Z",
    timeZone: "America/New_York"
  });
  const virgoLilithEvents = sunVirgo.events.filter((event: { heading: string }) => event.heading === "Sun Trine Lilith");
  const virgoLilithSections = sunVirgo.sections.filter((section: { heading: string }) => section.heading === "Sun Trine Lilith");
  assert.equal(virgoLilithEvents.length, 2, "Sun in Virgo must preserve both exact Sun trine Lilith events for auditability.");
  assert.equal(virgoLilithSections.length, 1, "A repeated exact aspect must render one reader passage, not repeat the prose.");
  assert.equal(
    (virgoLilithSections[0]?.body as string).split("\\n\\n", 1)[0],
    "September 2 and September 10, 2026",
    "Repeated exact hits must share one natural-language exact-date line."
  );
  const firstVirgoEventTimeByHeading = new Map<string, number>();
  for (const event of sunVirgo.events as Array<{ heading: string; occursAt: string }>) {
    const time = new Date(event.occursAt).getTime();
    firstVirgoEventTimeByHeading.set(
      event.heading,
      Math.min(firstVirgoEventTimeByHeading.get(event.heading) ?? Number.POSITIVE_INFINITY, time)
    );
  }
  for (const group of ["gifts", "lessons"] as const) {
    const sectionTimes = sunVirgo.sections
      .filter((section: { group?: string }) => section.group === group)
      .map((section: { heading: string }) => firstVirgoEventTimeByHeading.get(section.heading) ?? Number.POSITIVE_INFINITY);
    assert.deepEqual(
      sectionTimes,
      [...sectionTimes].sort((first, second) => first - second),
      `Sun in Virgo ${group} must be ordered from earliest exact date to latest.`
    );
  }

'''
if residency_test.count(insert_marker) != 1:
    raise SystemExit("scripts/test-sky-placement-residency-aspects.mts: unsupported marker drifted")
residency_test = residency_test.replace(insert_marker, insert + insert_marker, 1)
replace_anchor = '''  assert.doesNotMatch(detailSource, /section\\.dateLine/u, "Residency date rendering should remain inside the dynamically loaded aspect body.");
'''
replace_value = '''  assert.doesNotMatch(detailSource, /section\\.dateLine/u, "Residency date rendering should remain inside the dynamically loaded aspect body.");
  assert.match(
    detailSource,
    /skyAspectExactDateLinePattern[\\s\\S]*?and\\\\s/u,
    "Sky placement exact-date parsing must accept a natural-language list of repeated exact dates."
  );
'''
if residency_test.count(replace_anchor) != 1:
    raise SystemExit("scripts/test-sky-placement-residency-aspects.mts: detail date parser anchor drifted")
residency_test_path.write_text(residency_test.replace(replace_anchor, replace_value, 1))

print("Applied Sky placement repeated-exact dedupe and chronological ordering repair.")
