import fs from 'node:fs';
import path from 'node:path';
import {assertJournal,assertRunWrite} from './controller.mjs';
import {digest} from './evidenceRegistry.mjs';

/** Local private acceptance adapter; same revision and journal contract as SQL. */
export function editorialFileStore(directory) {
  fs.mkdirSync(directory,{recursive:true,mode:0o700});
  const filename=id=>{if(!/^[a-zA-Z0-9_-]+$/u.test(id))throw new Error('invalid_run_id');return path.join(directory,`${id}.json`);};
  const load=id=>{const row=JSON.parse(fs.readFileSync(filename(id),'utf8'));if(row.hash!==digest(row.run))throw new Error('private_run_hash_mismatch');return assertJournal(row.run);};
  return {
    async create(run){assertJournal(run);fs.writeFileSync(filename(run.id),JSON.stringify({run,hash:digest(run)},null,2)+'\n',{flag:'wx',mode:0o600});return run;},
    async read(id){return load(id);},
    async save(previous,next){
      const lock=`${filename(next.id)}.lock`,fd=fs.openSync(lock,'wx',0o600);
      try{
        const saved=load(next.id);if(digest(previous)!==digest(saved))throw new Error('editorial_storage_conflict');
        next.revision=previous.revision+1;assertRunWrite(previous,next,previous.revision);
        const temp=`${filename(next.id)}.tmp`;fs.writeFileSync(temp,JSON.stringify({run:next,hash:digest(next)},null,2)+'\n',{mode:0o600});fs.renameSync(temp,filename(next.id));return next;
      }finally{fs.closeSync(fd);fs.unlinkSync(lock);}
    }
  };
}
