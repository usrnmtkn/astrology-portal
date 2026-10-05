export const calendarRxKey = "sky.aspect.moon.trine.saturn";
export const calendarDefaultBody = "Synthetic default opening.\n\nSynthetic default final sentence.";
export const calendarRxBody = "Synthetic retrograde opening.\n\nSynthetic retrograde final sentence.";
export function calendarRxFixture() {
  const record = { contentKey: calendarRxKey, Headline: "Moon Trine Saturn", Summary: "", Body: calendarDefaultBody,
    content_role: "full_copy", review_status: "approved", render_policy: "content-studio-exact-sky-aspect-v1",
    studio_content_type: "aspect", studio_editable_fields: [{ path: "Summary", label: "Summary" }, { path: "Body", label: "Default version" }] };
  return { id: "calendar-rx-fixture", content_key: calendarRxKey, surface: "sky", mode: "feed", status: "LIVE", lane: "serving", review_state: null,
    event_type: "sky-aspect-owner-approved-exact", headline: record.Headline, summary: "", body: calendarDefaultBody,
    sections: { packageRecord: record, packageOriginalRecord: structuredClone(record), body_you: calendarDefaultBody, body_they: calendarDefaultBody },
    facts: { fallbackArchitectureV3: true, content_role: "full_copy", review_status: "approved" },
    source_snapshot: { sourcePackage: "tldrastro-fallback-architecture-v3", contentStudioExactAspect: true,
      exactSkyAspectIdentity: { a: "moon", aspect: "trine", b: "saturn" }, content_role: "full_copy", review_status: "approved" },
    block_type: "sky_aspect", provider: "tldrastro-fallback-architecture-v3", updated_at: "2026-10-01T12:00:00.000Z" };
}
