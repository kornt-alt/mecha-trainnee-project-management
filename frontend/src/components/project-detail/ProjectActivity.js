// Chronological Project Activity view backed by the shared event stream.
import { useMemo, useState } from 'react';
import { Card, Form } from 'react-bootstrap';
import { MOCK_EMPLOYEES } from '../../data/mockData';
import { useMockData } from '../../context/MockDataContext';

const categories = [
  ['all', 'ทุกกิจกรรม'], ['project', 'โปรเจกต์'], ['task', 'งาน'], ['review', 'การตรวจงาน'],
  ['checklist', 'Checklist'], ['member', 'ทีมงาน'], ['deliverable', 'สิ่งที่ส่งมอบ'], ['closure', 'ปิดโปรเจกต์'],
];
const categoryOf = (type = '') => type.includes('closure') ? 'closure'
  : type.includes('review') || type.includes('changes_requested') ? 'review'
    : type.includes('checklist') ? 'checklist'
      : type.includes('member') || type.includes('team_lead') ? 'member'
        : type.includes('deliverable') ? 'deliverable'
          : type.startsWith('task_') ? 'task' : 'project';
const formatStamp = (stamp) => {
  const date = new Date(stamp);
  return Number.isNaN(date.getTime()) ? 'ไม่ระบุเวลา' : new Intl.DateTimeFormat('th-TH-u-ca-gregory', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

export default function ProjectActivity({ projectId }) {
  const { projects, activity } = useMockData();
  const project = projects.find((item) => String(item.id) === String(projectId));
  const [filter, setFilter] = useState('all');
  const events = useMemo(() => activity.filter((event) => String(event.projectId) === String(projectId))
    .filter((event) => filter === 'all' || categoryOf(event.type) === filter)
    .sort((left, right) => String(right.timestamp).localeCompare(String(left.timestamp))), [activity, projectId, filter]);

  if (!project) return <div className="project-detail-empty">ไม่พบโปรเจกต์</div>;
  return <section className="workspace-section" aria-labelledby="workspace-activity-title"><div className="workspace-section-heading"><div><span className="project-detail-placeholder-label">PROJECT ACTIVITY</span><h2 id="workspace-activity-title">ประวัติและกิจกรรม</h2><p>บันทึกการเปลี่ยนแปลงจริงของโปรเจกต์นี้</p></div><span className="workspace-count-pill">{events.length} รายการ</span></div><Card className="workspace-panel"><Card.Body><div className="workspace-activity-toolbar"><Form.Select aria-label="กรองประเภทกิจกรรม" value={filter} onChange={(event) => setFilter(event.target.value)}>{categories.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Form.Select></div>{events.length === 0 ? <div className="workspace-empty-state"><strong>{activity.some((event) => String(event.projectId) === String(projectId)) ? 'ไม่มีกิจกรรมตามตัวกรอง' : 'ยังไม่มีประวัติกิจกรรม'}</strong><span>กิจกรรมจะปรากฏหลังมีการเปลี่ยนแปลงจริงใน Workspace</span></div> : <ol className="workspace-activity-list">{events.map((event) => {
      const actor = MOCK_EMPLOYEES.find((person) => String(person.id) === String(event.actorId));
      const day = new Intl.DateTimeFormat('th-TH-u-ca-gregory', { dateStyle: 'long' }).format(new Date(event.timestamp));
      return <li key={event.id} className="workspace-activity-event"><span className="workspace-activity-marker" aria-hidden="true" /><div className="workspace-activity-event-copy"><div><strong>{event.description}</strong><small>{actor?.name || event.actorId || 'ไม่ระบุผู้ดำเนินการ'} · {formatStamp(event.timestamp)}</small>{event.reason && <p>เหตุผล: {event.reason}</p>}</div><span className="workspace-activity-type">{categories.find(([key]) => key === categoryOf(event.type))?.[1] || 'กิจกรรม'}</span><span className="visually-hidden">{day}</span></div></li>;
    })}</ol>}</Card.Body></Card></section>;
}
