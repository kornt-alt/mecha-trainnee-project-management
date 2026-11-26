// frontend/src/components/project-detail/ProjectOverview.js — แท็บภาพรวมโปรเจกต์ (KPI, ต้องจับตา, งาน, ทีม, งบประมาณ, การปิดโปรเจกต์)
import { useState } from 'react';
import { Badge, Button, Form, ProgressBar } from 'react-bootstrap';
import { projectSpend } from '../../utils/executiveMetrics';
import { TASK_STATUS_ORDER, taskStatusLabel } from '../../utils/labels';
import { currentEmployees } from '../../data/employeeStore';
import { useMockData } from '../../context/MockDataContext';
import { daysBetween, initials, shortThaiDate, today } from '../../utils/projectTrackingUtils';
import { Plus } from '../common/Icons';
import { WorkspaceTaskMetadata, WORKSPACE_AVATAR_COLORS } from '../TaskBadges';
import ProjectClosure from './ProjectClosure';
import { Link } from 'react-router-dom';

// ชื่อสถานะมาจาก utils/labels.js ที่เดียว — ที่นี่เก็บแค่สีของแถบ
const STATUS_COLORS = {
  not_started: 'var(--workspace-status-segment-neutral)',
  in_progress: 'var(--workspace-status-segment-progress)',
  pending_review: 'var(--workspace-status-segment-review)',
  completed: 'var(--workspace-status-segment-done)',
};
const TASK_STATUSES = TASK_STATUS_ORDER.map((key) => ({ key, label: taskStatusLabel(key), color: STATUS_COLORS[key] }));

const employeeById = (id) => currentEmployees().find((employee) => String(employee.id) === String(id));
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
    if (task.blocked && task.status !== 'pending_review') {
      kind = 'ติดปัญหา';
      detail = task.blocked.reason || `แจ้งโดย ${employeeById(task.blocked.by)?.name || 'สมาชิก'}`;
    } else if (daysUntilDue !== null && daysUntilDue < 0) {
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
              <Badge bg="" className={`project-detail-attention-badge attention-${['เลยกำหนด', 'ติดปัญหา'].includes(kind) ? 'overdue' : kind === 'รอตรวจ' ? 'review' : 'upcoming'}`}>
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

function TaskPreview({ tasks, labels, onOpenTask, onNavigateSection, onCreateTask }) {
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
                <span className="project-detail-task-row-copy">
                  <strong>{task.title}</strong>
                  <WorkspaceTaskMetadata task={task} labels={labels} />
                </span>
                <span className={`workspace-status-badge project-detail-task-status status-${task.status}`}>
                  {taskStatusLabel(task.status)}
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
          {members.slice(0, 5).map((member, index) => {
            const openCount = tasks.filter((task) => String(task.assigneeId) === String(member.id)
              && task.status !== 'completed').length;
            const isOwner = String(project.managerId) === String(member.id);
            const isTeamLead = String(project.teamLeadId) === String(member.id);
            const roles = [isOwner && 'Project Owner', isTeamLead && 'Team Lead'].filter(Boolean);
            return (
              <li key={member.id}>
                <span className="project-detail-avatar" data-person-id={member.id} aria-hidden="true" style={{ backgroundColor: WORKSPACE_AVATAR_COLORS[index % WORKSPACE_AVATAR_COLORS.length][0], color: WORKSPACE_AVATAR_COLORS[index % WORKSPACE_AVATAR_COLORS.length][1] }}>{initials(member.name)}</span>
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

// งบประมาณ: งบตั้งตอนสร้างโปรเจกต์ (plannedBudget) + ยอดจ่ายกรอกเดือนละ 1 ช่อง (setProjectMonthlyCost)
// Owner / Team Lead เห็นช่องกรอก · คนอื่นเห็นตัวเลขอย่างเดียว
const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const recentMonths = (count = 6) => Array.from({ length: count }, (_, index) => {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - index);
  return monthKey(date);
});
const thaiMonth = (key) => new Intl.DateTimeFormat('th-TH-u-ca-gregory', { month: 'short', year: 'numeric' }).format(new Date(`${key}-01T00:00:00`));
const baht = (value) => `${Number(value || 0).toLocaleString('th-TH')} ฿`;

function BudgetPanel({ project }) {
  const { projectCosts, setProjectMonthlyCost, access } = useMockData();
  const months = recentMonths();
  const [month, setMonth] = useState(months[0]);
  const existing = projectCosts.find((item) => String(item.projectId) === String(project.id) && item.month === month);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const spend = projectSpend(project, projectCosts);
  const canEdit = access.canManage(project);
  const save = (event) => {
    event.preventDefault();
    const saved = setProjectMonthlyCost(project.id, month, amount === '' ? existing?.amount ?? 0 : amount);
    setMessage(saved ? `บันทึกยอดเดือน ${thaiMonth(month)} แล้ว` : 'บันทึกไม่สำเร็จ — ตรวจตัวเลขและสิทธิ์ (Owner / Team Lead)');
    if (saved) setAmount('');
  };

  if (!spend.budget && !spend.spent && !canEdit) return null;
  return (
    <section className="project-detail-panel" aria-labelledby="project-budget-title">
      <h2 className="project-detail-panel-title" id="project-budget-title">งบประมาณ</h2>
      <div className="project-budget-figures">
        <span><small>งบ</small><strong>{spend.budget ? baht(spend.budget) : '—'}</strong></span>
        <span><small>ใช้ไป</small><strong>{baht(spend.spent)}</strong></span>
        <span><small>คงเหลือ</small><strong className={spend.remaining < 0 ? 'text-danger' : ''}>{spend.budget ? baht(spend.remaining) : '—'}</strong></span>
      </div>
      {spend.percent !== null && <ProgressBar now={Math.min(100, spend.percent)} variant={spend.percent > 90 ? 'danger' : 'primary'} label={`${spend.percent}%`} aria-label={`ใช้งบไป ${spend.percent}%`} />}
      {!spend.budget && <p className="workspace-muted-copy mb-0">ยังไม่ได้ตั้งงบ — ใส่ได้ที่ “แก้ไขโปรเจกต์”</p>}
      {canEdit && <Form onSubmit={save} className="project-budget-form">
        <Form.Group><Form.Label htmlFor="project-cost-month" className="small mb-1">เดือน</Form.Label><Form.Select id="project-cost-month" size="sm" value={month} onChange={(event) => { setMonth(event.target.value); setAmount(''); setMessage(''); }}>{months.map((key) => <option key={key} value={key}>{thaiMonth(key)}</option>)}</Form.Select></Form.Group>
        <Form.Group><Form.Label htmlFor="project-cost-amount" className="small mb-1">ยอดจ่ายเดือนนี้ (บาท)</Form.Label><Form.Control id="project-cost-amount" size="sm" type="number" min="0" step="100" placeholder={existing ? String(existing.amount) : '0'} value={amount} onChange={(event) => setAmount(event.target.value)} /></Form.Group>
        <Button type="submit" size="sm" disabled={amount === ''}>บันทึกยอด</Button>
      </Form>}
      {message && <p className="small mt-2 mb-0" role="status">{message}</p>}
    </section>
  );
}

export default function ProjectOverview({ project, tasks, stats, onNavigateSection, onOpenTask, onCreateTask }) {
  const { deliverables, labels } = useMockData();
  const currentDay = today();
  const attention = buildAttention(tasks, currentDay);
  const attentionOrder = { ติดปัญหา: 0, เลยกำหนด: 1, รอตรวจ: 2, ใกล้ครบ: 3 };
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
          <TaskPreview tasks={tasks} labels={labels} onOpenTask={onOpenTask} onNavigateSection={onNavigateSection} onCreateTask={onCreateTask} />
        </div>
        <aside className="project-detail-overview-side">
          <ProjectTeam project={project} tasks={tasks} onNavigateSection={onNavigateSection} />
          <BudgetPanel project={project} />
          <section className="project-detail-panel" aria-labelledby="project-boards-title">
            <div className="project-detail-panel-heading">
              <h2 id="project-boards-title">บอร์ดโปรเจกต์</h2>
              <Link to={`/boards?project=${project.id}`} className="project-detail-link-btn">เปิด Boards</Link>
            </div>
            <p className="text-muted small mb-0">สร้างไวท์บอร์ดสำหรับระดมไอเดีย วางแผน และเชื่อมโยงกับโปรเจกต์นี้ (เก็บในเบราว์เซอร์เครื่องนี้)</p>
          </section>
          <ProjectClosure projectId={project.id} tasks={tasks} deliverables={projectDeliverables} />
        </aside>
      </div>
    </div>
  );
}
