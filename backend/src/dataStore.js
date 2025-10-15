const crypto = require('crypto');

function createId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

class DataStore {
  constructor() {
    this.users = [];
    this.tokens = new Map(); // token -> userId
    this.tasks = [];
    this.status = new Map(); // key: `${date}:${childId}:${taskId}` -> {completed, completedAt}
  }

  createUser({ role, name, email, passwordHash, parentId = null }) {
    const id = createId(role === 'parent' ? 'par' : 'child');
    const newUser = {
      id,
      role,
      name,
      email,
      passwordHash,
      parentId,
      childrenIds: [],
      createdAt: new Date().toISOString()
    };
    this.users.push(newUser);

    if (role === 'child' && parentId) {
      const parent = this.users.find((u) => u.id === parentId && u.role === 'parent');
      if (parent && !parent.childrenIds.includes(id)) {
        parent.childrenIds.push(id);
      }
    }

    return newUser;
  }

  findUserByEmail(email) {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  findUserById(id) {
    return this.users.find((u) => u.id === id);
  }

  createToken(userId) {
    const token = crypto.randomBytes(24).toString('hex');
    this.tokens.set(token, { userId, createdAt: Date.now() });
    return token;
  }

  getUserByToken(token) {
    const entry = this.tokens.get(token);
    if (!entry) return null;
    return this.findUserById(entry.userId);
  }

  revokeToken(token) {
    this.tokens.delete(token);
  }

  createTask({ title, description, childId, createdBy }) {
    const id = createId('task');
    const task = {
      id,
      title,
      description,
      childId,
      createdBy,
      createdAt: new Date().toISOString()
    };
    this.tasks.push(task);
    return task;
  }

  getTasksForChild(childId) {
    return this.tasks.filter((task) => task.childId === childId);
  }

  getTasksForParent(parentId) {
    const parent = this.findUserById(parentId);
    if (!parent) return [];
    return this.tasks.filter((task) => parent.childrenIds.includes(task.childId));
  }

  markTaskComplete({ taskId, childId }) {
    const date = todayKey();
    const key = `${date}:${childId}:${taskId}`;
    const record = {
      completed: true,
      completedAt: new Date().toISOString()
    };
    this.status.set(key, record);
    return record;
  }

  getTaskStatus({ taskId, childId, date = todayKey() }) {
    const key = `${date}:${childId}:${taskId}`;
    return this.status.get(key) || { completed: false, completedAt: null };
  }

  getDailySummaryForChild(childId) {
    const tasks = this.getTasksForChild(childId);
    const date = todayKey();
    return tasks.map((task) => ({
      task,
      status: this.getTaskStatus({ taskId: task.id, childId, date })
    }));
  }

  hasChildCompletedAllTasks(childId) {
    const summary = this.getDailySummaryForChild(childId);
    if (summary.length === 0) return false;
    return summary.every((item) => item.status.completed);
  }
}

module.exports = {
  DataStore,
  todayKey
};
