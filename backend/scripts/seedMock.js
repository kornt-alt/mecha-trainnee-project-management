// backend/scripts/seedMock.js — ล้างข้อมูลแล้วใส่ข้อมูลตัวอย่างจาก frontend/src/data/mockData.js (เครื่อง dev เท่านั้น)
//
// ใช้:  npm run db:seed                       ถามยืนยัน + ถามรหัสผ่านที่จะตั้งให้พนักงานตัวอย่างทุกคน
//       npm run db:seed -- --yes --admin emp-009
//         --yes          ไม่ถามยืนยันการล้างข้อมูล
//         --admin <id>   พนักงานที่ได้ role ADMIN (default emp-009) — ที่เหลือเป็น USER
//       ตั้ง SEED_PASSWORD ใน environment เพื่อไม่ต้องพิมพ์รหัสผ่าน (ใช้กับสคริปต์ทดสอบ)
//
// ทำไมอ่านจากไฟล์ mock ของ frontend: ให้ข้อมูลใน DB ตรงกับที่น้องเห็นในหน้าเว็บ mock เป๊ะ (id เดียวกัน)
// ไฟล์นั้นเป็น ESM (export const) — แปลงเป็นสคริปต์แล้วรันใน vm แทนการ require (backend เป็น CommonJS)
//
// ⚠️ ล้างทุกตาราง (รวม users / logs) ก่อนใส่ — ห้ามรันบน server จริง (NODE_ENV=production จะไม่ยอมรัน)
// ⚠️ project 1 ตั้งเป็น public, ที่เหลือ private — ไว้ทดสอบ guest ทั้งสองแบบ
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const readline = require('readline');
const mysql = require('mysql2/promise');
const env = require('../config/env');
const { MIN_PASSWORD, hashPassword } = require('../services/auth');
const { toJson } = require('../utils/json');

const MOCK_FILE = path.join(__dirname, '..', '..', 'frontend', 'src', 'data', 'mockData.js');
const EXPORTS = ['MOCK_DEPARTMENTS', 'MOCK_TEAMS', 'MOCK_EMPLOYEES', 'MOCK_PROJECTS', 'MOCK_TASKS', 'MOCK_DELIVERABLES', 'MOCK_ACTIVITIES'];
// ลำดับลบ: ลูกก่อนแม่ (ปิด FK check ระหว่าง TRUNCATE อยู่แล้ว แต่เรียงไว้ให้อ่านง่าย)
const TABLES = ['notifications', 'activities', 'deliverables', 'task_labels', 'labels', 'task_checklist_items',
  'task_collaborators', 'tasks', 'project_members', 'projects', 'team_members', 'teams', 'logs', 'users', 'departments'];
const AUTO_INCREMENT_TABLES = ['notifications', 'activities', 'deliverables', 'labels', 'task_checklist_items', 'tasks', 'projects', 'logs'];

const loadMock = () => {
  const source = fs.readFileSync(MOCK_FILE, 'utf8')
    .replace(/^export\s+(const|function)\s/gm, '$1 ');
  return vm.runInNewContext(`${source}\n;({ ${EXPORTS.join(', ')} })`, {}, { filename: MOCK_FILE });
};

const ask = (question, hidden = false) => new Promise((resolve) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  let asked = false;
  if (hidden) rl._writeToOutput = (s) => { if (!asked) { rl.output.write(s); asked = true; } };
  rl.question(question, (answer) => {
    rl.close();
    if (hidden) process.stdout.write('\n');
    resolve(answer);
  });
});

const argValue = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
};

const toDate = (v) => (v ? new Date(v) : null);

const main = async () => {
  if (process.env.NODE_ENV === 'production') throw new Error('ไม่รัน seed บน production (NODE_ENV=production)');
  const mock = loadMock();
  const adminId = argValue('--admin') || 'emp-009';
  if (!mock.MOCK_EMPLOYEES.some((e) => e.id === adminId)) throw new Error(`ไม่พบพนักงาน ${adminId} ใน mock data`);

  if (!process.argv.includes('--yes')) {
    const answer = await ask(`จะล้างข้อมูลทุกตารางใน ${env.DB_NAME}@${env.DB_HOST} แล้วใส่ข้อมูลตัวอย่าง — พิมพ์ yes เพื่อยืนยัน: `);
    if (answer.trim().toLowerCase() !== 'yes') { console.log('ยกเลิก'); return; }
  }
  let password = process.env.SEED_PASSWORD || '';
  if (!password) password = await ask(`รหัสผ่านสำหรับพนักงานตัวอย่างทุกคน (อย่างน้อย ${MIN_PASSWORD} ตัว): `, true);
  if (password.length < MIN_PASSWORD) throw new Error(`รหัสผ่านต้องยาวอย่างน้อย ${MIN_PASSWORD} ตัว`);
  const passwordHash = await hashPassword(password);

  const conn = await mysql.createConnection({
    host: env.DB_HOST, port: env.DB_PORT, user: env.DB_USER, password: env.DB_PASSWORD, database: env.DB_NAME,
    charset: 'utf8mb4_unicode_ci',
  });
  try {
    // ⚠️ ใช้ DELETE ไม่ใช่ TRUNCATE — TRUNCATE ต้องใช้สิทธิ์ DROP ซึ่ง DB user ของระบบไม่มี
    //    reset AUTO_INCREMENT ด้วย ALTER แทน (ใช้สิทธิ์ ALTER) ให้ id ใหม่เริ่มต่อจาก seed เหมือน DB ใหม่
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of TABLES) await conn.query(`DELETE FROM ${table}`);
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    for (const table of AUTO_INCREMENT_TABLES) await conn.query(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
    await conn.beginTransaction();

    for (const d of mock.MOCK_DEPARTMENTS) {
      await conn.execute('INSERT INTO departments (id, name, code) VALUES (?, ?, ?)', [d.id, d.name, d.code ?? null]);
    }
    for (const e of mock.MOCK_EMPLOYEES) {
      await conn.execute(
        `INSERT INTO users (userid, password, name, position, department_id, email, role, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
        [e.id, passwordHash, e.name, e.position ?? null, e.departmentId ?? null, e.email ?? null, e.id === adminId ? 'ADMIN' : 'USER']
      );
    }
    for (const t of mock.MOCK_TEAMS) {
      await conn.execute('INSERT INTO teams (id, name) VALUES (?, ?)', [t.id, t.name]);
      for (const [i, userid] of (t.memberEmployeeIds || []).entries()) {
        await conn.execute('INSERT INTO team_members (team_id, userid, sort) VALUES (?, ?, ?)', [t.id, userid, i]);
      }
    }
    for (const p of mock.MOCK_PROJECTS) {
      await conn.execute(
        `INSERT INTO projects (id, name, description, category, status, priority, visibility, department_id, manager_id,
           team_lead_id, start_date, due_date, planned_budget, requires_deliverables, deliverable_description, closure,
           created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [p.id, p.name, p.description ?? null, p.category ?? null, p.status, p.priority ?? null, p.id === 1 ? 'public' : 'private',
          p.departmentId ?? null, p.managerId ?? null, p.teamLeadId ?? null, p.startDate ?? null, p.dueDate ?? null,
          p.plannedBudget ?? null, p.requiresDeliverables ? 1 : 0, p.deliverableDescription ?? null, toJson(p.closure),
          p.managerId ?? null]
      );
      // teamMemberIds ใน mock อาจมี manager / lead ปนอยู่ — เก็บตามที่ให้มา (frontend ใช้ทั้ง 3 ช่องรวมกันอยู่แล้ว)
      for (const [i, userid] of (p.teamMemberIds || []).entries()) {
        await conn.execute('INSERT INTO project_members (project_id, userid, sort) VALUES (?, ?, ?)', [p.id, userid, i]);
      }
    }
    for (const t of mock.MOCK_TASKS) {
      await conn.execute(
        `INSERT INTO tasks (id, project_id, title, description, category, status, priority, assignee_id, reviewer_id,
           start_date, due_date, progress, estimated_hours, planned_allocations, assignment_history, review_history,
           attachments, review_submitted_by, review_submitted_at, review_last_reason, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [t.id, t.projectId, t.title, t.description ?? null, t.category ?? null, t.status, t.priority ?? null,
          t.assigneeId ?? null, t.reviewerId ?? null, t.startDate ?? null, t.dueDate ?? null, Number(t.progress) || 0,
          Number(t.estimatedHours) || 0, toJson(t.plannedAllocations || []), toJson(t.assignmentHistory || []),
          toJson(t.reviewHistory || []), toJson(t.attachments || []), t.reviewSubmittedBy ?? null,
          toDate(t.reviewSubmittedAt), t.reviewLastReason ?? null, t.createdBy ?? null]
      );
      for (const [i, userid] of (t.collaborators || []).entries()) {
        await conn.execute('INSERT INTO task_collaborators (task_id, userid, sort) VALUES (?, ?, ?)', [t.id, userid, i]);
      }
      for (const [i, c] of (t.checklist || []).entries()) {
        await conn.execute(
          'INSERT INTO task_checklist_items (task_id, title, completed, created_by, owner_id, sort) VALUES (?, ?, ?, ?, ?, ?)',
          [t.id, c.title, c.completed ? 1 : 0, c.createdBy ?? null, c.ownerId ?? c.createdBy ?? null, i]
        );
      }
    }
    for (const d of mock.MOCK_DELIVERABLES) {
      await conn.execute(
        `INSERT INTO deliverables (project_id, title, description, related_task_id, responsible_id, due_date, status, attachments)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [d.projectId, d.title, d.description ?? null, d.relatedTaskId ?? null, d.responsibleId ?? null, d.dueDate ?? null,
          d.status || 'pending', toJson(d.attachments || [])]
      );
    }
    for (const a of mock.MOCK_ACTIVITIES) {
      const { id, projectId, taskId, deliverableId, actorId, type, description, timestamp, projectName, ...meta } = a;
      await conn.execute(
        `INSERT INTO activities (project_id, task_id, actor_id, type, description, meta, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [projectId, taskId ?? null, actorId ?? null, type, description ?? null, Object.keys(meta).length ? toJson(meta) : null,
          toDate(timestamp) || new Date()]
      );
    }

    await conn.commit();
    const counts = {};
    for (const table of ['departments', 'users', 'teams', 'projects', 'project_members', 'tasks', 'task_checklist_items', 'deliverables', 'activities']) {
      const [[row]] = await conn.query(`SELECT COUNT(*) AS n FROM ${table}`);
      counts[table] = row.n;
    }
    console.log('[seed] สำเร็จ', counts);
    console.log(`[seed] ADMIN = ${adminId} · พนักงานคนอื่นเป็น USER · รหัสผ่านทุกคนตามที่ตั้ง · project 1 = public ที่เหลือ private`);
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    await conn.end();
  }
};

main().catch((err) => {
  console.error(`[seed] ล้มเหลว: ${err.code === 'ER_NO_SUCH_TABLE' ? 'ยังไม่มีตาราง — รัน npm run db:apply ก่อน' : err.message}`);
  process.exit(1);
});
