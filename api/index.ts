import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApiApp } from './_lib/apiApp';

const app = createApiApp();

export default function handler(req: IncomingMessage, res: ServerResponse) {
  const rawUrl = req.url || '/';
  const parsed = new URL(rawUrl, 'http://localhost');

  // If Vercel rewrote /api/(.*) -> /api/index?path=$1, reconstruct /api/<path>
  if (parsed.pathname === '/api/index' || parsed.pathname === '/api') {
    const rewrittenPath = parsed.searchParams.get('path') || '';
    parsed.searchParams.delete('path');
    const cleanSubPath = rewrittenPath.replace(/^\/+/, '');
    const qs = parsed.searchParams.toString();
    req.url = `/api/${cleanSubPath}${qs ? `?${qs}` : ''}`;
  }

  return app(req as Parameters<typeof app>[0], res as Parameters<typeof app>[1]);
}
