import fs from "node:fs";
import { buildCustomerReportColophon, reportGlyphLine } from "../api/_lib/report-colophon.ts";
import { composeDomainAttribution, composeSeasonAttribution, composeYearThemeAttribution } from "../api/_lib/report-structure.ts";

const sourcePath = new URL("../artifacts/marie-satori-generation-3-client-delivery.md", import.meta.url);
const outputPath = new URL("../artifacts/marie-satori-generation-3-package-2-structural-rerender.md", import.meta.url);
const facts = JSON.parse(fs.readFileSync(new URL("./fixtures/marie-report-frozen-facts.json", import.meta.url), "utf8"));
const source = fs.readFileSync(sourcePath, "utf8");
const sectionMatches = [...source.matchAll(/^## (.+)$/gmu)];
const sections = new Map(sectionMatches.map((match, index) => [match[1], source.slice((match.index ?? 0) + match[0].length, sectionMatches[index + 1]?.index ?? source.length).trim()]));
const byPrefix = (prefix) => [...sections.entries()].find(([heading]) => heading.startsWith(prefix));
const seasonConfig = [
  { prefix: "WINTER 2026", unitId: "winter-current", range: "Feb 18 - Mar 20" },
  { prefix: "SPRING 2026", unitId: "spring", range: "Mar 20 - Jun 21" },
  { prefix: "SUMMER 2026", unitId: "summer", range: "Jun 21 - Sep 22" },
  { prefix: "AUTUMN 2026", unitId: "autumn", range: "Sep 22 - Dec 21" },
  { prefix: "WINTER 2027", unitId: "winter-next", range: "Dec 21 - Feb 17" }
];
const categories = new Map(Object.entries({
  "FEB 22": "WORK", "FEB 26": "SELF", "MAR 3": "FRIENDS & FAMILY",
  "APR 14": "SELF", "MAY 1": "WORK", "MAY 12": "WORK", "MAY 14": "WORK", "MAY 18": "SELF",
  "JUL 4": "SELF", "AUG 12": "WORK", "AUG 19": "WORK", "AUG 27": "FRIENDS & FAMILY", "AUG 28": "WORK", "SEP 15": "FRIENDS & FAMILY",
  "SEP 27": "WORK", "OCT 4": "SELF", "OCT 7": "SELF", "OCT 9": "WORK", "OCT 20": "SEX & LOVE",
  "FEB 5": "SEX & LOVE", "FEB 6": "WORK", "FEB 9": "SELF"
}));
const legacyDates = new Set(["MAY 12", "MAY 18", "AUG 19", "OCT 7", "FEB 9"]);
const globalKeyDates = sections.get("Key dates") ?? "";
const keyDateMatches = [...globalKeyDates.matchAll(/^### ([A-Z]{3} \d+) · (.+)\n([^\n]+)\n\*([^*]+)\*$/gmu)].map((match) => ({ date: match[1], title: match[2], sentence: match[3], attribution: match[4] }));
const monthSeason = (date) => date.startsWith("FEB") && Number(date.split(" ")[1]) >= 18 ? "winter-current"
  : date.startsWith("FEB") || date.startsWith("JAN") || date.startsWith("DEC") ? "winter-next"
  : ["MAR"].includes(date.slice(0, 3)) && Number(date.split(" ")[1]) < 20 ? "winter-current"
  : ["MAR", "APR", "MAY", "JUN"].includes(date.slice(0, 3)) && !(date.startsWith("JUN") && Number(date.split(" ")[1]) >= 21) ? "spring"
  : ["JUN", "JUL", "AUG", "SEP"].includes(date.slice(0, 3)) && !(date.startsWith("SEP") && Number(date.split(" ")[1]) >= 22) ? "summer"
  : "autumn";
const stripLeadingRange = (body) => body.replace(/^(?:Feb|Mar|Jun|Sep|Dec) \d+ - (?:Mar|Jun|Sep|Dec|Feb) \d+\n/u, "").trim();
const colophon = buildCustomerReportColophon({ facts, periodStart: "2026-02-18", periodEnd: "2027-02-17", displayName: "Marie Satori" });
const lines = [
  "> **STAGED STRUCTURAL MOCK - NOT REPRODUCTION EVIDENCE.** This artifact stages legacy Generation 3 prose inside the Package 2 shape. Its renderer hardcodes the category assignments, handle line, season ranges, and a month-routing heuristic. The production-path reproduction evidence is `scripts/test-report-package2-structure.mjs`, which exercises `buildGeneralYearReviewedReportDocument` and its validator.", "",
  "# YOUR YEAR AHEAD REPORT", `**${colophon.periodLine}**`, "",
  "# @mariesatori, protect your time for the work that needs quiet.", "", reportGlyphLine(facts), "", "---", ""
];
const addSection = (heading, body, attribution) => {
  lines.push(`## ${heading}`, "", body.trim(), "");
  if (attribution) lines.push(`*${attribution}*`, "");
};
addSection("2026 OVERVIEW", sections.get("2026 OVERVIEW") ?? "");
addSection("WHAT 2026 IS ABOUT", sections.get("WHAT 2026 IS ABOUT") ?? "", composeYearThemeAttribution(facts));
const domain = sections.get("CREATIVITY, PLEASURE, LOVE, AND PERSONAL PROJECTS") ?? "";
const legacyMoney = sections.get("MONEY: MORE MAY MOVE THROUGH THE ACCOUNT WITHOUT MORE STAYING THERE") ?? "";
addSection("CREATIVITY, PLEASURE, LOVE, AND PERSONAL PROJECTS", `${domain}\n\n**Legacy Generation 3 Money-unit prose preserved here for structural review; the benchmark has no standalone Money section.**\n\n${legacyMoney}`, composeDomainAttribution(facts));
for (const season of seasonConfig.slice(0, 4)) {
  const [heading, rawBody] = byPrefix(season.prefix) ?? [season.prefix, ""];
  lines.push(`## ${heading}`, "", season.range, "", stripLeadingRange(rawBody), "", `*${composeSeasonAttribution(season.unitId, facts, {})}*`, "", "**Key dates**", "");
  for (const entry of keyDateMatches.filter((keyDate) => monthSeason(keyDate.date) === season.unitId)) {
    lines.push(`- **${entry.date} · ${entry.title}** · ${categories.get(entry.date)} · ${entry.sentence} *${entry.attribution}*${legacyDates.has(entry.date) ? " **[Legacy Generation 3 technical date preserved for audit; Package 1 canonical date differs.]**" : ""}`);
  }
  lines.push("");
}
addSection("2026 IN REVIEW", sections.get("2026 IN REVIEW") ?? "");
for (const season of seasonConfig.slice(4)) {
  const [heading, rawBody] = byPrefix(season.prefix) ?? [season.prefix, ""];
  lines.push(`## ${heading}`, "", season.range, "", stripLeadingRange(rawBody), "", `*${composeSeasonAttribution(season.unitId, facts, {})}*`, "", "**Key dates**", "");
  for (const entry of keyDateMatches.filter((keyDate) => monthSeason(keyDate.date) === season.unitId)) {
    lines.push(`- **${entry.date} · ${entry.title}** · ${categories.get(entry.date)} · ${entry.sentence} *${entry.attribution}*${legacyDates.has(entry.date) ? " **[Legacy Generation 3 technical date preserved for audit; Package 1 canonical date differs.]**" : ""}`);
  }
  lines.push("");
}
lines.push(...colophon.entries.flatMap((entry, index) => [`*${entry}*`, ...(index === 2 ? [""] : [])]), "", "<!-- INTERNAL REVIEW METADATA: Legacy facts engine tldrastro-api@0.1.0; facts hash 8796c1845f19e960f2800c1d8147ce7e61b3c310c76d82af9e04489a22e7f786. -->", "");
const rendered = lines.join("\n").replace(/\n{3,}/gu, "\n\n");
if (process.argv.includes("--check")) {
  if (!fs.existsSync(outputPath) || fs.readFileSync(outputPath, "utf8") !== rendered) throw new Error("REPORT_PACKAGE2_RERENDER_STALE");
} else {
  fs.writeFileSync(outputPath, rendered);
}
