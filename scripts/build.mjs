import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const modules=['finance','imports','demo','server'];let code='';
for(const name of modules)code+=(await readFile(resolve(root,'src',name+'.mjs'),'utf8')).replace(/^import .*;\r?\n/gm,'').replace(/\bexport (?=(?:async )?(?:const|function|class))/g,'')+'\n';
const assets={};for(const [path,file,type] of [['/','index.html','text/html; charset=utf-8'],['/app.js','app.js','text/javascript; charset=utf-8'],['/app.css','app.css','text/css; charset=utf-8']])assets[path]={body:await readFile(resolve(root,'web',file),'utf8'),type};
assets['/icon.svg']={body:'<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192"><rect width="192" height="192" rx="40" fill="#224e3b"/><text x="47" y="142" font-family="Georgia" font-size="155" fill="#edf3df">a</text><path d="M122 59l37-27m-24 0h24v24" stroke="#d8e8a5" fill="none" stroke-width="9"/></svg>',type:'image/svg+xml'};
assets['/manifest.webmanifest']={body:JSON.stringify({id:'/',name:'Artha — Portfolio & SIP',short_name:'Artha',description:'Your wealth, with purpose.',start_url:'/',display:'standalone',background_color:'#f7f8f3',theme_color:'#224e3b',icons:[{src:'/icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'}]}),type:'application/manifest+json'};
assets['/sw.js']={body:"self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())await caches.delete(k);await self.clients.claim();})()));self.addEventListener('fetch',()=>{});",type:'text/javascript'};
code+='\nconst ASSETS='+JSON.stringify(assets)+';\n';
code+=`export default {
 async fetch(request,env,ctx){const path=new URL(request.url).pathname;
  if(path==='/internal/jobs'){if(!env.JOB_SECRET||request.headers.get('Authorization')!=='Bearer '+env.JOB_SECRET||request.method!=='POST')return json({error:'Unauthorized'},401);return json(await runJobs(env));}
  if(path.startsWith('/api/'))return api(request,env);
  const asset=ASSETS[path];if(!asset)return new Response('Not found',{status:404});
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
  return new Response(request.method==='HEAD'?null:asset.body,{headers:{'Content-Type':asset.type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Content-Security-Policy':"default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; script-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'"}});
 },async scheduled(controller,env,ctx){ctx.waitUntil(runJobs(env,new Date(controller.scheduledTime)));}
};`;
await mkdir(resolve(root,'worker'),{recursive:true});await writeFile(resolve(root,'worker/index.js'),code);
await mkdir(resolve(root,'dist/server'),{recursive:true});await mkdir(resolve(root,'dist/.openai'),{recursive:true});await writeFile(resolve(root,'dist/server/index.js'),code);await cp(resolve(root,'.openai/hosting.json'),resolve(root,'dist/.openai/hosting.json'));await cp(resolve(root,'drizzle'),resolve(root,'dist/.openai/drizzle'),{recursive:true});
console.log('Built Artha Worker with embedded application assets and D1 migrations.');
