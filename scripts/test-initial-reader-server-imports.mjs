import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,cp,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';
const temp=await mkdtemp(join(tmpdir(),'initial-reader-node-'));
try {
  await writeFile(join(temp,'package.json'),'{"type":"module"}');
  const files=['apps/web/src/content/contentPublicationState.ts','apps/web/src/content/skyListPublicationScope.ts','apps/web/src/services/publicationLedgerTransport.ts'];
  for(const file of files){
    const output=join(temp,file.replace(/\.ts$/u,'.js'));
    await mkdir(dirname(output),{recursive:true});
    await writeFile(output,ts.transpileModule(await readFile(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.ESNext}}).outputText);
  }
  const retired='apps/web/src/content/fallbackArchitectureV3/resolver/retiredCompositions.mjs';
  await mkdir(dirname(join(temp,retired)),{recursive:true});await cp(retired,join(temp,retired));
  // Execute plain Node ESM, as Vercel does after TypeScript transpilation.
  // A tsx/esbuild test would silently repair an extensionless server import.
  const check=`import {publicationLedgerReady} from './apps/web/src/content/contentPublicationState.js';import {publicationLedgerTag} from './apps/web/src/services/publicationLedgerTransport.js';if(publicationLedgerReady())throw new Error('Invented full readiness');console.log(await publicationLedgerTag([]));`;
  await writeFile(join(temp,'check.mjs'),check);
  assert.match(execFileSync(process.execPath,[join(temp,'check.mjs')],{encoding:'utf8'}),/./);
  const config=JSON.parse(await readFile('vercel.json','utf8'));
  assert(config.functions['api/sky-reader.ts'].includeFiles.includes('server/initial-sky-reader/dist/**'));
  assert(config.functions['api/sky-reader.ts'].includeFiles.includes('swisseph-wasm/wasm/*'));
  await readFile(resolve('server/initial-sky-reader/dist/initial-reader.mjs'));
} finally {await rm(temp,{recursive:true,force:true});}
console.log('PASS: plain Node packaged publication imports, separate full readiness and actual initial-reader/Swiss function artifact inclusion.');
