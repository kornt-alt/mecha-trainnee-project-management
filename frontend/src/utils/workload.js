// frontend/src/utils/workload.js — วัดภาระงานต่อคนเป็น "แต้ม" ตามขนาดงานที่ยังเหลือ (ไม่ต้องกรอกชั่วโมง)
//
// ใช้ที่: หน้า Workload, กล่องหน้าหลัก (dashboard/EmployeeWorkloadChart.js), หน้ารายงาน (reports/ExecutiveOverview.js)
// ทำไมไม่นับจำนวนงาน: งานไม่ได้หนักเท่ากัน — งานใหญ่ 1 งานหนักกว่างานเล็ก 5 งาน จึงคิดแต้มตาม task.size
// ทำไมเทียบค่ากลางทีม: ไม่มีชั่วโมงจึงไม่รู้ว่าแต่ละคน "เต็ม" ที่เท่าไร — เทียบกันเองในชุดที่ดูอยู่แฟร์กว่าเลขตายตัว
// เกณฑ์ทั้งหมดอยู่ใน WORKLOAD_RULES ที่เดียว — อยากปรับความเข้มให้แก้ตรงนี้
import { checklistProgressPercent } from './projectTrackingUtils';

export const TASK_SIZE_POINTS = { small: 1, medium: 3, large: 8 };

export const WORKLOAD_RULES = {
  over: { ratio: 2, minPoints: 8, overduePoints: 8 },     // ≥ 2 เท่าค่ากลาง และ ≥ 8 แต้ม · หรือเลยกำหนดรวม ≥ 8 แต้ม
  heavy: { ratio: 1.5, minPoints: 5, dueSoonPoints: 8 },   // ≥ 1.5 เท่าค่ากลาง และ ≥ 5 แต้ม · หรือมีงานเลยกำหนด · หรือส่งใน 7 วันรวม ≥ 8 แต้ม
  dueWindowDays: 7,
  helpingWeight: 0.5,   // งานที่ร่วมทำ นับครึ่ง
  reviewWeight: 0.25,   // งานที่รอเขาตรวจ นับ ¼ ของแต้มขนาด
};

export const WORKLOAD_ORDER = { over: 0, heavy: 1, normal: 2, free: 3 };

const localISO = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const round1 = (value) => Math.round(value * 10) / 10;
const PRIORITY_RANK = { urgent: 0, high: 1, medium: 2, normal: 2, low: 3, none: 4 };

export const sizePoints = (task) => TASK_SIZE_POINTS[task?.size] ?? TASK_SIZE_POINTS.medium;
// แต้มที่ยังเหลือของงาน = แต้มขนาด × ส่วนของเช็กลิสต์ที่ยังไม่ติ๊ก (ไม่มีเช็กลิสต์ = เต็มแต้ม)
export const remainingPoints = (task) => round1(sizePoints(task) * (1 - checklistProgressPercent(task?.checklist) / 100));

const median = (values) => {
  const sorted = values.filter((value) => value > 0).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

// งานของคนหนึ่ง เรียงจากเร่งสุด: เลยกำหนด → ใกล้ส่ง → ความสำคัญ → วันส่ง
export function sortByUrgency(tasks, now = new Date()) {
  const today = localISO(now);
  const limit = new Date(now);
  limit.setDate(limit.getDate() + WORKLOAD_RULES.dueWindowDays);
  const weekLimit = localISO(limit);
  const urgency = (task) => (task.dueDate && task.dueDate < today ? 0 : task.dueDate && task.dueDate <= weekLimit ? 1 : 2);
  return [...tasks].sort((a, b) => urgency(a) - urgency(b)
    || (PRIORITY_RANK[a.priority] ?? 4) - (PRIORITY_RANK[b.priority] ?? 4)
    || String(a.dueDate || '9999').localeCompare(String(b.dueDate || '9999')));
}

// คืน { rows, median } — rows = [{ employee, level, reasons, points, ratio, open, helping, toReview, overdue, dueThisWeek, blocked, tasks: [{ ...task, role, points }] }]
// เรียงหนักสุดก่อน · projectId (ไม่บังคับ) = นับเฉพาะงานของโปรเจกต์นั้น · ค่ากลางคิดจากคนที่ส่งเข้ามา (กรองทีมก่อนส่ง = เทียบในทีม)
export function memberWorkloadSummary(employees = [], tasks = [], { now = new Date(), projectId = null } = {}) {
  const today = localISO(now);
  const limit = new Date(now);
  limit.setDate(limit.getDate() + WORKLOAD_RULES.dueWindowDays);
  const weekLimit = localISO(limit);
  const openTasks = tasks.filter((task) => task.status !== 'completed'
    && (projectId === null || projectId === 'all' || String(task.projectId) === String(projectId)));

  const base = employees.map((employee) => {
    const id = String(employee.id);
    const items = [];
    openTasks.forEach((task) => {
      const isAssignee = String(task.assigneeId) === id;
      const isHelper = !isAssignee && (task.collaborators || []).some((c) => String(c) === id);
      const isReviewer = task.status === 'pending_review' && String(task.reviewerId) === id && !isAssignee;
      if (isReviewer) items.push({ ...task, role: 'review', points: round1(sizePoints(task) * WORKLOAD_RULES.reviewWeight) });
      else if (task.status === 'pending_review') return; // ส่งตรวจแล้ว — ผู้ทำไม่ต้องทำอะไรต่อจนกว่าจะถูกส่งกลับ
      else if (isAssignee) items.push({ ...task, role: 'owner', points: remainingPoints(task) });
      else if (isHelper) items.push({ ...task, role: 'helper', points: round1(remainingPoints(task) * WORKLOAD_RULES.helpingWeight) });
    });
    const working = items.filter((item) => item.role !== 'review');
    const overdueItems = working.filter((item) => item.dueDate && item.dueDate < today);
    const dueSoonItems = working.filter((item) => item.dueDate && item.dueDate >= today && item.dueDate <= weekLimit);
    const sum = (list) => round1(list.reduce((total, item) => total + item.points, 0));
    return {
      employee,
      points: sum(items),
      overduePoints: sum(overdueItems),
      dueSoonPoints: sum(dueSoonItems),
      open: working.filter((item) => item.role === 'owner').length,
      helping: working.filter((item) => item.role === 'helper').length,
      toReview: items.filter((item) => item.role === 'review').length,
      overdue: overdueItems.length,
      overdueLarge: overdueItems.filter((item) => item.size === 'large').length,
      dueThisWeek: dueSoonItems.length,
      blocked: working.filter((item) => item.blocked).length,
      tasks: sortByUrgency(items, now),
    };
  });

  const teamMedian = round1(median(base.map((row) => row.points)));
  const { over, heavy } = WORKLOAD_RULES;
  const rows = base.map((row) => {
    const ratio = teamMedian > 0 ? round1(row.points / teamMedian) : null;
    const vsTeam = ratio !== null ? `ภาระ ${row.points} แต้ม = ${ratio.toFixed(1)} เท่าของค่ากลาง (${teamMedian})` : `ภาระ ${row.points} แต้ม`;
    const overdueText = `เลยกำหนด ${row.overdue} งาน (${row.overduePoints} แต้ม)`;
    const overReasons = [
      ratio !== null && ratio >= over.ratio && row.points >= over.minPoints && vsTeam,
      row.overduePoints >= over.overduePoints && overdueText,
    ].filter(Boolean);
    const heavyReasons = [
      ratio !== null && ratio >= heavy.ratio && row.points >= heavy.minPoints && vsTeam,
      row.overdue > 0 && overdueText,
      row.dueSoonPoints >= heavy.dueSoonPoints && `ต้องส่งใน 7 วัน ${row.dueSoonPoints} แต้ม`,
    ].filter(Boolean);
    let level = 'normal';
    let reasons = [vsTeam];
    if (overReasons.length) { level = 'over'; reasons = overReasons; }
    else if (heavyReasons.length) { level = 'heavy'; reasons = heavyReasons; }
    else if (row.points === 0) { level = 'free'; reasons = ['ไม่มีงานเหลือ']; }
    return { ...row, ratio, level, reasons };
  }).sort((a, b) => WORKLOAD_ORDER[a.level] - WORKLOAD_ORDER[b.level] || b.points - a.points
    || String(a.employee.name).localeCompare(String(b.employee.name)));

  return { rows, median: teamMedian };
}

// ทางลัดเมื่อต้องการแค่ rows
export const memberWorkload = (employees, tasks, options) => memberWorkloadSummary(employees, tasks, options).rows;
