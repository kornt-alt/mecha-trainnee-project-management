// frontend/src/components/Home.js — หน้าแรก Dashboard แสดงสถานะระบบและรายการงานที่ยังไม่เสร็จ
import React from 'react';
import { Alert, Row, Col, Spinner } from 'react-bootstrap';
import { useLoad } from '../utils/api';
import { CURRENT_USER, MOCK_TASKS, MOCK_PROJECTS_FALLBACK } from '../data/mockData';
import UnfinishedTasks from './dashboard/UnfinishedTasks';
import SummaryCards from './dashboard/SummaryCards';
import ProjectStatusChart from './dashboard/ProjectStatusChart';
import EmployeeWorkloadChart from './dashboard/EmployeeWorkloadChart';
import { Info, CircleAlert, CircleCheck } from './common/Icons';

export default function Home() {
  // 1. เรียก API ตรวจสอบสถานะ backend/DB และรายการโปรเจกต์จริง
  const { data: healthData, error: healthError, loading: healthLoading } = useLoad('/health');
  const { data: projectsData, error: projectsError, loading: projectsLoading } = useLoad('/projects');

  // ตรวจสอบว่าระบบเชื่อมต่อ backend ได้หรือไม่
  const isBackendConnected = !healthError && healthData && healthData.status === 'ok';
  const isDbReady = isBackendConnected && healthData.db === 'up';

  // รายการงาน (Tasks) จำลองสำหรับ Mecha Trainee Dashboard
  const tasks = MOCK_TASKS;

  // รายการโปรเจกต์: ใช้ข้อมูลจาก API ถ้ามี ไม่เช่นนั้นใช้ชุดตัวอย่าง (ไม่ duplicate แหล่งข้อมูล)
  const projects = Array.isArray(projectsData) && projectsData.length > 0 ? projectsData : MOCK_PROJECTS_FALLBACK;

  // วันนี้ตามเวลาเครื่อง (YYYY-MM-DD)
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // คำนวณวันที่ในอีก 7 วันข้างหน้าสำหรับงานที่ใกล้ถึงกำหนดส่ง
  const sevenDaysLaterDate = new Date();
  sevenDaysLaterDate.setDate(sevenDaysLaterDate.getDate() + 7);
  const sevenDaysLater = `${sevenDaysLaterDate.getFullYear()}-${String(sevenDaysLaterDate.getMonth() + 1).padStart(2, '0')}-${String(sevenDaysLaterDate.getDate()).padStart(2, '0')}`;

  // คำนวณตัวเลขสำหรับสรุปข้อมูล
  const unfinishedTasks = tasks.filter((t) => t.status !== 'completed');
  const dueSoonTasks = tasks.filter((t) => {
    return t.status !== 'completed' && t.dueDate && t.dueDate >= today && t.dueDate <= sevenDaysLater;
  });

  return (
    <div className="dashboard-container">
      {/* ── แถบทักทายผู้ใช้ (Welcome Banner) ──────────────────── */}
      <div className="welcome-banner text-white mb-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="welcome-tag">Mecha Trainee Portal</span>
            </div>
            <h1 className="welcome-title h3 mb-2">
              สวัสดี, {CURRENT_USER.name}
            </h1>
            <p className="welcome-subtitle mb-0">
              ตรวจสอบความคืบหน้าของงานและโปรเจกต์ที่ได้รับมอบหมายได้ที่นี่ (Track your assigned tasks and monitor project progress from one place.)
            </p>
          </div>

          <div className="welcome-stats-pill d-none d-lg-flex align-items-center gap-3 bg-white text-ink p-3 rounded shadow-sm">
            <div className="welcome-stat-item text-center">
              <span className="d-block small text-muted">งานที่ต้องทำ</span>
              <span className="fw-bold text-primary h5 mb-0">{unfinishedTasks.length}</span>
            </div>
            <div className="vr" />
            <div className="welcome-stat-item text-center">
              <span className="d-block small text-muted">ใกล้กำหนดส่ง</span>
              <span className="fw-bold text-danger h5 mb-0">{dueSoonTasks.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── สถานะการเชื่อมต่อ API / โหมดตัวอย่าง ──────────────── */}
      {healthLoading && projectsLoading && (
        <Alert variant="secondary" className="d-flex align-items-center gap-2 py-2 mb-4">
          <Spinner animation="border" size="sm" />
          <span className="small">กำลังตรวจสอบการเชื่อมต่อระบบและข้อมูลโปรเจกต์…</span>
        </Alert>
      )}

      {(!isBackendConnected || projectsError) && !healthLoading && (
        <Alert variant="info" className="d-flex align-items-center gap-2 py-2 mb-4 alert-sample-mode">
          <Info size={18} className="flex-shrink-0" />
          <div className="small">
            <strong>โหมดแสดงข้อมูลตัวอย่าง (Sample UI Mode):</strong> ระบบกำลังแสดงข้อมูลตัวอย่างสำหรับหน้าแรกเนื่องจากยังไม่ได้เชื่อมต่อ Backend (ข้อมูลงานและโปรเจกต์จะซิงค์อัตโนมัติเมื่อ Backend เปิดใช้งาน)
          </div>
        </Alert>
      )}

      {isBackendConnected && !isDbReady && (
        <Alert variant="warning" className="d-flex align-items-center gap-2 py-2 mb-4">
          <CircleAlert size={18} className="flex-shrink-0" />
          <div className="small">
            Backend ทำงานแล้ว แต่ฐานข้อมูลยังไม่พร้อม — ตรวจสอบค่า DB ใน backend/.env และรัน npm run db:apply
          </div>
        </Alert>
      )}

      {isBackendConnected && isDbReady && (
        <Alert variant="success" className="d-flex align-items-center gap-2 py-2 mb-4">
          <CircleCheck size={18} className="flex-shrink-0" />
          <div className="small">
            เชื่อมต่อ Backend และฐานข้อมูลสำเร็จ ข้อมูลโปรเจกต์ซิงค์แบบเรียลไทม์
          </div>
        </Alert>
      )}

      {/* ── การ์ดสรุปโปรเจกต์ (Project Summary Cards) ─────────── */}
      <SummaryCards projects={projects} />

      {/* ── สามบล็อกหลักเรียงซ้าย→ขวา: สถานะโปรเจกต์ · Workload พนักงาน · งานที่ยังไม่เสร็จ ── */}
      <Row className="g-4 dashboard-blocks-row">
      {/* คอลัมน์ที่ 1 */}
        <Col xl={4} lg={6} xs={12} className="chart-col"> {/* แนะนำ xs={12} เพื่อให้จอมือถือเต็มจอ */}
          <ProjectStatusChart projects={projects} />
        </Col>

      {/* คอลัมน์ที่ 2 */}
        <Col xl={8} lg={6} xs={12} className="chart-col">
          <EmployeeWorkloadChart />
        </Col>

      {/* คอลัมน์ที่ 3 */}
        <Col xl={8} lg={6} xs={12}>
          <UnfinishedTasks tasks={tasks} />
        </Col>
    </Row>
    </div>
  );
}
