// backend/scripts/user.js — จัดการบัญชีจากเครื่อง server (ลอกจาก MECHA2_QC_GAUGE_SYSTEM)
//
// ใช้:
//   npm run user:add -- <userid> "<ชื่อ>" [ADMIN|USER] [departmentId] ["ตำแหน่ง"]
//                                              สร้างบัญชี (default role = ADMIN, ถามรหัสผ่าน)
//   npm run user:passwd -- <userid>            ตั้งรหัสผ่านใหม่ + เปิดใช้งานกลับ
//   npm run user:disable -- <userid>           ปิดบัญชี (มีผลทันที ไม่ต้องรอ token หมดอายุ)
//   npm run user:card -- <userid> [รหัสบัตร]    ผูกบัตร (เว้นรหัสบัตร = ถอดบัตร) · เก็บเป็น text 0 นำหน้าไม่หาย
//   npm run user:role -- <userid> <ADMIN|USER> เปลี่ยน role (กู้ ADMIN กรณีไม่มีใครเหลือ)
//   npm run user:list                          ดูรายชื่อ
//
// ⚠️ เป็นทางเดียวที่สร้าง ADMIN คนแรกได้ — หน้า Register สมัครได้แค่ USER
// ⚠️ ไม่รับรหัสผ่านทาง argument โดยตั้งใจ — ค้างอยู่ใน shell history ถามแบบไม่แสดงบนจอแทน
'use strict';

const readline = require('readline');
const mysql = require('mysql2/promise');
const env = require('../config/env');
const { ROLES, MIN_PASSWORD, hashPassword, normalizeRfid } = require('../services/auth');

// readline ที่ไม่ echo ตัวอักษร — แสดงแค่ข้อความคำถาม
const askHidden = (question) => new Promise((resolve) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  let asked = false;
  rl._writeToOutput = (s) => {
    if (!asked) { rl.output.write(s); asked = true; }
  };
  rl.question(question, (answer) => {
    rl.close();
    process.stdout.write('\n');
    resolve(answer);
  });
});

const askNewPassword = async () => {
  const a = await askHidden('รหัสผ่านใหม่: ');
  if (a.length < MIN_PASSWORD) throw new Error(`รหัสผ่านต้องยาวอย่างน้อย ${MIN_PASSWORD} ตัว`);
  const b = await askHidden('พิมพ์ซ้ำอีกครั้ง: ');
  if (a !== b) throw new Error('รหัสผ่านสองครั้งไม่ตรงกัน');
  return hashPassword(a);
};

const USAGE = 'ใช้: node scripts/user.js add <userid> "<ชื่อ>" [role] [departmentId] ["ตำแหน่ง"] | passwd <userid> | disable <userid> | card <userid> [รหัสบัตร] | role <userid> <ADMIN|USER> | list';

const updateOne = async (conn, sql, params, userid) => {
  const [r] = await conn.execute(sql, params);
  if (!r.affectedRows) throw new Error(`ไม่พบ ${userid}`);
};

const main = async () => {
  const [cmd, ...args] = process.argv.slice(2);
  if (!cmd || (cmd !== 'list' && !args[0])) throw new Error(USAGE);

  const conn = await mysql.createConnection({
    host: env.DB_HOST, port: env.DB_PORT, user: env.DB_USER, password: env.DB_PASSWORD, database: env.DB_NAME,
  });
  try {
    const userid = args[0];
    if (cmd === 'add') {
      const [, name, role = 'ADMIN', departmentId = null, position = null] = args;
      if (!name) throw new Error(USAGE);
      if (!ROLES.includes(role)) throw new Error(`role ต้องเป็น ${ROLES.join(' / ')}`);
      const [[exists]] = await conn.query('SELECT userid FROM users WHERE userid = ?', [userid]);
      if (exists) throw new Error(`มี ${userid} อยู่แล้ว — เปลี่ยนรหัสใช้ user:passwd, เปลี่ยนสิทธิ์ใช้ user:role`);
      const hash = await askNewPassword();
      await conn.execute(
        'INSERT INTO users (userid, password, name, role, department_id, position, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, NOW())',
        [userid, hash, name, role, departmentId, position]
      );
      console.log(`สร้างบัญชี ${userid} (${role}) แล้ว`);
    } else if (cmd === 'passwd') {
      const hash = await askNewPassword();
      await updateOne(conn, 'UPDATE users SET password = ?, is_active = 1, updated_at = NOW() WHERE userid = ?', [hash, userid], userid);
      console.log(`ตั้งรหัสผ่านใหม่ให้ ${userid} แล้ว (เปิดใช้งานด้วย)`);
    } else if (cmd === 'disable') {
      await updateOne(conn, 'UPDATE users SET is_active = 0, updated_at = NOW() WHERE userid = ?', [userid], userid);
      console.log(`ปิดบัญชี ${userid} แล้ว — มีผลทันทีกับทุกหน้าที่เปิดค้างอยู่`);
    } else if (cmd === 'card') {
      const rfid = normalizeRfid(args[1]);
      if (rfid) {
        const [[taken]] = await conn.query('SELECT userid FROM users WHERE rfid = ? AND userid <> ?', [rfid, userid]);
        if (taken) throw new Error(`รหัสบัตรนี้ผูกกับ ${taken.userid} อยู่แล้ว`);
      }
      await updateOne(conn, 'UPDATE users SET rfid = ?, updated_at = NOW() WHERE userid = ?', [rfid, userid], userid);
      console.log(rfid ? `ผูกบัตรให้ ${userid} แล้ว` : `ถอดบัตรของ ${userid} แล้ว`);
    } else if (cmd === 'role') {
      const role = args[1];
      if (!ROLES.includes(role)) throw new Error(`role ต้องเป็น ${ROLES.join(' / ')}`);
      await updateOne(conn, 'UPDATE users SET role = ?, updated_at = NOW() WHERE userid = ?', [role, userid], userid);
      console.log(`เปลี่ยน ${userid} เป็น ${role} แล้ว`);
    } else if (cmd === 'list') {
      const [rows] = await conn.query('SELECT userid, name, role, department_id, is_active, rfid FROM users ORDER BY role, userid');
      if (!rows.length) console.log('ยังไม่มีบัญชี — สร้าง ADMIN คนแรกด้วย npm run user:add -- <userid> "<ชื่อ>"');
      for (const u of rows) {
        console.log(`${u.is_active ? '✓' : '✗'} ${u.role.padEnd(5)} ${u.userid.padEnd(12)} ${u.rfid ? '[บัตร]' : '[----]'} ${u.name}${u.department_id ? ` · ${u.department_id}` : ''}`);
      }
    } else {
      throw new Error(USAGE);
    }
  } finally {
    await conn.end();
  }
};

main().catch((err) => {
  console.error(err.code === 'ER_NO_SUCH_TABLE' ? 'ยังไม่มีตาราง users — รัน npm run db:apply ก่อน' : err.message);
  process.exit(1);
});
