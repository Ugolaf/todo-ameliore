const API_URL = window.API_URL || 'http://localhost:4000';

async function apiRequest(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'Une erreur est survenue');
    error.status = response.status;
    throw error;
  }
  return data;
}

async function registerUser(payload) {
  return apiRequest('/auth/register', { method: 'POST', body: payload });
}

async function loginUser(payload) {
  return apiRequest('/auth/login', { method: 'POST', body: payload });
}

async function fetchChildren(token) {
  return apiRequest('/children', { method: 'GET', token });
}

async function fetchTasks(token) {
  return apiRequest('/tasks', { method: 'GET', token });
}

async function createTask(token, payload) {
  return apiRequest('/tasks', { method: 'POST', token, body: payload });
}

async function completeTask(token, taskId) {
  return apiRequest(`/tasks/${taskId}`, { method: 'PATCH', token, body: { completed: true } });
}

async function fetchProgress(token) {
  return apiRequest('/progress', { method: 'GET', token });
}

window.apiClient = {
  apiRequest,
  registerUser,
  loginUser,
  fetchChildren,
  fetchTasks,
  createTask,
  completeTask,
  fetchProgress
};
