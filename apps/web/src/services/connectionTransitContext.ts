import type { SynastryContact, TransitItem } from "../App";
import { normalizeSkyBodyName, transitAspectDefinitions } from "../astrologyConfig";
import type { BondEndpointOwner } from "./bondTransitGrouping";
import { precisePersonalOrb } from "./personalDailyTransits";
import { possessiveName } from "./personReferences";

export type ConnectionFactRow = { key: string; title: string; aspect: string; orb: string };
export type ConnectionFactGroup = { key: string; heading: string; rows: ConnectionFactRow[] };
export type ConnectionTransitFacts = { summary: string; groups: ConnectionFactGroup[]; caution: string };

function pointKey(point: string) {
  return normalizeSkyBodyName(point).trim().toLowerCase();
}

/** Compare independently calculated transits, never infer a second transit
 * from a natal aspect. Counterpart transits are the complete current inventory,
 * before card limits or interpretation-publication filters. */
export function connectionTransitContext({
  activation,
  endpointOwner,
  contacts,
  counterpartTransits,
  friendName,
  windowLabel,
  titleOf,
  orbOf,
  aspectWord
}: {
  activation: TransitItem;
  endpointOwner: BondEndpointOwner;
  contacts: SynastryContact[];
  counterpartTransits: TransitItem[];
  friendName: string;
  windowLabel: string;
  titleOf: (transit: TransitItem, owner: string) => string;
  orbOf: (transit: TransitItem) => number;
  aspectWord: (aspect: string) => string;
}) {
  const friendPossessive = possessiveName(friendName);
  const endpoint = endpointOwner === "reader"
    ? `your natal ${activation.natalPoint}`
    : `${friendPossessive} natal ${activation.natalPoint}`;
  const counterpartOwner = endpointOwner === "reader" ? friendName : "you";
  const mainOwner = endpointOwner === "reader" ? "you" : friendName;
  const connections = contacts.map(contact => {
    const counterpart = endpointOwner === "reader" ? contact.friendPoint.name : contact.yourPoint.name;
    const direct = counterpartTransits.find(transit => (
      pointKey(transit.transitPlanet) === pointKey(activation.transitPlanet)
      && pointKey(transit.natalPoint) === pointKey(counterpart)
      && transitAspectDefinitions.some(definition => definition.type === transit.aspect)
      && /^\d+(?:\.\d+)?°(?:\s+\d+(?:\.\d+)?['′])?$/u.test(transit.orb.trim())
      && Number.isFinite(orbOf(transit))
    ));
    return { contact, counterpart, direct };
  });
  const directTransits = [...new Map(connections.flatMap(({ direct }) => (
    direct ? [[`${pointKey(direct.natalPoint)}:${direct.aspect}`, direct] as const] : []
  ))).values()];
  const directConnections = connections.filter(connection => connection.direct);
  const throughOnly = connections.filter(connection => !connection.direct);
  if (!connections.length) return { directTransits, cardBody: "", facts: null };

  const summary = endpointOwner === "reader"
    ? `This transit may bring your existing ${activation.natalPoint} connections with ${friendName} into focus.`
    : `This transit may bring ${friendPossessive} existing ${activation.natalPoint} connections with you into focus.`;
  const primaryTitle = titleOf(activation, mainOwner);
  const directTitles = directTransits.map(transit => titleOf(transit, counterpartOwner));
  const transitFact = (transit: TransitItem, owner: string): ConnectionFactRow => ({
    key: `${owner}:${transit.natalPoint}:${transit.aspect}`,
    title: titleOf(transit, owner), aspect: transit.aspect, orb: precisePersonalOrb(orbOf(transit))
  });
  const natalFact = ({ contact }: typeof connections[number]): ConnectionFactRow => ({
    key: contact.id,
    title: `Your natal ${contact.yourPoint.name} ${aspectWord(contact.aspect)} ${friendPossessive} natal ${contact.friendPoint.name}`,
    aspect: contact.aspect, orb: precisePersonalOrb(contact.orb)
  });
  const throughLabel = `${directTransits.length ? "Other connections" : "Connections"} through ${endpoint}`;
  const counterpartPoints = throughOnly.map(({ counterpart }) => (
    counterpartOwner === "you" ? `your natal ${counterpart}` : `${friendPossessive} natal ${counterpart}`
  ));
  const pointCount = new Set(directTransits.map(transit => pointKey(transit.natalPoint))).size;
  const countLabel = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"][pointCount] ?? String(pointCount);
  const counterpartPointsLabel = counterpartOwner === "you" ? "your natal points" : `${friendPossessive} natal points`;
  const mainPoint = endpointOwner === "reader" ? `your ${activation.natalPoint}` : `${friendPossessive} ${activation.natalPoint}`;
  const groups: ConnectionFactGroup[] = [
    { key: "primary", heading: `${activation.transitPlanet} is touching ${mainPoint}`,
      rows: [transitFact(activation, mainOwner)] },
    ...(directTransits.length ? [
      { key: "direct", heading: `${activation.transitPlanet} is also touching ${countLabel} of ${counterpartPointsLabel}`,
        rows: directTransits.map(transit => transitFact(transit, counterpartOwner)) },
      { key: "shared", heading: `${mainPoint[0].toUpperCase()}${mainPoint.slice(1)} already connects to ${pointCount === 1 ? "that same natal point" : `those same ${countLabel} natal points`}`,
        rows: directConnections.map(natalFact) }
    ] : []),
    ...(throughOnly.length ? [{ key: "through", heading: `${throughLabel}:`, rows: throughOnly.map(natalFact) }] : [])
  ];

  return {
    directTransits,
    cardBody: [
      summary,
      windowLabel,
      directTransits.length ? `Direct transits to both charts: ${[primaryTitle, ...directTitles].join("; ")}.` : "",
      throughOnly.length ? `${throughLabel}: ${counterpartPoints.join("; ")}.` : ""
    ].filter(Boolean).join("\n\n"),
    facts: { summary, groups,
      caution: throughOnly.length ? `These natal connections do not by themselves establish a direct ${activation.transitPlanet} transit to the other chart.` : ""
    } satisfies ConnectionTransitFacts
  };
}
