import { createApiApp } from './_lib/apiApp.mjs';

const app = createApiApp();

/**
 * Vercel Serverless Function entrypoint for all /api/* routes.
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 */
export default function handler(req, res) {
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

  return app(req, res);
}
