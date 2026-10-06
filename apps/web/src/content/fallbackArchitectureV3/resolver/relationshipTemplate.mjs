/** Complete directional passages are indivisible. This module never writes prose. */
export function relationshipTemplatePair(row) {
  const read = (publicField, storedField) => {
    const publicValue = row?.[publicField];
    const storedValue = row?.[storedField];
    if (publicValue !== undefined && storedValue !== undefined && publicValue !== storedValue) {
      throw new Error(`Conflicting relationship fields: ${publicField}/${storedField}`);
    }
    return publicValue ?? storedValue;
  };
  return { you: read("you", "body_you"), friend: read("friend", "body_they") };
}

export function missingRelationshipPerspectives(row) {
  const pair = relationshipTemplatePair(row);
  return ["you", "friend"].filter(audience => typeof pair[audience] !== "string" || !pair[audience].trim());
}

export function interpolateRelationshipTemplate(template, variables) {
  if (typeof template !== "string") throw new Error("Missing relationship template.");
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/gu, (_token, name) => {
    if (!Object.hasOwn(variables, name) || typeof variables[name] !== "string") {
      throw new Error(`Missing relationship variable: ${name}`);
    }
    // A function replacement preserves literal $, punctuation, whitespace and names.
    return variables[name];
  });
}

export function resolveRelationshipTemplate(row, audience, variables) {
  if (audience !== "you" && audience !== "friend") throw new Error("Unknown relationship perspective.");
  const missing = missingRelationshipPerspectives(row);
  if (missing.length) throw new Error(`Incomplete relationship pair: ${missing.join(", ")}`);
  return interpolateRelationshipTemplate(relationshipTemplatePair(row)[audience], variables);
}

export function resolveBondEffect(hooks, { transiting, aspect, family, variant, endpointOwner, otherName }, SourceGapError) {
  const exactKey = `fallback-hook/bond-effect-${aspect}/${transiting}`;
  const variantKey = variant ? `fallback-hook/bond-effect-${family}/${transiting}/variant-${variant}` : null;
  const familyKey = `fallback-hook/bond-effect-${family}/${transiting}`;
  // Select a record once. An existing exact record is never replaced for variety,
  // or because one of its fields is empty. Incomplete records fail closed.
  const contentKey = [exactKey, variantKey, familyKey].find(key => key && hooks.get(key));
  if (!contentKey) throw new SourceGapError(`SOURCE_GAP: bond transit ${transiting}/${aspect}`);
  try {
    const effect = resolveRelationshipTemplate(hooks.get(contentKey), endpointOwner === "reader" ? "you" : "friend", { holder1: otherName });
    return { contentKey, effect };
  } catch (error) {
    throw new SourceGapError(`SOURCE_GAP: ${contentKey}: ${error.message}`);
  }
}
