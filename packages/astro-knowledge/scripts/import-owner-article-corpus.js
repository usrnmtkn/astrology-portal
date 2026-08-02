#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const fixtureRoot = path.join(
  __dirname,
  "..",
  "voice",
  "tldr-astro",
  "fixtures",
  "sky-article-longform",
  "owner-corpus"
);

const cohorts = {
  calibrationCandidates: [
    {
      slug: "mercury-in-taurus-2025",
      title: "Mercury in Taurus 2025",
      planet: "mercury",
      edition: "ingress"
    },
    {
      slug: "venus-in-cancer",
      title: "Venus in Cancer 2025",
      planet: "venus",
      edition: "ingress"
    },
    {
      slug: "mars-direct-in-cancer",
      title: "Mars Direct in Cancer",
      planet: "mars",
      edition: "station-direct"
    },
    {
      slug: "chiron-retrograde-in-aries",
      title: "Chiron Retrograde in Aries",
      planet: "chiron",
      edition: "station-retrograde"
    }
  ],
  diagnosticSameSurface: [
    {
      slug: "mercury-in-virgo-2025",
      title: "Mercury Enters Virgo",
      planet: "mercury",
      edition: "ingress"
    },
    {
      slug: "mercury-retrograde-in-leo",
      title: "Mercury Retrograde in Leo 2025",
      planet: "mercury",
      edition: "station-retrograde"
    },
    {
      slug: "venus-in-virgo-2025",
      title: "Venus in Virgo 2025",
      planet: "venus",
      edition: "ingress"
    },
    {
      slug: "venus-retrograde-2025",
      title: "Venus Retrograde in Aries and Pisces 2025",
      planet: "venus",
      edition: "station-retrograde"
    }
  ],
  adjacentFormats: [
    {
      slug: "2025-mercury-retrogrades",
      title: "2025 Mercury Retrogrades and Horoscopes",
      format: "planet-year-overview"
    },
    {
      slug: "2025-2026-lunar-nodes-in-pisces-and-virgo-overview-eclipses-and-your-rising-sign-horoscopes",
      title: "2025–2026 Lunar Nodes in Pisces and Virgo: Overview, Eclipses, and You",
      format: "nodes-cycle"
    },
    {
      slug: "relationship-year-libra-2025-to-venus-rx-2026",
      title: "Relationship Year: Venus in Libra 2025 to Venus Rx 2026",
      format: "relationship-year"
    },
    {
      slug: "august-3rd-9th-2025",
      title: "Astrological Overview: August 3–9, 2025",
      format: "weekly-overview"
    },
    {
      slug: "leo-season-2025",
      title: "August & Leo Season Horoscopes 2025",
      format: "season"
    },
    {
      slug: "your-2025-yearly-horoscopes",
      title: "Your 2025 Yearly Horoscopes",
      format: "yearly-horoscopes"
    },
    {
      slug: "pisces-total-lunar-eclipse",
      title: "Pisces Total Lunar Eclipse 2025",
      format: "lunation-eclipse"
    }
  ],
  additionalSurfaceReferences: [
    {
      slug: "2025-new-and-full-moons",
      title: "2025 New and Full Moons",
      format: "annual-lunation-calendar"
    },
    {
      slug: "2025-overview",
      title: "2025 Overview and Horoscopes for All Zodiac Signs",
      format: "annual-overview"
    },
    {
      slug: "aquarius-full-moon-2025",
      title: "Aquarius Full Moon 2025",
      format: "lunation-full-moon"
    },
    {
      slug: "aquarius-season-2025",
      title: "Aquarius Season 2025",
      format: "season"
    },
    {
      slug: "cancer-full-moon-horoscopes-january-2025",
      title: "Cancer Full Moon and Horoscopes - January 2025",
      format: "lunation-full-moon"
    },
    {
      slug: "cancer-new-moon-2025",
      title: "Cancer New Moon 2025",
      format: "lunation-new-moon"
    },
    {
      slug: "first-new-moon-of-2025-aquarius-new-moon",
      title: "First New Moon of 2025: Aquarius New Moon",
      format: "lunation-new-moon"
    },
    {
      slug: "full-moon-eclipse-in-pisces-2025",
      title: "Full Moon Eclipse in Pisces 2025",
      format: "lunation-eclipse"
    },
    {
      slug: "full-moon-in-aries",
      title: "Full Moon in Aries",
      format: "lunation-full-moon"
    },
    {
      slug: "full-moon-in-taurus",
      title: "Full Moon in Taurus 2025",
      format: "lunation-full-moon"
    },
    {
      slug: "gemini-new-moon-2025",
      title: "Gemini New Moon 2025",
      format: "lunation-new-moon"
    },
    {
      slug: "gemini-season-2025",
      title: "Gemini Season 2025",
      format: "season"
    },
    {
      slug: "leo-full-moon-2025",
      title: "Leo Full Moon 2025: The Breaking Point",
      format: "lunation-full-moon"
    },
    {
      slug: "leo-new-moon-2025",
      title: "Leo New Moon 2025",
      format: "lunation-new-moon"
    },
    {
      slug: "libra-new-moon",
      title: "Libra New Moon",
      format: "lunation-new-moon"
    },
    {
      slug: "libra-season-autumn-equinox",
      title: "Libra Season & Autumn Equinox",
      format: "season"
    },
    {
      slug: "monthly-overview-june-2025",
      title: "Monthly Horoscopes June 2025",
      format: "monthly-overview"
    },
    {
      slug: "new-moon-solar-eclipse-in-virgo",
      title: "New Moon Solar Eclipse in Virgo",
      format: "lunation-eclipse"
    },
    {
      slug: "pisces-new-moon-2025",
      title: "Pisces New Moon 2025",
      format: "lunation-new-moon"
    },
    {
      slug: "pisces-season-2025",
      title: "Pisces Season 2025",
      format: "season"
    },
    {
      slug: "sagittarius-full-moon-2025",
      title: "Sagittarius Full Moon 2025",
      format: "lunation-full-moon"
    },
    {
      slug: "summer-solstice",
      title: "Summer Solstice",
      format: "solstice-season"
    },
    {
      slug: "this-weeks-astrology-august-24th-31st",
      title: "This Week's Astrology: August 24th-31st",
      format: "weekly-overview"
    },
    {
      slug: "this-weeks-astrology-august-30-september-7-2025",
      title: "This Week's Astrology: August 30 – September 7, 2025",
      format: "weekly-overview"
    },
    {
      slug: "total-lunar-eclipse-in-virgo",
      title: "Total Lunar Eclipse in Virgo 2025",
      format: "lunation-eclipse"
    },
    {
      slug: "virgo-new-moon-august-23rd-2025",
      title: "Virgo New Moon August 23rd 2025",
      format: "lunation-new-moon"
    },
    {
      slug: "virgo-season-2025",
      title: "Virgo Season 2025",
      format: "season"
    },
    {
      slug: "weekly-horoscopes-sept-7-14-2020",
      title: "Weekly Horoscopes - Sept 7th - 14th 2025",
      format: "weekly-overview"
    }
  ]
};

const cohortDirectories = {
  calibrationCandidates: "calibration-candidates",
  diagnosticSameSurface: "diagnostic-same-surface",
  adjacentFormats: "adjacent-formats",
  additionalSurfaceReferences: "reference-surfaces"
};

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function parseArgs(argv) {
  const options = { check: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--check") {
      options.check = true;
      continue;
    }
    if (token === "--source-root") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--source-root requires a directory.");
      options.sourceRoot = path.resolve(value);
      index += 1;
      continue;
    }
    throw new Error(`Unexpected argument '${token}'.`);
  }
  if (!options.sourceRoot) throw new Error("--source-root is required.");
  return options;
}

function attributeValue(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match ? (match[1] ?? match[2] ?? match[3] ?? "") : "";
}

function hasClass(tag, className) {
  return attributeValue(tag, "class").split(/\s+/).includes(className);
}

function extractElement(html, startIndex, tagName) {
  const tokenPattern = new RegExp(`<\\/?${tagName}\\b[^>]*>`, "gi");
  tokenPattern.lastIndex = startIndex;
  let depth = 0;
  let openingEnd = -1;
  for (let match = tokenPattern.exec(html); match; match = tokenPattern.exec(html)) {
    const closing = match[0].startsWith("</");
    if (!closing) {
      depth += 1;
      if (depth === 1) openingEnd = tokenPattern.lastIndex;
    } else {
      depth -= 1;
      if (depth === 0) return html.slice(openingEnd, match.index);
    }
  }
  throw new Error(`Could not find closing </${tagName}> tag.`);
}

function extractArticleBodyHtml(html) {
  const sectionPattern = /<section\b[^>]*>/gi;
  let section;
  for (let match = sectionPattern.exec(html); match; match = sectionPattern.exec(html)) {
    if (hasClass(match[0], "article-main-content")) {
      section = { start: match.index, html: extractElement(html, match.index, "section") };
      break;
    }
  }
  if (!section) throw new Error("Missing article-main-content section.");

  const divPattern = /<div\b[^>]*>/gi;
  for (let match = divPattern.exec(section.html); match; match = divPattern.exec(section.html)) {
    if (hasClass(match[0], "rte")) return extractElement(section.html, match.index, "div");
  }
  throw new Error("Missing authored article-body div.rte.");
}

function decodeEntities(value) {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    hellip: "…",
    ldquo: "“",
    lsquo: "‘",
    lt: "<",
    mdash: "—",
    nbsp: " ",
    ndash: "–",
    quot: "\"",
    rdquo: "”",
    rsquo: "’"
  };
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code) => {
    if (code[0] === "#") {
      const numeric = code[1].toLowerCase() === "x"
        ? Number.parseInt(code.slice(2), 16)
        : Number.parseInt(code.slice(1), 10);
      return Number.isFinite(numeric) ? String.fromCodePoint(numeric) : entity;
    }
    return named[code.toLowerCase()] ?? entity;
  });
}

function htmlToMarkdown(bodyHtml) {
  let value = bodyHtml
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<meta\b[^>]*>/gi, "")
    .replace(/<img\b[^>]*>/gi, "")
    .replace(/<br\b[^>]*>/gi, "\n")
    .replace(/<li\b([^>]*)>\s*<p\b[^>]*>/gi, "<li$1>")
    .replace(/<\/p>\s*<\/li>/gi, "</li>")
    .replace(/<hr\b[^>]*>/gi, "\n\n---\n\n");

  for (let level = 1; level <= 6; level += 1) {
    value = value
      .replace(new RegExp(`<h${level}\\b[^>]*>`, "gi"), `\n\n${"#".repeat(level)} `)
      .replace(new RegExp(`</h${level}>`, "gi"), "\n\n");
  }

  value = value
    .replace(/<li\b[^>]*>/gi, "\n- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<(p|div|section|article|ul|ol|blockquote|figure|figcaption|table|thead|tbody|tr)\b[^>]*>/gi, "\n\n")
    .replace(/<\/(p|div|section|article|ul|ol|blockquote|figure|figcaption|table|thead|tbody|tr)>/gi, "\n\n")
    .replace(/<(td|th)\b[^>]*>/gi, " | ")
    .replace(/<\/(td|th)>/gi, " ")
    .replace(/<[^>]+>/g, "");

  return `${decodeEntities(value)
    .replace(/\u00a0/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[\t ]+\n/g, "\n")
    .replace(/[\t ]{2,}/g, " ")
    .replace(/\n[\t ]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^#{1,6}\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()}\n`;
}

function extractMeta(html, property) {
  const metaPattern = /<meta\b[^>]*>/gi;
  for (let match = metaPattern.exec(html); match; match = metaPattern.exec(html)) {
    const key = attributeValue(match[0], "property") || attributeValue(match[0], "name");
    if (key === property) return decodeEntities(attributeValue(match[0], "content"));
  }
  return "";
}

function wordCount(value) {
  return (value.match(/\b[\p{L}\p{N}][\p{L}\p{N}’'-]*\b/gu) || []).length;
}

function materializeEntry(sourceRoot, cohortName, selection, check) {
  const sourcePath = path.join(sourceRoot, `${selection.slug}.html`);
  if (!fs.existsSync(sourcePath)) throw new Error(`Missing source article: ${sourcePath}`);
  const sourceHtml = fs.readFileSync(sourcePath, "utf8");
  const sourceBodyHtml = extractArticleBodyHtml(sourceHtml);
  const content = htmlToMarkdown(sourceBodyHtml);
  const title = extractMeta(sourceHtml, "og:title");
  const sourceUrl = extractMeta(sourceHtml, "og:url");
  if (title !== selection.title) {
    throw new Error(`${selection.slug}: expected title '${selection.title}', found '${title}'.`);
  }
  const expectedUrl = `https://mariesatori.com/blogs/astrology/${selection.slug}`;
  if (sourceUrl !== expectedUrl) {
    throw new Error(`${selection.slug}: expected URL '${expectedUrl}', found '${sourceUrl}'.`);
  }

  const relativeFile = path.join(cohortDirectories[cohortName], `${selection.slug}.md`);
  const outputPath = path.join(fixtureRoot, relativeFile);
  if (check) {
    if (!fs.existsSync(outputPath) || fs.readFileSync(outputPath, "utf8") !== content) {
      throw new Error(`${relativeFile} differs from the owner mirror extraction.`);
    }
  } else {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, content, "utf8");
  }

  return {
    file: relativeFile.split(path.sep).join("/"),
    title,
    sourceSlug: selection.slug,
    sourceUrl,
    ...(selection.planet ? { planet: selection.planet, edition: selection.edition } : { format: selection.format }),
    wordCount: wordCount(content),
    sha256: sha256(content),
    sourceBodyHtmlSha256: sha256(sourceBodyHtml)
  };
}

function buildManifest(sourceRoot, check) {
  const materialized = Object.fromEntries(
    Object.entries(cohorts).map(([cohortName, entries]) => [
      cohortName,
      entries.map((entry) => materializeEntry(sourceRoot, cohortName, entry, check))
    ])
  );
  return {
    schemaVersion: 1,
    surface: "sky-article-longform",
    evaluationProfileVersion: "sky-article-longform-owner-corpus-diagnostic-v1",
    provenance: "owner-published Marie Satori article bodies extracted from the owner-provided SiteSucker mirror",
    extractionPolicy: "Authored div.rte body only; HTML/page chrome removed; words and punctuation otherwise preserved.",
    factualPolicy: "Historical article dates and timezone labels are evaluation text only and must never supply runtime astrology facts.",
    activationPolicy: "This corpus is isolated from the active calibration manifest. The same-surface articles have been exposed during rubric diagnosis and are not a blind held-out set. Adjacent-format and additional-surface references must not enter the planet-article evaluator. Moving an eligible entry into active calibration requires owner review and an explicit evaluation-set version change.",
    activeCalibrationSourceSlugs: [
      "saturn-enters-aries",
      "jupiter-in-cancer-horoscopes-by-sign-2025",
      "uranus-direct-in-taurus-2025",
      "uranu-retrograde-in-gemini"
    ],
    cohorts: materialized
  };
}

function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const manifest = buildManifest(options.sourceRoot, options.check);
  const manifestPath = path.join(fixtureRoot, "manifest.json");
  const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
  if (options.check) {
    if (!fs.existsSync(manifestPath) || fs.readFileSync(manifestPath, "utf8") !== serialized) {
      throw new Error("owner-corpus/manifest.json differs from the owner mirror extraction.");
    }
    console.log("Owner article corpus matches the source mirror and manifest.");
    return;
  }
  fs.mkdirSync(fixtureRoot, { recursive: true });
  fs.writeFileSync(manifestPath, serialized, "utf8");
  const counts = Object.fromEntries(Object.entries(manifest.cohorts).map(([name, entries]) => [name, entries.length]));
  console.log(JSON.stringify({ written: true, counts }, null, 2));
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

module.exports = {
  buildManifest,
  cohorts,
  decodeEntities,
  extractArticleBodyHtml,
  htmlToMarkdown,
  parseArgs,
  wordCount
};
