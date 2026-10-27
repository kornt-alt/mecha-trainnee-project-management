// frontend/src/components/dashboard/EmployeeWorkloadChart.js — กราฟแท่งแนวนอน Workload พนักงาน (ชั่วโมงประมาณการ) พร้อมฟิลเตอร์รายวัน/สัปดาห์/เดือน/ปี
import React, { useState, useMemo } from 'react';
import { Card, Form, Badge } from 'react-bootstrap';
import { UserRound, Filter } from '../common/Icons';
import { MOCK_EMPLOYEES, MOCK_WORK_ENTRIES } from '../../data/mockData';

// รอบระยะเวลาที่รองรับ — ทั้งหมดคำนวณจากวันที่อ้างอิง (reference date) เดียวกัน
const PERIOD_OPTIONS = [
  { key: 'daily', label: 'รายวัน' },
  { key: 'weekly', label: 'รายสัปดาห์' },
  { key: 'monthly', label: 'รายเดือน' },
  { key: 'yearly', label: 'รายปี' },
];

function toDateString(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// คืนช่วงวันที่ [start, end] แบบปิดทั้งสองด้าน ของรอบที่เลือก
// สัปดาห์เริ่มวันจันทร์ตามธรรมเนียมการทำงานในประเทศไทย
function getPeriodRange(period, referenceDate) {
  const y = referenceDate.getFullYear();
  const m = referenceDate.getMonth();
  const d = referenceDate.getDate();

  if (period === 'daily') {
    return { start: toDateString(referenceDate), end: toDateString(referenceDate) };
  }
  if (period === 'weekly') {
    const dayOfWeek = referenceDate.getDay(); // 0 = อาทิตย์
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const start = new Date(y, m, d + mondayOffset);
    const end = new Date(y, m, d + mondayOffset + 6);
    return { start: toDateString(start), end: toDateString(end) };
  }
  if (period === 'monthly') {
    return { start: toDateString(new Date(y, m, 1)), end: toDateString(new Date(y, m + 1, 0)) };
  }
  // yearly
  return { start: `${y}-01-01`, end: `${y}-12-31` };
}

const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function formatRangeLabel(period, range) {
  const fmt = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return `${d} ${THAI_MONTHS_SHORT[m - 1]} ${y + 543}`;
  };
  if (period === 'daily') return fmt(range.start);
  if (period === 'weekly' || period === 'monthly') return `${fmt(range.start)} – ${fmt(range.end)}`;
  return `ปี ${range.start.slice(0, 4)}`;
}

export default function EmployeeWorkloadChart({
  employees = MOCK_EMPLOYEES,
  workEntries = MOCK_WORK_ENTRIES,
}) {
  // วันที่อ้างอิงของรอบ (ค่าเริ่มต้น = วันนี้ตามเวลาเครื่อง) — เปลี่ยนวันที่แล้วทุกรอบคำนวณใหม่จาก record จริง
  const [period, setPeriod] = useState('monthly');
  const [referenceDate, setReferenceDate] = useState(() => toDateString(new Date()));

  const range = useMemo(() => getPeriodRange(period, new Date(`${referenceDate}T00:00:00`)), [period, referenceDate]);

  // รวมชั่วโมงประมาณการรายพนักงานภายในช่วงที่เลือก
  // กันข้อมูลซ้ำด้วย Set ของ entry id · ข้าม record ที่ชั่วโมงไม่ใช่ตัวเลขหรือติดลบ
  const totalsByEmployee = useMemo(() => {
    const totals = {};
    const seenIds = new Set();
    workEntries.forEach((entry) => {
      if (!entry || seenIds.has(entry.id)) return;
      const inRange = entry.date && entry.date >= range.start && entry.date <= range.end;
      if (!inRange) return;
      const hours = Number(entry.hours);
      if (!Number.isFinite(hours) || hours < 0) return;
      seenIds.add(entry.id);
      totals[entry.employeeId] = (totals[entry.employeeId] || 0) + hours;
    });
    return totals;
  }, [workEntries, range]);

  // เรียงจากชั่วโมงมากไปน้อย (พนักงานที่ไม่มี record = 0 ชั่วโมง ยังคงแสดง)
  const rankedEmployees = useMemo(() => {
    return employees
      .map((emp) => ({ ...emp, hours: totalsByEmployee[emp.id] || 0 }))
      .sort((a, b) => b.hours - a.hours || a.name.localeCompare(b.name, 'th'));
  }, [employees, totalsByEmployee]);

  const maxHours = rankedEmployees.reduce((max, e) => Math.max(max, e.hours), 0);
  const hasAnyHours = maxHours > 0;
  const grandTotal = rankedEmployees.reduce((sum, e) => sum + e.hours, 0);

  return (
    <Card className="border-0 shadow-sm side-panel-card workload-card h-100">
      <Card.Header className="bg-white border-bottom py-2 px-3">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div className="d-flex align-items-center gap-2">
            <div className="panel-icon-wrap text-primary">
              <UserRound size={18} />
            </div>
            <h3 className="panel-title mb-0">Workload พนักงาน</h3>
            <Badge bg="light" text="dark" className="border fw-medium">ชั่วโมงประมาณการ</Badge>
          </div>
          <span className="small text-muted">รวม {grandTotal.toLocaleString()} ชม.</span>
        </div>

        {/* ตัวเลือกรอบเวลา + วันที่อ้างอิง — ค่าที่แสดงคำนวณใหม่จาก record ทุกครั้ง ไม่ใช่การคูณสเกล */}
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

      {/* d-flex column + flex-grow-1 empty state: เนื้อหา (list หรือ empty state) ไม่กำหนดความสูงการ์ดเอง แค่เต็มพื้นที่ที่เหลือ */}
      <Card.Body className="py-2 px-3 d-flex flex-column">
        {!hasAnyHours ? (
          <div className="text-center py-3 px-3 flex-grow-1 d-flex flex-column justify-content-center">
            <div className="empty-state-icon mx-auto mb-1 text-muted">
              <UserRound size={28} color="var(--muted)" />
            </div>
            <h6 className="fw-semibold text-ink mb-1">ไม่มีชั่วโมงประมาณการในช่วงนี้</h6>
            <p className="text-muted small mb-0">ลองเลือกวันที่อ้างอิงหรือรอบเวลาอื่นที่มีข้อมูล</p>
          </div>
        ) : (
          <div className="workload-list">
            {rankedEmployees.map((emp) => {
              // ความกว้างแท่งเทียบกับคนที่ชั่วโมงมากที่สุดในรอบที่เลือก
              const widthPct = maxHours > 0 ? (emp.hours / maxHours) * 100 : 0;
              const hoursText = Number.isInteger(emp.hours) ? String(emp.hours) : emp.hours.toFixed(1);
              return (
                <div key={emp.id} className="workload-row" title={`${emp.name} · ${emp.department}`}>
                  <div className="workload-name small text-ink text-truncate">{emp.name}</div>
                  <div className="workload-bar-track">
                    <div
                      className={`workload-bar ${emp.hours === 0 ? 'workload-bar-zero' : ''}`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  <div className="workload-value small fw-semibold text-ink text-nowrap">
                    {emp.hours === 0 ? '0' : `${hoursText} ชม.`}
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
