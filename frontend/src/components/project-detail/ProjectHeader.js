// frontend/src/components/project-detail/ProjectHeader.js — หัวหน้าโปรเจกต์: ชื่อ สถานะ สุขภาพ คน วันส่ง ปุ่มแก้ไข / ปิดโปรเจกต์
import { Badge, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { currentEmployees } from '../../data/employeeStore';
import { statusLabel } from '../../utils/config';
import { initials, ownerOf, today } from '../../utils/projectTrackingUtils';
import { Pencil } from '../common/Icons';
import HealthBadge from '../common/HealthBadge';

const employeeById = (id) => currentEmployees().find((employee) => String(employee.id) === String(id));

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

export default function ProjectHeader({ project, stats, priority, health, actorId, actorRoleLabel, onOpenClosure }) {
  const navigate = useNavigate();
  const owner = ownerOf(project) || (project.owner ? { name: project.owner } : null);
  const teamLead = project.teamLeadId ? employeeById(project.teamLeadId) : null;
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
    : closure.status === 'pending_approval'
      ? 'รอ Team Lead อนุมัติ'
      : closure.status === 'closed'
        ? 'ปิดโปรเจกต์แล้ว'
        : 'ส่งขออนุมัติปิดโปรเจกต์';
  const canStartClosureAction = canOpenClosure && (!isOwner || allTasksComplete);

  const actorRole = (employeeId) => {
    const roles = [];
    if (String(project.managerId) === String(employeeId)) roles.push('Project Owner');
    if (String(project.teamLeadId || '') === String(employeeId)) roles.push('Team Leader');
    if ((project.teamMemberIds || []).some((id) => String(id) === String(employeeId))) roles.push('สมาชิก');
    // ไม่ได้อยู่ในโปรเจกต์ → บทบาทตามสิทธิ์ (ผู้ดูแลระบบ / Management / ผู้ชม — utils/access.js projectRoleOf)
    return roles.length ? roles.join(' · ') : (actorRoleLabel || 'พนักงาน');
  };
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
          {/* บอกบทบาทของคนที่ login ในโปรเจกต์นี้ (เดิมมีตัวเลือก "ดูในฐานะ" ซ้ำกับ login — ลบแล้ว เปลี่ยนผู้ใช้ด้วยการออกจากระบบ) */}
          {employeeById(actorId) && <span className="project-workspace-actor-role">คุณ: {actorRole(actorId)}</span>}
        </div>
      </div>
      <div className="project-detail-header-body">
          <div className="project-detail-title-block">
            <span className="project-detail-project-icon" aria-hidden="true"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2.5h7.5A2.5 2.5 0 0 1 21 10v7.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" /></svg></span>
            <div className="project-detail-badges">
              <Badge bg="" className={`project-detail-badge project-detail-status status-${project.status}`}>
                {project.displayStatusLabel || statusLabel(project.status)}
              </Badge>
              {health && <HealthBadge health={health} className="project-detail-badge" />}
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
                onClick={() => navigate('/projects', { state: { editProjectId: project.id, returnTo: `/projects/${project.id}` } })}
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
              {closure.status === 'closed'
                ? 'โปรเจกต์นี้ปิดแล้ว'
                : closure.status === 'pending_approval'
                  ? 'ส่งขออนุมัติแล้ว รอ Team Lead ตรวจ'
                  : isOwner && allTasksComplete
                    ? 'งานครบแล้ว ส่งให้ Team Lead อนุมัติปิดได้เลย'
                    : `ต้องทำทุกงานให้เป็น “เสร็จแล้ว” ก่อน (เสร็จ ${stats.completed}/${stats.total})`}
            </span>
          </aside>
      </div>
    </header>
  );
}
