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

function resolvedCopy(patternId, patternType, content) {
  return {
    patternId,
    patternType,
    source: {
      contentLevel: "source_grounded_template",
      resolverVersion: "test"
    },
    content: {
      eyebrow: "",
      headline: `${patternType} natal headline`,
      overview: `${patternType} natal overview`,
      sections: [],
      ...content
    },
    diagnostics: {}
  };
}

function activationCopy(patternId, patternType, content) {
  return {
    patternId,
    patternType,
    calculatedFor: "2026-07-19T00:00:00.000Z",
    source: {
      recordId: `${patternId}-activation-record`,
      contentLevel: "authored",
      status: "approved",
      resolverVersion: "test"
    },
    triggerSummary: {
      primaryActivationId: `${patternId}-activation`,
      triggerCount: 1,
      movingBodies: ["Saturn"],
      targetedNatalPlanets: ["Mars"],
      timingState: "applying"
    },
    content: {
      eyebrow: "",
      headline: `${patternType} active headline`,
      overview: `${patternType} active overview`,
      sections: [],
      ...content
    },
    diagnostics: {
      templateId: "hidden-from-reader",
      usedFallback: false,
      missingSlots: [],
      skippedSections: [],
      validationWarnings: []
    }
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

  globalThis.fetch = originalFetch;

  const defaultUrl = new URL(capturedRequests[0].url, "http://localhost");
  const activationUrl = new URL(capturedRequests[1].url, "http://localhost");
  assert.equal(capturedRequests[0].method, "GET");
  assert.equal(defaultUrl.searchParams.get("includeAspectPatterns"), "true");
  assert.equal(defaultUrl.searchParams.get("includeAspectPatternCopy"), "true");
  assert.equal(defaultUrl.searchParams.has("includeAspectPatternActivation"), false);
  assert.equal(defaultUrl.searchParams.has("includeAspectPatternActivationContexts"), false);
  assert.equal(defaultUrl.searchParams.has("includeAspectPatternActivationCopy"), false);
  assert.equal(activationUrl.searchParams.get("includeAspectPatterns"), "true");
  assert.equal(activationUrl.searchParams.get("includeAspectPatternCopy"), "true");
  assert.equal(activationUrl.searchParams.get("includeAspectPatternActivation"), "true");
  assert.equal(activationUrl.searchParams.get("includeAspectPatternActivationContexts"), "true");
  assert.equal(activationUrl.searchParams.get("includeAspectPatternActivationCopy"), "true");

  const parentId = "grand-square-a";
  const childId = "t-square-a";
  const inactiveId = "grand-trine-a";
  const snapshot = {
    aspectPatterns: {
      interpretationContexts: [
        context(parentId, "grand_square", 1, { display: { childPatternIds: [childId] } }),
        context(childId, "t_square", 2, { display: { isContained: true, parentPatternIds: [parentId] } }),
        context(inactiveId, "grand_trine", 3)
      ],
      resolvedCopy: [
        resolvedCopy(parentId, "grand_square", {
          eyebrow: "Natal parent",
          headline: "Grand Square natal headline",
          overview: "Grand Square natal overview",
          sections: [{ id: "how_it_works", body: "Natal parent section." }]
        }),
        resolvedCopy(childId, "t_square", {
          headline: "T-square supporting headline",
          overview: "T-square natal overview"
        }),
        resolvedCopy(inactiveId, "grand_trine", {
          headline: "Grand Trine additional headline",
          overview: "Grand Trine natal overview"
        })
      ],
      activation: {
        currentDisplayOrder: ["missing-pattern", childId, parentId],
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
          activationCopy(parentId, "grand_square", {
            eyebrow: "Parent activation eyebrow",
            headline: "Grand Square active headline",
            overview: "Grand Square active overview",
            sections: [
              { id: "timing", body: "The parent activation is applying." },
              { id: "watch_for", body: "" }
            ]
          }),
          activationCopy(childId, "t_square", {
            headline: "T-square active headline",
            overview: "T-square active overview",
            sections: [
              { id: "current_emphasis", body: "The supporting pattern is loudest." },
              { id: "timing", body: "The supporting activation is exact today." }
            ]
          })
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
      interpretationContexts: snapshot.aspectPatterns.interpretationContexts,
      resolvedCopy: snapshot.aspectPatterns.resolvedCopy,
      activation: {
        currentDisplayOrder: snapshot.aspectPatterns.activation.currentDisplayOrder,
        activations: snapshot.aspectPatterns.activation.activations,
        resolvedCopy: snapshot.aspectPatterns.activation.resolvedCopy
      }
    }
  });
  const rawOnlyChild = rawOnlyItems.find((item) => item.patternId === childId);
  assert.equal(rawOnlyChild?.activationTimingWindow?.exactLabel, "Jul 20, 2026", "Reader must derive timing from raw activation triggers when activation contexts are absent.");

  const html = renderToStaticMarkup(React.createElement(NatalAspectPatternsSection, { items, status: "ready" }));
  const [
    parentNatalPosition,
    supportingPosition,
    childNatalPosition
  ] = renderedTextPositions(html, [
    "Grand Square natal headline",
    "Supporting pattern detail",
    "T-square supporting headline"
  ]);

  assert.ok(parentNatalPosition < supportingPosition, "Supporting patterns must remain nested after permanent natal copy.");
  assert.ok(supportingPosition < childNatalPosition, "Contained natal pattern copy must render inside supporting detail.");
  assert.doesNotMatch(html, /Grand Square active headline|T-square active headline|Active chart patterns|natal-pattern-card__activation/, "Natal pattern cards must not render temporary activation copy.");

  const activationHtml = renderToStaticMarkup(React.createElement(NatalAspectPatternActivationsSection, { items }));
  const [
    activationSectionPosition,
    childActivePosition,
    parentActivePosition
  ] = renderedTextPositions(activationHtml, [
    "Active chart patterns",
    "T-square active headline",
    "Grand Square active headline"
  ]);

  assert.ok(activationSectionPosition < childActivePosition, "Activation copy must live in the dedicated active-pattern section.");
  assert.ok(childActivePosition < parentActivePosition, "Primary active pattern should render before secondary active patterns.");
  assert.match(activationHtml, /updates-aspect-row friend-transit-row active-chart-pattern-row active-chart-pattern-row--primary/, "Primary current activation should use the transit row card treatment.");
  assert.match(activationHtml, /updates-aspect-row friend-transit-row active-chart-pattern-row active-chart-pattern-row--secondary/, "Secondary current activation should remain visible in the transit row card treatment.");
  assert.match(activationHtml, /T-square supporting headline/, "Activation callout must name the natal pattern.");
  assert.match(activationHtml, /updates-aspect-row__detail/, "Activation support sections should remain grouped inside the matching pattern card.");
  assert.doesNotMatch(activationHtml, /natal-pattern-card__activation|<summary>|active-chart-pattern-row--writeup/, "Activation callouts must not use the natal-pattern collapsible card treatment or split support sections into separate cards.");
  assert.match(activationHtml, /Current emphasis/, "Known activation section IDs should render as reader labels.");
  assert.match(activationHtml, /Duration/, "Activation timing should render as a visible duration line.");
  assert.match(activationHtml, /Jul 14, 2026 - Jul 26, 2026 \(Exact: Jul 20, 2026\)/, "Activation duration must show a calculated range with an exact date.");
  assert.doesNotMatch(activationHtml, /Start Jul 14, 2026|Exact Jul 20, 2026|End Jul 26, 2026/, "Activation duration must not render start, exact, and end as separate fragments.");
  assert.doesNotMatch(activationHtml, /The supporting activation is exact today\.|The parent activation is applying\./, "Activation duration must not use authored timing prose as the duration.");
  assert.doesNotMatch(activationHtml, /<h4>Timing<\/h4>/, "Activation timing should not duplicate as a subsection heading.");
  assert.doesNotMatch(activationHtml, /Watch for/, "Empty activation sections must not render their heading.");
  assert.doesNotMatch(html, /hidden-from-reader|templateId|usedFallback|missingSlots|validationWarnings|primaryActivationId|triggerCount|movingBodies|targetedNatalPlanets/, "Reader HTML must not expose activation diagnostics, provenance, or trigger internals.");
  assert.doesNotMatch(activationHtml, /hidden-from-reader|templateId|usedFallback|missingSlots|validationWarnings|primaryActivationId|triggerCount|movingBodies|targetedNatalPlanets/, "Activation HTML must not expose activation diagnostics, provenance, or trigger internals.");

  const inactiveSnapshot = {
    aspectPatterns: {
      interpretationContexts: snapshot.aspectPatterns.interpretationContexts,
      resolvedCopy: snapshot.aspectPatterns.resolvedCopy
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
