import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { reportOwnerComparisonSet, type ReportOwnerComparisonPassage } from "./report-owner-comparison.js";
import type { ReportDomain, ReportHorizon } from "./report-types.ts";

export type { ReportDomain, ReportHorizon } from "./report-types.ts";

export type ReportUnitContract = {
  horizon: ReportHorizon;
  unitId: string;
  allowedUnitIds: string[];
};

export type ManifestationSetRecord = {
  id: string;
  factorType: "eclipse-on-natal-point" | "slow-transit-to-natal" | "return" | "profection-year" | "sr-overlay";
  match: {
    house?: number;
    natalPoint?: string;
    transitPlanet?: string;
    aspect?: string;
    overlayPoint?: string;
  };
  domain: string[];
  possibleLivedManifestations: string[];
  doNotAssume: string[];
  copyClaim: { text: null; review_status: "needs_review" };
  provenance: string;
  review_status: "needs_review";
};

export type ReportFactor = {
  id: string;
  factorType: ManifestationSetRecord["factorType"];
  house?: number;
  activationHouse?: number;
  natalPoint?: string;
  transitPlanet?: string;
  aspect?: string;
  overlayPoint?: string;
  source: Record<string, unknown>;
};

export type ResolvedManifestationSet = {
  factor: ReportFactor;
  record: ManifestationSetRecord;
};

export type ReportFactorSelection = {
  factorId: string;
  score: number;
  tierId: string;
  matchedRuleIds: string[];
  matchedTerms: string[];
  inspectionNotes: string[];
  doNotAssume: string[];
  bridgeConsequences: string[];
};

export type ReportSourceGap = {
  factorId: string;
  requestedKey: string;
  reason: "SOURCE_GAP";
};

export type ReportGenerationPayload = {
  schemaVersion: "report-generation-v3";
  reportId: string;
  reportDomain: ReportDomain;
  reportHorizon: ReportHorizon;
  unit: ReportUnitContract;
  canonicalOwnerPrompt: {
    sourcePath: string;
    text: string;
  };
  generationStandard: {
    sourcePath: string;
    text: string;
  } | null;
  livedProseStandard: {
    sourcePath: string;
    text: string;
  };
  sharedInvariants: string[];
  domainRelevanceModel: DomainRelevanceTier[];
  frozenFacts: Record<string, unknown>;
  factors: ReportFactor[];
  factorSelection: ReportFactorSelection[];
  manifestationSets: ResolvedManifestationSet[];
  sourceGaps: ReportSourceGap[];
  writingQueue: ReportSourceGap[];
  voiceEvidence: Array<{
    sourcePath: string;
    sourceType: "owner_authored_final";
    surface: "report";
    eligible: true;
    text: string;
  }>;
  ownerComparisonSet: ReportOwnerComparisonPassage[];
  outputGovernance: {
    status: "DRAFT";
    review_status: "needs_review";
    ownerApproved: false;
    promotionAuthorized: false;
    promotionAllowed: false;
  };
};

export type AssembleReportPayloadInput = {
  reportId: string;
  reportDomain: ReportDomain;
  reportHorizon: ReportHorizon;
  unitId: string;
  frozenFacts: Record<string, unknown>;
};

export type ReportDraft = {
  headline?: string;
  tldr?: string;
  summary?: string;
  body?: string;
  action?: string;
  timing?: string;
  sections?: Array<{ heading?: string; body?: string }>;
};

export type ReportValidationIssue = {
  code: string;
  message: string;
  severity?: "error" | "warning";
};

export type ReportValidatorOptions = {
  signatureNouns?: string[];
  signatureNounCap?: number;
};

const GENERATION_STANDARD_PATH = "tldr-astro-phrasebank/TLDR-YEAR-AHEAD-GENERATION-LOGIC-OWNER.md";
const LIVED_PROSE_STANDARD_PATH = "tldr-astro-phrasebank/TLDR-REPORT-LIVED-PROSE-STANDARD-OWNER.md";
export const PERSONAL_HEALTH_PROMPT_PATH = "tldr-astro-phrasebank/TLDR-PERSONAL-HEALTH-DEEPDIVE-GENERATION-PROMPT-OWNER.md";
const MANIFESTATION_SETS_PATH = "packages/astro-knowledge/data/manifestation-sets/year-ahead-v1.json";

type FactorRuleMatch = {
  factorTypes?: ManifestationSetRecord["factorType"][];
  houses?: number[];
  natalPoints?: string[];
  transitPlanets?: string[];
  overlayPoints?: string[];
  sourceTerms?: string[];
  mode?: "any" | "all";
};

export type DomainRelevanceRule = {
  id: string;
  match: FactorRuleMatch;
  inspectionNotes: string[];
  relevanceTerms: string[];
  doNotAssume: string[];
  bridgeConsequences?: string[];
};

export type DomainRelevanceTier = {
  id: string;
  weight: number;
  rules: DomainRelevanceRule[];
};

type DomainValidator =
  | "money_abstraction"
  | "natural_paragraphs"
  | "key_date_format"
  | "love_banned_vocabulary"
  | "status_branching"
  | "sex_invention"
  | "personal_health_ceiling";

type ReportDomainConfiguration = {
  canonicalPromptPath: string;
  canonicalPromptOwnerApproved: boolean;
  canonicalPromptVersion?: string;
  canonicalPromptSha256?: string;
  voiceEvidencePath: string;
  generationStandardPath: string | null;
  tiers: DomainRelevanceTier[];
  excludedProjectionTerms: string[];
  strictBridgeProjection?: boolean;
  validators: DomainValidator[];
};

const REPORT_DOMAIN_CONFIG: Record<ReportDomain, ReportDomainConfiguration> = {
  general: {
    canonicalPromptPath: "tldr-astro-phrasebank/TLDR-REPORT-HORIZONS-GENERATION-PROMPT-OWNER.md",
    canonicalPromptOwnerApproved: true,
    voiceEvidencePath: "artifacts/marie-satori-year-ahead-2026-FINAL.md",
    generationStandardPath: GENERATION_STANDARD_PATH,
    tiers: [],
    excludedProjectionTerms: [],
    validators: []
  },
  work_money: {
    canonicalPromptPath: "tldr-astro-phrasebank/TLDR-WORK-MONEY-DEEPDIVE-GENERATION-PROMPT-OWNER.md",
    canonicalPromptOwnerApproved: true,
    voiceEvidencePath: "artifacts/marie-satori-work-money-2026-owner-v1.md",
    generationStandardPath: null,
    tiers: [
      {
        id: "direct_work_money_business",
        weight: 30,
        rules: [
          {
            id: "professional_work",
            match: { sourceTerms: ["work", "job", "career", "professional", "title", "recognition", "public role", "client", "contract", "collaboration", "credit", "access", "workload", "schedule", "education", "writing", "publishing", "application", "proposal", "teaching"] },
            inspectionNotes: ["professional direction", "terms", "recognition", "workload", "schedule"],
            relevanceTerms: ["work", "job", "career", "professional", "title", "recognition", "public role", "client", "contract", "collaboration", "credit", "access", "workload", "schedule", "education", "writing", "publishing", "application", "proposal", "teaching"],
            doNotAssume: ["the reader has a job", "the reader wants conventional career growth", "professional change is voluntary"]
          },
          {
            id: "money_consequences",
            match: { sourceTerms: ["income", "rate", "pay", "expense", "payment", "financial", "pricing", "revenue", "cash flow", "cash-flow", "unpaid", "scope", "money"] },
            inspectionNotes: ["rate", "hours", "expenses", "payment timing", "scope creep", "client concentration"],
            relevanceTerms: ["income", "rate", "pay", "expense", "payment", "financial", "pricing", "revenue", "cash flow", "cash-flow", "unpaid", "scope", "money"],
            doNotAssume: ["abundance", "scarcity", "worth", "higher pay is automatically a better opportunity"]
          },
          {
            id: "business_structure",
            match: { sourceTerms: ["customer", "ownership", "vendor", "staff", "delegation", "system", "platform", "audience", "launch", "marketing", "intellectual property", "capacity", "business model", "leverage"] },
            inspectionNotes: ["ownership", "distribution", "scope", "payment", "dependence", "capacity"],
            relevanceTerms: ["customer", "ownership", "vendor", "staff", "delegation", "system", "platform", "audience", "launch", "marketing", "intellectual property", "capacity", "business model", "leverage"],
            doNotAssume: ["the reader runs a business", "growth is inherently desirable", "expansion increases capacity"]
          }
        ]
      },
      {
        id: "condition_changers",
        weight: 20,
        rules: [
          {
            id: "home_commute_caregiving",
            match: { houses: [4] },
            inspectionNotes: ["commute", "hours", "expenses", "availability", "which jobs remain practical"],
            relevanceTerms: ["home", "family", "caregiving", "property", "move", "commute", "hours", "expenses", "availability"],
            bridgeConsequences: ["commute", "hours", "expenses", "availability", "which jobs remain practical"],
            doNotAssume: ["a move", "illness", "family conflict", "the professional goal changed"]
          },
          {
            id: "health_capacity_workload",
            match: { houses: [6] },
            inspectionNotes: ["physical capacity", "workload", "schedule", "accommodation", "ordinary weekly capacity"],
            relevanceTerms: ["health", "capacity", "sleep", "appointment", "recovery", "workload", "routine", "schedule", "workflow"],
            doNotAssume: ["a diagnosis", "professional growth creates more physical capacity"]
          },
          {
            id: "professional_communication",
            match: { houses: [3] },
            inspectionNotes: ["writing", "learning", "applications", "publishing when professionally relevant"],
            relevanceTerms: ["writing", "learning", "teaching", "publishing", "application", "proposal", "communication"],
            doNotAssume: ["every communication factor is professionally relevant"]
          }
        ]
      },
      {
        id: "structural_modifiers",
        weight: 10,
        rules: [
          {
            id: "power_access_terms",
            match: { natalPoints: ["Pluto"], sourceTerms: ["power", "access", "credit", "control", "terms", "ownership"] },
            inspectionNotes: ["who decides", "who owns the work", "who receives credit", "who controls access"],
            relevanceTerms: ["power", "access", "credit", "control", "terms", "ownership"],
            doNotAssume: ["prestige makes an agreement good", "access guarantees control"]
          },
          {
            id: "growth_capacity",
            match: { transitPlanets: ["Jupiter"], sourceTerms: ["opportunity", "growth", "expansion", "capacity"] },
            inspectionNotes: ["revenue", "workload", "dependence", "risk", "costs", "complexity"],
            relevanceTerms: ["opportunity", "growth", "expansion", "capacity", "revenue", "workload", "dependence", "risk", "cost"],
            doNotAssume: ["more is automatically better", "growth is inherently desirable"]
          }
        ]
      }
    ],
    excludedProjectionTerms: ["dating", "attraction", "sex", "pleasure", "romantic", "spirituality"],
    validators: ["money_abstraction", "natural_paragraphs", "key_date_format"]
  },
  love_connection: {
    canonicalPromptPath: "tldr-astro-phrasebank/TLDR-LOVE-CONNECTION-DEEPDIVE-GENERATION-PROMPT-OWNER.md",
    canonicalPromptOwnerApproved: true,
    voiceEvidencePath: "artifacts/marie-satori-love-connection-2026-owner-v1.md",
    generationStandardPath: null,
    tiers: [
      {
        id: "direct_love_connection",
        weight: 30,
        rules: [
          {
            id: "natal_venus",
            match: { natalPoints: ["Venus"], overlayPoints: ["Venus"] },
            inspectionNotes: ["attraction", "affection", "pleasure", "interest", "relationship terms", "what becomes worth making time for"],
            relevanceTerms: ["attraction", "affection", "pleasure", "interest", "dating", "relationship", "connection", "love"],
            doNotAssume: ["partnership", "commitment", "marriage", "romantic relationship"]
          },
          {
            id: "natal_mars",
            match: { natalPoints: ["Mars"], overlayPoints: ["Mars"] },
            inspectionNotes: ["desire", "sexual initiative", "pursuit", "frustration", "conflict", "what the reader wants"],
            relevanceTerms: ["desire", "sex", "sexual", "pursuit", "frustration", "conflict", "dating", "attraction", "relationship"],
            doNotAssume: ["sexual chemistry", "fighting", "breakup"]
          },
          {
            id: "natal_moon",
            match: { natalPoints: ["Moon"], overlayPoints: ["Moon"] },
            inspectionNotes: ["care", "emotional availability", "comfort", "daily closeness", "relationship rhythms", "capacity for other people"],
            relevanceTerms: ["care", "emotional", "availability", "comfort", "closeness", "relationship", "capacity"],
            doNotAssume: ["reduced availability means reduced interest", "a diagnosis"]
          },
          {
            id: "ascendant_descendant_axis",
            match: { natalPoints: ["Ascendant", "Descendant"], overlayPoints: ["Ascendant", "Descendant"] },
            inspectionNotes: ["one-to-one relationships", "relationship roles", "availability", "what kind of arrangement fits"],
            relevanceTerms: ["relationship", "role", "availability", "arrangement", "connection"],
            doNotAssume: ["Descendant activation guarantees partnership"]
          },
          {
            id: "relationship_houses_and_eclipses",
            match: { houses: [5, 7, 8] },
            inspectionNotes: ["dating", "romance", "pleasure", "sex", "partnership terms", "intimacy", "shared resources"],
            relevanceTerms: ["dating", "romance", "pleasure", "sex", "attraction", "relationship", "intimacy", "privacy", "shared", "money"],
            doNotAssume: ["partnership", "commitment", "marriage", "the 8th house is only sex"]
          },
          {
            id: "solar_return_relationship_house_signatures",
            match: { factorTypes: ["sr-overlay"], houses: [5, 7, 8], mode: "all" },
            inspectionNotes: ["repeated Solar Return relationship signatures", "SR Ascendant overlays", "SR Venus", "SR Mars", "SR Moon"],
            relevanceTerms: ["dating", "romance", "pleasure", "sex", "attraction", "relationship", "connection"],
            doNotAssume: ["one weak Solar Return signature makes relationships the year theme"]
          },
          {
            id: "solar_return_relationship_planets",
            match: { factorTypes: ["sr-overlay"], overlayPoints: ["Venus", "Mars", "Moon"], mode: "all" },
            inspectionNotes: ["repeated Solar Return relationship signatures", "SR Venus", "SR Mars", "SR Moon"],
            relevanceTerms: ["dating", "romance", "pleasure", "sex", "attraction", "relationship", "connection"],
            doNotAssume: ["one weak Solar Return signature makes relationships the year theme"]
          },
          {
            id: "relationship_house_profection",
            match: { factorTypes: ["profection-year"], houses: [5, 7, 8], mode: "all" },
            inspectionNotes: ["5th-house profection", "7th-house profection", "8th-house profection", "relationship planet as Lord of the Year"],
            relevanceTerms: ["Venus", "Mars", "Moon", "dating", "relationship", "intimacy"],
            doNotAssume: ["the profection guarantees a relationship event"]
          },
          {
            id: "relationship_lord_profection",
            match: { factorTypes: ["profection-year"], sourceTerms: ["Venus", "Mars", "Moon"], mode: "all" },
            inspectionNotes: ["Venus, Mars, or Moon as Lord of the Year"],
            relevanceTerms: ["Venus", "Mars", "Moon", "dating", "relationship", "intimacy"],
            doNotAssume: ["the profection guarantees a relationship event"]
          }
        ]
      },
      {
        id: "condition_changers",
        weight: 20,
        rules: [
          {
            id: "home_and_family",
            match: { houses: [4] },
            inspectionNotes: ["moving", "cohabitation", "living apart", "privacy", "caregiving", "household labor", "relationship logistics"],
            relevanceTerms: ["home", "family", "property", "caregiving", "living", "privacy", "move", "money"],
            bridgeConsequences: ["privacy", "caregiving", "household labor", "who lives where", "relationship logistics"],
            doNotAssume: ["a move", "cohabitation", "separation", "family conflict"]
          },
          {
            id: "health_capacity_availability",
            match: { houses: [6] },
            inspectionNotes: ["availability", "sleep", "rest", "physical capacity", "workload", "ability to travel", "sexual availability", "time together"],
            relevanceTerms: ["health", "capacity", "sleep", "rest", "appointment", "workload", "caregiving", "routine", "availability", "travel"],
            doNotAssume: ["a diagnosis", "reduced availability means reduced affection"]
          },
          {
            id: "money_and_shared_obligations",
            match: { houses: [2, 8] },
            inspectionNotes: ["dating costs", "shared money", "rent", "travel", "who pays", "financial dependence", "what a connection costs to maintain"],
            relevanceTerms: ["money", "rent", "financial", "expense", "pay", "support", "obligation", "travel"],
            doNotAssume: ["financial dependence", "shared finances", "cohabitation"]
          },
          {
            id: "communication_and_plans",
            match: { houses: [3], natalPoints: ["Mercury"] },
            inspectionNotes: ["texts", "messages", "invitations", "making plans", "relationship conversations", "asking for an answer"],
            relevanceTerms: ["text", "message", "conversation", "communication", "invitation", "plan", "writing", "dating", "relationship"],
            doNotAssume: ["every Mercury transit is a communication issue"]
          },
          {
            id: "career_distance_social_context",
            match: { houses: [9, 10, 11] },
            inspectionNotes: ["availability", "travel", "location", "money", "schedule", "distance", "social circles", "introductions"],
            relevanceTerms: ["career", "work", "travel", "distance", "education", "friend", "group", "community", "network", "availability", "schedule"],
            doNotAssume: ["work changes the relationship itself", "travel means long-distance partnership", "social activity guarantees dating"]
          }
        ]
      },
      {
        id: "slow_planet_relationship_conditions",
        weight: 10,
        rules: [
          {
            id: "retrograde_station_relevance_gate",
            match: { sourceTerms: ["retrograde", "station"] },
            inspectionNotes: ["Venus retrograde only when relationship-relevant", "Mars retrograde only when relationship-relevant", "Mercury retrograde only when relationship context earns it"],
            relevanceTerms: ["retrograde", "station", "Venus", "Mars", "Mercury", "relationship"],
            doNotAssume: ["a retrograde belongs merely because it occurs during the period"]
          },
          {
            id: "saturn_conditions",
            match: { transitPlanets: ["Saturn"], natalPoints: ["Venus", "Mars", "Moon", "Ascendant", "Descendant"], mode: "all" },
            inspectionNotes: ["limits", "responsibility", "time", "structure", "what can actually be maintained"],
            relevanceTerms: ["limit", "responsibility", "time", "structure", "maintain", "relationship"],
            doNotAssume: ["commitment", "breakup", "coldness"]
          },
          {
            id: "uranus_conditions",
            match: { transitPlanets: ["Uranus"], natalPoints: ["Sun", "Moon", "Venus", "Mars", "Ascendant", "Descendant"], mode: "all" },
            inspectionNotes: ["changed conditions", "different needs", "schedule changes", "new relationship arrangements", "less attachment to an old role"],
            relevanceTerms: ["change", "need", "schedule", "arrangement", "role", "relationship"],
            doNotAssume: ["rebellion", "leaving", "freedom", "breakup"]
          },
          {
            id: "neptune_conditions",
            match: { transitPlanets: ["Neptune"], natalPoints: ["Venus", "Moon", "Mars", "Ascendant", "Descendant"], mode: "all" },
            inspectionNotes: ["idealization", "imagination", "meaning", "uncertainty", "projection", "difficulty defining the relationship"],
            relevanceTerms: ["idealization", "imagination", "meaning", "uncertainty", "projection", "relationship", "romantic"],
            doNotAssume: ["soulmate", "deception", "psychic bond", "destiny"]
          },
          {
            id: "pluto_conditions",
            match: { transitPlanets: ["Pluto"], natalPoints: ["Venus", "Mars", "Moon", "Ascendant", "Descendant"], mode: "all" },
            inspectionNotes: ["power", "leverage", "access", "control", "dependency", "who sets the terms"],
            relevanceTerms: ["power", "leverage", "access", "control", "dependency", "terms", "dating", "relationship"],
            doNotAssume: ["coercion", "abuse", "breakup"]
          },
          {
            id: "natal_pluto_power_conditions",
            match: { natalPoints: ["Pluto"] },
            inspectionNotes: ["power", "leverage", "access", "control", "dependency", "who sets the terms"],
            relevanceTerms: ["power", "leverage", "access", "control", "dependency", "terms", "dating", "relationship"],
            doNotAssume: ["coercion", "abuse", "breakup"]
          },
          {
            id: "jupiter_conditions",
            match: { transitPlanets: ["Jupiter"], sourceTerms: ["dating", "attraction", "pleasure", "desire", "relationship", "connection", "availability"], mode: "all" },
            inspectionNotes: ["more opportunity", "more pleasure", "more social activity", "more desire", "more plans", "excess", "overpromising"],
            relevanceTerms: ["opportunity", "pleasure", "social", "desire", "plan", "excess", "overpromising", "dating", "attraction", "relationship", "connection", "availability"],
            doNotAssume: ["more is automatically better", "relationship opportunity guarantees partnership"]
          }
        ]
      }
    ],
    excludedProjectionTerms: [
      "soulmate",
      "twin flame",
      "divine union",
      "your person",
      "application",
      "proposal",
      "publishing",
      "newsletter"
    ],
    validators: ["natural_paragraphs", "key_date_format", "love_banned_vocabulary", "status_branching", "sex_invention"]
  },
  personal_health: {
    canonicalPromptPath: PERSONAL_HEALTH_PROMPT_PATH,
    canonicalPromptOwnerApproved: true,
    canonicalPromptVersion: "personal-health-deepdive-generation-prompt-v1",
    canonicalPromptSha256: "c43cf5a05272af7355543a5ccbd7ed50a81e1ad3bf307eb64d2bcbf984c10bee",
    voiceEvidencePath: "artifacts/marie-satori-personal-health-2026-owner-v1.md",
    generationStandardPath: GENERATION_STANDARD_PATH,
    tiers: [
      {
        id: "direct_personal_health",
        weight: 30,
        rules: [
          {
            id: "major_sun_moon_ascendant_transits",
            match: { factorTypes: ["slow-transit-to-natal", "return"], natalPoints: ["Sun", "Moon", "Ascendant"], mode: "all" },
            inspectionNotes: ["major contacts to the Sun, Moon, or Ascendant", "daily rhythm", "care", "work", "health", "body", "privacy", "appointments", "sleep", "recovery"],
            relevanceTerms: ["body", "health", "routine", "appointment", "sleep", "recovery", "capacity", "privacy", "rest", "schedule", "care", "daily"],
            doNotAssume: ["symptoms", "a diagnosis", "a medical crisis", "a psychological cause for symptoms"]
          },
          {
            id: "personal_health_house_activations",
            match: { houses: [1, 6, 12] },
            inspectionNotes: ["1st-, 6th-, and 12th-house activation and ruler relevance"],
            relevanceTerms: ["identity", "private", "privacy", "daily", "health", "body", "routine", "appointment", "sleep", "recovery", "care", "schedule"],
            doNotAssume: ["symptoms", "a diagnosis", "a medical crisis", "a psychological cause for symptoms"]
          },
          {
            id: "annual_profection_personal_health",
            match: { factorTypes: ["profection-year"], houses: [1, 6, 12], mode: "all" },
            inspectionNotes: ["annual profection and Lord of the Year when relevant to identity, privacy, daily life, or health"],
            relevanceTerms: ["identity", "private", "privacy", "daily", "health", "body", "routine", "appointment", "sleep", "recovery", "care", "schedule"],
            doNotAssume: ["symptoms", "a diagnosis", "a medical crisis", "a psychological cause for symptoms"]
          },
          {
            id: "solar_return_personal_health_houses",
            match: { factorTypes: ["sr-overlay"], houses: [1, 6, 12], mode: "all" },
            inspectionNotes: ["Solar Return overlay materially touching the 1st, 6th, or 12th house or ruler"],
            relevanceTerms: ["identity", "private", "privacy", "daily", "health", "body", "routine", "appointment", "sleep", "recovery", "care", "schedule"],
            doNotAssume: ["symptoms", "a diagnosis", "a medical crisis", "a psychological cause for symptoms"]
          },
          {
            id: "solar_return_personal_health_points",
            match: { factorTypes: ["sr-overlay"], overlayPoints: ["Sun", "Moon", "Ascendant"], mode: "all" },
            inspectionNotes: ["Solar Return overlay materially touching the Sun, Moon, or Ascendant"],
            relevanceTerms: ["identity", "private", "privacy", "daily", "health", "body", "routine", "appointment", "sleep", "recovery", "care", "schedule"],
            doNotAssume: ["symptoms", "a diagnosis", "a medical crisis", "a psychological cause for symptoms"]
          },
          {
            id: "eclipse_personal_health_points",
            match: { factorTypes: ["eclipse-on-natal-point"], natalPoints: ["Sun", "Moon", "Ascendant"], mode: "all" },
            inspectionNotes: ["eclipse materially contacting the Sun, Moon, or Ascendant"],
            relevanceTerms: ["identity", "private", "privacy", "daily", "health", "body", "routine", "appointment", "sleep", "recovery", "care", "schedule"],
            doNotAssume: ["symptoms", "a diagnosis", "a medical crisis", "a psychological cause for symptoms"]
          },
          {
            id: "private_practice_slow_planet_support",
            match: {
              factorTypes: ["slow-transit-to-natal"],
              transitPlanets: ["Saturn", "Neptune"],
              natalPoints: ["Jupiter"],
              mode: "all"
            },
            inspectionNotes: ["private work", "spiritual practice", "study", "retreat", "meaning", "a role the reader is growing out of"],
            relevanceTerms: ["private", "practice", "spiritual", "study", "retreat", "meaning", "belief", "role", "schedule", "calendar"],
            doNotAssume: [
              "symptoms", "a diagnosis", "a medical crisis", "a psychological cause for symptoms",
              "awakening", "psychic ability", "a crisis of faith", "confusion", "addiction", "depression", "hardship", "illness"
            ]
          }
        ]
      },
      {
        id: "condition_changers",
        weight: 20,
        rules: [
          {
            id: "home_family_caregiving",
            match: { houses: [4] },
            inspectionNotes: ["driving", "cleaning", "maintenance", "stairs", "caregiving", "hours returned to the week"],
            relevanceTerms: ["driving", "cleaning", "maintenance", "stairs", "caregiving", "weekly time", "privacy", "accessibility", "commute"],
            bridgeConsequences: ["driving", "cleaning", "maintenance", "stairs", "caregiving", "weekly time"],
            doNotAssume: ["symptoms", "a diagnosis", "a medical crisis", "a psychological cause for symptoms", "a move", "family conflict", "caregiving is the reader's responsibility"]
          },
          {
            id: "communication_schedule_and_errands",
            match: { houses: [3], natalPoints: ["Mercury", "Jupiter"] },
            inspectionNotes: ["appointments", "errands", "paperwork", "messages", "classes", "short trips", "calendar load"],
            relevanceTerms: ["appointment", "errand", "paperwork", "message", "short trip", "local travel", "schedule", "routine", "calendar"],
            doNotAssume: ["symptoms", "a diagnosis", "a medical crisis", "a psychological cause for symptoms", "every communication factor creates overload", "the reader must decline the opportunity"]
          },
          {
            id: "public_work_conditions",
            match: { factorTypes: ["eclipse-on-natal-point"], natalPoints: ["Midheaven"], mode: "all" },
            inspectionNotes: ["hours", "commute", "travel", "physical demands", "appointments displaced by work"],
            relevanceTerms: ["hours", "commute", "travel", "physical demands", "schedule", "appointment", "recovery"],
            bridgeConsequences: ["hours", "commute", "travel", "physical demands", "appointment schedule"],
            doNotAssume: ["symptoms", "a diagnosis", "a medical crisis", "a psychological cause for symptoms", "the reader has a conventional job", "a professional change is voluntary", "the opportunity is worth its cost"]
          },
          {
            id: "work_travel_money_logistics",
            match: { sourceTerms: ["hours", "daily demands", "travel", "commute", "transportation", "housing", "treatment", "help", "access", "schedule", "recovery"] },
            inspectionNotes: ["work enters only through hours or daily demands", "travel enters only through timing or recovery", "money enters only through access to help, transportation, housing, treatment or routine logistics, or the daily schedule"],
            relevanceTerms: ["hours", "daily", "travel", "commute", "transportation", "housing", "treatment", "routine", "help", "access", "schedule", "recovery"],
            bridgeConsequences: ["hours", "daily demands", "travel timing", "recovery", "transportation", "housing", "treatment logistics", "routine logistics", "access to help", "daily schedule"],
            doNotAssume: ["symptoms", "a diagnosis", "a medical crisis", "a psychological cause for symptoms", "the reader is employed", "income changes", "travel is optional"]
          }
        ]
      }
    ],
    excludedProjectionTerms: ["dating", "romance", "attraction", "sex", "application", "proposal", "income", "salary", "pay", "pricing", "revenue", "profit"],
    strictBridgeProjection: true,
    validators: ["natural_paragraphs", "key_date_format", "personal_health_ceiling"]
  }
};

const SHARED_INVARIANTS = [
  "coverage_gate",
  "specificity_ceiling",
  "life_status_neutrality",
  "involuntary_change",
  "chart_earned_topics",
  "planet_logic",
  "no_persona",
  "no_em_dash",
  "no_whether",
  "multi_pass_handling",
  "density_caps",
  "governance",
  "stop_rule"
];

const UNIT_IDS: Record<ReportHorizon, string[]> = {
  "1_month": ["overview", "what-matters-most", "domain:*", "key-dates"],
  "4_months": ["overview", "period-theme", "development:*", "key-dates", "closing-synthesis"],
  "6_months": ["overview", "period-theme", "phase-1", "phase-2", "key-dates", "review"],
  "12_months": [
    "overview",
    "year-theme",
    "professional-theme",
    "domain:*",
    "winter-current",
    "spring",
    "summer",
    "autumn",
    "money",
    "key-dates",
    "review-current-year",
    "winter-next"
  ]
};

const PERSONAL_HEALTH_12_MONTH_UNIT_IDS = [
  "overview",
  "year-theme",
  "domain:main",
  "winter-current",
  "spring",
  "summer",
  "autumn",
  "health-capacity",
  "key-dates",
  "review-current-year",
  "winter-next"
];

const RETURN_ELIGIBLE = new Set([
  "Sun",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Chiron",
  "Uranus",
  "North Node"
]);

function readRepoText(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function reportWindowFacts(facts: Record<string, unknown>) {
  return recordValue(facts.reportWindow) ?? facts;
}

function unitIdsFor(reportDomain: ReportDomain, horizon: ReportHorizon) {
  return reportDomain === "personal_health" && horizon === "12_months"
    ? PERSONAL_HEALTH_12_MONTH_UNIT_IDS
    : UNIT_IDS[horizon];
}

function unitIdAllowed(reportDomain: ReportDomain, horizon: ReportHorizon, unitId: string) {
  return unitIdsFor(reportDomain, horizon).some((allowed) => (
    allowed.endsWith(":*") ? unitId.startsWith(allowed.slice(0, -1)) : unitId === allowed
  ));
}

function validateFrozenWindow(horizon: ReportHorizon, facts: Record<string, unknown>) {
  const windowFacts = reportWindowFacts(facts);
  const factsHorizon = stringValue(windowFacts.reportHorizon);
  if (factsHorizon && factsHorizon !== horizon) {
    throw new Error(`Frozen report-window horizon '${factsHorizon}' does not match '${horizon}'.`);
  }
  const startsAt = Date.parse(stringValue(windowFacts.startsAt));
  const endsAt = Date.parse(stringValue(windowFacts.endsAt));
  const maxDays: Record<ReportHorizon, number> = {
    "1_month": 40,
    "4_months": 140,
    "6_months": 200,
    "12_months": 380
  };
  if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || endsAt <= startsAt) {
    throw new Error("Frozen report-window facts require valid startsAt and endsAt values.");
  }
  if ((endsAt - startsAt) / 86_400_000 > maxDays[horizon]) {
    throw new Error(`Frozen report-window facts exceed the ${horizon} time-distance contract.`);
  }

  const eventTimes = [
    ...arrayValue(windowFacts.fastTransitKeyDates).map((value) => stringValue(recordValue(value)?.exactAt)),
    ...arrayValue(windowFacts.lunarEvents).map((value) => stringValue(recordValue(value)?.occursAt)),
    ...arrayValue(windowFacts.stations).map((value) => stringValue(recordValue(value)?.occursAt)),
    ...arrayValue(windowFacts.ingresses).map((value) => stringValue(recordValue(value)?.occursAt)),
    ...arrayValue(windowFacts.slowTransitArcs).flatMap((value) => (
      arrayValue(recordValue(value)?.passes).map((reportPass) => stringValue(recordValue(reportPass)?.exactAt))
    ))
  ].filter(Boolean);
  if (eventTimes.some((value) => Date.parse(value) < startsAt || Date.parse(value) > endsAt)) {
    throw new Error(`Frozen report-window facts contain an event outside the ${horizon} window.`);
  }
}

export function reportUnitContract(horizon: ReportHorizon, unitId: string, reportDomain: ReportDomain = "general"): ReportUnitContract {
  if (!unitIdAllowed(reportDomain, horizon, unitId)) {
    throw new Error(`Unit '${unitId}' is not part of the ${reportDomain} ${horizon} report contract.`);
  }
  return { horizon, unitId, allowedUnitIds: [...unitIdsFor(reportDomain, horizon)] };
}

function loadManifestationRecords() {
  const collection = JSON.parse(readRepoText(MANIFESTATION_SETS_PATH)) as {
    records: Record<string, Omit<ManifestationSetRecord, "id">>;
  };
  return Object.entries(collection.records).map(([id, record]) => ({ id, ...record }));
}

function factorKey(factor: ReportFactor) {
  return [
    factor.factorType,
    factor.transitPlanet,
    factor.aspect,
    factor.natalPoint,
    factor.overlayPoint,
    factor.house
  ].filter((value) => value !== undefined).join("/").toLowerCase().replaceAll(" ", "-");
}

function profectionFactors(facts: Record<string, unknown>): ReportFactor[] {
  const profections = recordValue(facts.profections);
  const annual = recordValue(profections?.annual);
  const house = numberValue(annual?.house);
  if (!annual || house === undefined) return [];
  return [{
    id: `profection-year-house-${house}`,
    factorType: "profection-year",
    house,
    source: annual
  }];
}

function solarReturnFactors(facts: Record<string, unknown>): ReportFactor[] {
  const solarReturn = recordValue(facts.solarReturn);
  const analysis = recordValue(solarReturn?.analysis);
  return arrayValue(analysis?.solarReturnToNatalOverlays).flatMap((value) => {
    const overlay = recordValue(value);
    const house = numberValue(overlay?.house);
    const overlayPoint = stringValue(overlay?.point);
    if (!overlay || house === undefined || !overlayPoint) return [];
    return [{
      id: `sr-overlay-${overlayPoint.toLowerCase().replaceAll(" ", "-")}-house-${house}`,
      factorType: "sr-overlay" as const,
      house,
      overlayPoint,
      source: overlay
    }];
  });
}

function transitFactors(facts: Record<string, unknown>): ReportFactor[] {
  return arrayValue(facts.slowTransitArcs).flatMap((value) => {
    const arc = recordValue(value);
    if (!arc) return [];
    const transitPlanet = stringValue(arc.transitPlanet);
    const natalPoint = stringValue(arc.natalPoint);
    const aspect = stringValue(arc.aspect);
    const house = numberValue(arc.natalHouse);
    const selfConjunction = transitPlanet === natalPoint && aspect === "conjunction";
    if (selfConjunction && !RETURN_ELIGIBLE.has(transitPlanet)) return [];
    const returnEligible = selfConjunction && RETURN_ELIGIBLE.has(transitPlanet);
    const factorType = returnEligible ? "return" : "slow-transit-to-natal";
    return [{
      id: stringValue(arc.id) || `${factorType}-${transitPlanet}-${aspect}-${natalPoint}`,
      factorType,
      house,
      natalPoint,
      transitPlanet,
      aspect,
      source: arc
    }];
  });
}

function eclipseFactors(facts: Record<string, unknown>): ReportFactor[] {
  const natal = recordValue(facts.natal);
  const natalHouses = new Map<string, number>();
  for (const value of arrayValue(natal?.positions)) {
    const position = recordValue(value);
    const point = stringValue(position?.point);
    const house = numberValue(position?.house);
    if (point && house !== undefined) natalHouses.set(point, house);
  }
  const angles = recordValue(natal?.angles);
  for (const [point, value] of Object.entries(angles ?? {})) {
    const house = numberValue(recordValue(value)?.house);
    if (house !== undefined) natalHouses.set(point, house);
  }
  return arrayValue(facts.lunarEvents).flatMap((value) => {
    const event = recordValue(value);
    const kind = stringValue(event?.kind);
    if (!event || !kind.includes("eclipse")) return [];
    return arrayValue(event.natalContacts).flatMap((contactValue) => {
      const contact = recordValue(contactValue);
      const natalPoint = stringValue(contact?.natalPoint);
      if (!contact || !natalPoint) return [];
      return [{
        id: `${stringValue(event.id)}-${natalPoint.toLowerCase().replaceAll(" ", "-")}`,
        factorType: "eclipse-on-natal-point" as const,
        house: natalHouses.get(natalPoint),
        activationHouse: numberValue(event.natalHouse),
        natalPoint,
        aspect: stringValue(contact.aspect),
        source: { ...event, contact }
      }];
    });
  });
}

export function reportFactors(facts: Record<string, unknown>) {
  const windowFacts = reportWindowFacts(facts);
  const factors = [
    ...profectionFactors(windowFacts),
    ...solarReturnFactors(windowFacts),
    ...transitFactors(windowFacts),
    ...eclipseFactors(windowFacts)
  ];
  const seen = new Set<string>();
  return factors.filter((factor) => {
    const key = `${factor.id}:${factor.factorType}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function recordMatchScore(record: ManifestationSetRecord, factor: ReportFactor) {
  if (record.factorType !== factor.factorType) return -1;
  let score = 0;
  for (const field of ["house", "natalPoint", "transitPlanet", "aspect", "overlayPoint"] as const) {
    const expected = record.match[field];
    if (expected === undefined) continue;
    if (expected !== factor[field]) return -1;
    score += 1;
  }
  return score;
}

function bestManifestationRecord(records: ManifestationSetRecord[], factor: ReportFactor) {
  return records
    .map((record) => ({ record, score: recordMatchScore(record, factor) }))
    .filter((candidate) => candidate.score >= 0)
    .sort((left, right) => right.score - left.score || left.record.id.localeCompare(right.record.id))[0]?.record;
}

function relevantTerms(text: string, terms: string[]) {
  return terms.filter((term) => phrasePresent(text, term));
}

function domainRules(configuration: ReportDomainConfiguration) {
  return configuration.tiers.flatMap((tier) => tier.rules.map((rule) => ({ tier, rule })));
}

function ruleMatches(rule: DomainRelevanceRule, factor: ReportFactor, searchable: string) {
  const checks: boolean[] = [];
  const match = rule.match;
  const relevanceHouse = factor.factorType === "eclipse-on-natal-point"
    ? factor.activationHouse ?? factor.house
    : factor.house;
  if (match.factorTypes) checks.push(match.factorTypes.includes(factor.factorType));
  if (match.houses) checks.push(relevanceHouse !== undefined && match.houses.includes(relevanceHouse));
  if (match.natalPoints) checks.push(Boolean(factor.natalPoint && match.natalPoints.includes(factor.natalPoint)));
  if (match.transitPlanets) checks.push(Boolean(factor.transitPlanet && match.transitPlanets.includes(factor.transitPlanet)));
  if (match.overlayPoints) checks.push(Boolean(factor.overlayPoint && match.overlayPoints.includes(factor.overlayPoint)));
  if (match.sourceTerms) checks.push(relevantTerms(searchable, match.sourceTerms).length > 0);
  if (!checks.length) return false;
  return match.mode === "all" ? checks.every(Boolean) : checks.some(Boolean);
}

function projectedRecord(
  record: ManifestationSetRecord,
  configuration: ReportDomainConfiguration,
  selection: ReportFactorSelection | undefined
): ManifestationSetRecord {
  if (configuration === REPORT_DOMAIN_CONFIG.general) return record;
  const excluded = (value: string) => configuration.excludedProjectionTerms.some((term) => phrasePresent(value, term));
  const selectedRules = new Set(selection?.matchedRuleIds ?? []);
  const projectionTerms = domainRules(configuration)
    .filter(({ rule }) => selectedRules.has(rule.id))
    .flatMap(({ rule }) => rule.relevanceTerms);
  const bridgeTerms = selection?.bridgeConsequences ?? [];
  const relevant = (value: string) => relevantTerms(value, [...projectionTerms, ...bridgeTerms]).length > 0;
  const bridge = (selection?.bridgeConsequences.length ?? 0) > 0;
  const included = (value: string) => !excluded(value)
    && (configuration.strictBridgeProjection ? relevant(value) : bridge || relevant(value));
  return {
    ...record,
    domain: record.domain.filter(included),
    possibleLivedManifestations: record.possibleLivedManifestations
      .filter(included),
    doNotAssume: [...new Set([
      ...record.doNotAssume.filter((value) => !excluded(value)),
      ...(selection?.doNotAssume ?? [])
    ])]
  };
}

export type ReportDomainPromptReadiness = {
  reportDomain: ReportDomain;
  sourcePath: string;
  exists: boolean;
  ownerApproved: boolean;
  ready: boolean;
};

export function reportDomainPromptReadiness(reportDomain: ReportDomain): ReportDomainPromptReadiness {
  const configuration = REPORT_DOMAIN_CONFIG[reportDomain];
  const exists = fs.existsSync(path.join(process.cwd(), configuration.canonicalPromptPath));
  const text = exists ? readRepoText(configuration.canonicalPromptPath) : "";
  const versionMatches = !configuration.canonicalPromptVersion
    || text.includes(`Version \`${configuration.canonicalPromptVersion}\``);
  const shaMatches = !configuration.canonicalPromptSha256
    || crypto.createHash("sha256").update(text).digest("hex") === configuration.canonicalPromptSha256;
  const approvalRecorded = !configuration.canonicalPromptVersion
    || /`owner_approved`/u.test(text);
  const ownerApproved = configuration.canonicalPromptOwnerApproved && versionMatches && shaMatches && approvalRecorded;
  return {
    reportDomain,
    sourcePath: configuration.canonicalPromptPath,
    exists,
    ownerApproved,
    ready: exists && ownerApproved
  };
}

export function reportDomainRelevanceModel(reportDomain: ReportDomain): DomainRelevanceTier[] {
  return JSON.parse(JSON.stringify(REPORT_DOMAIN_CONFIG[reportDomain].tiers)) as DomainRelevanceTier[];
}

export function assertReportDomainFulfillmentReady(reportDomain: ReportDomain) {
  const readiness = reportDomainPromptReadiness(reportDomain);
  if (!readiness.ready) {
    throw new Error(`REPORT_DOMAIN_PROMPT_PENDING: ${reportDomain} requires owner-approved canonical prompt ${readiness.sourcePath}.`);
  }
  return readiness;
}

export function selectReportFactors(
  factors: ReportFactor[],
  reportDomain: ReportDomain
): { factors: ReportFactor[]; selection: ReportFactorSelection[] } {
  const configuration = REPORT_DOMAIN_CONFIG[reportDomain];
  const records = loadManifestationRecords();
  const selection = factors.flatMap((factor) => {
    if (reportDomain === "general") {
      return [{
        factorId: factor.id,
        score: 1,
        tierId: "general_coverage_gate",
        matchedRuleIds: [],
        matchedTerms: [],
        inspectionNotes: [],
        doNotAssume: [],
        bridgeConsequences: []
      }];
    }
    const record = bestManifestationRecord(records, factor);
    const searchable = [
      ...(record?.domain ?? []),
      ...(record?.possibleLivedManifestations ?? []),
      JSON.stringify(factor.source)
    ].join(" ");
    const inspections = domainRules(configuration).filter(({ rule }) => ruleMatches(rule, factor, searchable));
    if (!inspections.length) return [];
    const primaryTier = inspections
      .map(({ tier }) => tier)
      .sort((left, right) => right.weight - left.weight || left.id.localeCompare(right.id))[0];
    const matchedTerms = [...new Set(inspections.flatMap(({ rule }) => relevantTerms(searchable, rule.relevanceTerms)))];
    const bridgeConsequences = [...new Set(inspections.flatMap(({ rule }) => rule.bridgeConsequences ?? []))];
    return [{
      factorId: factor.id,
      score: primaryTier.weight + inspections.length * 5 + matchedTerms.length,
      tierId: primaryTier.id,
      matchedRuleIds: [...new Set(inspections.map(({ rule }) => rule.id))],
      matchedTerms,
      inspectionNotes: [...new Set(inspections.flatMap(({ rule }) => rule.inspectionNotes))],
      doNotAssume: [...new Set(inspections.flatMap(({ rule }) => rule.doNotAssume))],
      bridgeConsequences
    }];
  });
  const selectedIds = new Set(selection.map((item) => item.factorId));
  return {
    factors: factors.filter((factor) => selectedIds.has(factor.id)),
    selection
  };
}

export function resolveManifestationSets(
  factors: ReportFactor[],
  reportDomain: ReportDomain = "general",
  selection: ReportFactorSelection[] = []
) {
  const records = loadManifestationRecords();
  const configuration = REPORT_DOMAIN_CONFIG[reportDomain];
  const selectionByFactor = new Map(selection.map((item) => [item.factorId, item]));
  const resolved: ResolvedManifestationSet[] = [];
  const gaps: ReportSourceGap[] = [];

  for (const factor of factors) {
    const record = bestManifestationRecord(records, factor);
    if (record) {
      resolved.push({
        factor,
        record: projectedRecord(
          record,
          configuration,
          selectionByFactor.get(factor.id)
        )
      });
    } else {
      gaps.push({ factorId: factor.id, requestedKey: factorKey(factor), reason: "SOURCE_GAP" });
    }
  }

  return { resolved, gaps };
}

export function assembleReportGenerationPayload(
  input: AssembleReportPayloadInput
): ReportGenerationPayload {
  validateFrozenWindow(input.reportHorizon, input.frozenFacts);
  assertReportDomainFulfillmentReady(input.reportDomain);
  const configuration = REPORT_DOMAIN_CONFIG[input.reportDomain];
  const completeFactors = reportFactors(input.frozenFacts);
  const { factors, selection } = selectReportFactors(completeFactors, input.reportDomain);
  const { resolved, gaps } = resolveManifestationSets(factors, input.reportDomain, selection);
  return {
    schemaVersion: "report-generation-v3",
    reportId: input.reportId,
    reportDomain: input.reportDomain,
    reportHorizon: input.reportHorizon,
    unit: reportUnitContract(input.reportHorizon, input.unitId, input.reportDomain),
    canonicalOwnerPrompt: {
      sourcePath: configuration.canonicalPromptPath,
      text: readRepoText(configuration.canonicalPromptPath)
    },
    generationStandard: configuration.generationStandardPath ? {
      sourcePath: configuration.generationStandardPath,
      text: readRepoText(configuration.generationStandardPath)
    } : null,
    livedProseStandard: {
      sourcePath: LIVED_PROSE_STANDARD_PATH,
      text: readRepoText(LIVED_PROSE_STANDARD_PATH)
    },
    sharedInvariants: [...SHARED_INVARIANTS],
    domainRelevanceModel: reportDomainRelevanceModel(input.reportDomain),
    frozenFacts: JSON.parse(JSON.stringify(input.frozenFacts)) as Record<string, unknown>,
    factors,
    factorSelection: selection,
    manifestationSets: resolved,
    sourceGaps: gaps,
    writingQueue: [...gaps],
    voiceEvidence: [{
      sourcePath: configuration.voiceEvidencePath,
      sourceType: "owner_authored_final",
      surface: "report",
      eligible: true,
      text: readRepoText(configuration.voiceEvidencePath)
    }],
    ownerComparisonSet: reportOwnerComparisonSet(input.reportDomain),
    outputGovernance: {
      status: "DRAFT",
      review_status: "needs_review",
      ownerApproved: false,
      promotionAuthorized: false,
      promotionAllowed: false
    }
  };
}

const INTERNAL_LIVED_PROSE_SCAFFOLD = `INTERNAL PRE-DRAFT EXTRACTION (REQUIRED)
Complete this reasoning internally before drafting:
ASTROLOGY
LIVED FACT
CAUSE
CONSEQUENCE
CONTRADICTION
DO NOT ASSUME

The ASTROLOGY / LIVED FACT / CAUSE / CONSEQUENCE / CONTRADICTION / DO NOT ASSUME extraction is an internal generation scaffold only.
It must never appear in reader-facing report output, headings, metadata, attribution, or key dates.
Its purpose is to force reasoning before prose, not to create visible report structure.`;

export function reportPromptFromPayload(payload: ReportGenerationPayload) {
  const { canonicalOwnerPrompt, livedProseStandard, ...taskPayload } = payload;
  return [
    canonicalOwnerPrompt.text,
    `LIVED_PROSE_STANDARD\n${livedProseStandard.text}`,
    INTERNAL_LIVED_PROSE_SCAFFOLD,
    `REPORT_GENERATION_PAYLOAD\n${JSON.stringify(taskPayload, null, 2)}`
  ].join("\n\n");
}

function draftText(draft: ReportDraft) {
  return [
    draft.headline,
    draft.tldr,
    draft.summary,
    draft.body,
    draft.action,
    draft.timing,
    ...(draft.sections ?? []).flatMap((section) => [section.heading, section.body])
  ].filter(Boolean).join("\n");
}

function withoutTechnicalAttribution(value: string) {
  return value.split("\n")
    .filter((line) => !/^\s*(?:\*[^*]+\*|\*\*(?:provenance|governance):\*\*|(?:provenance|governance):)/iu.test(line))
    .map((line) => line.replace(/\s+·\s+\*[^*]+\*\s*$/u, ""))
    .join("\n");
}

function readerFacingText(draft: ReportDraft) {
  return [
    draft.headline,
    draft.tldr,
    draft.summary,
    draft.body,
    draft.action,
    draft.timing,
    ...(draft.sections ?? []).flatMap((section) => [section.heading, section.body])
  ].filter(Boolean).map((value) => withoutTechnicalAttribution(value as string)).join("\n");
}

function blocks(draft: ReportDraft) {
  return [draft.body ?? "", ...(draft.sections ?? []).map((section) => section.body ?? "")]
    .flatMap((value) => value.split(/\n\s*\n/u))
    .map((value) => value.trim())
    .filter(Boolean);
}

function paragraphs(draft: ReportDraft) {
  return [draft.body ?? "", ...(draft.sections ?? []).map((section) => section.body ?? "")]
    .flatMap((value) => value.split(/\n\s*\n/u))
    .map((value) => value.trim())
    .filter(Boolean);
}

function sentences(block: string) {
  return block.match(/[^.!?]+[.!?]?/gu)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [];
}

function escaped(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function phrasePresent(sentence: string, phrase: string) {
  return new RegExp(`(^|[^a-z0-9])${escaped(phrase)}([^a-z0-9]|$)`, "iu").test(sentence);
}

function hedged(sentence: string) {
  return /\b(?:may|can|could|might)\b/iu.test(sentence);
}

function hasActualSaturnReturn(facts: Record<string, unknown>) {
  return arrayValue(reportWindowFacts(facts).slowTransitArcs).some((value) => {
    const arc = recordValue(value);
    return arc?.transitPlanet === "Saturn" && arc?.natalPoint === "Saturn"
      && arc?.aspect === "conjunction" && arc?.isReturn === true;
  });
}

function validateMoneyAbstractions(draft: ReportDraft, issues: ReportValidationIssue[]) {
  const abstractTerms = ["abundance", "scarcity", "value", "worth"];
  const concreteTerms = [
    "rate", "pay", "hours", "expense", "commute", "travel", "software", "staff", "help",
    "tax", "payment timing", "unpaid", "revision", "scope", "client concentration", "revenue",
    "cash flow", "lost time", "opportunity cost"
  ];
  for (const block of blocks(draft)) {
    const blockSentences = sentences(block);
    for (const [index, sentence] of blockSentences.entries()) {
      if (!abstractTerms.some((term) => phrasePresent(sentence, term))) continue;
      const immediateContext = `${sentence} ${blockSentences[index + 1] ?? ""}`;
      if (!concreteTerms.some((term) => phrasePresent(immediateContext, term))) {
        issues.push({
          code: "money_abstraction",
          message: `Money abstraction is not immediately translated to concrete financial terms: ${sentence}`,
          severity: "error"
        });
      }
    }
  }
}

function validateNaturalParagraphs(draft: ReportDraft, issues: ReportValidationIssue[]) {
  let run = 0;
  for (const paragraph of paragraphs(draft).map(withoutTechnicalAttribution).filter(Boolean)) {
    const paragraphSentences = sentences(paragraph);
    const onlySentence = paragraphSentences[0] ?? "";
    const shortDeclarative = !onlySentence.endsWith("?") && onlySentence.split(/\s+/u).length <= 12;
    run = paragraphSentences.length === 1 && (onlySentence.endsWith("?") || shortDeclarative) ? run + 1 : 0;
    if (run >= 3) {
      issues.push({
        code: "isolated_one_liners",
        message: "Three or more consecutive questions or short declaratives are isolated as one-line paragraphs.",
        severity: "warning"
      });
      return;
    }
  }
}

function validateLivedProseMechanics(draft: ReportDraft, issues: ReportValidationIssue[]) {
  const text = readerFacingText(draft);
  const writerNotes = [
    "this report",
    "this section is about",
    "the question becomes",
    "the point is",
    "what matters here is",
    "this distinction matters",
    "enters this report"
  ];
  const genericAdvice = [
    "listen to your body",
    "protect your energy",
    "honor your needs",
    "prioritize self-care",
    "trust the evidence"
  ];
  for (const phrase of writerNotes.filter((candidate) => phrasePresent(text, candidate))) {
    issues.push({
      code: "writer_note_leakage",
      message: `Reader-facing output contains writer-facing report language: ${phrase}.`,
      severity: "error"
    });
  }
  for (const phrase of genericAdvice.filter((candidate) => phrasePresent(text, candidate))) {
    issues.push({
      code: "generic_advice",
      message: `Reader-facing output contains generic advice instead of a situated practical change: ${phrase}.`,
      severity: "error"
    });
  }
  if (/^\s*(?:#{1,6}\s*)?(?:ASTROLOGY|LIVED FACT|CAUSE|CONSEQUENCE|CONTRADICTION|DO NOT ASSUME)\s*(?::|$)/mu.test(text)) {
    issues.push({
      code: "internal_scaffold_leakage",
      message: "Reader-facing output exposes the internal lived-prose extraction scaffold.",
      severity: "error"
    });
  }
}

function validateDeepDiveKeyDates(draft: ReportDraft, issues: ReportValidationIssue[]) {
  for (const section of draft.sections ?? []) {
    if (!/^key dates$/iu.test(section.heading?.trim() ?? "")) continue;
    const lines = (section.body ?? "").split("\n")
      .map((line) => line.trim().replace(/^[-*]\s+/u, "").replaceAll("**", ""))
      .filter(Boolean);
    for (const line of lines) {
      const fields = line.split("·").map((field) => field.trim());
      const validSentence = fields.length === 4 && sentences(fields[2] ?? "").length === 1;
      if (fields.length !== 4 || !fields.every(Boolean) || !validSentence) {
        issues.push({
          code: "deep_dive_key_date_format",
          message: "Deep-dive key dates require DATE · TITLE · one sentence · attribution with no category tag.",
          severity: "error"
        });
      }
    }
  }
}

function validateLoveBannedVocabulary(draft: ReportDraft, issues: ReportValidationIssue[]) {
  const text = draftText(draft);
  const banned = ["soulmate", "twin flame", "divine union", "your person"]
    .filter((phrase) => phrasePresent(text, phrase));
  for (const phrase of banned) {
    issues.push({
      code: "love_banned_vocabulary",
      message: `Love & Connection output contains banned vocabulary: ${phrase}.`,
      severity: "error"
    });
  }
}

function validateStatusBranching(draft: ReportDraft, issues: ReportValidationIssue[]) {
  const branches = draftText(draft).match(
    /\bif you(?: are|'re) (?:single|partnered|dating|separating|not looking|in an undefined connection|in an established relationship)\b/giu
  ) ?? [];
  if (branches.length >= 3) {
    issues.push({
      code: "status_branching",
      message: "Three or more relationship-status branches replace status-neutral relationship experience language.",
      severity: "warning"
    });
  }
}

function validateSexInvention(draft: ReportDraft, issues: ReportValidationIssue[]) {
  const inventionTerms = ["dysfunction", "infidelity", "pregnancy", "fertility"];
  const disclaimer = /\b(?:not|never|do not|does not|don't|cannot|can't|without|no evidence|do not assume|never invent)\b/iu;
  for (const sentence of blocks(draft).flatMap((block) => sentences(block))) {
    for (const term of inventionTerms) {
      if (phrasePresent(sentence, term) && !disclaimer.test(sentence)) {
        issues.push({
          code: "sex_invention",
          message: `Love & Connection output asserts an unsupported sex-related condition: ${term}.`,
          severity: "error"
        });
      }
    }
  }
}

function validatePersonalHealthCeiling(draft: ReportDraft, issues: ReportValidationIssue[]) {
  const text = readerFacingText(draft);
  const bannedAdvice = [
    "listen to your body",
    "protect your energy",
    "honor your needs",
    "prioritize self-care",
    "self-care",
    "wellness journey",
    "healing journey",
    "holding space"
  ];
  for (const phrase of bannedAdvice.filter((candidate) => phrasePresent(text, candidate))) {
    issues.push({
      code: "personal_health_banned_advice",
      message: `Personal & Health output contains banned wellness language: ${phrase}.`,
      severity: "error"
    });
  }

  const unsupportedHealthPrediction = /\b(?:you|your body)\s+(?:will|may|might|could|can)\s+(?:develop|experience|suffer(?:\s+from)?|be diagnosed with|recover from|decline from)\s+(?:an?\s+)?(?:illness|disease|injury|diagnosis|symptoms?|medical (?:event|crisis)|health crisis)\b/giu;
  for (const match of text.match(unsupportedHealthPrediction) ?? []) {
    issues.push({
      code: "personal_health_medical_invention",
      message: `Personal & Health output predicts an unsupported medical state or outcome: ${match}.`,
      severity: "error"
    });
  }

  const unsupportedSpiritualClaims = ["spiritual awakening", "psychic ability", "crisis of faith"];
  const disclaimer = /\b(?:not|never|cannot|can't|do not|does not|don't|without)\b/iu;
  for (const sentence of blocks(draft).flatMap((block) => sentences(block))) {
    for (const phrase of unsupportedSpiritualClaims) {
      if (phrasePresent(sentence, phrase) && !disclaimer.test(sentence)) {
        issues.push({
          code: "personal_health_spirituality_invention",
          message: `Personal & Health output predicts an unsupported spiritual condition: ${phrase}.`,
          severity: "error"
        });
      }
    }
    if (/\b(?:earn|earned|deserve|deserved)\s+(?:a\s+)?rest\b/iu.test(sentence)) {
      issues.push({
        code: "personal_health_moralizing",
        message: "Personal & Health output frames rest as a reward.",
        severity: "error"
      });
    }
  }
}

export function validateReportDraft(
  draft: ReportDraft,
  payload: ReportGenerationPayload,
  options: ReportValidatorOptions = {}
) {
  const issues: ReportValidationIssue[] = [];
  const text = draftText(draft);
  const normalized = text.toLowerCase();
  const signatureNouns = options.signatureNouns ?? ["application"];
  const signatureNounCap = options.signatureNounCap ?? 3;

  if (text.includes("—")) issues.push({ code: "em_dash", message: "Report output contains an em dash." });
  if (/\bwhether\b/iu.test(text)) issues.push({ code: "whether", message: "Report output contains whether." });
  if (/\b(?:i think|i'm watching|i am watching|this makes me think)\b/iu.test(text)) {
    issues.push({ code: "astrologer_persona", message: "Report output uses astrologer persona." });
  }

  for (const noun of signatureNouns) {
    const count = normalized.match(new RegExp(`\\b${escaped(noun.toLowerCase())}s?\\b`, "gu"))?.length ?? 0;
    if (count > signatureNounCap) {
      issues.push({ code: "lexical_budget", message: `${noun} exceeds the configured lexical budget.` });
    }
  }

  const manifestationRecords = payload.manifestationSets.map((item) => item.record);
  for (const block of blocks(draft)) {
    const blockSentences = sentences(block);
    let shortManifestationRun = 0;
    for (const [index, sentence] of blockSentences.entries()) {
      const manifestations = manifestationRecords.flatMap((record) => record.possibleLivedManifestations)
        .filter((manifestation) => phrasePresent(sentence, manifestation));
      const exclusions = manifestationRecords.flatMap((record) => record.doNotAssume)
        .filter((exclusion) => phrasePresent(sentence, exclusion));
      const framed = hedged(sentence) || (index > 0 && hedged(blockSentences[index - 1]));
      if (manifestations.length > 0 && !framed) {
        issues.push({ code: "possibility_language", message: `Manifestation is asserted without may/can/could/might framing: ${sentence}` });
      }
      if (exclusions.length > 0 && !framed && !/\b(?:not|never|without|avoid|do not)\b/iu.test(sentence)) {
        issues.push({ code: "do_not_assume", message: `DO NOT ASSUME item is asserted as fact: ${sentence}` });
      }
      if (manifestations.length > 5) {
        issues.push({ code: "menu_size", message: `Manifestation menu exceeds five items: ${sentence}` });
      }
      shortManifestationRun = manifestations.length > 0 && sentence.split(/\s+/u).length <= 12
        ? shortManifestationRun + 1
        : 0;
      if (shortManifestationRun > 4) {
        issues.push({ code: "menu_size", message: "Manifestation menu exceeds four short sentences." });
      }
    }
  }

  if (/\bsaturn return\b/iu.test(text) && !hasActualSaturnReturn(payload.frozenFacts)) {
    issues.push({ code: "saturn_return_non_return_year", message: "Saturn Return copy appears outside an actual Saturn Return year." });
  }

  if (payload.reportHorizon === "1_month") {
    for (const section of draft.sections ?? []) {
      if (/^(work|love|health|home|money|family|relationships?|career)$/iu.test(section.heading?.trim() ?? "")
        && !(section.body ?? "").trim()) {
        issues.push({ code: "empty_domain_section", message: `Empty one-month domain section: ${section.heading}` });
      }
    }
  }

  if (payload.reportHorizon === "12_months") {
    const startYear = Number(stringValue(reportWindowFacts(payload.frozenFacts).startsAt).slice(0, 4));
    const nextYear = Number.isFinite(startYear) ? startYear + 1 : 0;
    for (const section of draft.sections ?? []) {
      if (/\bin review\b/iu.test(section.heading ?? "") && nextYear
        && new RegExp(`\\b${nextYear}\\b`, "u").test(section.body ?? "")) {
        issues.push({ code: "next_year_in_current_review", message: "Current-year review contains a next-year event." });
      }
    }
  }

  validateLivedProseMechanics(draft, issues);
  const domainValidators = REPORT_DOMAIN_CONFIG[payload.reportDomain].validators;
  if (domainValidators.includes("natural_paragraphs")) validateNaturalParagraphs(draft, issues);
  if (domainValidators.includes("money_abstraction")) validateMoneyAbstractions(draft, issues);
  if (domainValidators.includes("key_date_format")) validateDeepDiveKeyDates(draft, issues);
  if (domainValidators.includes("love_banned_vocabulary")) validateLoveBannedVocabulary(draft, issues);
  if (domainValidators.includes("status_branching")) validateStatusBranching(draft, issues);
  if (domainValidators.includes("sex_invention")) validateSexInvention(draft, issues);
  if (domainValidators.includes("personal_health_ceiling")) validatePersonalHealthCeiling(draft, issues);

  return issues;
}
