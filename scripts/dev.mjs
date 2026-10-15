import {createServer} from 'node:http';
import worker from '../worker/index.js';
import {openLocal} from './local-db.mjs';
const env={DB:openLocal(),SCHEDULER_ENABLED:'false'};const port=Number(process.env.PORT||4173);
const server=createServer(async(req,res)=>{try{let chunks=[],bytes=0;for await(const c of req){bytes+=c.length;if(bytes>2200000){res.writeHead(413);res.end('Request too large');return;}chunks.push(c);}const body=Buffer.concat(chunks);const h=new Headers(req.headers);for(const key of [...h.keys()])if(key.startsWith('oai-authenticated-user-'))h.delete(key);h.set('oai-authenticated-user-id','local-owner');h.set('oai-authenticated-user-email','local@artha.test');const request=new Request('http://127.0.0.1:'+port+req.url,{method:req.method,headers:h,...(!['GET','HEAD'].includes(req.method)?{body}:{} )});const response=await worker.fetch(request,env,{waitUntil:p=>p.catch(()=>{})});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch(e){res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}));}});
server.listen(port,'127.0.0.1',()=>console.log('Artha local preview: http://127.0.0.1:'+port+' (local owner only; not production authentication)'));
process.on('SIGINT',()=>server.close(()=>{env.DB.close();process.exit(0);}));
