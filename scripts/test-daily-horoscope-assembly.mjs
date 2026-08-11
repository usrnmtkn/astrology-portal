#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTransitSynastryRenderer } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(packageRoot, relativePath), "utf8"));
const renderer = createTransitSynastryRenderer(
  readJson("source-rows/transit-synastry-rows-v1.json"),
  readJson("templates/fallback-templates-v3.json"),
  readJson("source-rows/fallback-source-rows-v3.json")
);
const reviewRenderer = createTransitSynastryRenderer(
  readJson("source-rows/transit-synastry-rows-v1.json"),
  readJson("templates/fallback-templates-v3.json"),
  readJson("source-rows/fallback-source-rows-v3.json"),
  { allowUnreviewed: true }
);

const approvedDailyGlances = [
  {
    natal: "moon",
    aspect: "square",
    headline: "The plan is not more important than the energy you actually have.",
    body: "You may get halfway through the errands and realize the rest of the list is too much. Forcing the original schedule can turn a normal day into a fight with yourself. Changing the plan does not make you unreliable. Remove one nonessential task before you start resenting everything that remains."
  },
  {
    natal: "mars",
    aspect: "conjunction",
    headline: "The feeling hits, and you are already doing something about it.",
    body: "You may walk out angry, make the worried call immediately, or jump into an argument that did not involve you. A quick response is not always the wrong one, but it gives you less time to decide whether you are solving the problem or making it bigger. Before you leave, call, or intervene, decide what you want the next ten minutes to accomplish."
  },
  {
    natal: "sun",
    aspect: "opposition",
    headline: "You can say yes in public and regret it in private.",
    body: "Someone asks for more, and the answer that keeps the peace comes out before you check what it will cost you. An hour later, you are resentful about a commitment you never wanted. Correct the answer. Tell them you agreed too quickly and need to revise what you can take on."
  },
  {
    natal: "lilith",
    aspect: "conjunction",
    headline: "The want you keep explaining away is still there.",
    body: "You finish the task, close the tab, then reopen the option you saved. Your routine may be comfortable, but it has not erased the part of you that wants something else. Wanting more does not make your current life a failure. Finish the sentence \"What I want is…\" and stop before the justification."
  },
  {
    natal: "pluto",
    aspect: "soft",
    headline: "It takes less effort to acknowledge a feeling than to keep minimizing it.",
    body: "A conversation about grief, anxiety, or old family history does not have to become a fight. You can say what affected you without explaining every detail or demanding an answer from anyone else. Tell someone you trust what happened and how it made you feel."
  },
  {
    natal: "neptune",
    aspect: "conjunction",
    headline: "You start fixing a problem no one has named.",
    body: "You notice your manager seems off and start rearranging the day's schedule before they explain what happened. You may treat that mood as your own, so you check every detail and push aside work that will be evaluated. You still do not know what happened. Before you change the schedule again, ask your manager what actually needs attention."
  },
  {
    natal: "north-node",
    aspect: "conjunction",
    headline: "You keep reopening the next step you said you were not ready for.",
    body: "The application, class, project, or responsibility you keep reopening deserves a closer look. That does not mean you need to overhaul your life. It does mean the choice deserves more than another closed tab. Write one sentence naming why you want it."
  },
  {
    natal: "south-node",
    aspect: "opposition",
    headline: "The automatic yes is getting harder to live with.",
    body: "Someone asks for one more favor, and you feel yourself agreeing before you check the time you saved for yourself. The yes may keep them happy and leave you resentful. You do not have to prove care by taking on every errand. Tell them you cannot do this one."
  },
  {
    natal: "chiron",
    aspect: "conjunction",
    headline: "The care is being offered, but the old hurt makes it hard to accept.",
    body: "You type \"I'm fine\" after they offer to call, even though part of you wants to say yes. The need for care and the fear of being disappointed arrive at the same time, so refusing can feel safer than asking. Replace \"I'm fine\" with a quick check-in."
  },
  {
    natal: "chiron",
    aspect: "square",
    headline: "Expecting someone to guess what you need won't tell you how much they care.",
    body: "Notice when you drop a hint, leave out the actual ask, and wait to see if they guess what you need. When you text that the milk is gone, delete the line asking them to stop at the store, and get a reply about dinner instead, it is easy to feel ignored, even though you never actually asked. Feeling overlooked still hurts, but expecting them to read your mind just sets everyone up to fail."
  },
  {
    natal: "chiron",
    aspect: "opposition",
    headline: "You can leave a need unsaid and still expect them to understand.",
    body: "A loved one asks why you changed the evening plan, and you stop mid-sentence when their tone feels too familiar. You may want to stay quiet and wait for them to notice what you did not finish. That test backfires. You don't have to do it all alone. Finish your sentence: tell them what you needed when you changed the plan."
  },
  {
    natal: "moon",
    aspect: "conjunction",
    headline: "A sudden change of plans can quickly wear down your patience.",
    body: "When someone asks to reschedule, you might catch yourself getting irritated or defensive before you even process the ask. Instead of listing every reason their idea is inconvenient, just say what you can and cannot do. You do not have to manage everyone else's feelings today. Give them a straight answer and let the rest go."
  },
  {
    natal: "lilith",
    aspect: "soft",
    headline: "Saying nothing is not the same as wanting nothing.",
    body: "When your partner opens the grocery order and asks what to add, you may worry that one extra snack will seem demanding. So you say \"nothing,\" which leaves the item on your phone instead of in the shared cart. You're allowed to want more. One snack does not turn the order into a crisis. Send the snack's name and price before they check out."
  },
  {
    natal: "uranus",
    aspect: "conjunction",
    headline: "You keep reconsidering the whole routine after one unwelcome change.",
    body: "You open a familiar service, find a higher price, and lose time comparing replacements. You may feel too restless to accept the new terms. You start questioning every routine built around it. You're allowed to change your plan once you know the new price. Write down the new total and one workable alternative before changing the service."
  },
  {
    house: 1,
    headline: "Blending in is not worth a first impression you do not recognize.",
    body: "You dress down to blend in and leave out the one detail you actually wanted to share. Staying neutral may help you avoid attention, but it can leave you feeling invisible. Nobody can know you from the version that never shows up. Tell one person the detail you almost kept to yourself."
  }
];

for (const expected of approvedDailyGlances) {
  const input = expected.house ? { house: expected.house } : { natal: expected.natal, aspect: expected.aspect };
  const key = expected.house ? `house/${expected.house}` : `${expected.aspect}/${expected.natal}`;
  const rendered = renderer.renderDailyGlance(input);
  assert.equal(rendered.headline, expected.headline, `${key} production headline must match owner approval.`);
  assert.equal(rendered.body, expected.body, `${key} production body must match owner approval.`);
  assert.deepEqual(
    reviewRenderer.renderDailyGlance(input),
    rendered,
    `${key} review and production readers must assemble identically.`
  );
}

const squareChiron = renderer.renderDailyGlance({ natal: "chiron", aspect: "square" });
const oppositionChiron = renderer.renderDailyGlance({ natal: "chiron", aspect: "opposition" });
assert.notDeepEqual(squareChiron, oppositionChiron, "square/chiron and opposition/chiron must remain distinct after the key correction.");

if (process.argv.includes("--daily-glance-only")) {
  console.log(`${approvedDailyGlances.length} approved daily At-a-Glance reader assemblies passed`);
  process.exit(0);
}
const houseGlance = reviewRenderer.renderDailyGlance({
  house: 8,
});
assert.ok(houseGlance.body);
const calendarPhase = renderer.renderCalendarPhase({
  phase: "waxing-gibbous",
  sign: "scorpio"
});
assert.equal(calendarPhase.headline, "Waxing Gibbous Moon in Scorpio");
assert.equal(calendarPhase.tagline, "The Refinement");
const moonDoDont = renderer.renderDoDont({
  planet: "mars",
  sign: "aquarius",
  house: 9,
  transiting: "moon"
});
assert.equal(moonDoDont.do.length, 3);
assert.equal(moonDoDont.dont.length, 3);
const moonDoDontNextDay = renderer.renderDoDont({
  planet: "mars",
  sign: "aquarius",
  house: 9,
  transiting: "moon",
  moonSign: "aries",
  moonHouse: 1,
  dayKey: 1
});
const moonDoDontFollowingDay = renderer.renderDoDont({
  planet: "mars",
  sign: "aquarius",
  house: 9,
  transiting: "moon",
  moonSign: "taurus",
  moonHouse: 2,
  dayKey: 2
});
assert.notDeepEqual(
  moonDoDontNextDay,
  moonDoDontFollowingDay,
  "Do/Don't recommendations must change when the active sky date and Moon layer change."
);

const appSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/App.tsx"), "utf8");
const dailyStart = appSource.indexOf("function dailyGlanceGeneratedContent(");
const dailyEnd = appSource.indexOf("\nfunction importContentRegistry(", dailyStart);
const dailyAssembly = appSource.slice(dailyStart, dailyEnd);
assert.ok(dailyStart >= 0 && dailyEnd > dailyStart, "Daily assembly function must exist.");
assert.match(dailyAssembly, /\.renderDailyGlance\(/u, "The Daily At-a-Glance package renderer must remain wired.");
assert.doesNotMatch(dailyAssembly, /\.renderTransitAspect\(/u, "The retired interim Moon-card path must stay removed.");
assert.doesNotMatch(dailyAssembly, /\.renderTransitHouse\(/u, "The retired interim Moon-house path must stay removed.");
assert.match(dailyAssembly, /localNoon: true/u);

const youPageSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/features/you/YouPage.tsx"), "utf8");
const lunarCalendarSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/features/calendar/LunarCalendar.tsx"), "utf8");
assert.match(
  youPageSource,
  /useState<YouTab>\("transits"\)/u,
  "You must open on the personalized Transits tab instead of Natal Chart."
);
assert.match(
  youPageSource,
  /aria-label="Daily horoscope summary"/u,
  "You > Transits must render the personalized daily summary."
);
assert.doesNotMatch(youPageSource, /aria-label="Personal timing summary"/u);
assert.doesNotMatch(youPageSource, /Daily calendar/u, "Sky-wide phase and void copy must stay off You > Transits.");
assert.match(appSource, /dailyOuterTransitPlanets[\s\S]*?gate = dailyOuterTransitPlanets\.has\(planet\) \? 3 : 5/u);
assert.match(appSource, /dailyIsHeadliner \? 3 : 4/u);
assert.match(appSource, /renderDoDont\(\{/u);
assert.match(appSource, /const moonCandidate = dailyMoonDriver/u);
assert.match(appSource, /transiting: "moon"/u);
assert.match(
  appSource,
  /<ProfileView[\s\S]*targetDate=\{skyDate\}/u,
  "You transit assembly must receive the active sky date."
);
assert.match(
  appSource,
  /dayKey: Number\.isFinite\(Date\.parse\(`\$\{targetDate\}T00:00:00Z`\)\)/u,
  "Do/Don't rotation must key off the active sky date instead of the stale chart form date."
);
assert.doesNotMatch(
  appSource,
  /transitForm\.chartDate/u,
  "You transit timing must not read the chart setup form's one-time date."
);
assert.match(appSource, /renderTransitLabel\(\{/u);
assert.match(appSource, /renderLunationHoroscope\(\{/u);
assert.match(appSource, /qualifyingTransits: qualifyingDailyTransits\.map/u);
assert.match(youPageSource, />Areas of Your Life</u);
assert.match(youPageSource, />Behind this Forecast</u);
assert.match(youPageSource, /dailyHoroscopeAssembly\?\.doItems\?\.length === 3/u);
assert.match(lunarCalendarSource, /renderCalendarPhase\(\{/u);
assert.match(lunarCalendarSource, /renderVoidOfCourse\(\{/u);
assert.match(lunarCalendarSource, /selectedPackagePhase\?\.headline/u);
assert.match(lunarCalendarSource, /selectedPackagePhase\?\.tagline/u);

console.log("daily horoscope assembly selection checks passed");
