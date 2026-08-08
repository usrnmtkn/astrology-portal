export type BondEndpointOwner = "reader" | "friend";

export type BondTransitActivationCandidate<TActivation> = {
  activation: TActivation;
  activationId: string;
  aspect: string;
  contactId: string;
  counterpartPlanet: string;
  endpointOwner: BondEndpointOwner;
  endpointPlanet: string;
  transiting: string;
};

export type BondTransitActivationGroup<TActivation> = {
  activatedPlanets: string[];
  activation: TActivation;
  activationId: string;
  aspect: string;
  contactIds: string[];
  endpointOwner: BondEndpointOwner;
  endpointPlanet: string;
  key: string;
  transiting: string;
};

function normalizedKeyPart(value: string) {
  return value.trim().toLowerCase().replace(/\s+/gu, "-");
}

// Lower tier = more significant. Slow bodies outrank fast ones so a transiting-Moon
// card can never crowd a Saturn-through-Pluto card out of the 3-card cap.
const BOND_TRANSIT_SIGNIFICANCE_TIERS: Record<string, number> = {
  pluto: 0,
  neptune: 0,
  uranus: 0,
  chiron: 0,
  saturn: 0,
  jupiter: 1,
  "north-node": 1,
  "south-node": 1,
  mars: 2,
  lilith: 2,
  sun: 3,
  venus: 3,
  mercury: 3,
  moon: 4
};

export function bondTransitSignificanceTier(transiting: string) {
  return BOND_TRANSIT_SIGNIFICANCE_TIERS[normalizedKeyPart(transiting)] ?? 3;
}

// One transiting planet reaching both endpoints of the same synastry contact is one
// sky event, not two. Keep the tighter-orb endpoint (the reader's on a tie) so the
// pair never reads a single transit as two separate cards.
export function dedupeBondTransitEndpointCandidates<TActivation>(
  candidates: BondTransitActivationCandidate<TActivation>[],
  orbOf: (activation: TActivation) => number
) {
  const bestByEvent = new Map<string, BondTransitActivationCandidate<TActivation>>();

  for (const candidate of candidates) {
    const eventKey = `${normalizedKeyPart(candidate.transiting)}:${candidate.contactId}`;
    const current = bestByEvent.get(eventKey);

    if (!current) {
      bestByEvent.set(eventKey, candidate);
      continue;
    }

    const currentOrb = orbOf(current.activation);
    const candidateOrb = orbOf(candidate.activation);
    const tighter = candidateOrb < currentOrb;
    const readerTieBreak = candidateOrb === currentOrb
      && current.endpointOwner === "friend"
      && candidate.endpointOwner === "reader";

    if (tighter || readerTieBreak) {
      bestByEvent.set(eventKey, candidate);
    }
  }

  const kept = new Set(bestByEvent.values());

  return candidates.filter((candidate) => kept.has(candidate));
}

// Stable ordering for the card list: slow planets first, then tighter orbs. Applied
// BEFORE the surface's 3-card cap so which cards render is deliberate, not
// contact-list order.
export function rankBondTransitGroups<TActivation>(
  groups: BondTransitActivationGroup<TActivation>[],
  orbOf: (activation: TActivation) => number
) {
  return [...groups].sort((first, second) => {
    const tierDelta = bondTransitSignificanceTier(first.transiting)
      - bondTransitSignificanceTier(second.transiting);

    if (tierDelta !== 0) {
      return tierDelta;
    }

    return orbOf(first.activation) - orbOf(second.activation);
  });
}

export function groupBondTransitActivations<TActivation>(
  candidates: BondTransitActivationCandidate<TActivation>[]
) {
  const groups = new Map<string, BondTransitActivationGroup<TActivation>>();

  for (const candidate of candidates) {
    const transiting = normalizedKeyPart(candidate.transiting);
    const aspect = normalizedKeyPart(candidate.aspect);
    const endpointPlanet = normalizedKeyPart(candidate.endpointPlanet);
    const key = `${transiting}:${aspect}:${endpointPlanet}:${candidate.endpointOwner}`;
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, {
        activatedPlanets: [candidate.counterpartPlanet],
        activation: candidate.activation,
        activationId: candidate.activationId,
        aspect,
        contactIds: [candidate.contactId],
        endpointOwner: candidate.endpointOwner,
        endpointPlanet,
        key,
        transiting
      });
      continue;
    }

    if (!existing.contactIds.includes(candidate.contactId)) {
      existing.contactIds.push(candidate.contactId);
    }

    if (!existing.activatedPlanets.some(
      (planet) => normalizedKeyPart(planet) === normalizedKeyPart(candidate.counterpartPlanet)
    )) {
      existing.activatedPlanets.push(candidate.counterpartPlanet);
    }
  }

  return Array.from(groups.values());
}

export function contactsForBondTransitGroup<
  TActivation,
  TContact extends { id: string }
>(
  group: BondTransitActivationGroup<TActivation>,
  contacts: TContact[]
) {
  const contactsById = new Map(contacts.map((contact) => [contact.id, contact]));

  return group.contactIds.flatMap((contactId) => {
    const contact = contactsById.get(contactId);
    return contact ? [contact] : [];
  });
}
