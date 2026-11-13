// frontend/src/components/project-detail/ProjectOverview.js — context-backed project overview
import { useState } from 'react';
import { Badge, ProgressBar } from 'react-bootstrap';
import { MOCK_EMPLOYEES } from '../../data/mockData';
import { useMockData } from '../../context/MockDataContext';
import { ownerOf, initials, today, ymd } from '../../utils/projectTrackingUtils';
import { TaskPriorityBadge, TaskStatusBadge } from '../TaskBadges';
import TaskDetailModal from '../TaskDetailModal';
import ProjectClosure from './ProjectClosure';

const TASK_STATUSES = [
  { key: 'not_started', label: 'ยังไม่เริ่ม', color: 'var(--workspace-status-segment-neutral)' },
  { key: 'in_progress', label: 'กำลังทำ', color: 'var(--workspace-status-segment-progress)' },
  { key: 'pending_review', label: 'รอตรวจ', color: 'var(--workspace-status-segment-review)' },
  { key: 'completed', label: 'เสร็จแล้ว', color: 'var(--workspace-status-segment-done)' },
];

const employeeById = (id) => MOCK_EMPLOYEES.find((employee) => String(employee.id) === String(id));
const dayDifference = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('th-TH-u-ca-gregory', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
};

function buildAttention(tasks, currentDay) {
  return tasks.reduce((items, task) => {
    if (task.status === 'completed') return items;
    const daysUntilDue = task.dueDate ? dayDifference(currentDay, task.dueDate) : null;

    let kind = '';
    let detail = '';
    if (daysUntilDue !== null && daysUntilDue < 0) {
      kind = 'เลยกำหนด';
      detail = `เลยกำหนด ${Math.abs(daysUntilDue)} วัน · ครบ ${formatDate(task.dueDate)}`;
    } else if (task.status === 'pending_review') {
      kind = 'รอตรวจ';
      detail = task.dueDate ? `รอการตรวจสอบ · ครบ ${formatDate(task.dueDate)}` : 'รอการตรวจสอบ';
    } else if (daysUntilDue !== null && daysUntilDue <= 14) {
      kind = 'ใกล้ครบ';
      detail = daysUntilDue === 0 ? 'ครบกำหนดวันนี้' : `ครบกำหนดใน ${daysUntilDue} วัน`;
    }

    if (kind) items.push({ task, kind, detail });
    return items;
  }, []);
}

function getScheduleProgress(project, currentDay) {
  if (!project.startDate || !project.dueDate) return null;
  const totalDays = dayDifference(project.startDate, project.dueDate);
  if (Number.isNaN(totalDays) || totalDays < 0) return null;
  if (totalDays === 0) return currentDay < project.startDate ? 0 : 100;
  return Math.max(0, Math.min(100, Math.round((dayDifference(project.startDate, currentDay) / totalDays) * 100)));
}

function KpiCard({ title, className = '', children }) {
  return (
    <section className={`project-detail-kpi ${className}`}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function StatusKpi({ tasks }) {
  return (
    <KpiCard title={`สรุปสถานะงาน (Task Summary) · ${tasks.length} งาน`}>
      <div className="project-detail-status-bar" aria-label="สัดส่วนสถานะงาน">
        {TASK_STATUSES.map((status) => {
          const count = tasks.filter((task) => task.status === status.key).length;
          return count > 0 ? (
            <span
              key={status.key}
              title={`${status.label} ${count}`}
              style={{ width: `${(count / tasks.length) * 100}%`, backgroundColor: status.color }}
            />
          ) : null;
        })}
      </div>
      <div className="project-detail-status-legend">
        {TASK_STATUSES.map((status) => (
          <span key={status.key}>
            <i style={{ backgroundColor: status.color }} />
            {status.label}<strong>{tasks.filter((task) => task.status === status.key).length}</strong>
          </span>
        ))}
      </div>
    </KpiCard>
  );
}

function DeadlineKpi({ project, currentDay }) {
  const daysUntilDue = project.dueDate ? dayDifference(currentDay, project.dueDate) : null;
  const elapsed = getScheduleProgress(project, currentDay);
  const closed = ['done', 'cancelled'].includes(project.status);
  const headline = daysUntilDue === null
    ? '—'
    : closed
      ? 'ปิดแล้ว'
      : daysUntilDue < 0
        ? `เลย ${Math.abs(daysUntilDue)} วัน`
        : `${daysUntilDue} วัน`;

  return (
    <KpiCard title="กำหนดส่งโปรเจกต์">
      <div className="project-detail-kpi-value">{headline}</div>
      <p className="project-detail-kpi-subtitle">
        {project.dueDate ? `ครบ ${formatDate(project.dueDate)}` : 'ยังไม่ได้กำหนดวันส่ง'}
      </p>
      {elapsed !== null && <span className="project-detail-kpi-footnote">ผ่านไปแล้ว {elapsed}% ของระยะเวลา</span>}
    </KpiCard>
  );
}

function AttentionKpi({ attention, tasks }) {
  const overdueCount = tasks.filter((task) => task.status !== 'completed' && task.dueDate && task.dueDate < today()).length;
  const reviewCount = tasks.filter((task) => task.status === 'pending_review').length;
  const upcomingCount = attention.filter((item) => item.kind === 'ใกล้ครบ').length;

  return (
    <KpiCard title="ต้องจับตา" className={attention.length ? 'has-attention' : ''}>
      <div className="project-detail-kpi-value">{attention.length} <small>รายการ</small></div>
      <p className="project-detail-kpi-subtitle">
        เลยกำหนด {overdueCount} · รอตรวจ {reviewCount} · ใกล้ครบ {upcomingCount}
      </p>
    </KpiCard>
  );
}

function TaskAssignee({ task }) {
  const employee = employeeById(task.assigneeId);
  if (!employee) return null;
  return (
    <span className="project-detail-task-assignee" title={employee.name}>
      <span className="project-detail-avatar project-detail-avatar-small" aria-hidden="true">{initials(employee.name)}</span>
      <span>{employee.name}</span>
    </span>
  );
}

function AttentionPanel({ items, onOpenTask }) {
  return (
    <section className="project-detail-panel" aria-labelledby="attention-title">
      <div className="project-detail-panel-heading">
        <h2 id="attention-title">ต้องจับตา</h2>
        <span className="project-detail-panel-caption">{items.length} รายการ</span>
      </div>
      {items.length === 0 ? (
        <div className="project-detail-empty">ไม่มีงานที่ต้องจับตาในตอนนี้</div>
      ) : (
        <div className="project-detail-attention-list">
          {items.slice(0, 5).map(({ task, kind, detail }) => (
            <button type="button" className="project-detail-attention-row" key={task.id} onClick={() => onOpenTask(task)}>
              <Badge bg="" className={`project-detail-attention-badge attention-${kind === 'เลยกำหนด' ? 'overdue' : kind === 'รอตรวจ' ? 'review' : 'upcoming'}`}>
                {kind}
              </Badge>
              <span className="project-detail-attention-copy">
                <strong>{task.title}</strong>
                <span>{detail}</span>
              </span>
              <TaskAssignee task={task} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function TaskPreview({ tasks, onOpenTask, onNavigateSection }) {
  const preview = [...tasks]
    .sort((left, right) => Number(left.status === 'completed') - Number(right.status === 'completed')
      || String(left.dueDate || '9999-12-31').localeCompare(String(right.dueDate || '9999-12-31')))
    .slice(0, 5);

  return (
    <section className="project-detail-panel" aria-labelledby="task-preview-title">
      <div className="project-detail-panel-heading">
        <h2 id="task-preview-title">งานในโปรเจกต์</h2>
        <button type="button" className="project-detail-inline-link" onClick={() => onNavigateSection('tasks')}>
          ดูทั้งหมด ({tasks.length}) <span aria-hidden="true">→</span>
        </button>
      </div>
      {preview.length === 0 ? (
        <div className="project-detail-empty">ยังไม่มีงานที่เชื่อมโยงกับโปรเจกต์นี้</div>
      ) : (
        <ul className="project-detail-task-list mb-0" aria-label="งานในโปรเจกต์นี้">
          {preview.map((task) => (
            <li key={task.id}>
              <button type="button" className="project-detail-task-row" onClick={() => onOpenTask(task)}>
                <strong>{task.title}</strong>
                <span className="project-detail-task-badges"><TaskStatusBadge task={task} className="project-detail-task-status" /><TaskPriorityBadge priority={task.priority} className="project-detail-task-priority" /></span>
                <TaskAssignee task={task} />
                {task.dueDate && <small className="project-detail-task-due">Due {ymd(task.dueDate)}</small>}
                {typeof task.progress === 'number' && <span className="project-detail-task-progress">{task.progress}%</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ProjectInformation({ project, priority }) {
  const owner = ownerOf(project) || (project.owner ? { name: project.owner } : null);
  const teamLead = project.teamLeadId ? employeeById(project.teamLeadId) : null;
  const rows = [
    ['หมวดหมู่', project.category],
    ['ความสำคัญ', priority.label !== '-' ? priority.label : null],
    ['วันเริ่มต้น', project.startDate ? formatDate(project.startDate) : null],
    ['กำหนดส่ง', project.dueDate ? formatDate(project.dueDate) : null],
    ['Project Owner', owner?.name],
    ['Team Lead', teamLead?.name],
  ].filter(([, value]) => value);

  return (
    <section className="project-detail-panel" aria-labelledby="project-information-title">
      <div className="project-detail-panel-heading"><h2 id="project-information-title">ข้อมูลโปรเจกต์</h2></div>
      {rows.length > 0 ? (
        <dl className="project-detail-information mb-0">
          {rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
      ) : <div className="project-detail-empty">ยังไม่มีข้อมูลโปรเจกต์เพิ่มเติม</div>}
    </section>
  );
}

function ProjectTeam({ project, tasks, onNavigateSection }) {
  const memberIds = [...new Set([...(Array.isArray(project.teamMemberIds) ? project.teamMemberIds : []), project.managerId, project.teamLeadId].filter(Boolean).map(String))];
  const members = memberIds.map(employeeById).filter(Boolean);

  return (
    <section className="project-detail-panel" aria-labelledby="project-team-title">
      <div className="project-detail-panel-heading">
        <h2 id="project-team-title">ทีมงาน · {members.length} คน</h2>
        <button type="button" className="project-detail-inline-link" onClick={() => onNavigateSection('team')}>
          ดูทีม <span aria-hidden="true">→</span>
        </button>
      </div>
      {members.length === 0 ? (
        <div className="project-detail-empty">โปรเจกต์นี้ยังไม่มีข้อมูลสมาชิกทีม</div>
      ) : (
        <ul className="project-detail-team-list mb-0">
          {members.slice(0, 5).map((member) => {
            const openCount = tasks.filter((task) => (String(task.assigneeId) === String(member.id) || (task.collaborators || []).some((id) => String(id) === String(member.id))) && task.status !== 'completed').length;
            const isOwner = String(project.managerId) === String(member.id);
            const isTeamLead = String(project.teamLeadId) === String(member.id);
            const roles = [isOwner && 'Project Owner', isTeamLead && 'Team Lead'].filter(Boolean);
            return (
              <li key={member.id}>
                <span className="project-detail-avatar" aria-hidden="true">{initials(member.name)}</span>
                <span className="project-detail-team-person">
                  <strong>{member.name}</strong>
                  <small>{roles.length ? roles.join(' · ') : member.position || 'สมาชิก'}</small>
                </span>
                <span className="project-detail-open-count">{openCount} งานค้าง</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default function ProjectOverview({ project, tasks, stats, priority, onNavigateSection }) {
  const { deliverables } = useMockData();
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const currentDay = today();
  const attention = buildAttention(tasks, currentDay);
  const projectDeliverables = deliverables.filter((item) => String(item.projectId) === String(project.id));

  return (
    <div className="project-detail-overview">
      <div className="project-detail-kpi-grid">
        <KpiCard title="ความคืบหน้ารวม">
          <div className="project-detail-kpi-progress-value">
            <strong>{stats.progress}%</strong>
            <span>{stats.completed}/{stats.total} งานเสร็จ</span>
          </div>
          <ProgressBar
            now={stats.progress}
            variant={stats.progress === 100 ? 'success' : 'primary'}
            aria-label={`ความคืบหน้ารวม ${stats.progress}%`}
          />
        </KpiCard>
        <StatusKpi tasks={tasks} />
        <DeadlineKpi project={project} currentDay={currentDay} />
        <AttentionKpi attention={attention} tasks={tasks} />
      </div>

      <div className="project-detail-overview-columns">
        <div className="project-detail-overview-main">
          <AttentionPanel items={attention} onOpenTask={(task) => setSelectedTaskId(task.id)} />
          <TaskPreview tasks={tasks} onOpenTask={(task) => setSelectedTaskId(task.id)} onNavigateSection={onNavigateSection} />
        </div>
        <aside className="project-detail-overview-side">
          <ProjectInformation project={project} priority={priority} />
          <ProjectTeam project={project} tasks={tasks} onNavigateSection={onNavigateSection} />
          <ProjectClosure projectId={project.id} tasks={tasks} deliverables={projectDeliverables} />
        </aside>
      </div>
      {tasks.some((task) => String(task.id) === String(selectedTaskId)) && <TaskDetailModal task={tasks.find((task) => String(task.id) === String(selectedTaskId))} projectId={project.id} onClose={() => setSelectedTaskId(null)} />}
    </div>
  );
}
