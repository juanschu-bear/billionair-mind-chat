/**
 * Standalone server for Docker / local deployment (without Vercel CLI).
 * Serves static files from public/ and routes /api/* to serverless functions.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// Load API handlers
const apiHandlers = {};
const apiDir = path.join(__dirname, 'api');
if (fs.existsSync(apiDir)) {
  fs.readdirSync(apiDir).forEach(file => {
    if (file.endsWith('.js')) {
      const name = file.replace('.js', '');
      apiHandlers[name] = require(path.join(apiDir, file));
    }
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // API routes
  if (url.pathname.startsWith('/api/')) {
    const handlerName = url.pathname.replace('/api/', '').replace(/\/$/, '');
    const handler = apiHandlers[handlerName];

    if (!handler) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Not found' }));
    }

    // Parse body for POST/PUT/DELETE
    let body = '';
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
      await new Promise(resolve => {
        req.on('data', chunk => { body += chunk; });
        req.on('end', resolve);
      });
    }

    // Build Express-like req/res
    const apiReq = {
      method: req.method,
      url: req.url,
      query: Object.fromEntries(url.searchParams),
      body: body ? JSON.parse(body) : {},
      headers: req.headers,
    };

    const apiRes = {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      status(code) { this.statusCode = code; return this; },
      json(data) {
        res.writeHead(this.statusCode, this.headers);
        res.end(JSON.stringify(data));
      },
    };

    try {
      await handler(apiReq, apiRes);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Static files from public/
  let filePath = path.join(__dirname, 'public', url.pathname === '/' ? 'index.html' : url.pathname);

  if (!fs.existsSync(filePath)) {
    // Fallback to root directory
    filePath = path.join(__dirname, url.pathname === '/' ? 'index.html' : url.pathname);
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`Billionair Mind Chat running at http://localhost:${PORT}`);
});
