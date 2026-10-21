import {createHash} from 'node:crypto';
import framework from '../../packages/astro-knowledge/data/frameworks/hellenistic-meaning-support.json' with {type:'json'};

const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const HELLENISTIC_MEANING_VERSION=framework.version;
const frameworkSha256=hash(framework);

const authority='Use these neutral source interpretations only when supported by the supplied calculated facts and governed meaning. Existing owner-approved meaning, exact wording, current corrections, saved writing profile and surface-specific voice evidence retain precedence. This source supplies no dates, placements, natal sect, age, time lord, lot, exact aspect or visibility threshold. It adds no prose template, length, vocabulary rule, approval or publication permission. Source labels and technical notes are internal, never reader copy. Do not imitate or quote external source prose.';
const aspects=new Set(['conjunction','sextile','square','trine','opposition']);
const signs=new Set(['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces']);
const motions=new Set(['direct','retrograde','stationary','stationing']);
const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const list=value=>Array.isArray(value)?value:[];
const name=value=>typeof value==='string'?value.trim().toLowerCase():'';
const validHouse=value=>(typeof value==='number'||(typeof value==='string'&&/^(?:[1-9]|1[0-2])$/u.test(value)))
  &&Number.isInteger(Number(value))&&Number(value)>=1&&Number(value)<=12;

function factNodes(facts) {
  const nodes=[facts,facts?.placement,facts?.aspect,facts?.event,...list(facts?.positions),...list(facts?.contacts)];
  const developments=facts?.developments;
  for(const entry of [...list(developments?.events),...list(developments?.background)]) {
    nodes.push(entry,...list(entry?.placements));
  }
  return nodes.filter(node=>node&&typeof node==='object'&&!Array.isArray(node));
}

/** Meaning support never supplies missing chart facts or enters a voice role.
 * Advanced techniques and historical variants stay discoverable in the catalog
 * but need a separately governed calculation/meaning path before prompt use.
 */
export function buildHellenisticMeaningSupport({facts={},plan={},family='',surface=''}={}) {
  facts=object(facts);plan=object(plan);
  const nodes=factNodes(facts);
  const scopes=new Set(['core']);
  if(facts.signsExcluded!==true&&nodes.some(n=>[n.sign,n.signA,n.signB,n.transitSign,n.natalSign].some(sign=>signs.has(name(sign)))))scopes.add('placement');
  // A narrative plan is not a calculation. It cannot supply a missing house.
  if(facts.housesExcluded!==true&&facts.housesReliable!==false&&nodes.some(n=>n.housesReliable!==false&&validHouse(n.house)))scopes.add('house');
  if(nodes.some(n=>aspects.has(name(typeof n.aspect==='string'?n.aspect:n.type))))scopes.add('aspect');
  if(nodes.some(n=>motions.has(name(n.motion))))scopes.add('motion');
  if(family==='horoscope'||facts.window?.period||nodes.some(n=>n.transiting))scopes.add('forecast');
  // These routes deliberately admit only their governed reader-meaning
  // projection. Mechanical source notes must not bypass that boundary.
  const projectionOnly=(surface==='you'&&family==='transit-aspect')||family==='bond-effect';
  const records=projectionOnly?[]:framework.sections.filter(record=>scopes.has(record.runtimeScope));
  return {
    version:HELLENISTIC_MEANING_VERSION,role:'meaning-only',authority,
    records:records.map(record=>({id:record.id,meaning:record.body,limits:record.limits,sourceRefs:record.sourceRefs})),
    receipt:{version:HELLENISTIC_MEANING_VERSION,frameworkSha256,
      recordIds:records.map(record=>record.id),recordHashes:records.map(record=>({id:record.id,sha256:hash(record)})),
      positiveVoiceEvidence:false,calculatedFacts:false,projectionOnly}
  };
}

export function hellenisticMeaningPrompt(context={}) {
  const support=buildHellenisticMeaningSupport(context);
  if(!support.records.length)return '';
  return `NEUTRAL HELLENISTIC MEANING SUPPORT\n${JSON.stringify(support)}`;
}
