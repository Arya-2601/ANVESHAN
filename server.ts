import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { handleApiRequest } from './src/server/api.ts';
import { initDatabase } from './src/server/db.ts';
import { ensureDirectoryExists } from './src/server/generateSampleDocs.ts';

const PORT = Number(process.env.PORT) || 3000;
const DIST_DIR = path.resolve(process.cwd(), 'dist');
const PUBLIC_DIR = path.resolve(process.cwd(), 'public');
const DATA_DIR = path.resolve(process.cwd(), 'data');
const UPLOADS_DIR = path.resolve(DATA_DIR, 'uploads');
const PUBLIC_DOCS_DIR = path.resolve(PUBLIC_DIR, 'sample-docs');

// Ensure necessary persistent data directories exist on startup
ensureDirectoryExists(DATA_DIR);
ensureDirectoryExists(UPLOADS_DIR);
ensureDirectoryExists(PUBLIC_DOCS_DIR);

// Initialize database schema and generate initial seed data & sample documents if fresh
initDatabase();

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
};

function serveFile(res: http.ServerResponse, filePath: string, isImmutable = false) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const stat = fs.statSync(filePath);

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Cache-Control': isImmutable 
        ? 'public, max-age=31536000, immutable' 
        : ext === '.html' 
          ? 'no-cache, no-store, must-revalidate' 
          : 'public, max-age=3600',
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err: any) {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error: ' + err.message);
    }
  }
}

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;

  // 1. API routes
  if (pathname.startsWith('/api')) {
    try {
      await handleApiRequest(req, res);
    } catch (err: any) {
      console.error('API Unhandled Error:', err);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err?.message || 'Internal server error' }));
      }
    }
    return;
  }

  // 2. Static file resolution
  const decodedPath = decodeURIComponent(pathname);
  const cleanPath = decodedPath.replace(/\0/g, '');

  // Check in dist/
  const resolvedDistPath = path.resolve(DIST_DIR, cleanPath.replace(/^\/+/, ''));
  if (resolvedDistPath.startsWith(DIST_DIR) && fs.existsSync(resolvedDistPath)) {
    const stat = fs.statSync(resolvedDistPath);
    if (stat.isFile()) {
      const isImmutable = cleanPath.startsWith('/assets/');
      return serveFile(res, resolvedDistPath, isImmutable);
    }
  }

  // Check in public/ (e.g. /sample-docs/...)
  const resolvedPublicPath = path.resolve(PUBLIC_DIR, cleanPath.replace(/^\/+/, ''));
  if (resolvedPublicPath.startsWith(PUBLIC_DIR) && fs.existsSync(resolvedPublicPath)) {
    const stat = fs.statSync(resolvedPublicPath);
    if (stat.isFile()) {
      return serveFile(res, resolvedPublicPath, false);
    }
  }

  // 3. Fallback to index.html for client-side routing (React Router)
  const indexPath = path.resolve(DIST_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    return serveFile(res, indexPath, false);
  }

  // If dist/index.html is not found, user hasn't built frontend
  res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Application build not found. Please run "npm run build" before starting the server.');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[ANVESHAN] Production server listening on http://0.0.0.0:${PORT}`);
});
