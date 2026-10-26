/** Fill only the declared name variable; authored pronouns and prose stay intact. */
export function natalPlacementOwnerCopy(body, voice) {
  return voice === "you" ? body : body.split("{{ownerName}}").join(voice);
}
