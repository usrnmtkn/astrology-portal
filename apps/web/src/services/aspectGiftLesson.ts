export type AspectGiftLessonKey = "gifts" | "lessons";
export type AspectGiftLessonLabel = "Gifts" | "Lessons";

export type AspectGiftLessonGroup<T> = {
  key: AspectGiftLessonKey;
  label: AspectGiftLessonLabel;
  aspects: T[];
};

const aspectGiftLessonDefinitions: Array<{
  key: AspectGiftLessonKey;
  label: AspectGiftLessonLabel;
}> = [
  { key: "gifts", label: "Gifts" },
  { key: "lessons", label: "Lessons" }
];

export function aspectGiftOrLesson(aspectType?: string | null): AspectGiftLessonKey {
  const normalized = (aspectType ?? "").trim().toLowerCase();

  return normalized === "trine" || normalized === "sextile" ? "gifts" : "lessons";
}

export function groupAspectsByGiftLesson<T>(
  aspects: readonly T[],
  aspectTypeFor: (aspect: T) => string,
  orbFor: (aspect: T) => number
): AspectGiftLessonGroup<T>[] {
  const sortedAspects = [...aspects].sort((first, second) => {
    const firstOrb = orbFor(first);
    const secondOrb = orbFor(second);
    const safeFirstOrb = Number.isFinite(firstOrb) ? firstOrb : Number.POSITIVE_INFINITY;
    const safeSecondOrb = Number.isFinite(secondOrb) ? secondOrb : Number.POSITIVE_INFINITY;

    return safeFirstOrb - safeSecondOrb;
  });

  return aspectGiftLessonDefinitions
    .map(({ key, label }) => ({
      key,
      label,
      aspects: sortedAspects.filter((aspect) => aspectGiftOrLesson(aspectTypeFor(aspect)) === key)
    }))
    .filter((group) => group.aspects.length > 0);
}
