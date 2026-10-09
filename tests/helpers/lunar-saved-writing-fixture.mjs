export function lunarSavedWritingFixtures() {
  return ['new-moon','full-moon'].flatMap(phase=>['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'].map(sign=>({
    id:`saved-writing-${phase}-${sign}`,content_key:`authored/sky-lunation-macro/${phase}/${sign}`,target_date:null,
    mode:'article',status:'LIVE',lane:'serving',review_state:null,headline:`Saved ${phase} ${sign}`,
    body:`Synthetic saved ${phase} ${sign} opening.\n\nSynthetic complete ${phase} ${sign} ending.`,sections:{},source_snapshot:{},updated_at:'2026-09-23T00:00:00Z'
  })));
}
