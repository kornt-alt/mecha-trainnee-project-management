// frontend/src/components/reports/ExecutiveOverview.js — ภาพรวมผู้บริหาร (ส่วนบนของหน้ารายงาน)
//
// ตอบ 5 คำถามผู้บริหารจากข้อมูลที่ระบบเก็บอยู่แล้ว — ไม่มีช่องให้กรอกในหน้านี้:
//   1. โปรเจกต์ไหนเสี่ยง / ล่าช้า (projectHealth)   2. อะไรรอตัดสินใจ (pendingDecisions)
//   3. ใครงานล้น (memberWorkload — กฎเดียวกับหน้า Workload) → ลิงก์ไปหน้า Workload             4. งบใช้ไปเท่าไร (projectSpend)
//   5. งานเสร็จใช้เวลาเท่าไร / ติดรอตรวจนานไหม (averageCycle จาก statusHistory — ไม่ต้องกรอกชั่วโมง)
// สูตรทั้งหมดอยู่ใน utils/executiveMetrics.js
import { useMemo } from 'react';
import { Card, Col, ProgressBar, Row, Table } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useMockData } from '../../context/MockDataContext';
import {
  HEALTH_ORDER, averageCycle, formatDuration, pendingDecisions, projectHealth, projectSpend,
} from '../../utils/executiveMetrics';
import { ownerOf } from '../../utils/projectTrackingUtils';
import HealthBadge from '../common/HealthBadge';
import { memberWorkload } from '../../utils/workload';
import useLocalDay from '../../utils/useLocalDay';

const DECISION_LABELS = { closure: 'ขอปิดโปรเจกต์', blocked: 'ติดปัญหา', stale_review: 'รอตรวจนาน' };
const baht = (value) => Number(value || 0).toLocaleString('th-TH');

function Kpi({ label, value, hint, tone = 'text-ink' }) {
  return (
    <Col xs={6} lg={3}>
      <Card className="border-0 shadow-sm p-3 h-100 bg-white">
        <span className="small text-muted fw-medium mb-1">{label}</span>
        <div className={`h3 fw-bold mb-1 ${tone}`}>{value}</div>
        {hint && <div className="small text-muted">{hint}</div>}
      </Card>
    </Col>
  );
}

export default function ExecutiveOverview() {
  const { projects, tasks, projectCosts, peopleInView: employees } = useMockData();
  const navigate = useNavigate();
  const now = useLocalDay();

  const rows = useMemo(() => projects.map((project) => {
    const related = tasks.filter((task) => String(task.projectId) === String(project.id));
    const done = related.filter((task) => task.status === 'completed').length;
    return {
      project,
      owner: ownerOf(project)?.name || project.owner || '—',
      health: projectHealth(project, related, { costs: projectCosts }),
      done,
      total: related.length,
      percent: related.length ? Math.round((done / related.length) * 100) : (project.status === 'done' ? 100 : 0),
      spend: projectSpend(project, projectCosts),
      cycle: averageCycle(related),
    };
  }).sort((a, b) => HEALTH_ORDER[a.health.level] - HEALTH_ORDER[b.health.level]
    || String(a.project.dueDate || '9999').localeCompare(String(b.project.dueDate || '9999'))), [projects, tasks, projectCosts]);

  const decisions = useMemo(() => pendingDecisions(projects, tasks), [projects, tasks]);
  // สมาชิกงานเกิน — กฎเดียวกับหน้า Workload (utils/workload.js)
  const overloaded = useMemo(() => memberWorkload(employees, tasks, { now }).filter((row) => row.level === 'over'), [employees, tasks, now]);
  const active = rows.filter((row) => !['done', 'cancelled'].includes(row.project.status));
  const troubled = active.filter((row) => ['late', 'at_risk'].includes(row.health.level));
  const totalBudget = rows.reduce((sum, row) => sum + row.spend.budget, 0);
  const totalSpent = rows.reduce((sum, row) => sum + row.spend.spent, 0);
  const budgetPercent = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : null;

  const openDecision = (item) => navigate(`/projects/${item.projectId}`, item.taskId ? { state: { openTaskId: item.taskId } } : undefined);

  return (
    <section className="executive-overview mb-4" aria-labelledby="executive-overview-title">
      <h2 id="executive-overview-title" className="h5 fw-bold text-ink mb-3">ภาพรวมผู้บริหาร</h2>
      <Row className="g-3 mb-3">
        <Kpi label="โปรเจกต์ที่กำลังทำ" value={active.length} hint={`จากทั้งหมด ${rows.length} โปรเจกต์`} tone="text-primary" />
        <Kpi label="เสี่ยง / ล่าช้า" value={troubled.length} hint={`ล่าช้า ${troubled.filter((row) => row.health.level === 'late').length} · เสี่ยง ${troubled.filter((row) => row.health.level === 'at_risk').length}`} tone={troubled.length ? 'text-danger' : 'text-success'} />
        <Kpi label="รอการตัดสินใจ" value={decisions.length} hint="ขอปิดโปรเจกต์ · ติดปัญหา · รอตรวจนาน" tone={decisions.length ? 'text-danger' : 'text-ink'} />
        <Kpi label="งบใช้ไปรวม" value={budgetPercent === null ? '—' : `${budgetPercent}%`} hint={totalBudget ? `${baht(totalSpent)} / ${baht(totalBudget)} บาท` : 'ยังไม่มีโปรเจกต์ที่ตั้งงบ'} />
      </Row>

      <Row className="g-3">
        <Col lg={4} xs={12}>
          <Card className="border-0 shadow-sm h-100 bg-white">
            <Card.Body className="p-3">
              <h3 className="panel-title mb-2">รอการตัดสินใจ</h3>
              {decisions.length === 0 ? <p className="small text-muted mb-0">ไม่มีเรื่องรอตัดสินใจ</p> : (
                <ul className="executive-decision-list" aria-label="รายการรอการตัดสินใจ">
                  {decisions.map((item) => (
                    <li key={item.id}>
                      <button type="button" onClick={() => openDecision(item)}>
                        <span className={`executive-decision-kind kind-${item.kind}`}>{DECISION_LABELS[item.kind]}</span>
                        <strong>{item.title}</strong>
                        <small>{item.detail}</small>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className={`small mt-3 mb-0 ${overloaded.length ? 'text-danger fw-semibold' : 'text-muted'}`}>
                {overloaded.length ? `สมาชิกงานเกิน ${overloaded.length} คน (${overloaded.slice(0, 3).map((row) => row.employee.name.split(' ')[0]).join(', ')}${overloaded.length > 3 ? '…' : ''}) — ` : 'ยังไม่มีสมาชิกงานเกิน — '}
                <Link to="/workload">ดูภาระงานทีม</Link>
              </p>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={8} xs={12}>
          <Card className="border-0 shadow-sm h-100 bg-white">
            <Card.Body className="p-3">
              <h3 className="panel-title mb-2">สถานะทุกโปรเจกต์ <small className="text-muted fw-normal">· เรียงจากที่ต้องดูก่อน</small></h3>
              <Table hover responsive size="sm" className="align-middle mb-0 executive-project-table">
                <thead>
                  <tr>
                    <th>โปรเจกต์</th>
                    <th>สุขภาพ</th>
                    <th style={{ minWidth: 110 }}>งานเสร็จ</th>
                    <th>กำหนดส่ง</th>
                    <th className="text-end">งบใช้ / งบ (บาท)</th>
                    <th className="text-end" title="เฉลี่ยจากงานที่เสร็จแล้ว ตั้งแต่สร้างงานจนผ่านการตรวจ">เวลาเฉลี่ยต่องาน</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.project.id}>
                      <td>
                        <Link to={`/projects/${row.project.id}`} className="fw-semibold">{row.project.name}</Link>
                        <div className="small text-muted">{row.owner}</div>
                      </td>
                      <td>
                        <HealthBadge health={row.health} />
                        {row.health.reasons.length > 0 && <div className="small text-muted executive-health-reason">{row.health.reasons[0]}</div>}
                      </td>
                      <td>
                        <ProgressBar now={row.percent} style={{ height: 6 }} variant={row.percent === 100 ? 'success' : 'primary'} aria-label={`งานเสร็จ ${row.percent}%`} />
                        <span className="small text-muted">{row.done}/{row.total} งาน</span>
                      </td>
                      <td className="small text-nowrap">{row.project.dueDate ? row.project.dueDate.split('-').reverse().join('/') : '—'}</td>
                      <td className={`text-end small text-nowrap ${row.spend.percent > 90 ? 'text-danger fw-semibold' : ''}`}>{row.spend.budget || row.spend.spent ? `${baht(row.spend.spent)} / ${row.spend.budget ? baht(row.spend.budget) : '—'}` : '—'}</td>
                      <td className="text-end small text-nowrap">{row.cycle.count ? <>{formatDuration(row.cycle.total)}<div className="text-muted">รอตรวจ {formatDuration(row.cycle.review)}</div></> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </section>
  );
}
