// Task timeline rendered from project dates and shared task records.
import { useMemo, useState } from 'react';
import { Card } from 'react-bootstrap';
import { useMockData } from '../../context/MockDataContext';
import { today, ymd } from '../../utils/projectTrackingUtils';
import TaskDetailModal from '../TaskDetailModal';

const parseDay = (value) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) ? timestamp : null;
};
const monthStart = (timestamp) => Date.UTC(new Date(timestamp).getUTCFullYear(), new Date(timestamp).getUTCMonth(), 1);
const monthLabel = (timestamp) => new Intl.DateTimeFormat('th-TH-u-ca-gregory', { month: 'short', year: 'numeric' }).format(new Date(timestamp));
const statusColor = {
  not_started: '#94A3B8',
  in_progress: '#2F5BD0',
  pending_review: '#7C4DDB',
  completed: '#15803D',
};

export default function ProjectTimeline({ projectId }) {
  const { projects, tasks } = useMockData();
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const project = projects.find((item) => String(item.id) === String(projectId));
  const projectTasks = useMemo(() => tasks.filter((task) => String(task.projectId) === String(projectId))
    .filter((task) => parseDay(task.startDate || task.dueDate) !== null || parseDay(task.dueDate || task.startDate) !== null)
    .slice().sort((left, right) => String(left.startDate || left.dueDate || '').localeCompare(String(right.startDate || right.dueDate || ''))), [tasks, projectId]);
  const selectedTask = tasks.find((task) => String(task.id) === String(selectedTaskId));
  if (!project) return <div className="project-detail-empty">ไม่พบโปรเจกต์</div>;
  const timestamps = [parseDay(project.startDate), parseDay(project.dueDate), ...projectTasks.flatMap((task) => [parseDay(task.startDate), parseDay(task.dueDate)])].filter((value) => value !== null);
  if (!timestamps.length) timestamps.push(parseDay(today()));
  const min = monthStart(Math.min(...timestamps));
  const max = Date.UTC(new Date(Math.max(...timestamps)).getUTCFullYear(), new Date(Math.max(...timestamps)).getUTCMonth() + 1, 1);
  const span = max - min;
  const position = (value) => ((parseDay(value) - min) / span) * 100;
  const ticks = [];
  for (let tick = min; tick < max; tick = Date.UTC(new Date(tick).getUTCFullYear(), new Date(tick).getUTCMonth() + 1, 1)) {
    ticks.push({ timestamp: tick, left: ((tick - min) / span) * 100, label: monthLabel(tick) });
  }
  const currentDay = today();
  const currentPosition = parseDay(currentDay) >= min && parseDay(currentDay) < max ? position(currentDay) : null;

  return <>
    <section className="workspace-section" aria-label="ไทม์ไลน์งาน">
      <Card className="workspace-panel"><Card.Body>
        <div className="workspace-panel-heading workspace-timeline-heading">
          <h2>ไทม์ไลน์งาน</h2>
          <div className="workspace-timeline-legend" aria-label="สัญลักษณ์สถานะ">
            <span><i className="timeline-status-not_started" />ยังไม่เริ่ม</span>
            <span><i className="timeline-status-in_progress" />กำลังทำ</span>
            <span><i className="timeline-status-pending_review" />รอตรวจ</span>
            <span><i className="timeline-status-completed" />เสร็จแล้ว</span>
            <span><i className="timeline-today-key" />วันนี้</span>
          </div>
        </div>
        <div className="workspace-timeline-scroll" role="region" aria-label="แผนภูมิไทม์ไลน์โปรเจกต์" tabIndex="0">
          <div className="workspace-reference-timeline">
            <div className="workspace-reference-timeline-head"><span /><div>{ticks.map((tick) => <span key={tick.timestamp} style={{ left: `${tick.left}%` }}>{tick.label}</span>)}{currentPosition !== null && <b style={{ left: `${currentPosition}%` }}>วันนี้</b>}</div></div>
            {projectTasks.map((task) => {
              const start = task.startDate || task.dueDate;
              const end = task.dueDate || task.startDate;
              const left = Math.max(0, Math.min(100, position(start)));
              const right = Math.max(0, Math.min(100, position(end)));
              const overdue = end < currentDay && task.status !== 'completed';
              return <div className="workspace-reference-timeline-row" key={task.id}>
                <button type="button" onClick={() => setSelectedTaskId(task.id)} title={task.title}>{task.title}</button>
                <div className="workspace-reference-timeline-track">
                  {ticks.map((tick) => <i key={tick.timestamp} style={{ left: `${tick.left}%` }} aria-hidden="true" />)}
                  {currentPosition !== null && <i className="workspace-reference-today" style={{ left: `${currentPosition}%` }} aria-label="วันนี้" />}
                  <span className={overdue ? 'is-overdue' : ''} style={{ left: `${left}%`, width: `${Math.max(1, right - left)}%`, backgroundColor: statusColor[task.status] || statusColor.not_started }} title={`${task.title}: ${start ? ymd(start) : 'ไม่ระบุ'} – ${end ? ymd(end) : 'ไม่ระบุ'}`} />
                </div>
              </div>;
            })}
          </div>
        </div>
        <span className="workspace-timeline-caption">แถบสีแดงเข้มที่ขอบหมายถึงเลยกำหนด กดชื่องานเพื่อเปิดรายละเอียด</span>
      </Card.Body></Card>
    </section>
    {selectedTask && <TaskDetailModal task={selectedTask} projectId={project.id} onClose={() => setSelectedTaskId(null)} />}
  </>;
}
