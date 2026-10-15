import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import {isInitialSkyReaderHash} from '../apps/web/src/services/initialSkyRoute.mjs';
const root = new URL('../', import.meta.url).pathname;
function literalArray(path, name) {
  const ast = ts.createSourceFile(path, readFileSync(root + '/' + path, 'utf8'),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let values;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name) {
      let expression = node.initializer;
      if (ts.isAsExpression(expression)) expression = expression.expression;
      assert.ok(ts.isArrayLiteralExpression(expression));
      assert.ok(expression.elements.every(ts.isStringLiteral));
      assert.equal(values, undefined);
      values = expression.elements.map(element => element.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(values?.length);
  return values;
}

const apiPath='apps/web/src/services/skyApi.ts';
const apiSource=readFileSync(root+apiPath,'utf8');
const apiAst=ts.createSourceFile(apiPath,apiSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
assert.equal(apiAst.parseDiagnostics.length,0);
const names=['points','signs','eligiblePlacementHintHref','eligiblePlacementHintContinuation','preloadInitialSkyPlacement','startInitialSkyPlacementLoad'];
const declarations=new Map();
for(const node of apiAst.statements){
 if(ts.isFunctionDeclaration(node)&&names.includes(node.name?.text))declarations.set(node.name.text,node.getText(apiAst));
 if(ts.isVariableStatement(node))for(const item of node.declarationList.declarations)if(ts.isIdentifier(item.name)&&names.includes(item.name.text))declarations.set(item.name.text,node.getText(apiAst));
}
assert.equal(declarations.size,names.length);
const actual=names.map(name=>declarations.get(name).replace(/^export /u,'')).join('\n');
const transpile=source=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const runnableApi=transpile(actual).replace('import("./skyCalculationClient")','loadClient()');
assert.equal((actual.match(/eligiblePlacementHintContinuation\(/gu)??[]).length,3); // declaration+two boundaries
assert.equal((actual.match(/import\("\.\/skyCalculationClient"\)/gu)??[]).length,1);
assert.doesNotMatch(declarations.get('preloadInitialSkyPlacement'),/\.resolve\(|calculate[A-Za-z]*\(|Date\(|fetch\(/u);
const predicateContext=vm.createContext({URL});vm.runInContext(runnableApi,predicateContext);
const eligiblePlacementHintHref=predicateContext.eligiblePlacementHintHref;
const eligiblePlacementHintContinuation=predicateContext.eligiblePlacementHintContinuation;
const points = literalArray('apps/web/src/astrologyConfig.ts', 'SKY_BODY_ORDER').map(s => s.toLowerCase().replaceAll(' ', '-'));
const signs = literalArray('apps/web/src/services/chartMath.ts', 'zodiacSigns').map(s => s.toLowerCase());
assert.equal(points.length, 14);
assert.equal(signs.length, 12);
let canonical = 0;
for (const point of points)
  for (const sign of signs) {
    assert.equal(eligiblePlacementHintHref('https://synthetic.test/#sky/placement/' + point + '/' + sign), true);
    canonical++;
  }
const valid = 'https://synthetic.test/#sky/placement/sun/libra';
for (const fragment of ['#sky/placement/sun/libra', '#/sky/placement/sun/libra', '#sky/placement/sun/libra/', '#/sky/placement/sun/libra/'])
  assert.equal(eligiblePlacementHintHref('https://synthetic.test/' + fragment), true);
const excluded = [
  '/#sky',
  '/#sky/placement/sun',
  '/#sky/placement/sun/unknown',
  '/#sky/placement/unknown/libra',
  '/#sky/placement/sun/libra/extra',
  '/#sky/placement/sun/libra?x=1',
  '/#sky/placement/Sun/Libra',
  '/#sky/retrograde/venus',
  '/#sky/aspect/sun/trine/pluto',
  '/#calendar',
  '/#you',
  '/#friends',
  '/#articles',
  '/admin/content#sky/placement/sun/libra',
  '/memory#sky/placement/sun/libra',
  '/?auth=login#sky/placement/sun/libra',
  '/?auth=signup#sky/placement/sun/libra',
  '/?code=synthetic#sky/placement/sun/libra',
  '/?error=synthetic#sky/placement/sun/libra',
  '/#access_token=synthetic'
];
for (const path of excluded)
  assert.equal(eligiblePlacementHintHref('https://synthetic.test' + path), false, path);
assert.equal(eligiblePlacementHintContinuation(valid, valid, true, true), true);
for (const input of [
  [valid, valid, false, true],
  [valid, valid, true, false],
  ['https://synthetic.test/?code=synthetic#sky/placement/sun/libra', valid, true, true],
  [valid, 'https://synthetic.test/#calendar', true, true],
  [valid, 'https://other.test/#sky/placement/sun/libra', true, true]
])
  assert.equal(eligiblePlacementHintContinuation(...input), false);
// Predicate inventory is checked against the actual supported calculation inputs.
console.log(JSON.stringify({ canonical, delimiterExamples: 4, excluded: excluded.length, continuationPositive: 1, continuationNegative: 5, passed: true, scope: 'Pure source/predicate controls, not browser or admission acceptance' }));
const entryPath='apps/web/src/main.tsx',entry=readFileSync(root+entryPath,'utf8');
const entryAst=ts.createSourceFile(entryPath,entry,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
assert.equal(entryAst.parseDiagnostics.length,0);
const initialDeclarations=[];
function visit(node){if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text==='initialSkyLoadPromise')initialDeclarations.push(node);ts.forEachChild(node,visit);}visit(entryAst);
assert.equal(initialDeclarations.length,1);
const dispatch=initialDeclarations[0].getText(entryAst);
assert.match(dispatch,/startInitialSkyPlacementLoad\(callbackUrl.href\)/u);
assert.equal((dispatch.match(/import\("\.\/services\/skyApi"\)/gu)??[]).length,1);
assert.doesNotMatch(entry,/initialSkyPlacementHint|eligiblePlacementHint/u);
const runnableMain=transpile('const '+dispatch+';').replace('import("./services/skyApi")','loadSkyApi()');
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const drain=async()=>{for(let i=0;i<24;i++)await Promise.resolve();};
async function run({href=valid,current=href,worker=true,initial={resolve(){throw Error('API resolve forbidden');}},holdMetadata=false,holdClient=false,rejectMetadata=false,rejectClient=false,rejectInitialization=false,throwCapture=false}={}){
 const metadata=deferred(),client=deferred(),location={href:current,hash:new URL(current).hash};
 let metadataImports=0,captures=0,imports=0,preloads=0;
 const context=vm.createContext({URL,Worker:worker?function Worker(){}:undefined,callbackUrl:new URL(href),window:{location},isInitialSkyReaderHash,
  startInitialSkyLoad(){captures++;if(throwCapture)throw Error('synthetic capture failure');return initial;},
  loadSkyApi(){metadataImports++;return metadata.promise;},loadClient(){imports++;return client.promise;}});
 vm.runInContext(runnableApi,context);vm.runInContext(runnableMain,context);
 const releaseMetadata=()=>rejectMetadata?metadata.reject(Error('synthetic metadata module failure')):metadata.resolve({startInitialSkyPlacementLoad:context.startInitialSkyPlacementLoad});
 const releaseClient=()=>rejectClient?client.reject(Error('synthetic client module failure')):client.resolve({preloadSwissEphemerisOffMainThread(){preloads++;return rejectInitialization?Promise.reject(Error('synthetic initialization failure')):Promise.resolve();}});
 if(!holdMetadata&&metadataImports)releaseMetadata();await drain();if(!holdClient&&imports)releaseClient();await drain();
 return{get metadataImports(){return metadataImports;},get captures(){return captures;},get imports(){return imports;},get preloads(){return preloads;},releaseMetadata,releaseClient,location,context,result:()=>vm.runInContext('initialSkyLoadPromise',context)};
}
for(const point of points)for(const sign of signs){const r=await run({href:'https://synthetic.test/#sky/placement/'+point+'/'+sign});assert.equal(r.imports,1);assert.equal(r.preloads,1);assert.equal(r.captures,1);}
const original={resolve(){throw Error('Forbidden API resolve');}},same=await run({initial:original});assert.equal(await same.result(),original,'Exact captured metadata object returned, not awaited API');
const nullMetadata=await run({initial:null});assert.equal(await nullMetadata.result(),null);
const delayedHint=await run({initial:original,holdClient:true,rejectClient:true});assert.equal(await delayedHint.result(),original,'Metadata must not wait for hint import');delayedHint.releaseClient();await drain();assert.equal(await delayedHint.result(),original,'Rejected hint cannot poison returned metadata');
const held=await run({holdMetadata:true,holdClient:true});assert.equal(held.imports,0);held.releaseMetadata();await drain();assert.equal(held.imports,1);held.location.href='https://synthetic.test/#calendar';held.releaseClient();await drain();assert.equal(held.preloads,0);
const away=await run({holdMetadata:true});away.location.href='https://synthetic.test/#articles';away.releaseMetadata();await drain();assert.equal(away.imports,0);
const noWorkerLater=await run({holdClient:true});noWorkerLater.context.Worker=undefined;noWorkerLater.releaseClient();await drain();assert.equal(noWorkerLater.preloads,0);
for(const path of excluded){const r=await run({href:'https://synthetic.test'+path});assert.equal(r.imports,0,path);assert.equal(r.preloads,0,path);}
for(const path of ['/?access_token=synthetic#sky/placement/sun/libra','/?error_code=synthetic#sky/placement/sun/libra']){const r=await run({href:'https://synthetic.test'+path});assert.equal(r.imports,0);}
for(const options of [{worker:false},{initial:null},{current:'https://synthetic.test/#calendar'},{current:'https://other.test/#sky/placement/sun/libra'}]){const r=await run(options);assert.equal(r.imports,0);assert.equal(r.preloads,0);}
for(const options of [{rejectMetadata:true},{throwCapture:true}]){const r=await run(options);assert.equal(await r.result(),null);assert.equal(r.imports,0);}
for(const options of [{rejectClient:true},{rejectInitialization:true}]){const r=await run({...options,initial:original});assert.equal(await r.result(),original);assert.equal(r.imports,1);assert.equal(r.preloads,options.rejectClient?0:1);}
console.log('Actual main + existing skyApi wrapper:168 routes, exact metadata identity, both continuation guards, auth/path/Worker, import/init/capture failures and no API resolve PASS.');
