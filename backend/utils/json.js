// backend/utils/json.js — แปลงคอลัมน์ JSON / GROUP_CONCAT จาก MariaDB (pure)
//
// MariaDB เก็บ JSON เป็น LONGTEXT — mysql2 คืนเป็น string ไม่ใช่ object จึงต้อง parse ที่นี่ที่เดียว
'use strict';

// fallback = ค่าที่คืนเมื่อว่าง / parse ไม่ได้ (เช่น [] สำหรับ history) — ข้อมูลเพี้ยนต้องไม่ทำให้ทั้งหน้า 500
const parseJson = (value, fallback = null) => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

// สำหรับเขียนลงคอลัมน์ JSON — null/undefined = NULL
const toJson = (value) => (value === null || value === undefined ? null : JSON.stringify(value));

// GROUP_CONCAT(... SEPARATOR ',') → array (ว่าง = []) · asNumber สำหรับ id ที่เป็น INT
const splitList = (value, { asNumber = false } = {}) => {
  if (!value) return [];
  const items = String(value).split(',').filter(Boolean);
  return asNumber ? items.map(Number) : items;
};

module.exports = { parseJson, toJson, splitList };
