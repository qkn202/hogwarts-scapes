/**
 * Vercel Serverless API Entry Point (`/api/*`)
 * Bridges Vercel's Node 24 serverless runtime to `handleHogwartsRequest` (`node:sqlite` in `/tmp`).
 */

import { handleHogwartsRequest } from '../server/hogwartsServer.mjs';

export default async function handler(req, res) {
  const rawUrl = req.url || '/api/health';
  if (rawUrl.startsWith('/api/index')) {
    const parsed = new URL(rawUrl, `http://${req.headers.host || 'localhost'}`);
    const subRoute = parsed.searchParams.get('__route') || '';
    parsed.searchParams.delete('__route');
    const qs = parsed.searchParams.toString();
    req.url = `/api/${subRoute.replace(/^\/+/, '')}${qs ? `?${qs}` : ''}`;
  }
  return handleHogwartsRequest(req, res);
}
