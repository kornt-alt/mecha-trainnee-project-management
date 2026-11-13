// Route shell and shared state binding for one Project Workspace.
import { useState } from 'react';
import { Form } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import { MOCK_EMPLOYEES } from '../../data/mockData';
import { useMockData } from '../../context/MockDataContext';
import { priorityOf, statsFrom } from '../../utils/projectTrackingUtils';
import ProjectHeader from './ProjectHeader';
import ProjectNavigation from './ProjectNavigation';
import ProjectOverview from './ProjectOverview';
import ProjectTasks from './ProjectTasks';
import ProjectBoard from './ProjectBoard';
import ProjectTeam from './ProjectTeam';
import ProjectDeliverables from './ProjectDeliverables';
import ProjectTimeline from './ProjectTimeline';
import ProjectActivity from './ProjectActivity';
import '../../styles/project-detail.css';

const SECTIONS = [
  { key: 'overview', label: 'ภาพรวม' }, { key: 'tasks', label: 'งาน' }, { key: 'board', label: 'บอร์ด' },
  { key: 'team', label: 'ทีม' }, { key: 'deliverables', label: 'สิ่งที่ส่งมอบ' }, { key: 'timeline', label: 'ไทม์ไลน์' }, { key: 'activity', label: 'ประวัติ' },
];

export default function ProjectDetail() {
  const { projectId } = useParams();
  const { projects, tasks, deliverables, activity, actorId, setActorId } = useMockData();
  const [activeSection, setActiveSection] = useState('overview');
  const project = projects.find((item) => String(item.id) === String(projectId));
  if (!project) return <section className="project-detail project-detail-not-found" aria-labelledby="project-not-found-title"><h1 id="project-not-found-title" className="page-title">ไม่พบโปรเจกต์</h1><p className="text-muted">โปรเจกต์นี้อาจถูกลบหรือไม่มีอยู่ในข้อมูลปัจจุบัน</p><Link to="/projects" className="btn btn-primary">กลับไปหน้าโปรเจกต์</Link></section>;

  const relatedTasks = tasks.filter((task) => String(task.projectId) === String(project.id));
  const projectDeliverables = deliverables.filter((item) => String(item.projectId) === String(project.id));
  const projectActivity = activity.filter((event) => String(event.projectId) === String(project.id));
  const taskStats = statsFrom(relatedTasks, project.status);
  const stats = taskStats;
  const priority = priorityOf(relatedTasks, project);
  const teamIds = new Set([...(project.teamMemberIds || []).map(String), String(project.managerId || ''), String(project.teamLeadId || '')]);
  const sections = SECTIONS.map((section) => ({
    ...section,
    count: section.key === 'tasks' ? relatedTasks.length
      : section.key === 'team' ? [...teamIds].filter((id) => MOCK_EMPLOYEES.some((person) => String(person.id) === id)).length
        : section.key === 'deliverables' ? projectDeliverables.length
          : section.key === 'activity' ? projectActivity.length : null,
  }));

  return <div className="project-detail"><div className="project-detail-inner">
    <nav className="project-detail-breadcrumb" aria-label="เส้นทางนำทาง"><Link to="/projects">‹ โปรเจกต์</Link><span aria-hidden="true">/</span><span aria-current="page">{project.name}</span></nav>
    <ProjectHeader project={project} stats={stats} priority={priority} />
    <div className="workspace-actor-control"><div><strong>ผู้ใช้งานจำลอง</strong><small>เลือกผู้ดำเนินการเพื่อทดสอบบทบาท Project Owner, Team Leader และสมาชิก</small></div><Form.Select aria-label="เลือกผู้ใช้งานจำลอง" value={actorId} onChange={(event) => setActorId(event.target.value)}>{MOCK_EMPLOYEES.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</Form.Select></div>
    <ProjectNavigation activeSection={activeSection} onSelect={setActiveSection} sections={sections} />
    {activeSection === 'overview' && <ProjectOverview project={project} tasks={relatedTasks} stats={stats} priority={priority} onNavigateSection={setActiveSection} />}
    {activeSection === 'tasks' && <ProjectTasks key={String(project.id)} projectId={project.id} />}
    {activeSection === 'board' && <ProjectBoard key={String(project.id)} projectId={project.id} />}
    {activeSection === 'team' && <ProjectTeam key={String(project.id)} projectId={project.id} />}
    {activeSection === 'deliverables' && <ProjectDeliverables key={String(project.id)} projectId={project.id} />}
    {activeSection === 'timeline' && <ProjectTimeline key={String(project.id)} projectId={project.id} />}
    {activeSection === 'activity' && <ProjectActivity key={String(project.id)} projectId={project.id} />}
  </div></div>;
}
