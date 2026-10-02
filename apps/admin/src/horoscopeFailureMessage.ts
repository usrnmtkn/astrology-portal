// Load detailed historical diagnostics only when an edition has failed.
export function describeHoroscopeFailure(row:any,failure:any,currentPlanHash?:string) {
  const failed=row.source_snapshot.horoscopeGeneration.lastError;
  const message=failure.diagnostic?.errorCode==='credit_balance_exhausted'
    ?'The previous attempt stopped because the writing API had no credits. This describes the saved attempt, not your current balance. Approve the plan to retry.'
    :`Previous attempt: ${failure.message}`;
  const ended=Date.parse(failed.failedAt);
  const timestamp=Number.isFinite(ended)?` Attempt ended ${new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeStyle:'short',timeZone:row.sections.horoscopeEdition.window.timeZone}).format(ended)}.`:'';
  const changed=currentPlanHash&&failed.operation?.planHash&&currentPlanHash!==failed.operation.planHash?' The writing plan has changed since that attempt.':'';
  return message+timestamp+changed;
}
