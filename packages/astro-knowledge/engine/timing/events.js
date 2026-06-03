"use strict";

function eventConfidence(indicatorCount) {
  if (indicatorCount >= 3) return "high";
  if (indicatorCount === 2) return "medium";
  if (indicatorCount === 1) return "low";
  return "none";
}

function classifyEventSignals(signals) {
  if (!Array.isArray(signals)) throw new TypeError("signals must be an array");

  const buckets = new Map();
  for (const signal of signals) {
    if (!signal || !signal.category) continue;
    const existing = buckets.get(signal.category) || [];
    existing.push(signal);
    buckets.set(signal.category, existing);
  }

  return [...buckets.entries()]
    .map(([category, categorySignals]) => ({
      category,
      indicatorCount: categorySignals.length,
      confidence: eventConfidence(categorySignals.length),
      signals: categorySignals
    }))
    .sort((a, b) => b.indicatorCount - a.indicatorCount);
}

module.exports = {
  classifyEventSignals,
  eventConfidence
};
