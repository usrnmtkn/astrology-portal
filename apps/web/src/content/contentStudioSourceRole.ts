/** Reference sources are editorial inputs, never exact reader copy. */
export function isContentStudioReferenceSource(contentKey: string, snapshot: Record<string, unknown>) {
  return ["studio-variable/", "source/", "fallback-source/", "ms/composite/", "cc/fallback"].some(prefix => contentKey.startsWith(prefix)) || ["fallback_source", "source_material"].includes(snapshot.content_role as string);
}
