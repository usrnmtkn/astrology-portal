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
  const { NatalAspectPatternsSection } = await vite.ssrLoadModule("/apps/web/src/features/you/NatalAspectPatternsSection.tsx");
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
            sections: [{ id: "current_emphasis", body: "The supporting pattern is loudest." }]
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
  assert.equal(child.activationEmphasis, "primary");
  assert.equal(child.activationExpanded, true);
  assert.equal(inactive.activationEmphasis, "none");
  assert.equal(inactive.activationExpanded, false);

  const html = renderToStaticMarkup(React.createElement(NatalAspectPatternsSection, { items, status: "ready" }));
  const [
    parentNatalPosition,
    parentActivePosition,
    supportingPosition,
    childNatalPosition,
    childActivePosition
  ] = renderedTextPositions(html, [
    "Grand Square natal headline",
    "Grand Square active headline",
    "Supporting pattern detail",
    "T-square supporting headline",
    "T-square active headline"
  ]);

  assert.ok(parentNatalPosition < parentActivePosition, "Activation callout must follow natal copy in the parent card.");
  assert.ok(parentActivePosition < supportingPosition, "Supporting patterns must remain nested after parent activation copy.");
  assert.ok(supportingPosition < childNatalPosition, "Contained natal pattern copy must render inside supporting detail.");
  assert.ok(childNatalPosition < childActivePosition, "Contained activation copy must stay inside the contained natal pattern.");
  assert.match(html, /<summary><span><em>Active now<\/em><strong>T-square active headline<\/strong><\/span>/, "Activation callout must use the Active now title and resolved headline.");
  assert.match(html, /natal-pattern-card__activation--primary/, "Primary current activation should receive visual emphasis.");
  assert.match(html, /natal-pattern-card__activation--secondary/, "Secondary current activation should remain visible without primary emphasis.");
  assert.match(html, /Current emphasis/, "Known activation section IDs should render as reader labels.");
  assert.match(html, /Timing/, "Known activation timing section should render as a reader label.");
  assert.doesNotMatch(html, /Watch for/, "Empty activation sections must not render their heading.");
  assert.doesNotMatch(html, /hidden-from-reader|templateId|usedFallback|missingSlots|validationWarnings|primaryActivationId|triggerCount|movingBodies|targetedNatalPlanets/, "Reader HTML must not expose activation diagnostics, provenance, or trigger internals.");

  const inactiveSnapshot = {
    aspectPatterns: {
      interpretationContexts: snapshot.aspectPatterns.interpretationContexts,
      resolvedCopy: snapshot.aspectPatterns.resolvedCopy
    }
  };
  const inactiveHtml = renderToStaticMarkup(React.createElement(NatalAspectPatternsSection, {
    items: natalAspectPatternReaderItems(inactiveSnapshot),
    status: "ready"
  }));
  assert.doesNotMatch(inactiveHtml, /Active now/, "Reader must not render an empty activation placeholder.");
  assert.doesNotMatch(inactiveHtml, /nothing active|no active/i, "Reader must not render a global inactive-state message.");
} finally {
  await vite.close();
}

console.log("Natal aspect-pattern activation reader tests passed.");
