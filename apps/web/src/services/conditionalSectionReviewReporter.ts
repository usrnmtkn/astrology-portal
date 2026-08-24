import { getSupabaseClient } from "./auth";
import {
  recordLiveOmittedSections,
  type ConditionalSectionReviewFlag,
  type LiveOmittedSectionContext
} from "./conditionalSectionReviewQueue";

export async function reportLiveOmittedSections(
  flags: readonly ConditionalSectionReviewFlag[] | undefined,
  context: LiveOmittedSectionContext
) {
  recordLiveOmittedSections(flags, context);
  if (!flags?.length) return;
  try {
    const client = await getSupabaseClient();
    if (!client) return;
    const { data, error } = await client.auth.getSession();
    const token = data.session?.access_token;
    if (error || !token) return;
    const response = await fetch("/api/content-review-events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        flags,
        context: {
          surface: context.surface,
          eventDate: context.eventDate,
          eventKind: context.eventKind,
          sign: context.sign,
          risingSign: context.risingSign
        }
      })
    });
    if (!response.ok) console.warn("Shared content review event was not recorded; the local queue remains available.");
  } catch {
    console.warn("Shared content review event was not recorded; the local queue remains available.");
  }
}
