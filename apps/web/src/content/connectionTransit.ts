import {connectionPoints,connectionAspects} from "./connectionTransitIdentity.js";
export {connectionPoints,connectionAspects};
/** Connection detail sources are independent of bond openings and standing synastry. */
export const CONNECTION_ACTIVATION_PREFIX = "authored/connection-activation/";
export const CONNECTION_BRIDGE_PREFIX = "fallback-template/connection-transit.bridge/";
export const connectionBridgeSlots = ["transitPlanet", "transitAspectWord", "endpointPoint", "yourPoint", "synastryAspectWord", "holder1", "theirPoint"] as const;
export const connectionBridgeTemplates = [
  { contentKey: `${CONNECTION_BRIDGE_PREFIX}reader-endpoint`, label: "Transit to your chart", body: "{{transitPlanet}} is {{transitAspectWord}} your {{endpointPoint}}. Your {{yourPoint}} is also {{synastryAspectWord}} {{holder1}}'s {{theirPoint}}, connecting this transit to the pattern below." },
  { contentKey: `${CONNECTION_BRIDGE_PREFIX}friend-endpoint`, label: "Transit to the friend's chart", body: "{{transitPlanet}} is {{transitAspectWord}} {{holder1}}'s {{endpointPoint}}. Your {{yourPoint}} is also {{synastryAspectWord}} {{holder1}}'s {{theirPoint}}, connecting this transit to the pattern below." }
] as const;
export function connectionActivationKey(yourPoint: string, aspect: string, theirPoint: string) {
  if (!(connectionPoints as readonly string[]).includes(yourPoint) || !(connectionPoints as readonly string[]).includes(theirPoint) || !(connectionAspects as readonly string[]).includes(aspect)) return null;
  return `${CONNECTION_ACTIVATION_PREFIX}${yourPoint}/${aspect}/${theirPoint}`;
}
export function isConnectionSourceKey(key: string) {
  const parts = key.split("/");
  return connectionBridgeTemplates.some(t => t.contentKey === key)
    || parts.length === 5 && connectionActivationKey(parts[2], parts[3], parts[4]) === key;
}
export function connectionSourceSlots(key: string): readonly string[] {
  return key.startsWith(CONNECTION_ACTIVATION_PREFIX) ? ["holder1"] : connectionBridgeSlots;
}
export function connectionSourceErrors(key: string, value: string) {
  if (!isConnectionSourceKey(key)) return ["Choose a supported connection source key."];
  const allowed = connectionSourceSlots(key);
  const errors: string[] = [];
  const literal = value.replace(/\{\{\s*([^{}]+?)\s*\}\}/gu, (_, name: string) => {
    if (!allowed.includes(name)) errors.push(`Unknown connection variable: ${name}.`);
    return "";
  });
  if (/[{}]/u.test(literal)) errors.push("Use complete double-brace variables.");
  if (!value.trim()) errors.push("Write the complete passage before publication.");
  return errors;
}
export function fillConnectionSource(key: string, value: string, variables: Record<string, string>) {
  if (connectionSourceErrors(key, value).length) return null;
  return fillConnectionVariables(value, variables);
}
export function fillConnectionVariables(value: string, variables: Record<string, string>) {
  if (/[{}]/u.test(value.replace(/\{\{\s*\w+\s*\}\}/gu, ""))) return null;
  let missing = false;
  const rendered = value.replace(/\{\{\s*(\w+)\s*\}\}/gu, (_, name: string) => {
    if (!Object.hasOwn(variables, name) || !variables[name]) { missing = true; return ""; }
    return variables[name];
  });
  return missing ? null : rendered;
}
export const connectionAspectWord = (aspect: string) => ({ conjunction: "conjunct", opposition: "opposite" }[aspect] ?? aspect);
export const connectionPointTitle = (point: string) => point.split("-").map(word => word[0]?.toUpperCase() + word.slice(1)).join(" ");
