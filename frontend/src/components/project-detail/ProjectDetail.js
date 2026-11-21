// frontend/src/components/project-detail/ProjectDetail.js — หน้า Project Workspace (แท็บ ภาพรวม / งาน / บอร์ด / ทีม / ส่งมอบ / ไทม์ไลน์ / ประวัติ)
//
// หน้าอื่นเปิดงานที่นี่ได้ด้วย navigate('/projects/:id', { state: { openTaskId } }) — รายละเอียดงานมีที่เดียวคือใน workspace (UX-10)
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { currentEmployees } from '../../data/employeeStore';
import { useMockData } from '../../context/MockDataContext';
import { priorityOf, statsFrom } from '../../utils/projectTrackingUtils';
import { projectHealth } from '../../utils/executiveMetrics';
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
  { key: 'overview', label: 'ภาพรวม' }, { key: 'tasks', label: 'งาน' },
  { key: 'board', label: 'บอร์ด' }, { key: 'team', label: 'ทีม' },
  { key: 'deliverables', label: 'สิ่งที่ส่งมอบ' }, { key: 'timeline', label: 'ไทม์ไลน์' },
  { key: 'activity', label: 'ประวัติ' },
];

export default function ProjectDetail() {
  const { projectId } = useParams();
  const { projects, tasks, deliverables, activity, actorId, taskWork, addTaskWorkEntry, projectCosts, access } = useMockData();
  const [activeSection, setActiveSection] = useState('overview');
  const [createTaskRequested, setCreateTaskRequested] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskAction, setTaskAction] = useState('');
  const [taskFilter, setTaskFilter] = useState('all');
  const [teamNotice, setTeamNotice] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const requestedTaskId = location.state?.openTaskId;
  useEffect(() => {
    setSelectedTask(null);
    setTaskAction('');
    setTaskFilter('all');
    setTeamNotice(null);
  }, [projectId]);
  // ⚠️ ต้องอยู่หลัง effect ล้างค่าตอนเปลี่ยนโปรเจกต์ข้างบน — effect รันตามลำดับ ถ้าอยู่ก่อนจะถูกล้างทิ้งทันที
  useEffect(() => {
    if (requestedTaskId === undefined || requestedTaskId === null) return;
    const target = tasks.find((task) => String(task.id) === String(requestedTaskId) && String(task.projectId) === String(projectId));
    if (target) {
      setSelectedTask({ projectId: String(projectId), taskId: String(target.id) });
      setTaskFilter('all');
      setActiveSection('tasks');
    }
    // ล้าง state ออกจาก history — refresh / กดย้อนกลับแล้วไม่เปิดงานเดิมซ้ำ
    navigate(location.pathname, { replace: true, state: null });
  }, [requestedTaskId, projectId, tasks, navigate, location.pathname]);
  const project = projects.find((item) => String(item.id) === String(projectId));
  if (!project) return <section className="project-detail project-detail-not-found" aria-labelledby="project-not-found-title"><h1 id="project-not-found-title" className="page-title">ไม่พบโปรเจกต์</h1><p className="text-muted">โปรเจกต์นี้อาจถูกลบหรือไม่มีอยู่ในข้อมูลปัจจุบัน</p><Link to="/projects" className="btn btn-primary">กลับไปหน้าโปรเจกต์</Link></section>;

  const relatedTasks = tasks.filter((task) => String(task.projectId) === String(project.id));
  const projectDeliverables = deliverables.filter((item) => String(item.projectId) === String(project.id));
  const projectActivity = activity.filter((event) => String(event.projectId) === String(project.id));
  const taskStats = statsFrom(relatedTasks, project.status);
  const stats = taskStats;
  const priority = priorityOf(relatedTasks, project);
  const health = projectHealth(project, relatedTasks, { costs: projectCosts });
  const teamIds = new Set([...(project.teamMemberIds || []).map(String), String(project.managerId || ''), String(project.teamLeadId || '')]);
  const sections = SECTIONS.map((section) => ({
    ...section,
    count: section.key === 'tasks' ? relatedTasks.length
      : section.key === 'team' ? [...teamIds].filter((id) => currentEmployees().some((person) => String(person.id) === id)).length
        : section.key === 'deliverables' ? `${projectDeliverables.filter((item) => item.status === 'completed').length}/${projectDeliverables.length}`
          : section.key === 'activity' ? projectActivity.length : null,
  }));

  const openClosure = () => {
    setActiveSection('overview');
    window.setTimeout(() => document.getElementById('project-closure')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
  };
  const openTaskComposer = () => {
    setActiveSection('tasks');
    setCreateTaskRequested(true);
  };
  const openWorkspaceTask = (task, options = {}) => {
    if (!task || String(task.projectId) !== String(project.id)) return;
    setSelectedTask({ projectId: String(project.id), taskId: String(task.id) });
    setTaskAction(options.action || '');
    setTaskFilter('all');
    setActiveSection('tasks');
  };
  const closeWorkspaceTask = () => {
    setSelectedTask(null);
    setTaskAction('');
  };
  const selectedTaskId = selectedTask?.projectId === String(project.id) ? selectedTask.taskId : null;

  return <div className="project-detail is-reference"><div className="project-detail-inner">
    <nav className="project-detail-breadcrumb" aria-label="เส้นทางนำทาง"><Link to="/projects"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>โปรเจกต์</Link><span aria-hidden="true">/</span><span aria-current="page">{project.name}</span></nav>
    <ProjectHeader project={project} stats={stats} priority={priority} health={health} actorId={actorId} actorRoleLabel={access.roleIn(project)} onOpenClosure={openClosure} />
    <ProjectNavigation activeSection={activeSection} onSelect={setActiveSection} sections={sections} />
    {activeSection === 'overview' && <ProjectOverview project={project} tasks={relatedTasks} stats={stats} onNavigateSection={setActiveSection} onOpenTask={openWorkspaceTask} onCreateTask={openTaskComposer} />}
    {activeSection === 'tasks' && <ProjectTasks
      key={String(project.id)}
      projectId={project.id}
      openCreate={createTaskRequested}
      selectedTaskId={selectedTaskId}
      selectedTaskAction={selectedTaskId ? taskAction : ''}
      statusFilter={taskFilter}
      onStatusFilterChange={setTaskFilter}
      onOpenTask={openWorkspaceTask}
      onCloseTask={closeWorkspaceTask}
      onClearTaskAction={() => setTaskAction('')}
      onConsumeCreate={() => setCreateTaskRequested(false)}
      taskWorkEntries={selectedTaskId ? taskWork[String(selectedTaskId)] || { comments: [] } : { comments: [] }}
      onAddTaskComment={(taskId, entry) => addTaskWorkEntry(taskId, 'comments', entry)}
      actorId={actorId}
    />}
    {activeSection === 'board' && <ProjectBoard key={String(project.id)} projectId={project.id} onOpenTask={openWorkspaceTask} />}
    {activeSection === 'team' && <ProjectTeam key={String(project.id)} projectId={project.id} notice={teamNotice} onNoticeChange={setTeamNotice} onNavigateTasks={() => setActiveSection('tasks')} />}
    {activeSection === 'deliverables' && <ProjectDeliverables key={String(project.id)} projectId={project.id} />}
    {activeSection === 'timeline' && <ProjectTimeline key={String(project.id)} projectId={project.id} onOpenTask={openWorkspaceTask} />}
    {activeSection === 'activity' && <ProjectActivity key={String(project.id)} projectId={project.id} />}
  </div></div>;
}
