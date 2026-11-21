// frontend/src/components/project-detail/ProjectTasks.js — แท็บงาน: รายการงาน + ตัวกรอง + แผงรายละเอียดงาน (แผงเดียว)
import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Form } from 'react-bootstrap';
import { currentEmployees } from '../../data/employeeStore';
import { useMockData } from '../../context/MockDataContext';
import { daysBetween, shortThaiDate, today } from '../../utils/projectTrackingUtils';
import { TaskStatusBadge, WorkspaceTaskMetadata } from '../TaskBadges';
import TaskDetailModal from '../TaskDetailModal';
import TaskFormModal from './TaskFormModal';

const employeeById = (id) => currentEmployees().find((employee) => String(employee.id) === String(id));
const employeeName = (id) => employeeById(id)?.name;
const statusFilters = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'not_started', label: 'ยังไม่เริ่ม' },
  { key: 'in_progress', label: 'กำลังทำ' },
  { key: 'pending_review', label: 'รอตรวจ' },
  { key: 'completed', label: 'เสร็จแล้ว' },
];

export default function ProjectTasks({
  projectId,
  openCreate = false,
  selectedTaskId: externalSelectedTaskId,
  selectedTaskAction = '',
  statusFilter: externalStatusFilter = 'all',
  onStatusFilterChange,
  onSelectedTaskChange,
  onOpenTask,
  onCloseTask,
  onClearTaskAction,
  onConsumeCreate,
  taskWorkEntries,
  onAddTaskComment,
  actorId,
}) {
  const { projects, tasks, labels, createTask, updateTask } = useMockData();
  const project = projects.find((item) => String(item.id) === String(projectId));
  const [internalStatusFilter, setInternalStatusFilter] = useState('all');
  const [internalSelectedTaskId, setInternalSelectedTaskId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [labelFilter, setLabelFilter] = useState('all');
  const [editingTask, setEditingTask] = useState(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  useEffect(() => {
    if (openCreate) {
      setEditingTask(null);
      setShowTaskForm(true);
      onConsumeCreate?.();
    }
  }, [openCreate, onConsumeCreate]);

  const projectTasks = useMemo(() => tasks.filter((task) => String(task.projectId) === String(projectId)), [projectId, tasks]);
  const statusFilter = onStatusFilterChange ? externalStatusFilter : internalStatusFilter;
  const visibleTasks = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase();
    return projectTasks.filter((task) => {
      const taskPriority = task.priority === 'normal' ? 'medium' : task.priority || 'none';
      const matchesSearch = !query || `${task.title || ''} ${task.description || ''}`.toLocaleLowerCase().includes(query);
      const matchesPriority = priorityFilter === 'all' || taskPriority === priorityFilter;
      const matchesLabel = labelFilter === 'all' || (task.labelIds || []).some((id) => String(id) === String(labelFilter));
      return (statusFilter === 'all' || task.status === statusFilter) && matchesSearch && matchesPriority && matchesLabel;
    });
  }, [labelFilter, priorityFilter, projectTasks, searchTerm, statusFilter]);

  const selectionIsControlled = Boolean(onSelectedTaskChange || onOpenTask);
  const selectedTaskId = selectionIsControlled ? externalSelectedTaskId : internalSelectedTaskId;
  const selectedTask = projectTasks.find((task) => String(task.id) === String(selectedTaskId));
  const selectTask = (task) => {
    if (task && onOpenTask) onOpenTask(task);
    else if (onSelectedTaskChange) onSelectedTaskChange(task?.id ?? null);
    else setInternalSelectedTaskId(task?.id ?? null);
  };
  const closeTask = () => {
    if (onCloseTask) onCloseTask();
    else if (onSelectedTaskChange) onSelectedTaskChange(null);
    else setInternalSelectedTaskId(null);
  };
  const changeFilter = (value) => {
    if (onStatusFilterChange) onStatusFilterChange(value);
    else setInternalStatusFilter(value);
  };
  const hasActiveFilters = statusFilter !== 'all' || Boolean(searchTerm) || priorityFilter !== 'all' || labelFilter !== 'all';
  const clearFilters = () => {
    changeFilter('all');
    setSearchTerm('');
    setPriorityFilter('all');
    setLabelFilter('all');
  };
  useEffect(() => {
    if (externalSelectedTaskId && !selectedTask) {
      onCloseTask?.();
      onSelectedTaskChange?.(null);
    }
  }, [externalSelectedTaskId, onCloseTask, onSelectedTaskChange, selectedTask]);
  const statusCount = (key) => key === 'all' ? projectTasks.length : projectTasks.filter((task) => task.status === key).length;
  if (!project) return <section className="project-detail-empty" role="status">ไม่พบโปรเจกต์สำหรับแสดงงาน</section>;

  return (
    <section className={`project-tasks-panel is-reference${selectedTask ? ' has-selected-task' : ''}`} aria-label="งานในโปรเจกต์">
      <div className="project-tasks-content">
        <div className="project-tasks-main">
          <div className="project-tasks-top-row">
            <div className="project-tasks-status-filters" role="group" aria-label="กรองงานตามสถานะ">
              {statusFilters.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  className={`project-tasks-status-filter${statusFilter === filter.key ? ' active' : ''}`}
                  data-status={filter.key}
                  aria-pressed={statusFilter === filter.key}
                  onClick={() => changeFilter(filter.key)}
                >
                  {filter.label}<span>{statusCount(filter.key)}</span>
                </button>
              ))}
            </div>
            <div className="project-tasks-heading-actions"><Button className="workspace-reference-add-task" onClick={() => { setEditingTask(null); setShowTaskForm(true); }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg><span>เพิ่มงาน</span></Button></div>
          </div>
          <div className="project-tasks-metadata-filters" aria-label="กรองงานตามข้อมูล">
            <Form.Control id="workspace-task-search" aria-label="ค้นหาชื่องานหรือรายละเอียด" placeholder="ค้นหาชื่องานหรือรายละเอียด..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
            <Form.Select id="workspace-task-priority-filter" aria-label="กรองตามความสำคัญ" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
              <option value="all">ทุกความสำคัญ</option><option value="none">ไม่ระบุ</option><option value="low">ต่ำ</option><option value="medium">ปกติ</option><option value="high">สูง</option><option value="urgent">เร่งด่วน</option>
            </Form.Select>
            <Form.Select id="workspace-task-label-filter" aria-label="กรองตามป้ายกำกับ" value={labelFilter} onChange={(event) => setLabelFilter(event.target.value)}>
              <option value="all">ทุกป้ายกำกับ</option>{labels.map((label) => <option key={label.id} value={String(label.id)}>{label.name}</option>)}
            </Form.Select>
            <Button type="button" className="project-tasks-clear-filters" variant="outline-secondary" disabled={!hasActiveFilters} onClick={clearFilters}>ล้างตัวกรอง</Button>
          </div>
          <Card className="project-tasks-card"><Card.Body>
            {visibleTasks.length === 0 ? <div className="project-tasks-empty" role="status">ไม่มีงานในสถานะนี้</div>
                : <div className="project-tasks-list" aria-label="รายการงานในโปรเจกต์">{visibleTasks.map((task) => {
              const checklist = Array.isArray(task.checklist) ? task.checklist : [];
              const completedChecklist = checklist.filter((item) => item.completed).length;
              const assignee = employeeById(task.assigneeId);
              const currentDay = today();
              const overdue = task.dueDate && task.dueDate < currentDay && task.status !== 'completed';
              return <button type="button" className={`project-tasks-row status-${task.status}${String(selectedTaskId) === String(task.id) ? ' selected' : ''}`} aria-pressed={String(selectedTaskId) === String(task.id)} aria-label={task.title} key={task.id} onClick={() => selectTask(task)}>
                <div className="project-tasks-row-main">
                  <strong className="project-tasks-title-button">{task.title}</strong>
                  <div className="project-tasks-row-subtitle">
                    <span>เช็กลิสต์ </span><span>{completedChecklist}</span>/<span>{checklist.length}</span>
                    <span> · ผู้ตรวจ </span><span>{employeeName(task.reviewerId) || '—'}</span>
                  </div>
                  <WorkspaceTaskMetadata task={task} labels={labels} />
                </div>
                <div className="project-tasks-row-assignee" title={assignee?.name || ''}>
                  {assignee && <span className="project-tasks-avatar" data-person-id={assignee.id} aria-hidden="true">{assignee.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>}
                  <span>{assignee?.name || 'ไม่ระบุ'}</span>
                </div>
                <TaskStatusBadge task={task} className="project-tasks-status" />
                <span className={`project-tasks-row-due${overdue ? ' overdue' : ''}`}>
                  {task.status === 'completed' ? 'เสร็จแล้ว' : overdue ? `เลย ${Math.abs(daysBetween(currentDay, task.dueDate))} วัน` : shortThaiDate(task.dueDate)}
                </span>
              </button>;
                })}</div>}
          </Card.Body></Card>
        </div>
        {selectedTask && <TaskDetailModal
          key={`${project.id}:${selectedTask.id}`}
          task={selectedTask}
          projectId={project.id}
          initialAction={selectedTaskAction}
          onClearInitialAction={onClearTaskAction}
          onClose={closeTask}
          onEdit={(task) => { setEditingTask(task); setShowTaskForm(true); }}
          workEntries={taskWorkEntries || { comments: [] }}
          onAddComment={onAddTaskComment}
          actorId={actorId}
        />}
      </div>
      {showTaskForm && <TaskFormModal project={project} task={editingTask} workspaceMode onClose={() => setShowTaskForm(false)} onSave={(values) => {
        const result = editingTask
          ? updateTask(editingTask.id, values, { type: 'task_updated', description: `แก้ไขรายละเอียดงาน “${values.title}”` })
          : createTask({ ...values, status: 'not_started' });
        if (result) {
          setShowTaskForm(false);
          setEditingTask(null);
        }
        return result;
      }} />}
    </section>
  );
}
