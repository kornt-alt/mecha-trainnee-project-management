import React, { useMemo, useState } from 'react';
import { Badge, Button, Card, Col, Form, Modal, ProgressBar, Row, Table } from 'react-bootstrap';
import { MOCK_EMPLOYEES, MOCK_DEPARTMENTS } from '../data/mockData';
import { useMockData } from '../context/MockDataContext';
import {
  MOCK_PLANNED_WORK_ENTRIES,
  getWeekSchedulePattern,
  parseISODate,
  toISODate,
  getWorkloadPeriodRange as getRange,
  computeEmployeeWorkloadData,
  filterEmployees,
} from '../data/workloadMockData';
import './workload.css';
import WorkloadMatrix from './WorkloadMatrix';

const PERIODS = [
  { key: 'daily', label: 'รายวัน' },
  { key: 'weekly', label: 'รายสัปดาห์' },
  { key: 'monthly', label: 'รายเดือน' },
  { key: 'yearly', label: 'รายปี' },
];
const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const DAY_LABELS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const fmtHours = (hours) => `${Number(hours || 0).toLocaleString('th-TH', { maximumFractionDigits: 1 })} ชม.`;
const fmtDate = (value) => {
  const date = parseISODate(value);
  return `${date.getDate()} ${THAI_MONTHS[date.getMonth()]} ${date.getFullYear() + 543}`;
};
// Utilization thresholds — aligned with Workload Matrix and EmployeeWorkloadDetailModal.
// Available: < 90% | Near Capacity: 90–99% | Overcapacity: ≥ 100%
const getStatus = (percent) => percent >= 100 ? 'danger' : percent >= 90 ? 'warning' : 'success';

const PRIORITY_ORDER = { urgent: 4, high: 3, normal: 2, low: 1 };
const PRIORITY_META = {
  urgent: { label: 'Urgent', bg: 'danger' },
  high: { label: 'High', bg: 'warning' },
  normal: { label: 'Normal', bg: 'primary' },
  low: { label: 'Low', bg: 'secondary' },
};

  




function EmployeeWorkloadDetailModal({ show, onHide, employee, range, period }) {
  const { projects: mockProjects, tasks: mockTasks } = useMockData();
  

  
  const [sortKey, setSortKey] = useState('workload');
  const [sortDirection, setSortDirection] = useState('desc');

  if (!employee) return null;


  const totalWorkload = Number(employee.plannedHours || 0);
  const actualCapacity = Number(employee.capacityHours || 0);
  const utilization = actualCapacity > 0 ? (totalWorkload / actualCapacity) * 100 : null;

  let statusLabel = 'Available';
  let statusBadgeBg = 'success';
  let statusColorClass = 'text-success';
  if (actualCapacity <= 0 || utilization === null) {
    statusLabel = 'N/A';
    statusBadgeBg = 'secondary';
    statusColorClass = 'text-secondary';
  } else if (utilization >= 100) {
    statusLabel = 'Overcapacity';
    statusBadgeBg = 'danger';
    statusColorClass = 'text-danger';
  } else if (utilization >= 90) {
    statusLabel = 'Near Capacity';
    statusBadgeBg = 'warning';
    statusColorClass = 'text-warning';
  }

  const entries = Array.isArray(employee.entries) ? employee.entries : [];

  const projectMap = new Map();
  entries.forEach((entry) => {
    const hasProject = entry.projectId != null;
    const pId = hasProject ? entry.projectId : 'unassigned';
    if (!projectMap.has(pId)) {
      const project = hasProject ? (mockProjects || []).find((p) => p.id === entry.projectId) : null;
      projectMap.set(pId, {
        id: pId,
        name: project ? project.name : (hasProject ? `Project #${entry.projectId}` : 'Unassigned Tasks'),
        dueDate: project ? project.dueDate : null,
        workload: 0,
        taskIds: new Set(),
      });
    }
    const item = projectMap.get(pId);
    item.workload += Number(entry.hours || 0);
    if (entry.taskId) item.taskIds.add(entry.taskId);
  });

  const projectRows = Array.from(projectMap.values()).map((p) => {
    const tasks = Array.from(p.taskIds)
      .map((id) => (mockTasks || []).find((t) => t.id === id))
      .filter(Boolean);
    const priorities = [...new Set(tasks.map((t) => t.priority).filter(Boolean))];

    let priorityLabel = '—';
    let priorityVariant = 'secondary';
    let priorityTitle = '';
    let priorityRank = 0;

    if (priorities.length === 1) {
      const meta = PRIORITY_META[priorities[0]];
      priorityLabel = meta ? meta.label : priorities[0];
      priorityVariant = meta ? meta.bg : 'secondary';
      priorityRank = PRIORITY_ORDER[priorities[0]] || 0;
    } else if (priorities.length > 1) {
      const highest = priorities.reduce(
        (prev, cur) => ((PRIORITY_ORDER[cur] || 0) > (PRIORITY_ORDER[prev] || 0) ? cur : prev),
        priorities[0]
      );
      const meta = PRIORITY_META[highest];
      priorityLabel = meta ? meta.label : highest;
      priorityVariant = meta ? meta.bg : 'secondary';
      priorityRank = PRIORITY_ORDER[highest] || 0;
      priorityTitle = `Contributing priorities: ${priorities.map((pr) => PRIORITY_META[pr]?.label || pr).join(', ')}`;
    }

    const percentOfCapacity = actualCapacity > 0 ? (p.workload / actualCapacity) * 100 : null;

    return {
      id: p.id,
      name: p.name,
      dueDate: p.dueDate,
      workload: Number(p.workload.toFixed(2)),
      percentOfCapacity,
      priorityRank,
      priorityLabel,
      priorityVariant,
      priorityTitle,
    };
  });

  const sortedRows = [...projectRows].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'project') {
      cmp = (a.name || '').localeCompare(b.name || '', 'th');
    } else if (sortKey === 'priority') {
      cmp = (a.priorityRank || 0) - (b.priorityRank || 0);
    } else if (sortKey === 'workload') {
      cmp = a.workload - b.workload;
    } else if (sortKey === 'percent') {
      const pA = a.percentOfCapacity ?? -1;
      const pB = b.percentOfCapacity ?? -1;
      cmp = pA - pB;
    }
    return sortDirection === 'asc' ? cmp : -cmp;
  });

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(key === 'project' ? 'asc' : 'desc');
    }
  };

  const renderSortIcon = (key) => {
    if (sortKey !== key) return <span className="text-muted ms-1" style={{ opacity: 0.35 }}>↕</span>;
    return <span className="ms-1">{sortDirection === 'asc' ? '▲' : '▼'}</span>;
  };

  const periodObj = PERIODS.find((p) => p.key === period);
  const periodLabel = periodObj ? periodObj.label : period;
  const timeframeLabel = range ? `${periodLabel} (${fmtDate(range.start)} – ${fmtDate(range.end)})` : '';
  const section = employee.section || employee.department || '—';
  const subSection = employee.subSection || employee.sub_section || employee.role || employee.position || '—';

  return (
    <Modal show={show} onHide={onHide} size="lg" centered className="workload-detail-modal">
      <Modal.Header closeButton className="workload-detail-modal-header border-bottom">
        <div className="w-100 pe-3">
          <div className="d-flex align-items-baseline gap-2 flex-wrap">
            <Modal.Title as="h5" className="fw-bold mb-0 text-dark">
              {employee.name}{employee.nickname ? ` (${employee.nickname})` : ''}
            </Modal.Title>
            <span className="text-muted small">
              {employee.position || '—'} · {employee.department || '—'}
            </span>
          </div>
          <div className="workload-modal-meta text-muted small mt-1">
            <span><strong>ID:</strong> {employee.id || '—'}</span>
            <span className="mx-2">|</span>
            <span><strong>Section:</strong> {section}</span>
            <span className="mx-2">|</span>
            <span><strong>Sub Section:</strong> {subSection}</span>
            {timeframeLabel && (
              <>
                <span className="mx-2">|</span>
                <span><strong>Timeframe:</strong> {timeframeLabel}</span>
              </>
            )}
          </div>
        </div>
      </Modal.Header>
      <Modal.Body className="p-3 p-md-4">
        {/* Workload Summary Cards */}
        <Row className="g-3 mb-4">
          <Col sm={4}>
            <div className="workload-modal-kpi-card">
              <div className="workload-modal-kpi-label">Total Workload</div>
              <div className="workload-modal-kpi-value text-primary">
                {totalWorkload.toFixed(1)} <small>hrs</small>
              </div>
              <div className="workload-modal-kpi-sub">Planned Hours ในช่วงเวลาที่เลือก</div>
            </div>
          </Col>
          <Col sm={4}>
            <div className="workload-modal-kpi-card">
              <div className="workload-modal-kpi-label">Capacity</div>
              <div className="workload-modal-kpi-value text-dark">
                {actualCapacity.toFixed(1)} <small>hrs</small>
              </div>
              <div className="workload-modal-kpi-sub">Actual Capacity ตามตารางงาน</div>
            </div>
          </Col>
          <Col sm={4}>
            <div className="workload-modal-kpi-card">
              <div className="d-flex align-items-center justify-content-between">
                <div className="workload-modal-kpi-label">Utilization</div>
                <Badge bg={statusBadgeBg}>{statusLabel}</Badge>
              </div>
              <div className={`workload-modal-kpi-value ${statusColorClass}`}>
                {actualCapacity > 0 ? `${utilization.toFixed(1)}%` : 'N/A'}
              </div>
              <div className="workload-modal-kpi-sub">สัดส่วนภาระงานต่อ Capacity จริง</div>
            </div>
          </Col>
        </Row>

        {/* Project Workload Breakdown Table */}
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h6 className="fw-bold mb-0" style={{ color: '#1e3557' }}>Project Workload Breakdown</h6>
          <span className="text-muted small">รวม {sortedRows.length} โครงการ</span>
        </div>
        <div className="table-responsive workload-modal-table-wrap">
          <Table hover size="sm" className="align-middle workload-modal-table mb-0">
            <thead>
              <tr>
                <th
                  role="button"
                  tabIndex={0}
                  className="workload-modal-sort-th"
                  onClick={() => handleSort('project')}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSort('project'); }}
                >
                  Workload Component / Project {renderSortIcon('project')}
                </th>
                <th
                  role="button"
                  tabIndex={0}
                  className="workload-modal-sort-th text-center"
                  style={{ width: '120px' }}
                  onClick={() => handleSort('priority')}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSort('priority'); }}
                >
                  Priority {renderSortIcon('priority')}
                </th>
                <th
                  role="button"
                  tabIndex={0}
                  className="workload-modal-sort-th text-end"
                  style={{ width: '160px' }}
                  onClick={() => handleSort('workload')}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSort('workload'); }}
                >
                  Timeframe Workload {renderSortIcon('workload')}
                </th>
                <th
                  role="button"
                  tabIndex={0}
                  className="workload-modal-sort-th text-end"
                  style={{ width: '130px' }}
                  onClick={() => handleSort('percent')}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSort('percent'); }}
                >
                  % of Capacity {renderSortIcon('percent')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="workload-modal-project-name">
                      <strong>{row.name}</strong>
                      {row.dueDate && (
                        <small className="text-muted d-block">
                          Due: {fmtDate(row.dueDate)}
                        </small>
                      )}
                    </div>
                  </td>
                  <td className="text-center">
                    {row.priorityLabel !== '—' ? (
                      <Badge bg={row.priorityVariant} title={row.priorityTitle}>
                        {row.priorityLabel}
                      </Badge>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="text-end text-nowrap fw-semibold">
                    {row.workload.toFixed(1)} hrs
                  </td>
                  <td className="text-end text-nowrap fw-semibold">
                    {row.percentOfCapacity !== null ? `${Math.round(row.percentOfCapacity)}%` : 'N/A'}
                  </td>
                </tr>
              ))}
              {!sortedRows.length && (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-4">
                    ไม่มีข้อมูลภาระงานโปรเจกต์ในช่วงเวลานี้
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </Modal.Body>
    </Modal>
  );
}

export default function Workload() {
  const { projects: mockProjects } = useMockData();
  

  

    const [period, setPeriod] = useState('weekly');
  const [referenceDate, setReferenceDate] = useState(() => toISODate(new Date()));
  const [department, setDepartment] = useState('all');
  const [position, setPosition] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const range = useMemo(() => getRange(period, referenceDate), [period, referenceDate]);

  const handleDepartmentChange = (event) => {
    const nextDept = event.target.value;
    setDepartment(nextDept);
    // If a specific position is selected, check if it belongs to the newly selected section.
    // If not, reset position to 'all' to avoid stale/invalid combinations.
    if (position !== 'all') {
      const validPositions = (nextDept === 'all'
        ? MOCK_EMPLOYEES
        : MOCK_EMPLOYEES.filter((emp) => emp.departmentId === nextDept)
      ).map((emp) => emp.position);
      if (!validPositions.includes(position)) {
        setPosition('all');
      }
    }
  };

  const availablePositions = useMemo(() => {
    const pool = department === 'all'
      ? MOCK_EMPLOYEES
      : MOCK_EMPLOYEES.filter((emp) => emp.departmentId === department);
    return [...new Set(pool.map((emp) => emp.position))].sort((a, b) => a.localeCompare(b, 'th'));
  }, [department]);

  const visibleEmployees = useMemo(
    () => filterEmployees(MOCK_EMPLOYEES, { department, position, search }),
    [department, position, search],
  );

  const data = useMemo(() => {
    return computeEmployeeWorkloadData(visibleEmployees, MOCK_PLANNED_WORK_ENTRIES, range, projectFilter);
  }, [range, visibleEmployees, projectFilter]);

  const rangeDates = useMemo(() => {
    const dates = [];
    const cursor = parseISODate(range.start);
    const end = parseISODate(range.end);
    while (cursor <= end) {
      dates.push(toISODate(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  }, [range]);

  const matrixBuckets = useMemo(() => {
    if (period === 'yearly') {
      const year = parseISODate(range.start).getFullYear();
      return Array.from({ length: 12 }, (_, month) => ({
        key: `${year}-${String(month + 1).padStart(2, '0')}`,
        start: toISODate(new Date(year, month, 1)),
        end: toISODate(new Date(year, month + 1, 0)),
        label: THAI_MONTHS[month],
      }));
    }
    return rangeDates.map((date) => ({ key: date, start: date, end: date, label: `${DAY_LABELS[parseISODate(date).getDay()]} ${parseISODate(date).getDate()}/${parseISODate(date).getMonth() + 1}` }));
  }, [period, range.start, rangeDates]);

  const dailySummary = useMemo(() => {
    const buckets = Array.isArray(matrixBuckets) ? matrixBuckets : [];
    const employeesList = Array.isArray(data?.employees) ? data.employees : [];
    const entriesList = Array.isArray(data?.entries) ? data.entries : [];

    return buckets.map((bucket) => {
      const capacity = employeesList.reduce((sum, employee) => {
        const schedules = Array.isArray(employee?.schedules) ? employee.schedules : [];
        const dayCapacity = schedules
          .filter((day) => day && day.date >= bucket.start && day.date <= bucket.end)
          .reduce((daySum, day) => daySum + Number(day.capacityHours || 0), 0);
        return sum + dayCapacity;
      }, 0);

      const planned = entriesList
        .filter((entry) => entry && entry.date >= bucket.start && entry.date <= bucket.end)
        .reduce((sum, entry) => sum + Number(entry.hours || 0), 0);

      return { ...bucket, capacity, planned, percent: capacity ? (planned / capacity) * 100 : 0 };
    });
  }, [matrixBuckets, data.employees, data.entries]);

  const projects = useMemo(() => {
    if (!Array.isArray(mockProjects)) return [];
    const entriesList = Array.isArray(data?.entries) ? data.entries : [];
    return mockProjects.filter((project) => entriesList.some((entry) => entry.projectId === project.id));
  }, [data.entries, mockProjects]);

  const selectedDetails = selectedEmployee
    ? (data.employees || []).find((employee) => employee.id === selectedEmployee.id) || selectedEmployee
    : null;
  const weekPattern = period === 'weekly' ? getWeekSchedulePattern(referenceDate) : null;

  const shiftSummary = useMemo(() => {
    const employeesList = Array.isArray(data?.employees) ? data.employees : [];
    const standard = employeesList.reduce((sum, employee) => {
      const schedules = Array.isArray(employee?.schedules) ? employee.schedules : [];
      return sum + schedules.filter((day) => day?.shiftType === 'standard').length;
    }, 0);
    const short = employeesList.reduce((sum, employee) => {
      const schedules = Array.isArray(employee?.schedules) ? employee.schedules : [];
      return sum + schedules.filter((day) => day?.shiftType === 'short').length;
    }, 0);
    const off = employeesList.reduce((sum, employee) => {
      const schedules = Array.isArray(employee?.schedules) ? employee.schedules : [];
      return sum + schedules.filter((day) => day?.dayOff).length;
    }, 0);
    return { standard, short, off };
  }, [data.employees]);

  return (
    <div className="workload-page">
      <div className="workload-page-heading">
        <div>
          <div className="workload-eyebrow">RESOURCE MANAGEMENT</div>
          <h1>Workload Dashboard</h1>
          <p>วิเคราะห์ภาระงานและวางแผนกำลังคนจาก Planned Hours เทียบกับ Capacity ตามตารางทำงานจริง</p>
        </div>
        <Badge bg="primary" className="workload-mock-badge">Mock Data · Frontend</Badge>
      </div>

      <Card className="workload-toolbar border-0 shadow-sm mb-3">
        <Card.Body>
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div className="workload-period-tabs" role="group" aria-label="ช่วงเวลาการแสดงผล">
              {PERIODS.map((option) => <button key={option.key} type="button" className={period === option.key ? 'active' : ''} onClick={() => setPeriod(option.key)}>{option.label}</button>)}
            </div>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <Form.Control aria-label="วันที่อ้างอิง" type="date" size="sm" value={referenceDate} onChange={(event) => setReferenceDate(event.target.value)} className="workload-date-control" />
              <Button variant="outline-primary" size="sm" onClick={() => setReferenceDate(toISODate(new Date()))}>วันนี้</Button>
            </div>
          </div>
          <div className="workload-toolbar-bottom">
            <span>ช่วงข้อมูล: <strong>{fmtDate(range.start)} – {fmtDate(range.end)}</strong></span>
            <div className="d-flex flex-wrap gap-2">
              <Form.Select size="sm" value={department} onChange={handleDepartmentChange} aria-label="กรอง Section (แผนก)">
                <option value="all">ทุก Section (แผนก)</option>
                {MOCK_DEPARTMENTS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Form.Select>
              <Form.Select size="sm" value={position} onChange={(event) => setPosition(event.target.value)} aria-label="กรอง Sub-section (ตำแหน่ง)">
                <option value="all">ทุก Sub-section (ตำแหน่ง)</option>
                {availablePositions.map((item) => <option key={item} value={item}>{item}</option>)}
              </Form.Select>
              <Form.Select size="sm" value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} aria-label="กรองโปรเจกต์">
                <option value="all">ทุกโปรเจกต์</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </Form.Select>
              <Form.Control size="sm" placeholder="ค้นหาพนักงาน..." value={search} onChange={(event) => setSearch(event.target.value)} aria-label="ค้นหาพนักงาน" />
            </div>
          </div>
        </Card.Body>
      </Card>

      <Row className="g-3 mb-3">
        <Col xl={3} sm={6}>
          <Card className="workload-kpi h-100"><Card.Body><div className="workload-kpi-label">Total Team Capacity</div><div className="workload-kpi-value">{fmtHours(data.capacityHours)}</div><div className="workload-kpi-foot">ความจุรวมของ {data.employees.length} คน</div></Card.Body></Card>
        </Col>
        <Col xl={3} sm={6}>
          <Card className="workload-kpi h-100"><Card.Body><div className="workload-kpi-label">Planned Workload</div><div className="workload-kpi-value text-primary">{fmtHours(data.plannedHours)}</div><div className="workload-kpi-foot">ชั่วโมงงานที่วางแผนจัดสรร</div></Card.Body></Card>
        </Col>
        <Col xl={3} sm={6}>
          <Card className="workload-kpi h-100"><Card.Body><div className="workload-kpi-label">Team Utilization</div><div className="workload-kpi-value">{data.utilization.toFixed(1)}%</div><div className="workload-kpi-foot">Planned ÷ Capacity</div><ProgressBar now={Math.min(data.utilization, 100)} variant={getStatus(data.utilization)} className="mt-2" /></Card.Body></Card>
        </Col>
        <Col xl={3} sm={6}>
          <Card className="workload-kpi h-100"><Card.Body><div className="workload-kpi-label">Overcapacity Alerts</div><div className={`workload-kpi-value ${data.overCapacity ? 'text-danger' : 'text-success'}`}>{data.overCapacity} <small>คน</small></div><div className="workload-kpi-foot">พนักงานที่ Planned Hours เกิน Capacity</div></Card.Body></Card>
        </Col>
      </Row>

      <Row className="g-3 mb-3">
        <Col xl={8}>
          <Card className="workload-panel h-100">
            <Card.Header><div><h2>Team Workload vs. Maximum Capacity</h2><p>คลิกแถวพนักงานเพื่อดูรายละเอียด Planned Hours แยกตามโปรเจกต์</p></div><div className="workload-chart-legend"><span><i className="normal"/> Normal Load</span><span><i className="over"/> Overcapacity</span><span><i className="cap"/> Capacity</span></div></Card.Header>
            <Card.Body>
              <div className="workload-employee-chart">
                {data.employees.map((employee) => {
                  const width = Math.max(0, Math.min(employee.percent, 130) / 130 * 100);
                  return <button type="button" key={employee.id} className="workload-employee-row" onClick={() => setSelectedEmployee(employee)} title={`ดูรายละเอียด ${employee.name}`}>
                    <span className="workload-employee-name"><strong>{employee.name}</strong><small>{employee.position}</small></span>
                    <span className="workload-employee-track"><span className={`workload-employee-fill ${employee.percent > 100 ? 'is-over' : ''}`} style={{ width: `${width}%` }}/><span className="workload-cap-marker" style={{ left: `${100 / 130 * 100}%` }}/></span>
                    <span className="workload-employee-number"><strong>{employee.plannedHours.toFixed(1)}</strong><small> / {employee.capacityHours.toFixed(1)} ชม. · {employee.percent.toFixed(0)}%</small></span>
                  </button>;
                })}
                {!data.employees.length && <div className="text-center text-muted py-5">ไม่พบข้อมูลพนักงานตามตัวกรอง</div>}
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xl={4}>
          <Card className="workload-panel h-100">
            <Card.Header><div><h2>Schedule Overview</h2><p>รูปแบบตารางทำงานในช่วงที่เลือก</p></div></Card.Header>
            <Card.Body>
              <div className="workload-schedule-pattern"><span>{period === 'weekly' ? 'รูปแบบวันหยุดสัปดาห์นี้' : 'รูปแบบวันหยุด'}</span><strong>{weekPattern === 'weekend' ? 'หยุดเสาร์–อาทิตย์' : weekPattern === 'sunday-only' ? 'หยุดวันอาทิตย์' : 'สลับตามรูปแบบของแต่ละสัปดาห์'}</strong></div>
              <div className="workload-schedule-stat"><span className="schedule-dot standard"/> Standard 08:00–17:00 <strong>{shiftSummary.standard} วันคน</strong></div>
              <div className="workload-schedule-stat"><span className="schedule-dot short"/> Short 08:00–15:00 <strong>{shiftSummary.short} วันคน</strong></div>
              <div className="workload-schedule-stat"><span className="schedule-dot off"/> วันหยุด <strong>{shiftSummary.off} วันคน</strong></div>
              <div className="workload-schedule-note"><strong>เวลาทำงานสุทธิ</strong><br/>Standard: 7 ชม. 40 นาที / วัน<br/>Short: 5 ชม. 40 นาที / วัน<br/><small>หักเวลาพักรวม 80 นาทีแล้ว</small></div>
              <div className="workload-daily-summary-title">Daily Team Load</div>
              <div className="workload-daily-bars">
                {dailySummary.map((day) => <div className="workload-daily-item" key={day.key} title={`${day.label} · ${day.planned.toFixed(1)} / ${day.capacity.toFixed(1)} ชม.`}><div className="workload-daily-bar-track"><span style={{ height: `${Math.min(day.percent, 120) / 120 * 100}%` }} className={day.percent > 100 ? 'is-over' : ''}/></div><small>{period === 'yearly' ? day.label : DAY_LABELS[parseISODate(day.start).getDay()]}</small></div>)}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <WorkloadMatrix
        employees={MOCK_EMPLOYEES}
        department={department}
        position={position}
        projectFilter={projectFilter}
        search={search}
      />

      <Card className="workload-panel workload-advisory">
        <Card.Header><div><h2>Resource Planning Advisory</h2><p>ข้อสังเกตจากการจัดสรร Planned Hours ในช่วงที่เลือก</p></div><Badge bg={data.overCapacity ? 'danger' : 'success'}>{data.overCapacity ? 'Action Required' : 'Within Capacity'}</Badge></Card.Header>
        <Card.Body>
          {data.overCapacity > 0 ? <div className="workload-advisory-alert"><strong>พบพนักงาน {data.overCapacity} คนที่มีภาระงานเกิน Capacity</strong><span>ควรพิจารณากระจายงานไปยังพนักงานที่ยังมี Capacity เหลือ หรือปรับแผนกำหนดส่งของงานที่ไม่เร่งด่วน</span></div> : <div className="workload-advisory-good"><strong>ยังไม่พบพนักงานที่มีภาระงานเกิน Capacity</strong><span>สามารถพิจารณาจัดสรรงานเพิ่มเติมให้พนักงานที่มี Utilization ต่ำกว่า 80%</span></div>}
          <Row className="g-2 mt-1">{data.employees.filter((employee) => employee.percent > 100).slice(0, 4).map((employee) => <Col md={6} key={employee.id}><div className="workload-advisory-person"><strong>{employee.name}</strong><Badge bg="danger">{employee.percent.toFixed(0)}%</Badge><small>{(employee.plannedHours - employee.capacityHours).toFixed(1)} ชม. เกิน Capacity</small></div></Col>)}</Row>
        </Card.Body>
      </Card>

      <EmployeeWorkloadDetailModal
        show={!!selectedEmployee}
        onHide={() => setSelectedEmployee(null)}
        employee={selectedDetails}
        range={range}
        period={period}
      />
    </div>
  );
}
