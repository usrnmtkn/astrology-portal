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
