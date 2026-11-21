// Chronological project activity backed by the shared event stream.
import { useMemo } from 'react';
import { Card } from 'react-bootstrap';
import { currentEmployees } from '../../data/employeeStore';
import { useMockData } from '../../context/MockDataContext';
import { initials } from '../../utils/projectTrackingUtils';

const formatStamp = (stamp) => {
  const date = new Date(stamp);
  if (Number.isNaN(date.getTime())) return 'ไม่ระบุเวลา';
  return new Intl.DateTimeFormat('th-TH-u-ca-gregory', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
};

export default function ProjectActivity({ projectId }) {
  const { projects, activity } = useMockData();
  const project = projects.find((item) => String(item.id) === String(projectId));
  const events = useMemo(() => activity.filter((event) => String(event.projectId) === String(projectId))
    .slice().sort((left, right) => String(right.timestamp).localeCompare(String(left.timestamp))), [activity, projectId]);
  if (!project) return <div className="project-detail-empty">ไม่พบโปรเจกต์</div>;

  return <section className="workspace-activity-section" aria-label="ประวัติการดำเนินการ">
    <Card className="workspace-panel"><Card.Body>
      <h2 className="workspace-reference-activity-title">ประวัติการดำเนินการ</h2>
      {events.length ? <div className="workspace-reference-activity-list workspace-history-scroll">{events.map((event) => {
        const actor = currentEmployees().find((person) => String(person.id) === String(event.actorId));
        return <article className="workspace-reference-activity-row" key={event.id}>
          <span className="project-detail-avatar" data-person-id={actor?.id} aria-hidden="true">{initials(actor?.name || event.actorId || '?')}</span>
          <span className="workspace-reference-activity-copy">
            <span><strong>{actor?.name || event.actorId || 'ไม่ระบุผู้ดำเนินการ'}</strong> {event.description}</span>
            <span>{formatStamp(event.timestamp)}{event.reason ? ` · เหตุผล: ${event.reason}` : ''}</span>
          </span>
        </article>;
      })}</div> : null}
    </Card.Body></Card>
  </section>;
}
