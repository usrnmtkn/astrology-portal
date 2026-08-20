"use strict";

const DAY_MS = 86_400_000;

function slug(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

function dateOnly(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Sky horizon dates must be valid.");
  return date.toISOString().slice(0, 10);
}

function skyAspectPointSlug(value) {
  const normalized = slug(value);
  return ["north-node", "south-node"].includes(normalized) ? "nodes" : normalized;
}

function skyAspectContentKey(aspect, positions) {
  const first = positions.find((position) => position.planet === aspect.from);
  const second = positions.find((position) => position.planet === aspect.to);
  if (!first?.sign || !second?.sign) return null;
  return [
    "sky.aspect",
    skyAspectPointSlug(aspect.from),
    slug(aspect.type),
    skyAspectPointSlug(aspect.to),
    slug(first.sign),
    slug(second.sign)
  ].join(".");
}

function skyPlacementContentKey(position) {
  if (!position?.planet || !position?.sign) return null;
  return [
    "sky.placement.base",
    slug(position.planet).replace(/-/gu, "_"),
    slug(position.sign).replace(/-/gu, "_")
  ].join(".");
}

function areConsecutive(first, second) {
  return new Date(`${second}T00:00:00.000Z`).getTime()
    - new Date(`${first}T00:00:00.000Z`).getTime() === DAY_MS;
}

function appendOccurrence(map, candidate) {
  const existing = map.get(candidate.contentKey);
  if (!existing) {
    map.set(candidate.contentKey, {
      ...candidate,
      activeDates: [candidate.date],
      windows: [{ startDate: candidate.date, endDate: candidate.date }]
    });
    return;
  }

  if (existing.activeDates.includes(candidate.date)) return;
  existing.activeDates.push(candidate.date);
  const lastWindow = existing.windows.at(-1);
  if (lastWindow && areConsecutive(lastWindow.endDate, candidate.date)) {
    lastWindow.endDate = candidate.date;
  } else {
    existing.windows.push({ startDate: candidate.date, endDate: candidate.date });
  }
}

function buildSkyReviewHorizon(snapshots) {
  if (!Array.isArray(snapshots) || snapshots.length === 0) {
    throw new Error("At least one calculated Sky snapshot is required.");
  }

  const snapshotDate = (snapshot) => dateOnly(snapshot.horizonDate ?? snapshot.generatedAt);
  const ordered = [...snapshots].sort((left, right) => snapshotDate(left).localeCompare(snapshotDate(right)));
  const aspects = new Map();
  const placements = new Map();

  for (const snapshot of ordered) {
    const date = snapshotDate(snapshot);
    const positions = Array.isArray(snapshot.positions) ? snapshot.positions : [];

    for (const aspect of Array.isArray(snapshot.aspects) ? snapshot.aspects : []) {
      const contentKey = skyAspectContentKey(aspect, positions);
      if (!contentKey) continue;
      appendOccurrence(aspects, {
        kind: "aspect",
        contentKey,
        date,
        label: `${aspect.from} ${aspect.type} ${aspect.to}`,
        facts: {
          a: skyAspectPointSlug(aspect.from),
          b: skyAspectPointSlug(aspect.to),
          aspect: slug(aspect.type),
          signA: slug(positions.find((position) => position.planet === aspect.from)?.sign),
          signB: slug(positions.find((position) => position.planet === aspect.to)?.sign)
        }
      });
    }

    for (const position of positions) {
      const contentKey = skyPlacementContentKey(position);
      if (!contentKey) continue;
      appendOccurrence(placements, {
        kind: "placement",
        contentKey,
        date,
        label: `${position.planet} in ${position.sign}`,
        facts: { planet: slug(position.planet), sign: slug(position.sign) }
      });
    }
  }

  const occurrences = [...aspects.values(), ...placements.values()]
    .map(({ date: _date, ...entry }) => entry)
    .sort((left, right) => (
      left.windows[0].startDate.localeCompare(right.windows[0].startDate)
      || left.kind.localeCompare(right.kind)
      || left.contentKey.localeCompare(right.contentKey)
    ));

  return {
    startDate: snapshotDate(ordered[0]),
    endDate: snapshotDate(ordered.at(-1)),
    snapshotCount: ordered.length,
    calculationMethod: "daily-active-sky-snapshot",
    counts: {
      occurrences: occurrences.length,
      aspectCandidates: aspects.size,
      placementCandidates: placements.size,
      activeWindows: occurrences.reduce((sum, occurrence) => sum + occurrence.windows.length, 0)
    },
    occurrences
  };
}

function reviewStatusForHorizonRow(row) {
  if (!row) return "missing_draft";
  if (row.status === "ARCHIVED") return "rejected";
  if (row.status === "LIVE" && row.lane === "serving" && !row.review_state) return "approved_scheduled";
  if (["DRAFT", "REVIEWED"].includes(row.status) && row.judge_score === 3 && row.judge_gate === "human-review") return "ready_for_owner";
  if (row.status === "ERROR") return "generation_error";
  return "draft_needs_work";
}

function joinSkyReviewRows(horizon, rows) {
  const byKey = new Map((Array.isArray(rows) ? rows : []).map((row) => [row.content_key, row]));
  const occurrences = horizon.occurrences.map((occurrence) => {
    const row = byKey.get(occurrence.contentKey) ?? null;
    return {
      ...occurrence,
      reviewStatus: reviewStatusForHorizonRow(row),
      row
    };
  });
  const reviewCounts = occurrences.reduce((counts, occurrence) => {
    counts[occurrence.reviewStatus] = (counts[occurrence.reviewStatus] ?? 0) + 1;
    return counts;
  }, {});
  return { ...horizon, reviewCounts, occurrences };
}

module.exports = {
  buildSkyReviewHorizon,
  joinSkyReviewRows,
  reviewStatusForHorizonRow,
  skyAspectContentKey,
  skyPlacementContentKey
};
