// Project-scoped task list and detail workflow using shared MockDataContext records.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import { MOCK_EMPLOYEES } from '../../data/mockData';
import { useMockData } from '../../context/MockDataContext';
import { today, ymd } from '../../utils/projectTrackingUtils';
import { Plus } from '../common/Icons';
import { TaskStatusBadge } from '../TaskBadges';
import TaskDetailModal from '../TaskDetailModal';
import TaskFormModal from './TaskFormModal';

const employeeById = (id) => MOCK_EMPLOYEES.find((employee) => String(employee.id) === String(id));
const employeeName = (id) => employeeById(id)?.name;
const dateLabel = (date) => (date ? ymd(date) : '—');
const statusFilters = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'not_started', label: 'ยังไม่เริ่ม' },
  { key: 'in_progress', label: 'กำลังทำ' },
  { key: 'pending_review', label: 'รอตรวจ' },
  { key: 'completed', label: 'เสร็จแล้ว' },
];

export default function ProjectTasks({ projectId, openCreate = false, onConsumeCreate }) {
  const { projects, tasks, createTask, updateTask } = useMockData();
  const panelContainerRef = useRef(null);
  const project = projects.find((item) => String(item.id) === String(projectId));
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTaskId, setSelectedTaskId] = useState(null);
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
  const visibleTasks = useMemo(() => projectTasks
    .filter((task) => statusFilter === 'all' || task.status === statusFilter)
    .slice()
    .sort((left, right) => String(left.dueDate || '9999-12-31').localeCompare(String(right.dueDate || '9999-12-31'))), [projectTasks, statusFilter]);

  const selectedTask = tasks.find((task) => String(task.id) === String(selectedTaskId));
  const statusCount = (key) => key === 'all' ? projectTasks.length : projectTasks.filter((task) => task.status === key).length;
  if (!project) return <section className="project-detail-empty" role="status">ไม่พบโปรเจกต์สำหรับแสดงงาน</section>;

  return (
    <section ref={panelContainerRef} className={`project-tasks-panel${selectedTask ? ' has-selected-task' : ''}`} aria-label="งานในโปรเจกต์">
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
                  onClick={() => setStatusFilter(filter.key)}
                >
                  {filter.label}<span>{statusCount(filter.key)}</span>
                </button>
              ))}
            </div>
            <div className="project-tasks-heading-actions"><Button onClick={() => { setEditingTask(null); setShowTaskForm(true); }}><Plus size={16} /> เพิ่มงาน</Button></div>
          </div>
          <Card className="project-tasks-card"><Card.Body>
            {visibleTasks.length === 0 ? <div className="project-tasks-empty" role="status">ไม่มีงานในสถานะนี้</div>
                : <div className="project-tasks-list" aria-label="รายการงานในโปรเจกต์">{visibleTasks.map((task) => {
              const checklist = Array.isArray(task.checklist) ? task.checklist : [];
              const completedChecklist = checklist.filter((item) => item.completed).length;
              const assignee = employeeById(task.assigneeId);
              const overdue = task.dueDate && task.dueDate < today() && task.status !== 'completed';
              return <button type="button" className={`project-tasks-row status-${task.status}${String(selectedTaskId) === String(task.id) ? ' selected' : ''}`} aria-pressed={String(selectedTaskId) === String(task.id)} aria-label={task.title} key={task.id} onClick={() => setSelectedTaskId(task.id)}>
                <div className="project-tasks-row-main">
                  <strong className="project-tasks-title-button">{task.title}</strong>
                  <div className="project-tasks-row-subtitle">
                    <span>เช็กลิสต์ {completedChecklist}/{checklist.length}</span>
                    <span>ผู้ตรวจ {employeeName(task.reviewerId) || '—'}</span>
                  </div>
                </div>
                <div className="project-tasks-row-assignee" title={assignee?.name || ''}>
                  {assignee && <span className="project-tasks-avatar" data-person-id={assignee.id} aria-hidden="true">{assignee.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>}
                  <span>{assignee?.name || 'ไม่ระบุ'}</span>
                </div>
                <TaskStatusBadge task={task} className="project-tasks-status" />
                <span className={`project-tasks-row-due${overdue ? ' overdue' : ''}`}>{overdue ? `เลย ${dateLabel(task.dueDate)}` : dateLabel(task.dueDate)}</span>
              </button>;
                })}</div>}
          </Card.Body></Card>
        </div>
        {!selectedTask && <aside className="project-tasks-detail-empty" aria-label="ตัวอย่างรายละเอียดงาน"><strong>เลือกรายการงาน</strong><span>เพื่อดูรายละเอียด เช็กลิสต์ และส่งตรวจ</span></aside>}
      </div>
      {selectedTask && <TaskDetailModal task={selectedTask} projectId={project.id} panelMode panelContainer={panelContainerRef.current} onClose={() => setSelectedTaskId(null)} onEdit={(task) => { setEditingTask(task); setSelectedTaskId(null); setShowTaskForm(true); }} />}
      {showTaskForm && <TaskFormModal project={project} task={editingTask} onClose={() => setShowTaskForm(false)} onSave={(values) => {
        const result = editingTask
          ? updateTask(editingTask.id, values, { type: 'task_updated', description: `แก้ไขรายละเอียดงาน “${values.title}”` })
          : createTask({ ...values, status: 'not_started', statusLabel: 'รอเริ่มทำ' });
        if (result) {
          setShowTaskForm(false);
          setEditingTask(null);
        }
        return result;
      }} />}
    </section>
  );
}
