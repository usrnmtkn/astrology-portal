export const horoscopePhasePattern='Full|New|First[ -]Quarter|Last[ -]Quarter';
export const normalizeHoroscopePhase=value=>value?.toLowerCase().replace(/[ -]+/gu,'-');
export const horoscopeLunationPhase=event=>String(event.id).match(/^lunation-(full|new|first-quarter|last-quarter)-moon-/iu)?.[1]?.toLowerCase();
