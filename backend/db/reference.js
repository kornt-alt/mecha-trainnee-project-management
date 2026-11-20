// backend/db/reference.js — SQL ของข้อมูลอ้างอิง: departments, teams (+ สมาชิก), labels
'use strict';

const { query } = require('./pool');

const listDepartments = async () => {
  const [rows] = await query('SELECT id, name, code FROM departments ORDER BY id');
  return rows;
};

// member_ids เรียงตาม sort — ลำดับเดียวกับ memberEmployeeIds ใน mock
const listTeams = async () => {
  const [rows] = await query(
    `SELECT t.id, t.name,
       (SELECT GROUP_CONCAT(tm.userid ORDER BY tm.sort, tm.userid SEPARATOR ',') FROM team_members tm WHERE tm.team_id = t.id) AS member_ids
     FROM teams t ORDER BY t.id`
  );
  return rows;
};

const listLabels = async () => {
  const [rows] = await query('SELECT id, name, color FROM labels ORDER BY id');
  return rows;
};

module.exports = { listDepartments, listTeams, listLabels };
