// Project team membership and role controls backed by MockDataContext.
import { useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Form, Modal } from 'react-bootstrap';
import { MOCK_EMPLOYEES } from '../../data/mockData';
import { useMockData } from '../../context/MockDataContext';
import { initials } from '../../utils/projectTrackingUtils';

const findEmployee = (id) => MOCK_EMPLOYEES.find((person) => String(person.id) === String(id));

export default function ProjectTeam({ projectId }) {
  const { projects, tasks, actorId, addProjectMember, assignTeamLeader, removeProjectMember } = useMockData();
  const project = projects.find((item) => String(item.id) === String(projectId));
  const [addMemberId, setAddMemberId] = useState('');
  const [addReason, setAddReason] = useState('');
  const [pendingLeadId, setPendingLeadId] = useState('');
  const [leadReason, setLeadReason] = useState('');
  const [removing, setRemoving] = useState(null);
  const [replacementId, setReplacementId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const projectTasks = tasks.filter((task) => String(task.projectId) === String(projectId));
  const canManage = String(actorId) === String(project?.managerId) || String(actorId) === String(project?.teamLeadId);
  const memberIds = useMemo(() => [...new Set([
    ...(project?.teamMemberIds || []).map(String), String(project?.managerId || ''), String(project?.teamLeadId || ''),
  ].filter(Boolean))], [project]);
  const members = memberIds.map(findEmployee).filter(Boolean);
  const memberPool = project?.memberPoolIds
    ? MOCK_EMPLOYEES.filter((person) => project.memberPoolIds.map(String).includes(String(person.id)))
    : MOCK_EMPLOYEES;
  const availableEmployees = memberPool.filter((person) => !memberIds.includes(String(person.id)));
  if (!project) return <div className="project-detail-empty">ไม่พบโปรเจกต์</div>;

  const addMember = () => {
    if (!addMemberId || !addReason.trim() || memberIds.includes(String(addMemberId))) return;
    const result = addProjectMember(project.id, addMemberId, addReason.trim());
    if (!result) return setError('เพิ่มสมาชิกไม่สำเร็จ กรุณาตรวจสอบสิทธิ์และข้อมูล');
    setAddMemberId('');
    setAddReason('');
    setError('');
  };
  const requestLeadChange = (event) => {
    setPendingLeadId(event.target.value || '__clear__');
    setLeadReason('');
  };
  const saveLead = () => {
    const result = assignTeamLeader(project.id, pendingLeadId === '__clear__' ? null : pendingLeadId, leadReason);
    if (!result) return setError('เปลี่ยน Team Leader ไม่สำเร็จ กรุณาระบุเหตุผลและตรวจสอบสิทธิ์');
    setPendingLeadId('');
    setLeadReason('');
    setError('');
  };
  const affectedTasks = removing ? projectTasks.filter((task) => (
    String(task.assigneeId) === String(removing.id)
    || (task.collaborators || []).some((id) => String(id) === String(removing.id))
    || String(task.reviewerId) === String(removing.id)
  )) : [];
  const outstandingTasks = affectedTasks.filter((task) => String(task.assigneeId) === String(removing?.id) && task.status !== 'completed');
  const lockedTasks = affectedTasks.filter((task) => task.status === 'pending_review');
  const replacementCandidates = members.filter((person) => String(person.id) !== String(removing?.id)
    && outstandingTasks.every((task) => String(task.reviewerId) !== String(person.id)));
  const removeMember = () => {
    setError('');
    if (!removing || lockedTasks.length) return setError('มีงานรอตรวจ ต้องดำเนินการตรวจงานก่อนนำสมาชิกออก');
    const replacementValid = replacementCandidates.some((person) => String(person.id) === String(replacementId));
    if (!reason.trim() || (outstandingTasks.length && !replacementValid)) return setError('เลือกผู้รับผิดชอบแทนและระบุเหตุผลก่อนนำสมาชิกออก');
    const result = removeProjectMember(project.id, removing.id, replacementId, reason);
    if (result?.error) return setError(result.error);
    setRemoving(null);
    setReplacementId('');
    setReason('');
  };
  const requestRemove = (person) => {
    setRemoving(person);
    setError('');
  };

  return (
    <section className="workspace-section workspace-reference-grid workspace-team-layout is-reference" aria-label="ทีมงานโปรเจกต์">
      {error && !removing && !pendingLeadId && <Alert variant="danger" role="alert" dismissible onClose={() => setError('')}>{error}</Alert>}
      <Card className="workspace-panel workspace-team-members-panel"><Card.Body>
        <div className="workspace-panel-heading workspace-team-heading">
          <h2>สมาชิกทีม · {members.length} คน</h2>
          {canManage && <Form.Select aria-label="เลือก Team Leader" value={project.teamLeadId || ''} onChange={requestLeadChange}>
            <option value="">ยังไม่กำหนด Team Leader</option>
            {MOCK_EMPLOYEES.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </Form.Select>}
        </div>
        {members.length === 0 ? <div className="workspace-empty-state"><strong>ยังไม่มีสมาชิกในโปรเจกต์</strong></div> : (
          <div className="workspace-member-list">
            {members.map((person) => {
              const assigned = projectTasks.filter((task) => String(task.assigneeId) === String(person.id)
                || (task.collaborators || []).some((id) => String(id) === String(person.id)));
              const openCount = assigned.filter((task) => task.status !== 'completed').length;
              const doneCount = assigned.length - openCount;
              const isOwner = String(project.managerId) === String(person.id);
              const isLead = String(project.teamLeadId || '') === String(person.id);
              const progress = assigned.length ? Math.round((doneCount / assigned.length) * 100) : 0;
              return <article className="workspace-member-row" key={person.id}>
                <span className="project-detail-avatar" data-person-id={person.id} aria-hidden="true">{initials(person.name)}</span>
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
                {canManage && !isOwner && !isLead && <Button size="sm" variant="outline-danger" className="workspace-member-remove" aria-label={`นำ ${person.name} ออกจากทีม`} onClick={() => requestRemove(person)}>นำออก</Button>}
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
          <Form.Group className="workspace-side-field"><Form.Label htmlFor="workspace-member-reason">เหตุผลการเพิ่มสมาชิก</Form.Label>
            <Form.Control id="workspace-member-reason" aria-label="เหตุผลการเพิ่มสมาชิก" placeholder="ระบุเหตุผล" value={addReason} onChange={(event) => setAddReason(event.target.value)} />
          </Form.Group>
          <Button className="w-100" disabled={!addMemberId || !addReason.trim()} onClick={addMember}>เพิ่มเข้าทีม</Button>
        </Card.Body></Card>}
        <section className="workspace-team-rules"><strong>กติกาบทบาท</strong><ul>
          <li>มี Project Owner ได้ 1 คนต่อโปรเจกต์ และนำออกจากทีมไม่ได้</li>
          <li>Owner กับ Team Lead เป็นคนละบทบาท แต่คนเดียวถือสองบทบาทได้</li>
          <li>งานหนึ่งมีผู้รับผิดชอบหลัก 1 คน ผู้ร่วมงานได้หลายคน และมีผู้ตรวจประจำงาน</li>
          <li>ถ้าสมาชิกยังมีงานค้าง ต้องโอนงานก่อนจึงนำออกได้</li>
        </ul></section>
      </aside>
      {pendingLeadId !== '' && <Modal show centered onHide={() => setPendingLeadId('')}>
        <Modal.Header closeButton><Modal.Title>เปลี่ยน Team Leader</Modal.Title></Modal.Header>
        <Modal.Body><p>ระบุเหตุผลการเปลี่ยนผู้รับผิดชอบระดับโปรเจกต์</p><Form.Control aria-label="เหตุผลการเปลี่ยน Team Leader" value={leadReason} onChange={(event) => setLeadReason(event.target.value)} />{error && <Alert variant="danger" className="mt-2">{error}</Alert>}</Modal.Body>
        <Modal.Footer><Button variant="outline-secondary" onClick={() => setPendingLeadId('')}>ยกเลิก</Button><Button disabled={!leadReason.trim()} onClick={saveLead}>ยืนยัน</Button></Modal.Footer>
      </Modal>}
      {removing && <Modal show centered onHide={() => setRemoving(null)} className="mecha-confirm-modal is-destructive">
        <Modal.Header closeButton><Modal.Title>นำสมาชิกออกจากโปรเจกต์</Modal.Title></Modal.Header>
        <Modal.Body><p>{removing.name} จะถูกนำออกจากทีมโปรเจกต์</p>
          {outstandingTasks.length > 0 && <><Alert variant="warning">ยังมีงานหลักที่รับผิดชอบ {outstandingTasks.length} รายการ ต้องมอบหมายใหม่ก่อน</Alert><Form.Group className="mb-2"><Form.Label htmlFor="member-replacement">ผู้รับผิดชอบแทน</Form.Label><Form.Select id="member-replacement" value={replacementId} onChange={(event) => setReplacementId(event.target.value)}><option value="">เลือกสมาชิกในโปรเจกต์</option>{replacementCandidates.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</Form.Select></Form.Group></>}
          {lockedTasks.length > 0 && <Alert variant="danger">มีงานรอตรวจ: {lockedTasks.map((task) => task.title).join(', ')} กรุณาดำเนินการตรวจก่อน</Alert>}
          <Form.Group className="mt-2"><Form.Label htmlFor="member-removal-reason">เหตุผลการนำสมาชิกออก</Form.Label><Form.Control id="member-removal-reason" as="textarea" rows={2} value={reason} onChange={(event) => setReason(event.target.value)} /></Form.Group>{error && <Alert variant="danger" className="mt-2">{error}</Alert>}
        </Modal.Body>
        <Modal.Footer><Button variant="outline-secondary" onClick={() => setRemoving(null)}>ยกเลิก</Button><Button variant="danger" disabled={lockedTasks.length > 0 || !reason.trim() || (outstandingTasks.length > 0 && (!replacementId || replacementCandidates.length === 0))} onClick={removeMember}>ยืนยันนำออก</Button></Modal.Footer>
      </Modal>}
    </section>
  );
}
