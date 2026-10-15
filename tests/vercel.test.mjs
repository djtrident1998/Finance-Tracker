import test from 'node:test';
import assert from 'node:assert/strict';
import {NeonDB,postgresSQL} from '../src/neon-db.mjs';
import {createVercelHandler,verifiedRequest} from '../src/vercel-handler.mjs';

test('Postgres conversion preserves SQL literals and conflict semantics',()=>{
  assert.equal(postgresSQL("SELECT '?' AS label WHERE owner=? AND space=?"),"SELECT '?' AS label WHERE owner=$1 AND space=$2");
  assert.equal(postgresSQL('INSERT OR IGNORE INTO records(id) VALUES(?)'),'INSERT INTO records(id) VALUES($1) ON CONFLICT DO NOTHING');
});
test('ledger batch uses one database transaction and bound values',async()=>{
  const calls=[];const client={query:(sql,args)=>({sql,args}),transaction:async statements=>{calls.push(statements);return statements;}};
  const db=new NeonDB(null,client);
  await db.batch([db.prepare('INSERT INTO records(id) VALUES(?)').bind("x'); DELETE FROM records;--"),db.prepare('DELETE FROM records WHERE owner=?').bind('owner')]);
  assert.equal(calls.length,1);assert.equal(calls[0].length,2);assert.deepEqual(calls[0][0].args,["x'); DELETE FROM records;--"]);
  assert.equal(calls[0][0].sql,'INSERT INTO records(id) VALUES($1)');
});
test('public identity headers cannot authenticate a Vercel request',async()=>{
  const handler=createVercelHandler({getSession:async()=>({user:null}),getDB:()=>{throw new Error('must not access DB');}});
  const response=await handler(new Request('https://artha.example/api/state',{headers:{'oai-authenticated-user-id':'victim'}}));
  assert.equal(response.status,401);
});
test('verified session replaces all caller supplied Sites identity headers',async()=>{
  const request=verifiedRequest(new Request('https://artha.example/api/state',{headers:{'oai-authenticated-user-id':'victim','oai-authenticated-user-email':'victim@example.com','oai-other':'bad'}}),{id:'verified-owner',name:'My name'});
  assert.equal(request.headers.get('oai-authenticated-user-id'),'verified-owner');
  assert.equal(request.headers.get('oai-authenticated-user-email'),null);
  assert.equal(request.headers.get('oai-other'),null);
});
test('cross-site authentication mutations are blocked before proxying',async()=>{
  const handler=createVercelHandler({proxyAuth:()=>{throw new Error('must not proxy');}});
  const response=await handler(new Request('https://artha.example/api/auth/sign-in/email',{method:'POST',headers:{origin:'https://other.example'}}));
  assert.equal(response.status,403);
});
test('unavailable session provider fails closed without database access',async()=>{
  const handler=createVercelHandler({getSession:async()=>{throw new Error('secret provider error');},getDB:()=>{throw new Error('must not access DB');}});
  const response=await handler(new Request('https://artha.example/api/state'));
  assert.equal(response.status,503);assert.doesNotMatch(await response.text(),/secret/);
});
