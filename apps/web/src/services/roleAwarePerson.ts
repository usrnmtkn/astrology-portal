import {
  resolvePersonReference,
  type PersonReference,
  type PersonReferenceInput,
  type PronounChoice,
  type VerbAgreement
} from "./personReferences";

export type PersonRole = "chartSubject" | "viewer" | "otherPerson";
export type PersonSurface = "self" | "friend";
export type ReferencePolicy = "name-first-then-pronoun";

export type RoleTaggedFragment = {
  id: string;
  scope: "shared_fragment";
  roles: PersonRole[];
  template: string;
};

export type RoleAwareRenderContext = {
  surface: PersonSurface;
  chartSubject: PersonReferenceInput;
  viewer: PersonReferenceInput;
  otherPerson?: PersonReferenceInput | null;
  referencePolicy?: ReferencePolicy;
};

export class RoleAwarePersonError extends Error {}
export class AmbiguousPersonReferenceError extends RoleAwarePersonError {}

type RoleState = {
  reference: PersonReference;
  sameAsViewer: boolean;
  referenced: boolean;
  lastAgreement: VerbAgreement | null;
};

const ROLE_TOKEN = /\{\{(chartSubject|viewer|otherPerson)\.(subject|subjectCapitalized|object|objectCapitalized|possessiveAdjective|possessiveAdjectiveCapitalized|possessivePronoun|possessivePronounCapitalized|reflexive|reflexiveCapitalized|name|namePossessive|bePresent|bePast|havePresent|verb:[a-z][a-z-]*)\}\}/gu;
const UNTYPED_PERSON = /(?<![\p{L}-])(?:you|your|yours|yourself|yourselves|they|them|their|theirs|themselves|she|her|hers|herself|he|him|his|himself|we|us|our|ours|ourselves|i|me|my|mine|myself)(?![\p{L}-])/iu;

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function inflectPresentVerb(lemma: string, agreement: VerbAgreement): string {
  if (agreement === "plural") return lemma === "be" ? "are" : lemma;
  if (lemma === "be") return "is";
  if (lemma === "have") return "has";
  if (lemma === "do") return "does";
  if (/[^aeiou]y$/u.test(lemma)) return `${lemma.slice(0, -1)}ies`;
  if (/(?:s|x|z|ch|sh|o)$/u.test(lemma)) return `${lemma}es`;
  return `${lemma}s`;
}

function referenceForRole(role: PersonRole, context: RoleAwareRenderContext): { input: PersonReferenceInput; sameAsViewer: boolean } {
  if (role === "viewer") return { input: { ...context.viewer, isReader: true }, sameAsViewer: true };
  if (role === "chartSubject") {
    return context.surface === "self"
      ? { input: { ...context.viewer, isReader: true }, sameAsViewer: true }
      : { input: { ...context.chartSubject, isReader: false }, sameAsViewer: false };
  }
  if (!context.otherPerson) {
    throw new AmbiguousPersonReferenceError("Role otherPerson is used but no otherPerson was supplied.");
  }
  return { input: { ...context.otherPerson, isReader: false }, sameAsViewer: false };
}

function firstReferenceValue(state: RoleState, form: string): { agreement: VerbAgreement; value: string } {
  if (state.sameAsViewer) {
    return {
      agreement: state.reference.verbAgreement,
      value: state.reference[form as keyof PersonReference] as string
    };
  }

  if (state.referenced) {
    return {
      agreement: state.reference.verbAgreement,
      value: state.reference[form as keyof PersonReference] as string
    };
  }

  if (form === "reflexive" || form === "reflexiveCapitalized" || form === "possessivePronoun" || form === "possessivePronounCapitalized") {
    throw new AmbiguousPersonReferenceError(`A passage cannot introduce a role with ${form}; name the role first.`);
  }

  state.referenced = true;
  const capitalized = form.endsWith("Capitalized");
  const possessive = form.startsWith("possessiveAdjective");
  const value = possessive ? state.reference.namePossessive : state.reference.name;
  return { agreement: "singular", value: capitalized ? capitalize(value) : value };
}

function roleState(role: PersonRole, context: RoleAwareRenderContext): RoleState {
  const resolved = referenceForRole(role, context);
  return {
    reference: resolvePersonReference(resolved.input),
    sameAsViewer: resolved.sameAsViewer,
    referenced: false,
    lastAgreement: null
  };
}

export function createRoleAwareFragmentRenderer(context: RoleAwareRenderContext) {
  if ((context.referencePolicy ?? "name-first-then-pronoun") !== "name-first-then-pronoun") {
    throw new RoleAwarePersonError(`Unsupported person reference policy: ${context.referencePolicy}.`);
  }

  const states = new Map<PersonRole, RoleState>();
  const getState = (role: PersonRole) => {
    const existing = states.get(role);
    if (existing) return existing;
    const created = roleState(role, context);
    states.set(role, created);
    return created;
  };

  return {
    render(fragment: RoleTaggedFragment): string {
      if (fragment.scope !== "shared_fragment") {
        throw new RoleAwarePersonError(`${fragment.id}: role inflection is restricted to shared fragments.`);
      }

      const declaredRoles = new Set(fragment.roles);
      const tokenRoles = new Set<PersonRole>();
      const withoutTypedTokens = fragment.template.replace(ROLE_TOKEN, (_match, role: PersonRole) => {
        tokenRoles.add(role);
        return "";
      });
      if (UNTYPED_PERSON.test(withoutTypedTokens)) {
        throw new AmbiguousPersonReferenceError(`${fragment.id}: untyped personal pronoun; author review required.`);
      }
      if (/\{\{[^}]+\}\}/u.test(withoutTypedTokens)) {
        throw new AmbiguousPersonReferenceError(`${fragment.id}: unknown or untyped person slot; author review required.`);
      }
      for (const role of tokenRoles) {
        if (!declaredRoles.has(role)) {
          throw new AmbiguousPersonReferenceError(`${fragment.id}: role ${role} is used but not declared.`);
        }
      }
      for (const role of declaredRoles) {
        if (!tokenRoles.has(role)) {
          throw new AmbiguousPersonReferenceError(`${fragment.id}: role ${role} is declared but unused.`);
        }
      }

      return fragment.template.replace(ROLE_TOKEN, (_match, role: PersonRole, form: string) => {
        const state = getState(role);
        if (form.startsWith("verb:")) {
          if (!state.lastAgreement) {
            throw new AmbiguousPersonReferenceError(`${fragment.id}: ${role} verb appears before its reference.`);
          }
          return inflectPresentVerb(form.slice("verb:".length), state.lastAgreement);
        }
        if (form === "bePresent" || form === "bePast" || form === "havePresent") {
          if (!state.lastAgreement) {
            throw new AmbiguousPersonReferenceError(`${fragment.id}: ${role} agreement token appears before its reference.`);
          }
          if (form === "bePresent") return state.lastAgreement === "singular" ? "is" : "are";
          if (form === "bePast") return state.lastAgreement === "singular" ? "was" : "were";
          return state.lastAgreement === "singular" ? "has" : "have";
        }
        if (form === "name" || form === "namePossessive") {
          state.referenced = true;
          state.lastAgreement = "singular";
          return form === "name" ? state.reference.name : state.reference.namePossessive;
        }
        const resolved = firstReferenceValue(state, form);
        state.lastAgreement = resolved.agreement;
        return resolved.value;
      });
    }
  };
}

export function renderRoleTaggedFragment(fragment: RoleTaggedFragment, context: RoleAwareRenderContext): string {
  return createRoleAwareFragmentRenderer(context).render(fragment);
}

export type RoleAwareFixture = {
  id: string;
  fragment: RoleTaggedFragment;
};

// These fixtures are the executable minimum for every role-tagged template:
// Self, Friend with a display name, and Friend with the configured pronoun.
export const ROLE_AWARE_PERSON_FIXTURES: RoleAwareFixture[] = [
  {
    id: "chart-subject-verb-agreement",
    fragment: {
      id: "fixture/chart-subject-verb-agreement",
      scope: "shared_fragment",
      roles: ["chartSubject"],
      template: "{{chartSubject.subjectCapitalized}} {{chartSubject.verb:tend}} to need time alone. {{chartSubject.subjectCapitalized}} {{chartSubject.havePresent}} time to think."
    }
  },
  {
    id: "viewer-remains-reader",
    fragment: {
      id: "fixture/viewer-remains-reader",
      scope: "shared_fragment",
      roles: ["viewer", "chartSubject"],
      template: "{{viewer.subjectCapitalized}} may notice when {{chartSubject.possessiveAdjective}} answer changes."
    }
  },
  {
    id: "other-person-role",
    fragment: {
      id: "fixture/other-person-role",
      scope: "shared_fragment",
      roles: ["chartSubject", "otherPerson"],
      template: "{{chartSubject.subjectCapitalized}} {{chartSubject.verb:ask}} first, and {{otherPerson.subject}} {{otherPerson.verb:answer}}."
    }
  }
];

export type { PronounChoice };
