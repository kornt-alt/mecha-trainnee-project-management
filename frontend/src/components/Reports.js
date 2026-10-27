// frontend/src/components/Reports.js — หน้ารายงานสรุปผลการดำเนินงาน (Reports & Analytics)
// คำนวณสถิติและตัวชี้วัดทั้งหมดจาก MOCK Data กลาง (Single Source of Truth)
import React, { useMemo } from 'react';
import { Card, Row, Col, ProgressBar, Table, Badge } from 'react-bootstrap';
import {
  MOCK_PROJECTS,
  MOCK_TASKS,
  MOCK_EMPLOYEES,
  MOCK_DEPARTMENTS,
  MOCK_WORK_ENTRIES,
} from '../data/mockData';
import {
  ChartPie,
  Folder,
  UserRound,
} from './common/Icons';

export default function Reports() {
  // วันนี้ตามเวลาเครื่อง (YYYY-MM-DD)
  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // 1. สรุปข้อมูลโปรเจกต์
  const totalProjects = MOCK_PROJECTS.length;
  const completedProjects = MOCK_PROJECTS.filter((p) => p.status === 'done' || p.status === 'completed').length;
  const projectCompletionRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;

  // 2. สรุปข้อมูลงาน
  const totalTasks = MOCK_TASKS.length;
  const completedTasks = MOCK_TASKS.filter((t) => t.status === 'completed').length;
  const unfinishedTasks = totalTasks - completedTasks;
  const overdueTasks = MOCK_TASKS.filter((t) => t.status !== 'completed' && t.dueDate && t.dueDate < today).length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // 3. สรุปงานแยกตามประเภท (Categories)
  const categoryStats = useMemo(() => {
    const counts = {};
    MOCK_TASKS.forEach((t) => {
      const cat = t.category || 'ทั่วไป';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
      pct: totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0,
    }));
  }, [totalTasks]);

  // 4. สรุปชั่วโมงทำงานแยกตามแผนก (Hours by Department)
  const departmentStats = useMemo(() => {
    const empDeptMap = new Map(MOCK_EMPLOYEES.map((e) => [e.id, e.departmentId]));
    const hoursByDept = {};

    MOCK_WORK_ENTRIES.forEach((w) => {
      const deptId = empDeptMap.get(w.employeeId) || 'dept-1';
      hoursByDept[deptId] = (hoursByDept[deptId] || 0) + Number(w.hours || 0);
    });

    const totalHours = Object.values(hoursByDept).reduce((sum, h) => sum + h, 0);

    return MOCK_DEPARTMENTS.map((dept) => {
      const hours = hoursByDept[dept.id] || 0;
      const deptProjects = MOCK_PROJECTS.filter((p) => p.departmentId === dept.id).length;
      return {
        ...dept,
        hours,
        projectsCount: deptProjects,
        pct: totalHours > 0 ? Math.round((hours / totalHours) * 100) : 0,
      };
    }).sort((a, b) => b.hours - a.hours);
  }, []);

  // 5. สถิติของ Trainee (emp-001 Kittipat Samran)
  const traineeTasks = MOCK_TASKS.filter((t) => t.assigneeId === 'emp-001');
  const traineeCompleted = traineeTasks.filter((t) => t.status === 'completed').length;
  const traineeHours = MOCK_WORK_ENTRIES
    .filter((w) => w.employeeId === 'emp-001')
    .reduce((sum, w) => sum + Number(w.hours || 0), 0);

  return (
    <div className="reports-container">
      {/* ── แถบหัวข้อ ─────────────────────────────────────────── */}
      <div className="mb-4">
        <h1 className="page-title mb-1">รายงานสรุป (Reports & Analytics)</h1>
        <p className="text-muted small mb-0">
          สถิติภาพรวมผลการดำเนินงาน อัตราความสำเร็จ และการกระจายชั่วโมงทำงานตามแผนก
        </p>
      </div>

      {/* ── การ์ดสรุปตัวชี้วัดหลัก 4 ใบ ─────────────────────────── */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} lg={3}>
          <Card className="border-0 shadow-sm p-3 h-100 bg-white">
            <span className="small text-muted fw-medium mb-1">อัตราความสำเร็จโปรเจกต์</span>
            <div className="h3 fw-bold text-primary mb-1">{projectCompletionRate}%</div>
            <div className="small text-muted">
              เสร็จ {completedProjects} จาก {totalProjects} โปรเจกต์
            </div>
            <ProgressBar now={projectCompletionRate} variant="primary" className="mt-2" style={{ height: 6 }} />
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <Card className="border-0 shadow-sm p-3 h-100 bg-white">
            <span className="small text-muted fw-medium mb-1">อัตราความสำเร็จงาน</span>
            <div className="h3 fw-bold text-success mb-1">{taskCompletionRate}%</div>
            <div className="small text-muted">
              เสร็จ {completedTasks} จาก {totalTasks} งาน
            </div>
            <ProgressBar now={taskCompletionRate} variant="success" className="mt-2" style={{ height: 6 }} />
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <Card className="border-0 shadow-sm p-3 h-100 bg-white">
            <span className="small text-muted fw-medium mb-1">งานค้างและเลยกำหนด</span>
            <div className="h3 fw-bold text-danger mb-1">{overdueTasks} <small className="h6 text-muted">เลยกำหนด</small></div>
            <div className="small text-muted">
              จากงานค้างทั้งหมด {unfinishedTasks} รายการ
            </div>
            <ProgressBar
              now={unfinishedTasks > 0 ? (overdueTasks / unfinishedTasks) * 100 : 0}
              variant="danger"
              className="mt-2"
              style={{ height: 6 }}
            />
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <Card className="border-0 shadow-sm p-3 h-100 bg-white">
            <span className="small text-muted fw-medium mb-1">ชั่วโมงบันทึกสะสม</span>
            <div className="h3 fw-bold text-ink mb-1">
              {MOCK_WORK_ENTRIES.reduce((sum, w) => sum + Number(w.hours || 0), 0)} <small className="h6 text-muted">ชม.</small>
            </div>
            <div className="small text-muted">
              บันทึกงาน {MOCK_WORK_ENTRIES.length} รายการ
            </div>
            <ProgressBar now={100} variant="info" className="mt-2" style={{ height: 6 }} />
          </Card>
        </Col>
      </Row>

      {/* ── แถวที่ 2: สถิติแผนก & ผลงาน Trainee ─────────────────── */}
      <Row className="g-4 mb-4">
        {/* สรุปชั่วโมงและโปรเจกต์แยกตามแผนก */}
        <Col lg={7} xs={12}>
          <Card className="border-0 shadow-sm h-100 bg-white">
            <Card.Header className="bg-white border-bottom py-3 px-3">
              <div className="d-flex align-items-center gap-2">
                <div className="panel-icon-wrap text-primary">
                  <ChartPie size={18} />
                </div>
                <h3 className="panel-title mb-0">ชั่วโมงทำงานและโปรเจกต์ตามแผนก</h3>
              </div>
            </Card.Header>
            <Card.Body className="p-3">
              <Table hover responsive className="align-middle mb-0">
                <thead>
                  <tr>
                    <th>แผนก</th>
                    <th className="text-center">โปรเจกต์</th>
                    <th className="text-end">ชั่วโมงประมาณการ</th>
                    <th style={{ width: 140 }}>สัดส่วน</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentStats.map((dept) => (
                    <tr key={dept.id}>
                      <td>
                        <span className="fw-semibold text-ink d-block small">{dept.name}</span>
                        <span className="text-muted small">รหัส: {dept.code}</span>
                      </td>
                      <td className="text-center">
                        <Badge bg="light" text="dark" className="border">
                          {dept.projectsCount}
                        </Badge>
                      </td>
                      <td className="text-end fw-semibold text-ink small">
                        {dept.hours.toLocaleString()} ชม.
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <ProgressBar now={dept.pct} variant="primary" style={{ height: 6, flex: 1 }} />
                          <span className="small text-muted" style={{ minWidth: 32 }}>{dept.pct}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>

        {/* รายงานผลการฝึกงาน Trainee */}
        <Col lg={5} xs={12}>
          <Card className="border-0 shadow-sm h-100 bg-white">
            <Card.Header className="bg-white border-bottom py-3 px-3">
              <div className="d-flex align-items-center gap-2">
                <div className="panel-icon-wrap text-primary">
                  <UserRound size={18} />
                </div>
                <h3 className="panel-title mb-0">รายงานความก้าวหน้า Trainee</h3>
              </div>
            </Card.Header>
            <Card.Body className="p-3">
              <div className="p-3 bg-light rounded mb-3">
                <div className="fw-semibold text-ink">Kittipat Samran</div>
                <div className="small text-muted">วิศวกรฝึกหัด (Mechanical Automation & Software)</div>
                <div className="small text-muted mt-1">พี่เลี้ยง: Supachai Meesuk</div>
              </div>

              <div className="d-flex flex-column gap-3">
                <div className="d-flex justify-content-between align-items-center pb-2 border-bottom">
                  <span className="small text-muted">งานที่ได้รับมอบหมาย</span>
                  <span className="fw-bold text-ink">{traineeTasks.length} งาน</span>
                </div>
                <div className="d-flex justify-content-between align-items-center pb-2 border-bottom">
                  <span className="small text-muted">งานที่เสร็จสิ้นสมบูรณ์</span>
                  <span className="fw-bold text-success">{traineeCompleted} งาน</span>
                </div>
                <div className="d-flex justify-content-between align-items-center pb-2 border-bottom">
                  <span className="small text-muted">ชั่วโมงสะสมที่บันทึก</span>
                  <span className="fw-bold text-primary">{traineeHours} ชม.</span>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="small text-muted">อัตราความสำเร็จงาน</span>
                  <span className="fw-bold text-ink">
                    {traineeTasks.length > 0 ? Math.round((traineeCompleted / traineeTasks.length) * 100) : 0}%
                  </span>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ── แถวที่ 3: สัดส่วนงานแยกตามประเภท ─────────────────────── */}
      <Card className="border-0 shadow-sm bg-white">
        <Card.Header className="bg-white border-bottom py-3 px-3">
          <div className="d-flex align-items-center gap-2">
            <div className="panel-icon-wrap text-primary">
              <Folder size={18} />
            </div>
            <h3 className="panel-title mb-0">สัดส่วนงานแยกตามประเภทความเชี่ยวชาญ (Work Categories)</h3>
          </div>
        </Card.Header>
        <Card.Body className="p-3">
          <Row className="g-3">
            {categoryStats.map((cat) => (
              <Col key={cat.name} xs={6} md={4} lg={2.4}>
                <div className="p-3 border rounded text-center h-100">
                  <span className="small text-muted d-block mb-1">{cat.name}</span>
                  <div className="h4 fw-bold text-ink mb-1">{cat.count} <small className="small fw-normal text-muted">งาน</small></div>
                  <span className="badge bg-light text-muted border">{cat.pct}% ของทั้งหมด</span>
                </div>
              </Col>
            ))}
          </Row>
        </Card.Body>
      </Card>
    </div>
  );
}
