// frontend/src/components/Home.js — หน้าหลัก: งานของฉัน (บนสุด) + ภาพรวมโปรเจกต์ / workload / งบประมาณ
import React, { useMemo, useState } from 'react';
import { Alert, Row, Col, Spinner } from 'react-bootstrap';
import { useLoad } from '../utils/api';
import { MOCK_EMPLOYEES } from '../data/mockData';
import { useMockData } from '../context/MockDataContext';
import { MOCK_PROJECT_COST_ITEMS } from '../data/mockProjectCosts';
import UnfinishedTasks from './dashboard/UnfinishedTasks';
import MyWork, { groupMyTasks } from './dashboard/MyWork';
import SummaryCards from './dashboard/SummaryCards';
import DonutChart from './DonutChart/DonutChart';
import { buildProjectStatusItems } from './DonutChart/donutChartData';
import EmployeeWorkloadChart from './dashboard/EmployeeWorkloadChart';
import BudgetBarChart from './BudgetBarChart/BudgetBarChart';
import { buildBudgetCategories } from './BudgetBarChart/budgetBarChartData';
import ProjectCategoryTreemap from './dashboard/ProjectCategoryTreemap';
import { Info, CircleAlert } from './common/Icons';

export default function Home() {
  // Projects + Tasks จาก MockDataContext — dashboard จะอัปเดตตามการแก้ไขในหน้าอื่นทันที (mock-only phase)
  // API integration ยังเป็น phase ถัดไป ตอนนี้ context คือแหล่งข้อมูลจริงของ Dashboard
  const { projects, tasks, actorId } = useMockData();
  const actor = MOCK_EMPLOYEES.find((person) => String(person.id) === String(actorId));

  // 1. เรียก API ตรวจสอบสถานะ backend/DB (เก็บไว้ทำ alert สถานะการเชื่อมต่อ — ไม่ใช้เป็นแหล่งข้อมูลจนกว่าจะเข้า Phase API Integration)
  const { data: healthData, error: healthError, loading: healthLoading } = useLoad('/health');
  const { error: projectsError, loading: projectsLoading } = useLoad('/projects');

  // ตรวจสอบว่าระบบเชื่อมต่อ backend ได้หรือไม่
  const isBackendConnected = !healthError && healthData && healthData.status === 'ok';
  const isDbReady = isBackendConnected && healthData.db === 'up';

  // ตัวเลขบน banner นับเฉพาะงานของคนที่ login (เดิมนับงานทุกคนรวมกัน)
  const myTasks = groupMyTasks(tasks, actorId);

  // ตัวเลือกช่วงเวลาย้อนหลังของกราฟเปรียบเทียบงบประมาณและค่าใช้จ่ายจริง (ค่าเริ่มต้น 6 เดือน)
  const [budgetRangeMonths, setBudgetRangeMonths] = useState(6);
  const { categories: budgetCategories, rangeNotice: budgetRangeNotice } = useMemo(
    () => buildBudgetCategories(projects, MOCK_PROJECT_COST_ITEMS, budgetRangeMonths),
    [projects, budgetRangeMonths],
  );

  return (
    <div className="dashboard-container">
      {/* ── แถบทักทายผู้ใช้ (Welcome Banner) ──────────────────── */}
      <div className="welcome-banner text-white mb-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="welcome-tag">MECHA Project Management</span>
            </div>
            <h1 className="welcome-title h3 mb-2">
              สวัสดี{actor ? `, ${actor.name}` : ''}
            </h1>
            <p className="welcome-subtitle mb-0">
              ดูงานของคุณและความคืบหน้าของโปรเจกต์ได้ที่นี่
            </p>
          </div>

          <div className="welcome-stats-pill d-none d-lg-flex align-items-center gap-3 bg-white text-ink p-3 rounded shadow-sm">
            <div className="welcome-stat-item text-center">
              <span className="d-block small text-muted">งานของฉัน</span>
              <span className="fw-bold text-primary h5 mb-0">{myTasks.assigned.length}</span>
            </div>
            <div className="vr" />
            <div className="welcome-stat-item text-center">
              <span className="d-block small text-muted">ใกล้ / เลยกำหนด</span>
              <span className="fw-bold text-danger h5 mb-0">{myTasks.due.length}</span>
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
            กำลังแสดงข้อมูลตัวอย่าง — ข้อมูลที่แก้จะหายเมื่อรีเฟรชหน้า
          </div>
        </Alert>
      )}

      {isBackendConnected && !isDbReady && (
        <Alert variant="warning" className="d-flex align-items-center gap-2 py-2 mb-4">
          <CircleAlert size={18} className="flex-shrink-0" />
          <div className="small">
            เชื่อมต่อฐานข้อมูลไม่ได้ชั่วคราว — กำลังแสดงข้อมูลตัวอย่าง กรุณาแจ้งผู้ดูแลระบบ
          </div>
        </Alert>
      )}

      {/* ── งานของฉัน (บนสุด — สิ่งแรกที่ผู้ใช้ต้องรู้คือวันนี้ต้องทำอะไร) ── */}
      <MyWork tasks={tasks} actorId={actorId} />

      {/* ── การ์ดสรุปโปรเจกต์ ─────────── */}
      <SummaryCards projects={projects} />

      {/* ── สามบล็อกหลักเรียงซ้าย→ขวา: สถานะโปรเจกต์ · Workload พนักงาน · งานที่ยังไม่เสร็จ ── */}
      <Row className="g-4 dashboard-blocks-row">
      {/* คอลัมน์ที่ 1 */}
        <Col xl={4} lg={6} xs={12} className="chart-col"> {/* แนะนำ xs={12} เพื่อให้จอมือถือเต็มจอ */}
          <DonutChart items={buildProjectStatusItems(projects)} />
        </Col>

      {/* คอลัมน์ที่ 2 */}
        <Col xl={8} lg={6} xs={12} className="chart-col">
          <EmployeeWorkloadChart />
        </Col>

      {/* คอลัมน์ที่ 3 */}
        <Col xl={8} lg={6} xs={12}>
          <UnfinishedTasks tasks={tasks} />
        </Col>

        <Col xl={4} lg={6} xs={12}>
          <ProjectCategoryTreemap projects={projects} />
        </Col>
    </Row>

      {/* ── กราฟแท่งเปรียบเทียบงบประมาณตามหมวดหมู่ (Side-by-Side Stacked Bar Chart) ── */}
      <BudgetBarChart
        categories={budgetCategories}
        rangeValue={budgetRangeMonths}
        onRangeChange={setBudgetRangeMonths}
        rangeNotice={budgetRangeNotice}
        className="mb-4"
      />
    </div>
  );
}
