// frontend/src/components/dashboard/MyWork.js — กล่อง "งานของฉัน" บนหน้าหลัก (UX-11)
//
// แบ่ง 3 กลุ่มตามคนที่ login อยู่ (actorId): ที่ฉันรับผิดชอบ · รอฉันตรวจ · ใกล้/เลยกำหนด
// คลิกงาน → เปิดงานนั้นใน Project Workspace (navigate พร้อม state { openTaskId })
// แยกเป็นฟังก์ชัน pure (groupMyTasks) ไว้ให้หน้าอื่น/เทสใช้ซ้ำได้
import React from 'react';
import { Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { taskStatusLabel } from '../../utils/labels';
import { CircleAlert, ClipboardCheck, ClipboardList } from '../common/Icons';
import { TaskBlockedBadge } from '../TaskBadges';

const MAX_ITEMS = 5;

const isoDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// คืน { assigned, review, due } — งานที่เสร็จแล้วไม่นับ · due = งานของฉันที่เลยกำหนดหรือถึงกำหนดภายใน 7 วัน
export function groupMyTasks(tasks, actorId, now = new Date()) {
  const me = String(actorId || '');
  if (!me) return { assigned: [], review: [], due: [] };
  const today = isoDate(now);
  const weekLater = new Date(now);
  weekLater.setDate(weekLater.getDate() + 7);
  const limit = isoDate(weekLater);
  const open = tasks.filter((task) => task.status !== 'completed');
  const byDue = (a, b) => String(a.dueDate || '9999').localeCompare(String(b.dueDate || '9999'));
  const assigned = open
    .filter((task) => String(task.assigneeId) === me || (task.collaborators || []).some((id) => String(id) === me))
    .sort(byDue);
  const review = open.filter((task) => task.status === 'pending_review' && String(task.reviewerId) === me).sort(byDue);
  const due = assigned.filter((task) => task.dueDate && task.dueDate <= limit).map((task) => ({ ...task, overdue: task.dueDate < today }));
  return { assigned, review, due };
}

function TaskGroup({ id, title, icon, items, emptyText, onOpen }) {
  return (
    <section className="my-work-group" aria-labelledby={id}>
      <h3 id={id} className="my-work-group-title">{icon}<span>{title}</span><span className="my-work-count">{items.length}</span></h3>
      {items.length === 0 ? <p className="my-work-empty">{emptyText}</p> : (
        <ul className="my-work-list">
          {items.slice(0, MAX_ITEMS).map((task) => (
            <li key={task.id}>
              <button type="button" className="my-work-item" onClick={() => onOpen(task)}>
                <span className="my-work-item-title">{task.title} <TaskBlockedBadge task={task} /></span>
                <span className="my-work-item-meta">
                  {task.projectName} · {taskStatusLabel(task.status)}
                  {task.dueDate && <> · <span className={task.overdue ? 'text-danger fw-semibold' : ''}>{task.overdue ? 'เลยกำหนด ' : 'ส่ง '}{task.dueDate.split('-').reverse().join('/')}</span></>}
                </span>
              </button>
            </li>
          ))}
          {items.length > MAX_ITEMS && <li className="my-work-more">และอีก {items.length - MAX_ITEMS} งาน — ดูทั้งหมดที่เมนู “ตารางงาน”</li>}
        </ul>
      )}
    </section>
  );
}

export default function MyWork({ tasks, actorId }) {
  const navigate = useNavigate();
  const { assigned, review, due } = groupMyTasks(tasks, actorId);
  const openTask = (task) => navigate(`/projects/${task.projectId}`, { state: { openTaskId: task.id } });

  return (
    <Card className="my-work-card border-0 shadow-sm mb-4" aria-label="งานของฉัน">
      <Card.Body>
        <h2 className="h5 fw-bold text-ink mb-3">งานของฉัน</h2>
        <div className="my-work-grid">
          <TaskGroup id="my-work-assigned" title="ที่ฉันรับผิดชอบ" icon={<ClipboardList size={16} />} items={assigned} emptyText="ยังไม่มีงานที่ต้องทำ" onOpen={openTask} />
          <TaskGroup id="my-work-review" title="รอฉันตรวจ" icon={<ClipboardCheck size={16} />} items={review} emptyText="ไม่มีงานรอตรวจ" onOpen={openTask} />
          <TaskGroup id="my-work-due" title="ใกล้ / เลยกำหนด" icon={<CircleAlert size={16} />} items={due} emptyText="ไม่มีงานใกล้กำหนดใน 7 วัน" onOpen={openTask} />
        </div>
      </Card.Body>
    </Card>
  );
}
