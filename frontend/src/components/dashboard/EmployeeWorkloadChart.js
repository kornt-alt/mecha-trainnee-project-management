// frontend/src/components/dashboard/EmployeeWorkloadChart.js
// กราฟแท่งแนวนอน Workload พนักงาน พร้อม capacity/percentage/color thresholds
import React, { useState, useMemo } from 'react';
import { Card, Form, Badge } from 'react-bootstrap';
import { UserRound, Filter } from '../common/Icons';
import { MOCK_EMPLOYEES, MOCK_WORK_ENTRIES } from '../../data/mockData';
import { getEmployeeCapacity, MOCK_PLANNED_WORK_ENTRIES } from '../../data/workloadMockData';

// รอบระยะเวลาที่รองรับ — คำนวณจากวันที่อ้างอิง (reference date) เดียวกัน
const PERIOD_OPTIONS = [
  { key: 'daily',   label: 'รายวัน' },
  { key: 'weekly',  label: 'รายสัปดาห์' },
  { key: 'monthly', label: 'รายเดือน' },
  { key: 'yearly',  label: 'รายปี' },
];

// ── Utilities ──────────────────────────────────────────────────────────────

function toDateString(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// คืนช่วงวันที่ [start, end] ของรอบที่เลือก  (สัปดาห์เริ่มวันจันทร์)
function getPeriodRange(period, referenceDate) {
  const y = referenceDate.getFullYear();
  const m = referenceDate.getMonth();
  const d = referenceDate.getDate();

  if (period === 'daily') {
    return { start: toDateString(referenceDate), end: toDateString(referenceDate) };
  }
  if (period === 'weekly') {
    const dow    = referenceDate.getDay();
    const offset = dow === 0 ? -6 : 1 - dow; // offset ไปวันจันทร์
    const start  = new Date(y, m, d + offset);
    const end    = new Date(y, m, d + offset + 6);
    return { start: toDateString(start), end: toDateString(end) };
  }
  if (period === 'monthly') {
    return {
      start: toDateString(new Date(y, m, 1)),
      end:   toDateString(new Date(y, m + 1, 0)),
    };
  }
  // yearly
  return { start: `${y}-01-01`, end: `${y}-12-31` };
}

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

function formatRangeLabel(period, range) {
  const fmt = (iso) => {
    const [y, mo, da] = iso.split('-').map(Number);
    return `${da} ${THAI_MONTHS_SHORT[mo - 1]} ${y + 543}`;
  };
  if (period === 'daily')                        return fmt(range.start);
  if (period === 'weekly' || period === 'monthly') return `${fmt(range.start)} – ${fmt(range.end)}`;
  return `ปี ${range.start.slice(0, 4)}`;
}

// คืน CSS color ตาม workload %
// 0–49% → green (Low), 50–79% → blue (Moderate), 80–100% → amber (High), >100% → red (Overloaded)
function getWorkloadColor(pct) {
  if (pct > 100) return 'var(--red)';
  if (pct >= 80)  return 'var(--amber)';
  if (pct >= 50)  return 'var(--blue)';
  return 'var(--green)';
}

// ── Component ──────────────────────────────────────────────────────────────

export default function EmployeeWorkloadChart({
  employees   = MOCK_EMPLOYEES || [],
  workEntries = MOCK_WORK_ENTRIES || MOCK_PLANNED_WORK_ENTRIES || [],
} = {}) {
  const [period, setPeriod]             = useState('weekly');
  const [referenceDate, setReferenceDate] = useState(() => toDateString(new Date()));

  // ช่วงวันที่ของรอบที่เลือก
  const range = useMemo(
    () => getPeriodRange(period, new Date(`${referenceDate}T00:00:00`)),
    [period, referenceDate],
  );

  // Capacity คำนวณจากตารางทำงานจริงของพนักงานและรูปแบบวันหยุดในแต่ละสัปดาห์

  // รวมชั่วโมงประมาณการรายพนักงานภายในช่วงที่เลือก
  // กันข้อมูลซ้ำด้วย Set ของ entry id · ข้าม record ที่ชั่วโมงไม่ใช่ตัวเลขหรือติดลบ
  const totalsByEmployee = useMemo(() => {
    // Guard Clause ป้องกัน runtime crash กรณี workEntries ไม่ใช่ array หรือยังโหลดไม่เสร็จ
    if (!Array.isArray(workEntries)) return {};

    const totals  = {};
    const seenIds = new Set();

    (workEntries || [])?.forEach((entry) => {
      if (!entry || seenIds.has(entry.id)) return;
      const inRange = entry.date && entry.date >= range?.start && entry.date <= range?.end;
      if (!inRange) return;
      const hours = Number(entry.hours);
      if (!Number.isFinite(hours) || hours < 0) return;
      seenIds.add(entry.id);
      totals[entry.employeeId] = (totals[entry.employeeId] || 0) + hours;
    });
    return totals;
  }, [workEntries, range]);

  // แปลงรายชื่อพนักงานพร้อมชั่วโมงและ workload % แล้วเรียงตาม % มากไปน้อย
  const rankedEmployees = useMemo(() => {
    if (!Array.isArray(employees)) return [];

    return (employees || [])
      .map((emp) => {
        if (!emp) return null;
        const hours = (totalsByEmployee && totalsByEmployee[emp.id]) || 0;
        const capacity = getEmployeeCapacity(emp, range?.start, range?.end)?.hours ?? 0;
        const pct = capacity > 0 ? (hours / capacity) * 100 : 0;
        return { ...emp, hours, capacityHours: capacity, pct };
      })
      .filter(Boolean)
      .sort((a, b) => b.pct - a.pct || (a.name || '').localeCompare(b.name || '', 'th'));
  }, [employees, totalsByEmployee, range]);

  const safeRanked = Array.isArray(rankedEmployees) ? rankedEmployees : [];

  // ใช้ maxPct เพื่อ scale ความกว้างแท่ง (แท่งที่ pct สูงสุด = 100% กว้าง)
  const maxPct      = safeRanked.reduce((max, e) => Math.max(max, e?.pct || 0), 0);
  const hasAnyHours = maxPct > 0;
  const grandTotal  = safeRanked.reduce((sum, e) => sum + (e?.hours || 0), 0);
  const teamCapacity = safeRanked.reduce((sum, e) => sum + (e?.capacityHours || 0), 0);

  // จำนวนพนักงาน overloaded (>100%)
  const overloadedCount = safeRanked.filter((e) => (e?.pct || 0) > 100).length;

  // format ตัวเลขชั่วโมง: ถ้าเป็น integer แสดงแบบไม่มีทศนิยม ไม่งั้นแสดง 1 ตำแหน่ง
  const fmtHours = (h) => (Number.isInteger(h) ? String(h) : h.toFixed(1));
  const capText  = teamCapacity.toFixed(0);

  return (
    <Card className="border-0 shadow-sm side-panel-card workload-card h-100">
      <Card.Header className="bg-white border-bottom py-2 px-3">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div className="d-flex align-items-center gap-2">
            <div className="panel-icon-wrap text-primary">
              <UserRound size={18} />
            </div>
            <h3 className="panel-title mb-0">Workload พนักงาน</h3>
            <Badge bg="light" text="dark" className="border fw-medium">Planned Hours</Badge>
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span className="small text-muted">รวม {fmtHours(grandTotal)} ชม.</span>
            <span className="small text-muted">|</span>
            <span className="small text-muted">ความจุรวม {capText} ชม.</span>
            {overloadedCount > 0 && (
              <Badge
                bg="danger"
                className="workload-overload-badge"
                title={`มี ${overloadedCount} คนที่ชั่วโมงเกินความจุ`}
              >
                เกินความจุ {overloadedCount} คน
              </Badge>
            )}
          </div>
        </div>

        {/* ตัวเลือกรอบเวลา + วันที่อ้างอิง */}
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-2">
          <div className="workload-period-pills d-inline-flex gap-1" role="group" aria-label="เลือกรอบเวลา">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                className={`workload-period-btn ${period === opt.key ? 'active' : ''}`}
                onClick={() => setPeriod(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Form.Group className="mb-0 d-flex align-items-center gap-2">
            <Form.Label className="small text-muted mb-0 text-nowrap d-flex align-items-center gap-1">
              <Filter size={13} />
              วันที่อ้างอิง
            </Form.Label>
            <Form.Control
              type="date"
              size="sm"
              value={referenceDate}
              onChange={(e) => e.target.value && setReferenceDate(e.target.value)}
              className="workload-date-input"
              aria-label="เลือกวันที่อ้างอิงของรอบ"
            />
          </Form.Group>
        </div>
        <div className="small text-muted mt-1">
          ช่วงข้อมูล: <span className="fw-medium text-ink">{formatRangeLabel(period, range)}</span>
        </div>
      </Card.Header>

      {/* Legend สี workload */}
      <div className="workload-legend px-3 py-1 border-bottom d-flex flex-wrap gap-3">
        <span className="workload-legend-item">
          <span className="workload-legend-dot" style={{ background: 'var(--green)' }} />
          <span className="small text-muted">ต่ำ (&lt;50%)</span>
        </span>
        <span className="workload-legend-item">
          <span className="workload-legend-dot" style={{ background: 'var(--blue)' }} />
          <span className="small text-muted">ปานกลาง (50–79%)</span>
        </span>
        <span className="workload-legend-item">
          <span className="workload-legend-dot" style={{ background: 'var(--amber)' }} />
          <span className="small text-muted">สูง (80–100%)</span>
        </span>
        <span className="workload-legend-item">
          <span className="workload-legend-dot" style={{ background: 'var(--red)' }} />
          <span className="small text-muted">เกินความจุ (&gt;100%)</span>
        </span>
      </div>

      {/* รายการพนักงาน */}
      <Card.Body className="py-2 px-3 d-flex flex-column workload-card-body">
        {!hasAnyHours ? (
          <div className="text-center py-3 px-3 flex-grow-1 d-flex flex-column justify-content-center">
            <div className="empty-state-icon mx-auto mb-1 text-muted">
              <UserRound size={28} color="var(--muted)" />
            </div>
            <h6 className="fw-semibold text-ink mb-1">ไม่มี Planned Hours ในช่วงนี้</h6>
            <p className="text-muted small mb-0">ลองเลือกวันที่อ้างอิงหรือรอบเวลาอื่นที่มีข้อมูล</p>
          </div>
        ) : (
          <div className="workload-list">
            {(safeRanked || []).map((emp) => {
              if (!emp) return null;
              // ความกว้างแท่ง scale ตาม maxPct (คนที่ pct สูงสุด = กว้างเต็ม)
              const pct      = emp.pct || 0;
              const widthPct = maxPct > 0 ? Math.min((pct / maxPct) * 100, 100) : 0;
              const color    = getWorkloadColor(pct);
              const pctText  = pct.toFixed(0);
              const isOver   = pct > 100;

              return (
                <div
                  key={emp.id}
                  className={`workload-row${isOver ? ' workload-row-overloaded' : ''}`}
                  title={`${emp.name || ''} · ${emp.department || ''} · ${pctText}% (${fmtHours(emp.hours || 0)}/${fmtHours(emp.capacityHours || 0)})`}
                >
                  {/* ชื่อพนักงาน */}
                  <div className="workload-name small text-ink text-truncate">{emp.name || '-'}</div>

                  {/* แท่ง */}
                  <div className="workload-bar-track">
                    <div
                      className={`workload-bar ${(emp.hours || 0) === 0 ? 'workload-bar-zero' : ''}`}
                      style={{ width: `${widthPct}%`, backgroundColor: (emp.hours || 0) > 0 ? color : undefined }}
                    />
                  </div>

                  {/* ค่าชั่วโมงและ % */}
                  <div className="workload-value small fw-semibold text-nowrap" style={{ color }}>
                    {(emp.hours || 0) === 0 ? (
                      <span className="text-muted">0 ชม.</span>
                    ) : (
                      <>
                        <span>{fmtHours(emp.hours || 0)}/{fmtHours(emp.capacityHours || 0)}</span>
                        <span className="workload-pct ms-1">({pctText}%)</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
