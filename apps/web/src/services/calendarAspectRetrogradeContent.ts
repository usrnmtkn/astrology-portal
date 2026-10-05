import { calendarAspectRetrogradeBody, type AspectMotionFacts } from "../content/calendarAspectRetrograde.js";
import { isReaderFacingCopy } from "../content/readerSafety.js";
import type { LiveGeneratedContent } from "./generatedContent.js";

export function withCalendarAspectRetrograde(content: LiveGeneratedContent, facts: AspectMotionFacts): LiveGeneratedContent {
  if (content.status !== "LIVE") return content;
  const body = calendarAspectRetrogradeBody(content.contentKey, content.sections, facts);
  return body && isReaderFacingCopy(body) ? { ...content, body, summary: null } : content;
}
