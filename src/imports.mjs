import {assert,dateValid,dec,position} from './finance.mjs';
export const COLUMNS=['identifier','name','instrument_type','account','date','type','units','price','amount','fees','currency','source_reference','plan','option','category','valuation_date','closing_units','settlement_date','asset_class'];
export function parseCSV(text){
  assert(typeof text==='string'&&text.length<=2000000,'CSV must be under 2 MB');
  const rows=[];let row=[],field='',quoted=false;
  text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(field);field='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(Boolean))rows.push(row);row=[];field='';}else field+=c;}
  assert(!quoted,'Unclosed quoted field');row.push(field);if(row.some(Boolean))rows.push(row);
  assert(rows.length>=2,'CSV needs a header and at least one data row'); assert(rows.length<=10001,'Maximum 10,000 rows');
  const headers=rows.shift().map(x=>x.trim().toLowerCase());assert(new Set(headers).size===headers.length,'Duplicate headers');
  return {headers,rows:rows.map((r,i)=>({row:i+2,raw:Object.fromEntries(headers.map((h,j)=>[h,(r[j]||'').trim()]))}))};
}
export const instrumentKey=r=>[r.identifier,r.instrument_type,r.plan||'',r.option||''].join('|');
export const fingerprint=r=>[r.identifier,r.instrument_type,r.plan,r.option,r.account,r.date,r.type,r.units,r.price,r.amount,r.fees].join('|');
export function validateRow(raw,mapping={}){
  const r={};for(const key of COLUMNS)r[key]=String(raw[mapping[key]||key]??'').trim();
  r.type=r.type.toUpperCase();r.instrument_type=r.instrument_type.toUpperCase();r.currency=r.currency||'INR';r.fees=r.fees||'0';
  const errors=[]; const check=(v,s)=>{if(!v)errors.push(s);};
  check(r.identifier.length>0&&r.identifier.length<=80,'Identifier required');check(r.name.length>0&&r.name.length<=150,'Name required');check(['MF','STOCK','ETF'].includes(r.instrument_type),'Type must be MF, STOCK or ETF');check(r.account.length>0&&r.account.length<=60,'Account reference required');check(dateValid(r.date),'Valid transaction date required');
  check(['BUY','SELL','OPENING','DIVIDEND','REINVEST','FEE','SPLIT','BONUS','TRANSFER_IN','TRANSFER_OUT'].includes(r.type),'Unsupported event: review manually');
  check(r.currency==='INR','Only INR supported');if(r.settlement_date)check(dateValid(r.settlement_date),'Invalid settlement date');
  if(r.instrument_type==='MF'){check(['Direct','Regular'].includes(r.plan),'MF plan must be Direct or Regular');check(['Growth','IDCW'].includes(r.option),'MF option must be Growth or IDCW');}
  try{if(!['DIVIDEND','FEE','SPLIT'].includes(r.type))check(dec(r.units)>0n,'Units must be positive');if(r.type==='SPLIT')check(dec(r.price)>0n,'Positive split ratio required');else if(r.price)check(dec(r.price)>=0n,'Price cannot be negative');if(r.amount)check(dec(r.amount)>=0n,'Amount cannot be negative');check(dec(r.fees)>=0n,'Fees cannot be negative');if(r.closing_units)check(dec(r.closing_units)>=0n,'Invalid closing units');}catch(e){errors.push(e.message);}
  if(['BUY','SELL','REINVEST'].includes(r.type)){
    check(!!r.price&&!!r.amount,'Price and gross amount required');
    try{check(dec(r.price||0)>0n&&dec(r.amount||0)>0n,'Positive price and gross amount required');}catch{}
  }
  if(['DIVIDEND','FEE'].includes(r.type))check(!!r.amount,'Cash amount required');
  if(r.valuation_date)check(dateValid(r.valuation_date),'Invalid valuation date');
  if(r.asset_class)check(['Equity','Debt','Gold','Cash','Other','Unclassified'].includes(r.asset_class),'Invalid asset_class');
  if(r.date>new Date().toISOString().slice(0,10))errors.push('Future ledger dates not allowed');
  return {record:r,errors};
}
export function previewRows(parsed,mapping,existing=[]){
  const seen=[...existing];return parsed.rows.map(x=>{const {record:r,errors}=validateRow(x.raw,mapping);let status=errors.length?'rejected':'valid';
    const prior=seen.find(e=>e.source_reference&&r.source_reference&&e.account===r.account&&e.source_reference===r.source_reference&&e.identifier===r.identifier&&e.type===r.type);
    const similar=seen.some(e=>fingerprint(e)===fingerprint(r));
    if(!errors.length&&prior){status='duplicate';errors.push('Source reference already present');}else if(!errors.length&&similar){status='review';errors.push('Identical economics; confirm if this is a separate legitimate event');}
    if(status!=='rejected'&&status!=='duplicate')seen.push(r);
    return {...x,record:r,status,errors};});
}
export function reconcile(events,rows){const groups=new Map();for(const r of [...events,...rows]){const k=instrumentKey(r)+'|'+r.account;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);}for(const [k,es] of groups){const p=position(es,null);const closing=[...rows].reverse().find(x=>instrumentKey(x)+'|'+x.account===k&&x.closing_units);if(closing)assert(dec(p.units)===dec(closing.closing_units),'Closing units do not reconcile: '+k);}return true;}
export function safeCSVCell(s){const t=String(s??'');return '"'+(/^[=+\-@\t\r]/.test(t)?"'"+t:t).replaceAll('"','""')+'"';}
