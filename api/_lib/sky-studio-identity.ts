import { AdminHttpError } from "./admin-http.js";
import { canonicalSkyAspectProfile } from "../../apps/web/src/services/canonicalSkyAspectProfile.js";
const pairOrder = [...canonicalSkyAspectProfile.points.map(point => point.id).filter(point => !["north-node", "south-node"].includes(point)), "nodes"];
const signs = new Set("aries taurus gemini cancer leo virgo libra scorpio sagittarius capricorn aquarius pisces".split(" "));
const bodies = new Set("sun moon mercury venus mars jupiter saturn uranus neptune pluto chiron lilith nodes north-node south-node".split(" "));
export function studioSkyIdentity(key: string) {
    const aspect = /^sky\.aspect\.([a-z_-]+)\.([a-z]+)\.([a-z_-]+)\.([a-z]+)\.([a-z]+)$/.exec(key);
    const placement = /^sky\.placement\.base\.([a-z_]+)\.([a-z]+)$/.exec(key);
    if (aspect && bodies.has(aspect[1]) && bodies.has(aspect[3]) && aspect[1] !== aspect[3]
        && !(["nodes", "north-node", "south-node"].includes(aspect[1]) && ["nodes", "north-node", "south-node"].includes(aspect[3]))
        && signs.has(aspect[4]) && signs.has(aspect[5]) && ["conjunction", "opposition", "square", "trine", "sextile", "quincunx"].includes(aspect[2])) {
        const canonicalKey = pairOrder.indexOf(aspect[1]) < pairOrder.indexOf(aspect[3]) ? key : `sky.aspect.${aspect[3]}.${aspect[2]}.${aspect[1]}.${aspect[5]}.${aspect[4]}`;
        if (canonicalKey !== key) throw new AdminHttpError(400, `Use the existing canonical Sky identity ${canonicalKey}. Content identities cannot be renamed.`);
        return { kind: "aspect" as const, args: { a: aspect[1], aspect: aspect[2], b: aspect[3], signA: aspect[4], signB: aspect[5] } };
    }
    if (placement && bodies.has(placement[1].replaceAll("_", "-")) && signs.has(placement[2])) {
        return { kind: "placement" as const, args: { planet: placement[1].replaceAll("_", "-"), sign: placement[2] } };
    }
    throw new AdminHttpError(400, "This row is not a reusable Sky aspect or placement draft.");
}
