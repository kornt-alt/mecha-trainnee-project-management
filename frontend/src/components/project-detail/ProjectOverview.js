// frontend/src/components/project-detail/ProjectOverview.js — context-backed project overview
import { Fragment } from 'react';
import { Badge, Button, ProgressBar } from 'react-bootstrap';
import { MOCK_EMPLOYEES } from '../../data/mockData';
import { useMockData } from '../../context/MockDataContext';
import { daysBetween, ownerOf, initials, shortThaiDate, today } from '../../utils/projectTrackingUtils';
import { Plus } from '../common/Icons';
import ProjectClosure from './ProjectClosure';

const TASK_STATUSES = [
  { key: 'not_started', label: 'ยังไม่เริ่ม', color: 'var(--workspace-status-segment-neutral)' },
  { key: 'in_progress', label: 'กำลังทำ', color: 'var(--workspace-status-segment-progress)' },
  { key: 'pending_review', label: 'รอตรวจ', color: 'var(--workspace-status-segment-review)' },
  { key: 'completed', label: 'เสร็จแล้ว', color: 'var(--workspace-status-segment-done)' },
];

const TASK_STATUS_LABELS = {
  not_started: 'ยังไม่เริ่ม',
  in_progress: 'กำลังทำ',
  pending_review: 'รอตรวจ',
  completed: 'เสร็จแล้ว',
};

const employeeById = (id) => MOCK_EMPLOYEES.find((employee) => String(employee.id) === String(id));
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
    const daysUntilDue = task.dueDate ? daysBetween(currentDay, task.dueDate) : null;

    let kind = '';
    let detail = '';
    if (daysUntilDue !== null && daysUntilDue < 0) {
      kind = 'เลยกำหนด';
      detail = `เลยกำหนด ${Math.abs(daysUntilDue)} วัน · ครบ ${shortThaiDate(task.dueDate)}`;
    } else if (task.status === 'pending_review') {
      kind = 'รอตรวจ';
      detail = task.dueDate
        ? `รอ ${employeeById(task.reviewerId)?.name || 'ผู้ตรวจ'} ตรวจ · ครบ ${shortThaiDate(task.dueDate)}`
        : 'รอการตรวจสอบ';
    } else if (daysUntilDue !== null && daysUntilDue <= 14) {
      kind = 'ใกล้ครบ';
      detail = daysUntilDue === 0 ? 'ครบกำหนดวันนี้' : `ครบกำหนดใน ${daysUntilDue} วัน · ${shortThaiDate(task.dueDate)}`;
    }

    if (kind) items.push({ task, kind, detail });
    return items;
  }, []);
}

function getScheduleProgress(project, currentDay) {
  if (!project.startDate || !project.dueDate) return null;
  const totalDays = daysBetween(project.startDate, project.dueDate);
  if (Number.isNaN(totalDays) || totalDays < 0) return null;
  if (totalDays === 0) return currentDay < project.startDate ? 0 : 100;
  return Math.max(0, Math.min(100, Math.round((daysBetween(project.startDate, currentDay) / totalDays) * 100)));
}

const KPI_ICON_STYLE = {
  progress: { background: '#E3ECFF', stroke: '#2F5BD0' },
  status: { background: '#EEE8FF', stroke: '#6D3FC7' },
  deadline: { background: '#FFE5EE', stroke: '#BE185D' },
  attention: { background: '#FFEBC8', stroke: '#B45309' },
};

function KpiIcon({ type }) {
  const style = KPI_ICON_STYLE[type];
  return (
    <span className="project-detail-kpi-icon" style={{ background: style.background }} aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={style.stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {type === 'progress' && <><path d="M4 18a8 8 0 1 1 16 0" /><path d="M12 18l4-6" /></>}
        {type === 'status' && <path d="M5 20V10M12 20V4M19 20v-7" />}
        {type === 'deadline' && <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9 3h6" /></>}
        {type === 'attention' && <><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17h.01" /></>}
      </svg>
    </span>
  );
}

function KpiCard({ title, icon, className = '', children }) {
  return (
    <section className={`project-detail-kpi ${className}`}>
      <div className="project-detail-kpi-heading">
        <KpiIcon type={icon} />
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function StatusKpi({ tasks }) {
  return (
    <KpiCard icon="status" className="status-summary" title={`สรุปสถานะงาน · ${tasks.length} งาน`}>
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
  const daysUntilDue = project.dueDate ? daysBetween(currentDay, project.dueDate) : null;
  const elapsed = getScheduleProgress(project, currentDay);
  const closed = ['done', 'cancelled'].includes(project.status);
  const headline = daysUntilDue === null
    ? '—'
    : closed
      ? 'ปิดแล้ว'
      : String(daysUntilDue);
  const displayedDate = formatDate(project.dueDate);
  const dateText = project.dueDate
    ? `${daysUntilDue < 0 && !closed ? 'วันที่เลยกำหนด' : 'วันที่เหลือ'} · ครบ ${displayedDate}`
    : 'ยังไม่ได้กำหนดวันส่ง';

  return (
    <KpiCard icon="deadline" title="กำหนดส่งโปรเจกต์">
      <div className="project-detail-kpi-deadline-value">
        <span className="project-detail-kpi-value">{headline}</span>
        <span>{dateText}</span>
      </div>
      {elapsed !== null && <span className="project-detail-kpi-footnote">ผ่านไปแล้ว {elapsed}% ของระยะเวลาทั้งหมด</span>}
    </KpiCard>
  );
}

function AttentionKpi({ tasks, currentDay }) {
  const overdueCount = tasks.filter((task) => task.status !== 'completed' && task.dueDate && task.dueDate < currentDay).length;
  const reviewCount = tasks.filter((task) => task.status === 'pending_review').length;
  const count = overdueCount + reviewCount;

  return (
    <KpiCard icon="attention" title="ต้องจับตา" className={count ? 'has-attention' : ''}>
      <div className="project-detail-kpi-value">{count} <small>รายการ</small></div>
      <p className="project-detail-kpi-subtitle">
        เลยกำหนด {overdueCount} · รอตรวจ {reviewCount}
      </p>
    </KpiCard>
  );
}

function TaskAssignee({ task, compact = false }) {
  const employee = employeeById(task.assigneeId);
  if (!employee) return null;
  return (
    <span className="project-detail-task-assignee" title={employee.name}>
      <span className="project-detail-avatar project-detail-avatar-small" data-person-id={employee.id} aria-hidden="true">{initials(employee.name)}</span>
      {!compact && <span>{employee.name}</span>}
    </span>
  );
}

function AttentionPanel({ items, onOpenTask }) {
  return (
    <section className="project-detail-panel" aria-labelledby="attention-title">
      <h2 className="project-detail-panel-title" id="attention-title">ต้องจับตา</h2>
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
              <TaskAssignee task={task} compact />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function TaskPreview({ tasks, onOpenTask, onNavigateSection, onCreateTask }) {
  const preview = [...tasks]
    .sort((left, right) => Number(left.status === 'completed') - Number(right.status === 'completed')
      || String(left.dueDate || '9999-12-31').localeCompare(String(right.dueDate || '9999-12-31')))
    .slice(0, 5);

  return (
    <section className="project-detail-panel" aria-labelledby="task-preview-title">
      <div className="project-detail-panel-heading project-detail-task-preview-heading">
        <h2 id="task-preview-title">งานในโปรเจกต์</h2>
        <div className="project-detail-task-preview-actions">
          <button type="button" className="project-detail-inline-link" onClick={() => onNavigateSection('tasks')}>
            ดูทั้งหมด ({tasks.length}) <span aria-hidden="true">→</span>
          </button>
          <Button type="button" className="project-detail-add-task" onClick={onCreateTask}><Plus size={15} />เพิ่มงาน</Button>
        </div>
      </div>
      {preview.length === 0 ? (
        <div className="project-detail-empty">ยังไม่มีงานที่เชื่อมโยงกับโปรเจกต์นี้</div>
      ) : (
        <ul className="project-detail-task-list mb-0" aria-label="งานในโปรเจกต์นี้">
          {preview.map((task) => (
            <li key={task.id}>
              <button type="button" className="project-detail-task-row" onClick={() => onOpenTask(task)}>
                <strong>{task.title}</strong>
                <span className={`workspace-status-badge project-detail-task-status status-${task.status}`}>
                  {TASK_STATUS_LABELS[task.status] || 'ไม่ระบุสถานะ'}
                </span>
                <TaskAssignee task={task} compact />
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
    ['วันที่เริ่ม', project.startDate ? formatDate(project.startDate) : null],
    ['กำหนดส่ง', project.dueDate ? formatDate(project.dueDate) : null],
    ['Project Owner', owner?.name],
    ['Team Lead', teamLead?.name],
  ].filter(([, value]) => value);

  return (
    <section className="project-detail-panel" aria-labelledby="project-information-title">
      <div className="project-detail-panel-heading"><h2 id="project-information-title">ข้อมูลโปรเจกต์</h2></div>
      {rows.length > 0 ? (
        <dl className="project-detail-information mb-0">
          {rows.map(([label, value]) => <Fragment key={label}><dt>{label}</dt><dd>{value}</dd></Fragment>)}
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
          จัดการ <span aria-hidden="true">→</span>
        </button>
      </div>
      {members.length === 0 ? (
        <div className="project-detail-empty">โปรเจกต์นี้ยังไม่มีข้อมูลสมาชิกทีม</div>
      ) : (
        <ul className="project-detail-team-list mb-0">
          {members.slice(0, 5).map((member) => {
            const openCount = tasks.filter((task) => String(task.assigneeId) === String(member.id)
              && task.status !== 'completed').length;
            const isOwner = String(project.managerId) === String(member.id);
            const isTeamLead = String(project.teamLeadId) === String(member.id);
            const roles = [isOwner && 'Project Owner', isTeamLead && 'Team Lead'].filter(Boolean);
            return (
              <li key={member.id}>
                <span className="project-detail-avatar" data-person-id={member.id} aria-hidden="true">{initials(member.name)}</span>
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

export default function ProjectOverview({ project, tasks, stats, priority, onNavigateSection, onOpenTask, onCreateTask }) {
  const { deliverables } = useMockData();
  const currentDay = today();
  const attention = buildAttention(tasks, currentDay);
  const attentionOrder = { เลยกำหนด: 0, รอตรวจ: 1, ใกล้ครบ: 2 };
  attention.sort((left, right) => attentionOrder[left.kind] - attentionOrder[right.kind]);
  const projectDeliverables = deliverables.filter((item) => String(item.projectId) === String(project.id));

  return (
    <div className="project-detail-overview">
      <div className="project-detail-kpi-grid">
        <KpiCard icon="progress" title="ความคืบหน้ารวม">
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
        <AttentionKpi tasks={tasks} currentDay={currentDay} />
      </div>

      <div className="project-detail-overview-columns">
        <div className="project-detail-overview-main">
          <AttentionPanel items={attention} onOpenTask={onOpenTask} />
          <TaskPreview tasks={tasks} onOpenTask={onOpenTask} onNavigateSection={onNavigateSection} onCreateTask={onCreateTask} />
        </div>
        <aside className="project-detail-overview-side">
          <ProjectInformation project={project} priority={priority} />
          <ProjectTeam project={project} tasks={tasks} onNavigateSection={onNavigateSection} />
          <ProjectClosure projectId={project.id} tasks={tasks} deliverables={projectDeliverables} />
        </aside>
      </div>
    </div>
  );
}
