// frontend/src/components/Workload.js — ภาระงานของทีม: ใครงานเกิน / หนัก / ว่าง (แต้มตามขนาดงานที่ยังเหลือ เทียบค่ากลางทีม)
//
// กฎวัดอยู่ที่ utils/workload.js (memberWorkloadSummary) ที่เดียว — หน้าหลักและหน้ารายงานใช้กฎเดียวกัน
// กรองทีมแล้ว = เทียบค่ากลางภายในทีมนั้น
// คลิกคน → กางงานค้างของคนนั้น เรียงจากเร่งสุด → คลิกงาน → เปิดในแผงงานของโปรเจกต์
// (เปลี่ยนผู้รับผิดชอบทำที่แผงงาน — ไม่มีทางโอนงานซ้ำในหน้านี้)
// เดิมหน้านี้คิดจากชั่วโมงวางแผน ÷ เวลาทำงาน แต่ไม่มีงานไหนกรอกชั่วโมง ทุกคนเลยขึ้น 0% — เลิกใช้แล้ว
import React, { useMemo, useState } from 'react';
import { Card, Col, Form, Row } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useMockData } from '../context/MockDataContext';
import { memberWorkloadSummary, TASK_SIZE_POINTS } from '../utils/workload';
import { WORKLOAD_LEVEL_LABELS, taskSizeLabel, taskStatusLabel } from '../utils/labels';
import { TaskBlockedBadge } from './TaskBadges';
import './workload.css';

const LEVELS = ['over', 'heavy', 'normal', 'free'];
const thaiDate = (value) => (value ? value.split('-').reverse().join('/') : '—');

export function WorkloadLevelBadge({ level }) {
  return <span className={`workload-level workload-level-${level}`} data-level={level}>{WORKLOAD_LEVEL_LABELS[level]}</span>;
}

function MemberTasks({ row, today, onOpen }) {
  if (!row.tasks.length) return <p className="workload-member-empty">ไม่มีงานค้าง</p>;
  return (
    <ul className="workload-member-tasks" aria-label={`งานค้างของ ${row.employee.name}`}>
      {row.tasks.map((task) => {
        const overdue = task.dueDate && task.dueDate < today;
        const role = { owner: 'รับผิดชอบ', helper: 'ร่วมงาน', review: 'รอเขาตรวจ' }[task.role];
        return (
          <li key={task.id}>
            <button type="button" onClick={() => onOpen(task)}>
              <span className="workload-task-title">{task.title} <TaskBlockedBadge task={task} /><span className="workload-task-points">{taskSizeLabel(task.size)} · {task.points} แต้ม</span></span>
              <span className="workload-task-meta">
                {task.projectName} · {taskStatusLabel(task.status)} · {role}
                {task.dueDate && <> · <span className={overdue ? 'text-danger fw-semibold' : ''}>{overdue ? 'เลยกำหนด ' : 'ส่ง '}{thaiDate(task.dueDate)}</span></>}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default function Workload() {
  // peopleInView = เฉพาะคนที่ผู้ใช้ปัจจุบันมีสิทธิ์เห็น (utils/access.js) · tasks / projects ถูกกรองตามสิทธิ์มาแล้ว
  const { peopleInView: employees, tasks, projects, teams } = useMockData();
  const navigate = useNavigate();
  const [teamId, setTeamId] = useState('all');
  const [projectId, setProjectId] = useState('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('people'); // 'people' | 'teams'
  const [expandedId, setExpandedId] = useState(null);
  const now = useMemo(() => new Date(), []);
  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const teamOf = useMemo(() => {
    const map = new Map();
    teams.forEach((team) => (team.memberEmployeeIds || []).forEach((id) => map.set(String(id), team)));
    return map;
  }, [teams]);

  // ทั้งบริษัท (มุมมองตามทีม) · เฉพาะทีมที่เลือก (มุมมองรายคน — ค่ากลางคิดในทีมนั้น)
  const allRows = useMemo(() => memberWorkloadSummary(employees, tasks, { now, projectId }).rows, [employees, tasks, now, projectId]);
  const scoped = useMemo(() => {
    const team = teams.find((item) => String(item.id) === teamId);
    const memberIds = team ? new Set((team.memberEmployeeIds || []).map(String)) : null;
    return memberWorkloadSummary(employees.filter((person) => !memberIds || memberIds.has(String(person.id))), tasks, { now, projectId });
  }, [employees, tasks, now, projectId, teamId, teams]);
  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return scoped.rows.filter((row) => !query || row.employee.name.toLowerCase().includes(query));
  }, [scoped, search]);
  const maxPoints = Math.max(1, ...rows.map((row) => row.points));

  const count = (level) => rows.filter((row) => row.level === level).length;
  const openTask = (task) => navigate(`/projects/${task.projectId}`, { state: { openTaskId: task.id } });

  return (
    <div className="workload-page">
      <div className="mb-3">
        <h1 className="page-title mb-1">ภาระงานของทีม (Workload)</h1>
        <p className="text-muted small mb-0">
          ภาระ = แต้มของงานที่ยังเหลือ: งานเล็ก {TASK_SIZE_POINTS.small} · กลาง {TASK_SIZE_POINTS.medium} · ใหญ่ {TASK_SIZE_POINTS.large} แต้ม
          หักส่วนที่ติ๊กเช็กลิสต์แล้ว (ร่วมทำนับครึ่ง · รอเขาตรวจนับ ¼) แล้วเทียบกับค่ากลางของทีม — งานเกิน = 2 เท่าของค่ากลางขึ้นไป · งานหนัก = 1.5 เท่า หรือมีงานเลยกำหนด
        </p>
      </div>

      <Row className="g-3 mb-3">
        {[
          ['สมาชิก', rows.length, 'text-primary'],
          [WORKLOAD_LEVEL_LABELS.over, count('over'), count('over') ? 'text-danger' : 'text-ink'],
          [WORKLOAD_LEVEL_LABELS.heavy, count('heavy'), count('heavy') ? 'text-warning' : 'text-ink'],
          [WORKLOAD_LEVEL_LABELS.free, count('free'), 'text-ink'],
        ].map(([label, value, tone]) => (
          <Col xs={6} lg={3} key={label}>
            <Card className="border-0 shadow-sm p-3 h-100 workload-kpi" data-kpi={label}>
              <span className="small text-muted fw-medium">{label}</span>
              <span className={`h3 fw-bold mb-0 ${tone}`}>{value}</span>
            </Card>
          </Col>
        ))}
      </Row>

      <Card className="border-0 shadow-sm">
        <Card.Body>
          <div className="workload-toolbar">
            <Form.Select size="sm" value={teamId} onChange={(event) => setTeamId(event.target.value)} aria-label="กรองทีม">
              <option value="all">ทุกทีม</option>
              {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
            </Form.Select>
            <Form.Select size="sm" value={projectId} onChange={(event) => setProjectId(event.target.value)} aria-label="กรองโปรเจกต์">
              <option value="all">ทุกโปรเจกต์</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </Form.Select>
            <Form.Control size="sm" placeholder="ค้นหาชื่อ..." value={search} onChange={(event) => setSearch(event.target.value)} aria-label="ค้นหาสมาชิก" />
            <div className="btn-group workload-view-toggle" role="group" aria-label="มุมมอง">
              <button type="button" className={`btn btn-sm ${view === 'people' ? 'btn-primary' : 'btn-outline-primary'}`} aria-pressed={view === 'people'} onClick={() => setView('people')}>รายคน</button>
              <button type="button" className={`btn btn-sm ${view === 'teams' ? 'btn-primary' : 'btn-outline-primary'}`} aria-pressed={view === 'teams'} onClick={() => setView('teams')}>ตามทีม</button>
            </div>
          </div>

          {view === 'people' ? (
            rows.length === 0 ? <p className="text-muted small mb-0">ไม่พบสมาชิกตามตัวกรอง</p> : (
              <div className="workload-table" role="table" aria-label="ภาระงานรายคน">
                <div className="workload-table-head" role="row">
                  <span role="columnheader">สมาชิก</span>
                  <span role="columnheader">ภาระงาน</span>
                  <span role="columnheader">แต้ม (ค่ากลางทีม {scoped.median})</span>
                  <span role="columnheader" className="num">ค้าง</span>
                  <span role="columnheader" className="num">เลยกำหนด</span>
                  <span role="columnheader" className="num">ส่งใน 7 วัน</span>
                  <span role="columnheader" className="num">รอเขาตรวจ</span>
                  <span role="columnheader" className="num">ติดปัญหา</span>
                </div>
                {rows.map((row) => {
                  const expanded = expandedId === row.employee.id;
                  return (
                    <div key={row.employee.id} className={`workload-member${expanded ? ' is-expanded' : ''}`} role="rowgroup">
                      <button type="button" className="workload-member-row" role="row" aria-expanded={expanded} onClick={() => setExpandedId(expanded ? null : row.employee.id)}>
                        <span role="cell" className="workload-member-name">
                          <strong>{row.employee.name}</strong>
                          <small>{teamOf.get(String(row.employee.id))?.name || row.employee.position || ''}</small>
                        </span>
                        <span role="cell" className="workload-member-level">
                          <WorkloadLevelBadge level={row.level} />
                          {row.level !== 'normal' && <small>{row.reasons[0]}</small>}
                        </span>
                        <span role="cell" className="workload-points" data-label="แต้ม">
                          <b>{row.points}</b>
                          <span className="workload-points-track" aria-hidden="true">
                            <span className={`workload-points-fill level-${row.level}`} style={{ width: `${(row.points / maxPoints) * 100}%` }} />
                            {scoped.median > 0 && <span className="workload-points-median" style={{ left: `${Math.min(100, (scoped.median / maxPoints) * 100)}%` }} title={`ค่ากลางทีม ${scoped.median}`} />}
                          </span>
                        </span>
                        <span role="cell" className="num" data-label="ค้าง">{row.open}{row.helping ? <small> +{row.helping} ร่วม</small> : null}</span>
                        <span role="cell" className={`num${row.overdue ? ' text-danger fw-semibold' : ''}`} data-label="เลยกำหนด">{row.overdue}</span>
                        <span role="cell" className="num" data-label="ส่งใน 7 วัน">{row.dueThisWeek}</span>
                        <span role="cell" className="num" data-label="รอเขาตรวจ">{row.toReview}</span>
                        <span role="cell" className={`num${row.blocked ? ' text-danger fw-semibold' : ''}`} data-label="ติดปัญหา">{row.blocked}</span>
                      </button>
                      {expanded && <MemberTasks row={row} today={today} onOpen={openTask} />}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <Row className="g-3">
              {teams.filter((team) => teamId === 'all' || String(team.id) === teamId).map((team) => {
                const memberIds = new Set((team.memberEmployeeIds || []).map(String));
                const members = allRows.filter((row) => memberIds.has(String(row.employee.id)));
                return (
                  <Col md={6} xl={4} key={team.id}>
                    <div className="workload-team-card">
                      <div className="d-flex justify-content-between align-items-baseline">
                        <h2 className="workload-team-card-name">{team.name}</h2>
                        <span className="workload-team-card-emp">{members.length} คน</span>
                      </div>
                      <div className="workload-team-levels">
                        {LEVELS.map((level) => (
                          <span key={level}><WorkloadLevelBadge level={level} /> <b>{members.filter((row) => row.level === level).length}</b></span>
                        ))}
                      </div>
                      <p className="small text-muted mb-2">ภาระรวม {Math.round(members.reduce((sum, row) => sum + row.points, 0) * 10) / 10} แต้ม · เลยกำหนด {members.reduce((sum, row) => sum + row.overdue, 0)} งาน</p>
                      <ul className="workload-team-members">
                        {members.map((row) => <li key={row.employee.id} className="workload-team-member"><span>{row.employee.name}</span><WorkloadLevelBadge level={row.level} /></li>)}
                      </ul>
                    </div>
                  </Col>
                );
              })}
            </Row>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
