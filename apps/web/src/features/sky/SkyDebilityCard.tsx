import type { CmsGeneratedContentMap } from "../../content/cmsSurfaceOverrides";
import { resolveSkyDebilityCopy } from "../../content/skyDebilityCopy";
import { SkyDebilityInline } from "../../content/skyDebilityInline";
import { presentSkyDebilityParts, skyDebilityPlacementLinks, skyDebilityTemplateParts, type SkyDebilityDisplayPosition } from "../../content/skyDebilityPresentation";
import { traditionalSkyDebilities } from "../../services/planetSignDignity.mjs";

export function SkyDebilityCard({ generatedContent, positions }: {
  generatedContent?: CmsGeneratedContentMap;
  positions: readonly SkyDebilityDisplayPosition[];
}) {
  const snapshot = traditionalSkyDebilities(positions);
  const copy = resolveSkyDebilityCopy(generatedContent, snapshot);
  if (!copy.visible) return null;
  const links = skyDebilityPlacementLinks(copy.allPlacementKeys, positions);
  return (
    <section className="sky-today-ledger sky-debility-ledger" aria-label={copy.accessibleName}>
      <header className="sky-today-ledger__head">
        <h3>{copy.openingHook}</h3>
        <p><span>{copy.countLabel}</span><span>{copy.countUnit}</span></p>
      </header>
      <div className="sky-today-ledger__copy">
        {copy.paragraphTemplates.map((template, index) => <p key={index}>
          <SkyDebilityInline parts={presentSkyDebilityParts(skyDebilityTemplateParts(template, copy.slots), links)} />
        </p>)}
      </div>
    </section>
  );
}
