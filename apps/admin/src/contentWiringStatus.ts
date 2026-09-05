export type ContentWiringRow = {
  block_type?: string | null;
  content_key: string;
  facts?: unknown;
  lane?: string | null;
  mode?: string | null;
  review_state?: string | null;
  sections?: unknown;
  source_snapshot?: unknown;
  status?: string | null;
};

export type ContentWiringStatus = {
  detail: string;
  label: string;
  reason: "connected" | "retired" | "source-material" | "unfinished" | "unknown";
  state: "connected" | "not-connected" | "not-serving" | "unknown";
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalized(value: unknown) {
  return text(value).toLowerCase().replace(/_/gu, "-");
}

function packageRecord(row: ContentWiringRow) {
  return record(record(row.sections).packageRecord);
}

function firstText(...values: unknown[]) {
  return values.map(text).find(Boolean) ?? "";
}

function explicitDestination(row: ContentWiringRow) {
  const source = record(row.source_snapshot);
  const facts = record(row.facts);
  return firstText(
    source.appDestination,
    source.app_destination,
    facts.appDestination,
    facts.app_destination
  );
}

function retirementReason(row: ContentWiringRow) {
  const source = record(row.source_snapshot);
  const packageRow = packageRecord(row);
  const reviewState = normalized(row.review_state);
  const reviewStatus = normalized(firstText(
    source.review_status,
    record(row.facts).review_status,
    packageRow.review_status
  ));

  if (row.status === "ARCHIVED") return "This row is archived and intentionally unavailable to reader pages.";
  if (reviewStatus === "superseded") return "A newer package version replaced this row; it remains only for package history and rollback.";
  if (reviewStatus === "deprecated") return "This package row is deprecated and retained only as historical material.";
  if (/retired|deprecated|decommissioned|legacy-dashboard-source-disabled/u.test(reviewState)) {
    return "This row was deliberately retired; its missing reader connection is not unfinished implementation work.";
  }
  return "";
}

function isSourceMaterial(row: ContentWiringRow) {
  const source = record(row.source_snapshot);
  const facts = record(row.facts);
  const packageRow = packageRecord(row);
  const role = normalized(firstText(
    source.content_role,
    source.contentRole,
    facts.content_role,
    facts.contentRole,
    packageRow.content_role
  ));
  const renderPolicy = normalized(firstText(
    source.render_policy,
    facts.render_policy,
    packageRow.render_policy
  ));
  const reviewState = normalized(row.review_state);

  return role === "source-material"
    || role === "fallback-source"
    || renderPolicy.includes("reference-only")
    || reviewState === "source-material-generic-aspect-baseline"
    || row.lane === "reference";
}

function isKnownRenderedKey(contentKey: string) {
  return contentKey.startsWith("sky.placement.")
    || contentKey.startsWith("sky-article/")
    || contentKey.startsWith("house-horoscope-core/")
    || contentKey.startsWith("fallback-hook/natal-you-placement-complete-final/")
    || contentKey.startsWith("authored/sky-lunation-macro/");
}

function isParkedForFutureRuntime(contentKey: string) {
  return contentKey.startsWith("sky.planetary.")
    || contentKey.startsWith("transit.house.");
}

export function contentWiringStatus(row: ContentWiringRow): ContentWiringStatus {
  const contentKey = row.content_key.toLowerCase();
  const destination = explicitDestination(row);
  const retired = retirementReason(row);

  if (retired) {
    return {
      detail: retired,
      label: "Not serving",
      reason: "retired",
      state: "not-serving"
    };
  }

  if (isSourceMaterial(row)) {
    return {
      detail: "This is an editing ingredient or authoring reference. It is intentionally not requested as final reader copy.",
      label: "Source only",
      reason: "source-material",
      state: "not-serving"
    };
  }

  if (isParkedForFutureRuntime(contentKey)) {
    return {
      detail: row.status === "LIVE"
        ? "This row is published, but no live reader call site requests this key family. Runtime integration was never completed."
        : "This key family was imported for future app use, but no live reader call site requests it yet.",
      label: row.status === "LIVE" ? "Needs connection" : "Not connected",
      reason: "unfinished",
      state: "not-connected"
    };
  }

  if (destination) {
    return {
      detail: `This row declares ${destination} as its reader destination.`,
      label: destination,
      reason: "connected",
      state: "connected"
    };
  }

  if (isKnownRenderedKey(contentKey)) {
    return {
      detail: "A live resolver requests this content-key family and renders it on a reader surface when its publishing gates pass.",
      label: "Used by app",
      reason: "connected",
      state: "connected"
    };
  }

  if (contentKey.startsWith("article/") && row.mode === "article") {
    return {
      detail: "Publishing an article does not create a reader destination. Connect this key to an article page before expecting it in the app.",
      label: "Needs destination",
      reason: "unfinished",
      state: "not-connected"
    };
  }

  return {
    detail: "No verified reader call-site result is recorded for this key. This is not a deletion recommendation.",
    label: "Connection unknown",
    reason: "unknown",
    state: "unknown"
  };
}

export function isPublishedButUnwired(row: ContentWiringRow) {
  const wiring = contentWiringStatus(row);
  return row.status === "LIVE"
    && row.lane === "serving"
    && !row.review_state
    && wiring.reason === "unfinished"
    && wiring.state === "not-connected";
}
