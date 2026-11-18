// frontend/src/components/project-detail/ProjectHeader.js — project identity and actions
import { Badge, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { MOCK_EMPLOYEES } from '../../data/mockData';
import { statusLabel } from '../../utils/config';
import { initials, ownerOf, today } from '../../utils/projectTrackingUtils';
import { Pencil } from '../common/Icons';

const employeeById = (id) => MOCK_EMPLOYEES.find((employee) => String(employee.id) === String(id));

const formatDate = (value, includeYear = true) => {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('th-TH-u-ca-gregory', { day: 'numeric', month: 'short', ...(includeYear ? { year: 'numeric' } : {}) }).format(date);
};

const daysBetween = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);

function PersonSummary({ label, person }) {
  if (!person) return null;
  return (
    <div className="project-detail-person-summary">
      <span className="project-detail-avatar" data-person-id={person.id} aria-hidden="true">{initials(person.name)}</span>
      <span>
        <span className="project-detail-person-label">{label}</span>
        <strong>{person.name}</strong>
      </span>
    </div>
  );
}

export default function ProjectHeader({ project, stats, priority, actorId, onActorChange, onOpenClosure }) {
  const navigate = useNavigate();
  const owner = ownerOf(project) || (project.owner ? { name: project.owner } : null);
  const teamLead = project.teamLeadId ? employeeById(project.teamLeadId) : null;
  const viewerOptions = MOCK_EMPLOYEES;
  const completion = Math.max(0, Math.min(100, stats.progress));
  const currentDay = today();
  const daysRemaining = project.dueDate ? daysBetween(currentDay, project.dueDate) : null;
  const isTerminal = ['done', 'cancelled'].includes(project.status);
  const isOwner = String(actorId) === String(project.managerId);
  const isTeamLead = Boolean(project.teamLeadId) && String(actorId) === String(project.teamLeadId);
  const closure = project.closure || {};
  const allTasksComplete = stats.total > 0 && stats.completed === stats.total;
  const canOpenClosure = isOwner || (isTeamLead && closure.status === 'pending_approval');
  const closureActionLabel = isTeamLead && closure.status === 'pending_approval'
    ? 'ตรวจคำขอปิดโปรเจกต์'
    : closure.status === 'approved' && isOwner
      ? 'ดำเนินการปิดโปรเจกต์'
      : closure.status === 'closed'
        ? 'ปิดโปรเจกต์แล้ว'
        : 'ส่งขออนุมัติปิดโปรเจกต์';
  const canStartClosureAction = canOpenClosure && (!isOwner || allTasksComplete);

  const actorRole = (employeeId) => {
    const roles = [];
    if (String(project.managerId) === String(employeeId)) roles.push('Project Owner');
    if (String(project.teamLeadId || '') === String(employeeId)) roles.push('Team Leader');
    if ((project.teamMemberIds || []).some((id) => String(id) === String(employeeId))) roles.push('สมาชิก');
    return roles.length ? roles.join(' · ') : 'พนักงาน';
  };
  const viewerLabel = (person) => `${actorRole(person.id)} · ${person.name.split(' ')[0]}`;
  const viewerValue = viewerOptions.some((person) => String(person.id) === String(actorId))
    ? actorId
    : actorId;
  const deadlineText = daysRemaining === null
    ? 'ยังไม่ได้กำหนดวันส่ง'
    : daysRemaining < 0 && !isTerminal
      ? `เลยกำหนด ${Math.abs(daysRemaining)} วัน`
      : daysRemaining === 0 && !isTerminal
        ? 'ครบกำหนดวันนี้'
        : daysRemaining > 0 && !isTerminal
          ? `เหลือ ${daysRemaining} วัน`
          : statusLabel(project.status);

  return (
    <header className="project-workspace-hero project-detail-header">
      <div className="project-workspace-banner">
        <div className="project-workspace-banner-glow project-workspace-banner-glow-primary" aria-hidden="true" />
        <div className="project-workspace-banner-glow project-workspace-banner-glow-secondary" aria-hidden="true" />
        <div className="project-workspace-banner-content">
          <span className="project-workspace-banner-title">PROJECT WORKSPACE</span>
          <div className="project-workspace-actor">
            <label htmlFor="workspace-actor">ดูในฐานะ</label>
            <select
              id="workspace-actor"
              className="vw"
              aria-label="เลือกผู้ใช้งานจำลอง"
              value={viewerValue}
              onChange={(event) => onActorChange(event.target.value)}
              style={{ height: 36, padding: '0 14px', borderRadius: 99, border: '1px solid rgba(255,255,255,.55)', background: 'rgba(255,255,255,.2)', color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              {viewerOptions.map((person) => <option key={person.id} value={person.id}>{viewerLabel(person)}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div className="project-detail-header-body">
          <div className="project-detail-title-block">
            <span className="project-detail-project-icon" aria-hidden="true"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2.5h7.5A2.5 2.5 0 0 1 21 10v7.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" /></svg></span>
            <div className="project-detail-badges">
              <Badge bg="" className={`project-detail-badge project-detail-status status-${project.status}`}>
                {project.displayStatusLabel || statusLabel(project.status)}
              </Badge>
              {priority.label !== '-' && (
                <Badge bg="" className={`project-detail-badge project-detail-priority variant-${priority.variant}`}>
                  ความสำคัญ: {priority.label}
                </Badge>
              )}
              {project.category && <Badge bg="" className="project-detail-badge project-detail-category">{project.category}</Badge>}
            </div>
            <h1 className="page-title project-detail-title">{project.name}</h1>
            {project.description && <p className="project-detail-description">{project.description}</p>}

            <div className="project-detail-header-meta">
              <PersonSummary label="Project Owner" person={owner} />
              <PersonSummary label="Team Lead" person={teamLead} />
              {(project.startDate || project.dueDate) && (
                <div className="project-detail-date-summary">
                  <span className="project-detail-date-icon"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#BE185D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M8 3v4M16 3v4M3.5 10h17" /></svg></span>
                  <span>
                    <span className="project-detail-person-label">ช่วงโปรเจกต์</span>
                    <strong>
                      {project.startDate ? formatDate(project.startDate, !project.dueDate) : 'ไม่ระบุวันเริ่ม'}
                      {project.dueDate ? ` → ${formatDate(project.dueDate)}` : ''}
                    </strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          <aside className="project-detail-header-aside" aria-label="สรุปความคืบหน้าและการดำเนินการ">
            <div className="project-detail-header-progress">
              <div
                className="project-detail-progress-ring"
                role="img"
                aria-label={`ความคืบหน้า ${completion}%`}
                style={{ background: `conic-gradient(#2F5BD0 ${completion}%, #E2E8F0 0)` }}
              >
                <span>{completion}%</span>
              </div>
              <div className="project-detail-ring-copy">
                <strong>ความคืบหน้า</strong>
                <span>คำนวณจากงานที่เสร็จ</span>
                <span>{stats.completed} จาก {stats.total} งาน</span>
                <span className={daysRemaining < 0 && !isTerminal ? 'is-overdue' : ''}>{deadlineText}</span>
              </div>
            </div>
            <div className="project-detail-header-actions">
              <Button
                type="button"
                variant="outline-secondary"
                className="project-detail-edit-button"
                onClick={() => navigate('/projects', { state: { editProjectId: project.id } })}
              >
                <Pencil size={16} />
                แก้ไขโปรเจกต์
              </Button>
              <Button
                type="button"
                className="project-detail-closure-button"
                disabled={!canStartClosureAction || closure.status === 'closed'}
                title={!isOwner && !isTeamLead ? 'ดำเนินการได้โดย Project Owner หรือ Team Lead ตามขั้นตอน' : isOwner && !allTasksComplete ? 'ต้องทำทุกงานในโปรเจกต์ให้เสร็จก่อน' : undefined}
                onClick={onOpenClosure}
              >
                {closureActionLabel}
              </Button>
            </div>
            <span className="project-detail-header-hint">
              {isOwner && allTasksComplete
                ? 'ตรวจสรุปและสิ่งที่ส่งมอบก่อนส่งให้ Team Leader อนุมัติ'
                : `ต้องทำทุกงานให้เป็น “เสร็จแล้ว” ก่อน (เสร็จ ${stats.completed}/${stats.total})`}
            </span>
          </aside>
      </div>
    </header>
  );
}
