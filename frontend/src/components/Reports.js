// frontend/src/components/Reports.js — หน้ารายงาน: ภาพรวมผู้บริหาร (บนสุด, reports/ExecutiveOverview.js) + สถิติสรุปเดิม
// คำนวณสถิติและตัวชี้วัดจาก MockDataContext (Projects + Tasks) — รายงานตามข้อมูลล่าสุด
// ตัดส่วนชั่วโมงตามแผนก / การ์ด Trainee / ชั่วโมงบันทึกสะสมออกแล้ว (ข้อมูลว่าง แสดง 0 หรือชื่อตายตัว — ไม่เก็บชั่วโมงทำงานแล้ว)
import React, { useMemo } from 'react';
import { Card, Row, Col, ProgressBar } from 'react-bootstrap';
import { useMockData } from '../context/MockDataContext';
import ExecutiveOverview from './reports/ExecutiveOverview';
import { Folder } from './common/Icons';

export default function Reports() {
  // Projects + Tasks จาก Context — สถิติรายงานตามข้อมูลล่าสุดจากหน้าโปรเจกต์/งาน (mock-only phase)
  const { projects: projectsList, tasks: tasksList } = useMockData();

  // วันนี้ตามเวลาเครื่อง (YYYY-MM-DD)
  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // 1. สรุปข้อมูลโปรเจกต์
  const totalProjects = projectsList.length;
  const completedProjects = projectsList.filter((p) => p.status === 'done' || p.status === 'completed').length;
  const projectCompletionRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;

  // 2. สรุปข้อมูลงาน
  const totalTasks = tasksList.length;
  const completedTasks = tasksList.filter((t) => t.status === 'completed').length;
  const unfinishedTasks = totalTasks - completedTasks;
  const overdueTasks = tasksList.filter((t) => t.status !== 'completed' && t.dueDate && t.dueDate < today).length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // 3. สรุปงานแยกตามประเภท (Categories)
  const categoryStats = useMemo(() => {
    const counts = {};
    tasksList.forEach((t) => {
      const cat = t.category || 'ทั่วไป';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
      pct: totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0,
    }));
  }, [tasksList, totalTasks]);

  return (
    <div className="reports-container">
      {/* ── แถบหัวข้อ ─────────────────────────────────────────── */}
      <div className="mb-4">
        <h1 className="page-title mb-1">รายงาน</h1>
        <p className="text-muted small mb-0">
          ภาพรวมทุกโปรเจกต์สำหรับผู้บริหาร — คำนวณจากงานที่ทีมอัปเดตอยู่แล้ว ไม่ต้องทำรายงานเพิ่ม
        </p>
      </div>

      <ExecutiveOverview />

      <h2 className="h5 fw-bold text-ink mb-3">สถิติสรุป</h2>

      {/* ── การ์ดสรุปตัวชี้วัดหลัก 4 ใบ ─────────────────────────── */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} lg={4}>
          <Card className="border-0 shadow-sm p-3 h-100 bg-white">
            <span className="small text-muted fw-medium mb-1">อัตราความสำเร็จโปรเจกต์</span>
            <div className="h3 fw-bold text-primary mb-1">{projectCompletionRate}%</div>
            <div className="small text-muted">
              เสร็จ {completedProjects} จาก {totalProjects} โปรเจกต์
            </div>
            <ProgressBar now={projectCompletionRate} variant="primary" className="mt-2" style={{ height: 6 }} />
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={4}>
          <Card className="border-0 shadow-sm p-3 h-100 bg-white">
            <span className="small text-muted fw-medium mb-1">อัตราความสำเร็จงาน</span>
            <div className="h3 fw-bold text-success mb-1">{taskCompletionRate}%</div>
            <div className="small text-muted">
              เสร็จ {completedTasks} จาก {totalTasks} งาน
            </div>
            <ProgressBar now={taskCompletionRate} variant="success" className="mt-2" style={{ height: 6 }} />
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={4}>
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

      </Row>

      {/* ── แถวที่ 3: สัดส่วนงานแยกตามประเภท ─────────────────────── */}
      <Card className="border-0 shadow-sm bg-white">
        <Card.Header className="bg-white border-bottom py-3 px-3">
          <div className="d-flex align-items-center gap-2">
            <div className="panel-icon-wrap text-primary">
              <Folder size={18} />
            </div>
            <h3 className="panel-title mb-0">สัดส่วนงานแยกตามหมวดหมู่</h3>
          </div>
        </Card.Header>
        <Card.Body className="p-3">
          {/* row-cols-*: จอเล็ก 2 คอลัมน์/แถว → md 3 → lg 5 (เทียบเท่าเดิม xs={6} md={4} lg~2.4 แต่ใช้ค่าที่ Bootstrap รองรับ) */}
          <Row className="g-3 row-cols-2 row-cols-md-3 row-cols-lg-5">
            {categoryStats.map((cat) => (
              <Col key={cat.name}>
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
