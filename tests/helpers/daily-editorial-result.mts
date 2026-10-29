/** Transport fixture only; a synthetic pass is not a literary evaluation. */
export function dailyBatchFixtureResult(input:any){
  return {assessments:input.readings.map((p:any)=>({sign:p.sign,
    interpretation:'Synthetic interpretation summary for '+p.sign,openingQuote:p.body,endingQuote:p.body})),
    checks:{interpretations:'pass',openings:'pass',endings:'pass'},findings:[]};
}
