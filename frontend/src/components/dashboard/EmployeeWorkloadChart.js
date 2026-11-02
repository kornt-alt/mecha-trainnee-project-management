// frontend/src/components/dashboard/EmployeeWorkloadChart.js
// กราฟแสดง Workload พนักงานบน Dashboard หน้าแรก — เวอร์ชัน Compact ตามสไตล์ "Team Workload vs. Maximum Capacity"
import React, { useState, useMemo } from 'react';
import { Card, Form, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { UserRound, Filter, ChevronRight } from '../common/Icons';
import { MOCK_EMPLOYEES } from '../../data/mockData';
import {
  MOCK_PLANNED_WORK_ENTRIES,
  getWorkloadPeriodRange,
  computeEmployeeWorkloadData,
  toISODate,
} from '../../data/workloadMockData';

// รอบระยะเวลาที่รองรับ
const PERIOD_OPTIONS = [
  { key: 'daily',   label: 'รายวัน' },
  { key: 'weekly',  label: 'รายสัปดาห์' },
  { key: 'monthly', label: 'รายเดือน' },
  { key: 'yearly',  label: 'รายปี' },
];

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

function formatRangeLabel(period, range) {
  if (!range?.start) return '';
  const fmt = (iso) => {
    const [y, mo, da] = iso.split('-').map(Number);
    return `${da} ${THAI_MONTHS_SHORT[mo - 1]} ${y + 543}`;
  };
  if (period === 'daily') return fmt(range.start);
  if (period === 'weekly' || period === 'monthly') return `${fmt(range.start)} – ${fmt(range.end)}`;
  return `ปี ${range.start.slice(0, 4)}`;
}

const fmtHours = (hours) =>
  `${Number(hours || 0).toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ชม.`;

export default function EmployeeWorkloadChart({
  employees   = MOCK_EMPLOYEES || [],
  workEntries = MOCK_PLANNED_WORK_ENTRIES || [],
} = {}) {
  const [period, setPeriod] = useState('weekly');
  const [referenceDate, setReferenceDate] = useState(() => toISODate(new Date()));

  // ช่วงวันที่ของรอบที่เลือก คำนวณแบบเดียวกับหน้า Workload
  const range = useMemo(
    () => getWorkloadPeriodRange(period, referenceDate),
    [period, referenceDate],
  );

  // คำนวณ Workload พนักงานผ่านฟังก์ชันกลางที่ใช้ร่วมกันกับหน้า /workload
  const data = useMemo(
    () => computeEmployeeWorkloadData(employees, workEntries, range, 'all'),
    [employees, workEntries, range],
  );

  const employeesList = useMemo(
    () => (Array.isArray(data?.employees) ? data.employees : []),
    [data?.employees],
  );
  const plannedTotal  = data?.plannedHours || 0;
  const capacityTotal = data?.capacityHours || 0;
  const overCount     = data?.overCapacity || 0;
  const hasAnyHours   = plannedTotal > 0 || employeesList.some((e) => (e?.plannedHours || 0) > 0);

  // สเกลสูงสุดของแท่ง: ค่าเริ่มต้น 130% เพื่อให้ขีด Capacity 100% อยู่ที่ 76.9% ของ Track
  // หากมีพนักงานเกิน 130% จะขยายสเกลตามจริงอัตโนมัติ เพื่อไม่ให้แท่งล้นกรอบ
  const scaleMax = useMemo(() => {
    const maxPercent = employeesList.reduce((max, e) => Math.max(max, e?.percent || 0), 0);
    return Math.max(130, Math.ceil(maxPercent / 10) * 10);
  }, [employeesList]);

  // ตำแหน่งเส้น Maximum Capacity (100%) บน Track
  const capMarkerPos = useMemo(() => (100 / scaleMax) * 100, [scaleMax]);

  return (
    <Card className="border-0 shadow-sm side-panel-card workload-card h-100">
      {/* ── Card Header ────────────────────────────────────────────── */}
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
            <span className="small text-muted">
              รวม <strong className="text-ink fw-semibold">{fmtHours(plannedTotal)}</strong> / {fmtHours(capacityTotal)}
            </span>
            {overCount > 0 && (
              <Badge
                bg="danger"
                className="workload-overload-badge"
                title={`มี ${overCount} คนที่ Planned Hours เกิน Capacity`}
              >
                เกินความจุ {overCount} คน
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

      {/* ── Card Body (Workload Employee List) ───────────────────────── */}
      <Card.Body className="py-2 px-3 d-flex flex-column workload-card-body">
        {!hasAnyHours ? (
          <div className="text-center py-4 px-3 flex-grow-1 d-flex flex-column justify-content-center">
            <div className="empty-state-icon mx-auto mb-1 text-muted">
              <UserRound size={28} color="var(--muted)" />
            </div>
            <h6 className="fw-semibold text-ink mb-1">ไม่มี Planned Hours ในช่วงนี้</h6>
            <p className="text-muted small mb-0">ลองเลือกวันที่อ้างอิงหรือรอบเวลาอื่นที่มีข้อมูล</p>
          </div>
        ) : (
          <div className="workload-list">
            {employeesList.map((emp) => {
              if (!emp) return null;
              const isOver = (emp.percent || 0) > 100;
              const barWidth = Math.max(0, Math.min(emp.percent || 0, scaleMax) / scaleMax * 100);
              const plannedText = (emp.plannedHours || 0).toFixed(1);
              const capText = (emp.capacityHours || 0).toFixed(1);
              const pctText = (emp.percent || 0).toFixed(0);

              return (
                <div
                  key={emp.id}
                  className="workload-compact-row"
                  title={`${emp.name || ''} · ${emp.position || ''} · ${pctText}% (${plannedText} / ${capText} ชม.)`}
                >
                  {/* Left: ชื่อพนักงาน + ตำแหน่ง จัดวางแนวตั้ง */}
                  <div className="workload-compact-name">
                    <strong>{emp.name || '-'}</strong>
                    <small>{emp.position || '-'}</small>
                  </div>

                  {/* Center: แถบ Workload + Capacity Marker */}
                  <div className="workload-compact-track-wrap">
                    <span className="workload-compact-track">
                      <span
                        className={`workload-compact-fill ${isOver ? 'is-over' : ''}`}
                        style={{ width: `${barWidth}%` }}
                      />
                      <span
                        className="workload-compact-marker"
                        style={{ left: `${capMarkerPos}%` }}
                        title="Maximum Capacity (100%)"
                      />
                    </span>
                  </div>

                  {/* Right: Planned / Capacity + Utilization % */}
                  <div className="workload-compact-values">
                    <span className="workload-compact-hours">
                      <strong>{plannedText}</strong>
                      <small> / {capText} ชม.</small>
                    </span>
                    <span className={`workload-compact-util ${isOver ? 'is-over' : ''}`}>
                      {pctText}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card.Body>

      {/* ── Card Footer: Legend + ลิงก์ดูทั้งหมดไปยัง /workload ─────── */}
      <Card.Footer className="bg-white border-top py-2 px-3 flex-shrink-0 d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div className="workload-chart-legend">
          <span><i className="normal" /> Normal Load</span>
          <span><i className="over" /> Overcapacity</span>
          <span><i className="cap" /> Capacity</span>
        </div>
        <Link
          to="/workload"
          className="small text-primary text-decoration-none fw-medium d-inline-flex align-items-center gap-1"
        >
          <span>ดูทั้งหมด</span>
          <ChevronRight size={14} />
        </Link>
      </Card.Footer>
    </Card>
  );
}
