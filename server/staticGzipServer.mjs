/**
 * Static Precompressed Asset & Gzip JSON Response Helper for Hogwarts Online Server
 * Serves pre-packed `.br` / `.gz` bundles from `dist/`, negotiates `Accept-Encoding`,
 * validates `ETag` (`304 Not Modified`), and sets bfcache-friendly `Cache-Control` headers.
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { constants as zlibConstants, gzipSync } from 'node:zlib';

const MIME_MAP = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const COMPRESSIBLE_EXTS = new Set(['.html', '.js', '.css', '.json', '.webmanifest', '.svg']);
const HASHED_ASSET_RE = /^\/assets\/.+-[a-zA-Z0-9_-]{7,}\.(js|css)$/;
const MIN_GZIP_BYTES = 512;

function pickAcceptedEncoding(acceptHeader = '') {
  const h = String(acceptHeader).toLowerCase();
  if (/\bbr\b/.test(h)) return 'br';
  if (/\bgzip\b/.test(h)) return 'gzip';
  return '';
}

function computeCacheControl(relPath, ext) {
  if (HASHED_ASSET_RE.test(relPath)) {
    return 'public, max-age=31536000, immutable';
  }
  if (ext === '.webp' || ext === '.png' || ext === '.svg') {
    return 'public, max-age=604800, stale-while-revalidate=86400';
  }
  // Use `no-cache` instead of `no-store` so HTML documents stay eligible for Back-Forward Cache (bfcache)
  return 'no-cache';
}

export function sendCompressedJson(res, status, data) {
  if (res.headersSent) return true;
  const raw = Buffer.from(JSON.stringify(data), 'utf8');
  const accept = res.req?.headers?.['accept-encoding'] || '';
  const canGzip = raw.byteLength >= MIN_GZIP_BYTES && /\bgzip\b/i.test(accept);
  const payload = canGzip ? gzipSync(raw, { level: zlibConstants.Z_DEFAULT_COMPRESSION }) : raw;

  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Vary': 'Accept-Encoding',
    'Content-Length': payload.byteLength,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (canGzip) headers['Content-Encoding'] = 'gzip';

  res.writeHead(status, headers);
  res.end(payload);
  return true;
}

export function serveCompressedStatic(req, res, distDir, pathname) {
  if ((req.method !== 'GET' && req.method !== 'HEAD') || !existsSync(distDir)) return false;

  const rel = pathname === '/' ? '/index.html' : pathname;
  if (rel.endsWith('.gz') || rel.endsWith('.br')) return false;

  const safePath = resolve(distDir, `.${rel}`);
  if (!safePath.startsWith(distDir + sep)) {
    sendCompressedJson(res, 403, { ok: false, error: 'Forbidden' });
    return true;
  }
  if (!existsSync(safePath)) return false;

  const st = statSync(safePath);
  if (!st.isFile()) return false;

  const ext = extname(safePath).toLowerCase();
  const compressible = COMPRESSIBLE_EXTS.has(ext);
  const prefEnc = compressible ? pickAcceptedEncoding(req.headers['accept-encoding']) : '';

  let chosenEncoding = '';
  let servePath = safePath;
  if (prefEnc === 'br' && existsSync(`${safePath}.br`)) {
    chosenEncoding = 'br';
    servePath = `${safePath}.br`;
  } else if ((prefEnc === 'br' || prefEnc === 'gzip') && existsSync(`${safePath}.gz`)) {
    chosenEncoding = 'gzip';
    servePath = `${safePath}.gz`;
  }

  const etag = `W/"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}${chosenEncoding ? `-${chosenEncoding}` : ''}"`;
  const headers = {
    'Content-Type': MIME_MAP[ext] || 'application/octet-stream',
    'Cache-Control': computeCacheControl(rel, ext),
    'ETag': etag,
  };
  if (compressible) headers['Vary'] = 'Accept-Encoding';

  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, headers);
    res.end();
    return true;
  }

  let body = readFileSync(servePath);
  if (!chosenEncoding && compressible && body.byteLength >= MIN_GZIP_BYTES && /\bgzip\b/i.test(req.headers['accept-encoding'] || '')) {
    body = gzipSync(body, { level: zlibConstants.Z_DEFAULT_COMPRESSION });
    chosenEncoding = 'gzip';
  }

  if (chosenEncoding) headers['Content-Encoding'] = chosenEncoding;
  headers['Content-Length'] = body.byteLength;

  res.writeHead(200, headers);
  res.end(req.method === 'HEAD' ? undefined : body);
  return true;
}
