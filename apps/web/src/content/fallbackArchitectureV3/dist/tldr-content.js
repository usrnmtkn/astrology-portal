import { createFallbackRenderer as createBaseFallbackRenderer } from "./tldr-content-base.js";

export * from "./tldr-content-base.js";

function natalPlacementDirectExactKey(facts) {
  if (!facts?.house) return null;
  return `fallback-hook/natal-you-placement-complete-final/${facts.planet}/${facts.sign}/${facts.house}`;
}

export function natalPlacementMotionExactKey(facts) {
  const directKey = natalPlacementDirectExactKey(facts);
  if (!directKey) return null;
  return facts?.isRetrograde ? `${directKey}/retrograde` : directKey;
}

export function createFallbackRenderer(templatesFile, rowsFile) {
  const baseRenderer = createBaseFallbackRenderer(templatesFile, rowsFile);

  return {
    ...baseRenderer,
    renderNatalPlacement(facts, opts = {}) {
      if (!facts?.isRetrograde || !facts?.house) {
        return baseRenderer.renderNatalPlacement(facts, opts);
      }

      const directKey = natalPlacementDirectExactKey(facts);
      if (!directKey) return baseRenderer.renderNatalPlacement(facts, opts);
      const retrogradeKey = `${directKey}/retrograde`;
      const retrogradeRow = [...(rowsFile.hookRows ?? [])]
        .reverse()
        .find((row) => row.contentKey === retrogradeKey);
      const hookRows = (rowsFile.hookRows ?? [])
        .filter((row) => row.contentKey !== directKey && row.contentKey !== retrogradeKey);

      if (retrogradeRow) {
        hookRows.push({ ...retrogradeRow, contentKey: directKey });
      }

      const motionRenderer = createBaseFallbackRenderer(templatesFile, { ...rowsFile, hookRows });
      const rendered = motionRenderer.renderNatalPlacement(facts, opts);

      if (
        retrogradeRow
        && rendered?.provenanceTier === "exact-owner-approved"
        && rendered.templateKey === directKey
      ) {
        return {
          ...rendered,
          partKeys: rendered.partKeys?.map((key) => key === directKey ? retrogradeKey : key),
          templateKey: retrogradeKey
        };
      }

      return rendered;
    }
  };
}
