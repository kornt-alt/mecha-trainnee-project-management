// frontend/src/components/project-detail/ProjectHeader.js — project identity and actions
import { Badge, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { MOCK_EMPLOYEES } from '../../data/mockData';
import { statusLabel } from '../../utils/config';
import { initials, ownerOf, today } from '../../utils/projectTrackingUtils';
import { CalendarDays, Pencil } from '../common/Icons';

const employeeById = (id) => MOCK_EMPLOYEES.find((employee) => String(employee.id) === String(id));

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('th-TH-u-ca-gregory', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
};

const daysBetween = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);

function PersonSummary({ label, person }) {
  if (!person) return null;
  return (
    <div className="project-detail-person-summary">
      <span className="project-detail-avatar" aria-hidden="true">{initials(person.name)}</span>
      <span>
        <span className="project-detail-person-label">{label}</span>
        <strong>{person.name}</strong>
      </span>
    </div>
  );
}

export default function ProjectHeader({ project, stats, priority }) {
  const navigate = useNavigate();
  const owner = ownerOf(project) || (project.owner ? { name: project.owner } : null);
  const teamLead = project.teamLeadId ? employeeById(project.teamLeadId) : null;
  const completion = Math.max(0, Math.min(100, stats.progress));
  const daysRemaining = project.dueDate ? daysBetween(today(), project.dueDate) : null;
  const isTerminal = ['done', 'cancelled'].includes(project.status);
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
    <header className="project-detail-header">
      <div className="project-detail-header-accent" />
      <div className="project-detail-header-body">
        <div className="project-detail-header-main">
          <div className="project-detail-title-block">
            <div className="project-detail-badges">
              <Badge bg="" className={`project-detail-badge project-detail-status status-${project.status}`}>
                {statusLabel(project.status)}
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
                  <span className="project-detail-date-icon"><CalendarDays size={18} /></span>
                  <span>
                    <span className="project-detail-person-label">ช่วงโปรเจกต์</span>
                    <strong>
                      {project.startDate ? formatDate(project.startDate) : 'ไม่ระบุวันเริ่ม'}
                      {project.dueDate ? ` → ${formatDate(project.dueDate)}` : ''}
                    </strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          <aside className="project-detail-header-aside" aria-label="สรุปความคืบหน้าและการดำเนินการ">
            <div className="project-detail-header-progress">
              <div className="project-detail-progress-ring" role="img" aria-label={`ความคืบหน้า ${completion}%`}>
                <svg viewBox="0 0 100 100" aria-hidden="true">
                  <circle className="project-detail-ring-track" cx="50" cy="50" r="43" />
                  <circle
                    className="project-detail-ring-value"
                    cx="50"
                    cy="50"
                    r="43"
                    strokeDasharray={`${completion * 2.702} 270.2`}
                  />
                </svg>
                <span>{completion}%</span>
              </div>
              <div className="project-detail-ring-copy">
                <strong>ความคืบหน้า</strong>
                <span>เสร็จ {stats.completed} จาก {stats.total} งาน</span>
                <span className={daysRemaining < 0 && !isTerminal ? 'is-overdue' : ''}>{deadlineText}</span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline-secondary"
              className="project-detail-edit-button"
              onClick={() => navigate('/projects', { state: { editProjectId: project.id } })}
            >
              <Pencil size={16} />
              แก้ไขโปรเจกต์
            </Button>
          </aside>
        </div>
      </div>
    </header>
  );
}
