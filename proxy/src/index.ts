interface Env {}

const ROUTES: Record<string, string> = {
  '/smartvideo/': 'https://smartvideo-api.galaxydve.com/',
  '/auth/': 'https://userv1.dv-content.io/',
};

const ALLOWED_HEADERS = 'Content-Type, Authorization, X-Requested-With, Accept, Origin';

function addCorsHeaders(headers: Headers): Headers {
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS);
  headers.set('Access-Control-Max-Age', '86400');
  return headers;
}

function resolveTarget(pathname: string): { origin: string; rest: string } {
  for (const [prefix, origin] of Object.entries(ROUTES)) {
    if (pathname.startsWith(prefix)) {
      return { origin, rest: pathname.slice(prefix.length) };
    }
  }
  return { origin: 'https://smartvideo-api.galaxydve.com/', rest: pathname.replace(/^\//, '') };
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: addCorsHeaders(new Headers()) });
    }

    const url = new URL(request.url);
    const route = resolveTarget(url.pathname);
    const target = route.origin + route.rest + url.search;

    const reqHeaders = new Headers(request.headers);
    reqHeaders.delete('host');
    reqHeaders.delete('origin');
    reqHeaders.delete('referer');

    const upstream = await fetch(target, {
      method: request.method,
      headers: reqHeaders,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
    });

    const responseHeaders = new Headers(upstream.headers);
    addCorsHeaders(responseHeaders);

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  },
} satisfies ExportedHandler;
