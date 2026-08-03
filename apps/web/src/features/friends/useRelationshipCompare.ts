import { useEffect, useState } from "react";
import { relationshipContextFromRole } from "../../services/relationshipContext";
import {
  compareRelationship,
  isTldrAstroApiConfigured
} from "../../services/tldrastroApi";
import type {
  RelationshipCompareResponse,
  TldrAstroChartSettings,
  TldrAstroSubject
} from "../../services/tldrastroApi";
import type { RelationshipCompareStatus } from "./RelationshipApiSummary";

type UseRelationshipCompareOptions = {
  enabled: boolean;
  personA: TldrAstroSubject | null;
  personB: TldrAstroSubject | null;
  relationshipType?: string | null;
  settings: TldrAstroChartSettings;
};

export function useRelationshipCompare({
  enabled,
  personA,
  personB,
  relationshipType,
  settings
}: UseRelationshipCompareOptions) {
  const [response, setResponse] = useState<RelationshipCompareResponse | null>(null);
  const [status, setStatus] = useState<RelationshipCompareStatus>("idle");

  useEffect(() => {
    if (!enabled || !isTldrAstroApiConfigured || !personA || !personB) {
      setResponse(null);
      setStatus("idle");
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setStatus("loading");

    compareRelationship({
      personA,
      personB,
      relationshipContext: relationshipContextFromRole(relationshipType),
      settings,
      includeContentFacts: true
    }, {
      signal: controller.signal
    })
      .then((nextResponse) => {
        if (!cancelled) {
          setResponse(nextResponse);
          setStatus("ready");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.warn("TLDR Astro relationship compare API failed; using local relationship rows.", error);
          setResponse(null);
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [enabled, personA, personB, relationshipType, settings]);

  return { response, status };
}
