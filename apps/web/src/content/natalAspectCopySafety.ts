import { isReaderFacingCopy } from "./readerSafety";

export const natalAspectBannedFallbackPatterns = [
  /\blinks\b/i,
  /\bwhat needs attention\b/i,
  /\brecurring friction\b/i,
  /\basks for\b/i,
  /\bname both sides\b/i,
  /\bconcrete response\b/i,
  /\bfind balance\b/i,
  /\binvites you\b/i,
  /\bsupportive flow\b/i,
  /\bclear response\b/i,
  /\b(?:to have|giving [A-Z][A-Za-z ]+) a clear place in the chart\b/i,
  /\btakes over under pressure\b/i,
  /\bon different schedules\b/i,
  /\bto take care of one\b/i,
  /\bhas been neglected\b/i,
  /\bthese needs do not respond to the same solution\b/i,
  /\breason to become visible\b/i,
  /\bPart of you wants one thing\b/i,
  /\bAnother part needs something else entirely\b/i,
  /\bthe person they are speak with one voice\b/i,
  /\bThis makes they\b/i,
  /\bother part of the contact pushes back\b/i,
  /\bThey disagree about how you should respond\b/i,
  /\bworking with [A-Z][a-z]+ deliberately\b/i,
  /\bRecognize this as your era\b/i,
  /\bProfound imagination and depth move quietly beneath\b/i,
  /\bgive North Node a clear place in the chart\b/i,
  /\bgiving North Node a clear place in the chart\b/i,
  /\bthe other part of the contact\b/i,
  /\bone part of the contact\b/i,
  /\blean on one response\b/i,
  /\bThe problem is not that either side is wrong\b/i,
  /\bclose enough to read\b/i,
  /\bclearest available frame\b/i,
  /\bthey's\b/i,
  /\bfor they\b/i,
  /\b(?:to|with|without|around|from|of|in|on|against|at|near|inside|outside|through|toward|towards|beside|behind|within)\s+they\b/i,
  /\b(?:before|after)\s+them\s+(?:notice|act|move|react|speak|fire|choose|decide|answer|respond|understand|process|realize|see|know)\b/i,
  /\b(?:push|pushes|pushed|pushing|reward|rewards|rewarded|rewarding|win|wins|won|winning|drain|drains|drained|draining|help|helps|helped|helping|give|gives|gave|giving|support|supports|supported|supporting|shape|shapes|shaped|shaping|affect|affects|affected|affecting|remind|reminds|reminded|reminding|inspire|inspires|inspired|inspiring|make|makes|made|making|teach|teaches|taught|teaching)\s+they\b/i,
  /\b(?:they|They)\s+(?:is|was|has|does)\b/
];

export function unsafeNatalAspectCopyReason(value: string) {
  const matched = natalAspectBannedFallbackPatterns.find((pattern) => pattern.test(value));

  return matched ? String(matched) : "";
}

export function isSafeNatalAspectFallbackCopy(value: string) {
  return Boolean(value.trim()) && !unsafeNatalAspectCopyReason(value) && isReaderFacingCopy(value);
}
