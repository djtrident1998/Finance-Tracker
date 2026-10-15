export const VERSION = '1.0.0';
const SCALE = 100000000n;
export function dec(v) {
  if (typeof v === 'bigint') return v;
  const s = String(v ?? 0).trim();
  if (!/^-?\d+(\.\d{1,8})?$/.test(s)) throw new Error('Use a decimal number with at most 8 decimal places');
  const [a,b=''] = s.replace('-','').split('.');
  return (BigInt(a)*SCALE + BigInt(b.padEnd(8,'0'))) * (s[0]==='-'?-1n:1n);
}
export function str(v) { const sign=v<0n?'-':''; const x=v<0n?-v:v; return sign+String(x/SCALE)+'.'+String(x%SCALE).padStart(8,'0'); }
export const mul=(a,b)=>a*b/SCALE;
export const div=(a,b)=>{if(!b)throw new Error('Division by zero');return a*SCALE/b;};
export const num=v=>Number(v)/1e8;
export function dateValid(s) { return typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s)) && new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s; }
export function istDate(now=new Date()) {return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export function assert(condition,message) {if(!condition)throw new Error(message);}
export function position(events, price) {
  let units=0n, basis=0n, realized=0n, distributions=0n, unknown=false; const lots=[]; const issues=[];
  for(const e of [...events].sort((a,b)=>a.date.localeCompare(b.date)||(a.sequence??0)-(b.sequence??0))) {
    let u=dec(e.units||0), p=dec(e.price||0), fees=dec(e.fees||0), amount=dec(e.amount||str(mul(u,p)));
    if(['BUY','REINVEST','OPENING','TRANSFER_IN','BONUS'].includes(e.type)) {
      const cost=['OPENING','TRANSFER_IN'].includes(e.type)?null:e.type==='BONUS'?0n:amount+fees;
      units+=u; if(cost===null)unknown=true;else basis+=cost;
      lots.push({units:u,basis:cost,date:['OPENING','TRANSFER_IN'].includes(e.type)?null:e.date});
    } else if(['SELL','TRANSFER_OUT'].includes(e.type)) {
      assert(u<=units,'Sale or transfer exceeds available units'); units-=u;let remaining=u, disposed=0n,known=true;
      for(const lot of lots) {if(!remaining)break;const take=remaining<lot.units?remaining:lot.units; const cost=lot.basis===null?null:lot.units?lot.basis*take/lot.units:0n; if(cost===null)known=false; else {disposed+=cost;basis-=cost;lot.basis-=cost;}lot.units-=take;remaining-=take;}
      if(e.type==='SELL'&&known)realized+=amount-fees-disposed;
      if(!known)issues.push('Acquisition history missing for disposed units');
    } else if(e.type==='DIVIDEND')distributions+=amount;
    else if(e.type==='FEE')realized-=amount;
    else if(e.type==='SPLIT') {assert(p>0n,'Split ratio must be positive');units=mul(units,p);for(const lot of lots)lot.units=mul(lot.units,p);}
    else issues.push('Unsupported event: '+e.type);
  }
  unknown=lots.some(l=>l.units>0n&&l.basis===null);
  const value=price==null?null:mul(units,dec(price));
  return {units:str(units),basis:unknown?null:str(basis),value:value===null?null:str(value),unrealized:unknown||value===null?null:str(value-basis),realized:issues.length?null:str(realized),distributions:str(distributions),issues,lots:lots.filter(l=>l.units>0n).map(l=>({units:str(l.units),basis:l.basis===null?null:str(l.basis),date:l.date}))};
}
export function xirr(flows) {
  const f=flows.filter(x=>x.amount!==0).sort((a,b)=>a.date.localeCompare(b.date));
  if(f.length<2||!f.some(x=>x.amount<0)||!f.some(x=>x.amount>0))return {value:null,reason:'Insufficient dated cash flows'};
  const d0=Date.parse(f[0].date),years=f.map(x=>(Date.parse(x.date)-d0)/86400000/365);
  if(years.at(-1)<=0)return {value:null,reason:'Insufficient history'};
  const fn=x=>f.reduce((s,c,i)=>s+c.amount*Math.exp(-x*years[i]),0);
  const roots=[];let left=-18,fl=fn(left);
  for(let right=-17.975;right<=14;right+=.025){let fr=fn(right);if(fl*fr<0){let a=left,b=right;for(let j=0;j<100;j++){const m=(a+b)/2;if(fn(a)*fn(m)<=0)b=m;else a=m;}const root=Math.expm1((a+b)/2);if(!roots.some(r=>Math.abs(r-root)<1e-6))roots.push(root);}left=right;fl=fr;}
  if(roots.length!==1)return {value:null,reason:roots.length?'Ambiguous: multiple plausible roots':'No valid root found'};
  // Non-conventional cash flows can also have tangent roots; do not claim uniqueness.
  const signs=f.map(x=>Math.sign(x.amount)).filter((x,i,a)=>!i||x!==a[i-1]);
  if(signs.length>2)return {value:null,reason:'Ambiguous: non-conventional cash flows require root review'};
  return {value:roots[0],reason:years.at(-1)<1?'Annualized; history shorter than one year':null};
}
export function simulate(input) {
  const p={target:2500000,years:10,corpus:0,monthly:10000,inflation:6,stepUp:0,timing:'end',todayMoney:true,...input};
  for(const k of ['target','years','corpus','monthly','inflation','stepUp'])assert(Number.isFinite(+p[k]),'Invalid '+k);
  assert(p.years>0&&p.years<=60&&p.target>=0&&p.corpus>=0&&p.monthly>=0&&p.inflation>=0&&p.inflation<=30&&p.stepUp>=0&&p.stepUp<=100,'Planner inputs out of range');
  const months=Math.round(p.years*12); assert(months>=1,'Use at least one month');
  const target=p.target*(p.todayMoney?Math.pow(1+p.inflation/100,months/12):1);
  const run=(annual,payment)=>{
    assert(annual>-100&&annual<=100,'Return assumption must be above -100% and at most 100%');
    const i=Math.pow(1+annual/100,1/12)-1; let corpus=dec(Number(p.corpus).toFixed(8)),paid=0n,points=[{month:0,value:num(corpus),contributions:0}];
    for(let m=0;m<months;m++) {const contribution=dec((payment*Math.pow(1+p.stepUp/100,Math.floor(m/12))).toFixed(8));const extra=(p.oneTimes||[]).filter(x=>x.month===m+1).reduce((s,x)=>s+Number(x.amount),0);const withdrawal=(p.withdrawals||[]).filter(x=>x.month===m+1).reduce((s,x)=>s+Number(x.amount),0);assert(extra>=0&&withdrawal>=0,'Negative cash movement'); if(p.timing==='begin')corpus+=contribution;corpus=dec((num(corpus)*(1+i)).toFixed(8));if(p.timing!=='begin')corpus+=contribution;corpus+=dec(extra.toFixed(8))-dec(withdrawal.toFixed(8));paid+=contribution+dec(extra.toFixed(8));if((m+1)%12===0||m===months-1)points.push({month:m+1,value:num(corpus),contributions:num(paid)});}
    return {corpus:num(corpus),contributions:num(paid),points};
  };
  const rates=p.rates||[6,10,12]; assert(rates.length===3&&rates.every(r=>Number.isFinite(+r)),'Use three return scenarios');
  return {target,months,assumptions:p,scenarios:rates.map((r,j)=>{const projected=run(+r,+p.monthly);const zero=run(+r,0).corpus,one=run(+r,1).corpus;const required=zero>=target?0:Math.max(0,(target-zero)/(one-zero));return {name:['Conservative','Base case','Optimistic'][j],rate:+r,...projected,shortfall:Math.max(0,target-projected.corpus),required,affordable:required<=p.monthly};}),asOf:istDate(),sourceRefs:['User-supplied planning assumptions'],dataQuality:{illustrative:true},calculationVersion:VERSION};
}
export const investmentProfit=(start,end,inflow,outflow)=>str(dec(end)-dec(start)-dec(inflow)+dec(outflow));
export function allocationCheck(goals) {const totals={};for(const g of goals)for(const a of g.assignments||[]){assert(a.fraction>=0&&a.fraction<=1,'Invalid assignment');totals[a.holdingId]=(totals[a.holdingId]||0)+a.fraction;assert(totals[a.holdingId]<=1+1e-10,'A holding cannot be assigned beyond 100%');}return totals;}
export function overlap(a,b){return Object.entries(a).reduce((s,[k,v])=>s+Math.min(v,b[k]||0),0);}
export function percentile(values,value,invert=false){const below=values.filter(x=>x<value).length,equal=values.filter(x=>x===value).length;const rank=below+(equal+1)/2;const p=100*(rank-1)/(values.length-1);return invert?100-p:p;}
export function scoreFund(f,cohort){
  const required=['excess','drawdown','downside','sharpe','ter','managerStability','mandateStability'];
  const eligible=cohort.filter(x=>x.type==='active'&&x.years>=5&&x.coverage>=.95&&required.every(k=>Number.isFinite(x[k])));
  const peers=[...new Map(eligible.map(x=>[x.underlyingId,x])).values()];
  if(f.type!=='active')return {value:null,reason:'Category-specific metrics only; active equity score does not apply'};
  if(!peers.some(x=>x.id===f.id)||peers.length<10)return {value:null,reason:'Requires five years, 95% common observations, complete metrics and ten underlying schemes'};
  const pct=(k,inv=false)=>percentile(peers.map(x=>x[k]),f[k],inv);
  const components={consistency:pct('excess'),downside:(pct('drawdown',true)+pct('downside',true))/2,riskAdjusted:pct('sharpe'),cost:pct('ter',true),stability:(f.managerStability+f.mandateStability)/2};
  const value=components.consistency*.30+components.downside*.25+components.riskAdjusted*.20+components.cost*.15+components.stability*.10;
  return {value,components,peerCount:peers.length,withoutStability:(value-components.stability*.1)/.9,calculationVersion:VERSION};
}
export function reviewTrigger(a,b){return !!(a?.quarterEnd&&b?.quarterEnd&&a.quarterEnd!==b.quarterEnd&&a.score<50&&b.score<50&&a.excess<0&&b.excess<0);}
export function validateNarrative(text,evidenceNumbers){return [...text.matchAll(/\d+(?:\.\d+)?/g)].every(m=>evidenceNumbers.map(String).includes(m[0]));}
