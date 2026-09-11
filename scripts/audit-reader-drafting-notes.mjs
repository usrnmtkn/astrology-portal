#!/usr/bin/env node
import fs from 'node:fs';
import { readerCopyFields, readerCopyIssues } from '../apps/web/src/content/editorialCopyBoundary.mjs';
import { buildCanonicalContentRecords } from './lib/content-inventory-sources.mjs';
const file = process.argv.find(a=>a.startsWith('--rows='))?.slice(7);
const input = file ? JSON.parse(fs.readFileSync(file,'utf8')) : buildCanonicalContentRecords(process.cwd());
const records = Array.isArray(input) ? input : input.rows;
if (!Array.isArray(records)) throw new Error('Expected a complete row array or { rows: [...] } inventory.');
let fields=0;
const findings=records.flatMap((row,index)=>{
  fields+=readerCopyFields(row).length;
  return readerCopyIssues(row).map(issue=>({key:row.content_key??row.contentKey??String(index),...issue}));
});
const report={scope:file?'saved Studio export':'canonical repository content',rows:records.length,fields,findings};
console.log(JSON.stringify(report,null,2));
if(findings.length)process.exitCode=1;
