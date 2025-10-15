const http = require('http');
const url = require('url');
const { DataStore, todayKey } = require('./dataStore');
const crypto = require('crypto');

const store = new DataStore();
const PORT = process.env.PORT || 4000;
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*').split(',');

function sendJSON(res, statusCode, data, headers = {}) {
  const payload = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowedOrigins.includes('*') ? '*' : allowedOrigins[0],
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
    ...headers
  });
  res.end(payload);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.connection.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        const parsed = JSON.parse(body);
        resolve(parsed);
      } catch (err) {
        reject(new Error('Invalid JSON payload'));
      }
    });
  });
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, originalHash] = storedHash.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}

async function handleRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const { pathname } = parsedUrl;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': allowedOrigins.includes('*') ? '*' : allowedOrigins[0],
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS'
    });
    res.end();
    return;
  }

  try {
    if (pathname === '/auth/register' && req.method === 'POST') {
      const body = await parseBody(req);
      const { role, name, email, password, parentId } = body;
      if (!role || !['parent', 'child'].includes(role)) {
        return sendJSON(res, 400, { error: 'Role must be parent or child' });
      }
      if (!name || !email || !password) {
        return sendJSON(res, 400, { error: 'Name, email and password are required' });
      }
      if (store.findUserByEmail(email)) {
        return sendJSON(res, 409, { error: 'Email already registered' });
      }
      if (role === 'child') {
        if (!parentId) {
          return sendJSON(res, 400, { error: 'Child registration requires parentId' });
        }
        const parent = store.findUserById(parentId);
        if (!parent || parent.role !== 'parent') {
          return sendJSON(res, 404, { error: 'Parent not found' });
        }
      }
      const passwordHash = hashPassword(password);
      const user = store.createUser({ role, name, email, passwordHash, parentId: role === 'child' ? parentId : null });
      const token = store.createToken(user.id);
      return sendJSON(res, 201, { user: sanitizeUser(user), token });
    }

    if (pathname === '/auth/login' && req.method === 'POST') {
      const body = await parseBody(req);
      const { email, password } = body;
      if (!email || !password) {
        return sendJSON(res, 400, { error: 'Email and password are required' });
      }
      const user = store.findUserByEmail(email);
      if (!user || !verifyPassword(password, user.passwordHash)) {
        return sendJSON(res, 401, { error: 'Invalid credentials' });
      }
      const token = store.createToken(user.id);
      return sendJSON(res, 200, { user: sanitizeUser(user), token });
    }

    if (pathname === '/auth/me' && req.method === 'GET') {
      const user = authenticate(req, res);
      if (!user) return;
      return sendJSON(res, 200, { user: sanitizeUser(user) });
    }

    if (pathname === '/mock-parents' && req.method === 'GET') {
      const parents = store.users.filter((u) => u.role === 'parent').map((parent) => sanitizeUser(parent));
      return sendJSON(res, 200, { parents });
    }

    if (pathname === '/children' && req.method === 'GET') {
      const user = authenticate(req, res);
      if (!user) return;
      if (user.role !== 'parent') {
        return sendJSON(res, 403, { error: 'Only parents can access their children list' });
      }
      const children = user.childrenIds
        .map((id) => store.findUserById(id))
        .filter(Boolean)
        .map((child) => sanitizeUser(child));
      return sendJSON(res, 200, { children });
    }

    if (pathname === '/tasks' && req.method === 'GET') {
      const user = authenticate(req, res);
      if (!user) return;
      let tasks;
      if (user.role === 'parent') {
        tasks = store.getTasksForParent(user.id);
      } else {
        tasks = store.getTasksForChild(user.id);
      }
      const enriched = tasks.map((task) => ({
        ...task,
        status: store.getTaskStatus({ taskId: task.id, childId: task.childId })
      }));
      return sendJSON(res, 200, { tasks: enriched, date: todayKey() });
    }

    if (pathname === '/tasks' && req.method === 'POST') {
      const user = authenticate(req, res);
      if (!user) return;
      if (user.role !== 'parent') {
        return sendJSON(res, 403, { error: 'Only parents can create tasks' });
      }
      const body = await parseBody(req);
      const { title, description = '', childId } = body;
      if (!title || !childId) {
        return sendJSON(res, 400, { error: 'Title and childId are required' });
      }
      if (!user.childrenIds.includes(childId)) {
        return sendJSON(res, 403, { error: 'You can only assign tasks to your children' });
      }
      const task = store.createTask({ title, description, childId, createdBy: user.id });
      return sendJSON(res, 201, { task: { ...task, status: store.getTaskStatus({ taskId: task.id, childId }) } });
    }

    if (pathname.startsWith('/tasks/') && req.method === 'PATCH') {
      const user = authenticate(req, res);
      if (!user) return;
      const segments = pathname.split('/');
      const taskId = segments[2];
      const body = await parseBody(req);
      if (!taskId) {
        return sendJSON(res, 400, { error: 'Task id is required' });
      }
      const task = store.tasks.find((t) => t.id === taskId);
      if (!task) {
        return sendJSON(res, 404, { error: 'Task not found' });
      }
      if (user.role !== 'child' || user.id !== task.childId) {
        return sendJSON(res, 403, { error: 'Only the assigned child can complete this task' });
      }
      if (body.completed !== true) {
        return sendJSON(res, 400, { error: 'Only completion updates are supported' });
      }
      const status = store.markTaskComplete({ taskId, childId: user.id });
      const completedAll = store.hasChildCompletedAllTasks(user.id);
      if (completedAll) {
        const parent = store.findUserById(user.parentId);
        console.log(`[Notification] ${parent ? parent.email : 'Parent'}: ${user.name} a terminé toutes ses tâches pour la date ${todayKey()}`);
      }
      return sendJSON(res, 200, { task: { ...task, status }, completedAll });
    }

    if (pathname === '/progress' && req.method === 'GET') {
      const user = authenticate(req, res);
      if (!user) return;
      if (user.role === 'child') {
        const summary = store.getDailySummaryForChild(user.id).map((entry) => ({
          taskId: entry.task.id,
          title: entry.task.title,
          description: entry.task.description,
          status: entry.status
        }));
        return sendJSON(res, 200, { date: todayKey(), child: sanitizeUser(user), summary });
      }
      const childrenSummaries = user.childrenIds.map((childId) => {
        const child = store.findUserById(childId);
        if (!child) return null;
        const summary = store.getDailySummaryForChild(childId).map((entry) => ({
          taskId: entry.task.id,
          title: entry.task.title,
          description: entry.task.description,
          status: entry.status
        }));
        return {
          child: sanitizeUser(child),
          summary,
          completedAll: store.hasChildCompletedAllTasks(childId)
        };
      }).filter(Boolean);
      return sendJSON(res, 200, { date: todayKey(), summaries: childrenSummaries });
    }

    return sendJSON(res, 404, { error: 'Not found' });
  } catch (error) {
    console.error(error);
    return sendJSON(res, 500, { error: 'Internal server error' });
  }
}

function authenticate(req, res) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendJSON(res, 401, { error: 'Missing authorization token' });
    return null;
  }
  const token = authHeader.slice('Bearer '.length);
  const user = store.getUserByToken(token);
  if (!user) {
    sendJSON(res, 401, { error: 'Invalid or expired token' });
    return null;
  }
  return user;
}

function sanitizeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

const server = http.createServer((req, res) => {
  handleRequest(req, res);
});

server.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
