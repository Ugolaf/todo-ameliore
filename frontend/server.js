const http = require('http');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 5173;
const publicDir = path.join(__dirname, 'public');

const server = http.createServer((req, res) => {
  const requestPath = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(publicDir, requestPath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    const contentType = getContentType(ext);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

function getContentType(ext) {
  switch (ext) {
    case '.html':
      return 'text/html';
    case '.js':
      return 'application/javascript';
    case '.css':
      return 'text/css';
    case '.json':
      return 'application/json';
    default:
      return 'application/octet-stream';
  }
}

server.listen(PORT, () => {
  console.log(`Frontend server running at http://localhost:${PORT}`);
});
