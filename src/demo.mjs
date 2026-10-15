export function demoData(){
 const entries=[
 ['demo-index','Nifty 50 Index Fund','MF','Index','Equity',3600,210,265,'Direct','Growth'],
 ['demo-flexi','Horizon Flexi Cap Fund','MF','Flexi cap','Equity',2800,165,207,'Direct','Growth'],
 ['demo-debt','Stability Short Duration Fund','MF','Short duration','Debt',10000,28,31.2,'Direct','Growth'],
 ['demo-gold','Gold Exchange Traded Fund','ETF','Gold · NSE','Gold',1600,95,112,'',''],
 ['demo-stock','Evergreen Technologies','STOCK','Technology · NSE','Equity',240,1250,1600,'',''],
 ['demo-mid','Horizon Mid Cap Fund','MF','Mid cap','Equity',950,60,80,'Direct','Growth']
 ];
 const events=[],prices=[];entries.forEach(([id,name,type,category,asset,units,cost,price,plan,option],index)=>{
   const common={identifier:id,name,instrument_type:type,category,asset,account:index===4?'Broker ••2041':'Folio ••0812',plan,option,currency:'INR',fees:'0'};
   events.push({...common,id:'demo-event-'+index,date:'2024-10-01',type:'BUY',units:String(units),price:String(cost),amount:String(units*cost),source_reference:'synthetic-'+index});
   for(let m=0;m<=24;m++){let d=new Date(Date.UTC(2024,9+m,1));let progress=m/24;let v=cost+(price-cost)*progress+Math.sin(m*.6+index)*(price-cost)*.13*Math.sin(progress*Math.PI);prices.push({instrumentKey:[id,type,plan,option].join('|'),price:v.toFixed(6),date:m===24?'2026-10-14':d.toISOString().slice(0,10),source:'Synthetic demonstration fixture'});}
 });
 return {events,prices,goals:[{id:'demo-home',name:'A place to call home',icon:'home',target:5000000,years:7,corpus:850000,monthly:25000,inflation:6,stepUp:10,todayMoney:false,priority:'High',assignments:[]},{id:'demo-retirement',name:'Financial freedom',icon:'sun',target:30000000,years:24,corpus:1100000,monthly:18000,inflation:6,stepUp:8,todayMoney:true,priority:'High',assignments:[]},{id:'demo-travel',name:'The Japan trip',icon:'plane',target:450000,years:3,corpus:120000,monthly:7000,inflation:5,stepUp:0,todayMoney:false,priority:'Medium',assignments:[]}],sips:[{id:'sip-1',name:entries[0][1],amount:20000,day:5,status:'planned',cadence:'monthly'},{id:'sip-2',name:entries[1][1],amount:15000,day:10,status:'planned',cadence:'monthly'},{id:'sip-3',name:entries[2][1],amount:8000,day:15,status:'planned',cadence:'monthly'},{id:'sip-4',name:entries[5][1],amount:7000,day:20,status:'planned',cadence:'monthly'}],reports:[],imports:[],preferences:{budget:55000,profile:null,ai:false,schedule:'Saturday, 09:00 Asia/Kolkata',email:false}};
}
