import { isContentRetired } from "../../content/contentPublicationState.js";
import { isReaderFacingCopy } from "../../content/readerSafety.js";
import { calendarAspectPublicationKeys } from "../../services/skyAspectContent.js";
import { withCalendarAspectRetrograde } from "../../services/calendarAspectRetrogradeContent.js";
import type { LiveGeneratedContent } from "../../services/generatedContent.js";
function recordField(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function resolveCalendarAspectPublication(options: { generatedContent: Map<string, LiveGeneratedContent>; first: string; second: string; aspect: string; firstSign: string; secondSign: string; firstMotion?: string | null; secondMotion?: string | null }) {
  for (const key of calendarAspectPublicationKeys(options)) {
    if (isContentRetired(key)) continue;
    const content = options.generatedContent.get(key);
    const source = content?.sourceSnapshot;
    const receipt = recordField(source?.calendarAspectPublication);
    if (!content || content.eventType !== "calendar-aspect-owner-approved-revision"
      || source?.review_status !== "approved" || source?.owner_approved !== true || source?.serving_enabled !== true
      || receipt?.schema !== "content-studio-calendar-publication/v1" || receipt.contentKey !== key
      || !content.body.trim() || !isReaderFacingCopy(content.body)) continue;
    const selected = withCalendarAspectRetrograde(content, options);
    return { content: selected, body: selected.body };
  }
  return null;
}
