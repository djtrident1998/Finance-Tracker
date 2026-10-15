import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
export class LocalDB {
 constructor(path=':memory:'){this.db=new DatabaseSync(path);this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');if(!this.db.prepare("SELECT name FROM sqlite_master WHERE name='records'").get())this.db.exec(readFileSync(resolve(import.meta.dirname,'../drizzle/0000_ledger.sql'),'utf8').replaceAll('--> statement-breakpoint',''));}
 prepare(sql){return {bind:(...args)=>({all:async()=>({results:this.db.prepare(sql).all(...args)}),run:async()=>this.db.prepare(sql).run(...args),_sql:sql,_args:args})};}
 async batch(statements){this.db.exec('BEGIN IMMEDIATE');try{const r=statements.map(s=>this.db.prepare(s._sql).run(...s._args));this.db.exec('COMMIT');return r;}catch(e){this.db.exec('ROLLBACK');throw e;}}
 close(){this.db.close();}
}
export function openLocal(){const dir=resolve(import.meta.dirname,'../.local');mkdirSync(dir,{recursive:true});return new LocalDB(resolve(dir,'artha.sqlite'));}
