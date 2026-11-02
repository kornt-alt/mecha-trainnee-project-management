// frontend/src/components/dashboard/UnfinishedTasks.js — การ์ดงานที่ยังไม่เสร็จ (Unfinished Tasks)
// แท็บกรอง (สถานะ + เลยกำหนด + ครบกำหนดใน 7 วัน) พร้อมเลขจำนวนของแต่ละแท็บ · ช่องค้นหา ·
// ตารางหัวคอลัมน์ sticky บนจอกว้าง (≥1200px) · การ์ดงานย่อยบนแท็บเล็ต/มือถือ (<1200px) — ใช้ scroll container เดียวกัน
import React, { useMemo, useState } from 'react';
import { Badge, Button, Card, Form, Modal, Nav, ProgressBar, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  CalendarDays,
  CircleCheck,
  ClipboardList,
  Eye,
  Folder,
  Search,
  UserRound,
} from '../common/Icons';
import { MOCK_EMPLOYEES } from '../../data/mockData';

/* ── วันที่ — ใช้ปฏิทินท้องถิ่นทั้งหมด ไม่แปลง UTC (กันคลาดวันตอนเช้า) ───────── */

const pad2 = (value) => String(value).padStart(2, '0');

// วันนี้ตามเวลาเครื่อง (YYYY-MM-DD)
function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// YYYY-MM-DD → Date ท้องถิ่น (จงใจไม่ใช้ new Date(สตริง) เพราะ ISO string จะถูกตีความเป็น UTC)
function parseLocalDate(isoDate) {
  const [y, m, d] = (isoDate || '').split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

// คำนวนวันที่ท้องถิ่น + n วัน แล้วแปลงกลับเป็น YYYY-MM-DD
function addDaysIso(isoDate, days) {
  const d = parseLocalDate(isoDate);
  if (!d) return '';
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// ผลต่างวัน (endDate − startDate) เป็นจำนวนวันเต็ม วัดจากปฏิทิน
function diffLocalDays(startDate, endDate) {
  const a = parseLocalDate(startDate);
  const b = parseLocalDate(endDate);
  if (!a || !b) return null;
  return Math.round((b - a) / 86400000);
}

/* ── จำแนกความเร่งด่วนของกำหนดส่ง — filter/count/สีแถว ทุกจุดใช้ตัวจำแนกตัวเดียวกัน ── */

// overdue = กำหนดส่งก่อนวันนี้ · today = ครบวันนี้ · soon = ยังไม่ถึง · null = ไม่มีวันที่
function classifyDueDate(dueDate, todayStr) {
  const key = (dueDate || '').slice(0, 10);
  if (!key) return null;
  if (key < todayStr) return 'overdue';
  if (key === todayStr) return 'today';
  return 'soon';
}

// เลยกำหนด = กำหนดส่งก่อนวันนี้ และงานยังไม่เสร็จ (งานเสร็จแล้วไม่นับเป็นงานเลยกำหนด)
function isOverdueTask(task, todayStr) {
  return task.status !== 'completed' && classifyDueDate(task.dueDate, todayStr) === 'overdue';
}

// ครบกำหนดใน 7 วัน = ยังไม่เสร็จ + กำหนดส่งอยู่ช่วง "วันนี้" ถึง "วันนี้+7" (รวมวันนี้ — ขอบเขตเดียวกับ "ใกล้กำหนดส่ง" ใน Home.js)
function isDueSoonTask(task, todayStr, dueSoonLimit) {
  if (task.status === 'completed' || !task.dueDate) return false;
  if (classifyDueDate(task.dueDate, todayStr) === 'overdue') return false;
  return task.dueDate.slice(0, 10) <= dueSoonLimit;
}

/* ── แท็บกรอง + ข้อความว่างแยกตามแท็บ ───────────────────────────────────── */

const FILTER_TABS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'in_progress', label: 'กำลังทำ' },
  { key: 'pending_review', label: 'รอการตรวจสอบ' },
  { key: 'not_started', label: 'รอเริ่มทำ' },
  { key: 'overdue', label: 'เลยกำหนด' },
  { key: 'due_soon', label: 'ครบกำหนดใน 7 วัน' },
];

// เงื่อนไขกรองเดียวกันทั้งการ "นับเลขแท็บ" และ "กรองรายการที่โชว์" เพื่อให้เลขบนแท็บตรงกับของจริงเสมอ
// งาน completed ถูกข้ามทุกแท็บ — การ์ดนี้แสดงเฉพาะงานที่ยังไม่เสร็จ
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

// ข้อความ empty state แยกต่อแท็บ — ห้ามสรุปว่า "งานเสร็จหมดแล้ว" เมื่อเป็นแค่แท็บที่เลือกซึ่งยังไม่มีงาน
const EMPTY_STATE_BY_FILTER = {
  all: { title: 'ไม่มีงานที่ยังไม่เสร็จ', desc: 'ยอดเยี่ยมมาก งานที่ได้รับมอบหมายทั้งหมดเสร็จสมบูรณ์แล้ว', icon: 'done' },
  in_progress: { title: 'ไม่มีงานที่กำลังดำเนินการ', desc: 'ยังไม่มีงานในสถานะกำลังดำเนินการขณะนี้', icon: 'tasks' },
  pending_review: { title: 'ไม่มีงานที่รอตรวจสอบ', desc: 'ยังไม่มีงานที่ส่งเข้าเป็นรอการตรวจสอบขณะนี้', icon: 'tasks' },
  not_started: { title: 'ไม่มีงานที่ยังไม่เริ่ม', desc: 'ยังไม่มีงานในสถานะรอเริ่มทำขณะนี้', icon: 'tasks' },
  overdue: { title: 'ไม่มีงานที่เลยกำหนด', desc: 'ยินดีด้วย รายการนี้ไม่มีงานข้ามกำหนดส่ง', icon: 'tasks' },
  due_soon: { title: 'ไม่มีงานที่ครบกำหนดภายใน 7 วัน', desc: 'ยังไม่มีงานที่จะครบกำหนดส่งภายใน 7 วันข้างหน้า', icon: 'tasks' },
};

/* ── ผู้รับผิดชอบ — ค้นจาก Map ล่วงหน้า ไม่วน .find() บน array พนักงานทุกแถว ── */

const EMPLOYEE_NAME_BY_ID = new Map(MOCK_EMPLOYEES.map((e) => [e.id, e.name]));

// ชื่อสำรองเมื่อ assigneeId หายหรือไม่ตรงกับข้อมูลพนักงาน — ทุกจุดที่แสดงผลใช้ข้อความเดียวกัน
const ASSIGNEE_FALLBACK_LABEL = 'ไม่ระบุผู้รับผิดชอบ';

function getAssigneeName(task) {
  return EMPLOYEE_NAME_BY_ID.get(task && task.assigneeId) || ASSIGNEE_FALLBACK_LABEL;
}

/* ── ความคืบหน้า — กันค่าผิดปกติ และใช้ตัวคำนวณเดียวกันทั้งตาราง/การ์ด/โมดัล ── */

// คืน % ในช่วง 0-100: ค่า null/undefined/ติดลบ/เกิน 100 จะไม่ทำ ProgressBar พัง
function normalizeProgress(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

// สีแท่งชุดเดิมของ Dashboard: 100=เขียว · >50=น้ำเงิน · ≤50=amber (ใช้เดียวกันทุกจุด)
function getProgressVariant(progress) {
  return progress >= 100 ? 'success' : progress > 50 ? 'primary' : 'warning';
}

/* ── ป้ายสถานะ / ประเภท / ความสำคัญ / กำหนดส่ง ─────────────────────────── */

// สถานะงาน — ป้ายและสีตรงกับ statusLabel ของ mockData รวมถึงตารางในหน้า Tasks.js
const STATUS_INFO = {
  in_progress: { label: 'กำลังดำเนินการ', pillClass: 'status-pill-blue' },
  pending_review: { label: 'รอการตรวจสอบ', pillClass: 'status-pill-orange' },
  not_started: { label: 'รอเริ่มทำ', pillClass: 'status-pill-gray' },
  completed: { label: 'เสร็จสิ้น', pillClass: 'status-pill-green' },
};

// ป้ายความสำคัญเดียวกับ renderPriorityBadge ของหน้า Tasks.js — ป้องกันการเรียกชื่อไม่ตรงกันข้ามหน้าจอ
const PRIORITY_LABELS = { urgent: 'ด่วนมาก', high: 'สูง', normal: 'ปกติ', low: 'ต่ำ' };
const PRIORITY_BADGE_BG = { urgent: 'danger', high: 'warning', normal: 'primary', low: 'secondary' };

const CATEGORY_PILL_CLASS = {
  Frontend: 'category-frontend',
  Backend: 'category-backend',
  Testing: 'category-testing',
  Documentation: 'category-doc',
  Design: 'category-design',
};

const DUE_DATE_KIND_CLASS = {
  overdue: 'due-date-overdue',
  today: 'due-date-today',
  soon: 'due-date-soon',
  later: 'due-date-later',
  done: 'due-date-later',
  none: 'due-date-none',
};

function renderStatusBadge(status, fallbackLabel) {
  const info = STATUS_INFO[status];
  const text = (info && info.label) || fallbackLabel || status || 'ไม่ทราบสถานะ';
  return <span className={`status-pill ${info ? info.pillClass : 'status-pill-gray'}`}>{text}</span>;
}

function renderCategoryBadge(category) {
  return (
    <span className={`category-pill ${CATEGORY_PILL_CLASS[category] || 'category-default'}`}>
      {category || 'ไม่ระบุ'}
    </span>
  );
}

function renderPriorityBadge(priority) {
  const label = PRIORITY_LABELS[priority] || priority || 'ปกติ';
  return <Badge bg={PRIORITY_BADGE_BG[priority] || 'secondary'}>{label}</Badge>;
}

// กำหนดส่งด้วยข้อความสัมพันธ์ที่อ่านเข้าใจง่าย (แสดงหลัก) ส่วนวันที่จริงเป็นข้อมูลรองด้านล่างและ tooltip
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

// บล็อกชื่องาน — ใช้ร่วมระหว่างตารางกับการ์ดย่อย เพื่อให้ข้อมูลหลักของงานมีโครงสร้างเดียวกันทุกมุมมอง
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

function renderProgress(progress) {
  const percent = normalizeProgress(progress);
  return (
    <div className="task-progress-cell d-flex align-items-center gap-2">
      <ProgressBar now={percent} variant={getProgressVariant(percent)} className="task-progress-bar" />
      <span className="task-progress-value text-muted">{percent}%</span>
    </div>
  );
}

export default function UnfinishedTasks({ tasks = [] }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);

  const today = getTodayString();
  // เส้นตายของแท็บ "ครบกำหนดใน 7 วัน" = วันนี้ (local) + 7 วัน โดยเดียวกับ "ใกล้กำหนดส่ง" ใน welcome banner
  const dueSoonLimit = addDaysIso(today, 7);

  const trimmedSearch = searchTerm.trim().toLowerCase();

  // เลขบนแท็บกรอง — นับจากชุดข้อมูลจริงทั้งชุด ไม่ขึ้นกับคำค้นหา เพื่อให้เลขแท็บหมายถึง "จำนวนงานในเงื่อนไขนี้" ตลอดเวลา
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

  // รายการที่โชว์: กรองแท็บ → ค้นหา (ชื่องาน/โปรเจกต์/รายละเอียด/ผู้รับผิดชอบ แบบ case-insensitive) → เรียงงานเลยกำหนดก่อน แล้วตามวันส่งใกล้สุด
  // เรียงบนสำเนาเสมอ — ข้อมูลต้นทางที่ส่งเข้า prop tasks ต้องไม่ถูกแก้ไข
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

  const isSearchNoMatch = trimmedSearch !== '' && visibleTasks.length === 0;
  // แท็บเก่าโชว์ประโยค "งานทั้งหมดเสร็จสมบูรณ์แล้ว" ทุกกรณี ซึ่งผิดความจริงเมื่อเป็นแค่สถานะ/ช่วงวันที่เลือกไม่มีงาน
  const emptyState = isSearchNoMatch
    ? {
        title: 'ไม่พบงานที่ตรงกับคำค้นหา',
        desc: `ไม่มีงานที่ตรงกับ "${searchTerm.trim()}" ในแท็บที่เลือก ลองใช้คำค้นอื่นหรือล้างคำค้นหา`,
        icon: 'search',
      }
    : EMPTY_STATE_BY_FILTER[activeFilter] || EMPTY_STATE_BY_FILTER.all;

  return (
    <>
      <Card className="border-0 shadow-sm unfinished-tasks-card mb-4">
        <Card.Header className="bg-white border-bottom py-3 px-3 px-md-4">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div className="d-flex align-items-center gap-2">
              <h2 className="section-title mb-0">งานที่ยังไม่เสร็จ (Unfinished Tasks)</h2>
              {/* ยอดรวมของการ์ด (ทั้งหมดที่ยังไม่เสร็จ) — ตัวเลขบนแท็บกรองอยู่ใน Nav ด้านล่าง */}
              <Badge bg="primary" className="rounded-pill px-2 py-1">
                {filterCounts.all} รายการ
              </Badge>
            </div>

            <div className="d-flex align-items-center gap-2">
              {/* /tasks คือหน้ารวมงานทั้งหมด (List + Kanban) ตรงกับคำว่า "ดูทั้งหมด" — เดิมชี้ /projects ซึ่งเป็นหน้าโปรเจกต์ไม่ใช่งาน */}
              <Link to="/tasks" className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1">
                <span>ดูทั้งหมด</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>

          {/* ช่องค้นหาครอบคลุมชื่องาน ชื่อโปรเจกต์ รายละเอียด และชื่อผู้รับผิดชอบ — ไม่สนตัวพิมพ์และตัดช่องว่างหัวท้าย */}
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
            {searchTerm && (
              <button
                type="button"
                className="task-search-clear btn-close"
                aria-label="ล้างคำค้นหา"
                onClick={() => setSearchTerm('')}
              />
            )}
          </div>

          {/* Filter Bar — เลขต่อท้ายชื่อแท็บนับจาก filterCounts เสมอ (ห้าม hardcode ตัวเลข) */}
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

        <Card.Body className="p-0">
          {visibleTasks.length === 0 ? (
            /* Empty state — ไอคอนช่วยบอกบริบทของแท็บที่ว่าง · ประโยค "เสร็จหมดแล้ว" ใช้ได้เฉพาะแท็บ all */
            <div className="unfinished-tasks-empty text-center px-3">
              <div className="empty-state-icon mx-auto mb-2 text-muted">
                {emptyState.icon === 'search' && <Search size={36} color="var(--muted)" />}
                {emptyState.icon === 'done' && <CircleCheck size={36} color="var(--green)" />}
                {emptyState.icon === 'tasks' && <ClipboardList size={36} color="var(--muted)" />}
              </div>
              <h6 className="fw-semibold text-ink">{emptyState.title}</h6>
              <p className="text-muted small mb-3">{emptyState.desc}</p>
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
            /* ส่วนเลื่อนเดียวสำหรับทั้งสองมุมมอง — sticky header ผูกกับ scroll container นี้ และทำงานร่วมกับเลื่อนแนวนอนได้ */
            <div className="unfinished-tasks-scroll">
              {/* มุมมองตาราง (จอเดสก์ท็อป ≥1200px กว้างพอสำหรับ 5 คอลัมน์) */}
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
                    const isOverdue = dueInfo.kind === 'overdue';
                    return (
                      <tr key={task.id} className={`task-row ${isOverdue ? 'task-row-overdue' : ''}`}>
                        {/* ชื่องาน/โปรเจกต์/ผู้รับผิดชอบ/ประเภท — stack แนวตั้งในคอลัมน์เดียว ไม่ทำตารางกว้างเกินการ์ด */}
                        <td>{renderTaskTitleBlock(task, { showDescription: true })}</td>

                        {/* กำหนดส่ง: ข้อความสัมพันธ์ด้านบน + วันที่จริงด้านล่าง (tooltip: กำหนดส่ง + ข้อความสัมพันธ์) */}
                        <td>{renderDueDate(dueInfo)}</td>

                        {/* สถานะ — สถานะที่ไม่รู้จักแสดงด้วย pill เทา + statusLabel หรือรหัสเดิม ไม่ทำแอปพัง */}
                        <td>{renderStatusBadge(task.status, task.statusLabel)}</td>

                        {/* ความคืบหน้า — normalize กันค่า null/ติดลบ/เกิน 100 */}
                        <td>{renderProgress(task.progress)}</td>

                        {/* ดูงาน — หัวคอลัมน์ "ดูงาน" ตรงกับการกระทำเดียว แทน "จัดการ" ที่วงกว้างเกินความจริง */}
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

              {/* มุมมองการ์ดย่อย (<1200px) — ข้อมูลชุดเดียวกับตาราง แต่บนจอแคบใช้การ์ดงานแทนการบีบตาราง */}
              <div className="d-xl-none unfinished-task-cards">
                {visibleTasks.map((task) => {
                  const dueInfo = getDueDateInfo(task, today);
                  const isOverdue = dueInfo.kind === 'overdue';
                  return (
                    <div key={task.id} className={`task-card ${isOverdue ? 'task-card-overdue' : ''}`}>
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

      {/* Modal รายละเอียดงาน — เพิ่มผู้รับผิดชอบ/ระดับความสำคัญ/วันที่เริ่ม/กำหนดส่งแบบสัมพันธ์ + เปิด scrollable บนจอเล็ก */}
      {selectedTask && (
        <Modal
          show
          centered
          dialogClassName="modal-dialog-scrollable"
          onHide={() => setSelectedTask(null)}
        >
          <Modal.Header closeButton className="border-bottom">
            <Modal.Title className="h5 fw-bold text-ink">รายละเอียดงาน</Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            <div className="mb-3">
              <span className="small text-muted d-block mb-1">ชื่องาน</span>
              <div className="d-flex align-items-start gap-2 flex-wrap">
                <h5 className="fw-semibold text-ink mb-0">{selectedTask.title}</h5>
                {selectedTask.priority === 'urgent' && <span className="task-urgent-badge">ด่วนมาก</span>}
              </div>
            </div>

            <div className="mb-3">
              <span className="small text-muted d-block mb-1">โปรเจกต์ต้นสังกัด</span>
              <div className="d-flex align-items-center gap-2 fw-medium text-ink">
                <Folder size={16} className="text-primary" />
                <span>{selectedTask.projectName || 'ไม่ระบุโปรเจกต์'}</span>
              </div>
            </div>

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

            <div className="mb-3">
              <span className="small text-muted d-block mb-1">กำหนดส่ง</span>
              {renderDueDate(getDueDateInfo(selectedTask, today))}
            </div>

            {renderProgress(selectedTask.progress)}

            <div className="mb-2 mt-3">
              <span className="small text-muted d-block mb-1">รายละเอียดและคำอธิบาย</span>
              <div className="p-3 bg-light rounded small text-ink" style={{ lineHeight: 1.6 }}>
                {selectedTask.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer className="border-top">
            <Button variant="outline-secondary" size="sm" onClick={() => setSelectedTask(null)}>
              ปิดหน้าต่าง
            </Button>
            {/* /tasks คือหน้ารวมงาน (List + Kanban) — ชื่อปุ่มอธิบายปลายทางจริง ไม่อ้าง "โปรเจกต์" */}
            <Button as={Link} to="/tasks" variant="primary" size="sm" onClick={() => setSelectedTask(null)}>
              ไปยังหน้าตารางงาน
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </>
  );
}
