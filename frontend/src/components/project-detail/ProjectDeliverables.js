// Project deliverables with reference-style completion controls.
import { useMemo, useState } from 'react';
import { Alert, Button, Card, Form } from 'react-bootstrap';
import { useMockData } from '../../context/MockDataContext';

export default function ProjectDeliverables({ projectId }) {
  const { projects, tasks, deliverables, createDeliverable, updateDeliverable } = useMockData();
  const project = projects.find((item) => String(item.id) === String(projectId));
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const projectTasks = tasks.filter((task) => String(task.projectId) === String(projectId));
  const projectItems = useMemo(() => deliverables.filter((item) => String(item.projectId) === String(projectId)), [deliverables, projectId]);
  const completedCount = projectItems.filter((item) => item.status === 'completed').length;
  if (!project) return <div className="project-detail-empty">ไม่พบโปรเจกต์</div>;

  const addItem = () => {
    if (!title.trim()) return;
    const result = createDeliverable({ projectId: project.id, title: title.trim(), status: 'pending' });
    if (!result) return setError('เพิ่มสิ่งที่ส่งมอบไม่สำเร็จ');
    setTitle('');
    setError('');
  };
  const toggleItem = (item) => {
    const completed = item.status !== 'completed';
    const result = updateDeliverable(item.id, {
      status: completed ? 'completed' : 'pending',
      completedAt: completed ? new Date().toISOString() : null,
    }, {
      type: 'deliverable_status_changed',
      description: `${completed ? 'ทำเครื่องหมายส่งมอบแล้ว' : 'ยกเลิกการส่งมอบ'} “${item.title}”`,
    });
    if (!result) setError('อัปเดตสิ่งที่ส่งมอบไม่สำเร็จ');
    else setError('');
  };

  return (
    <section className="workspace-section workspace-reference-grid workspace-deliverables-layout" aria-label="สิ่งที่ส่งมอบในโปรเจกต์">
      {error && <Alert variant="danger" role="alert" dismissible onClose={() => setError('')}>{error}</Alert>}
      <Card className="workspace-panel workspace-deliverables-list-panel"><Card.Body>
        <div className="workspace-panel-heading">
          <h2>สิ่งที่ต้องส่งมอบ</h2>
          <span className="workspace-count-pill">ส่งมอบแล้ว {completedCount}/{projectItems.length}</span>
        </div>
        <div className="workspace-deliverable-list">
          {projectItems.map((item) => {
            const task = projectTasks.find((record) => String(record.id) === String(item.relatedTaskId));
            return <article className={`workspace-deliverable-row${item.status === 'completed' ? ' is-complete' : ''}`} key={item.id}>
              <span className="workspace-deliverable-copy">
                <strong>{item.title}</strong>
                <small>{task ? `ผูกกับงาน: ${task.title} (${task.statusLabel || task.status})` : 'ยังไม่ได้ผูกกับงาน'}</small>
              </span>
              <Button type="button" variant={item.status === 'completed' ? 'success' : 'outline-primary'} aria-pressed={item.status === 'completed'} onClick={() => toggleItem(item)}>
                {item.status === 'completed' ? 'ส่งมอบแล้ว' : 'ทำเครื่องหมายส่งมอบแล้ว'}
              </Button>
            </article>;
          })}
          {projectItems.length === 0 && <div className="workspace-reference-empty-note">ยังไม่มีสิ่งที่ต้องส่งมอบ</div>}
        </div>
      </Card.Body></Card>
      <aside className="workspace-reference-sidebar" aria-label="เพิ่มสิ่งที่ต้องส่งมอบ">
        <Card className="workspace-panel workspace-side-form"><Card.Body>
          <div className="workspace-panel-heading"><h2>เพิ่มสิ่งที่ต้องส่งมอบ</h2></div>
          <Form.Group className="workspace-side-field">
            <Form.Label htmlFor="deliverable-quick-title">ชื่อ/รายละเอียด</Form.Label>
            <Form.Control id="deliverable-quick-title" placeholder="เช่น ซอร์สโค้ด คู่มือ รายงาน..." value={title} onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addItem(); } }} />
          </Form.Group>
          <Button type="button" className="w-100" disabled={!title.trim()} onClick={addItem}>เพิ่ม</Button>
          <p className="workspace-side-note">Project Owner จะตรวจสรุปโปรเจกต์และสิ่งที่ส่งมอบก่อนส่งขออนุมัติปิดโปรเจกต์</p>
        </Card.Body></Card>
      </aside>
    </section>
  );
}
