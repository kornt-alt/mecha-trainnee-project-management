// Date-based Project timeline using only stored Project, Task, and Deliverable dates.
import { useMemo } from 'react';
import { Card } from 'react-bootstrap';
import { useMockData } from '../../context/MockDataContext';
import { ymd, today } from '../../utils/projectTrackingUtils';

const parseDay = (value) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) ? timestamp : null;
};
const dayMs = 86400000;

export default function ProjectTimeline({ projectId }) {
  const { projects, tasks, deliverables } = useMockData();
  const project = projects.find((item) => String(item.id) === String(projectId));
  const rows = useMemo(() => {
    if (!project) return [];
    const taskRows = tasks.filter((task) => String(task.projectId) === String(projectId)).map((task) => ({
      id: `task-${task.id}`, kind: 'task', title: task.title, status: task.status,
      start: task.startDate || task.dueDate || task.completedAt?.slice(0, 10),
      end: task.dueDate || task.completedAt?.slice(0, 10) || task.startDate,
      label: task.statusLabel || task.status,
    }));
    const deliverableRows = deliverables.filter((item) => String(item.projectId) === String(projectId)).map((item) => ({
      id: `deliverable-${item.id}`, kind: 'deliverable', title: item.title, status: item.status,
      start: item.dueDate || item.completedAt?.slice(0, 10),
      end: item.completedAt?.slice(0, 10) || item.dueDate,
      label: item.status === 'completed' ? 'เสร็จแล้ว' : item.status === 'in_progress' ? 'กำลังทำ' : 'รอเริ่ม',
    }));
    return [
      { id: `project-${project.id}`, kind: 'project', title: project.name, status: project.status, start: project.startDate, end: project.dueDate, label: 'ช่วงโปรเจกต์' },
      ...taskRows, ...deliverableRows,
    ].filter((row) => parseDay(row.start) !== null || parseDay(row.end) !== null);
  }, [project, tasks, deliverables, projectId]);

  if (!project) return <div className="project-detail-empty">ไม่พบโปรเจกต์</div>;
  if (!rows.length) return <section className="workspace-section"><div className="workspace-section-heading"><div><span className="project-detail-placeholder-label">PROJECT TIMELINE</span><h2>ไทม์ไลน์</h2><p>กำหนดการจริงจากโปรเจกต์ งาน และสิ่งที่ส่งมอบ</p></div></div><div className="workspace-empty-state"><strong>ข้อมูลวันที่ยังไม่เพียงพอ</strong><span>เพิ่มวันเริ่มหรือกำหนดส่งให้โปรเจกต์ งาน หรือสิ่งที่ส่งมอบเพื่อแสดงไทม์ไลน์</span></div></section>;

  const timestamps = rows.flatMap((row) => [parseDay(row.start), parseDay(row.end)]).filter((value) => value !== null);
  let min = Math.min(...timestamps) - dayMs;
  let max = Math.max(...timestamps) + dayMs;
  if (max <= min) max = min + dayMs * 2;
  const span = max - min;
  const position = (value) => ((parseDay(value) - min) / span) * 100;
  const currentTimestamp = parseDay(today());
  const currentPosition = currentTimestamp >= min && currentTimestamp <= max ? ((currentTimestamp - min) / span) * 100 : null;
  const ticks = Array.from({ length: 6 }, (_, index) => {
    const timestamp = min + (span * index) / 5;
    return { left: index * 20, label: new Intl.DateTimeFormat('th-TH-u-ca-gregory', { day: 'numeric', month: 'short' }).format(new Date(timestamp)) };
  });

  return <section className="workspace-section" aria-labelledby="workspace-timeline-title"><div className="workspace-section-heading"><div><span className="project-detail-placeholder-label">PROJECT TIMELINE</span><h2 id="workspace-timeline-title">ไทม์ไลน์โปรเจกต์</h2><p>แสดงวันที่จากข้อมูลโปรเจกต์ งาน และสิ่งที่ส่งมอบ โดยไม่มี Milestone จำลอง</p></div></div><Card className="workspace-panel"><Card.Body><div className="workspace-timeline-scroll" role="region" aria-label="แผนภูมิไทม์ไลน์โปรเจกต์" tabIndex="0"><div className="workspace-timeline-canvas"><div className="workspace-timeline-axis"><span className="workspace-timeline-row-label">รายการ</span><div className="workspace-timeline-axis-track">{ticks.map((tick) => <span key={tick.left} style={{ left: `${tick.left}%` }}>{tick.label}</span>)}</div></div>{rows.map((row) => {
        const start = row.start || row.end;
        const end = row.end || row.start;
        const left = Math.max(0, Math.min(100, position(start)));
        const right = Math.max(0, Math.min(100, position(end)));
        const width = Math.max(1.2, right - left);
        const overdue = end < today() && !['completed', 'done'].includes(row.status);
        return <div className={`workspace-timeline-row kind-${row.kind}`} key={row.id}><div className="workspace-timeline-row-label" title={row.title}><strong>{row.title}</strong><small>{row.kind === 'project' ? 'โปรเจกต์' : row.kind === 'task' ? 'งาน' : 'สิ่งที่ส่งมอบ'} · {row.label}{overdue ? ' · เลยกำหนด' : ''}</small></div><div className="workspace-timeline-track">{ticks.map((tick) => <i key={tick.left} style={{ left: `${tick.left}%` }} aria-hidden="true" />)}{currentPosition !== null && <i className="workspace-timeline-today" style={{ left: `${currentPosition}%` }} title="วันนี้" aria-label="วันนี้" /> }<span className={`workspace-timeline-bar status-${row.status}${overdue ? ' is-overdue' : ''}`} style={{ left: `${left}%`, width: `${width}%` }} title={`${row.title}: ${row.start ? ymd(row.start) : 'ไม่ระบุ'} – ${row.end ? ymd(row.end) : 'ไม่ระบุ'}`} /></div></div>;
      })}</div></div><div className="workspace-timeline-legend"><span><i className="timeline-status-in_progress" />กำลังดำเนินการ</span><span><i className="timeline-status-pending_review" />รอตรวจ</span><span><i className="timeline-status-completed" />เสร็จแล้ว</span><span><i className="timeline-status-overdue" />เลยกำหนด</span>{currentPosition !== null && <span><i className="timeline-today-key" />วันนี้</span>}</div></Card.Body></Card></section>;
}
