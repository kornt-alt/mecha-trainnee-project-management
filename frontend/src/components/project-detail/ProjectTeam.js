// Project membership and project-local workload controls.
import { useMemo, useState } from 'react';
import { Alert, Button, Card, Form, Modal } from 'react-bootstrap';
import { MOCK_EMPLOYEES } from '../../data/mockData';
import { useMockData } from '../../context/MockDataContext';
import { initials } from '../../utils/projectTrackingUtils';
import TaskDetailModal from '../TaskDetailModal';

const findEmployee = (id) => MOCK_EMPLOYEES.find((person) => String(person.id) === String(id));

export default function ProjectTeam({ projectId }) {
  const { projects, tasks, actorId, updateProject, updateTask } = useMockData();
  const project = projects.find((item) => String(item.id) === String(projectId));
  const [addMemberId, setAddMemberId] = useState('');
  const [teamLeadId, setTeamLeadId] = useState(project?.teamLeadId || '');
  const [removing, setRemoving] = useState(null);
  const [replacementId, setReplacementId] = useState('');
  const [reason, setReason] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [error, setError] = useState('');
  const projectTasks = tasks.filter((task) => String(task.projectId) === String(projectId));
  const canManage = String(actorId) === String(project?.managerId) || String(actorId) === String(project?.teamLeadId);
  const memberIds = useMemo(() => [...new Set([
    ...(project?.teamMemberIds || []).map(String), String(project?.managerId || ''), String(project?.teamLeadId || ''),
  ].filter(Boolean))], [project]);
  const members = memberIds.map(findEmployee).filter(Boolean);
  const selectedTask = tasks.find((task) => String(task.id) === String(selectedTaskId));
  const selectedMember = findEmployee(selectedMemberId);
  if (!project) return <div className="project-detail-empty">ไม่พบโปรเจกต์</div>;

  const assignLead = (event) => {
    const nextId = event.target.value;
    const nextMembers = [...new Set([...memberIds, ...(nextId ? [nextId] : [])])];
    updateProject(project.id, { teamLeadId: nextId || null, teamMemberIds: nextMembers }, {
      type: 'team_lead_changed', description: nextId ? `กำหนด Team Leader เป็น ${findEmployee(nextId)?.name || nextId}` : 'นำการกำหนด Team Leader ออก',
    });
    setTeamLeadId(nextId);
  };

  const addMember = () => {
    if (!addMemberId || memberIds.includes(String(addMemberId))) return;
    updateProject(project.id, { teamMemberIds: [...memberIds, String(addMemberId)] }, {
      type: 'member_added', description: `เพิ่ม ${findEmployee(addMemberId)?.name || addMemberId} เป็นสมาชิกโปรเจกต์`,
    });
    setAddMemberId('');
  };

  const memberTasks = (memberId) => projectTasks.filter((task) => (
    String(task.assigneeId) === String(memberId) || (task.collaborators || []).some((id) => String(id) === String(memberId))
  ));
  const affectedTasks = removing ? memberTasks(removing.id) : [];
  const outstandingTasks = affectedTasks.filter((task) => String(task.assigneeId) === String(removing.id) && task.status !== 'completed');
  const lockedTasks = affectedTasks.filter((task) => task.status === 'pending_review');

  const removeMember = () => {
    setError('');
    if (!removing) return;
    if (String(removing.id) === String(project.managerId) || String(removing.id) === String(project.teamLeadId)) {
      setError('ต้องเปลี่ยน Project Owner หรือ Team Leader ก่อนนำบุคคลนี้ออก');
      return;
    }
    if (lockedTasks.length) {
      setError('มีงานที่อยู่ระหว่างตรวจสอบ ต้องให้ผู้ตรวจจัดการงานก่อนนำสมาชิกออก');
      return;
    }
    const eligibleReplacement = members.some((person) => String(person.id) === String(replacementId) && String(person.id) !== String(removing.id));
    if (outstandingTasks.length && (!eligibleReplacement || !reason.trim())) {
      setError('เลือกผู้รับผิดชอบแทนและระบุเหตุผลก่อนนำสมาชิกออก');
      return;
    }
    affectedTasks.filter((task) => task.status !== 'completed').forEach((task) => {
      const assignmentHistory = [...(task.assignmentHistory || [])];
      const next = {};
      if (String(task.assigneeId) === String(removing.id)) {
        assignmentHistory.push({ previousAssigneeId: task.assigneeId, newAssigneeId: replacementId, actorId, reason: reason.trim(), timestamp: new Date().toISOString() });
        next.assigneeId = replacementId;
        next.assignmentHistory = assignmentHistory;
      }
      if ((task.collaborators || []).some((id) => String(id) === String(removing.id))) {
        next.collaborators = task.collaborators.filter((id) => String(id) !== String(removing.id));
      }
      updateTask(task.id, next, String(task.assigneeId) === String(removing.id) ? {
        type: 'task_assignee_changed',
        description: `เปลี่ยนผู้รับผิดชอบของ “${task.title}” จาก ${removing.name} เป็น ${findEmployee(replacementId)?.name || replacementId}`,
        reason: reason.trim(),
      } : null);
    });
    updateProject(project.id, { teamMemberIds: memberIds.filter((id) => id !== String(removing.id)) }, {
      type: 'member_removed', description: `นำ ${removing.name} ออกจากสมาชิกโปรเจกต์`, reason: reason.trim() || undefined,
    });
    setRemoving(null); setReplacementId(''); setReason('');
  };

  return (
    <section className="workspace-section" aria-labelledby="workspace-team-title">
      <div className="workspace-section-heading"><div><span className="project-detail-placeholder-label">PROJECT TEAM</span><h2 id="workspace-team-title">ทีมงานโปรเจกต์</h2><p>สมาชิกและภาระงานของโปรเจกต์นี้</p></div><span className="workspace-count-pill">{members.length} คน</span></div>
      <div className="workspace-team-role-grid">
        <Card className="workspace-panel"><Card.Body><span className="workspace-field-label">Project Owner</span><div className="workspace-role-person"><span className="project-detail-avatar">{initials(findEmployee(project.managerId)?.name)}</span><strong>{findEmployee(project.managerId)?.name || project.owner || 'ไม่ระบุ'}</strong></div><small>ผู้รับผิดชอบสรุปและปิดโปรเจกต์</small></Card.Body></Card>
        <Card className="workspace-panel"><Card.Body><div className="workspace-panel-heading"><span className="workspace-field-label">Team Leader</span>{canManage && <Form.Select aria-label="เลือก Team Leader" size="sm" value={project.teamLeadId || teamLeadId} onChange={assignLead}><option value="">ยังไม่กำหนด</option>{MOCK_EMPLOYEES.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</Form.Select>}</div><div className="workspace-role-person"><span className="project-detail-avatar">{initials(findEmployee(project.teamLeadId)?.name)}</span><strong>{findEmployee(project.teamLeadId)?.name || 'ยังไม่กำหนด'}</strong></div><small>ผู้ตรวจการส่งงานและร่วมอนุมัติปิดโปรเจกต์</small></Card.Body></Card>
      </div>
      <Card className="workspace-panel"><Card.Body>
        <div className="workspace-panel-heading"><div><h3>สมาชิกโปรเจกต์</h3><p>จำนวนงานที่ยังไม่เสร็จและชั่วโมงที่วางแผนจาก Tasks ของโปรเจกต์</p></div>{canManage && <div className="workspace-add-member"><Form.Select aria-label="เลือกสมาชิกเพื่อเพิ่ม" value={addMemberId} onChange={(event) => setAddMemberId(event.target.value)}><option value="">เลือกพนักงาน</option>{MOCK_EMPLOYEES.filter((person) => !memberIds.includes(String(person.id))).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</Form.Select><Button disabled={!addMemberId} onClick={addMember}>เพิ่มสมาชิก</Button></div>}</div>
        {members.length === 0 ? <div className="project-detail-empty">ยังไม่มีสมาชิกในโปรเจกต์</div> : <div className="workspace-member-list">{members.map((person) => {
          const personTasks = memberTasks(person.id);
          const primaryTasks = personTasks.filter((task) => String(task.assigneeId) === String(person.id));
          const openTasks = primaryTasks.filter((task) => task.status !== 'completed');
          const hours = openTasks.reduce((total, task) => total + (Number(task.estimatedHours) || 0), 0);
          const roles = [String(person.id) === String(project.managerId) && 'Project Owner', String(person.id) === String(project.teamLeadId) && 'Team Leader'].filter(Boolean);
          return <article className="workspace-member-row" key={person.id}><span className="project-detail-avatar">{initials(person.name)}</span><div className="workspace-member-name"><strong>{person.name}</strong><small>{roles.join(' · ') || [person.position, person.department].filter(Boolean).join(' · ') || 'สมาชิกโปรเจกต์'}</small></div><div className="workspace-member-metrics"><strong>{personTasks.length}</strong><small>งานที่เกี่ยวข้อง · {openTasks.length} งานหลักค้าง · {hours} ชม. แผนงานหลัก</small></div><Button size="sm" variant="outline-primary" onClick={() => setSelectedMemberId(person.id)}>รายละเอียด</Button><Button size="sm" variant="outline-secondary" onClick={() => setSelectedTaskId(personTasks.find((task) => task.status !== 'completed')?.id || personTasks[0]?.id)} disabled={!personTasks.length}>ดูงาน</Button>{canManage && !roles.length && <Button size="sm" variant="outline-danger" onClick={() => { setRemoving(person); setError(''); }}>นำออก</Button>}</article>;
        })}</div>}
      </Card.Body></Card>
      {selectedMember && <Modal show centered onHide={() => setSelectedMemberId(null)}><Modal.Header closeButton><Modal.Title>ข้อมูลสมาชิกโปรเจกต์</Modal.Title></Modal.Header><Modal.Body><div className="workspace-role-person"><span className="project-detail-avatar">{initials(selectedMember.name)}</span><strong>{selectedMember.name}</strong></div><dl className="workspace-member-detail"><dt>ตำแหน่ง</dt><dd>{selectedMember.position || 'ไม่ระบุ'}</dd><dt>แผนก</dt><dd>{selectedMember.department || 'ไม่ระบุ'}</dd>{selectedMember.email && <><dt>อีเมล</dt><dd>{selectedMember.email}</dd></>}<dt>Project Owner</dt><dd>{String(project.managerId) === String(selectedMember.id) ? 'ใช่' : 'ไม่ใช่'}</dd><dt>Team Leader</dt><dd>{String(project.teamLeadId) === String(selectedMember.id) ? 'ใช่' : 'ไม่ใช่'}</dd></dl><h3 className="mt-3">งานของสมาชิก</h3>{memberTasks(selectedMember.id).length === 0 ? <p className="workspace-muted-copy">ยังไม่มีงานที่มอบหมาย</p> : <ul className="workspace-member-task-list">{memberTasks(selectedMember.id).map((task) => <li key={task.id}><button type="button" onClick={() => { setSelectedMemberId(null); setSelectedTaskId(task.id); }}>{task.title}<span>{task.statusLabel || task.status}</span></button></li>)}</ul>}</Modal.Body></Modal>}
      {selectedTask && <TaskDetailModal task={selectedTask} projectId={project.id} onClose={() => setSelectedTaskId(null)} />}
      {removing && <Modal show centered onHide={() => setRemoving(null)} className="mecha-confirm-modal is-destructive"><Modal.Header closeButton><Modal.Title>นำสมาชิกออกจากโปรเจกต์</Modal.Title></Modal.Header><Modal.Body><p>{removing.name} จะถูกนำออกจากทีมโปรเจกต์</p>{outstandingTasks.length > 0 && <><Alert variant="warning">ยังมีงานหลักที่รับผิดชอบ {outstandingTasks.length} รายการ ต้องมอบหมายใหม่ก่อน</Alert><Form.Group className="mb-2"><Form.Label htmlFor="member-replacement">ผู้รับผิดชอบแทน</Form.Label><Form.Select id="member-replacement" value={replacementId} onChange={(event) => setReplacementId(event.target.value)}><option value="">เลือกสมาชิกในโปรเจกต์</option>{members.filter((person) => String(person.id) !== String(removing.id)).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</Form.Select></Form.Group><Form.Control aria-label="เหตุผลการมอบหมายงานใหม่" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="เหตุผลการมอบหมายใหม่" /></>}{affectedTasks.some((task) => String(task.assigneeId) !== String(removing.id) && task.status !== 'completed') && <Alert variant="info" className="mt-2">งานที่เป็นผู้ร่วมงานจะนำความเกี่ยวข้องของสมาชิกออกโดยไม่เปลี่ยนผู้รับผิดชอบหลัก</Alert>}{lockedTasks.length > 0 && <Alert variant="danger" className="mt-2">มีงานรอตรวจ: {lockedTasks.map((task) => task.title).join(', ')} กรุณาดำเนินการตรวจงานก่อน</Alert>}{error && <Alert variant="danger" className="mt-2">{error}</Alert>}</Modal.Body><Modal.Footer><Button variant="outline-secondary" onClick={() => setRemoving(null)}>ยกเลิก</Button><Button variant="danger" disabled={lockedTasks.length > 0} onClick={removeMember}>ยืนยันนำออก</Button></Modal.Footer></Modal>}
    </section>
  );
}
