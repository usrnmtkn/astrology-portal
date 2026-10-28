import type { CmsGeneratedContentMap } from "../../content/cmsSurfaceOverrides";
import { useId, useState } from "react";
import { ChevronRight } from "lucide-react";
import { ReadingDialog } from "../../components/ReadingDialog";
import { FormattedProse } from "../../components/FormattedProse";
import { resolveSkyDebilityCopy, skyDebilityDefinition } from "../../content/skyDebilityCopy";
import { SkyDebilityInline } from "../../content/skyDebilityInline";
import { presentSkyDebilityParts, skyDebilityPlacementLinks, skyDebilityTemplateParts, type SkyDebilityDisplayPosition } from "../../content/skyDebilityPresentation";
import { traditionalSkyDebilities } from "../../services/planetSignDignity.mjs";
import { PlacementGlyphIcon } from "../../components/charts/PlacementRows";
import { pointGlyph } from "../../components/charts/chartAssets";

export function SkyDebilityCard({ generatedContent, positions }: {
  generatedContent?: CmsGeneratedContentMap;
  positions: readonly SkyDebilityDisplayPosition[];
}) {
  const snapshot = traditionalSkyDebilities(positions);
  const copy = resolveSkyDebilityCopy(generatedContent, snapshot, positions);
  const [definitionOpen, setDefinitionOpen] = useState(false);
  const definitionId = useId();
  const definition = skyDebilityDefinition(generatedContent);
  if (!copy.visible) return null;
  const cardLinks = skyDebilityPlacementLinks(copy.allPlacementKeys, positions);
  const links = skyDebilityPlacementLinks(copy.allPlacementKeys, positions, copy.interpretationKey || copy.classifiedContext ? "reading" : "compact");
  return (
    <section className="sky-today-ledger sky-debility-ledger" aria-label={copy.accessibleName}>
      <header className="sky-today-ledger__head">
        <h3>{copy.openingHook}</h3>
      </header>
      {definition && <button type="button" className="sky-debility-explain" onClick={() => setDefinitionOpen(true)}>What is dignity?</button>}
      <div className="sky-today-ledger__copy">
        {copy.paragraphTemplates.map((template, index) => <p key={index}>
          <SkyDebilityInline highlightCount={false} parts={presentSkyDebilityParts(skyDebilityTemplateParts(template, copy.slots), links)} />
        </p>)}
      </div>
      <div className="sky-debility-cards">
        {snapshot.planets.map((position, index) => <a className="sky-debility-card" key={position.planet}
          href={`#sky/placement/${position.planet.toLowerCase().replaceAll(" ", "-")}/${position.sign.toLowerCase()}`}>
          <PlacementGlyphIcon className="sky-debility-card__glyph" fallback={pointGlyph(position.planet)} pointName={position.planet} signName={position.sign} />
          <span className="sky-debility-card__copy"><strong>{cardLinks[index].text}</strong>
            <span>{position.dignities.length > 1 ? "Detriment and fall" : position.dignities[0] === "fall" ? "Fall" : "Detriment"}</span></span>
          <ChevronRight className="sky-debility-card__chevron" size={18} aria-hidden="true" />
        </a>)}
      </div>
      {definitionOpen && definition && <ReadingDialog onClose={() => setDefinitionOpen(false)} titleId={definitionId} title="What is dignity?" className="sky-dignity-dialog">
        <FormattedProse text={definition} />
      </ReadingDialog>}
    </section>
  );
}
