import type { IncomingMessage, ServerResponse } from "node:http";
import {
  natalDailyTransitPeaksFor,
  natalTransitTimingFor,
  relationshipForecastDayFor,
  getRetrogradeHistory,
} from "../apps/web/src/services/ephemeris.js";
import { ASTROLOGY_CALCULATION_CONTRACT } from "../apps/web/src/services/astrologyFacts.js";
import { transitToNatalOrbLimit } from "../apps/web/src/astrologyConfig.js";
import { personalDateKey } from "../apps/web/src/services/personalDailyTransits.js";
import { relationshipForecastPolicy } from "../apps/web/src/services/relationshipForecast.js";
import { readNativeTransitInput } from "./_lib/native-transit-input.js";
import { readAdminJsonBody, AdminHttpError } from "./_lib/admin-http.js";

const dependencies = {
  daily: natalDailyTransitPeaksFor,
  timing: natalTransitTimingFor,
  forecast: relationshipForecastDayFor,
  history: getRetrogradeHistory,
};
/** Same Swiss calculations and presentation policy as usePersonalDailyTransits.
 * Only explicit geometry is accepted. This route cannot read accounts, change
 * sharing, write content, generate interpretations, or discover anyone's chart.
 */
export function createNativeTransitHandler(calculations = dependencies) {
  return async function handler(req: IncomingMessage, res: ServerResponse) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    const send = (status: number, value: unknown) => {
      res.statusCode = status;
      res.end(JSON.stringify(value));
    };
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      send(405, { error: "Use POST." });
      return;
    }
    if (
      !req.headers["content-type"]?.toLowerCase().startsWith("application/json")
    ) {
      send(415, { error: "Use JSON." });
      return;
    }
    let input: ReturnType<typeof readNativeTransitInput>;
    try {
      input = readNativeTransitInput(await readAdminJsonBody(req, 65_536));
    } catch (error) {
      send(
        error instanceof AdminHttpError && error.statusCode === 413 ? 413 : 400,
        { error: "Invalid transit calculation inputs." },
      );
      return;
    }
    try {
      const result =
        input.kind === "retrograde-history"
          ? await calculations.history({
              planet: input.planet,
              sign: input.sign,
              referenceDate: new Date(input.referenceAt),
            })
          : input.kind === "forecast"
            ? await calculations.forecast(
                input.pairs,
                personalDateKey(input.referenceAt, input.timeZone),
                input.timeZone,
              )
            : input.kind === "timings"
              ? await Promise.all(
                  input.contacts.map(async (contact) => ({
                    id: contact.id,
                    timing: await calculations.timing(
                      contact.planet,
                      contact.longitude,
                      contact.referenceAt,
                      {
                        aspectDegrees: contact.aspectDegrees,
                        presentationDegrees: transitToNatalOrbLimit(
                          contact.planet,
                        ),
                        timeZone: input.timeZone,
                      },
                    ),
                  })),
                )
              : input.kind === "daily"
                ? await calculations.daily(
                    input.planets,
                    input.targets,
                    input.referenceAt,
                    input.timeZone,
                  )
                : await calculations.timing(
                    input.planet,
                    input.longitude,
                    input.referenceAt,
                    {
                      aspectDegrees: input.aspectDegrees,
                      presentationDegrees: transitToNatalOrbLimit(input.planet),
                      timeZone: input.timeZone,
                    },
                  );
      send(200, {
        schema: "tldr-native-transit-facts/v1",
        calculationVersion: ASTROLOGY_CALCULATION_CONTRACT.calculationVersion,
        kind: input.kind,
        ...(input.kind === "forecast"
          ? { policy: relationshipForecastPolicy.version }
          : {}),
        referenceAt: input.referenceAt,
        timeZone: input.timeZone,
        result,
      });
    } catch {
      send(503, { error: "Transit timing could not load. Please try again." });
    }
  };
}
export default createNativeTransitHandler();
