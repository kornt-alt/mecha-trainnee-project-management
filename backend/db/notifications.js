// backend/db/notifications.js — SQL ของแจ้งเตือนรายคน (ของ user ที่ login เท่านั้น)
'use strict';

const { query } = require('./pool');

const listForUser = async (userid) => {
  const [rows] = await query(
    `SELECT id, userid, title, message, project_id, task_id, is_read, created_at
     FROM notifications WHERE userid = ? ORDER BY created_at DESC, id DESC`,
    [String(userid)]
  );
  return rows;
};

module.exports = { listForUser };
