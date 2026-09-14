from pathlib import Path

def replace(path, old, new):
    p = Path(path)
    text = p.read_text()
    if new in text: return
    assert text.count(old) == 1, f'{path}: unexpected source for {old[:100]}'
    p.write_text(text.replace(old, new))

replace('apps/web/src/App.tsx', '      const missingKeys = calendarContentRequest.contentKeys.filter((key) => !cached.requestedKeys.has(key));', '''      const requestedKeys = [...new Set([
        ...calendarContentRequest.contentKeys,
        ...skyDailySummaryFields.map((field) => field.key),
        ...cmsSurfaceKeys.retrogradeSummary()
      ])];
      const missingKeys = requestedKeys.filter((key) => !cached.requestedKeys.has(key));''')
p = Path('apps/web/src/features/calendar/LunarCalendar.tsx')
s = p.read_text()
block = '''  // Day uses the full Sky Moon article. Week retains its own approved guidance.
  const selectedDayReading = selectedDay ? renderDayReading?.(selectedDay) : null;
  const selectedReadingMoonSign = selectedDayReading?.moonSign ?? selectedDay?.moonSign;
'''
anchor = '  const selectedPrimaryLunation = selectedDay ? primaryLunationForDay(selectedDay) : undefined;'
assert s.count(block) == 1 and s.count(anchor) == 1
s = s.replace(block, '').replace(anchor, block + anchor)
s = s.replace('const selectedDayPhaseSign = selectedPrimaryLunation?.sign ?? selectedDay?.moonSign ?? "";', 'const selectedDayPhaseSign = selectedPrimaryLunation?.sign ?? selectedReadingMoonSign ?? selectedDay?.moonSign ?? "";')
p.write_text(s)
print('Calendar summary fields hydrate from the same published keys as Sky; live ingress heading stays consistent.')
