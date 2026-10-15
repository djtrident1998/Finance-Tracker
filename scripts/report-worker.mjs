import {openLocal} from './local-db.mjs';
import {runJobs} from '../src/server.mjs';
const env={DB:openLocal()};let active=false;
async function tick(){if(active)return;active=true;try{const results=await runJobs(env);if(results.length)console.log(new Date().toISOString()+': report jobs processed: '+results.length);}catch{console.error('Report worker could not complete a cycle');}finally{active=false;}}
await tick();if(!process.argv.includes('--once')){console.log('Local report worker running. This process must remain running.');setInterval(tick,60000);}else env.DB.close();
