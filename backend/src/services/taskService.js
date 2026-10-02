const { AppError } = require('../utils/errors');
const { runInTransaction } = require('../db/database');

function createTaskService({ db }) {
  function list(search = '') {
    if (!search) {
      return db.prepare('SELECT id, name, category, description FROM tasks ORDER BY category, name').all();
    }
    const like = `%${search}%`;
    return db
      .prepare(
        `SELECT id, name, category, description FROM tasks
         WHERE name LIKE ? OR category LIKE ? OR description LIKE ?
         ORDER BY category, name`,
      )
      .all(like, like, like);
  }

  function getSelected(userId) {
    return db
      .prepare(
        `SELECT t.id, t.name, t.category, t.description
         FROM user_tasks ut JOIN tasks t ON t.id = ut.task_id
         WHERE ut.user_id = ?
         ORDER BY t.category, t.name`,
      )
      .all(userId);
  }

  // Replaces the user's selection with the given ids (so it also works for editing later).
  function select(userId, taskIds) {
    const ids = [...new Set(taskIds)];
    const found = db
      .prepare(`SELECT id FROM tasks WHERE id IN (${ids.map(() => '?').join(',')})`)
      .all(...ids)
      .map((row) => row.id);
    const invalidIds = ids.filter((id) => !found.includes(id));
    if (invalidIds.length) {
      throw new AppError(400, 'INVALID_TASK_IDS', 'Some selected tasks do not exist.', { invalidIds });
    }

    runInTransaction(db, () => {
      db.prepare('DELETE FROM user_tasks WHERE user_id = ?').run(userId);
      const insert = db.prepare('INSERT INTO user_tasks (user_id, task_id) VALUES (?, ?)');
      for (const id of ids) insert.run(userId, id);
    });
    return getSelected(userId);
  }

  return { list, getSelected, select };
}

module.exports = { createTaskService };
