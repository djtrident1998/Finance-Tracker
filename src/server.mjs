import { VERSION,dec,str,mul,num,position,xirr,simulate,allocationCheck,istDate,dateValid,assert,investmentProfit } from './finance.mjs';
import {parseCSV,previewRows,reconcile,instrumentKey,COLUMNS,safeCSVCell,fingerprint} from './imports.mjs';
import {demoData} from './demo.mjs';
const uid=()=>crypto.randomUUID();
const now=()=>new Date().toISOString();
const hash=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'};
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers});
function ownerOf(req){const owner=req.headers.get('oai-authenticated-user-id');if(!owner)throw Object.assign(new Error('Sign in to your private workspace'),{status:401});return owner;}
const query=async(db,sql,args=[])=>{const r=await db.prepare(sql).bind(...args).all();return r.results||[];};
function put(db,owner,space,kind,id,payload){return db.prepare('INSERT INTO records(owner,space,kind,id,payload,created_at,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(owner,space,kind,id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at').bind(owner,space,kind,id,JSON.stringify(payload),now(),now());}
function audit(db,owner,space,action,id,reason=''){return db.prepare('INSERT INTO audit_events(id,owner,space,action,entity_id,occurred_at,reason) VALUES(?,?,?,?,?,?,?)').bind(uid(),owner,space,action,id,now(),reason);}
async function records(db,owner,space){const r=await query(db,'SELECT kind,id,payload FROM records WHERE owner=? AND space=?',[owner,space]);return r.map(x=>({...x,payload:JSON.parse(x.payload)}));}
async function state(db,owner,space){
  const all=await records(db,owner,space);const seed=space==='demo'?demoData():{events:[],prices:[],goals:[],sips:[],reports:[],imports:[],preferences:{budget:0,profile:null,ai:false,email:false}};
  for(const kind of ['events','prices','goals','sips','reports','imports']){
    const data=new Map(seed[kind].map(x=>[x.id||[x.instrumentKey,x.date].join('@'),x]));
    for(const x of all.filter(x=>x.kind===kind)){if(x.payload.deleted)data.delete(x.id);else data.set(x.id,x.payload);}seed[kind]=[...data.values()];
  }
  seed.preferences={...seed.preferences,...(all.find(x=>x.kind==='preferences')?.payload||{})};
  const reversed=new Set(seed.imports.filter(x=>x.status==='reversed').map(x=>x.id));seed.events=seed.events.filter(x=>!reversed.has(x.batchId));
  return seed;
}
export function portfolio(s,asOf=istDate(),includeReturns=true){
  const grouped=new Map();for(const e of s.events.filter(x=>x.date<=asOf)){const key=instrumentKey(e)+'|'+e.account;if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(e);}
  const holdings=[];let total=0n,knownBasis=0n,unknownBasis=false,unpriced=0;
  for(const [id,events] of grouped){const e=events[0];const prices=s.prices.filter(x=>x.instrumentKey===instrumentKey(e)&&x.date<=asOf).sort((a,b)=>b.date.localeCompare(a.date));const quote=prices[0]||null;const p=position(events,quote?.price);if(dec(p.units)===0n)continue;
    const stale=!quote||(Date.parse(asOf)-Date.parse(quote.date))/86400000>4;
    const flows=events.filter(x=>['BUY','SELL','DIVIDEND','FEE'].includes(x.type)).map(x=>({date:x.date,amount:(x.type==='BUY'||x.type==='FEE'?-1:1)*Number(x.amount||0)+(x.type==='SELL'?-Number(x.fees||0):x.type==='BUY'?-Number(x.fees||0):0)}));
    const irr=!includeReturns||p.basis===null||p.value===null||p.issues.length?{value:null,reason:p.issues[0]||'Complete purchase history and valuation required'}:xirr([...flows,{date:asOf,amount:Number(p.value)}]);
    holdings.push({id,key:instrumentKey(e),name:e.name,type:e.instrument_type,account:e.account,identifier:e.identifier,plan:e.plan,option:e.option,category:e.category||'Unclassified',asset:e.asset||(e.instrument_type==='STOCK'?'Equity':'Unclassified'),...p,quote,stale,xirr:irr});
    if(p.value===null)unpriced++;else total+=dec(p.value);if(p.basis===null)unknownBasis=true;else knownBasis+=dec(p.basis);
  }
  const complete=!unpriced,flows=s.events.filter(x=>x.date<=asOf&&['BUY','SELL','DIVIDEND','FEE'].includes(x.type)).map(x=>({date:x.date,amount:(['BUY','FEE'].includes(x.type)?-1:1)*Number(x.amount||0)-(Number(x.fees)||0)}));
  const irr=!includeReturns||unknownBasis||!complete||holdings.some(h=>h.issues.length)?{value:null,reason:'Complete acquisition, event and price history required'}:xirr([...flows,{date:asOf,amount:num(total)}]);
  const allocation={};for(const h of holdings)allocation[h.asset]=(allocation[h.asset]||0)+Number(h.value||0);
  const fresh=holdings.filter(h=>!h.stale).reduce((sum,h)=>sum+Number(h.value||0),0);
  return {holdings,total:str(total),basis:unknownBasis?null:str(knownBasis),gain:unknownBasis||!complete?null:str(total-knownBasis),xirr:irr,twr:{value:null,reason:'Daily valuations around external flows are not available'},allocation,coverage:num(total)?fresh/num(total):null,unpriced,complete,asOf,valuationCutoff:holdings.map(h=>h.quote?.date).filter(Boolean).sort().at(-1)||null,lastImport:s.imports.filter(x=>x.status==='posted').map(x=>x.createdAt).sort().at(-1)||null,sourceRefs:[...new Set(holdings.map(h=>h.quote?.source).filter(Boolean))],calculationVersion:VERSION,dataQuality:{unpriced,unknownBasis,stale:holdings.filter(h=>h.stale).length}};
}
function history(s){const dates=[...new Set(s.prices.map(x=>x.date))].sort();return dates.map(date=>{const p=portfolio(s,date,false);const contributions=s.events.filter(e=>e.date<=date).reduce((a,e)=>a+(['BUY','FEE'].includes(e.type)?Number(e.amount)+Number(e.fees||0):e.type==='SELL'||e.type==='DIVIDEND'?-Number(e.amount)+Number(e.fees||0):0),0);return {date,value:p.complete?Number(p.total):null,contributions};});}
async function makeReport(db,owner,space,period,s){
  assert(dateValid(period)&&period<=istDate(),'Use a completed valid cutoff date');const id=period+'-r1';const found=s.reports.find(x=>x.id===id);if(found)return found;
  const start=new Date(Date.parse(period)-7*86400000).toISOString().slice(0,10);const opening=portfolio(s,start),closing=portfolio(s,period);const events=s.events.filter(e=>e.date>start&&e.date<=period);
  const inflows=events.filter(e=>['BUY','FEE'].includes(e.type)).reduce((a,e)=>a+Number(e.amount)+Number(e.fees||0),0),outflows=events.filter(e=>['SELL','DIVIDEND'].includes(e.type)).reduce((a,e)=>a+Number(e.amount)-Number(e.fees||0),0);
  const partial=!opening.complete||!closing.complete||closing.dataQuality.stale>0||opening.dataQuality.stale>0;
  const report={id,period,start,revision:1,createdAt:now(),opening:opening.total,closing:closing.total,inflows,outflows,profit:partial?null:investmentProfit(opening.total,closing.total,inflows.toFixed(8),outflows.toFixed(8)),status:partial?'Partial':'Complete',reason:partial?'Missing or stale boundary valuations; investment profit unavailable':null,holdings:closing.holdings,goals:s.goals,sips:s.sips,sourceRefs:closing.sourceRefs,calculationVersion:VERSION,dataQuality:closing.dataQuality,asOf:period,actions:closing.holdings.filter(h=>h.stale||h.issues.length).slice(0,3).map(h=>({name:h.name,reason:h.issues[0]||'Update dated valuation'}))};
  // Insert-only deterministic ID freezes the first snapshot even under concurrent retries.
  await db.batch([db.prepare('INSERT OR IGNORE INTO records(owner,space,kind,id,payload,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').bind(owner,space,'reports',id,JSON.stringify(report),now(),now()),audit(db,owner,space,'report.generated',id)]);
  const saved=await query(db,'SELECT payload FROM records WHERE owner=? AND space=? AND kind=? AND id=?',[owner,space,'reports',id]);return JSON.parse(saved[0].payload);
}
async function readBody(req){assert(Number(req.headers.get('content-length')||0)<=2200000,'Request too large');const text=await req.text();assert(text.length<=2200000,'Request too large');try{return JSON.parse(text);}catch{throw new Error('Invalid request JSON');}}
export async function api(req,env){
 try {
  const owner=ownerOf(req),url=new URL(req.url),space=url.searchParams.get('space')==='demo'?'demo':'personal',path=url.pathname.replace(/^\/api/,'');
  assert(env.DB,'Database is not configured');
  if(req.method!=='GET'){const origin=req.headers.get('origin');if(origin&&origin!==url.origin)throw Object.assign(new Error('Origin mismatch'),{status:403});if(req.headers.get('sec-fetch-site')==='cross-site')throw Object.assign(new Error('Cross-site mutation rejected'),{status:403});}
  if(path==='/state'&&req.method==='GET') {const s=await state(env.DB,owner,space);return json({...s,portfolio:portfolio(s),history:history(s),space,identity:{name:req.headers.get('oai-authenticated-user-full-name')?decodeURIComponent(req.headers.get('oai-authenticated-user-full-name')):req.headers.get('oai-authenticated-user-email')||'My account'},scheduler:env.SCHEDULER_ENABLED==='true'?'Configured — heartbeat requires verification':'Not configured',providers:{nav:env.AMFI_ENABLED==='true'?'Configured':'Not configured',stocks:'Imported prices only',benchmarks:'Not configured',tax:'Unavailable — verified rule coverage required',ai:'Off',email:'Not configured'}});}
  if(path==='/simulate'&&req.method==='POST')return json(simulate(await readBody(req)));
  if(path==='/imports'&&req.method==='POST'){
    const b=await readBody(req);assert(typeof b.csv==='string','CSV required');const fileHash=await hash(b.csv),s=await state(env.DB,owner,space);const prior=s.imports.find(x=>x.hash===fileHash&&x.status!=='reversed');if(prior)return json(prior);
    const parsed=parseCSV(b.csv),rows=previewRows(parsed,b.mapping||{},s.events);const batch={id:uid(),name:String(b.name||'Manual import').slice(0,100),hash:fileHash,rows,mapping:b.mapping||{},status:'previewed',createdAt:now(),parserVersion:VERSION};
    await env.DB.batch([put(env.DB,owner,space,'imports',batch.id,batch),audit(env.DB,owner,space,'import.previewed',batch.id)]);return json(batch);
  }
  if(/^\/imports\/[\w-]+\/(confirm|reverse)$/.test(path)&&req.method==='POST'){
    const [, ,id,action]=path.split('/'),s=await state(env.DB,owner,space),batch=s.imports.find(x=>x.id===id);assert(batch,'Import not found');
    if(action==='reverse'){if(batch.status==='reversed')return json(batch);assert(batch.status==='posted','Only posted batches can be reversed');const remaining=s.events.filter(e=>e.batchId!==id);reconcile(remaining,[]);batch.status='reversed';await env.DB.batch([put(env.DB,owner,space,'imports',id,batch),audit(env.DB,owner,space,'import.reversed',id)]);return json(batch);}
    if(batch.status==='posted')return json(batch);assert(batch.status==='previewed','Batch cannot be posted');const b=await readBody(req);
    const accepted=[];for(const row of batch.rows){const fresh=previewRows({rows:[row]},batch.mapping||{},[...s.events,...accepted])[0];const chosen=b.include?.includes(row.row);if(row.status==='valid'&&fresh.status==='valid'||row.status==='review'&&chosen&&fresh.status==='review')accepted.push(row.record);}
    assert(accepted.length>0,'No valid selected rows; resolve duplicates or errors');reconcile(s.events,accepted);
    const statements=[];for(let i=0;i<accepted.length;i++){const r=accepted[i],approvedDuplicate=batch.rows.some(row=>row.record===r&&row.status==='review'),generation='-r'+s.imports.filter(x=>x.status==='reversed').length;const eventId=(r.source_reference?await hash([r.account,instrumentKey(r),r.type,r.source_reference].join('|')):approvedDuplicate?id+'-'+i:await hash(fingerprint(r)))+generation;const e={...r,asset:r.asset_class||undefined,id:eventId,batchId:id,sequence:i};statements.push(env.DB.prepare('INSERT OR IGNORE INTO records(owner,space,kind,id,payload,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').bind(owner,space,'events',e.id,JSON.stringify(e),now(),now()));if(e.price&&e.valuation_date){const q={id:instrumentKey(e)+'@'+e.valuation_date,instrumentKey:instrumentKey(e),date:e.valuation_date,price:e.price,source:'Imported CSV: '+batch.name};statements.push(put(env.DB,owner,space,'prices',q.id,q));}}
    batch.status='posted';batch.accepted=accepted.length;batch.confirmedAt=now();statements.push(put(env.DB,owner,space,'imports',id,batch),audit(env.DB,owner,space,'import.posted',id));await env.DB.batch(statements);return json(batch);
  }
  if(path==='/prices'&&req.method==='POST'){const b=await readBody(req),s=await state(env.DB,owner,space);assert(s.events.some(e=>instrumentKey(e)===b.instrumentKey),'Instrument not found');assert(dateValid(b.date)&&b.date<=istDate(),'Valid past valuation date required');assert(dec(b.price)>0n,'Price must be positive');const q={id:b.instrumentKey+'@'+b.date,instrumentKey:b.instrumentKey,date:b.date,price:String(b.price),source:String(b.source||'Manual valuation').slice(0,100)};await env.DB.batch([put(env.DB,owner,space,'prices',q.id,q),audit(env.DB,owner,space,'price.recorded',q.id)]);return json(q);}
  if(path==='/goals'&&req.method==='POST'){const b=await readBody(req),s=await state(env.DB,owner,space);assert(b.name&&b.name.length<=100,'Goal name required');simulate(b);const id=b.id||uid();const goal={...b,id,updatedAt:now()};allocationCheck([...s.goals.filter(g=>g.id!==id),goal]);for(const a of goal.assignments||[])assert(portfolio(s).holdings.some(h=>h.id===a.holdingId),'Assigned holding not found');await env.DB.batch([put(env.DB,owner,space,'goals',id,goal),audit(env.DB,owner,space,'goal.saved',id)]);return json(goal);}
  if(path==='/sips'&&req.method==='POST'){const b=await readBody(req);assert(b.name&&b.name.length<=150,'Fund name required');assert(Number(b.amount)>0&&Number(b.amount)<=100000000,'Positive SIP amount required');assert(Number(b.day)>=1&&Number(b.day)<=28,'Use a date between 1 and 28');assert(['planned','paused','cancelled'].includes(b.status||'planned'),'Invalid SIP status');assert(['monthly','quarterly'].includes(b.cadence||'monthly'),'Unsupported cadence');const sip={...b,id:b.id||uid(),status:b.status||'planned'};await env.DB.batch([put(env.DB,owner,space,'sips',sip.id,sip),audit(env.DB,owner,space,'sip.saved',sip.id)]);return json(sip);}
  if(path==='/preferences'&&req.method==='POST'){const b=await readBody(req);assert(Number(b.budget)>=0&&Number(b.budget)<=100000000,'Invalid budget');const p={budget:Number(b.budget),profile:b.profile||null,ai:false,email:false,reportDay:b.reportDay||'Saturday',reportTime:b.reportTime||'09:00',timezone:'Asia/Kolkata',updatedAt:now(),questionnaireVersion:'1'};await env.DB.batch([put(env.DB,owner,space,'preferences','main',p),audit(env.DB,owner,space,'preferences.saved','main')]);return json(p);}
  if(path==='/reports'&&req.method==='POST'){const b=await readBody(req),s=await state(env.DB,owner,space);return json(await makeReport(env.DB,owner,space,b.period,s));}
  if(path==='/export'&&req.method==='GET'){const s=await state(env.DB,owner,space);await env.DB.batch([audit(env.DB,owner,space,'data.exported','all')]);return new Response(JSON.stringify({exportedAt:now(),space,calculationVersion:VERSION,...s},null,2),{headers:{...headers,'Content-Disposition':'attachment; filename="artha-'+space+'-export.json"'}});}
  if(path==='/audit'&&req.method==='GET')return json(await query(env.DB,'SELECT action,entity_id,occurred_at,reason FROM audit_events WHERE owner=? AND space=? ORDER BY occurred_at DESC LIMIT 100',[owner,space]));
  if(path==='/delete'&&req.method==='POST'){const b=await readBody(req);assert(b.confirm==='DELETE','Type DELETE to erase this workspace');await env.DB.batch([env.DB.prepare('DELETE FROM records WHERE owner=? AND space=?').bind(owner,space),env.DB.prepare('DELETE FROM job_runs WHERE owner=?').bind(owner),env.DB.prepare('DELETE FROM audit_events WHERE owner=? AND space=?').bind(owner,space)]);return json({deleted:true});}
  if(path==='/refresh-nav'&&req.method==='POST'){assert(space==='personal','Live providers are disabled in demo');assert(env.AMFI_ENABLED==='true'&&env.AMFI_USAGE_APPROVED==='true','Enable permitted AMFI access in server configuration first');const result=await refreshNAV(env,await state(env.DB,owner,space));await env.DB.batch(result.map(q=>put(env.DB,owner,space,'prices',q.id,q)));return json({updated:result.length});}
  return json({error:'Operation not found'},404);
 }catch(e){return json({error:e.message||'Request failed'},e.status||400);}
}
export async function refreshNAV(env,s){
 const url='https://portal.amfiindia.com/spages/NAVAll.txt';let response;for(let attempt=0;attempt<3;attempt++){try{response=await fetch(url,{signal:AbortSignal.timeout(15000)});if(response.ok)break;}catch{}if(attempt<2)await new Promise(r=>setTimeout(r,250*2**attempt));}assert(response?.ok,'NAV provider unavailable; retained prior dated valuations');const body=await response.text();assert(body.length<10000000,'Provider response too large');
 const results=[];for(const line of body.split(/\r?\n/)){const p=line.split(';');if(p.length<6||!/^\d+$/.test(p[0]))continue;const events=s.events.filter(e=>e.identifier===p[0]&&e.instrument_type==='MF');for(const e of events){const d=new Date(p[5]);if(isNaN(d)||!Number.isFinite(+p[4])||+p[4]<=0)continue;const date=d.toISOString().slice(0,10),key=instrumentKey(e);results.push({id:key+'@'+date,instrumentKey:key,date,price:p[4],source:url,retrievedAt:now(),publicationAt:null});}}return results;
}
export async function runJobs(env,at=new Date()){
 // A scheduler must actually invoke this server-side. Nothing depends on a browser timer.
 const owners=await query(env.DB,"SELECT DISTINCT owner FROM records WHERE space='personal'");const results=[];
 for(const {owner} of owners){const s=await state(env.DB,owner,'personal');const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',weekday:'long',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(at);const part=k=>parts.find(x=>x.type===k)?.value;
  const weekdays=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],day=weekdays.indexOf(part('weekday')),scheduledDay=weekdays.indexOf(s.preferences.reportDay||'Saturday');let delta=(day-scheduledDay+7)%7;if(delta===0&&[part('hour'),part('minute')].join(':')<(s.preferences.reportTime||'09:00'))delta=7;
  const cutoff=new Date(istDate(at)+'T00:00:00Z');cutoff.setUTCDate(cutoff.getUTCDate()-delta-1);const period=cutoff.toISOString().slice(0,10);const prior=await query(env.DB,'SELECT status,attempts,updated_at FROM job_runs WHERE owner=? AND period=? AND revision=1',[owner,period]);if(prior[0]?.status==='complete')continue;if(prior[0]?.status==='failed'&&at.getTime()-Date.parse(prior[0].updated_at)<Math.min(3600000,60000*2**prior[0].attempts))continue;
  const attempts=(prior[0]?.attempts||0)+1;
  try{await makeReport(env.DB,owner,'personal',period,s);await env.DB.batch([env.DB.prepare('INSERT INTO job_runs(owner,period,revision,status,attempts,updated_at) VALUES(?,?,1,?,?,?) ON CONFLICT(owner,period,revision) DO UPDATE SET status=excluded.status,attempts=excluded.attempts,updated_at=excluded.updated_at').bind(owner,period,'complete',attempts,at.toISOString())]);results.push({status:'complete'});}catch{await env.DB.batch([env.DB.prepare('INSERT INTO job_runs(owner,period,revision,status,attempts,updated_at) VALUES(?,?,1,?,?,?) ON CONFLICT(owner,period,revision) DO UPDATE SET status=excluded.status,attempts=excluded.attempts,updated_at=excluded.updated_at').bind(owner,period,'failed',attempts,at.toISOString())]);results.push({status:'failed'});}
 }return results;
}
