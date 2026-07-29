export function splitSkyPlacementHookQuote(paragraphs: string[]) {
  const [firstParagraph = "", ...remainingParagraphs] = paragraphs;
  const firstSentence = firstParagraph.trim().match(
    /^(.+?[.!?](?:["”’])?)(?:\s+([\s\S]+))?$/u
  );

  if (!firstSentence) {
    return {
      hookQuote: null,
      bodyParagraphs: paragraphs
    };
  }

  const [, hookQuote, hookRemainder = ""] = firstSentence;

  return {
    hookQuote,
    bodyParagraphs: [
      ...(hookRemainder.trim() ? [hookRemainder.trim()] : []),
      ...remainingParagraphs
    ]
  };
}
