interface Env {
  DEVICE_CODES: KVNamespace;
}

const ROUTES: Record<string, string> = {
  '/smartvideo/': 'https://smartvideo-api.galaxydve.com/',
  '/auth/': 'https://userv1.dv-content.io/',
};

const ALLOWED_HEADERS = 'Content-Type, Authorization, X-Requested-With, Accept, Origin';
const PIN_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const PIN_LENGTH = 6;
const PIN_TTL_SECONDS = 300;

function addCorsHeaders(headers: Headers): Headers {
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS);
  headers.set('Access-Control-Max-Age', '86400');
  return headers;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: addCorsHeaders(new Headers({ 'Content-Type': 'application/json' })),
  });
}

function generatePin(): string {
  const bytes = new Uint8Array(PIN_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => PIN_CHARS[b % PIN_CHARS.length]).join('');
}

function resolveTarget(pathname: string): { origin: string; rest: string } {
  for (const [prefix, origin] of Object.entries(ROUTES)) {
    if (pathname.startsWith(prefix)) {
      return { origin, rest: pathname.slice(prefix.length) };
    }
  }
  return { origin: 'https://smartvideo-api.galaxydve.com/', rest: pathname.replace(/^\//, '') };
}

async function handleDeviceCode(env: Env): Promise<Response> {
  let code: string;
  let attempts = 0;
  do {
    code = generatePin();
    const existing = await env.DEVICE_CODES.get(code);
    if (!existing) break;
    attempts++;
  } while (attempts < 5);

  await env.DEVICE_CODES.put(
    code,
    JSON.stringify({ status: 'pending', createdAt: Date.now() }),
    { expirationTtl: PIN_TTL_SECONDS },
  );

  return jsonResponse({ code, expiresIn: PIN_TTL_SECONDS });
}

async function handleDeviceVerify(request: Request, env: Env): Promise<Response> {
  const body = await request.json<{ code?: string; user?: unknown }>();
  const { code, user } = body;

  if (!code || !user) {
    return jsonResponse({ error: 'Missing code or user' }, 400);
  }

  const entry = await env.DEVICE_CODES.get(code);
  if (!entry) {
    return jsonResponse({ error: 'Invalid or expired code' }, 404);
  }

  await env.DEVICE_CODES.put(
    code,
    JSON.stringify({ status: 'complete', user, createdAt: Date.now() }),
    { expirationTtl: 60 },
  );

  return jsonResponse({ ok: true });
}

async function handleDevicePoll(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return jsonResponse({ error: 'Missing code parameter' }, 400);
  }

  const entry = await env.DEVICE_CODES.get(code);
  if (!entry) {
    return jsonResponse({ status: 'expired' });
  }

  const data = JSON.parse(entry);

  if (data.status === 'complete') {
    await env.DEVICE_CODES.delete(code);
    return jsonResponse({ status: 'complete', user: data.user });
  }

  return jsonResponse({ status: 'pending' });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: addCorsHeaders(new Headers()) });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/device/code' && request.method === 'POST') {
      return handleDeviceCode(env);
    }
    if (path === '/device/verify' && request.method === 'POST') {
      return handleDeviceVerify(request, env);
    }
    if (path === '/device/poll' && request.method === 'GET') {
      return handleDevicePoll(request, env);
    }

    const route = resolveTarget(path);
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
} satisfies ExportedHandler<Env>;
