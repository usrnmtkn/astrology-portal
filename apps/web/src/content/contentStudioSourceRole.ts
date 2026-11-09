/** Reference sources are editorial inputs, never exact reader copy. */
export function isContentStudioReferenceSource(contentKey: string, snapshot: Record<string, unknown>) {
  return ["studio-variable/", "studio-writing-profile/", "source/", "fallback-source/", "ms/composite/", "cc/fallback", "sky-article-workspace/"].some(prefix => contentKey.startsWith(prefix))
    || snapshot.contentType === 'sky-article-edition-workspace'
    || ["fallback_source", "source_material"].includes(snapshot.content_role as string);
}
