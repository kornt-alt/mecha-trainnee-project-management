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
} from '../data/workloadMockData';
import './workload.css';

const PERIODS = [
  { key: 'daily', label: 'รายวัน' },
  { key: 'weekly', label: 'รายสัปดาห์' },
  { key: 'monthly', label: 'รายเดือน' },
  { key: 'yearly', label: 'รายปี' },
];
const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const DAY_LABELS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const fmtHours = (hours) => `${Number(hours || 0).toLocaleString('th-TH', { maximumFractionDigits: 1 })} ชม.`;
const fmtHM = (minutes) => `${Math.floor(minutes / 60)} ชม. ${minutes % 60} นาที`;
const fmtDate = (value) => {
  const date = parseISODate(value);
  return `${date.getDate()} ${THAI_MONTHS[date.getMonth()]} ${date.getFullYear() + 543}`;
};
const getStatus = (percent) => percent > 100 ? 'danger' : percent >= 80 ? 'warning' : percent >= 50 ? 'primary' : 'success';

export default function Workload() {
  const [period, setPeriod] = useState('weekly');
  const [referenceDate, setReferenceDate] = useState(() => toISODate(new Date()));
  const [department, setDepartment] = useState('all');
  const [position, setPosition] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const range = useMemo(() => getRange(period, referenceDate), [period, referenceDate]);

  const visibleEmployees = useMemo(() => {
    if (!Array.isArray(MOCK_EMPLOYEES)) return [];
    return MOCK_EMPLOYEES.filter((employee) => {
      const matchesDepartment = department === 'all' || employee.departmentId === department;
      const matchesPosition = position === 'all' || employee.position === position;
      const matchesSearch = `${employee.name} ${employee.position} ${employee.department}`.toLowerCase().includes(search.toLowerCase());
      return matchesDepartment && matchesPosition && matchesSearch;
    });
  }, [department, position, search]);

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
    if (!Array.isArray(MOCK_PROJECTS)) return [];
    const entriesList = Array.isArray(data?.entries) ? data.entries : [];
    return MOCK_PROJECTS.filter((project) => entriesList.some((entry) => entry.projectId === project.id));
  }, [data.entries]);

  const selectedDetails = selectedEmployee
    ? (data.employees || []).find((employee) => employee.id === selectedEmployee.id) || selectedEmployee
    : null;
  const selectedEntries = Array.isArray(selectedDetails?.entries)
    ? selectedDetails.entries.slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    : [];
  const selectedProjectTotals = selectedEntries.reduce((acc, entry) => {
    const project = (MOCK_PROJECTS || []).find((item) => item.id === entry.projectId);
    const key = project?.name || 'ไม่ระบุโปรเจกต์';
    acc[key] = (acc[key] || 0) + Number(entry.hours || 0);
    return acc;
  }, {});
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
              <Form.Select size="sm" value={department} onChange={(event) => setDepartment(event.target.value)} aria-label="กรองแผนก">
                <option value="all">ทุกแผนก</option>
                {MOCK_DEPARTMENTS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Form.Select>
              <Form.Select size="sm" value={position} onChange={(event) => setPosition(event.target.value)} aria-label="กรองตำแหน่ง">
                <option value="all">ทุกตำแหน่ง / Sub-section</option>
                {[...new Set(MOCK_EMPLOYEES.map((employee) => employee.position))].sort((a, b) => a.localeCompare(b, 'th')).map((item) => <option key={item} value={item}>{item}</option>)}
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

      <Card className="workload-panel mb-3">
        <Card.Header><div><h2>Workload Matrix</h2><p>เปรียบเทียบ Planned Hours กับ Capacity ของพนักงานตามช่วงเวลาที่เลือก</p></div><Badge bg="light" text="primary" className="border">{data.employees.length} Employees</Badge></Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive workload-matrix-wrap">
            <Table hover className="workload-matrix mb-0 align-middle">
              <thead><tr><th>EMPLOYEE</th><th>DEPARTMENT</th>{matrixBuckets.map((bucket) => <th key={bucket.key} className="text-center">{period === 'yearly' ? bucket.label : DAY_LABELS[parseISODate(bucket.start).getDay()]}<small>{period === 'yearly' ? '' : `${parseISODate(bucket.start).getDate()}/${parseISODate(bucket.start).getMonth() + 1}`}</small></th>)}<th className="text-end">PLANNED / CAP.</th></tr></thead>
              <tbody>{data.employees.map((employee) => <tr key={employee.id}>
                <td><button type="button" className="workload-matrix-employee" onClick={() => setSelectedEmployee(employee)}>{employee.name}</button><small className="d-block text-muted">{employee.position}</small></td>
                <td className="workload-matrix-dept">{employee.department}</td>
                {matrixBuckets.map((bucket) => {
                  const empEntries = Array.isArray(employee?.entries) ? employee.entries : [];
                  const empSchedules = Array.isArray(employee?.schedules) ? employee.schedules : [];
                  const planned = empEntries.filter((entry) => entry && entry.date >= bucket.start && entry.date <= bucket.end).reduce((sum, entry) => sum + Number(entry.hours || 0), 0);
                  const cap = empSchedules.filter((item) => item && item.date >= bucket.start && item.date <= bucket.end).reduce((sum, item) => sum + Number(item.capacityHours || 0), 0);
                  const pct = cap ? (planned / cap) * 100 : 0;
                  return <td key={bucket.key} className="text-center"><span className={`workload-matrix-cell ${!cap ? 'is-off' : pct > 100 ? 'is-over' : pct >= 80 ? 'is-high' : ''}`}>{!cap ? 'หยุด' : planned.toFixed(1)}{cap > 0 && <small> / {cap.toFixed(1)}</small>}</span></td>;
                })}
                <td className="text-end fw-semibold text-nowrap">{employee.plannedHours.toFixed(1)} / {employee.capacityHours.toFixed(1)}</td>
              </tr>)}</tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      <Card className="workload-panel workload-advisory">
        <Card.Header><div><h2>Resource Planning Advisory</h2><p>ข้อสังเกตจากการจัดสรร Planned Hours ในช่วงที่เลือก</p></div><Badge bg={data.overCapacity ? 'danger' : 'success'}>{data.overCapacity ? 'Action Required' : 'Within Capacity'}</Badge></Card.Header>
        <Card.Body>
          {data.overCapacity > 0 ? <div className="workload-advisory-alert"><strong>พบพนักงาน {data.overCapacity} คนที่มีภาระงานเกิน Capacity</strong><span>ควรพิจารณากระจายงานไปยังพนักงานที่ยังมี Capacity เหลือ หรือปรับแผนกำหนดส่งของงานที่ไม่เร่งด่วน</span></div> : <div className="workload-advisory-good"><strong>ยังไม่พบพนักงานที่มีภาระงานเกิน Capacity</strong><span>สามารถพิจารณาจัดสรรงานเพิ่มเติมให้พนักงานที่มี Utilization ต่ำกว่า 80%</span></div>}
          <Row className="g-2 mt-1">{data.employees.filter((employee) => employee.percent > 100).slice(0, 4).map((employee) => <Col md={6} key={employee.id}><div className="workload-advisory-person"><strong>{employee.name}</strong><Badge bg="danger">{employee.percent.toFixed(0)}%</Badge><small>{(employee.plannedHours - employee.capacityHours).toFixed(1)} ชม. เกิน Capacity</small></div></Col>)}</Row>
        </Card.Body>
      </Card>

      <Modal show={!!selectedEmployee} onHide={() => setSelectedEmployee(null)} size="lg" centered className="workload-detail-modal">
        <Modal.Header closeButton><div><Modal.Title>{selectedDetails?.name}</Modal.Title><div className="small text-muted">{selectedDetails?.position} · {selectedDetails?.department}</div></div></Modal.Header>
        <Modal.Body>
          {selectedDetails && <>
            <Row className="g-2 mb-3"><Col sm={4}><div className="workload-detail-stat"><small>Planned Hours</small><strong>{fmtHours(selectedDetails.plannedHours)}</strong></div></Col><Col sm={4}><div className="workload-detail-stat"><small>Capacity</small><strong>{fmtHours(selectedDetails.capacityHours)}</strong></div></Col><Col sm={4}><div className="workload-detail-stat"><small>Utilization</small><strong>{selectedDetails.percent.toFixed(1)}%</strong></div></Col></Row>
            <h6 className="fw-bold mb-2">Schedule รายวัน</h6>
            <div className="workload-detail-schedule">{(selectedDetails.schedules || []).map((day) => <div key={day.date}><span>{fmtDate(day.date)}</span><strong>{day.dayOff ? 'วันหยุด' : `${day.start}–${day.end}`}</strong><small>{day.dayOff ? '0 ชม.' : fmtHM(day.capacityMinutes)}</small></div>)}</div>
            <h6 className="fw-bold mt-4 mb-2">Planned Hours แยกตามโปรเจกต์</h6>
            {Object.entries(selectedProjectTotals).map(([name, hours]) => <div className="workload-project-total" key={name}><span>{name}</span><strong>{fmtHours(hours)}</strong></div>)}
            <h6 className="fw-bold mt-4 mb-2">Task Allocation</h6>
            <div className="table-responsive"><Table size="sm" className="align-middle"><thead><tr><th>วันที่</th><th>Task</th><th>Project</th><th className="text-end">Planned</th></tr></thead><tbody>{selectedEntries.map((entry) => { const task = MOCK_TASKS.find((item) => item.id === entry.taskId); const project = MOCK_PROJECTS.find((item) => item.id === entry.projectId); return <tr key={entry.id}><td className="text-nowrap">{fmtDate(entry.date)}</td><td>{task?.title || entry.taskId}</td><td>{project?.name || '-'}</td><td className="text-end text-nowrap">{fmtHours(entry.hours)}</td></tr>; })}</tbody></Table></div>
          </>}
        </Modal.Body>
      </Modal>
    </div>
  );
}
