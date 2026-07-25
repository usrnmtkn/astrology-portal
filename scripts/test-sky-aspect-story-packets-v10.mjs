import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getSkyAspectStoryPacketRecords,
  SkyAspectStoryPacketSourceGapError,
  resolveSkyAspectStoryPacket,
} from "../apps/web/src/content/skyAspectStoryPackets/skyAspectStoryPacketResolver.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(
  root,
  "apps/web/src/content/skyAspectStoryPackets",
);
const sourcePath = path.join(dataDir, "sky-aspect-exact-story-packets.json");
const auditPath = path.join(
  dataDir,
  "sky-aspect-exact-story-packets-audit.json",
);
const approvalPath = path.join(
  dataDir,
  "sky-aspect-story-packet-approvals.json",
);
const sourceText = fs.readFileSync(sourcePath, "utf8");
const source = JSON.parse(sourceText);
const audit = JSON.parse(fs.readFileSync(auditPath, "utf8"));
const approval = JSON.parse(fs.readFileSync(approvalPath, "utf8"));
const records = source.records;
const roleOrder = [
  "humanMoment",
  "developmentDetail",
  "planetaryDynamic",
  "aspectMechanic",
  "conditionalConsequence",
];

assert.equal(
  crypto.createHash("sha256").update(sourceText).digest("hex"),
  audit.sha256,
  "canonical packet SHA must match the supplied audit",
);
assert.equal(audit.sha256, "66662d03af713af85a1e5f057e1044abb4f00fa903fc555caefa729c4fe90a17");
assert.equal(approval.canonicalSha256, audit.sha256);
assert.equal(approval.canonicalLibraryVersion, source.version);
assert.equal(approval.approvedRecordCount, 220);
assert.equal(records.length, 225);

const pairs = new Set(records.map((record) => `${record.planetA}|${record.planetB}`));
assert.equal(pairs.size, 45);
for (const aspect of ["conjunction", "sextile", "trine", "square", "opposition"]) {
  assert.equal(records.filter((record) => record.aspect === aspect).length, 45);
}

assert.equal(new Set(records.map((record) => record.id)).size, 225);
assert.equal(new Set(records.map((record) => record.body)).size, 225);
const authoredSentences = records.flatMap((record) =>
  roleOrder.map((role) => record.sentenceRoles[role]),
);
assert.equal(new Set(authoredSentences).size, authoredSentences.length);

for (const record of records) {
  assert.equal(Object.keys(record.sentenceRoles).length, 5, `${record.id} role count`);
  assert.equal(
    roleOrder.map((role) => record.sentenceRoles[role]).join(" "),
    record.body,
    `${record.id} must remain one intact five-sentence authored packet`,
  );

  if (record.collectiveLeadEligible) {
    assert.equal(typeof record.optionalCollectiveFactLead, "string");
    assert.match(record.optionalCollectiveFactLead, /^Right now, /);
    assert.match(record.optionalCollectiveFactLead, /, and on a collective level, /);
  } else {
    assert.equal(record.optionalCollectiveFactLead, null);
  }
}

const lockedHashes = {
  "sky.sun.sextile.moon": "bd326d7d48271ba444dad8f9c6b1e696fd3035de20843266ef086191cf707d38",
  "sky.sun.trine.moon": "df676c5f35e8842ab9de02a1da483bff43666a258d8b88692eb7517d4d783665",
  "sky.sun.square.moon": "f7e022b1439d1de80ec9925eaa73a53e136c11126c277127254d6ed1259e41f0",
  "sky.sun.opposition.moon": "82aa36f3944be69ad7f33739d579a5f4d5971404ef90c150254a5e9bdb3fb884",
  "sky.sun.conjunction.moon": "15601c5ffc84ef89f6b6386fb3224e1666824d4dc039d9b5620622ca250d175a",
};
const locked = records.filter(
  (record) => record.editorialStatus === "approved-user-locked",
);
assert.equal(locked.length, 5);
for (const record of locked) {
  const snapshot = JSON.stringify({
    sentenceRoles: record.sentenceRoles,
    body: record.body,
  });
  assert.equal(
    crypto.createHash("sha256").update(snapshot).digest("hex"),
    lockedHashes[record.id],
    `${record.id} locked copy changed`,
  );
}
assert.equal(
  records.filter(
    (record) => record.editorialStatus === "editorially-refined-review-ready",
  ).length,
  220,
);
const effectiveRecords = getSkyAspectStoryPacketRecords();
assert.equal(
  effectiveRecords.filter((record) => record.editorialStatus === "approved-user")
    .length,
  220,
);
assert.equal(
  effectiveRecords.filter(
    (record) => record.editorialStatus === "approved-user-locked",
  ).length,
  5,
);

for (const record of records) {
  const input = {
    planetA: record.planetA,
    planetB: record.planetB,
    aspect: record.aspect,
    audience: "admin",
    includeCalculatedFact: false,
  };
  const before = structuredClone(input);
  const canonical = resolveSkyAspectStoryPacket(input);
  assert.deepEqual(input, before, `${record.id} editorial resolution mutated facts`);
  assert.equal(canonical.packetId, record.id);
  assert.equal(canonical.body, record.body);
  assert.equal(canonical.provenance.fallbackLevel, "exact-aspect-story-packet");

  const reversed = resolveSkyAspectStoryPacket({
    planetA: record.planetB,
    planetB: record.planetA,
    aspect: record.aspect,
    audience: "admin",
    includeCalculatedFact: false,
  });
  assert.equal(reversed.packetId, record.id);
  assert.equal(reversed.body, record.body);
  assert.equal(reversed.facts.reversedInput, true);
}

const sunMoonTrine = records.find((record) => record.id === "sky.sun.trine.moon");
const sunMoonSextile = records.find((record) => record.id === "sky.sun.sextile.moon");
const sunMoonSquare = records.find((record) => record.id === "sky.sun.square.moon");
const sunMoonOpposition = records.find((record) => record.id === "sky.sun.opposition.moon");
assert.equal(
  resolveSkyAspectStoryPacket({
    planetA: "sun",
    planetB: "moon",
    aspect: "trine",
    audience: "admin",
    includeCalculatedFact: false,
  }).body,
  sunMoonTrine.body,
);
assert.notEqual(sunMoonTrine.body, sunMoonSextile.body);
assert.notEqual(sunMoonSquare.body, sunMoonOpposition.body);

for (const record of locked) {
  const reader = resolveSkyAspectStoryPacket({
    planetA: record.planetA,
    planetB: record.planetB,
    aspect: record.aspect,
    audience: "reader",
    includeCalculatedFact: false,
  });
  const admin = resolveSkyAspectStoryPacket({
    planetA: record.planetA,
    planetB: record.planetB,
    aspect: record.aspect,
    audience: "admin",
    includeCalculatedFact: false,
  });
  assert.equal(reader.body, admin.body, `${record.id} reader/admin resolver parity`);
}

for (const record of records) {
  const reader = resolveSkyAspectStoryPacket({
    planetA: record.planetA,
    planetB: record.planetB,
    aspect: record.aspect,
    audience: "reader",
    includeCalculatedFact: false,
  });
  assert.equal(reader.body, record.body, `${record.id} owner-approved reader copy`);
}
assert.throws(
  () =>
    resolveSkyAspectStoryPacket({
      planetA: "sun",
      planetB: "sun",
      aspect: "trine",
      audience: "reader",
    }),
  SkyAspectStoryPacketSourceGapError,
);

const collective = records.find((record) => record.collectiveLeadEligible);
const collectiveResolution = resolveSkyAspectStoryPacket({
  planetA: collective.planetA,
  planetB: collective.planetB,
  aspect: collective.aspect,
  signA: "aries",
  signB: "libra",
  audience: "admin",
});
assert.equal(collectiveResolution.provenance.collectiveLeadUsed, true);
assert.equal(
  collectiveResolution.body.toLowerCase().split(
    collective.sentenceRoles.humanMoment.toLowerCase(),
  ).length - 1,
  1,
  "collective bridge must replace, not duplicate, the human moment",
);

const ineligible = records.find((record) => !record.collectiveLeadEligible);
const ineligibleResolution = resolveSkyAspectStoryPacket({
  planetA: ineligible.planetA,
  planetB: ineligible.planetB,
  aspect: ineligible.aspect,
  signA: "aries",
  signB: "libra",
  audience: "admin",
});
assert.equal(ineligibleResolution.provenance.collectiveLeadUsed, false);
assert.match(ineligibleResolution.body, /^Right now, /);
assert.ok(ineligibleResolution.body.endsWith(ineligible.body));

const substituted = resolveSkyAspectStoryPacket({
  planetA: ineligible.planetA,
  planetB: ineligible.planetB,
  aspect: ineligible.aspect,
  signA: "aries",
  signB: "libra",
  audience: "admin",
  includeCalculatedFact: false,
  signSpecificPlanetaryDynamic: {
    text: "Reviewed sign-context sentence.",
    previewOnly: true,
  },
});
assert.equal(
  substituted.sentenceRoles.planetaryDynamic,
  "Reviewed sign-context sentence.",
);
assert.ok(substituted.body.includes(ineligible.sentenceRoles.humanMoment));
assert.ok(substituted.body.includes(ineligible.sentenceRoles.developmentDetail));
assert.ok(substituted.body.includes(ineligible.sentenceRoles.aspectMechanic));
assert.ok(substituted.body.includes(ineligible.sentenceRoles.conditionalConsequence));
assert.ok(!substituted.body.includes(ineligible.sentenceRoles.planetaryDynamic));

for (const resolution of [collectiveResolution, ineligibleResolution, substituted]) {
  assert.doesNotMatch(
    resolution.body,
    /\b(?:editorialStatus|sourceKey|fallbackLevel|approved-user-locked|review-ready)\b/,
  );
  assert.doesNotMatch(resolution.body, /\{\{[^}]+\}\}/);
}

const appSource = fs.readFileSync(path.join(root, "apps/web/src/App.tsx"), "utf8");
const calendarSource = fs.readFileSync(
  path.join(root, "apps/web/src/features/calendar/LunarCalendar.tsx"),
  "utf8",
);
const adminSource = fs.readFileSync(
  path.join(root, "apps/admin/src/SkyAspectStoryPacketReview.tsx"),
  "utf8",
);
assert.doesNotMatch(appSource, /renderSkyAspectCard\(\{/);
assert.doesNotMatch(calendarSource, /renderSkyAspectCard\(\{/);
assert.match(appSource, /resolveSkyAspectStoryPacket\(\{/);
assert.match(calendarSource, /resolveSkyAspectStoryPacket\(\{/);
assert.match(
  calendarSource,
  /content && generatedDescription && event\.type !== "aspect"/,
);
assert.match(adminSource, /resolveSkyAspectStoryPacket\(\{/);
assert.match(adminSource, />Exact aspect</);
assert.match(adminSource, /editorialStatus/);
assert.match(adminSource, /Canonical five-sentence body/);

console.log(
  "Sky aspect V10.1 packets: 225 owner-approved exact packets, locked snapshots, resolver normalization, collective bridge, and admin parity passed.",
);
