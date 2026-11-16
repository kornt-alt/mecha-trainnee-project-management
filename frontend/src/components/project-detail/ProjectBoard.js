// Read-only project Kanban board sourced from the shared task context.
import { useMemo, useState } from 'react';
import { MOCK_EMPLOYEES } from '../../data/mockData';
import { useMockData } from '../../context/MockDataContext';
import { ymd } from '../../utils/projectTrackingUtils';
import TaskDetailModal from '../TaskDetailModal';

const BOARD_COLUMNS = [
  { key: 'not_started', title: 'ยังไม่เริ่ม' },
  { key: 'in_progress', title: 'กำลังทำ' },
  { key: 'pending_review', title: 'รอตรวจ' },
  { key: 'completed', title: 'เสร็จแล้ว' },
];

const employeeById = (id) => MOCK_EMPLOYEES.find((employee) => String(employee.id) === String(id));

function BoardTaskCard({ task, onOpen }) {
  const assignee = employeeById(task.assigneeId);
  const checklist = Array.isArray(task.checklist) ? task.checklist : [];
  const completed = checklist.filter((item) => item.completed).length;
  const progress = checklist.length ? Math.round((completed / checklist.length) * 100) : 0;
  const overdue = task.dueDate && task.dueDate < new Date().toISOString().slice(0, 10) && task.status !== 'completed';

  return (
    <button
      type="button"
      className="project-board-task"
      aria-label={`เปิดรายละเอียดงาน ${task.title}`}
      onClick={() => onOpen(task)}
    >
      <strong className="project-board-task-title">{task.title}</strong>
      <div className="project-board-task-meta">
        {assignee && (
          <span className="project-board-assignee">
            <span className="project-board-avatar" data-person-id={task.assigneeId} aria-hidden="true">
              {assignee.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
            </span>
            <span>{assignee.name}</span>
          </span>
        )}
        <span className={`project-board-due-date${overdue ? ' overdue' : ''}`}>{task.status === 'completed' ? 'เสร็จแล้ว' : overdue ? `เลย ${ymd(task.dueDate)}` : task.dueDate ? ymd(task.dueDate) : '—'}</span>
      </div>
      <span className="project-board-progress" aria-label={`เช็กลิสต์ ${completed} จาก ${checklist.length}`}>
        <span className="project-board-progress-track" aria-hidden="true"><span style={{ width: `${progress}%` }} /></span>
        <span>{completed}/{checklist.length}</span>
      </span>
    </button>
  );
}

export default function ProjectBoard({ projectId }) {
  const { tasks, projects } = useMockData();
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const selectedTask = tasks.find((task) => String(task.id) === String(selectedTaskId));
  const project = projects.find((item) => String(item.id) === String(projectId));
  const projectTasks = useMemo(
    () => tasks.filter((task) => String(task.projectId) === String(projectId)),
    [projectId, tasks]
  );

  return (
    <section className="project-board-panel" aria-label="บอร์ดงานในโปรเจกต์">
      <p className="project-board-reference-note">บอร์ดนี้ใช้ข้อมูลชุดเดียวกับหน้ารายการงาน การเปลี่ยนสถานะทำผ่านปุ่มในรายละเอียดงาน เพื่อให้เป็นไปตามกติกาการตรวจงาน</p>
      <div className="project-board-columns">
        {BOARD_COLUMNS.map((column) => {
          const columnTasks = projectTasks.filter((task) => task.status === column.key);
          return (
            <section
              className={`project-board-column status-${column.key}`}
              data-status={column.key}
              key={column.key}
              aria-labelledby={`project-board-${column.key}`}
            >
              <header className="project-board-column-header">
                <span className="project-board-column-heading">
                  <strong id={`project-board-${column.key}`}>{column.title}</strong>
                </span>
                <span className="project-board-count" aria-label={`${columnTasks.length} งาน`}>
                  {columnTasks.length}
                </span>
              </header>
              <div className="project-board-task-list">
                {columnTasks.length > 0 ? columnTasks.map((task) => (
                  <BoardTaskCard key={task.id} task={task} onOpen={(selected) => setSelectedTaskId(selected.id)} />
                )) : (
                  <p className="project-board-column-empty">ไม่มีงาน</p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {selectedTask && <TaskDetailModal task={selectedTask} projectId={project?.id} onClose={() => setSelectedTaskId(null)} />}
    </section>
  );
}
