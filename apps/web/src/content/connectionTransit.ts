/** Connection detail sources are independent of bond openings and standing synastry. */
export const CONNECTION_ACTIVATION_PREFIX = "authored/connection-activation/";
export const CONNECTION_BRIDGE_PREFIX = "fallback-template/connection-transit.bridge/";
export const connectionAspects = ["conjunction", "sextile", "square", "trine", "opposition"] as const;
export const connectionPoints = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron", "lilith", "north-node", "south-node", "ascendant", "descendant", "midheaven", "imum-coeli"] as const;
export const connectionBridgeSlots = ["transitPlanet", "transitAspectWord", "endpointPoint", "yourPoint", "synastryAspectWord", "holder1", "theirPoint"] as const;
export const connectionBridgeTemplates = [
  { contentKey: `${CONNECTION_BRIDGE_PREFIX}reader-endpoint`, label: "Transit to your chart", body: "{{transitPlanet}} is {{transitAspectWord}} your {{endpointPoint}}. Your {{yourPoint}} is also {{synastryAspectWord}} {{holder1}}'s {{theirPoint}}, connecting this transit to the pattern below." },
  { contentKey: `${CONNECTION_BRIDGE_PREFIX}friend-endpoint`, label: "Transit to the friend's chart", body: "{{transitPlanet}} is {{transitAspectWord}} {{holder1}}'s {{endpointPoint}}. Your {{yourPoint}} is also {{synastryAspectWord}} {{holder1}}'s {{theirPoint}}, connecting this transit to the pattern below." }
] as const;
export function connectionActivationKey(yourPoint: string, aspect: string, theirPoint: string) {
  if (!connectionPoints.some(p => p === yourPoint) || !connectionPoints.some(p => p === theirPoint) || !connectionAspects.some(a => a === aspect)) return null;
  return `${CONNECTION_ACTIVATION_PREFIX}${yourPoint}/${aspect}/${theirPoint}`;
}
export function isConnectionSourceKey(key: string) {
  if (connectionBridgeTemplates.some(t => t.contentKey === key)) return true;
  if (!key.startsWith(CONNECTION_ACTIVATION_PREFIX)) return false;
  const [yourPoint, aspect, theirPoint, extra] = key.slice(CONNECTION_ACTIVATION_PREFIX.length).split("/");
  return !extra && connectionActivationKey(yourPoint, aspect, theirPoint) === key;
}
export function connectionSourceSlots(key: string): readonly string[] {
  return key.startsWith(CONNECTION_ACTIVATION_PREFIX) ? ["holder1"] : connectionBridgeSlots;
}
export function connectionSourceErrors(key: string, value: string) {
  if (!isConnectionSourceKey(key)) return ["Choose a supported connection source key."];
  const allowed = connectionSourceSlots(key);
  const unknown = [...value.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/gu)].map(m => m[1]).filter(name => !allowed.includes(name));
  const errors = unknown.map(name => `Unknown connection variable: ${name}.`);
  if (/[{}]/u.test(value.replace(/\{\{\s*\w+\s*\}\}/gu, ""))) errors.push("Use complete double-brace variables.");
  if (!value.trim()) errors.push("Write the complete passage before publication.");
  return errors;
}
export function fillConnectionSource(key: string, value: string, variables: Record<string, string>) {
  if (connectionSourceErrors(key, value).length) return null;
  let missing = false;
  const rendered = value.replace(/\{\{\s*(\w+)\s*\}\}/gu, (_, name: string) => {
    if (!Object.hasOwn(variables, name) || !variables[name]) { missing = true; return ""; }
    return variables[name];
  });
  return missing ? null : rendered;
}
export const connectionAspectWord = (aspect: string) => ({ conjunction: "conjunct", opposition: "opposite" }[aspect] ?? aspect);
export const connectionPointTitle = (point: string) => point.split("-").map(word => word[0]?.toUpperCase() + word.slice(1)).join(" ");
