/** Prefix match that does not depend on PostgREST like wildcards. */

export function postgrestQuotedValue(value: string) {
  return `"${value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"")}"`;
}

export function postgrestPrefixUpperBound(prefix: string) {
  for (let index = prefix.length - 1; index >= 0; index -= 1) {
    const code = prefix.charCodeAt(index);
    if (code < 0xd7ff) {
      return `${prefix.slice(0, index)}${String.fromCharCode(code + 1)}`;
    }
  }
  return null;
}

export function postgrestContentKeyPrefixAnd(prefix: string) {
  const upperBound = postgrestPrefixUpperBound(prefix);
  if (!upperBound) {
    throw new Error("contentKeyPrefix is not a valid content-key prefix.");
  }
  return `(content_key.gte.${postgrestQuotedValue(prefix)},content_key.lt.${postgrestQuotedValue(upperBound)})`;
}
