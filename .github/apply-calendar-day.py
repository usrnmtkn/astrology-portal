from pathlib import Path
import subprocess


def replace(path, old, new):
    p = Path(path)
    text = p.read_text()
    assert text.count(old) == 1, f'{path}: expected one occurrence, got {text.count(old)}: {old[:120]}'
    p.write_text(text.replace(old, new))

app = 'apps/web/src/App.tsx'
cal = 'apps/web/src/features/calendar/LunarCalendar.tsx'
route = 'apps/web/src/routes/CalendarRoute.tsx'
replace(app, 'import { skySummaryEventPlacements }', 'import { CalendarDayReading, calendarSkyForDay } from "./features/calendar/CalendarDayReading";\nimport { skySummaryEventPlacements }')
replace(cal, 'import type { CSSProperties, KeyboardEvent }', 'import type { CSSProperties, KeyboardEvent, ReactNode }')
replace(cal, '  showJournalPrompts?: boolean;', '  renderDayReading?: (day: LunarCalendarDay) => { content: ReactNode; moonSign?: string };\n  showJournalPrompts?: boolean;')
replace(cal, '  onGeneratedContentRequest,\n  onOpenTransit\n}: LunarCalendarProps)', '  onGeneratedContentRequest,\n  onOpenTransit,\n  renderDayReading\n}: LunarCalendarProps)')
start = Path(cal).read_text().index('  // Day and Week share the same dated guidance selection')
end = Path(cal).read_text().index('  const selectedPackagePhase', start)
replace(cal, Path(cal).read_text()[start:end], '''  // Day uses the full Sky Moon article. Week retains its own approved guidance.
  const selectedDayReading = selectedDay ? renderDayReading?.(selectedDay) : null;
  const selectedReadingMoonSign = selectedDayReading?.moonSign ?? selectedDay?.moonSign;
''')
replace(cal, '(selectedDayBodyPresentation.main.length > 0 || selectedDayAspectWriteups.length > 0)', '(selectedDayReading || selectedDayAspectWriteups.length > 0)')
start = Path(cal).read_text().index('              {selectedDayBodyPresentation.main.length > 0 && (')
end = Path(cal).read_text().index('              {selectedDayAspectWriteups.length > 0 && (', start)
replace(cal, Path(cal).read_text()[start:end], '              {selectedDayReading?.content}\n')
start = Path(cal).read_text().index('              {selectedDayBodyPresentation.prompt && (')
end = Path(cal).read_text().index('            </div>', start)
replace(cal, Path(cal).read_text()[start:end], '')
start = Path(cal).read_text().index('  const selectedDayCard =')
end = Path(cal).read_text().index('        {(selectedDayTransits.length', start)
old = Path(cal).read_text()[start:end]
new = old.replace('titleForDay(selectedDay)', 'titleForDay({ ...selectedDay, moonSign: selectedReadingMoonSign ?? selectedDay.moonSign })')
new = new.replace('elementClassForSign(selectedDay.moonSign)', 'elementClassForSign(selectedReadingMoonSign ?? selectedDay.moonSign)')
new = new.replace('signElements[selectedDay.moonSign]', 'signElements[selectedReadingMoonSign ?? selectedDay.moonSign]')
replace(cal, old, new)
replace(route, 'import type { LunarCalendarEvent }', 'import type { LunarCalendarDay, LunarCalendarEvent }')
replace(route, '  showJournalPrompts?: boolean;', '  renderDayReading?: (day: LunarCalendarDay) => { content: ReactNode; moonSign?: string };\n  showJournalPrompts?: boolean;')
replace(route, '  onOpenTransit,\n  showJournalPrompts', '  onOpenTransit,\n  renderDayReading,\n  showJournalPrompts')
replace(route, '        onOpenTransit={onOpenTransit}', '        onOpenTransit={onOpenTransit}\n        renderDayReading={renderDayReading}')
replace(app, '(mode === "guest" || mode === "member") && liveSkyReference(getInitialTransitDate()', '(mode === "guest" || mode === "member" || mode === "calendar") && liveSkyReference(getInitialTransitDate()')
replace(app, 'skyDateTimeFromInput(skyDate, skyLocation, (mode === "guest" || mode === "member"))', 'skyDateTimeFromInput(skyDate, skyLocation, (mode === "guest" || mode === "member" || mode === "calendar"))')
replace(app, 'const live = (mode === "guest" || mode === "member") && Boolean(liveSkyReference', 'const live = (mode === "guest" || mode === "member" || mode === "calendar") && Boolean(liveSkyReference')
replace(app, '    if (mode !== "guest" && mode !== "member") return;\n    const timeZone = withTimeZone(location).timeZone;', '    if (mode !== "guest" && mode !== "member" && mode !== "calendar") return;\n    const timeZone = withTimeZone(location).timeZone;')
replace(app, '                  onGeneratedContentRequest={requestCalendarContent}', '''                  renderDayReading={(day) => {
                    const selectedSky = calendarSkyForDay(sky, day.dateKey, withTimeZone(location));
                    const moon = selectedSky?.positions.find((position) => position.planet === "Moon");
                    const article = selectedSky && moon && skyPlacementFallbackStatus === "ready"
                      ? currentSkyPlacementDetailArticle({
                          position: moon,
                          positions: selectedSky.positions,
                          aspects: selectedSky.aspects,
                          aspectFacts: selectedSky.placementAspectFacts,
                          generatedAt: selectedSky.generatedAt,
                          generatedContent: skyGeneratedContent,
                          locationLatitude: selectedSky.location.latitude,
                          locationTimeZone: selectedSky.location.timeZone,
                          moonEvent: selectedSky.moonEvent
                        })
                      : null;
                    return {
                      moonSign: moon?.sign,
                      content: <CalendarDayReading
                        dateKey={day.dateKey}
                        moonSign={moon?.sign}
                        article={article}
                        skyError={skyStatus === "error"}
                        contentStatus={skyPlacementFallbackStatus}
                        overview={selectedSky ? <SkyCards
                          embedded
                          eventsForDay={day.events}
                          sky={selectedSky}
                          generatedContent={skyGeneratedContent}
                          onOpenEvent={openCalendarTransitDetail}
                        /> : null}
                      />
                    };
                  }}
                  onGeneratedContentRequest={requestCalendarContent}''')
replace(app, '  locationLabel,\n  onOpenChart\n}: {\n  onOpenEvent:', '  locationLabel,\n  onOpenChart,\n  embedded = false,\n  eventsForDay\n}: {\n  onOpenEvent:')
replace(app, '  dateLabel: string;\n  locationLabel: string;\n  onOpenChart: () => void;\n}) {\n  const [dailyEvents', '  dateLabel?: string;\n  locationLabel?: string;\n  onOpenChart?: () => void;\n  embedded?: boolean;\n  eventsForDay?: LunarCalendarEvent[];\n}) {\n  const [dailyEvents')
replace(app, '''  useEffect(() => {
    let active = true;
    const anchor = new Date(sky.generatedAt);
    void import("./services/calendarApi")''', '''  useEffect(() => {
    if (eventsForDay !== undefined) return;
    let active = true;
    const anchor = new Date(sky.generatedAt);
    void import("./services/calendarApi")''')
replace(app, '''        const keys = events.flatMap(ingressSummaryKeys);
        if (keys.length) {
          const content = await loadLiveGeneratedContentForKeys(keys);
          if (active) setEventContent(content);
        }
      }).catch(error => console.warn("Daily sky events could not load.", error));
    return () => { active = false; };
  }, [requestKey]);
  const events = dailyEvents.key === requestKey ? dailyEvents.events : [];
  const summaryContent = new Map([...eventContent, ...generatedContent]);''', '''      }).catch(error => console.warn("Daily sky events could not load.", error));
    return () => { active = false; };
  }, [requestKey, eventsForDay]);
  const events = eventsForDay ?? (dailyEvents.key === requestKey ? dailyEvents.events : []);
  const ingressKeys = [...new Set(events.flatMap(ingressSummaryKeys))].sort().join("|");
  useEffect(() => {
    let active = true;
    setEventContent(new Map());
    if (ingressKeys) {
      void loadLiveGeneratedContentForKeys(ingressKeys.split("|"))
        .then((content) => { if (active) setEventContent(content); })
        .catch((error) => console.warn("Daily sky ingress content could not load.", error));
    }
    return () => { active = false; };
  }, [requestKey, ingressKeys]);
  const summaryContent = new Map([...eventContent, ...generatedContent]);''')
text = Path(app).read_text()
start = text.index('        <div className="sky-daily-summary__body"')
end = text.index('\n\n        <button className="sky-today-ledger__foot"', start)
body = text[start:end]
replace(app, body, '        {summaryBody}')
replace(app, '''  }, summaryContent);

  return (''', '''  }, summaryContent);
  const summaryBody = (
''' + body + '''
  );
  if (embedded) return summaryBody;

  return (''')
p = Path('scripts/test-calendar-package-boundary.mjs')
text = p.read_text()
old = 'assert.match(calendarSource, /main: selectedPackageWeeklyMoon \\? \\[selectedPackageWeeklyMoon\\.body\\] : \\[\\]/u);'
new = '''assert.match(calendarSource, /selectedDayReading\\?\\.content/u);
assert.doesNotMatch(calendarSource, /selectedPackageWeeklyMoon|selectedDayBodyPresentation/u);
const appSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/App.tsx"), "utf8");
assert.match(appSource, /renderDayReading=\\{\\(day\\) =>/u);
assert.match(appSource, /const article = selectedSky && moon && skyPlacementFallbackStatus === "ready"/u);
assert.match(appSource, /eventsForDay=\\{day\\.events\\}/u);'''
assert text.count(old) == 1, 'Calendar package boundary assertion changed'
p.write_text(text.replace(old, new))
css = Path('apps/web/src/styles/lunar-calendar.css')
css.write_text(css.read_text() + '''
/* Calendar embeds the shared summary without the Sky card's surrounding padding. */
.calendar-day-reading__overview .sky-daily-summary__body {
  padding: 0;
}

.calendar-day-reading__prose {
  display: grid;
  gap: var(--space-4);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: var(--text-body);
  font-weight: var(--weight-regular);
  line-height: var(--leading-body);
  letter-spacing: var(--tracking-body);
  overflow-wrap: anywhere;
}

.calendar-day-reading__prose h4 {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-card-title);
  font-weight: var(--weight-medium);
  line-height: var(--leading-title);
  letter-spacing: var(--tracking-title);
}
''')
print('Calendar day integration patches applied.')
