import { Fragment } from "react";
import type { CmsGeneratedContentMap } from "../../content/cmsSurfaceOverrides";
import { skyPlacementLinkLabel, type BodyMotion } from "../../content/skyMotionLabels";
import { resolveSkyDebilityCopy } from "../../content/skyDebilityCopy";
import { isDisplayRetrograde } from "../../services/astrologyDisplay";
import { traditionalSkyDebilities } from "../../services/planetSignDignity.mjs";

function placementHref(planet: string, sign: string) {
  return `#sky/placement/${encodeURIComponent(planet.trim().toLowerCase())}/${encodeURIComponent(sign.trim().toLowerCase())}`;
}

function placementMotion(
  planet: string,
  positions: ReadonlyArray<{ planet: string; motion?: BodyMotion }>
): BodyMotion | undefined {
  const position = positions.find(item => item.planet.trim().toLowerCase() === planet.trim().toLowerCase());
  if (!position?.motion) return undefined;
  return isDisplayRetrograde({ planet: position.planet, motion: position.motion }) ? "retrograde" : undefined;
}

export function SkyDebilityCard({ generatedContent, positions }: {
  generatedContent?: CmsGeneratedContentMap;
  positions: ReadonlyArray<{ planet: string; sign: string; motion?: BodyMotion }>;
}) {
  const snapshot = traditionalSkyDebilities(positions);
  const copy = resolveSkyDebilityCopy(generatedContent, snapshot);
  if (!copy.visible) return null;
  return (
    <section className="sky-today-ledger sky-debility-ledger" aria-label={copy.accessibleName}>
      <header className="sky-today-ledger__head">
        <h3>{copy.openingHook}</h3>
        <p><span>{copy.countLabel}</span><span>{copy.countUnit}</span></p>
      </header>
      <div className="sky-today-ledger__copy">
        {copy.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        <p>{snapshot.planets.map((item, index) => {
          const label = skyPlacementLinkLabel(item.planet, item.sign, placementMotion(item.planet, positions));
          return (
            <Fragment key={item.planet}>
              {index > 0 ? ", " : null}
              <a className="sky-daily-summary__link" href={placementHref(item.planet, item.sign)} aria-label={`Read about ${label}`}>
                {label}
              </a>
            </Fragment>
          );
        })}.</p>
      </div>
    </section>
  );
}
