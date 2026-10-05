const http = require('http');

function request(url, options = {}, data = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const headers = Object.assign({}, options.headers || {});
    if (data) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(data);
    }
    const opts = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + (u.search || ''),
      method: options.method || 'GET',
      headers: headers
    };
    const req = http.request(opts, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch(e) { resolve({ status: res.statusCode, raw }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function login(userId = 'AO001', password = 'admin123') {
  const data = JSON.stringify({ userId, password });
  const res = await request('http://localhost:8080/api/auth/login', { method: 'POST' }, data);
  if (res.body && res.body.data && res.body.data.token) {
    return { token: res.body.data.token, user: res.body.data };
  }
  throw new Error(`Login failed for ${userId}: status=${res.status} body=${JSON.stringify(res.body)}`);
}

module.exports = { request, login };
