import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {weeklyProfileExamples} from '../../src/astro-writing/weeklyProfileExamples.mjs';
import {HOROSCOPE_SIGNS} from '../../apps/web/src/content/horoscopeEditions.mjs';
import {weeklyWriterConcerns} from '../../src/astro-writing/weeklyWriterScope.mjs';

const hash=text=>createHash('sha256').update(text).digest('hex');
const title=sign=>sign[0].toUpperCase()+sign.slice(1);
const current='OWNER-DESIGNATED WEEKLY ARIES VOICE EXAMPLE\r\nOriginal designation and source-use restrictions.\r\n\r\nAPPROVED EXAMPLE — VERBATIM\r\n\r\n### Aries & Aries Rising\r\n\r\nComplete synthetic opening, café.\r\n\r\nThe complete final paragraph. 🌙\r\n\r\nEND OF ARIES EXAMPLE';
const historical=HOROSCOPE_SIGNS.flatMap(sign=>['2026-10-05','2026-10-26'].map(date=>`${date} · ${title(sign)} & ${title(sign)} Rising\n\nComplete ${date} ${sign} opening.\n\nComplete ${sign} ending.\n\n`)).join('');
const corrections='OWNER CORRECTION: synthetic exact correction\nKeep this complete.';
const source=current+'\n\nEarlier complete archive preface.\n\n'+historical+corrections;

test('Weekly selects declared whole units with exact original offsets and keeps the archive unchanged',()=>{
  for(const sign of HOROSCOPE_SIGNS){
    const selected=weeklyProfileExamples(source,sign);
    assert.equal(selected.archiveSha256,hash(source));assert.equal(selected.archiveLength,source.length);
    assert.equal(selected.passages.length,sign==='aries'?1:2);
    assert.equal(selected.passages[0].text,current);
    assert.equal(selected.corrections,corrections);assert(selected.sourceGuidance.includes(corrections));
    for(const p of selected.passages){
      assert.equal(p.text,source.slice(p.start,p.end));assert.equal(p.sha256,hash(p.text));
      assert(selected.sourceGuidance.includes(p.text));
    }
    if(sign!=='aries'){
      const p=selected.passages[1];assert.equal(p.sign,sign);assert.equal(p.date,'2026-10-26');
      assert(p.text.includes(`Complete ${sign} ending.`));
      assert(!selected.sourceGuidance.includes(`Complete 2026-10-05 ${sign} opening.`));
    }
    assert(selected.sourceGuidance.length<source.length/2);
  }
  assert.equal(source,current+'\n\nEarlier complete archive preface.\n\n'+historical+corrections);
});

test('Unrecognized collections keep their full existing transport; malformed named units fail before dispatch',()=>{
  assert.equal(weeklyProfileExamples('Complete collection without declared named-unit boundaries.','aries'),null);
  assert.throws(()=>weeklyProfileExamples(source.replace('END OF ARIES EXAMPLE','END OF TAURUS EXAMPLE'),'aries'),/boundaries/);
  assert.throws(()=>weeklyProfileExamples(source+current,'aries'),/boundaries/);
  assert.throws(()=>weeklyProfileExamples(source,'overview'),/boundaries/);
  assert.throws(()=>weeklyProfileExamples(current,'taurus'),/no complete example/);
  assert.throws(()=>weeklyProfileExamples(source.replace('The complete final paragraph.','OWNER CORRECTION: misplaced'),'aries'),/outside/);
});

test('Weekly delivers complete hash-verified supplementary comparisons without absorbing them into the last archive reading',()=>{
  const text='Complete supporting voice passage, café.\n\nIts complete ending. 🌙';
  const block=`ACTIVE COMPLETE OWNER-DESIGNATED COMPARISONS\nSource role: synthetic owner-approved voice only, not owner authorship or current facts.\nComplete prose SHA-256: ${hash(text)}\nBEGIN COMPLETE PROSE supporting-voice\n${text}\nEND COMPLETE PROSE supporting-voice\n\n`;
  const augmented=source.replace(corrections,block+corrections);
  for(const sign of HOROSCOPE_SIGNS){
    const selected=weeklyProfileExamples(augmented,sign),extra=selected.passages.at(-1);
    assert.equal(selected.archiveSha256,hash(augmented));
    assert.equal(extra.id,'supporting-voice');assert.equal(extra.text,text);assert.equal(extra.sha256,hash(text));
    assert.equal(augmented.slice(extra.start,extra.end),text);
    assert.equal(selected.sourceGuidance.split(text).length-1,1);
    assert(selected.sourceGuidance.includes(block));assert(selected.sourceGuidance.includes(corrections));
    if(sign==='pisces')assert(!selected.passages[1].text.includes('ACTIVE COMPLETE OWNER-DESIGNATED COMPARISONS'));
    assert.equal(selected.passages[0].text,current,'The named primary reference stays exact');
  }
  assert.throws(()=>weeklyProfileExamples(augmented.replace(text,text+' changed'),'aries'),/could not be verified/);
  assert.throws(()=>weeklyProfileExamples(augmented.replace('END COMPLETE PROSE supporting-voice','END COMPLETE PROSE wrong'),'aries'),/could not be verified/);
  assert.throws(()=>weeklyProfileExamples(source.replace('APPROVED EXAMPLE — VERBATIM',block+'APPROVED EXAMPLE — VERBATIM'),'aries'),/outside/);
  assert.throws(()=>weeklyProfileExamples(source+'\n'+block,'aries'),/boundaries remain separate/);
  const other='A separate complete voice reference.\r\n\r\nIts whole final sentence.';
  const sibling=`Complete prose SHA-256: ${hash(other)}\r\nBEGIN COMPLETE PROSE supporting-voice-longer\r\n${other}\r\nEND COMPLETE PROSE supporting-voice-longer\r\n`;
  const prefixed=augmented.replace(`Complete prose SHA-256: ${hash(text)}`,sibling+`Complete prose SHA-256: ${hash(text)}`);
  const selected=weeklyProfileExamples(prefixed,'aries');
  for(const [id,body] of [['supporting-voice',text],['supporting-voice-longer',other]]){
    const passage=selected.passages.find(p=>p.id===id);
    assert.equal(passage.text,body);assert.equal(prefixed.slice(passage.start,passage.end),body,'Similar IDs and CRLF boundaries resolve to their own whole units');
  }
});

test('Weekly writer receives only selected event bindings; complete abstract plans remain private',()=>{
  const concerns=[{sign:'aries',eventIds:['event:a','event:b'],coreConcern:'Synthetic abstract concern.',astrologicalReason:'Synthetic generated interpretation.',development:'Synthetic proposed prose.'}];
  const before=structuredClone(concerns),writer=weeklyWriterConcerns(concerns);
  assert.deepEqual(writer,[{sign:'aries',eventIds:['event:a','event:b']}]);assert.deepEqual(concerns,before);
});
