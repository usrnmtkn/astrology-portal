declare module "swisseph-wasm" {
  export default class SwissEph {
    readonly SE_SUN: number;
    readonly SE_MOON: number;
    readonly SE_MERCURY: number;
    readonly SE_VENUS: number;
    readonly SE_MARS: number;
    readonly SE_JUPITER: number;
    readonly SE_SATURN: number;
    readonly SE_URANUS: number;
    readonly SE_NEPTUNE: number;
    readonly SE_PLUTO: number;
    readonly SE_MEAN_NODE: number;
    readonly SE_TRUE_NODE: number;
    readonly SEFLG_SWIEPH: number;
    readonly SEFLG_SPEED: number;

    initSwissEph(): Promise<void>;
    julday(year: number, month: number, day: number, hour: number): number;
    calc_ut(jd: number, planet: number, flags: number): Float64Array;
    houses(jd: number, latitude: number, longitude: number, hsys: string): {
      cusps: Float64Array;
      ascmc: Float64Array;
    };
  }
}
