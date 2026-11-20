// frontend/src/components/project-detail/ProjectTeam.js — สมาชิกทีมโปรเจกต์ + Team Lead (Owner / Team Lead จัดการได้)
//
// UX-06: เพิ่มสมาชิกไม่ต้องกรอกเหตุผลแล้ว (นำออกก็ไม่ต้อง) · เปลี่ยน Team Lead ยังต้องมีเหตุผล (เปลี่ยนผู้อนุมัติปิดโปรเจกต์)
import { useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Form, Modal } from 'react-bootstrap';
import { MOCK_EMPLOYEES } from '../../data/mockData';
import { useMockData } from '../../context/MockDataContext';
import { initials } from '../../utils/projectTrackingUtils';
import { WORKSPACE_AVATAR_COLORS } from '../TaskBadges';

const findEmployee = (id) => MOCK_EMPLOYEES.find((person) => String(person.id) === String(id));

export default function ProjectTeam({ projectId, notice, onNoticeChange, onNavigateTasks }) {
  const { projects, tasks, actorId, addProjectMember, assignTeamLeader, removeProjectMember } = useMockData();
  const project = projects.find((item) => String(item.id) === String(projectId));
  const [addMemberId, setAddMemberId] = useState('');
  const [pendingLeadId, setPendingLeadId] = useState('');
  const [leadReason, setLeadReason] = useState('');
  const [error, setError] = useState('');
  const projectTasks = tasks.filter((task) => String(task.projectId) === String(projectId));
  const canManage = String(actorId) === String(project?.managerId) || String(actorId) === String(project?.teamLeadId);
  const memberIds = useMemo(() => [...new Set([
    ...(project?.teamMemberIds || []).map(String), String(project?.managerId || ''), String(project?.teamLeadId || ''),
  ].filter(Boolean))], [project]);
  const members = memberIds.map(findEmployee).filter(Boolean);
  const availableEmployees = MOCK_EMPLOYEES.filter((person) => !memberIds.includes(String(person.id)));
  if (!project) return <div className="project-detail-empty">ไม่พบโปรเจกต์</div>;

  const addMember = () => {
    if (!addMemberId || memberIds.includes(String(addMemberId))) return;
    const result = addProjectMember(project.id, addMemberId);
    if (!result) return setError('เพิ่มสมาชิกไม่สำเร็จ กรุณาตรวจสอบสิทธิ์และข้อมูล');
    setAddMemberId('');
    setError('');
  };
  const requestLeadChange = (event) => {
    setPendingLeadId(event.target.value || '__clear__');
    setLeadReason('');
  };
  const saveLead = () => {
    const result = assignTeamLeader(project.id, pendingLeadId === '__clear__' ? null : pendingLeadId, leadReason);
    if (!result) return setError('เปลี่ยน Team Lead ไม่สำเร็จ กรุณาระบุเหตุผลและตรวจสอบสิทธิ์');
    setPendingLeadId('');
    setLeadReason('');
    setError('');
  };
  const removeMember = (person) => {
    setError('');
    const unfinishedPrimaryTasks = projectTasks.filter((task) => (
      String(task.assigneeId) === String(person.id) && task.status !== 'completed'
    ));
    if (unfinishedPrimaryTasks.length) {
      onNoticeChange?.({
        memberId: String(person.id),
        name: person.name,
        tasks: unfinishedPrimaryTasks.map((task) => ({ id: task.id, title: task.title })),
      });
      return;
    }
    const result = removeProjectMember(project.id, person.id, null, 'นำออกจากทีม');
    if (result?.error) return setError(result.error);
    onNoticeChange?.(null);
  };
  const requestRemove = (person) => {
    removeMember(person);
  };

  return (
    <section className="workspace-section workspace-reference-grid workspace-team-layout is-reference" aria-label="ทีมงานโปรเจกต์">
      {error && !pendingLeadId && <Alert variant="danger" role="alert" dismissible onClose={() => setError('')}>{error}</Alert>}
      <Card className="workspace-panel workspace-team-members-panel"><Card.Body>
        <div className="workspace-panel-heading workspace-team-heading">
          <h2>สมาชิกทีม · {members.length} คน</h2>
          {/* แยกกลุ่มให้เห็นชัดว่าเลือกคนนอกทีม = เพิ่มเข้าทีมให้ด้วย (เดิมเพิ่มเงียบ ๆ) */}
          {canManage && <Form.Select aria-label="เลือก Team Leader" value={project.teamLeadId || ''} onChange={requestLeadChange}>
            <option value="">ยังไม่กำหนด Team Lead</option>
            <optgroup label="สมาชิกในทีม">{members.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</optgroup>
            <optgroup label="พนักงานอื่น (จะเพิ่มเข้าทีมด้วย)">{availableEmployees.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</optgroup>
          </Form.Select>}
        </div>
        {notice && <div className="workspace-team-removal-notice" role="alert">
          <strong>ยังนำ {notice.name} ออกจากทีมไม่ได้</strong>
          <span>มีงานที่ยังไม่เสร็จอยู่ในมือ {notice.tasks.length} งาน ต้องโอนงานให้สมาชิกคนอื่นก่อน (Project Owner หรือ Team Lead เป็นผู้โอนได้)</span>
          <ul>{notice.tasks.map((task) => <li key={task.id}>{task.title}</li>)}</ul>
          <div className="workspace-team-removal-actions">
            <Button type="button" onClick={onNavigateTasks}>ไปที่หน้างาน</Button>
            <Button type="button" onClick={() => onNoticeChange?.(null)}>ปิด</Button>
          </div>
        </div>}
        {members.length === 0 ? <div className="workspace-empty-state"><strong>ยังไม่มีสมาชิกในโปรเจกต์</strong></div> : (
          <div className="workspace-member-list">
            {members.map((person, index) => {
              const assigned = projectTasks.filter((task) => String(task.assigneeId) === String(person.id));
              const openCount = assigned.filter((task) => task.status !== 'completed').length;
              const doneCount = assigned.length - openCount;
              const isOwner = String(project.managerId) === String(person.id);
              const isLead = String(project.teamLeadId || '') === String(person.id);
              const isLocked = isOwner || isLead;
              const progress = assigned.length ? Math.round((doneCount / assigned.length) * 100) : 0;
              return <article className="workspace-member-row" key={person.id}>
                <span className="project-detail-avatar" data-person-id={person.id} aria-hidden="true" style={{ backgroundColor: WORKSPACE_AVATAR_COLORS[index % WORKSPACE_AVATAR_COLORS.length][0], color: WORKSPACE_AVATAR_COLORS[index % WORKSPACE_AVATAR_COLORS.length][1] }}>{initials(person.name)}</span>
                <span className="workspace-member-name">
                  <span className="workspace-member-title"><strong>{person.name}</strong>
                    {isOwner && <Badge bg="" className="workspace-member-role is-owner">Owner</Badge>}
                    {isLead && <Badge bg="" className="workspace-member-role is-leader">Team Lead</Badge>}
                  </span>
                  <small>{person.position || 'สมาชิกโปรเจกต์'} · {person.department || 'Mecha'}</small>
                </span>
                <span className="workspace-member-metrics">
                  <span>งานค้าง <b>{openCount}</b> · เสร็จ <b>{doneCount}</b></span>
                  <span className="workspace-member-progress"><i className={openCount >= 4 ? 'is-heavy' : ''} style={{ width: `${progress}%` }} /></span>
                </span>
                <Button type="button" size="sm" variant="outline-danger" className="workspace-member-remove" aria-label={`นำ ${person.name} ออกจากทีม`} disabled={isLocked} onClick={() => requestRemove(person)}>{isLocked ? 'ล็อก' : 'นำออก'}</Button>
              </article>;
            })}
          </div>
        )}
      </Card.Body></Card>
      <aside className="workspace-reference-sidebar" aria-label="การจัดการทีมโปรเจกต์">
        {canManage && <Card className="workspace-panel workspace-side-form"><Card.Body>
          <div className="workspace-panel-heading"><h2>เพิ่มสมาชิก</h2></div>
          <Form.Group className="workspace-side-field"><Form.Label htmlFor="workspace-member-select">เลือกพนักงาน</Form.Label>
            <Form.Select id="workspace-member-select" aria-label="เลือกสมาชิกเพื่อเพิ่ม" value={addMemberId} onChange={(event) => setAddMemberId(event.target.value)}>
              <option value="">เลือกพนักงาน</option>{availableEmployees.map((person) => <option key={person.id} value={person.id}>{person.name} — {person.position || person.department || 'พนักงาน'}</option>)}
            </Form.Select>
          </Form.Group>
          <Button className="w-100" disabled={!addMemberId} onClick={addMember}>เพิ่มเข้าทีม</Button>
        </Card.Body></Card>}
        <section className="workspace-team-rules"><strong>กติกาบทบาท</strong><ul>
          <li>มี Project Owner ได้ 1 คนต่อโปรเจกต์ และนำออกจากทีมไม่ได้</li>
          <li>Owner กับ Team Lead เป็นคนละบทบาท แต่คนเดียวถือสองบทบาทได้</li>
          <li>งานหนึ่งมีผู้รับผิดชอบหลัก 1 คน ผู้ร่วมงานได้หลายคน และมีผู้ตรวจประจำงาน</li>
          <li>ถ้าสมาชิกยังมีงานค้าง ต้องโอนงานก่อนจึงนำออกได้</li>
        </ul></section>
      </aside>
      {pendingLeadId !== '' && <Modal show centered onHide={() => setPendingLeadId('')}>
        <Modal.Header closeButton><Modal.Title>เปลี่ยน Team Lead</Modal.Title></Modal.Header>
        <Modal.Body><p>ระบุเหตุผลการเปลี่ยนผู้รับผิดชอบระดับโปรเจกต์</p><Form.Control aria-label="เหตุผลการเปลี่ยน Team Leader" value={leadReason} onChange={(event) => setLeadReason(event.target.value)} />{error && <Alert variant="danger" className="mt-2">{error}</Alert>}</Modal.Body>
        <Modal.Footer><Button variant="outline-secondary" onClick={() => setPendingLeadId('')}>ยกเลิก</Button><Button disabled={!leadReason.trim()} onClick={saveLead}>ยืนยัน</Button></Modal.Footer>
      </Modal>}
    </section>
  );
}
