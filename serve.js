// Local helper for editing. Run it on your computer:   node serve.js
// Then open  http://localhost:8000/?edit
// It serves this folder like any web server, and in ?edit mode it lets the page write your
// favorites / ratios / order straight into config/images.json (a web page cannot do that on its
// own). It only listens on this computer. It is NOT part of the published site: GitHub Pages
// ignores this file, and the site works without it (the Copy / Download buttons are the fallback).
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8000;
const CONFIG = path.join(ROOT, 'config', 'images.json');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};

function valid(list) {
  return Array.isArray(list) && list.length > 0 && list.every(function (e) {
    return e && typeof e === 'object' && Number.isFinite(e.id) && typeof e.image === 'string' &&
      Number.isFinite(e.order) && typeof e.ratio === 'string' && Number.isFinite(e.width) &&
      Number.isFinite(e.height) && typeof e.favorite === 'boolean';
  });
}

function saveConfig(req, res) {
  let body = '';
  req.on('data', function (chunk) {
    body += chunk;
    if (body.length > 1e6) req.destroy();
  });
  req.on('end', function () {
    let list;
    try { list = JSON.parse(body); } catch (e) { list = null; }
    if (!valid(list)) { res.writeHead(400); res.end('not a valid photo list'); return; }
    const tmp = CONFIG + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(list, null, 4) + '\n');
    fs.renameSync(tmp, CONFIG); // all-or-nothing write
    const favorites = list.filter(function (e) { return e.favorite; }).length;
    console.log(new Date().toLocaleTimeString() + '  saved config/images.json  (' + list.length + ' photos, ' + favorites + ' favorites)');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ saved: list.length }));
  });
}

http.createServer(function (req, res) {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (req.method === 'POST' && url === '/__save-config') { saveConfig(req, res); return; }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }

  const file = path.normalize(path.join(ROOT, url === '/' ? 'index.html' : url));
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, function (err, data) {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : data);
  });
}).listen(PORT, '127.0.0.1', function () {
  console.log('Pavithra memories  ->  http://localhost:' + PORT + '/');
  console.log('Edit mode          ->  http://localhost:' + PORT + '/?edit   (changes save into config/images.json)');
});
