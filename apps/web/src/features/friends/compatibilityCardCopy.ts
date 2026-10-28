import type { CompatibilityPlanetCard } from "./CompatibilityTab";

function compatibilityFriendCopy(copy: string, friendName: string) {
  return copy.replace(/\{friend\}('s)?/g, (_match, possessive: string | undefined) => (
    possessive ? `${friendName}'s` : friendName
  ))
    .replace(/\bthey is\b/g, "they are")
    .replace(/\bthey was\b/g, "they were")
    .replace(/\bthey needs\b/g, "they need")
    .replace(/\bthey wants\b/g, "they want")
    .replace(/\bthey feels\b/g, "they feel")
    .replace(/\bthey handles\b/g, "they handle")
    .replace(/\bthey keeps\b/g, "they keep")
    .replace(/\bthey pulls\b/g, "they pull")
    .replace(/\bthey retreats\b/g, "they retreat")
    .replace(/\bthey bolts\b/g, "they bolt")
    .replace(/\bthey goes\b/g, "they go")
    .replace(/\bthey holds\b/g, "they hold");
}

export function compatibilityCardParagraphs(card: CompatibilityPlanetCard) {
  const bodyCopy = card.goDeeper.body ? compatibilityFriendCopy(card.goDeeper.body, card.friendName) : "";
  const bodyParagraphs = bodyCopy.split(/\n\n+/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const functionCopy = compatibilityFriendCopy(card.goDeeper.function, card.friendName);
  const yourLine = compatibilityFriendCopy(card.goDeeper.yourLine, card.friendName);
  const theirLine = compatibilityFriendCopy(card.goDeeper.theirLine, card.friendName);
  const sameSignLine = compatibilityFriendCopy(card.goDeeper.sameSignLine, card.friendName);
  const verdict = compatibilityFriendCopy(card.goDeeper.verdict, card.friendName);
  const fallbackParagraphs = [
    functionCopy,
    yourLine,
    card.goDeeper.sameSign ? sameSignLine : theirLine,
    verdict
  ].filter(Boolean);
  return bodyParagraphs.length > 0 ? bodyParagraphs : fallbackParagraphs;
}

