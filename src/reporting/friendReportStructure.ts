/** A deliberate section boundary, not arbitrary Markdown interpretation. */
export function friendRelationshipHeading(friendName: string) {
  return `## Between you and ${friendName.replace(/[\r\n]+/gu, " ").trim()}`;
}

export function isFriendRelationshipHeading(text: string, friendName: string) {
  return text.trim() === friendRelationshipHeading(friendName);
}
