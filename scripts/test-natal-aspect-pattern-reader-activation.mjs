import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function context(patternId, patternType, rank, overrides = {}) {
  return {
    version: "test",
    patternId,
    patternType,
    display: {
      rank,
      isPrimary: rank === 1,
      isContained: false,
      parentPatternIds: [],
      childPatternIds: [],
      ...overrides.display
    },
    members: [],
    geometry: {},
    roles: {},
    derivedPoints: [],
    ranking: {},
    copyInstructions: {},
    provenance: {}
  };
}

function resolvedCopy(patternId, patternType, headline, overview, sections = []) {
  return {
    patternId,
    patternType,
    source: {
      recordId: `aspect-pattern-copy/${patternType}/test`,
      contentLevel: "governed_fallback",
      status: "approved",
      resolverVersion: "aspect_pattern_copy_resolver_v1"
    },
    content: { eyebrow: "Chart pattern", headline, overview, sections },
    diagnostics: { templateId: `aspect-pattern-copy/${patternType}/test`, usedFallback: true, missingSlots: [], skippedSections: [] }
  };
}

function resolvedActivationCopy(patternId, patternType, headline, overview, sections = []) {
  return {
    patternId,
    patternType,
    triggerSummary: { movingBodies: ["Mars"], targetedNatalPlanets: ["Moon"] },
    source: {
      recordId: `aspect-pattern-activation-copy/${patternType}/test`,
      contentLevel: "governed_fallback",
      status: "approved",
      resolverVersion: "aspect_pattern_activation_copy_resolver_v1"
    },
    content: { headline, overview, sections },
    diagnostics: { templateId: `aspect-pattern-activation-copy/${patternType}/test`, usedFallback: true, missingSlots: [], skippedSections: [] }
  };
}

function activationContext(patternId, patternType, rank, overrides = {}) {
  const trigger = {
    activationId: `${patternId}-activation`,
    movingBody: "Mars",
    targetNatalPlanet: "Moon",
    targetRoles: ["member"],
    aspectType: "square",
    orb: 0.5,
    applying: true,
    exactAt: "2026-07-20T12:00:00.000Z",
    score: 10,
    reasons: [],
    ...overrides.trigger
  };

  return {
    version: "test",
    patternId,
    patternType,
    natalInterpretationContextId: `${patternId}-natal-context`,
    calculatedFor: "2026-07-19T00:00:00.000Z",
    display: {
      natalRank: rank,
      currentRank: rank,
      isCurrentlyPrimary: rank === 1,
      parentPatternIds: [],
      childPatternIds: [],
      ...overrides.display
    },
    natalPattern: { confidence: "strong" },
    triggers: [trigger],
    primaryTrigger: {
      activationId: trigger.activationId,
      selectionReason: "highest_activation_score"
    },
    activationSummary: {},
    ranking: {},
    copyInstructions: {},
    provenance: {}
  };
}

function renderedTextPositions(html, snippets) {
  return snippets.map((snippet) => {
    const position = html.indexOf(snippet);
    assert.notEqual(position, -1, `Expected rendered HTML to include: ${snippet}`);
    return position;
  });
}

const vite = await createServer({
  root: repoRoot,
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
  logLevel: "error"
});

try {
  const React = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const {
    fetchNatalAspectPatternsWithCopy,
    natalAspectPatternPillSummary,
    natalAspectPatternReaderItems
  } = await vite.ssrLoadModule("/apps/web/src/services/natalAspectPatterns.ts");
  const {
    NatalAspectPatternActivationsSection,
    NatalAspectPatternsSection
  } = await vite.ssrLoadModule("/apps/web/src/features/you/NatalAspectPatternsSection.tsx");
  const capturedRequests = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url, init) => {
    capturedRequests.push({ url: String(url), method: init?.method });
    return {
      ok: true,
      json: async () => ({
        ok: true,
        sky: {
          aspectPatterns: {
            interpretationContexts: [],
            resolvedCopy: []
          }
        }
      })
    };
  };

  await fetchNatalAspectPatternsWithCopy({ latitude: 40, longitude: -74, label: "Test City", timeZone: "America/New_York" }, new Date("2026-07-19T00:00:00.000Z"));
  await fetchNatalAspectPatternsWithCopy(
    { latitude: 40, longitude: -74, label: "Test City", timeZone: "America/New_York" },
    new Date("2026-07-19T00:00:00.000Z"),
    { includeActivationCopy: true }
  );
  await fetchNatalAspectPatternsWithCopy(
    { latitude: 40, longitude: -74, label: "Test City", timeZone: "America/New_York" },
    new Date("2026-07-19T00:00:00.000Z"),
    { timeKnown: false }
  );

  globalThis.fetch = originalFetch;

  const defaultUrl = new URL(capturedRequests[0].url, "http://localhost");
  const activationUrl = new URL(capturedRequests[1].url, "http://localhost");
  const unknownTimeUrl = new URL(capturedRequests[2].url, "http://localhost");
  assert.equal(capturedRequests[0].method, "GET");
  assert.equal(defaultUrl.searchParams.get("includeAspectPatterns"), "true");
  assert.equal(defaultUrl.searchParams.get("includeAspectPatternCopy"), "true", "Reader must request governed resolver copy.");
  assert.equal(defaultUrl.searchParams.has("timeKnown"), false, "Known birth time is the default and needs no request field.");
  assert.equal(defaultUrl.searchParams.has("includeAspectPatternActivation"), false);
  assert.equal(defaultUrl.searchParams.has("includeAspectPatternActivationContexts"), false);
  assert.equal(defaultUrl.searchParams.has("includeAspectPatternActivationCopy"), false);
  assert.equal(activationUrl.searchParams.get("includeAspectPatterns"), "true");
  assert.equal(activationUrl.searchParams.get("includeAspectPatternCopy"), "true");
  assert.equal(activationUrl.searchParams.get("includeAspectPatternActivation"), "true");
  assert.equal(activationUrl.searchParams.get("includeAspectPatternActivationContexts"), "true");
  assert.equal(activationUrl.searchParams.get("includeAspectPatternActivationCopy"), "true", "Activation copy must come from the governed resolver too.");
  assert.equal(unknownTimeUrl.searchParams.get("timeKnown"), "false", "Unknown birth time must reach the API explicitly.");

  const patternFixture = (id, type, confidence, maximumOrb) => ({
    id,
    type,
    planets: [],
    sourceAspectIds: [],
    roles: {},
    derivedPoints: [],
    geometry: {
      orbPolicyId: "test",
      maximumOrb,
      averageOrb: maximumOrb,
      weakestAspectOrb: maximumOrb,
      isOutOfSign: false,
      confidence,
      warnings: []
    }
  });

  assert.deepEqual(
    natalAspectPatternPillSummary({
      aspectPatterns: {
        patterns: [
          patternFixture("grand-cross", "grand_square", "strong", 1.5),
          patternFixture("t-square", "t_square", "exact", 0.5),
          patternFixture("yod", "yod", "exact", 0.8),
          patternFixture("wide-kite", "kite", "wide", 2)
        ],
        relationships: [
          {
            parentPatternId: "grand-cross",
            childPatternId: "t-square",
            relationship: "contains"
          }
        ],
        ranking: {
          displayOrder: ["yod", "grand-cross", "t-square", "wide-kite"]
        }
      }
    }),
    {
      label: "Yod +1",
      patternNames: ["Yod", "Grand Cross"]
    },
    "the pill should show ranked exact/strong parent patterns and collapse contained children"
  );

  assert.deepEqual(
    natalAspectPatternPillSummary({
      aspectPatterns: {
        patterns: [
          patternFixture("wide-parent", "grand_square", "wide", 2.5),
          patternFixture("exact-child", "t_square", "exact", 0.5)
        ],
        relationships: [
          {
            parentPatternId: "wide-parent",
            childPatternId: "exact-child",
            relationship: "contains"
          }
        ],
        ranking: {
          displayOrder: ["wide-parent", "exact-child"]
        }
      }
    }),
    {
      label: "T-square",
      patternNames: ["T-square"]
    },
    "a confident child should remain visible when its parent is not confident"
  );

  assert.equal(
    natalAspectPatternPillSummary({
      aspectPatterns: {
        patterns: [patternFixture("wide-yod", "yod", "wide", 2.5)],
        relationships: [],
        ranking: { displayOrder: ["wide-yod"] }
      }
    }),
    null,
    "wide patterns should not receive a discovery pill"
  );

  const parentId = "grand-square-a";
  const childId = "t-square-a";
  const inactiveId = "grand-trine-a";
  const interpretationContexts = [
    context(parentId, "grand_square", 1, { display: { childPatternIds: [childId] } }),
    context(childId, "t_square", 2, { display: { isContained: true, parentPatternIds: [parentId] } }),
    context(inactiveId, "grand_trine", 3)
  ];
  const natalResolvedCopy = [
    resolvedCopy(parentId, "grand_square", "Grand Cross across Sun, Moon, Mars, and Saturn", "Sun, Moon, Mars, and Saturn are tied into a four-part pattern.", [
      { id: "how_it_works", body: "Pressure can move around the whole square." },
      { id: "package_1", body: "leaked generic package body" }
    ]),
    resolvedCopy(childId, "t_square", "T-Square with Mars at the action point", "Sun, Moon, and Mars form a pressure pattern.", [
      { id: "watch_for", body: "Watch for overcorrecting through Mars." },
      { id: "confidence_note", body: "This pattern is wide, so read it as a loose tendency rather than an exact setup." }
    ]),
    resolvedCopy(inactiveId, "grand_trine", "Grand Trine linking Moon, Venus, and Jupiter", "Moon, Venus, and Jupiter can move together with less friction.")
  ];
  const snapshot = {
    aspectPatterns: {
      interpretationContexts,
      resolvedCopy: natalResolvedCopy,
      activation: {
        currentDisplayOrder: [childId, parentId],
        activations: [
          {
            id: `${childId}-activation`,
            patternId: childId,
            calculatedFor: "2026-07-19T00:00:00.000Z",
            trigger: {
              movingBody: "Mars",
              targetNatalPlanet: "Moon",
              targetRoles: ["member"],
              aspectType: "square",
              orb: 0.5,
              applying: true,
              exactAt: "2026-07-20T12:00:00.000Z"
            },
            linkedPatternIds: [],
            score: {},
            reasons: []
          }
        ],
        interpretationContexts: [
          activationContext(parentId, "grand_square", 2, {
            trigger: {
              movingBody: "Saturn",
              exactAt: "2026-08-01T12:00:00.000Z"
            },
            display: { parentPatternIds: [], childPatternIds: [childId] }
          }),
          activationContext(childId, "t_square", 1, {
            display: { parentPatternIds: [parentId], childPatternIds: [] }
          })
        ],
        resolvedCopy: [
          resolvedActivationCopy(parentId, "grand_square", "Saturn is contacting one corner of your Grand Cross", "Saturn is contacting Moon inside your Grand Cross.", [
            { id: "package_1", body: "leaked generic activation package body" }
          ]),
          resolvedActivationCopy(childId, "t_square", "Mars is pressing on your T-Square response point", "Mars is contacting Moon, the apex of your T-Square.", [
            { id: "current_emphasis", body: "The place where you usually respond to pressure is easier to notice for now." }
          ])
        ]
      }
    }
  };

  const items = natalAspectPatternReaderItems(snapshot);
  const parent = items.find((item) => item.patternId === parentId);
  const child = items.find((item) => item.patternId === childId);
  const inactive = items.find((item) => item.patternId === inactiveId);

  assert.ok(parent);
  assert.ok(child);
  assert.ok(inactive);
  assert.equal(parent.copy.source.resolverVersion, "aspect_pattern_copy_resolver_v1", "Reader items must carry governed resolver copy verbatim.");
  assert.equal(parent.activationEmphasis, "secondary");
  assert.equal(parent.activationExpanded, false);
  assert.equal(parent.activationTimingWindow?.exactLabel, "Aug 1, 2026");
  assert.equal(child.activationEmphasis, "primary");
  assert.equal(child.activationExpanded, true);
  assert.deepEqual(child.activationTimingWindow, {
    startLabel: "Jul 14, 2026",
    exactLabel: "Jul 20, 2026",
    endLabel: "Jul 26, 2026",
    rangeLabel: "Jul 14, 2026 - Jul 26, 2026"
  });
  assert.equal(inactive.activationEmphasis, "none");
  assert.equal(inactive.activationExpanded, false);

  const rawOnlyItems = natalAspectPatternReaderItems({
    aspectPatterns: {
      interpretationContexts,
      resolvedCopy: natalResolvedCopy,
      activation: {
        currentDisplayOrder: snapshot.aspectPatterns.activation.currentDisplayOrder,
        activations: snapshot.aspectPatterns.activation.activations
      }
    }
  });
  const rawOnlyChild = rawOnlyItems.find((item) => item.patternId === childId);
  assert.equal(rawOnlyChild?.activationTimingWindow?.exactLabel, "Jul 20, 2026", "Reader must derive timing from raw activation triggers when activation contexts are absent.");

  const missingCopyItems = natalAspectPatternReaderItems({
    aspectPatterns: {
      interpretationContexts,
      resolvedCopy: natalResolvedCopy.slice(0, 2)
    }
  });
  assert.equal(missingCopyItems.length, 2, "Contexts without governed resolved copy must be skipped, never rendered bare.");

  const html = renderToStaticMarkup(React.createElement(NatalAspectPatternsSection, { items, status: "ready" }));
  assert.match(html, /Grand Cross across Sun, Moon, Mars, and Saturn/, "The primary pattern quote must remain visible.");
  assert.match(html, />Details</, "The compact pattern preview must expose its detail reader.");
  assert.doesNotMatch(html, /T-Square with Mars at the action point/, "Contained pattern copy must move with its parent into the detail reader.");
  assert.doesNotMatch(html, /Reading note/, "Long-form pattern sections must not render on the natal overview.");
  assert.doesNotMatch(html, /This pattern is wide, so read it as a loose tendency/, "Confidence notes must move into the detail reader.");
  assert.doesNotMatch(html, /package 1|package_1|leaked generic/, "Generic package sections must never render, as heading or body.");
  assert.doesNotMatch(html, /Mars is pressing on your T-Square response point|Saturn is contacting one corner of your Grand Cross|Active chart patterns|natal-pattern-card__activation/, "Natal pattern cards must not render temporary activation copy.");

  const activationHtml = renderToStaticMarkup(React.createElement(NatalAspectPatternActivationsSection, { items }));
  const [
    activationSectionPosition,
    childActivePosition,
    parentActivePosition
  ] = renderedTextPositions(activationHtml, [
    "Active chart patterns",
    "Mars is pressing on your T-Square response point",
    "Saturn is contacting one corner of your Grand Cross"
  ]);

  assert.ok(activationSectionPosition < childActivePosition, "Activation copy must live in the dedicated active-pattern section.");
  assert.ok(childActivePosition < parentActivePosition, "Primary active pattern should render before secondary active patterns.");
  assert.match(activationHtml, /updates-aspect-row friend-transit-row active-chart-pattern-row active-chart-pattern-row--primary/, "Primary current activation should use the transit row card treatment.");
  assert.match(activationHtml, /updates-aspect-row friend-transit-row active-chart-pattern-row active-chart-pattern-row--secondary/, "Secondary current activation should remain visible in the transit row card treatment.");
  assert.match(activationHtml, /Current emphasis: The place where you usually respond to pressure/, "Approved activation sections must render with their reader labels.");
  assert.doesNotMatch(activationHtml, /package 1|package_1|leaked generic/, "Generic package sections must never render in activation callouts.");
  assert.doesNotMatch(activationHtml, /natal-pattern-card__activation|<summary>|active-chart-pattern-row--writeup/, "Activation callouts must not use the natal-pattern collapsible card treatment or split support sections into separate cards.");
  assert.match(activationHtml, /Duration/, "Activation timing should render as a visible duration line.");
  assert.match(activationHtml, /Jul 14, 2026 - Jul 26, 2026 \(Exact: Jul 20, 2026\)/, "Activation duration must show a calculated range with an exact date.");
  assert.doesNotMatch(activationHtml, /Start Jul 14, 2026|Exact Jul 20, 2026|End Jul 26, 2026/, "Activation duration must not render start, exact, and end as separate fragments.");
  assert.doesNotMatch(activationHtml, /<h4>Timing<\/h4>/, "Activation timing should not duplicate as a subsection heading.");
  assert.doesNotMatch(html, /hidden-from-reader|templateId|usedFallback|missingSlots|validationWarnings|primaryActivationId|triggerCount|movingBodies|targetedNatalPlanets/, "Reader HTML must not expose activation diagnostics, provenance, or trigger internals.");
  assert.doesNotMatch(activationHtml, /hidden-from-reader|templateId|usedFallback|missingSlots|validationWarnings|primaryActivationId|triggerCount|movingBodies|targetedNatalPlanets/, "Activation HTML must not expose activation diagnostics, provenance, or trigger internals.");

  const inactiveSnapshot = {
    aspectPatterns: {
      interpretationContexts,
      resolvedCopy: natalResolvedCopy
    }
  };
  const inactiveItems = natalAspectPatternReaderItems(inactiveSnapshot);
  const inactiveHtml = renderToStaticMarkup(React.createElement(NatalAspectPatternsSection, {
    items: inactiveItems,
    status: "ready"
  }));
  const inactiveActivationHtml = renderToStaticMarkup(React.createElement(NatalAspectPatternActivationsSection, { items: inactiveItems }));
  assert.equal(inactiveActivationHtml, "", "Transit tab must not render an empty activation placeholder.");
  assert.doesNotMatch(inactiveHtml, /nothing active|no active/i, "Reader must not render a global inactive-state message.");
  assert.doesNotMatch(inactiveActivationHtml, /nothing active|no active/i, "Transit tab must not render a global inactive-state message.");
} finally {
  await vite.close();
}

console.log("Natal aspect-pattern activation reader tests passed.");
