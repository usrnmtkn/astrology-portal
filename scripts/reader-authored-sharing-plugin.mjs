import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../apps/web/src/content/fallbackArchitectureV3/',import.meta.url));
export function sharedReaderAuthoredRowsPlugin() {
  const original=path.join(root,'bundled-transit-core-authored-cards-v3.json');
  const shared=path.join(root,'deferred-base-reader-support-v1.json');
  return {name:'share-complete-reader-authored-rows',enforce:'post',transform(_code,id){
    if(id!==original)return;
    const source=JSON.parse(fs.readFileSync(original,'utf8'));
    if(Object.keys(source).join(',')!=='authoredCards')throw new Error('Unknown authored-source fields require explicit transport support.');
    const units=JSON.parse(fs.readFileSync(shared,'utf8')).authoredCards;
    const byValue=new Map(units.map((row,index)=>[JSON.stringify(row),index]));
    const used=new Set();
    const rows=source.authoredCards.map(row=>{
      const value=JSON.stringify(row),index=byValue.get(value);
      if(index===undefined)return value;
      used.add(index);return `shared[${index}]`;
    });
    if(used.size!==units.length)throw new Error('Every shared authored unit must remain byte-identical in both governed source inventories.');
    return {code:`import {authoredCards as shared} from ${JSON.stringify(shared)};\nexport const authoredCards=[${rows.join(',')}];\nexport default {authoredCards};`,map:null};
  }};
}
