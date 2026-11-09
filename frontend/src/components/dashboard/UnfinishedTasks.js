// ==========================================
// frontend/src/components/dashboard/UnfinishedTasks.js — การ์ดงานที่ยังไม่เสร็จ (Unfinished Tasks)
//
// คอมโพนेंटนี้แสดงรายการงานที่ยังไม่เสร็จทั้งหมดในแดชบอร์ด MECHA
// คุณสมบัติหลัก:
//   • แท็บกรองตามสถานะงาน (ทั้งหมด / กำลังทำ / รอตรวจสอบ / รอเริ่มทำ / เลยกำหนด / ครบกำหนดใน 7 วัน)
//   • แสดงจำนวนงานบนแต่ละแท็บแบบไดนามิก (นับจากข้อมูลจริง ไม่ hardcode)
//   • ช่องค้นหาที่ค้นได้ทั้งชื่องาน ชื่อโปรเจกต์ รายละเอียด และชื่อผู้รับผิดชอบ
//   • แสดงข้อความวันที่ครบกำหนดแบบสัมพันธ์ภาษาไทย (เช่น "เลยกำหนด 3 วัน", "อีก 2 วัน")
//   • แสดงชื่อผู้รับผิดชอบโดยดึงจากข้อมูลพนักงานผ่าน assigneeId
//   • หัวตารางแบบ sticky บนจอเดสก์ท็อป • มุมมองการ์ดย่อยบนมือถือ/แท็บเล็ต
//   • มอดัลแสดงรายละเอียดงานแบบครบถ้วน
//
// การใช้งาน: <UnfinishedTasks tasks={tasks} /> โดย tasks คือ array ของงานจาก MOCK_EMPLOYEES
// ==========================================
import React, { useMemo, useState } from 'react';
// react-bootstrap: คอมโพนेंट UI สำเร็จรูป (ปุ่ม การ์ด ฟอร์ม มอดัล ตาราง แท็บ แบจ)
//   Badge   — แสดงตัวเลขนับและป้ายสถานะแบบกลม
//   Button  — ปุ่มดูงาน ล้างคำค้นหา เปิด/ปิดมอดัล
//   Card    — การ์ดหลักที่ห่อเนื้อหางานทั้งหมด
//   Form    — ฟอร์มค้นหา (Form.Control)
//   Modal   — มอดัลแสดงรายละเอียดงาน
//   Nav     — แท็บกรองแบบ pills
//   ProgressBar — แถบความคืบหน้าของงาน
//   Table   — ตารางงานบนจอเดสก์ท็อป
import { Badge, Button, Card, Form, Modal, Nav, ProgressBar, Table } from 'react-bootstrap';
// react-router-dom: ใช้สำหรับการนำทางไปยังหน้าตารางงาน (/tasks) เมื่อคลิก "ดูทั้งหมด"
import { Link } from 'react-router-dom';
// ไอคอน SVG ที่สร้างขึ้นเองในโปรเจกต์ (ไม่พึ่งพาไลบรารีภายนอก) — อธิบายในไฟล์ ../common/Icons.js
import {
  ArrowUpRight, // ไอคอนลูกศรชี้ขึ้นขวา — ใช้ข้างปุ่ม "ดูทั้งหมด"
  CalendarDays, // ไอคอนปฏิทิน — ใช้แสดงวันที่ครบกำหนด
  CircleCheck,  // ไอคอนถูกในวงกลม — ใช้ใน empty state เมื่องานเสร็จทั้งหมด
  ClipboardList,// ไอคอนคลิปบอร์ดรายการ — ใช้ใน empty state ของแท็บย่อย
  Eye,          // ไอคอนตา — ใช้เป็นปุ่ม "ดูงาน" เพื่อเปิดมอดัลรายละเอียด
  Folder,       // ไอคอนโฟลเดอร์ — ใช้แสดงชื่อโปรเจกต์
  Search,       // ไอคอนค้นหา — ใช้ในช่องค้นหา
  UserRound,    // ไอคอนผู้ใช้ — ใช้แสดงชื่อผู้รับผิดชอบ
} from '../common/Icons';
// ข้อมูลพนักงานจำลอง — ใช้สร้าง Map สำหรับค้นหาชื่อพนักงานจาก assigneeId
import { MOCK_EMPLOYEES } from '../../data/mockData';

// ==========================================
// 2. วันที่และเวลา — ใช้ปฏิทินท้องถิ่นทั้งหมด ไม่แปลง UTC (กันคลาดวันตอนเช้า)
// ==========================================

// เติมเลข 0 นำหน้าเมื่อตัวเลขมีหลักเดียว (เช่น 1 → "01", 12 → "12")
// ใช้สำหรับจัดรูปแบบเดือนและวันที่ในสตริง YYYY-MM-DD
const pad2 = (value) => String(value).padStart(2, '0');

// คืนวันที่วันนี้ตามเวลาเครื่องผู้ใช้ในรูปแบบ YYYY-MM-DD
// ตัวอย่าง: "2026-11-02"
// เหตุผลที่ใช้ฟังก์ชันนี้แทน new Date().toISOString(): toISOString() คืนค่าเป็นเวลา UTC
// ซึ่งอาทำให้วันที่คลาดเคลื่อนเมื่อผู้ใช้อยู่ในเขตเวลาที่ไม่ใช่ UTC (เช่น ไทย UTC+7)
// เราต้องการวันที่ตามปฏิทินท้องถิ่นของเครื่องผู้ใช้เท่านั้น
function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// แปลงสตริงวันที่ YYYY-MM-DD ให้เป็นวัตถุ Date แบบท้องถิ่น
// จงใจไม่ใช้ new Date(สตริงISO) เพราะ JavaScript จะตีความสตริง ISO ว่าเป็นเวลา UTC
// ซึ่งอาทำให้วันที่ผิดไปหนึ่งวันเมื่อแปลงเป็นเวลาท้องถิ่น
//
// พารามิเตอร์:
//   isoDate — สตริงวันที่ในรูปแบบ "YYYY-MM-DD" (อาจเป็น null หรือ undefined)
//
// คืนค่า:
//   Date object ที่ตั้งเวลาเป็น 00:00:00 ของวันที่นั้นตามเขตเวลาท้องถิ่น
//   null ถ้า isoDate ว่าง หรือแยกส่วนปี/เดือน/วันที่ไม่ได้
function parseLocalDate(isoDate) {
  const [y, m, d] = (isoDate || '').split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

// คำนวณวันที่เมื่อผ่านไปจำนวนวันที่กำหนด แล้วคืนค่าเป็นสตริง YYYY-MM-DD
//
// พารามิเตอร์:
//   isoDate — สตริงวันที่ต้นทางในรูปแบบ "YYYY-MM-DD"
//   days    — จำนวนวันที่ต้องการบวก (สามารถเป็นลบเพื่อย้อนหลังได้)
//
// คืนค่า:
//   สตริงวันที่ใหม่ในรูปแบบ "YYYY-MM-DD"
//   สตริงว่าง '' ถ้า isoDate ไม่ถูกต้อง
function addDaysIso(isoDate, days) {
  const d = parseLocalDate(isoDate);
  if (!d) return '';
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// คำนวณผลต่างของสองวันที่เป็นจำนวนวันเต็ม (endDate − startDate)
// วัดจากปฏิทินท้องถิ่น ไม่สนใจเวลาในวัน
//
// พารามิเตอร์:
//   startDate — สตริงวันที่เริ่มต้น "YYYY-MM-DD"
//   endDate   — สตริงวันที่สิ้นสุด "YYYY-MM-DD"
//
// คืนค่า:
//   จำนวนวันเต็ม (จำนวนเต็มบวกหรือลบ) ถ้าทั้งสองวันที่ถูกต้อง
//   null ถ้าวันที่ใดวันที่หนึ่งไม่ถูกต้อง
function diffLocalDays(startDate, endDate) {
  const a = parseLocalDate(startDate);
  const b = parseLocalDate(endDate);
  if (!a || !b) return null;
  return Math.round((b - a) / 86400000);
}

// ==========================================
// 3. การจำแนกความเร่งด่วนของกำหนดส่ง
//    ใช้ตัวจำแนกเดียวกันสำหรับการกรอง / นับจำนวน / การกำหนดสีแถว
// ==========================================

// จำแนกสถานะความเร่งด่วนของกำหนดส่งงานหนึ่งงาน
//
// พารามิเตอร์:
//   dueDate   — สตริงวันที่ครบกำหนด "YYYY-MM-DD" (อาจเป็น null/undefined)
//   todayStr  — สตริงวันที่วันนี้ "YYYY-MM-DD"
//
// คืนค่า:
//   'overdue'  — เลยกำหนดแล้ว (dueDate ก่อน todayStr)
//   'today'    — ครบกำหนดวันนี้ (dueDate เท่ากับ todayStr)
//   'soon'     — ยังไม่ถึงกำหนด (dueDate หลังจาก todayStr)
//   null       — ไม่มีวันที่ครบกำหนด
//
// หมายเหตุ: การเปรียบเทียบใช้สตริง YYYY-MM-DD โดยตรง ซึ่งทำงานได้ถูกต้อง
// เพราะรูปแบบนี้เรียงลำดับตามตัวอักษรตรงกับลำดับวันที่
function classifyDueDate(dueDate, todayStr) {
  const key = (dueDate || '').slice(0, 10);
  if (!key) return null;
  if (key < todayStr) return 'overdue';
  if (key === todayStr) return 'today';
  return 'soon';
}

// ตรวจสอบว่างานหนึ่งงานอยู่ในสถานะ "เลยกำหนด" หรือไม่
// เงื่อนไข: งานยังไม่เสร็จ (status ไม่ใช่ 'completed') และวันที่ครบกำหนดก่อนวันนี้
// งานที่เสร็จแล้วจะไม่ถูกนับเป็นงานเลยกำหนดแม้ว่าวันที่ครบกำหนดจะผ่านไปแล้วก็ตาม
function isOverdueTask(task, todayStr) {
  return task.status !== 'completed' && classifyDueDate(task.dueDate, todayStr) === 'overdue';
}

// ตรวจสอบว่างานหนึ่งงานอยู่ในสถานะ "ครบกำหนดภายใน 7 วัน" หรือไม่
// เงื่อนไข:
//   1. งานยังไม่เสร็จ (status ไม่ใช่ 'completed')
//   2. มีวันที่ครบกำหนด (dueDate ไม่ใช่ null/undefined)
//   3. ไม่ใช่งานที่เลยกำหนดแล้ว (overe due ถูกตัดออก ไม่อยู่ในหมวดนี้)
//   4. วันที่ครบกำหนดอยู่ระหว่างวันนี้ถึงวันนี้+7 วัน (รวมวันนี้)
//      ขอบเขตนี้เหมือนกับตัวนับ "ใกล้กำหนดส่ง" ใน welcome banner ของ Home.js
function isDueSoonTask(task, todayStr, dueSoonLimit) {
  if (task.status === 'completed' || !task.dueDate) return false;
  if (classifyDueDate(task.dueDate, todayStr) === 'overdue') return false;
  return task.dueDate.slice(0, 10) <= dueSoonLimit;
}

// ==========================================
// 4. แท็บกรองและข้อความเมื่อไม่มีข้อมูล (Empty State)
// ==========================================

// รายการแท็บกรองทั้งหมดที่แสดงใน Filter Bar
// แต่ละแท็บมี key สำหรับใช้กรองและ label สำหรับแสดงผลเป็นภาษาไทย
// แท็บเหล่านี้ใช้ทั้งสำหรับนับจำนวนงาน และกรองรายการที่แสดงผล
const FILTER_TABS = [
  { key: 'all', label: 'ทั้งหมด' },           // แสดงงานทุกสถานะที่ยังไม่เสร็จ
  { key: 'in_progress', label: 'กำลังทำ' },  // งานที่อยู่ในสถานะกำลังดำเนินการ
  { key: 'pending_review', label: 'รอการตรวจสอบ' }, // งานที่รอการตรวจสอบ/อนุมัติ
  { key: 'not_started', label: 'รอเริ่มทำ' }, // งานที่ยังไม่เริ่มดำเนินการ
  { key: 'overdue', label: 'เลยกำหนด' },     // งานที่เลยกำหนดส่งแล้ว
  { key: 'due_soon', label: 'ครบกำหนดใน 7 วัน' }, // งานที่กำหนดส่งภายใน 7 วันข้างหน้า
];

// ตรวจสอบว่างานหนึ่งตรงกับแท็บกรองที่เลือกหรือไม่
// เงื่อนไขเดียวกันนี้ใช้ทั้งสำหรับนับจำนวนบนแท็บ และสำหรับกรองรายการที่แสดง
// เพื่อให้ตัวเลขบนแท็บตรงกับจำนวนรายการที่แสดงจริงเสมอ
//
// งานที่มีสถานะ 'completed' จะถูกข้ามทุกแท็บ — การ์ดนี้แสดงเฉพาะงานที่ยังไม่เสร็จเท่านั้น
//
// พารามิเตอร์:
//   task         — วัตถุงานที่ต้องการตรวจสอบ
//   filterKey    — คีย์ของแท็บที่เลือก ('all', 'in_progress', 'pending_review', 'not_started', 'overdue', 'due_soon')
//   todayStr     — สตริงวันที่วันนี้ "YYYY-MM-DD"
//   dueSoonLimit — สตริงวันที่วันนี้ + 7 วัน "YYYY-MM-DD"
//
// คืนค่า:
//   true  ถ้างานตรงกับเงื่อนไขของแท็บ
//   false ถ้างานไม่ตรง หรือเป็นงานที่เสร็จแล้ว
function taskMatchesFilter(task, filterKey, todayStr, dueSoonLimit) {
  if (!task || task.status === 'completed') return false;
  switch (filterKey) {
    case 'all':
      return true;
    case 'in_progress':
    case 'pending_review':
    case 'not_started':
      return task.status === filterKey;
    case 'overdue':
      return classifyDueDate(task.dueDate, todayStr) === 'overdue';
    case 'due_soon':
      return isDueSoonTask(task, todayStr, dueSoonLimit);
    default:
      // สถานะอื่นที่อาจมีในอนาคตจะไม่ตรงกับแท็บย่อยใด จึงเห็นได้เฉพาะแท็บทั้งหมด
      return false;
  }
}

// ข้อความแสดงเมื่อไม่มีงานในแต่ละแท็บ (Empty State)
// แต่ละแท็บมีหัวข้อ คำอธิบาย และไอคอนที่แตกต่างกัน
// ห้ามใช้ข้อความ "งานเสร็จหมดแล้ว" แบบเหมารวมทุกแท็บ — เพราะบางแท็บอาจไม่มีงาน
// แต่งานทั้งหมดอาจยังไม่เสร็จก็ได้
const EMPTY_STATE_BY_FILTER = {
  all: { title: 'ไม่มีงานที่ยังไม่เสร็จ', desc: 'ยอดเยี่ยมมาก งานที่ได้รับมอบหมายทั้งหมดเสร็จสมบูรณ์แล้ว', icon: 'done' },
  in_progress: { title: 'ไม่มีงานที่กำลังดำเนินการ', desc: 'ยังไม่มีงานในสถานะกำลังดำเนินการขณะนี้', icon: 'tasks' },
  pending_review: { title: 'ไม่มีงานที่รอตรวจสอบ', desc: 'ยังไม่มีงานที่ส่งเข้าเป็นรอการตรวจสอบขณะนี้', icon: 'tasks' },
  not_started: { title: 'ไม่มีงานที่ยังไม่เริ่ม', desc: 'ยังไม่มีงานในสถานะรอเริ่มทำขณะนี้', icon: 'tasks' },
  overdue: { title: 'ไม่มีงานที่เลยกำหนด', desc: 'ยินดีด้วย รายการนี้ไม่มีงานข้ามกำหนดส่ง', icon: 'tasks' },
  due_soon: { title: 'ไม่มีงานที่ครบกำหนดภายใน 7 วัน', desc: 'ยังไม่มีงานที่จะครบกำหนดส่งภายใน 7 วันข้างหน้า', icon: 'tasks' },
};

// ==========================================
// 5. การจัดการผู้รับผิดชอบ (Assignee)
// ==========================================

// สร้าง Map ที่เชื่อมโยง assigneeId → ชื่อพนักงาน ล่วงหน้าตอนโหลดโมดูล
// ใช้ Map แทนการวนหาใน array พนักงานทุกครั้งที่ต้องการชื่อ — ทำให้ค้นหาเป็น O(1)
// MOCK_EMPLOYEES ถูกนำเข้าจาก ../../data/mockData (ดูไฟล์นั้นสำหรับโครงสร้างข้อมูลพนักงาน)
const EMPLOYEE_NAME_BY_ID = new Map(MOCK_EMPLOYEES.map((e) => [e.id, e.name]));

// ข้อความสำรองเมื่อไม่พบ assigneeId หรือไม่ตรงกับข้อมูลพนักงานใดๆ
// ใช้ข้อความนี้ทุกจุดที่แสดงชื่อผู้รับผิดชอบ เพื่อความสอดคล้องกัน
const ASSIGNEE_FALLBACK_LABEL = 'ไม่ระบุผู้รับผิดชอบ';

// ค้นหาชื่อผู้รับผิดชอบจาก assigneeId ของงาน
//
// พารามิเตอร์:
//   task — วัตถุงานที่มี proprietà assigneeId
//
// คืนค่า:
//   ชื่อพนักงานที่ตรงกับ assigneeId ถ้าพบใน MOCK_EMPLOYEES
//   ข้อความสำรอง 'ไม่ระบุผู้รับผิดชอบ' ถ้า assigneeId หาย หรือไม่ตรงกับพนักงานคนใด
function getAssigneeName(task) {
  return EMPLOYEE_NAME_BY_ID.get(task && task.assigneeId) || ASSIGNEE_FALLBACK_LABEL;
}

// ==========================================
// 6. การคำนวณความคืบหน้า (Progress)
// ==========================================

// ปรับค่าความคืบหน้าให้อยู่ในช่วง 0–100 เสมอ
// ป้องกันค่าที่ผิดปกติ (null, undefined, ติดลบ, เกิน 100) ไม่ทำให้ ProgressBar แตกหรือแสดงผิด
//
// พารามิเตอร์:
//   value — ค่าความคืบหน้าดิบใดๆ (อาจเป็นตัวเลข สตริง null undefined ฯลฯ)
//
// คืนค่า:
//   จำนวนเต็มระหว่าง 0 ถึง 100
//   คืน 0 ถ้าค่าไม่ใช่ตัวเลขที่ถูกต้อง (NaN, Infinity)
function normalizeProgress(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

// คืนค่าสีของแถบความคืบหน้าตามค่าเปอร์เซ็นต์
// ใช้สีชุดเดียวกับ Dashboard อื่นๆ:
//   100%     = สีเขียว (success) — งานเสร็จสมบูรณ์
//   > 50%    = สีน้ำเงิน (primary) — คืบหน้ามากกว่าครึ่ง
//   ≤ 50%    = สีเหลือง/ส้ม (warning) — คืบหน้าน้อยกว่าครึ่ง
//
// ใช้ร่วมกันทั้งในตาราง การ์ดมือถือ และมอดัลรายละเอียดงาน
function getProgressVariant(progress) {
  return progress >= 100 ? 'success' : progress > 50 ? 'primary' : 'warning';
}

// ==========================================
// 7. ค่าคงที่และฟังก์ชันแสดงป้าย/แบจ (Badges / Labels)
// ==========================================

// การกำหนดค่าป้ายสถานะงาน แต่ละสถานะมีข้อความแสดงผลและคลาส CSS สำหรับสีป้าย
// ตรงกับ statusLabel ใน mockData และการแสดงสถานะในหน้า Tasks.js
// หมายเหตุ: สถานะ 'completed' ถูกกำหนดไว้ที่นี่เพื่อความสมบูรณ์ แต่ไม่ควรปรากฏในการ์ดนี้
// เพราะการ์ดนี้กรองเฉพาะงานที่ยังไม่เสร็จเท่านั้น
const STATUS_INFO = {
  in_progress: { label: 'กำลังดำเนินการ', pillClass: 'status-pill-blue' },
  pending_review: { label: 'รอการตรวจสอบ', pillClass: 'status-pill-orange' },
  not_started: { label: 'รอเริ่มทำ', pillClass: 'status-pill-gray' },
  completed: { label: 'เสร็จสิ้น', pillClass: 'status-pill-green' },
};

// ป้ายแสดงระดับความสำคัญของงาน — ใช้ชุดค่าเดียวกับ renderPriorityBadge ของหน้า Tasks.js
// ป้องกันการใช้ชื่อหรือสีที่ไม่ตรงกันข้ามหน้าจอต่างๆ
const PRIORITY_LABELS = { urgent: 'ด่วนมาก', high: 'สูง', normal: 'ปกติ', low: 'ต่ำ' };
const PRIORITY_BADGE_BG = { urgent: 'danger', high: 'warning', normal: 'primary', low: 'secondary' };

// คลาส CSS สำหรับป้ายประเภทงาน (หมวดหมู่) — แต่ละประเภทมีสีพื้นและตัวอักษรต่างกัน
const CATEGORY_PILL_CLASS = {
  Frontend: 'category-frontend',
  Backend: 'category-backend',
  Testing: 'category-testing',
  Documentation: 'category-doc',
  Design: 'category-design',
};

// แมปสถานะความเร่งด่วนของกำหนดส่งเข้ากับคลาส CSS ที่ใช้กำหนดสีตัวอักษร
// คลาสเหล่านี้ถูกกำหนดสไตล์ในไฟล์ frontend/src/index.css (ส่วนกำหนดส่งในตาราง/การ์ด)
const DUE_DATE_KIND_CLASS = {
  overdue: 'due-date-overdue',   // สีตัวอักษรแดง — เลยกำหนด
  today:   'due-date-today',     // สีตัวอักษรส้มเข้ม — ครบกำหนดวันนี้
  soon:    'due-date-soon',      // สีตัวอักษรส้ม — ครบกำหนดภายใน 7 วัน
  later:   'due-date-later',     // สีตัวอักษรเทา — เกิน 7 วันข้างหน้า
  done:    'due-date-later',     // งานที่เสร็จแล้ว ใช้สีเดียวกับ later
  none:    'due-date-none',      // ไม่มีวันที่ครบกำหนด ใช้สีเทา
};

// แสดงป้ายสถานะงานเป็นแถบกลม (pill)
// พารามิเตอร์:
//   status         — รหัสสถานะงาน ('in_progress', 'pending_review', 'not_started', ฯลฯ)
//   fallbackLabel  — ข้อความสำรองเมื่อไม่พบสถานะใน STATUS_INFO
//
// คืนค่า: JSX span ที่มีคลาส status-pill พร้อมคลาสสีตามสถานะ และข้อความภาษาไทย
function renderStatusBadge(status, fallbackLabel) {
  const info = STATUS_INFO[status];
  const text = (info && info.label) || fallbackLabel || status || 'ไม่ทราบสถานะ';
  return <span className={`status-pill ${info ? info.pillClass : 'status-pill-gray'}`}>{text}</span>;
}

// แสดงป้ายประเภทงาน (หมวดหมู่) เช่น Frontend, Backend, Testing
// พารามิเตอร์:
//   category — ชื่อประเภทงาน (อาจเป็น null/undefined)
//
// คืนค่า: JSX span ที่มีคลาส category-pill พร้อมคลาสสีตามประเภท หรือข้อความ 'ไม่ระบุ'
function renderCategoryBadge(category) {
  return (
    <span className={`category-pill ${CATEGORY_PILL_CLASS[category] || 'category-default'}`}>
      {category || 'ไม่ระบุ'}
    </span>
  );
}

// แสดงป้ายระดับความสำคัญของงานด้วย react-bootstrap Badge
// พารามิเตอร์:
//   priority — รหัสระดับความสำคัญ ('urgent', 'high', 'normal', 'low')
//
// คืนค่า: JSX Badge ที่มีสีพื้นหลังตามระดับความสำคัญ และข้อความภาษาไทย
function renderPriorityBadge(priority) {
  const label = PRIORITY_LABELS[priority] || priority || 'ปกติ';
  return <Badge bg={PRIORITY_BADGE_BG[priority] || 'secondary'}>{label}</Badge>;
}

// ==========================================
// 8. การแสดงข้อมูลกำหนดส่ง (Due Date)
// ==========================================

// คำนวณและคืนข้อมูลเกี่ยวกับกำหนดส่งของงานในรูปแบบที่อ่านเข้าใจง่าย
// ข้อความสัมพันธ์ (relText) แสดงเป็นหลัก ส่วนวันที่จริง (dateText) แสดงเป็นข้อมูลรองด้านล่างและใน tooltip
//
// พารามิเตอร์:
//   task     — วัตถุงานที่ต้องการคำนวณกำหนดส่ง
//   todayStr — สตริงวันที่วันนี้ "YYYY-MM-DD"
//
// คืนค่าวัตถุ:
//   { kind, relText, dateText }
//   kind       — 'none' | 'done' | 'overdue' | 'today' | 'soon' | 'later'
//   relText    — ข้อความสัมพันธ์ภาษาไทย เช่น "เลยกำหนด 3 วัน", "ครบกำหนดวันนี้", "อีก 2 วัน"
//   dateText   — วันที่จริงในรูปแบบ "YYYY/MM/DD" (หรือ '-' ถ้าไม่มีวันที่)
//
// โครงตรรกะ:
//   1. ถ้างานไม่มี dueDate → kind = 'none'
//   2. ถ้างานเสร็จแล้ว → kind = 'done' (แสดง 'เสร็จสิ้นแล้ว' แทนการนับเป็นเลยกำหนด)
//   3. ถ้า overdue → คำนวณจำนวนวันที่เลยกำหนด แสดง 'เลยกำหนด X วัน'
//   4. ถ้า today → แสดง 'ครบกำหนดวันนี้'
//   5. ถ้า soon (ภายใน 7 วัน) → แสดง 'อีก X วัน'
//   6. ถ้า later (เกิน 7 วัน) → kind = 'later' แสดง 'อีก X วัน'
//      (เงื่อนไข days <= 7 ถูกกำหนดไว้ใน return statement ด้านล่าง)
function getDueDateInfo(task, todayStr) {
  if (!task || !task.dueDate) {
    return { kind: 'none', relText: 'ไม่ระบุ', dateText: '-' };
  }
  // งานเสร็จแล้วไม่ต้องนับเป็นเลยกำหนด — แจ้งว่าปิดงานไปเรียบร้อยแทน
  if (task.status === 'completed') {
    return { kind: 'done', relText: 'เสร็จสิ้นแล้ว', dateText: task.dueDate.replace(/-/g, '/') };
  }
  const kind = classifyDueDate(task.dueDate, todayStr);
  const dateText = task.dueDate.replace(/-/g, '/');
  if (kind === 'overdue') {
    const days = Math.abs(diffLocalDays(todayStr, task.dueDate));
    return { kind, relText: days === 1 ? 'เลยกำหนด 1 วัน' : `เลยกำหนด ${days} วัน`, dateText };
  }
  if (kind === 'today') {
    return { kind, relText: 'ครบกำหนดวันนี้', dateText };
  }
  const days = diffLocalDays(todayStr, task.dueDate);
  return {
    kind: days <= 7 ? 'soon' : 'later',
    relText: days === 1 ? 'อีก 1 วัน' : `อีก ${days} วัน`,
    dateText,
  };
}

// แสดงข้อมูลกำหนดส่งในรูปแบบ UI (ถูกใช้ทั้งในตารางเดสก์ท็อปและการ์ดมือถือ)
// พารามิเตอร์:
//   dueInfo — วัตถุที่คืนจาก getDueDateInfo() ประกอบด้วย kind, relText, dateText
//
// โครงสร้างที่แสดง:
//   บรรทัดแรก: ไอคอนปฏิทิน + ข้อความสัมพันธ์ (เช่น "อีก 2 วัน") ตัวหนา
//   บรรทัดที่สอง (ถ้ามีวันที่): วันที่จริงขนาดเล็กสีเทา เช่น "2026/11/10"
//   tooltip แสดงเต็ม: "กำหนดส่ง 2026/11/10 (อีก 2 วัน)"
function renderDueDate(dueInfo) {
  return (
    <span
      className={`due-date-cell ${DUE_DATE_KIND_CLASS[dueInfo.kind] || 'due-date-later'}`}
      title={
        dueInfo.kind === 'none'
          ? 'ไม่ระบุวันครบกำหนดส่ง'
          : `กำหนดส่ง ${dueInfo.dateText} (${dueInfo.relText})`
      }
    >
      <span className="due-date-rel d-inline-flex align-items-center gap-1">
        <CalendarDays size={13} />
        <span>{dueInfo.relText}</span>
      </span>
      {dueInfo.kind !== 'none' && <span className="due-date-raw">{dueInfo.dateText}</span>}
    </span>
  );
}

// ==========================================
// 9. บล็อกข้อมูลงานและแถบความคืบหน้า
// ==========================================

// แสดงบล็อกข้อมูลหลักของงาน — ใช้ร่วมกันระหว่างตารางเดสก์ท็อปกับการ์ดย่อยมือถือ
// เพื่อให้ข้อมูลหลักของงานมีโครงสร้างและลักษณะเหมือนกันทุกมุมมอง
//
// พารามิเตอร์:
//   task           — วัตถุงานที่ต้องการแสดง
//   showDescription — ถ้า true จะแสดงคำอธิบายงานเพิ่มเติม (ใช้เฉพาะในมุมมองตาราง)
//
// ส่วนประกอบ:
//   1. ชื่องาน (ตัวหนา) + ป้าย "ด่วนมาก" ถ้างานมีระดับความสำคัญเป็น urgent
//   2. ชื่อโปรเจกต์พร้อมไอคอนโฟลเดอร์
//   3. ชื่อผู้รับผิดชอบพร้อมไอคอนผู้ใช้ และป้ายประเภทงาน (ถ้ามี)
//   4. คำอธิบายงาน (ถ้า showDescription เป็น true และมีคำอธิบาย)
function renderTaskTitleBlock(task, { showDescription = false } = {}) {
  const assigneeName = getAssigneeName(task);
  return (
    <div className="task-title-wrap">
      <div className="task-title-line d-flex align-items-start gap-1 flex-wrap">
        <span className="task-title fw-semibold text-ink">{task.title}</span>
        {/* "ด่วนมาก" ใช้ป้ายเล็กติดชื่องาน — ไม่เปิดคอลัมน์ความสำคัญเพิ่มให้ตารางกว้างเกินไป */}
        {task.priority === 'urgent' && <span className="task-urgent-badge">ด่วนมาก</span>}
      </div>
      <div className="task-meta-line" title={task.projectName || undefined}>
        <Folder size={12} />
        <span className="task-meta-text">{task.projectName || 'ไม่ระบุโปรเจกต์'}</span>
      </div>
      <div className="task-meta-line">
        <UserRound size={12} />
        <span className="task-meta-text" title={assigneeName}>
          {assigneeName}
        </span>
        {task.category && <span className="task-meta-category">{renderCategoryBadge(task.category)}</span>}
      </div>
      {showDescription && task.description && (
        <p className="task-desc small text-muted mb-0 mt-1" title={task.description}>
          {task.description}
        </p>
      )}
    </div>
  );
}

// แสดงแถบความคืบหน้าของงานพร้อมตัวเลขเปอร์เซ็นต์
// ใช้ร่วมกันทั้งในตาราง การ์ดมือถือ และมอดัลรายละเอียดงาน
//
// พารามิเตอร์:
//   progress — ค่าความคืบหน้าดิบใดๆ (จะถูกปรับผ่าน normalizeProgress ก่อนแสดง)
//
// คืนค่า: JSX ที่ประกอบด้วย ProgressBar (แถบสีตามค่าคืบหน้า) และข้อความเปอร์เซ็นต์
function renderProgress(progress) {
  const percent = normalizeProgress(progress);
  return (
    <div className="task-progress-cell d-flex align-items-center gap-2">
      <ProgressBar now={percent} variant={getProgressVariant(percent)} className="task-progress-bar" />
      <span className="task-progress-value text-muted">{percent}%</span>
    </div>
  );
}

// ==========================================
// 10. คอมโพนันต์หลัก UnfinishedTasks
// ==========================================

// คอมโพนันต์หลักที่แสดงรายการงานที่ยังไม่เสร็จพร้อมตัวกรอง ค้นหา และมอดัลรายละเอียด
//
// พารามิเตอร์:
//   tasks — array ของวัตถุงาน (โดยปกติส่งจาก MOCK_EMPLOYEES/MOCK_TASKS ผ่าน Home.js)
//           ถ้าไม่ส่งมา จะใช้ array ว่างเป็นค่าเริ่มต้น
//
// โครงสร้างการทำงาน:
//   1. กำหนด state: ตัวกรองที่เลือก คำค้นหา งานที่เลือกสำหรับมอดัล
//   2. คำนวณวันที่วันนี้และวันที่ límite 7 วัน
//   3. คำนวณจำนวนงานต่อแท็บแบบไดนามิก (useMemo)
//   4. กรองงานตามแท็บแล้วค้นหา แล้วเรียงลำดับ (useMemo)
//   5. แสดงผล: หัวการ์ด ช่องค้นหา แท็บกรอง ตาราง/การ์ด มอดัลรายละเอียด
export default function UnfinishedTasks({ tasks = [] }) {
  // --- React Hooks และ State ---
  // activeFilter: คีย์ของแท็บที่เลือกอยู่ปัจจุบัน เริ่มต้นที่ 'all'
  //   เมื่อผู้ใช้คลิกแท็บอื่น จะเปลี่ยนค่านี้และทำให้รายงานที่แสดงเปลี่ยนตาม
  const [activeFilter, setActiveFilter] = useState('all');
  // searchTerm: ข้อความที่พิมพ์ในช่องค้นหา เริ่มต้นเป็นสตริงว่าง
  //   ใช้กรองงานตามชื่อ โปรเจกต์ รายละเอียด หรือชื่อผู้รับผิดชอบ (case-insensitive)
  const [searchTerm, setSearchTerm] = useState('');
  // selectedTask: งานที่ถูกเลือกเพื่อแสดงในมอดัลรายละเอียด เริ่มต้นเป็น null
  //   เมื่อเป็น null มอดัลจะไม่แสดง เมื่อมีค่า มอดัลจะแสดงรายละเอียดของงานนั้น
  const [selectedTask, setSelectedTask] = useState(null);

  // --- การคำนวณวันที่ ---
  // today: สตริงวันที่วันนี้ในรูปแบบ YYYY-MM-DD ตามเวลาเครื่องผู้ใช้ (ป้องกันปัญหา UTC)
  const today = getTodayString();
  // dueSoonLimit: สตริงวันที่วันนี้ + 7 วัน ใช้เป็นเส้นขอบเขตของแท็บ "ครบกำหนดใน 7 วัน"
  // คำนวณด้วยวิธีเดียวกับ welcome banner ใน Home.js เพื่อให้ตัวเลขตรงกัน
  const dueSoonLimit = addDaysIso(today, 7);

  // แปลงคำค้นหาเป็นตัวพิมพ์เล็กและตัดช่องว่างหัวท้าย เพื่อใช้เปรียบเทียบแบบ case-insensitive
  const trimmedSearch = searchTerm.trim().toLowerCase();

  // --- การนับจำนวนงานต่อแท็บ (useMemo) ---
  // นับจำนวนงานในแต่ละแท็บกรองจากข้อมูลทั้งหมด ไม่ขึ้นกับคำค้นหา
  // เหตุผล: ตัวเลขบนแท็บควรแสดง "จำนวนงานทั้งหมดที่ตรงเงื่อนไขนั้น" ตลอดเวลา
  // ถึงแม้ผู้ใช้จะกำลังค้นหาข้อความบางอย่าง ตัวเลขบนแท็บก็ไม่ควรเปลี่ยน
  // ใช้ useMemo เพื่อไม่ต้องคำนวณใหม่ทุกครั้งที่ render ถ้าข้อมูลต้นทางยังไม่เปลี่ยน
  const filterCounts = useMemo(() => {
    const counts = {};
    FILTER_TABS.forEach(({ key }) => { counts[key] = 0; });
    tasks.forEach((task) => {
      FILTER_TABS.forEach(({ key }) => {
        if (taskMatchesFilter(task, key, today, dueSoonLimit)) counts[key] += 1;
      });
    });
    return counts;
  }, [tasks, today, dueSoonLimit]);

  // --- การกรองและเรียงลำดับงานที่จะแสดง (useMemo) ---
  // ขั้นตอนที่ 1: กรองตามแท็บที่เลือก (ใช้ taskMatchesFilter เดียวกับที่ใช้ถับจำนวน)
  // ขั้นตอนที่ 2: ค้นหาข้อความในชื่องาน ชื่อโปรเจกต์ รายละเอียด และชื่อผู้รับผิดชอบ (case-insensitive)
  // ขั้นตอนที่ 3: เรียงลำดับ — งานที่เลยกำหนดแสดงก่อน แล้วจึงเรียงตามวันที่ครบกำหนดใกล้ที่สุด
  // เรียงบนสำเนาของ array เสมอ — ข้อมูลต้นทาง (prop tasks) ต้องไม่ถูกแก้ไข
  const visibleTasks = useMemo(() => {
    const filtered = tasks.filter((task) => taskMatchesFilter(task, activeFilter, today, dueSoonLimit));
    const searched = trimmedSearch
      ? filtered.filter((task) =>
          [task.title, task.projectName, task.description, getAssigneeName(task)]
            .some((field) => (field || '').toLowerCase().includes(trimmedSearch))
        )
      : filtered;
    return [...searched].sort((a, b) => {
      const overdueDiff = Number(isOverdueTask(b, today)) - Number(isOverdueTask(a, today));
      if (overdueDiff !== 0) return overdueDiff;
      return (
        (a.dueDate || '').localeCompare(b.dueDate || '') ||
        String(a.id).localeCompare(String(b.id))
      );
    });
  }, [tasks, activeFilter, trimmedSearch, today, dueSoonLimit]);

  // ตรวจสอบว่าผลการค้นหาไม่ตรงกับงานใดๆ หรือไม่
  // ใช้เพื่อแสดงข้อความ "ไม่พบงานที่ตรงกับคำค้นหา" แทนข้อความ empty state ปกติ
  const isSearchNoMatch = trimmedSearch !== '' && visibleTasks.length === 0;
  // เลือกข้อความ empty state ตามแท็บที่เลือก
  // ถ้าเป็นผลจากการค้นหาที่ไม่เจอ → แสดงข้อความแจ้งไม่พบงาน
  // ถ้าไม่ใช่ → แสดงข้อความ empty state ของแท็บนั้นๆ (เช่น "ไม่มีงานที่รอตรวจสอบ")
  // ห้ามใช้ข้อความ "งานเสร็จหมดแล้ว" แบบเหมารวมทุกแท็บ
  const emptyState = isSearchNoMatch
    ? {
        title: 'ไม่พบงานที่ตรงกับคำค้นหา',
        desc: `ไม่มีงานที่ตรงกับ "${searchTerm.trim()}" ในแท็บที่เลือก ลองใช้คำค้นอื่นหรือล้างคำค้นหา`,
        icon: 'search',
      }
    : EMPTY_STATE_BY_FILTER[activeFilter] || EMPTY_STATE_BY_FILTER.all;

  // ==========================================
  // การแสดงผล (JSX)
  // ==========================================

  return (
    <>
      {/* ========== การ์ดหลัก ========== */}
      <Card className="border-0 shadow-sm unfinished-tasks-card mb-4">
        {/* ========== หัวการ์ด: ชื่อ คำค้นหา แท็บกรอง ========== */}
        <Card.Header className="bg-white border-bottom py-3 px-3 px-md-4">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
            {/* ซ้าย: ชื่อหัวเรื่องและจำนวนงานทั้งหมด */}
            <div className="d-flex align-items-center gap-2">
              <h2 className="section-title mb-0">งานที่ยังไม่เสร็จ (Unfinished Tasks)</h2>
              {/* แสดงจำนวนงานทั้งหมดที่ยังไม่เสร็จ (filterCounts.all)
                  ตัวเลขบนแท็บกรองจะแสดงอยู่ใน Nav ด้านล่างแยกต่างหาก */}
              <Badge bg="primary" className="rounded-pill px-2 py-1">
                {filterCounts.all} รายการ
              </Badge>
            </div>

            {/* ขวา: ปุ่ม "ดูทั้งหมด" ไปยังหน้าตารางงาน (/tasks) */}
            <div className="d-flex align-items-center gap-2">
              {/* /tasks คือหน้ารวมงานทั้งหมด (List + Kanban) ตรงกับความหมายของ "ดูทั้งหมด"
                  เดิมชี้ไปที่ /projects ซึ่งเป็นหน้าโปรเจกต์ ไม่ใช่หน้างาน จึงแก้ไขเป็น /tasks */}
              <Link to="/tasks" className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1">
                <span>ดูทั้งหมด</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>

          {/* ช่องค้นหา — ค้นได้จากชื่องาน ชื่อโปรเจกต์ รายละเอียด และชื่อผู้รับผิดชอบ
              ไม่สนตัวพิมพ์เล็ก/ใหญ่ และตัดช่องว่างหัวท้ายก่อนเปรียบเทียบ */}
          <div className="task-search-wrap position-relative mt-3">
            <Search size={15} className="task-search-icon text-muted" />
            <Form.Control
              type="search"
              size="sm"
              className="task-search-input"
              placeholder="ค้นหาชื่องาน โปรเจกต์ หรือผู้รับผิดชอบ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="ค้นหางานที่ยังไม่เสร็จ"
            />
            {/* ปุ่มล้างคำค้นหา — แสดงเมื่อมีการพิมพ์ข้อความในช่องค้นหา */}
            {searchTerm && (
              <button
                type="button"
                className="task-search-clear btn-close"
                aria-label="ล้างคำค้นหา"
                onClick={() => setSearchTerm('')}
              />
            )}
          </div>

          {/* Filter Bar — แท็บกรองแบบ pills พร้อมตัวเลขนับจาก filterCounts
              ห้าม hardcode ตัวเลข — ต้องนับจาก filterCounts เสมอ */}
          <Nav
            variant="pills"
            className="filter-nav mt-3 gap-1"
            activeKey={activeFilter}
            onSelect={(k) => setActiveFilter(k || 'all')}
            aria-label="กรองงานที่ยังไม่เสร็จ"
          >
            {FILTER_TABS.map((filter) => (
              <Nav.Item key={filter.key}>
                <Nav.Link eventKey={filter.key} className="filter-pill-btn">
                  <span className="filter-pill-label">{filter.label}</span>
                  <span className="filter-count">{filterCounts[filter.key]}</span>
                </Nav.Link>
              </Nav.Item>
            ))}
          </Nav>
        </Card.Header>

        {/* ========== เนื้อหาในการ์ด: รายการงานหรือข้อความเมื่อไม่มีงาน ========== */}
        <Card.Body className="p-0">
          {visibleTasks.length === 0 ? (
            <div className="unfinished-tasks-empty text-center px-3">
              <div className="empty-state-icon mx-auto mb-2 text-muted">
                {emptyState.icon === 'search' && <Search size={36} color="var(--muted)" />}
                {emptyState.icon === 'done' && <CircleCheck size={36} color="var(--green)" />}
                {emptyState.icon === 'tasks' && <ClipboardList size={36} color="var(--muted)" />}
              </div>
              <h6 className="fw-semibold text-ink">{emptyState.title}</h6>
              <p className="text-muted small mb-3">{emptyState.desc}</p>
              {/* ปุ่มที่แสดงเมื่อไม่มีงาน แตกต่างกันตามสถานการณ์ */}
              {isSearchNoMatch ? (
                <Button variant="outline-primary" size="sm" onClick={() => setSearchTerm('')}>
                  ล้างคำค้นหา
                </Button>
              ) : activeFilter === 'all' ? (
                <Button as={Link} to="/tasks" variant="outline-primary" size="sm">
                  ไปยังหน้าตารางงาน
                </Button>
              ) : (
                <Button variant="outline-primary" size="sm" onClick={() => setActiveFilter('all')}>
                  แสดงงานทั้งหมด
                </Button>
              )}
            </div>
          ) : (
            <div className="unfinished-tasks-scroll">
              {/* ========== มุมมองตาราง (เดสก์ท็อป ≥1200px) ========== */}
              <Table
                hover
                aria-label="ตารางงานที่ยังไม่เสร็จ"
                className="align-middle mb-0 task-table unfinished-tasks-table d-none d-xl-table"
              >
                <thead className="table-header">
                  <tr>
                    <th style={{ minWidth: 240 }}>ชื่องาน / โปรเจกต์</th>
                    <th style={{ width: 128 }}>กำหนดส่ง</th>
                    <th style={{ width: 136 }}>สถานะ</th>
                    <th style={{ width: 112 }}>ความคืบหน้า</th>
                    <th style={{ width: 52 }} className="text-center">ดูงาน</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTasks.map((task) => {
                    const dueInfo = getDueDateInfo(task, today);
                    const dueKind = dueInfo.kind;
                    return (
                      <tr key={task.id} className={`task-row ${dueKind === 'overdue' ? 'task-row-overdue' : dueKind === 'today' ? 'task-row-today' : dueKind === 'soon' ? 'task-row-soon' : 'task-row-normal'}`}>
                        {/* คอลัมน์ที่ 1: ชื่องาน โปรเจกต์ ผู้รับผิดชอบ ประเภท — เรียงแนวตั้งในคอลัมน์เดียว
                            เพื่อไม่ให้ตารางกว้างเกินขนาดการ์ด */}
                        <td>{renderTaskTitleBlock(task, { showDescription: true })}</td>

                        {/* คอลัมน์ที่ 2: กำหนดส่ง — ข้อความสัมพันธ์ด้านบน + วันที่จริงด้านล่าง */}
                        <td>{renderDueDate(dueInfo)}</td>

                        {/* คอลัมน์ที่ 3: สถานะ — แสดงเป็น pill สีตามสถานะ
                            สถานะที่ไม่รู้จักจะแสดงเป็นสีเทาและใช้ statusLabel หรือรหัสเดิม */}
                        <td>{renderStatusBadge(task.status, task.statusLabel)}</td>

                        {/* คอลัมน์ที่ 4: ความคืบหน้า — แสดงเป็นแถบ progress พร้อมตัวเลขเปอร์เซ็นต์ */}
                        <td>{renderProgress(task.progress)}</td>

                        {/* คอลัมน์ที่ 5: ปุ่มดูงาน — คลิกเพื่อเปิดมอดัลรายละเอียดงาน */}
                        <td className="text-center task-cell-action">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="btn-action-view btn-icon"
                            onClick={() => setSelectedTask(task)}
                            title="ดูรายละเอียดงาน"
                            aria-label={`ดูรายละเอียดงาน: ${task.title}`}
                          >
                            <Eye size={14} />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>

              {/* ========== มุมมองการ์ดย่อย (มือถือ/แท็บเล็ต <1200px) ========== */}
              {/* ข้อมูลชุดเดียวกับตาราง แต่บนจอแคบใช้การ์ดงานแยกกันแทนการบีบตาราง */}
              <div className="d-xl-none unfinished-task-cards">
                {visibleTasks.map((task) => {
                  const dueInfo = getDueDateInfo(task, today);
                  const dueKind = dueInfo.kind;
                  return (
                    <div key={task.id} className={`task-card ${dueKind === 'overdue' ? 'task-card-overdue' : dueKind === 'today' ? 'task-card-today' : dueKind === 'soon' ? 'task-card-soon' : 'task-card-normal'}`}>
                      {renderTaskTitleBlock(task)}
                      <div className="task-card-due">{renderDueDate(dueInfo)}</div>
                      <div className="d-flex flex-wrap align-items-center gap-1">
                        {renderStatusBadge(task.status, task.statusLabel)}
                      </div>
                      <div className="task-card-progress">{renderProgress(task.progress)}</div>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="task-card-view-btn"
                        onClick={() => setSelectedTask(task)}
                      >
                        <Eye size={14} className="me-1" />
                        <span>ดูงาน</span>
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* ========== มอดัลรายละเอียดงาน ========== */}
      {selectedTask && (
        <Modal
          show
          centered
          className="mecha-detail-modal"
          onHide={() => setSelectedTask(null)}
        >
          <Modal.Header closeButton className="border-bottom">
            <Modal.Title className="h5 fw-bold text-ink">รายละเอียดงาน</Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            {/* ชื่องาน พร้อมป้าย "ด่วนมาก" ถ้ามีระดับความสำคัญเป็น urgent */}
            <div className="mb-3">
              <span className="small text-muted d-block mb-1">ชื่องาน</span>
              <div className="d-flex align-items-start gap-2 flex-wrap">
                <h5 className="fw-semibold text-ink mb-0">{selectedTask.title}</h5>
                {selectedTask.priority === 'urgent' && <span className="task-urgent-badge">ด่วนมาก</span>}
              </div>
            </div>

            {/* โปรเจกต์ต้นสังกัด */}
            <div className="mb-3">
              <span className="small text-muted d-block mb-1">โปรเจกต์ต้นสังกัด</span>
              <div className="d-flex align-items-center gap-2 fw-medium text-ink">
                <Folder size={16} className="text-primary" />
                <span>{selectedTask.projectName || 'ไม่ระบุโปรเจกต์'}</span>
              </div>
            </div>

            {/* แถวสองคอลัมน์: ประเภทงาน และ สถานะปัจจุบัน */}
            <div className="row g-3 mb-3">
              <div className="col-6">
                <span className="small text-muted d-block mb-1">ประเภทงาน</span>
                {renderCategoryBadge(selectedTask.category)}
              </div>
              <div className="col-6">
                <span className="small text-muted d-block mb-1">สถานะปัจจุบัน</span>
                {renderStatusBadge(selectedTask.status, selectedTask.statusLabel)}
              </div>
            </div>

            {/* แถวสองคอลัมน์: ผู้รับผิดชอบ และ หัวหน้าผู้มอบหมาย */}
            <div className="row g-3 mb-3">
              <div className="col-6">
                <span className="small text-muted d-block mb-1">ผู้รับผิดชอบ</span>
                <div className="d-flex align-items-center gap-1 text-ink small">
                  <UserRound size={14} className="text-muted" />
                  <span>{getAssigneeName(selectedTask)}</span>
                </div>
              </div>
              <div className="col-6">
                <span className="small text-muted d-block mb-1">หัวหน้าผู้มอบหมาย</span>
                <div className="d-flex align-items-center gap-1 text-ink small">
                  <UserRound size={14} className="text-muted" />
                  <span>{selectedTask.supervisor || 'ไม่ระบุ'}</span>
                </div>
              </div>
            </div>

            {/* แถวสองคอลัมน์: ระดับความสำคัญ และ วันที่เริ่ม */}
            <div className="row g-3 mb-3">
              <div className="col-6">
                <span className="small text-muted d-block mb-1">ระดับความสำคัญ</span>
                {renderPriorityBadge(selectedTask.priority)}
              </div>
              <div className="col-6">
                <span className="small text-muted d-block mb-1">วันที่เริ่ม</span>
                <span className="small text-ink d-inline-flex align-items-center gap-1">
                  <CalendarDays size={13} />
                  {selectedTask.startDate ? selectedTask.startDate.replace(/-/g, '/') : 'ไม่ระบุ'}
                </span>
              </div>
            </div>

            {/* กำหนดส่ง — แสดงข้อความสัมพันธ์และวันที่จริง */}
            <div className="mb-3">
              <span className="small text-muted d-block mb-1">กำหนดส่ง</span>
              {renderDueDate(getDueDateInfo(selectedTask, today))}
            </div>

            {/* แถบความคืบหน้า — รูปแบบเดียวกับ detail ฝั่ง Tasks (Phase C) · renderProgress ของตารางคงเดิม */}
            <div className="mb-2">
              <div className="d-flex justify-content-between mb-1">
                <span className="small text-muted">ความคืบหน้า</span>
                <span className="small fw-semibold">{normalizeProgress(selectedTask.progress)}%</span>
              </div>
              <ProgressBar
                now={normalizeProgress(selectedTask.progress)}
                variant={getProgressVariant(normalizeProgress(selectedTask.progress))}
                className="task-progress-bar"
              />
            </div>

            {/* รายละเอียดและคำอธิบายงาน */}
            <div className="mb-2 mt-3">
              <span className="small text-muted d-block mb-1">รายละเอียดและคำอธิบาย</span>
              <div className="p-3 bg-light rounded small text-ink" style={{ lineHeight: 1.6 }}>
                {selectedTask.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer className="border-top">
            {/* ปุ่มปิดมอดัล */}
            <Button variant="outline-secondary" onClick={() => setSelectedTask(null)}>
              ปิดหน้าต่าง
            </Button>
            {/* ปุ่มไปยังหน้าตารางงาน (/tasks) */}
            {/* /tasks คือหน้ารวมงาน (List + Kanban) — ชื่อปุ่มอธิบายปลายทางจริง ไม่อ้าง "โปรเจกต์" */}
            <Button as={Link} to="/tasks" variant="primary" onClick={() => setSelectedTask(null)}>
              ไปยังหน้าตารางงาน
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </>
  );
}
