// Project-scoped task management backed by the shared MockDataContext.
import { useMemo, useState } from 'react';
import { Badge, Button, Card, Form, InputGroup, ProgressBar, Table } from 'react-bootstrap';
import { MOCK_EMPLOYEES } from '../../data/mockData';
import { useMockData } from '../../context/MockDataContext';
import { ymd } from '../../utils/projectTrackingUtils';
import { Plus, Search } from '../common/Icons';
import { TaskPriorityBadge, TaskStatusBadge } from '../TaskBadges';
import TaskDetailModal from '../TaskDetailModal';
import TaskFormModal from './TaskFormModal';

const employeeName = (id) => MOCK_EMPLOYEES.find((employee) => String(employee.id) === String(id))?.name;
const dateLabel = (date) => (date ? ymd(date) : '—');
const priorityRank = { urgent: 4, high: 3, normal: 2, medium: 2, low: 1 };

export default function ProjectTasks({ projectId }) {
  const { projects, tasks, createTask, updateTask } = useMockData();
  const project = projects.find((item) => String(item.id) === String(projectId));
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('due_asc');
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [showTaskForm, setShowTaskForm] = useState(false);

  const projectTasks = useMemo(() => tasks.filter((task) => String(task.projectId) === String(projectId)), [projectId, tasks]);
  const projectEmployees = useMemo(() => {
    const ids = new Set(projectTasks.map((task) => String(task.assigneeId)));
    (project?.teamMemberIds || []).forEach((id) => ids.add(String(id)));
    if (project?.managerId) ids.add(String(project.managerId));
    if (project?.teamLeadId) ids.add(String(project.teamLeadId));
    return MOCK_EMPLOYEES.filter((person) => ids.has(String(person.id)));
  }, [project, projectTasks]);

  const visibleTasks = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase();
    return projectTasks.filter((task) => (
      (!query || `${task.title || ''} ${task.description || ''}`.toLocaleLowerCase().includes(query))
      && (statusFilter === 'all' || task.status === statusFilter)
      && (priorityFilter === 'all' || task.priority === priorityFilter)
      && (assigneeFilter === 'all' || String(task.assigneeId) === assigneeFilter)
    )).sort((left, right) => {
      if (sortBy === 'title') return left.title.localeCompare(right.title, 'th');
      if (sortBy === 'priority_desc') return (priorityRank[right.priority] || 0) - (priorityRank[left.priority] || 0);
      if (sortBy === 'due_desc') return String(right.dueDate || '').localeCompare(String(left.dueDate || ''));
      return String(left.dueDate || '9999-12-31').localeCompare(String(right.dueDate || '9999-12-31'));
    });
  }, [projectTasks, searchTerm, statusFilter, priorityFilter, assigneeFilter, sortBy]);

  const selectedTask = tasks.find((task) => String(task.id) === String(selectedTaskId));
  const resetFilters = () => {
    setSearchTerm(''); setStatusFilter('all'); setPriorityFilter('all'); setAssigneeFilter('all'); setSortBy('due_asc');
  };

  if (!project) return <section className="project-detail-empty" role="status">ไม่พบโปรเจกต์สำหรับแสดงงาน</section>;

  return (
    <section className="project-tasks-panel" aria-labelledby="project-tasks-heading">
      <div className="project-tasks-heading-row">
        <div><span className="project-detail-placeholder-label">PROJECT TASKS</span><h2 id="project-tasks-heading">งานในโปรเจกต์</h2><p>รายการงานที่เชื่อมโยงกับโปรเจกต์นี้</p></div>
        <div className="project-tasks-heading-actions"><Badge className="project-tasks-total">{projectTasks.length} งาน</Badge><Button onClick={() => { setEditingTask(null); setShowTaskForm(true); }}><Plus size={16} /> เพิ่มงาน</Button></div>
      </div>
      <Card className="project-tasks-card"><Card.Body>
        <div className="project-tasks-toolbar project-tasks-toolbar-expanded">
          <InputGroup><InputGroup.Text><Search size={15} /></InputGroup.Text><Form.Control type="search" aria-label="ค้นหางานในโปรเจกต์" placeholder="ค้นหาชื่องานหรือรายละเอียด..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} /></InputGroup>
          <Form.Select aria-label="กรองสถานะงานในโปรเจกต์" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">ทุกสถานะ</option><option value="not_started">รอเริ่มทำ</option><option value="in_progress">กำลังดำเนินการ</option><option value="pending_review">รอการตรวจสอบ</option><option value="completed">เสร็จสิ้น</option>
          </Form.Select>
          <Form.Select aria-label="กรองความสำคัญงานในโปรเจกต์" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
            <option value="all">ทุกความสำคัญ</option><option value="urgent">ด่วนมาก</option><option value="high">สูง</option><option value="normal">ปกติ</option><option value="low">ต่ำ</option>
          </Form.Select>
          <Form.Select aria-label="กรองผู้รับผิดชอบงานในโปรเจกต์" value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)}><option value="all">ผู้รับผิดชอบทุกคน</option>{projectEmployees.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</Form.Select>
          <Form.Select aria-label="เรียงงานในโปรเจกต์" value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="due_asc">กำหนดส่งใกล้สุด</option><option value="due_desc">กำหนดส่งไกลสุด</option><option value="priority_desc">ความสำคัญสูงสุด</option><option value="title">ชื่องาน ก-ฮ</option></Form.Select>
        </div>
        {projectTasks.length === 0 ? <div className="project-tasks-empty" role="status"><strong>ยังไม่มีงานในโปรเจกต์นี้</strong><span>เพิ่มงานเพื่อเริ่มติดตามความคืบหน้าใน Workspace</span><Button onClick={() => setShowTaskForm(true)}>เพิ่มงานแรก</Button></div>
          : visibleTasks.length === 0 ? <div className="project-tasks-empty" role="status"><strong>ไม่พบงานที่ตรงกับเงื่อนไข</strong><span>ลองเปลี่ยนคำค้นหาหรือตัวกรอง</span><button type="button" onClick={resetFilters}>ล้างตัวกรอง</button></div>
            : <div className="project-tasks-table-wrap"><Table hover className="project-tasks-table align-middle mb-0"><thead><tr><th scope="col">ชื่องาน</th><th scope="col">สถานะ</th><th scope="col">ความสำคัญ</th><th scope="col">ผู้รับผิดชอบหลัก</th><th scope="col">วันที่เริ่ม</th><th scope="col">กำหนดส่ง</th><th scope="col">ชั่วโมง</th><th scope="col">ความคืบหน้า</th></tr></thead><tbody>{visibleTasks.map((task) => {
              const hasProgress = typeof task.progress === 'number' && Number.isFinite(task.progress);
              return <tr className="project-tasks-row" key={task.id}>
                <td><button type="button" className="project-tasks-title-button" aria-label={task.title} onClick={() => setSelectedTaskId(task.id)}>{task.title}</button></td>
                <td><TaskStatusBadge task={task} className="project-tasks-status" /></td><td><TaskPriorityBadge priority={task.priority} className="project-tasks-priority" /></td>
                <td>{employeeName(task.assigneeId) || '—'}</td><td>{dateLabel(task.startDate)}</td><td>{dateLabel(task.dueDate)}</td><td>{task.estimatedHours ?? '—'}</td>
                <td>{hasProgress ? <div className="project-tasks-progress"><span>{task.progress}%</span><ProgressBar now={task.progress} /></div> : '—'}</td>
              </tr>;
            })}</tbody></Table></div>}
      </Card.Body></Card>
      {selectedTask && <TaskDetailModal task={selectedTask} projectId={project.id} onClose={() => setSelectedTaskId(null)} onEdit={(task) => { setEditingTask(task); setSelectedTaskId(null); setShowTaskForm(true); }} />}
      {showTaskForm && <TaskFormModal project={project} task={editingTask} onClose={() => setShowTaskForm(false)} onSave={(values) => {
        if (editingTask) updateTask(editingTask.id, values, { type: 'task_updated', description: `แก้ไขรายละเอียดงาน “${values.title}”` });
        else createTask({ ...values, status: 'not_started', statusLabel: 'รอเริ่มทำ' });
        setShowTaskForm(false);
      }} />}
    </section>
  );
}
