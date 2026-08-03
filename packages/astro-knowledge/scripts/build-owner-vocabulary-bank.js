#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { acDocuments, defaultAcRoot } = require("./build-ac-reference-index.js");

const packageRoot = path.join(__dirname, "..");
const fixtureRoot = path.join(packageRoot, "voice", "tldr-astro", "fixtures", "sky-article-longform");
const ownerCorpusRoot = path.join(fixtureRoot, "owner-corpus");
const outputPath = path.join(packageRoot, "voice", "tldr-astro", "owner-vocabulary-bank.json");
const guidePath = path.join(packageRoot, "docs", "editorial-ai", "OWNER-STYLE-VOCABULARY-GUIDE-2026-08-01.md");
const defaultSdRoot = path.join(
  os.homedir(),
  "Downloads",
  "us.sitesucker.mac.sitesucker",
  "spiritdaughter.com",
  "blogs",
  "align-with-magic"
);

const STOP_WORDS = new Set(`
  a about above after again against all am an and any are aren't as at be because been before being below between
  both but by can can't cannot could couldn't did didn't do does doesn't doing don't down during each few for from
  further had hadn't has hasn't have haven't having he he'd he'll he's her here here's hers herself him himself his
  how how's i i'd i'll i'm i've if in into is isn't it it's its itself just let's me more most mustn't my myself no
  nor not of off on once only or other ought our ours ourselves out over own same shan't she she'd she'll she's should
  shouldn't so some such than that that's the their theirs them themselves then there there's these they they'd they'll
  they're they've this those through to too under until up very was wasn't we we'd we'll we're we've were weren't what
  what's when when's where where's which while who who's whom why why's will with won't would wouldn't you you'd you'll
  you're you've your yours yourself yourselves also around away back become becomes becoming came come comes coming even
  ever every get gets getting got here's however like likely make makes making may might much now often perhaps really
  since still take takes taking that's thing things think though throughout together toward towards truly using want
  wants way ways well whether within without yet actually another anyone anything else everybody everyone everything
  first next nobody nothing note official officially one others right somebody someone something top use
`.trim().split(/\s+/u));

const DOMAIN_WORDS = new Set(`
  astrology astrological astrologer astro zodiac horoscope horoscopes chart charts transit transits aspect aspects
  conjunction conjunct opposition opposite square squares sextile sextiles trine trines quincunx retrograde direct
  station stations ingress cazimi eclipse eclipses lunation lunar solar moon moons sun mercury venus mars jupiter saturn
  uranus neptune pluto chiron lilith node nodes north south aries taurus gemini cancer leo virgo libra scorpio sagittarius
  capricorn aquarius pisces sign signs planet planets house houses rising degree degrees energy energies season seasons
  cycle cycles week weeks weekly day days date dates year years new full today tomorrow yesterday morning afternoon
  evening night january february march april may june july august september october november december sunday monday
  tuesday wednesday thursday friday saturday jan feb mar apr jun jul aug sept sep oct nov dec edt est cdt cst mdt mst
  pdt pst pt et
`.trim().split(/\s+/u));

const SD_BLOCKED_WORDS = new Set([
  "download",
  "downloads",
  "frequency",
  "manifestation",
  "portal",
  "transmission",
  "vibration",
  "vibrations"
]);

const SD_ALLOWED_ADDITIONS = {
  general: ["arriving", "flowing", "landing", "lighter", "lifts", "planting", "warm", "wide"],
  weekly: ["midnight", "tonight", "weekend"]
};
const SD_ALLOWED_ADDITION_WORDS = new Set(Object.values(SD_ALLOWED_ADDITIONS).flat());

const AC_TECHNICAL_ONLY_WORDS = new Set([
  "configuration",
  "configurations",
  "conjoin",
  "decan",
  "martial"
]);

const AC_SYMBOLIC_TOPIC_ONLY_WORDS = new Set([
  "archer",
  "dragon",
  "goat",
  "lion"
]);

const AC_OWNER_OBSERVED_RARE_WORDS = new Set([
  "considered",
  "history",
  "merely",
  "number",
  "occur",
  "ongoing",
  "pair",
  "red",
  "result",
  "single",
  "swift"
]);

const AC_REGISTER_TRANSFER_WORDS = new Set([
  "addition",
  "although",
  "certainly",
  "entirety",
  "images",
  "indeed",
  "man",
  "portion",
  "thus",
  "variety"
]);

const SOURCE_FURNITURE_WORDS = new Set(`
  blog companion copy daughter episode episodes forbes gift grab guide jill lab meditation meditations mini neurogenetics
  numerology podcast podcasts post posts prompt prompts quiz store tracks workbook workbooks workshop zoom
`.trim().split(/\s+/u));

const OWNER_FURNITURE_LINE = /(?:looking for the perfect gift|read my gift guide|want more key insights|read these posts|detailed look at the year|check out the (?:\d{4} )?overview)/iu;
const SD_PROMOTION_BLOCK = /(?:workbooks?|podcasts?|mini episode|spirit daughter|neurogenetics|download your|grab (?:a|the|your) copy|shop (?:the|our)|meditations?)/iu;

const CURATED_SD_NON_WEEKLY = new Set([
  "barbault-basket-july-2026.html",
  "how-to-raise-your-vibration-this-eclipse-season.html",
  "jupiter-in-leo-2026.html",
  "learning-the-rhythm-of-the-moon.html",
  "neptune-retrograde-in-aries-2026.html",
  "saturn-retrograde-in-aries.html",
  "the-lions-gate-peak-on-8-8-your-portal-to-the-total-solar-eclipse-in-leo.html",
  "the-lunar-nodes-shift-into-aquarius-and-leo-a-new-eighteen-month-chapter-begins.html",
  "the-uranus-cazimi-in-gemini-break-through-your-limiting-beliefs.html",
  "three-cazimis-in-one-month-march-2026-is-calling-you-to-the-light.html",
  "uranus-in-gemini-rising-signs.html",
  "venus-and-jupiter-meet-in-cancer-the-most-powerful-day-to-attract-abundance-in-2026.html",
  "why-the-new-moon.html"
]);

const ACTIVE_FIXTURE_SLUGS = {
  "TLDR-Article-Edition-Saturn-Aries-2025-OWNER.md": "saturn-enters-aries",
  "TLDR-Article-Edition-Jupiter-Cancer-2025-OWNER.md": "jupiter-in-cancer-horoscopes-by-sign-2025",
  "TLDR-Article-Edition-Uranus-Direct-Taurus-2025-OWNER.md": "uranus-direct-in-taurus-2025",
  "TLDR-Article-Edition-Uranus-Rx-Gemini-2025-OWNER.md": "uranu-retrograde-in-gemini"
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function normalizeText(text) {
  return String(text || "")
    .normalize("NFKC")
    .replace(/[‘’]/gu, "'")
    .replace(/[“”]/gu, '"')
    .replace(/\r\n?/gu, "\n")
    .replace(/[\t ]+/gu, " ")
    .replace(/ *\n */gu, "\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

function decodeHtml(text) {
  const named = {
    amp: "&", apos: "'", gt: ">", hellip: "…", laquo: "«", ldquo: '"',
    lsquo: "'", lt: "<", nbsp: " ", ndash: "–", quot: '"', raquo: "»",
    rdquo: '"', rsquo: "'"
  };
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/giu, (match, entity) => {
    if (entity[0] === "#") {
      const value = entity[1].toLowerCase() === "x"
        ? Number.parseInt(entity.slice(2), 16)
        : Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(value) ? String.fromCodePoint(value) : match;
    }
    return named[entity.toLowerCase()] ?? match;
  });
}

function htmlArticleBody(html, file) {
  const startMarker = '<div class="Article__Body Rte">';
  const endMarker = '<footer class="Article__Footer">';
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Cannot locate SD article body in ${file}`);
  const text = normalizeText(decodeHtml(
    html
      .slice(start + startMarker.length, end)
      .replace(/<script\b[\s\S]*?<\/script>/giu, " ")
      .replace(/<style\b[\s\S]*?<\/style>/giu, " ")
      .replace(/<(?:br|\/p|\/li|\/h[1-6]|\/blockquote|\/div)>/giu, "\n")
      .replace(/<li\b[^>]*>/giu, "")
      .replace(/<[^>]+>/gu, " ")
  ));
  return normalizeText(text.split(/\n+/u).filter((block) => !SD_PROMOTION_BLOCK.test(block)).join("\n"));
}

function ownerFixtureBody(text) {
  const divider = text.indexOf("\n---\n");
  return cleanOwnerText(divider >= 0 ? text.slice(divider + 5) : text);
}

function cleanOwnerText(text) {
  return normalizeText(normalizeText(text).split(/\n+/u).filter((line) => !OWNER_FURNITURE_LINE.test(line)).join("\n"));
}

function ownerSurface(entry, cohort) {
  if (cohort === "calibrationCandidates" || cohort === "diagnosticSameSurface") return "planet-article";
  const format = String(entry.format || "");
  if (/weekly/u.test(format)) return "weekly";
  if (/lunation|eclipse|moon/u.test(format)) return "lunation-eclipse";
  if (/season|solstice/u.test(format)) return "season";
  if (/annual|monthly|yearly|overview/u.test(format)) return "overview";
  if (/planet|relationship|nodes/u.test(format)) return "planet-article";
  return "reference-article";
}

function ownerDocuments() {
  const documents = [];
  const activeManifest = readJson(path.join(fixtureRoot, "manifest.json"));
  for (const entry of activeManifest) {
    const file = path.join(fixtureRoot, entry.file);
    documents.push({
      id: ACTIVE_FIXTURE_SLUGS[entry.file] || path.basename(entry.file, ".md"),
      source: "owner",
      surface: "planet-article",
      text: ownerFixtureBody(fs.readFileSync(file, "utf8")),
      sha256: entry.sha256
    });
  }

  const corpusManifest = readJson(path.join(ownerCorpusRoot, "manifest.json"));
  for (const [cohort, entries] of Object.entries(corpusManifest.cohorts)) {
    for (const entry of entries) {
      documents.push({
        id: entry.sourceSlug,
        source: "owner",
        surface: ownerSurface(entry, cohort),
        text: cleanOwnerText(fs.readFileSync(path.join(ownerCorpusRoot, entry.file), "utf8")),
        sha256: entry.sha256
      });
    }
  }
  return documents;
}

function sdDocuments(sdRoot = defaultSdRoot) {
  if (!fs.existsSync(sdRoot)) {
    throw new Error(`Spirit Daughter mirror not found at ${sdRoot}. Pass --sd-root=/path/to/align-with-magic.`);
  }
  const files = fs.readdirSync(sdRoot)
    .filter((file) => file.endsWith(".html"))
    .filter((file) => !file.includes("﹖") && !file.includes("?"))
    .filter((file) => /^(?:weekly-astro-forecast|your-weekly-astro-forecast)/u.test(file) || CURATED_SD_NON_WEEKLY.has(file))
    .sort();
  return files.map((file) => {
    const html = fs.readFileSync(path.join(sdRoot, file), "utf8");
    return {
      id: file.replace(/\.html$/u, ""),
      source: "SD",
      surface: /weekly/u.test(file) ? "weekly" : "reference-article",
      text: htmlArticleBody(html, file),
      sha256: sha256(html)
    };
  });
}

function words(text) {
  return (normalizeText(text).toLowerCase().match(/[\p{L}]+(?:'[\p{L}]+)*/gu) || [])
    .map((word) => word.endsWith("'s") && word.length > 4 ? word.slice(0, -2) : word);
}

function isContentWord(word) {
  return word.length >= 3
    && !STOP_WORDS.has(word)
    && !DOMAIN_WORDS.has(word)
    && !SD_BLOCKED_WORDS.has(word)
    && !SOURCE_FURNITURE_WORDS.has(word);
}

function corpusStats(documents) {
  const entries = new Map();
  let totalWords = 0;
  let contentWords = 0;
  for (const document of documents) {
    const tokens = words(document.text);
    totalWords += tokens.length;
    const seen = new Set();
    for (const word of tokens) {
      if (!isContentWord(word)) continue;
      contentWords += 1;
      if (!entries.has(word)) entries.set(word, { count: 0, documents: 0 });
      entries.get(word).count += 1;
      seen.add(word);
    }
    for (const word of seen) entries.get(word).documents += 1;
  }
  return { documents: documents.length, totalWords, contentWords, entries };
}

function rounded(value, digits = 2) {
  return Number(value.toFixed(digits));
}

function wordRecord(word, stats, source, documentCount) {
  const entry = stats.entries.get(word);
  return {
    term: word,
    source,
    frequency: entry.count,
    articleCoverage: entry.documents,
    coveragePercent: rounded((entry.documents / documentCount) * 100, 1),
    per10kWords: rounded((entry.count / stats.contentWords) * 10000)
  };
}

function coreVocabulary(owner) {
  return [...owner.entries.entries()]
    .filter(([, entry]) => entry.count >= 8 && entry.documents >= 4)
    .sort((a, b) => {
      const scoreA = Math.sqrt(a[1].count) * a[1].documents;
      const scoreB = Math.sqrt(b[1].count) * b[1].documents;
      return scoreB - scoreA || b[1].count - a[1].count || a[0].localeCompare(b[0]);
    })
    .slice(0, 50)
    .map(([word]) => wordRecord(word, owner, "owner", owner.documents));
}

function sharedVocabulary(owner, sd) {
  return [...owner.entries.keys()]
    .filter((word) => sd.entries.has(word))
    .filter((word) => owner.entries.get(word).count >= 5 && owner.entries.get(word).documents >= 3)
    .filter((word) => sd.entries.get(word).count >= 3 && sd.entries.get(word).documents >= 2)
    .sort((a, b) => {
      const oa = owner.entries.get(a);
      const ob = owner.entries.get(b);
      const sa = sd.entries.get(a);
      const sb = sd.entries.get(b);
      const scoreA = Math.sqrt(oa.count * sa.count) * Math.min(oa.documents, sa.documents);
      const scoreB = Math.sqrt(ob.count * sb.count) * Math.min(ob.documents, sb.documents);
      return scoreB - scoreA || a.localeCompare(b);
    })
    .slice(0, 50)
    .map((word) => ({
      term: word,
      source: "owner+SD",
      ownerFrequency: owner.entries.get(word).count,
      ownerArticleCoverage: owner.entries.get(word).documents,
      sdFrequency: sd.entries.get(word).count,
      sdArticleCoverage: sd.entries.get(word).documents,
      use: "preferred lexical overlap; use naturally, never as a quota"
    }));
}

function sharedOwnerAcVocabulary(owner, ac) {
  return [...owner.entries.keys()]
    .filter((word) => ac.entries.has(word))
    .filter((word) => owner.entries.get(word).count >= 5 && owner.entries.get(word).documents >= 3)
    .filter((word) => ac.entries.get(word).count >= 6 && ac.entries.get(word).documents >= 3)
    .sort((a, b) => {
      const oa = owner.entries.get(a);
      const ob = owner.entries.get(b);
      const aa = ac.entries.get(a);
      const ab = ac.entries.get(b);
      const scoreA = Math.sqrt(oa.count * aa.count) * Math.min(oa.documents, aa.documents);
      const scoreB = Math.sqrt(ob.count * ab.count) * Math.min(ob.documents, ab.documents);
      return scoreB - scoreA || a.localeCompare(b);
    })
    .slice(0, 50)
    .map((word) => ({
      term: word,
      source: "owner+AC",
      ownerFrequency: owner.entries.get(word).count,
      ownerArticleCoverage: owner.entries.get(word).documents,
      acFrequency: ac.entries.get(word).count,
      acArticleCoverage: ac.entries.get(word).documents,
      use: "preferred lexical overlap; use naturally, never as a quota"
    }));
}

function acReviewCandidates(owner, ac) {
  return [...ac.entries.entries()]
    .filter(([, entry]) => entry.count >= 10 && entry.documents >= 5)
    .filter(([word]) => (owner.entries.get(word)?.count || 0) <= 2)
    .sort((a, b) => {
      const scoreA = Math.sqrt(a[1].count) * a[1].documents;
      const scoreB = Math.sqrt(b[1].count) * b[1].documents;
      return scoreB - scoreA || a[0].localeCompare(b[0]);
    })
    .slice(0, 30)
    .map(([word, entry]) => ({
      term: word,
      source: "AC",
      acFrequency: entry.count,
      acArticleCoverage: entry.documents,
      ownerFrequency: owner.entries.get(word)?.count || 0,
      status: "owner-review-required",
      use: "individual-word review only; do not import AC phrases, metaphors, or cadence"
    }));
}

function acCandidateAudit(candidates) {
  const lanes = {
    technicalReferenceOnly: [...AC_TECHNICAL_ONLY_WORDS].sort(),
    symbolicTopicOnly: [...AC_SYMBOLIC_TOPIC_ONLY_WORDS].sort(),
    ownerObservedRare: [...AC_OWNER_OBSERVED_RARE_WORDS].sort(),
    outsideRegisterUnobserved: [...AC_REGISTER_TRANSFER_WORDS].sort()
  };
  const classified = Object.values(lanes).flat().sort();
  const candidateTerms = candidates.map(({ term }) => term).sort();
  if (JSON.stringify(classified) !== JSON.stringify(candidateTerms)) {
    throw new Error("Every AC vocabulary review candidate must have exactly one audit classification.");
  }
  return {
    reviewedCount: candidates.length,
    recommendation: "promote-none",
    automaticPromptEligible: [],
    rationale: "No AC-only candidate has enough owner-corpus evidence to become preferred vocabulary.",
    lanes
  };
}

function sdReviewCandidates(owner, sd) {
  return [...sd.entries.entries()]
    .filter(([word]) => !SD_ALLOWED_ADDITION_WORDS.has(word))
    .filter(([word, entry]) => entry.count >= 6 && entry.documents >= 3 && (owner.entries.get(word)?.count || 0) <= 2)
    .sort((a, b) => {
      const scoreA = Math.sqrt(a[1].count) * a[1].documents;
      const scoreB = Math.sqrt(b[1].count) * b[1].documents;
      return scoreB - scoreA || a[0].localeCompare(b[0]);
    })
    .slice(0, 30)
    .map(([word, entry]) => ({
      term: word,
      source: "SD",
      sdFrequency: entry.count,
      sdArticleCoverage: entry.documents,
      ownerFrequency: owner.entries.get(word)?.count || 0,
      status: "owner-review-required",
      use: "do not auto-inject; approve only if it already feels natural in Marie's voice"
    }));
}

function sdLexicalAdditions(owner, sd) {
  return Object.entries(SD_ALLOWED_ADDITIONS).flatMap(([lane, terms]) => terms.map((term) => {
    const entry = sd.entries.get(term);
    if (!entry) throw new Error(`Approved SD lexical addition '${term}' is absent from the selected corpus.`);
    return {
      term,
      source: "SD",
      status: "allowed-individual-word",
      surfaces: lane === "general" ? ["all"] : [lane],
      sdFrequency: entry.count,
      sdArticleCoverage: entry.documents,
      ownerFrequency: owner.entries.get(term)?.count || 0,
      use: "neutral word only; Marie's syntax, meaning, and rhythm remain authoritative"
    };
  }));
}

function sentenceChunks(text) {
  return normalizeText(text)
    .replace(/^#{1,6} .*$/gmu, " ")
    .split(/(?<=[.!?])\s+|\n+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function ngramMap(documents, min = 2, max = 5) {
  const map = new Map();
  for (const document of documents) {
    const seen = new Set();
    for (const sentence of sentenceChunks(document.text)) {
      const tokens = words(sentence);
      for (let size = min; size <= max; size += 1) {
        for (let index = 0; index <= tokens.length - size; index += 1) {
          const slice = tokens.slice(index, index + size);
          if (STOP_WORDS.has(slice[0]) || STOP_WORDS.has(slice.at(-1))) continue;
          if (slice.filter(isContentWord).length < 2) continue;
          if (slice.some((word) => DOMAIN_WORDS.has(word) || SD_BLOCKED_WORDS.has(word))) continue;
          const phrase = slice.join(" ");
          if (!map.has(phrase)) map.set(phrase, { count: 0, documents: 0, size });
          map.get(phrase).count += 1;
          seen.add(phrase);
        }
      }
    }
    for (const phrase of seen) map.get(phrase).documents += 1;
  }
  return map;
}

function signaturePhrases(ownerDocumentsInput, sdDocumentsInput) {
  const owner = ngramMap(ownerDocumentsInput);
  const sd = ngramMap(sdDocumentsInput);
  return [...owner.entries()]
    .filter(([phrase, entry]) => entry.count >= 3 && entry.documents >= 2 && !sd.has(phrase))
    .sort((a, b) => {
      const scoreA = a[1].count * a[1].documents * a[1].size;
      const scoreB = b[1].count * b[1].documents * b[1].size;
      return scoreB - scoreA || b[1].size - a[1].size || a[0].localeCompare(b[0]);
    })
    .slice(0, 40)
    .map(([phrase, entry]) => ({
      phrase,
      source: "owner-only",
      frequency: entry.count,
      articleCoverage: entry.documents,
      use: "rhythm/reference evidence; do not repeat mechanically"
    }));
}

function surfaceVocabulary(documents, owner) {
  const surfaces = [...new Set(documents.map((document) => document.surface))].sort();
  return Object.fromEntries(surfaces.map((surface) => {
    const subsetDocuments = documents.filter((document) => document.surface === surface);
    const subset = corpusStats(subsetDocuments);
    const terms = [...subset.entries.entries()]
      .filter(([word, entry]) => entry.count >= 3 && entry.documents >= Math.min(2, subsetDocuments.length))
      .map(([word, entry]) => {
        const localRate = entry.count / subset.contentWords;
        const overallRate = owner.entries.get(word).count / owner.contentWords;
        return { word, entry, lift: localRate / overallRate };
      })
      .filter(({ lift }) => lift >= 1.1)
      .sort((a, b) => (b.lift * b.entry.documents) - (a.lift * a.entry.documents) || a.word.localeCompare(b.word))
      .slice(0, 20)
      .map(({ word, entry, lift }) => ({
        term: word,
        source: "owner",
        frequency: entry.count,
        articleCoverage: entry.documents,
        liftVsOwnerCorpus: rounded(lift)
      }));
    return [surface, { articleCount: subsetDocuments.length, terms }];
  }));
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];
}

function rhythm(documents) {
  const lengths = documents.flatMap((document) => sentenceChunks(document.text).map((sentence) => words(sentence).length))
    .filter((length) => length >= 2)
    .sort((a, b) => a - b);
  const total = lengths.reduce((sum, length) => sum + length, 0);
  return {
    sentenceCount: lengths.length,
    averageWords: rounded(total / lengths.length, 1),
    medianWords: percentile(lengths, 0.5),
    p90Words: percentile(lengths, 0.9),
    shortSentencePercent: rounded((lengths.filter((length) => length <= 7).length / lengths.length) * 100, 1),
    longSentencePercent: rounded((lengths.filter((length) => length >= 25).length / lengths.length) * 100, 1),
    definitions: { short: "2-7 words", long: "25+ words" }
  };
}

function manifestDigest(documents) {
  return sha256(documents.map(({ id, sha256: digest }) => `${id}:${digest}`).sort().join("\n"));
}

function loadBannedConstructions() {
  return readJson(path.join(packageRoot, "voice", "banned-constructions.json")).bannedConstructions
    .filter((entry) => entry.source === "SD")
    .map(({ pattern, reason, useInstead, source }) => ({ pattern, reason, useInstead, source }));
}

function buildVocabularyBank({ sdRoot = defaultSdRoot, acRoot = defaultAcRoot } = {}) {
  const ownerDocs = ownerDocuments();
  const sdDocs = sdDocuments(sdRoot);
  const acDocs = acDocuments(acRoot);
  const owner = corpusStats(ownerDocs);
  const sd = corpusStats(sdDocs);
  const ac = corpusStats(acDocs);
  const acCandidates = acReviewCandidates(owner, ac);
  return {
    schemaVersion: 1,
    id: "owner-vocabulary-bank-v1",
    authority: "owner-first",
    policies: {
      ownerWritingIsAuthority: true,
      ownerPhrasesOnly: true,
      sdContribution: "single-word lexical overlap plus a small neutral individual-word lane approved by the owner",
      acContribution: "single-word overlap and owner-review candidates only; no phrase or metaphor transfer",
      sdPhrasesForbidden: true,
      acPhrasesForbidden: true,
      sdFactsAndDatesForbidden: true,
      bannedConstructionsExcluded: true,
      generationUse: "menu, not quota",
      judgeUse: "supporting evidence only; preferred vocabulary never creates an automatic pass"
    },
    sources: {
      owner: {
        documentCount: owner.documents,
        totalWordCount: owner.totalWords,
        contentWordCount: owner.contentWords,
        manifestSha256: manifestDigest(ownerDocs),
        provenance: "47 owner-published Marie Satori article bodies"
      },
      spiritDaughter: {
        documentCount: sd.documents,
        totalWordCount: sd.totalWords,
        contentWordCount: sd.contentWords,
        manifestSha256: manifestDigest(sdDocs),
        provenance: "curated Spirit Daughter editorial HTML: weekly forecasts plus transit, lunation, eclipse, cazimi, rising-sign, and Barbault references",
        restriction: "vocabulary analysis only; no facts, dates, phrases, or structural imitation"
      },
      ac: {
        documentCount: ac.documents,
        totalWordCount: ac.totalWords,
        contentWordCount: ac.contentWords,
        manifestSha256: manifestDigest(acDocs),
        provenance: "curated AC reference articles selected from the owner-provided local mirror",
        restriction: "unverified reference testimony and individual-word analysis only; no runtime dates, facts, phrases, metaphors, or voice imitation"
      }
    },
    coreVocabulary: coreVocabulary(owner),
    sharedOwnerSdVocabulary: sharedVocabulary(owner, sd),
    sharedOwnerAcVocabulary: sharedOwnerAcVocabulary(owner, ac),
    sdLexicalAdditions: sdLexicalAdditions(owner, sd),
    ownerSignaturePhrases: signaturePhrases(ownerDocs, sdDocs),
    surfaceVocabulary: surfaceVocabulary(ownerDocs, owner),
    sdReviewCandidates: sdReviewCandidates(owner, sd),
    acReviewCandidates: acCandidates,
    acCandidateAudit: acCandidateAudit(acCandidates),
    rhythm: {
      owner: rhythm(ownerDocs),
      spiritDaughterReference: rhythm(sdDocs),
      instruction: "Match Marie's distribution and variation; SD rhythm is comparison data, not a target."
    },
    avoid: {
      sdBlockedWords: [...SD_BLOCKED_WORDS].sort(),
      sdConstructions: loadBannedConstructions()
    }
  };
}

function listTerms(entries, field = "term") {
  return entries.map((entry) => entry[field]).join(", ");
}

function guideMarkdown(bank) {
  const acLaneByTerm = new Map(Object.entries(bank.acCandidateAudit.lanes).flatMap(([lane, terms]) => (
    terms.map((term) => [term, lane])
  )));
  const lines = [
    "# Owner Style & Vocabulary Guide",
    "",
    `Generated offline from ${bank.sources.owner.documentCount} owner-published articles, ${bank.sources.spiritDaughter.documentCount} Spirit Daughter reference articles, and ${bank.sources.ac.documentCount} AC reference articles. The owner corpus is the authority. Outside sources contribute individual-word evidence only; no outside phrase, date, factual claim, metaphor, or signature construction is licensed by this guide.`,
    "",
    "## How to use it",
    "",
    "Use the vocabulary as a menu, not a quota. Choose a few words that fit the subject and let them recur only when the meaning calls for them. Owner-only phrases are rhythm evidence, not templates. A judge may cite this bank as supporting evidence, but vocabulary matches never create an automatic pass.",
    "",
    "## Core owner vocabulary",
    "",
    listTerms(bank.coreVocabulary),
    "",
    "## Shared Marie / Spirit Daughter vocabulary",
    "",
    "These are safe lexical overlaps because Marie already uses every word in this list. Their presence in SD increases familiarity; it does not transfer ownership of SD's sentence patterns.",
    "",
    listTerms(bank.sharedOwnerSdVocabulary),
    "",
    "## Owner-only recurring phrases",
    "",
    "These phrases recur in Marie's corpus and do not occur in the selected SD corpus. Use sparingly and vary their placement.",
    "",
    ...bank.ownerSignaturePhrases.map((entry) => `- “${entry.phrase}” — ${entry.frequency} uses across ${entry.articleCoverage} articles`),
    "",
    "## Shared Marie / AC vocabulary",
    "",
    "These words already occur in Marie's work and also recur in the AC reference corpus. They may be used as individual lexical choices. AC phrases, metaphors, and cadence are not sampled.",
    "",
    listTerms(bank.sharedOwnerAcVocabulary),
    "",
    "## Allowed SD-only word additions",
    "",
    "The owner explicitly approved using words from SD where the voices overlap. These neutral additions may be used as individual words in Marie's syntax. They do not license an SD phrase or cadence.",
    "",
    ...bank.sdLexicalAdditions.map((entry) => `- ${entry.term} — ${entry.surfaces.join(", ")}; SD ${entry.sdFrequency} uses / ${entry.sdArticleCoverage} articles`),
    "",
    "## Surface vocabulary",
    ""
  ];
  for (const [surface, value] of Object.entries(bank.surfaceVocabulary)) {
    lines.push(`### ${surface}`, "", listTerms(value.terms), "");
  }
  lines.push(
    "## SD-only review candidates",
    "",
    "These words are common in the SD reference but absent or rare in Marie's current corpus. They are not injected automatically. The owner can approve individual additions later.",
    "",
    ...bank.sdReviewCandidates.map((entry) => `- ${entry.term} — SD ${entry.sdFrequency} uses / ${entry.sdArticleCoverage} articles; owner ${entry.ownerFrequency}`),
    "",
    "## AC-only review candidates",
    "",
    "These are individual words common in the AC reference corpus but absent or rare in Marie's current corpus. The corpus audit promotes none of them: they remain outside automatic prompts and do not license AC phrasing.",
    "",
    `Audit recommendation: ${bank.acCandidateAudit.recommendation}. ${bank.acCandidateAudit.rationale}`,
    "",
    ...bank.acReviewCandidates.map((entry) => `- ${entry.term} [${acLaneByTerm.get(entry.term)}] — AC ${entry.acFrequency} uses / ${entry.acArticleCoverage} articles; owner ${entry.ownerFrequency}`),
    "",
    "## Rhythm",
    "",
    `Marie: ${bank.rhythm.owner.averageWords} words per sentence on average; median ${bank.rhythm.owner.medianWords}; ${bank.rhythm.owner.shortSentencePercent}% short sentences; ${bank.rhythm.owner.longSentencePercent}% long sentences.`,
    "",
    `SD comparison only: ${bank.rhythm.spiritDaughterReference.averageWords} words per sentence on average; median ${bank.rhythm.spiritDaughterReference.medianWords}; ${bank.rhythm.spiritDaughterReference.shortSentencePercent}% short sentences; ${bank.rhythm.spiritDaughterReference.longSentencePercent}% long sentences.`,
    "",
    "The useful target is Marie's variation: compact lines interrupt longer explanatory sentences. Do not copy SD's cadence.",
    "",
    "## Avoid lane",
    "",
    `Blocked SD register words: ${bank.avoid.sdBlockedWords.join(", ")}.`,
    "",
    "The existing CC/SD construction bank remains authoritative. In particular, shared vocabulary must never be assembled into SD's weekly opener, lesson-delivery sentence, benediction, future-self formula, affirmational permission language, or New Age register.",
    ""
  );
  return `${lines.join("\n").replace(/\n+$/u, "")}\n`;
}

function parseArgs(argv) {
  const options = {};
  for (const arg of argv) {
    if (arg.startsWith("--sd-root=")) options.sdRoot = path.resolve(arg.slice(10));
    else if (arg.startsWith("--ac-root=")) options.acRoot = path.resolve(arg.slice(10));
    else if (arg === "--check") options.check = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const bank = buildVocabularyBank(options);
  const json = `${JSON.stringify(bank, null, 2)}\n`;
  const guide = guideMarkdown(bank);
  if (options.check) {
    if (fs.readFileSync(outputPath, "utf8") !== json || fs.readFileSync(guidePath, "utf8") !== guide) {
      throw new Error("Owner vocabulary bank is stale. Run npm run build:owner-vocabulary-bank.");
    }
    console.log(`Owner vocabulary bank is current (${bank.sources.owner.documentCount} owner / ${bank.sources.spiritDaughter.documentCount} SD / ${bank.sources.ac.documentCount} AC articles).`);
    return;
  }
  fs.writeFileSync(outputPath, json);
  fs.writeFileSync(guidePath, guide);
  console.log(`Built ${path.relative(packageRoot, outputPath)} and ${path.relative(packageRoot, guidePath)} from ${bank.sources.owner.documentCount} owner / ${bank.sources.spiritDaughter.documentCount} SD / ${bank.sources.ac.documentCount} AC articles.`);
}

module.exports = {
  buildVocabularyBank,
  defaultSdRoot,
  guideMarkdown,
  htmlArticleBody,
  ownerDocuments,
  sdDocuments
};

if (require.main === module) main();
