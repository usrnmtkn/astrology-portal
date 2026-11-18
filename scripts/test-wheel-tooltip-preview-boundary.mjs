import assert from 'node:assert/strict';
import fs from 'node:fs';
const manifest=JSON.parse(fs.readFileSync(new URL('../apps/admin/dist/.vite/manifest.json',import.meta.url),'utf8'));
const startup=new Set();
function visit(key){if(startup.has(key))return;startup.add(key);for(const child of manifest[key]?.imports??[])visit(child);}
for(const [key,value]of Object.entries(manifest))if(value.isEntry)visit(key);
for(const key of ['src/WheelTooltipDraftPreview.tsx','src/WheelTooltipChartPreview.tsx']){
  assert.equal(manifest[key]?.isDynamicEntry,true,`${key} stays lazy`);
  assert.equal(startup.has(key),false,`${key} stays outside Studio startup`);
}
const sessionKeys=Object.keys(manifest).filter(key=>key==='src/wheelTooltipEditorSession.ts'||/^_wheelTooltipEditorSession-[^/]+\.js$/u.test(key));
assert.equal(sessionKeys.length,1,'The editor-session chunk has one emitted identity');
assert.equal(manifest[sessionKeys[0]].isDynamicEntry,true,'Source navigation remains a dynamic entry');
assert.equal(startup.has(sessionKeys[0]),false,'The editor-session chunk stays outside startup');
assert.ok(manifest['src/WheelTooltipDraftPreview.tsx'].dynamicImports.includes('src/WheelTooltipChartPreview.tsx'),'Chart reads/calculations stay behind the Preview on wheel action');
console.log('Wheel preview controls and chart/calculation surface remain separate dynamic entries outside Studio startup.');
