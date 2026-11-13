// frontend/src/utils/projectTrackingUtils.js — Helper คำนวณลำดับความสำคัญ, สถิติ Milestone, และความล่าช้าของโปรเจกต์
// ใช้ร่วมกันระหว่าง ProjectsTrackingTable และ ProjectCard เพื่อให้ข้อมูลและตรรกะตรงกัน 100%
import { MOCK_EMPLOYEES } from '../data/mockData';

// วันนี้ตามเวลาเครื่อง (YYYY-MM-DD)
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// แสดงวันที่เป็น yyyy/mm/dd — รูปแบบเดิมของแอป
export const ymd = (v) => (v ? v.replace(/-/g, '/') : '-');

// ล่าช้า = ยังไม่เสร็จ/ยกเลิก พร้อมเลยกำหนดแล้ว — เฉพาะการแสดงผล (คงสถานะ mock ต้นทางเดิม)
export const isDelayed = (p) => {
  const t = today();
  return !['done', 'cancelled'].includes(p.status) && p.dueDate && p.dueDate < t;
};

// ผู้รับผิดชอบ: ตรวจสอบจาก managerId ก่อน หากไม่พบตรวจสอบชื่อจาก owner เดิม (รองรับกรณีข้อมูล legacy / unmatched)
export const ownerOf = (p) => {
  if (p.managerId) {
    const found = MOCK_EMPLOYEES.find((e) => e.id === p.managerId || String(e.id) === String(p.managerId));
    if (found) return found;
  }
  if (p.owner) {
    const exact = MOCK_EMPLOYEES.find((e) => e.name === p.owner);
    if (exact) return exact;
  }
  return null;
};

// อักษรย่อจากชื่อ-นามสกุล (2 ตัว)
export const initials = (name) => {
  const parts = String(name || '').trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return String(name || '?').slice(0, 2).toUpperCase();
};

// ลำดับความสำคัญรายโปรเจกต์ = อนุพันธ์จากงานทั้งหมดในโปรเจกต์ (เอาลำดับสูงสุด)
export const RANK = { urgent: 3, high: 2, normal: 1, medium: 1, low: 0 };
export const PRIORITY_BADGES = {
  urgent: { label: 'ด่วนมาก', variant: 'urgent' },
  high: { label: 'สูง', variant: 'high' },
  normal: { label: 'ปกติ (Medium)', variant: 'medium' },
  medium: { label: 'ปกติ (Medium)', variant: 'medium' },
  low: { label: 'ต่ำ', variant: 'low' },
};

// ฟังก์ชัน normalize ระดับความสำคัญ: รองรับทั้ง string, object ที่มี label/value/name/key
export const normalizePriorityKey = (val) => {
  if (!val) return 'low';
  if (typeof val === 'string') {
    const k = val.toLowerCase().trim();
    if (k === 'ด่วนมาก' || k === 'urgent') return 'urgent';
    if (k === 'สูง' || k === 'high') return 'high';
    if (k === 'ปกติ' || k === 'ปานกลาง' || k === 'medium' || k === 'normal') return 'normal';
    if (k === 'ต่ำ' || k === 'low') return 'low';
    return RANK[k] !== undefined ? k : 'low';
  }
  if (typeof val === 'object') {
    return normalizePriorityKey(val.key || val.value || val.variant || val.label || val.name || '');
  }
  return 'low';
};

export const priorityOf = (relatedTasks, project) => {
  // หากไม่มีงานที่ผูก ให้ fallback ตรวจสอบ priority ของ project (ถ้ามี)
  if (!relatedTasks || relatedTasks.length === 0) {
    if (project && project.priority) {
      const norm = normalizePriorityKey(project.priority);
      return PRIORITY_BADGES[norm] || { label: 'ต่ำ', variant: 'low' };
    }
    return { label: '-', variant: 'low' };
  }

  // หา priority สูงสุดในงานทั้งหมดที่เกี่ยวข้อง (ป้องกันกรณี reduce คืน task object)
  const topTask = relatedTasks.reduce((highest, current) => {
    const rCurrent = RANK[normalizePriorityKey(current.priority)] ?? 0;
    const rHighest = RANK[normalizePriorityKey(highest.priority)] ?? 0;
    return rCurrent >= rHighest ? current : highest;
  });

  const topKey = normalizePriorityKey(topTask.priority);
  return PRIORITY_BADGES[topKey] || { label: 'ต่ำ', variant: 'low' };
};

// ความคืบหน้ารายโปรเจกต์: งานที่ผูกอยู่ = ขั้นตอน (steps) — อิง logic รวมเดิมของ MOCK_PROJECTS (เฉลี่ย progress รายงาน)
export const statsFrom = (related, status) => {
  const total = related.length;
  const completed = related.filter((t) => t.status === 'completed').length;
  const progress = total > 0
    ? Math.round(related.reduce((sum, t) => sum + (t.progress || 0), 0) / total)
    : (status === 'done' ? 100 : 0);
  return { total, completed, progress };
};
