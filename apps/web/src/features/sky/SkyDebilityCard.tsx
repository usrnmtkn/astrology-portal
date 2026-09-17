import { Fragment } from "react";
import type { CmsGeneratedContentMap } from "../../content/cmsSurfaceOverrides";
import { resolveSkyDebilityCopy } from "../../content/skyDebilityCopy";
import { traditionalSkyDebilities } from "../../services/planetSignDignity.mjs";

function placementHref(planet: string, sign: string) {
  return `#sky/placement/${encodeURIComponent(planet.trim().toLowerCase())}/${encodeURIComponent(sign.trim().toLowerCase())}`;
}

export function SkyDebilityCard({
  generatedContent,
  positions
}: {
  generatedContent?: CmsGeneratedContentMap;
  positions: ReadonlyArray<{ planet: string; sign: string }>;
}) {
  const snapshot = traditionalSkyDebilities(positions);
  const copy = resolveSkyDebilityCopy(generatedContent, snapshot);

  return (
    <section className="sky-today-ledger sky-debility-ledger" aria-label={copy.accessibleName}>
      <header className="sky-today-ledger__head">
        <h3>
          <span>{copy.titleLead}</span>
          {" "}
          <span className="soft">{copy.titleSoft}</span>
        </h3>
        <p>
          <span>{copy.countLabel}</span>
          <span>{copy.countUnit}</span>
        </p>
      </header>
      <div className="sky-today-ledger__copy">
        <p>{copy.body}</p>
        {snapshot.planets.length > 0 ? (
          <p>
            {snapshot.planets.map((item, index) => (
              <Fragment key={item.planet}>
                {index > 0 ? ", " : null}
                <a
                  className="sky-daily-summary__link"
                  href={placementHref(item.planet, item.sign)}
                  aria-label={`Read about ${item.planet} in ${item.sign}`}
                >
                  {`${item.planet} in ${item.sign}`}
                </a>
              </Fragment>
            ))}
            .
          </p>
        ) : null}
      </div>
    </section>
  );
}
