import React, { useMemo, useState } from 'react';
import { Badge, Button, Card, Col, Form, Modal, ProgressBar, Row, Table } from 'react-bootstrap';
import { MOCK_EMPLOYEES, MOCK_DEPARTMENTS, MOCK_PROJECTS, MOCK_TASKS } from '../data/mockData';
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
import EmployeeDetailModal from './EmployeeDetailModal';

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
const getStatus = (percent) => (percent >= 100 ? 'danger' : percent >= 90 ? 'warning' : 'success');

const PRIORITY_ORDER = { urgent: 4, high: 3, normal: 2, low: 1 };
const PRIORITY_META = {
  urgent: { label: 'Urgent', bg: 'danger' },
  high: { label: 'High', bg: 'warning' },
  normal: { label: 'Normal', bg: 'primary' },
  low: { label: 'Low', bg: 'secondary' },
};

export default function Workload() {
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
    [department, position, search]
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
    return rangeDates.map((date) => ({
      key: date,
      start: date,
      end: date,
      label: `${DAY_LABELS[parseISODate(date).getDay()]} ${parseISODate(date).getDate()}/${parseISODate(date).getMonth() + 1}`,
    }));
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
  }, [matrixBuckets, data?.employees, data?.entries]);

  const projects = useMemo(() => {
    if (!Array.isArray(MOCK_PROJECTS)) return [];
    const entriesList = Array.isArray(data?.entries) ? data.entries : [];
    return MOCK_PROJECTS.filter((project) => entriesList.some((entry) => entry.projectId === project.id));
  }, [data?.entries]);

  const selectedDetails = selectedEmployee
    ? (data.employees || []).find((emp) => emp.id === selectedEmployee.id) || selectedEmployee
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
  }, [data?.employees]);

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
              {PERIODS.map((option) => (
                <button key={option.key} type="button" className={period === option.key ? 'active' : ''} onClick={() => setPeriod(option.key)}>
                  {option.label}
                </button>
              ))}
            </div>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <Form.Control aria-label="วันที่อ้างอิง" type="date" size="sm" value={referenceDate} onChange={(e) => setReferenceDate(e.target.value)} className="workload-date-control" />
              <Button variant="outline-primary" size="sm" onClick={() => setReferenceDate(toISODate(new Date()))}>วันนี้</Button>
            </div>
          </div>
          <div className="workload-toolbar-bottom">
            <span>ช่วงข้อมูล: <strong>{fmtDate(range.start)} – {fmtDate(range.end)}</strong></span>
            <div className="d-flex flex-wrap gap-2">
              <Form.Select size="sm" value={department} onChange={handleDepartmentChange} aria-label="กรอง Section (แผนก)">
                <option value="all">ทุก Section (แผนก)</option>
                {MOCK_DEPARTMENTS.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </Form.Select>
              <Form.Select size="sm" value={position} onChange={(e) => setPosition(e.target.value)} aria-label="กรอง Sub-section (ตำแหน่ง)">
                <option value="all">ทุก Sub-section (ตำแหน่ง)</option>
                {availablePositions.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </Form.Select>
              <Form.Select size="sm" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} aria-label="กรองโปรเจกต์">
                <option value="all">ทุกโปรเจกต์</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </Form.Select>
              <Form.Control size="sm" placeholder="ค้นหาพนักงาน..." value={search} onChange={(e) => setSearch(e.target.value)} aria-label="ค้นหาพนักงาน" />
            </div>
          </div>
        </Card.Body>
      </Card>

      <Row className="g-3 mb-3">
        <Col xl={3} sm={6}>
          <Card className="workload-kpi h-100"><Card.Body>
            <div className="workload-kpi-label">Total Team Capacity</div>
            <div className="workload-kpi-value">{fmtHours(data.capacityHours)}</div>
            <div className="workload-kpi-foot">ความจุรวมของ {data.employees.length} คน</div>
          </Card.Body></Card>
        </Col>
        <Col xl={3} sm={6}>
          <Card className="workload-kpi h-100"><Card.Body>
            <div className="workload-kpi-label">Planned Workload</div>
            <div className="workload-kpi-value text-primary">{fmtHours(data.plannedHours)}</div>
            <div className="workload-kpi-foot">ชั่วโมงงานที่วางแผนจัดสรร</div>
          </Card.Body></Card>
        </Col>
        <Col xl={3} sm={6}>
          <Card className="workload-kpi h-100"><Card.Body>
            <div className="workload-kpi-label">Team Utilization</div>
            <div className="workload-kpi-value">{data.utilization.toFixed(1)}%</div>
            <div className="workload-kpi-foot">Planned ÷ Capacity</div>
            <ProgressBar now={Math.min(data.utilization, 100)} variant={getStatus(data.utilization)} className="mt-2" />
          </Card.Body></Card>
        </Col>
        <Col xl={3} sm={6}>
          <Card className="workload-kpi h-100"><Card.Body>
            <div className="workload-kpi-label">Overcapacity Alerts</div>
            <div className={`workload-kpi-value ${data.overCapacity ? 'text-danger' : 'text-success'}`}>
              {data.overCapacity} <small>คน</small>
            </div>
            <div className="workload-kpi-foot">พนักงานที่ Planned Hours เกิน Capacity</div>
          </Card.Body></Card>
        </Col>
      </Row>

      <Row className="g-3 mb-3">
        <Col xl={8}>
          <Card className="workload-panel h-100">
            <Card.Header>
              <div>
                <h2>Team Workload vs. Maximum Capacity</h2>
                <p>คลิกแถวพนักงานเพื่อดูรายละเอียด Planned Hours แยกตามโปรเจกต์</p>
              </div>
              <div className="workload-chart-legend">
                <span><i className="normal"/> Normal Load</span>
                <span><i className="over"/> Overcapacity</span>
                <span><i className="cap"/> Capacity</span>
              </div>
            </Card.Header>
            <Card.Body>
              <div className="workload-employee-chart">
                {data.employees.map((employee) => {
                  const width = Math.max(0, Math.min(employee.percent, 130) / 130 * 100);
                  return (
                    <button type="button" key={employee.id} className="workload-employee-row" onClick={() => setSelectedEmployee(employee)} title={`ดูรายละเอียด ${employee.name}`}>
                      <span className="workload-employee-name"><strong>{employee.name}</strong><small>{employee.position}</small></span>
                      <span className="workload-employee-track">
                        <span className={`workload-employee-fill ${employee.percent > 100 ? 'is-over' : ''}`} style={{ width: `${width}%` }} />
                        <span className="workload-cap-marker" style={{ left: `${100 / 130 * 100}%` }} />
                      </span>
                      <span className="workload-employee-number"><strong>{employee.plannedHours.toFixed(1)}</strong> <small>/ {employee.capacityHours.toFixed(1)} ชม. · {employee.percent.toFixed(0)}%</small></span>
                    </button>
                  );
                })}
                {!data.employees.length && <div className="text-center text-muted py-5">ไม่พบข้อมูลพนักงานตามตัวกรอง</div>}
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xl={4}>
          <Card className="workload-panel h-100">
            <Card.Header>
              <div><h2>Schedule Overview</h2><p>รูปแบบตารางทำงานในช่วงที่เลือก</p></div>
            </Card.Header>
            <Card.Body>
              <div className="workload-schedule-pattern"><span>{period === 'weekly' ? 'รูปแบบวันหยุดสัปดาห์นี้' : 'รูปแบบวันหยุด'}</span><strong>{weekPattern === 'weekend' ? 'หยุดเสาร์–อาทิตย์' : weekPattern === 'sunday-only' ? 'หยุดวันอาทิตย์' : 'สลับตามรูปแบบของแต่ละสัปดาห์'}</strong></div>
              <div className="workload-schedule-stat"><span className="schedule-dot standard"/> Standard 08:00–17:00 <strong>{shiftSummary.standard} วันคน</strong></div>
              <div className="workload-schedule-stat"><span className="schedule-dot short"/> Short 08:00–15:00 <strong>{shiftSummary.short} วันคน</strong></div>
              <div className="workload-schedule-stat"><span className="schedule-dot off"/> วันหยุด <strong>{shiftSummary.off} วันคน</strong></div>
              <div className="workload-schedule-note"><strong>เวลาทำงานสุทธิ</strong><br/>Standard: 7 ชม. 40 นาที / วัน<br/>Short: 5 ชม. 40 นาที / วัน<br/><small>หักเวลาพักรวม 80 นาทีแล้ว</small></div>
              <div className="workload-daily-summary-title">Daily Team Load</div>
              <div className="workload-daily-bars">
                {dailySummary.map((day) => (
                  <div className="workload-daily-item" key={day.key} title={`${day.label} · ${day.planned.toFixed(1)} / ${day.capacity.toFixed(1)} ชม.`}>
                    <div className="workload-daily-bar-track"><span style={{ height: `${Math.min(day.percent, 120) / 120 * 100}%` }} className={day.percent > 100 ? 'is-over' : ''} /></div>
                    <small>{period === 'yearly' ? day.label : DAY_LABELS[parseISODate(day.start).getDay()]}</small>
                  </div>
                ))}
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
          {data.overCapacity > 0 ? (
            <div className="workload-advisory-alert"><strong>พบพนักงาน {data.overCapacity} คนที่มีภาระงานเกิน Capacity</strong><span>ควรพิจารณากระจายงานไปยังพนักงานที่ยังมี Capacity เหลือ หรือปรับแผนกำหนดส่งของงานที่ไม่เร่งด่วน</span></div>
          ) : (
            <div className="workload-advisory-good"><strong>ยังไม่พบพนักงานที่มีภาระงานเกิน Capacity</strong><span>สามารถพิจารณาจัดสรรงานเพิ่มเติมให้พนักงานที่มี Utilization ต่ำกว่า 80%</span></div>
          )}
          <Row className="g-2 mt-1">
            {data.employees.filter((employee) => employee.percent > 100).slice(0, 4).map((employee) => (
              <Col md={6} key={employee.id}>
                <div className="workload-advisory-person"><strong>{employee.name}</strong><Badge bg="danger">{employee.percent.toFixed(0)}%</Badge><small>{(employee.plannedHours - employee.capacityHours).toFixed(1)} ชม. เกิน Capacity</small></div>
              </Col>
            ))}
          </Row>
        </Card.Body>
      </Card>

      <EmployeeDetailModal
        show={!!selectedEmployee}
        onHide={() => setSelectedEmployee(null)}
        employee={selectedDetails}
        range={range}
        period={period}
      />
    </div>
  );
}
