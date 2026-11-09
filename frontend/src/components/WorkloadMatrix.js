import React, { useMemo, useState } from 'react';
import { Badge, Card, Col, Form, Modal, Row, Table } from 'react-bootstrap';
import { MOCK_PROJECTS } from '../data/mockData';
import {
  MOCK_PROJECT_ASSIGNMENTS,
  STANDARD_CAP_MO,
  buildMatrixMonths,
  computeEmployeeMatrixRow,
  getAssignmentStatusLabel,
  WORKLOAD_STATUS_META,
} from '../data/workloadMatrixData';
import { filterEmployees } from '../data/workloadMockData';

const MONTH_LABELS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const fmtHours = (hours) => `${Number(hours || 0).toLocaleString('en-US', { maximumFractionDigits: 1 })} hrs`;
const fmtPercent = (utilization) => (utilization === null || utilization === undefined ? 'N/A' : `${Math.round(utilization)}%`);

const getEmployeePrimary = (employee) => {
  if (!employee) return '—';
  if (employee.nickname) {
    const primaryId = employee.email || employee.name || employee.fullName || '—';
    return `${primaryId} (${employee.nickname})`;
  }
  return employee.name || employee.fullName || employee.email || '—';
};

const getEmployeeSecondary = (employee) => {
  if (!employee) return '—';
  const parts = [];
  if (employee.id) parts.push(employee.id);
  if (employee.email) parts.push(employee.email);
  return parts.length ? parts.join(' | ') : '—';
};

const getEmployeeOrg = (employee) => {
  if (!employee) return { section: '—', subSection: '—' };
  const section = employee.section || employee.department || '—';
  const subSection = employee.subSection || employee.sub_section || employee.role || employee.position || '—';
  return { section, subSection };
};

const getEmployeeStandardCap = (employee) => {
  const cap = employee?.standardCapMo || employee?.standardCapacity || employee?.capMo || STANDARD_CAP_MO;
  return fmtHours(cap);
};

// 6-Month Workload Planning Matrix — Matrix-owned component.
// Forecast window state is independent from the Dashboard's global date picker.
export default function WorkloadMatrix({ employees = [], department = 'all', position = 'all', projectFilter = 'all', search = '' }) {
  const now = new Date();
  const [windowStart, setWindowStart] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [statusFilter, setStatusFilter] = useState('all');
  const [drillDown, setDrillDown] = useState(null); // { employee, cell }

  const months = useMemo(() => buildMatrixMonths(windowStart.year, windowStart.month), [windowStart]);

  const filteredEmployees = useMemo(
    () => filterEmployees(employees, { department, position, search }),
    [employees, department, position, search],
  );

  const rows = useMemo(
    () => filteredEmployees.map((employee) => computeEmployeeMatrixRow(employee, months, MOCK_PROJECT_ASSIGNMENTS, projectFilter)),
    [filteredEmployees, months, projectFilter],
  );

  const visibleRows = useMemo(
    () => (statusFilter === 'all'
      ? rows
      : rows.filter((row) => row.cells.some((cell) => cell.status === statusFilter))),
    [rows, statusFilter],
  );

  // Previous / Next moves the 6-month forecast window by exactly one month.
  const navigate = (direction) => {
    setWindowStart((current) => {
      const total = current.year * 12 + current.month + direction;
      return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
    });
  };

  const startMonthValue = `${windowStart.year}-${String(windowStart.month + 1).padStart(2, '0')}`;

  const handleStartMonthChange = (event) => {
    const val = event.target.value;
    if (!val) return;
    const [yearStr, monthStr] = val.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    if (!isNaN(year) && !isNaN(month) && month >= 0 && month <= 11) {
      setWindowStart({ year, month });
    }
  };

  const projectById = useMemo(() => new Map(MOCK_PROJECTS.map((project) => [project.id, project])), []);
  const windowLabel = `${MONTH_LABELS[months[0].month]} ${months[0].year} – ${MONTH_LABELS[months[5].month]} ${months[5].year}`;

  return (
    <Card className="workload-panel mb-3 workload-forecast">
      <Card.Header>
        <div>
          <h2>Workload Matrix · 6-Month Forecast</h2>
          <p>วางแผนกำลังคน 6 เดือนข้างหน้า — Planned Hours เทียบ Actual Monthly Capacity (คลิกช่องเพื่อดูรายละเอียด)</p>
        </div>
        <div className="workload-forecast-controls">
          <select className="form-select form-select-sm" aria-label="กรองสถานะภาระงาน" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">ทุกสถานะ</option>
            <option value="available">Available</option>
            <option value="near">Near Capacity</option>
            <option value="over">Overcapacity</option>
            <option value="na">N/A</option>
          </select>
          <div className="workload-forecast-nav">
            <button
              type="button"
              className="workload-forecast-nav-btn"
              onClick={() => navigate(-1)}
              aria-label="ย้อนหลัง 1 เดือน"
              title="ย้อนหลัง 1 เดือน"
            >
              ‹ Prev
            </button>
            <Form.Control
              type="month"
              size="sm"
              className="workload-forecast-month-picker"
              aria-label="เลือกเดือนเริ่มต้น Forecast"
              title="เลือกเดือนเริ่มต้น Forecast (แสดงต่อเนื่อง 6 เดือน)"
              value={startMonthValue}
              onChange={handleStartMonthChange}
            />
            <span className="workload-forecast-window">{windowLabel}</span>
            <button
              type="button"
              className="workload-forecast-nav-btn"
              onClick={() => navigate(1)}
              aria-label="ถัดไป 1 เดือน"
              title="ถัดไป 1 เดือน"
            >
              Next ›
            </button>
          </div>
        </div>
      </Card.Header>
      <Card.Body className="p-0">
        <div className="table-responsive workload-matrix-wrap">
          <Table hover className="workload-forecast-table mb-0 align-middle">
            <thead>
              <tr>
                <th className="workload-forecast-col-emp workload-forecast-sticky-col">EMP. NO / NAME</th>
                <th className="workload-forecast-col-org">SECTION / SUB SECTION</th>
                <th className="text-center workload-forecast-col-cap">CAP/MO</th>
                {months.map((month) => (
                  <th key={month.key} className="text-center workload-forecast-col-month">{MONTH_LABELS[month.month]}<small>{month.year}</small></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const primaryText = getEmployeePrimary(row.employee);
                const secondaryText = getEmployeeSecondary(row.employee);
                const org = getEmployeeOrg(row.employee);
                return (
                  <tr key={row.employee.id}>
                    <td className="workload-forecast-employee workload-forecast-sticky-col" title={`${primaryText} (${secondaryText})`}>
                      <div className="workload-forecast-info-wrap">
                        <strong title={primaryText}>{primaryText}</strong>
                        <small title={secondaryText}>{secondaryText}</small>
                      </div>
                    </td>
                    <td className="workload-forecast-org" title={`${org.section} / ${org.subSection}`}>
                      <div className="workload-forecast-info-wrap">
                        <strong title={org.section}>{org.section}</strong>
                        <small title={org.subSection}>{org.subSection}</small>
                      </div>
                    </td>
                    <td className="text-center text-nowrap workload-forecast-cap">
                      {getEmployeeStandardCap(row.employee)}
                    </td>
                    {row.cells.map((cell) => {
                      const meta = WORKLOAD_STATUS_META[cell.status];
                      return (
                        <td key={cell.key} className="text-center">
                          <button
                            type="button"
                            className={`workload-forecast-cell ${meta.className}`}
                            onClick={() => setDrillDown({ employee: row.employee, cell })}
                            title={`${row.employee.name} · ${MONTH_LABELS[cell.month]} ${cell.year} — ${meta.label}`}
                          >
                            {fmtHours(cell.plannedHours)} ({fmtPercent(cell.utilization)})
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {!visibleRows.length && (
                <tr className="workload-forecast-empty-row"><td colSpan={9} className="text-center text-muted py-5">ไม่พบข้อมูลพนักงานตามตัวกรอง</td></tr>
              )}
            </tbody>
          </Table>
        </div>
        <div className="workload-forecast-legend">
          <span><i className="is-available" /> Available &lt; 90%</span>
          <span><i className="is-near" /> Near Capacity 90–99%</span>
          <span><i className="is-over" /> Overcapacity ≥ 100%</span>
          <span><i className="is-na" /> N/A (capacity = 0)</span>
          <span className="workload-forecast-legend-note">Standard CAP/MO: {STANDARD_CAP_MO} hrs (ค่าอ้างอิง — capacity จริงคำนวณจากตารางงาน วันหยุดนักขัตฤกษ์ และการลา)</span>
        </div>
      </Card.Body>

      <Modal show={!!drillDown} onHide={() => setDrillDown(null)} size="lg" centered className="workload-detail-modal">
        <Modal.Header closeButton>
          <div>
            <Modal.Title>{drillDown?.employee?.name || drillDown?.employee?.email}</Modal.Title>
            <div className="small text-muted">
              {drillDown && `${drillDown.employee.id || ''} · ${drillDown.employee.position || drillDown.employee.role || ''} · ${MONTH_LABELS[drillDown.cell.month]} ${drillDown.cell.year}`}
            </div>
          </div>
        </Modal.Header>
        <Modal.Body>
          {drillDown && (() => {
            const { cell } = drillDown;
            const meta = WORKLOAD_STATUS_META[cell.status];
            return (
              <>
                <Row className="g-2 mb-3">
                  <Col sm={4}><div className="workload-detail-stat"><small>Actual Monthly Capacity</small><strong>{fmtHours(cell.capacityHours)}</strong></div></Col>
                  <Col sm={4}><div className="workload-detail-stat"><small>Standard CAP/MO</small><strong>{getEmployeeStandardCap(drillDown.employee)}</strong></div></Col>
                  <Col sm={4}><div className="workload-detail-stat"><small>Planned Hours</small><strong>{fmtHours(cell.plannedHours)}</strong></div></Col>
                  <Col sm={4}><div className="workload-detail-stat"><small>Available Hours</small><strong className={cell.availableHours < 0 ? 'text-danger' : ''}>{fmtHours(cell.availableHours)}</strong></div></Col>
                  <Col sm={4}><div className="workload-detail-stat"><small>Utilization</small><strong>{fmtPercent(cell.utilization)}</strong></div></Col>
                  <Col sm={4}><div className="workload-detail-stat"><small>Status</small><strong>{meta.label}</strong></div></Col>
                </Row>
                <div className="workload-detail-capacity-note mb-3">
                  ตารางงานพื้นฐาน {fmtHours(cell.capacity.baseScheduleHours)} · หักวันหยุดนักขัตฤกษ์ {fmtHours(cell.capacity.holidayHours)} · หักการลาที่อนุมัติ {fmtHours(cell.capacity.leaveHours)}
                </div>
                <h6 className="fw-bold mb-2">Project Assignments</h6>
                <div className="table-responsive">
                  <Table size="sm" className="align-middle">
                    <thead><tr><th>Project</th><th>Status</th><th>Period</th><th className="text-end">Hours (this month)</th></tr></thead>
                    <tbody>
                      {cell.contributing.map(({ assignment, hours }) => {
                        const project = projectById.get(assignment.projectId);
                        return (
                          <tr key={assignment.id}>
                            <td>{project ? project.name : `Project #${assignment.projectId}`}</td>
                            <td><Badge bg={assignment.status === 'in_progress' ? 'primary' : assignment.status === 'confirmed' ? 'success' : 'secondary'}>{getAssignmentStatusLabel(assignment.status)}</Badge></td>
                            <td className="text-nowrap">{assignment.startDate} → {assignment.endDate}</td>
                            <td className="text-end text-nowrap">{fmtHours(hours)}</td>
                          </tr>
                        );
                      })}
                      {!cell.contributing.length && <tr><td colSpan={4} className="text-center text-muted py-3">ไม่มีการมอบหมายงานในเดือนนี้</td></tr>}
                    </tbody>
                  </Table>
                </div>
              </>
            );
          })()}
        </Modal.Body>
      </Modal>
    </Card>
  );
}
