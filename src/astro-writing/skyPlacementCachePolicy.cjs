"use strict";

function isReusableLiveTopper(existing, clean) {
  return Boolean(
    existing
    && existing.status === "LIVE"
    && existing.judge_gate === "human-review"
    && existing.judge_score === 3
    && clean
  );
}

function isLegacyLiveBase(existing) {
  return Boolean(
    existing
    && existing.status === "LIVE"
    && existing.judge_gate !== "human-review"
  );
}

function requiresBaseRegeneration(existing, staleBefore) {
  if (!existing) return true;
  if (existing.status === "ERROR") return true;
  if (isLegacyLiveBase(existing)) return true;
  const updatedAt = Date.parse(existing.updated_at);
  return !Number.isFinite(updatedAt) || updatedAt < staleBefore;
}

module.exports = { isLegacyLiveBase, isReusableLiveTopper, requiresBaseRegeneration };
