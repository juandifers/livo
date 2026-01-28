export const runtime = 'nodejs';

function getBackendConfig() {
  const fallbackApiBase =
    process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000/api'
      : 'https://livo-backend-api.vercel.app/api';

  const raw =
    process.env.LIVO_BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    fallbackApiBase;

  // If env is a relative "/api", fall back to the default real backend base.
  const apiBase = raw.startsWith('http') ? raw : fallbackApiBase;
  const u = new URL(apiBase);

  return {
    origin: u.origin,
    apiPrefix: u.pathname.replace(/\/$/, ''), // usually "/api"
  };
}

async function proxy(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { origin, apiPrefix } = getBackendConfig();
  const { path } = await ctx.params;

  const url = new URL(req.url);
  const target = new URL(`${origin}${apiPrefix}/${path.join('/')}${url.search}`);

  // Copy headers through (esp. Authorization). Let fetch handle Host.
  const headers = new Headers(req.headers);
  headers.delete('host');

  const method = req.method.toUpperCase();
  const init: RequestInit = {
    method,
    headers,
    redirect: 'manual',
  };

  if (method !== 'GET' && method !== 'HEAD') {
    init.body = await req.arrayBuffer();
  }

  const upstream = await fetch(target, init);

  // Stream response back with status + headers.
  const resHeaders = new Headers(upstream.headers);
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: resHeaders,
  });
}

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx);
}
export async function POST(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx);
}
export async function PUT(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx);
}
export async function PATCH(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx);
}
export async function DELETE(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx);
}
export async function OPTIONS(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx);
}

