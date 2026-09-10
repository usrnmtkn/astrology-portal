import { AdminHttpError } from "./admin-http.js";
const signs = new Set("aries taurus gemini cancer leo virgo libra scorpio sagittarius capricorn aquarius pisces".split(" "));
const bodies = new Set("sun moon mercury venus mars jupiter saturn uranus neptune pluto chiron lilith nodes north-node south-node".split(" "));
export function studioSkyIdentity(key: string) {
    const aspect = /^sky\.aspect\.([a-z_]+)\.([a-z]+)\.([a-z_]+)\.([a-z]+)\.([a-z]+)$/.exec(key);
    const placement = /^sky\.placement\.base\.([a-z_]+)\.([a-z]+)$/.exec(key);
    if (aspect && bodies.has(aspect[1]) && bodies.has(aspect[3]) && aspect[1] !== aspect[3]
        && signs.has(aspect[4]) && signs.has(aspect[5]) && ["conjunction", "opposition", "square", "trine", "sextile", "quincunx"].includes(aspect[2])) {
        return { kind: "aspect" as const, args: { a: aspect[1], aspect: aspect[2], b: aspect[3], signA: aspect[4], signB: aspect[5] } };
    }
    if (placement && bodies.has(placement[1].replaceAll("_", "-")) && signs.has(placement[2])) {
        return { kind: "placement" as const, args: { planet: placement[1].replaceAll("_", "-"), sign: placement[2] } };
    }
    throw new AdminHttpError(400, "This row is not a reusable Sky aspect or placement draft.");
}
