// backend/services/visibility.js — ใครเห็นโปรเจกต์ไหน (ที่เดียวในระบบ)
//
//   guest (ไม่ login)  → เฉพาะ visibility = 'public'
//   USER              → public + private ที่ตัวเองเป็น Project Owner (manager_id) / Team Lead / สมาชิก
//   ADMIN             → ทั้งหมด
//
// ⚠️ ทุก query ที่อ่านข้อมูลผูกกับโปรเจกต์ (tasks, deliverables, activities …) ต้องผ่านเงื่อนไขนี้
//    — routes/projects.js เช็คโปรเจกต์ก่อนแล้วค่อยอ่านข้อมูลลูก
// ⚠️ โปรเจกต์ที่มองไม่เห็นตอบ 404 เหมือนไม่มีอยู่ (ไม่ใช่ 403) — ไม่บอกว่ามีโปรเจกต์ private id นี้
'use strict';

const isAdmin = (user) => user?.role === 'ADMIN';

// visibleWhere(user, alias) → { sql, params } ใช้ต่อหลัง WHERE (alias = ชื่อเล่นของตาราง projects ใน query)
const visibleWhere = (user, alias = 'p') => {
  if (isAdmin(user)) return { sql: '1 = 1', params: [] };
  if (!user) return { sql: `${alias}.visibility = 'public'`, params: [] };
  return {
    sql: `(${alias}.visibility = 'public' OR ${alias}.manager_id = ? OR ${alias}.team_lead_id = ?
      OR EXISTS (SELECT 1 FROM project_members vm WHERE vm.project_id = ${alias}.id AND vm.userid = ?))`,
    params: [user.userid, user.userid, user.userid],
  };
};

module.exports = { isAdmin, visibleWhere };
