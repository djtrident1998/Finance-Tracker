import {mkdir,readFile,writeFile,cp} from 'node:fs/promises';
import {migrateNeon} from './migrate-neon.mjs';

if (process.env.VERCEL === '1') {
  if (!process.env.NEON_AUTH_BASE_URL || !process.env.NEON_AUTH_COOKIE_SECRET) throw new Error('Vercel authentication environment is missing');
  await migrateNeon(process.env.DATABASE_URL);
}
const out = new URL('../public/',import.meta.url);
await mkdir(out,{recursive:true});
for (const file of ['index.html','app.css','login.html','login.js']) await cp(new URL('../web/'+file,import.meta.url),new URL(file,out));
const app = (await readFile(new URL('../web/app.js',import.meta.url),'utf8'))
  .replaceAll('/signin-with-chatgpt?return_to=%2F','/login')
  .replaceAll('Sign in with ChatGPT','Sign in')
  .replaceAll('<a class="btn" href="/signout-with-chatgpt?return_to=%2F" target="_top">Sign out</a>','<a class="btn" href="/login?signout=1">Sign out</a>');
await writeFile(new URL('app.js',out),app);
await writeFile(new URL('sw.js',out),"self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())await caches.delete(k);await self.clients.claim();})()));");
await writeFile(new URL('icon.svg',out),'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="40" fill="#224e3b"/><text x="47" y="142" font-family="Georgia" font-size="155" fill="#edf3df">a</text></svg>');
await writeFile(new URL('manifest.webmanifest',out),JSON.stringify({name:'Artha — Portfolio & SIP',short_name:'Artha',start_url:'/',display:'standalone',background_color:'#f7f8f3',theme_color:'#224e3b',icons:[{src:'/icon.svg',sizes:'any',type:'image/svg+xml'}]}));
console.log('Vercel application assets built.');
