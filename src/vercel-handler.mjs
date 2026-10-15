import {api} from './server.mjs';

const reply = (error, status) => Response.json({error}, {status, headers:{'Cache-Control':'private, no-store'}});

export function verifiedRequest(request, user) {
  const headers = new Headers(request.headers);
  for (const key of [...headers.keys()]) if (key.startsWith('oai-')) headers.delete(key);
  headers.set('oai-authenticated-user-id', user.id);
  headers.set('oai-authenticated-user-full-name', encodeURIComponent(user.name || 'My account'));
  return new Request(request, {headers});
}

export function createVercelHandler({getSession, proxyAuth, getDB}) {
  return async request => {
    const url = new URL(request.url);
    if (!['GET','HEAD','POST','DELETE'].includes(request.method)) return reply('Method not allowed',405);
    if (!['GET','HEAD'].includes(request.method)) {
      const origin = request.headers.get('origin');
      if ((origin && origin !== url.origin) || request.headers.get('sec-fetch-site') === 'cross-site') return reply('Origin mismatch',403);
    }
    try {
      if (url.pathname.startsWith('/api/auth/')) return await proxyAuth(request);
      if (!url.pathname.startsWith('/api/')) return reply('Not found',404);
      const {user, cookies = []} = await getSession(request);
      if (!user?.id) return reply('Sign in to your private workspace',401);
      const response = await api(verifiedRequest(request,user), {DB:getDB()});
      for (const cookie of cookies) response.headers.append('Set-Cookie',cookie);
      return response;
    } catch {
      return reply('The service is temporarily unavailable. Please try again.',503);
    }
  };
}
