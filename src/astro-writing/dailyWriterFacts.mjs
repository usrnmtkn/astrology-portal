export const isOrdinaryMoonIngress=event=>event.type==='ingress'&&String(event.planet).toLowerCase()==='moon';

/** Presentation of complete calculated evidence, not a calculation or coverage
 * deletion. Routine Moon facts remain available without appearing as required
 * dated developments. Special lunar events and exact aspects keep their roles. */
export function dailyWriterFacts(engineFacts) {
  const {developments,anchor,house,seasonalMeaning,relationalContext,componentMeanings,ownerOutline,configurationEvidence,...facts}=engineFacts;
  const events=facts.events??[];
  const moon=position=>String(position.planet).toLowerCase()==='moon';
  const privateMoonContext={
    use:'Optional private interpretive context. These ordinary placements and ingresses are not required event coverage, a paragraph to supply or an ending. Their calculated timing does not promise a personal change.',
    positions:facts.positions.filter(moon),events:events.filter(isOrdinaryMoonIngress),
    developments:developments.events.filter(isOrdinaryMoonIngress),background:developments.background.filter(moon)
  };
  return {
    calculatedFacts:{...facts,positions:facts.positions.filter(position=>!moon(position)),events:events.filter(event=>!isOrdinaryMoonIngress(event)),signs:facts.signs?.filter(entry=>entry.sign===facts.risingSign)},
    developments:{...developments,events:developments.events.filter(event=>!isOrdinaryMoonIngress(event)),background:developments.background.filter(position=>!moon(position))},
    componentMeanings,
    privateMoonContext
  };
}
