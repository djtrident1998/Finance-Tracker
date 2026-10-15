import {createAuthServer, handleAuthProxyRequest, extractNeonAuthCookies, serializeSetCookie} from '@neondatabase/auth/server';
import {NeonDB} from '../src/neon-db.mjs';
import {createVercelHandler} from '../src/vercel-handler.mjs';

function authConfig() {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!baseUrl || !cookieSecret || cookieSecret.length < 32) throw new Error('Authentication is not configured');
  return {baseUrl, cookieSecret, sessionDataTtl:60, sameSite:'lax'};
}

const handler = createVercelHandler({
  getDB: () => new NeonDB(process.env.DATABASE_URL),
  proxyAuth: request => handleAuthProxyRequest({
    ...authConfig(), request,
    path:new URL(request.url).pathname.slice('/api/auth/'.length),
  }),
  getSession: async request => {
    const cookies = [];
    const auth = createAuthServer({...authConfig(), context: () => ({
      getCookies: () => extractNeonAuthCookies(request.headers.get('cookie') || ''),
      setCookie: (name,value,options) => cookies.push(serializeSetCookie({name,value,...options})),
      getHeader: name => request.headers.get(name),
      getOrigin: () => new URL(request.url).origin,
      getFramework: () => 'node',
    })});
    const result = await auth.getSession();
    if (result.error) throw new Error('Session service unavailable');
    return {user:result.data?.user,cookies};
  },
});

export const GET = handler;
export const POST = handler;
export const DELETE = handler;
export const HEAD = handler;
