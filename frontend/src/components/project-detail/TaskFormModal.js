// Shared Project Workspace and Global Task form backed by MockDataContext.
import { useMemo, useState } from 'react';
import { Alert, Button, Form, Modal } from 'react-bootstrap';
import { MOCK_EMPLOYEES } from '../../data/mockData';
import { useMockData } from '../../context/MockDataContext';
import { WORKSPACE_LABEL_PALETTE } from '../TaskBadges';

const CHECKLIST_TEMPLATES = {
  development: ['วิเคราะห์ความต้องการ', 'พัฒนาตามแบบ', 'ทดสอบด้วยตนเอง', 'ตรวจสอบก่อนส่งตรวจ'],
  testing: ['วางแผนการทดสอบ', 'ทดสอบตามแผน', 'บันทึกผลการทดสอบ', 'สรุปปัญหาที่พบ'],
  documentation: ['ร่างเอกสาร', 'ตรวจทานเนื้อหา', 'แก้ไขตามคอมเมนต์', 'เผยแพร่เอกสาร'],
};
const LABEL_PALETTE = WORKSPACE_LABEL_PALETTE;
const PRIORITIES = [
  { value: 'none', label: 'ไม่ระบุ' },
  { value: 'low', label: 'ต่ำ' },
  { value: 'medium', label: 'ปกติ' },
  { value: 'high', label: 'สูง' },
  { value: 'urgent', label: 'เร่งด่วน' },
];

const makeChecklistItem = (title, actorId, ownerId) => ({
  id: `check-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  title,
  completed: false,
  createdBy: String(actorId),
  ownerId: String(ownerId || actorId),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export default function TaskFormModal({ project: initialProject, task, projects: projectOptions, workspaceMode = false, onClose, onSave }) {
  const { projects, actorId, labels, createLabel, updateLabel, deleteLabel } = useMockData();
  const availableProjects = projectOptions || projects;
  const [projectId, setProjectId] = useState(String(initialProject?.id ?? task?.projectId ?? ''));
  const project = initialProject || availableProjects.find((item) => String(item.id) === projectId);
  const [form, setForm] = useState(() => ({
    title: task?.title || '',
    description: task?.description || '',
    category: task?.category || '',
    priority: task ? (task.priority === 'normal' ? 'medium' : task.priority || 'medium') : 'none',
    assigneeId: task?.assigneeId || '',
    reviewerId: task?.reviewerId || '',
    collaborators: (task?.collaborators || []).map(String),
    startDate: task?.startDate || '',
    dueDate: task?.dueDate || '',
    estimatedHours: task?.estimatedHours ?? '',
    benefitDetails: task?.benefitDetails || '',
    labelIds: (task?.labelIds || []).map(String),
    attachments: (task?.attachments || []).map((item) => ({ ...item })),
  }));
  const [checklist, setChecklist] = useState(() => (task?.checklist || []).map((item) => ({ ...item })));
  const [allocations, setAllocations] = useState(() => (task?.plannedAllocations || []).map((item) => ({ ...item })));
  const [checklistTitle, setChecklistTitle] = useState('');
  const [labelName, setLabelName] = useState('');
  const [labelColor, setLabelColor] = useState(() => workspaceMode ? LABEL_PALETTE[labels.length % LABEL_PALETTE.length] : '#2F5BD0');
  const [editingLabelId, setEditingLabelId] = useState('');
  const [error, setError] = useState('');
  const members = useMemo(() => {
    if (!project) return [];
    const ids = new Set([...(project.teamMemberIds || []).map(String), String(project.managerId || ''), String(project.teamLeadId || '')]);
    return MOCK_EMPLOYEES.filter((employee) => ids.has(String(employee.id)));
  }, [project]);
  const eligibleCollaborators = members.filter((employee) => String(employee.id) !== String(form.assigneeId));
  const reviewers = members.filter((employee) => String(employee.id) !== String(form.assigneeId));
  const totalHours = Number(form.estimatedHours) || 0;
  const selectedContributors = [form.assigneeId, ...form.collaborators].filter(Boolean).map(String);
  const visibleAllocations = allocations.length
    ? allocations
    : totalHours > 0 && form.assigneeId ? [{ employeeId: String(form.assigneeId), hours: totalHours }] : [];
  const totalAllocated = visibleAllocations.reduce((sum, item) => sum + (Number(item.hours) || 0), 0);
  const unallocated = Math.max(0, totalHours - totalAllocated);
  const projectOwner = project?.managerId;

  const set = (key) => (event) => setForm((previous) => ({ ...previous, [key]: event.target.value }));
  const canManageChecklistItem = (item) => !task || String(actorId) === String(projectOwner)
    || String(item.ownerId || item.createdBy) === String(actorId);
  const addChecklist = (title = checklistTitle) => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    setChecklist((items) => [...items, makeChecklistItem(cleanTitle, actorId, actorId)]);
    setChecklistTitle('');
  };
  const moveChecklistItem = (index, offset) => {
    const targetIndex = index + offset;
    if (targetIndex < 0 || targetIndex >= checklist.length) return;
    const current = checklist[index];
    const target = checklist[targetIndex];
    if (!canManageChecklistItem(current) || !canManageChecklistItem(target)) return;
    setChecklist((items) => {
      const next = [...items];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };
  const updateAllocation = (employeeId, value) => {
    const numericValue = value === '' ? '' : Number(value);
    setAllocations((previous) => {
      const base = previous.length ? previous : visibleAllocations;
      const next = base.filter((item) => String(item.employeeId) !== String(employeeId));
      next.push({ employeeId: String(employeeId), hours: numericValue === '' ? 0 : numericValue });
      return next;
    });
  };
  const updateCollaborators = (event) => {
    const nextCollaborators = Array.from(event.target.selectedOptions, (option) => option.value);
    setForm((previous) => ({ ...previous, collaborators: nextCollaborators }));
    const eligible = new Set([form.assigneeId, ...nextCollaborators].filter(Boolean).map(String));
    setAllocations((previous) => previous.filter((item) => eligible.has(String(item.employeeId))));
  };
  const toggleCollaborator = (employeeId) => {
    const nextCollaborators = form.collaborators.includes(String(employeeId))
      ? form.collaborators.filter((id) => String(id) !== String(employeeId))
      : [...form.collaborators, String(employeeId)];
    setForm((previous) => ({ ...previous, collaborators: nextCollaborators }));
    const eligible = new Set([form.assigneeId, ...nextCollaborators].filter(Boolean).map(String));
    setAllocations((previous) => previous.filter((item) => eligible.has(String(item.employeeId))));
  };
  const addFiles = (event) => {
    const files = Array.from(event.target.files || []).map((file) => ({
      id: `attachment-${Date.now()}-${file.lastModified}-${file.name}`,
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      category: 'ไฟล์',
      addedAt: new Date().toISOString(),
    }));
    if (files.length) setForm((previous) => ({ ...previous, attachments: [...previous.attachments, ...files] }));
    event.target.value = '';
  };
  const addQuickAttachment = (name) => setForm((previous) => ({
    ...previous,
    attachments: [...previous.attachments, {
      id: `attachment-${Date.now()}-${name}`,
      name,
      type: 'text/uri-list',
      size: 0,
      category: 'ลิงก์เอกสาร',
      addedAt: new Date().toISOString(),
    }],
  }));
  const saveLabel = () => {
    const name = labelName.trim();
    if (!name) return;
    const label = editingLabelId
      ? updateLabel(editingLabelId, { name, color: labelColor })
      : createLabel({ name, color: labelColor });
    if (!label) return;
    if (!editingLabelId) {
      setForm((previous) => ({ ...previous, labelIds: [...new Set([...previous.labelIds, String(label.id)])] }));
      if (workspaceMode) setLabelColor(LABEL_PALETTE[(labels.length + 1) % LABEL_PALETTE.length]);
    }
    setLabelName('');
    setEditingLabelId('');
  };
  const removeLabel = (labelId) => {
    deleteLabel(labelId);
    setForm((previous) => ({ ...previous, labelIds: previous.labelIds.filter((id) => String(id) !== String(labelId)) }));
  };
  const save = (event) => {
    event.preventDefault();
    setError('');
    if (!project) return setError('กรุณาเลือกโปรเจกต์');
    if (!form.title.trim()) return setError('กรุณาระบุชื่องาน');
    if (!form.assigneeId || !members.some((person) => String(person.id) === String(form.assigneeId))) return setError('กรุณาเลือกผู้รับผิดชอบหลักจากสมาชิกโปรเจกต์');
    if (!form.reviewerId || !members.some((person) => String(person.id) === String(form.reviewerId))) return setError('กรุณากำหนดผู้ตรวจงานจากสมาชิกโปรเจกต์');
    if (String(form.reviewerId) === String(form.assigneeId)) return setError('ผู้ตรวจงานต้องไม่ซ้ำกับผู้รับผิดชอบหลัก');
    if (!form.dueDate) return setError('กรุณากำหนดวันส่ง');
    if (form.startDate && form.dueDate < form.startDate) return setError('วันเริ่มต้องไม่อยู่หลังวันกำหนดส่ง');
    if (!Number.isFinite(totalHours) || totalHours < 0) return setError('ชั่วโมงที่วางแผนต้องเป็นจำนวนตั้งแต่ 0 ขึ้นไป');
    if (visibleAllocations.some((item) => item.hours !== '' && (!Number.isFinite(Number(item.hours)) || Number(item.hours) < 0))) return setError('ชั่วโมงจัดสรรต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป');
    if (totalAllocated > totalHours + 0.001) return setError('ชั่วโมงจัดสรรรวมต้องไม่เกินชั่วโมงที่วางแผน');
    const contributorIds = new Set(selectedContributors);
    if (allocations.some((item) => !contributorIds.has(String(item.employeeId)))) return setError('ลบชั่วโมงของผู้ร่วมงานที่นำออกจากรายการก่อนบันทึก');
    const finalAllocations = totalHours > 0
      ? (visibleAllocations.length ? visibleAllocations : [{ employeeId: String(form.assigneeId), hours: totalHours }]).filter((item) => Number(item.hours) > 0).map((item) => ({ employeeId: String(item.employeeId), hours: Number(item.hours) }))
      : [];
    const values = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      projectId: project.id,
      collaborators: [...new Set(form.collaborators.map(String).filter((id) => id !== String(form.assigneeId)))],
      labelIds: [...new Set(form.labelIds.map(String))],
      checklist: checklist.filter((item) => item.title.trim()).map((item) => ({ ...item, title: item.title.trim() })),
      plannedAllocations: finalAllocations,
      estimatedHours: totalHours,
      progress: Number(task?.progress) || 0,
    };
    const result = onSave(values);
    if (!result) setError('บันทึกงานไม่สำเร็จ กรุณาตรวจสอบข้อมูลและลองอีกครั้ง');
  };

  const missingFields = [!form.title.trim() ? 'ชื่องาน' : null, !form.assigneeId ? 'ผู้รับผิดชอบหลัก' : null, !form.reviewerId ? 'ผู้ตรวจ' : null, !form.dueDate ? 'กำหนดส่ง' : null].filter(Boolean);
  const dateInvalid = Boolean(form.startDate && form.dueDate && form.dueDate < form.startDate);
  const cannotSave = missingFields.length > 0 || dateInvalid;
  const footerHint = dateInvalid
    ? 'แก้วันที่ให้ถูกต้องก่อนสร้างงาน'
    : missingFields.length
      ? `ยังต้องกรอก: ${missingFields.join(' · ')}`
      : 'พร้อมสร้างงาน · งานจะเริ่มที่สถานะ “ยังไม่เริ่ม”';
  const priorityColors = {
    none: ['#EEF2F7', '#475569', '#64748B'],
    low: ['#EEF2F7', '#475569', '#64748B'],
    medium: ['#E3ECFF', '#1B3A8A', '#2F5BD0'],
    high: ['#FFEBC8', '#7A3A06', '#B45309'],
    urgent: ['#FFE4E6', '#8A1030', '#BE123C'],
  };

  return (
    <Modal show onHide={onClose} centered size="lg" className={`mecha-form-modal project-workspace-modal${workspaceMode ? ' workspace-task-builder' : ''}`} backdropClassName="workspace-task-modal-backdrop">
      <Form onSubmit={save}>
        <Modal.Header className="workspace-task-modal-header">
          <span className="workspace-task-modal-icon" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="3.5" /><path d="M12 8.5v7M8.5 12h7" /></svg></span>
          <div className="workspace-task-modal-heading">
            <Modal.Title>{task ? 'แก้ไขงาน' : 'เพิ่มงานใหม่'}</Modal.Title>
            <span>{task ? `แก้ไขงานใน “${project?.name || task.projectName}”` : `สร้างงานใน “${project?.name || 'โปรเจกต์'}” พร้อมกำหนดผู้รับผิดชอบ ผู้ตรวจ และเช็กลิสต์`}</span>
          </div>
          <button type="button" className="workspace-task-modal-close" aria-label="ปิดหน้าเพิ่มงาน" onClick={onClose}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
        </Modal.Header>
        <Modal.Body className="workspace-task-modal-body">
          {error && <Alert variant="danger" role="alert">{error}</Alert>}
          {!initialProject && !task && <Form.Group className="workspace-form-wide"><Form.Label htmlFor="workspace-task-project">โปรเจกต์ <span aria-hidden="true">*</span></Form.Label><Form.Select id="workspace-task-project" value={projectId} onChange={(event) => { setProjectId(event.target.value); setForm((previous) => ({ ...previous, assigneeId: '', collaborators: [], reviewerId: '' })); }} required><option value="">เลือกโปรเจกต์</option>{availableProjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Form.Select></Form.Group>}
          {task && <div className="workspace-form-wide"><span className="workspace-field-label">โปรเจกต์</span><strong>{project?.name || task.projectName}</strong></div>}
          <div className="workspace-task-modal-columns">
            <div className="workspace-task-modal-column workspace-task-modal-left">
          <Form.Group className="workspace-modal-title-field"><Form.Label htmlFor="workspace-task-title">ชื่องาน <span aria-hidden="true">*</span></Form.Label><Form.Control id="workspace-task-title" value={form.title} onChange={set('title')} maxLength={200} placeholder="เช่น พัฒนาหน้าสรุปยอดผลิต" required /></Form.Group>
          <Form.Group className="workspace-modal-description-field"><Form.Label htmlFor="workspace-task-description">รายละเอียดงาน</Form.Label><Form.Control id="workspace-task-description" as="textarea" rows={4} value={form.description} onChange={set('description')} placeholder="อธิบายสิ่งที่ต้องทำ ขอบเขต และผลลัพธ์ที่คาดหวัง..." /></Form.Group>
              <section className="workspace-checklist-builder"><div className="workspace-task-section-heading"><span className="workspace-task-checklist-title"><span className="workspace-task-checklist-icon" aria-hidden="true"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6h11M9 12h11M9 18h11" /><path d="M3.5 6l1.3 1.3L7 5M3.5 12l1.3 1.3L7 11M3.5 18l1.3 1.3L7 17" /></svg></span><span>เช็กลิสต์ <span className="workspace-task-checklist-count">· {checklist.length} รายการ</span></span></span>{checklist.length > 0 && <button type="button" className="workspace-task-checklist-clear" onClick={() => setChecklist([])}>ล้างทั้งหมด</button>}</div><div className="workspace-checklist-template-actions">{Object.entries(CHECKLIST_TEMPLATES).map(([key, titles]) => <Button key={key} type="button" size="sm" variant="outline-secondary" onClick={() => setChecklist((items) => [...items, ...titles.filter((title) => !items.some((item) => item.title === title)).map((title) => makeChecklistItem(title, actorId, actorId))])}>{key === 'development' ? '+ พัฒนา' : key === 'testing' ? '+ ทดสอบ' : '+ เอกสาร'}</Button>)}</div>{checklist.length === 0 && <div className="workspace-task-checklist-empty">ยังไม่มีรายการ · พิมพ์ด้านล่างหรือเลือกเทมเพลต</div>}<div className="workspace-checklist-builder-list">{checklist.map((item, index) => <div className="workspace-checklist-builder-row" key={item.id}><span className="workspace-task-checklist-item-title">{item.title}</span><Button type="button" aria-label={`เลื่อน ${item.title} ขึ้น`} disabled={index === 0 || !canManageChecklistItem(item) || !canManageChecklistItem(checklist[index - 1])} onClick={() => moveChecklistItem(index, -1)}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6" /></svg></Button><Button type="button" aria-label={`เลื่อน ${item.title} ลง`} disabled={index === checklist.length - 1 || !canManageChecklistItem(item) || !canManageChecklistItem(checklist[index + 1])} onClick={() => moveChecklistItem(index, 1)}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg></Button><Button type="button" aria-label={`ลบ ${item.title}`} disabled={!canManageChecklistItem(item)} onClick={() => setChecklist((items) => items.filter((entry) => entry.id !== item.id))}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 12.5h9l1-12.5" /></svg></Button></div>)}</div><div className="workspace-inline-form"><label className="workspace-visually-hidden" htmlFor="workspace-task-checklist-new">เพิ่มรายการเช็กลิสต์</label><Form.Control id="workspace-task-checklist-new" aria-label="รายการ Checklist ใหม่" value={checklistTitle} onChange={(event) => setChecklistTitle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addChecklist(); } }} placeholder="พิมพ์รายการย่อย แล้วกด Enter หรือ + เพิ่ม" /><Button type="button" disabled={!checklistTitle.trim()} onClick={() => addChecklist()}>+ เพิ่ม</Button></div><Form.Text>รายการทั้งหมดจะมอบหมายให้ผู้รับผิดชอบหลักเป็นเจ้าของ แก้ไขเพิ่มได้ภายหลังจากหน้ารายละเอียดงาน</Form.Text></section>
            </div>
            <div className="workspace-task-modal-column workspace-task-modal-right">
          <Form.Group className="workspace-modal-category-field"><Form.Label htmlFor="workspace-task-category">หมวดหมู่งาน</Form.Label><Form.Control id="workspace-task-category" value={form.category} onChange={set('category')} maxLength={80} /></Form.Group>
          <Form.Group className="workspace-modal-priority-field"><span id="workspace-task-priority-label" className="workspace-reference-label">ระดับความสำคัญ</span><Form.Select id="workspace-task-priority" className="workspace-form-state-proxy" value={form.priority} onChange={set('priority')} aria-labelledby="workspace-task-priority-label"><option value="none">ไม่ระบุ</option><option value="low">ต่ำ</option><option value="medium">ปกติ</option><option value="high">สูง</option><option value="urgent">เร่งด่วน</option></Form.Select><div role="group" aria-labelledby="workspace-task-priority-label" className="workspace-task-priorities">{PRIORITIES.map((option) => { const selected = form.priority === option.value; const [background, color, border] = priorityColors[option.value]; return <button key={option.value} type="button" aria-pressed={selected} className={selected ? 'is-selected' : ''} style={{ borderColor: selected ? border : '#CBD5E1', background: selected ? background : '#fff', color: selected ? color : '#0F172A' }} onClick={() => setForm((previous) => ({ ...previous, priority: option.value }))}>{option.label}</button>; })}</div></Form.Group>
          <Form.Group className="workspace-modal-assignee-field"><Form.Label htmlFor="workspace-task-assignee">ผู้รับผิดชอบหลัก <span aria-hidden="true">*</span></Form.Label>{task ? <Form.Control id="workspace-task-assignee" value={members.find((person) => String(person.id) === String(form.assigneeId))?.name || form.assigneeId} readOnly /> : <Form.Select id="workspace-task-assignee" value={form.assigneeId} onChange={(event) => setForm((previous) => ({ ...previous, assigneeId: event.target.value, reviewerId: String(previous.reviewerId) === event.target.value ? '' : previous.reviewerId, collaborators: previous.collaborators.filter((id) => String(id) !== event.target.value) }))} required disabled={!project}><option value="">เลือกสมาชิก</option>{members.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</Form.Select>}{task && <Form.Text>การเปลี่ยนผู้รับผิดชอบต้องระบุเหตุผลในรายละเอียดงาน</Form.Text>}</Form.Group>
          <Form.Group className="workspace-modal-reviewer-field"><Form.Label htmlFor="workspace-task-reviewer">ผู้ตรวจ (Reviewer) <span aria-hidden="true">*</span></Form.Label><Form.Select id="workspace-task-reviewer" value={form.reviewerId} onChange={set('reviewerId')} required><option value="">เลือกผู้ตรวจ</option>{reviewers.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</Form.Select></Form.Group>
          <Form.Group className="workspace-modal-collaborator-field"><span className="workspace-reference-label">ผู้ร่วมงาน (เลือกได้หลายคน)</span><Form.Select id="workspace-task-collaborators" className="workspace-form-state-proxy" multiple value={form.collaborators} onChange={updateCollaborators} disabled={!project} aria-label="ผู้ร่วมงาน">{eligibleCollaborators.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</Form.Select><div className="workspace-task-collaborators">{eligibleCollaborators.map((person) => { const selected = form.collaborators.includes(String(person.id)); const initials = person.name.split(' ').map((part) => part[0]).join('').slice(0, 2); const colors = [['#DBEAFE', '#1E3A8A'], ['#D5F5E3', '#14532D'], ['#FEE9B8', '#78350F'], ['#FBD5E6', '#831843']][members.indexOf(person) % 4]; return <button key={person.id} type="button" aria-pressed={selected} className={selected ? 'is-selected' : ''} style={{ borderColor: selected ? '#2F5BD0' : '#CBD5E1', background: selected ? '#E3ECFF' : '#fff' }} onClick={() => toggleCollaborator(person.id)}><span style={{ background: colors[0], color: colors[1] }}>{initials}</span>{person.name.split(' ')[0]}</button>; })}{eligibleCollaborators.length === 0 && <span>เลือกผู้รับผิดชอบหลักก่อน</span>}</div></Form.Group>
          <Form.Group className="workspace-modal-start-field"><Form.Label htmlFor="workspace-task-start">วันที่เริ่ม</Form.Label><Form.Control id="workspace-task-start" type="date" value={form.startDate} onChange={set('startDate')} /></Form.Group>
          <Form.Group className="workspace-modal-due-field"><Form.Label htmlFor="workspace-task-due">กำหนดส่ง <span aria-hidden="true">*</span></Form.Label><Form.Control id="workspace-task-due" type="date" value={form.dueDate} onChange={set('dueDate')} required /></Form.Group>
          <Form.Group className="workspace-modal-hours-field"><Form.Label htmlFor="workspace-task-hours">ชั่วโมงที่วางแผนรวม</Form.Label><Form.Control id="workspace-task-hours" type="number" min="0" step="0.25" value={form.estimatedHours} onChange={set('estimatedHours')} /><Form.Text>เว้นว่างหรือใส่ 0 ได้</Form.Text></Form.Group>
          {totalHours > 0 && <div className="workspace-form-wide workspace-hours-allocation"><strong>จัดสรร Planned Hours</strong><span>จัดสรรแล้ว {totalAllocated.toFixed(2)} ชม. · ยังไม่จัดสรร {unallocated.toFixed(2)} ชม.</span>{selectedContributors.map((employeeId) => <Form.Group key={employeeId}><Form.Label htmlFor={`planned-allocation-${employeeId}`}>{MOCK_EMPLOYEES.find((person) => String(person.id) === employeeId)?.name || employeeId}</Form.Label><Form.Control id={`planned-allocation-${employeeId}`} aria-label={`ชั่วโมงที่วางแผนสำหรับ ${MOCK_EMPLOYEES.find((person) => String(person.id) === employeeId)?.name || employeeId}`} type="number" min="0" step="0.25" value={visibleAllocations.find((item) => String(item.employeeId) === employeeId)?.hours ?? 0} onChange={(event) => updateAllocation(employeeId, event.target.value)} /></Form.Group>)}</div>}
          <Form.Group className="workspace-modal-benefit-field"><Form.Label htmlFor="workspace-task-benefit">รายละเอียดประโยชน์ที่คาดหวัง</Form.Label><Form.Control id="workspace-task-benefit" as="textarea" rows={2} value={form.benefitDetails} onChange={set('benefitDetails')} placeholder="กรอกเมื่อ Task นี้มีประโยชน์หรือผลลัพธ์ที่ต้องติดตาม" /></Form.Group>
          <section className="workspace-form-wide workspace-task-labels"><h3>Labels</h3>{labels.length > 0 && <div className="workspace-label-options">{labels.map((label) => <div key={label.id} className="workspace-label-option"><Form.Check type="checkbox" id={`task-label-${label.id}`} label={label.name} checked={form.labelIds.includes(String(label.id))} onChange={(event) => setForm((previous) => ({ ...previous, labelIds: event.target.checked ? [...new Set([...previous.labelIds, String(label.id)])] : previous.labelIds.filter((id) => id !== String(label.id)) }))} /><span className="workspace-label-color" style={{ backgroundColor: label.color }} /><Button size="sm" variant="link" aria-label={`แก้ไขป้าย ${label.name}`} onClick={() => { setEditingLabelId(label.id); setLabelName(label.name); setLabelColor(label.color); }}>แก้ไข</Button><Button size="sm" variant="link" className="text-danger" aria-label={`ลบป้าย ${label.name}`} onClick={() => removeLabel(label.id)}>ลบ</Button></div>)}</div>}<div className="workspace-label-editor"><Form.Control aria-label="ชื่อป้าย" value={labelName} onChange={(event) => setLabelName(event.target.value)} placeholder="ชื่อป้าย" /><Form.Control aria-label="สีป้าย" type="color" value={labelColor} onChange={(event) => setLabelColor(event.target.value)} /><Button type="button" size="sm" onClick={saveLabel}>{editingLabelId ? 'บันทึกป้าย' : 'สร้างป้าย'}</Button></div></section>
          <section className="workspace-form-wide workspace-task-attachments"><h3>ไฟล์แนบ (Attachments)</h3><div className="workspace-task-attachment-quick"><button type="button" onClick={() => addQuickAttachment('Production Plan')}>+ Production Plan</button><button type="button" onClick={() => addQuickAttachment('E-SOP')}>+ E-SOP</button></div><label className="workspace-visually-hidden" htmlFor="workspace-task-attachments">เลือกไฟล์แนบ</label><Form.Control id="workspace-task-attachments" type="file" multiple onChange={addFiles} /><div className="workspace-task-attachment-items">{form.attachments.map((attachment) => <div key={attachment.id}><span>{attachment.name}</span><span>{attachment.category || 'ไฟล์'}</span><button type="button" aria-label={`ลบไฟล์ ${attachment.name}`} onClick={() => setForm((previous) => ({ ...previous, attachments: previous.attachments.filter((item) => item.id !== attachment.id) }))}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button></div>)}</div></section>
          <section className="workspace-task-labels-reference">
            <span className="workspace-task-reference-panel-title">ป้ายกำกับ (Labels)</span>
            <div className="workspace-task-label-picks">{labels.map((label) => { const selected = form.labelIds.includes(String(label.id)); return <span className="workspace-task-label-pick" key={label.id} style={{ borderColor: selected ? label.color : '#CBD5E1', background: selected ? `${label.color}26` : '#fff' }}><button type="button" aria-pressed={selected} onClick={() => setForm((previous) => ({ ...previous, labelIds: selected ? previous.labelIds.filter((id) => String(id) !== String(label.id)) : [...new Set([...previous.labelIds, String(label.id)])] }))}><span style={{ background: label.color }} />{label.name}</button><button type="button" aria-label={`แก้ไขป้าย ${label.name}`} onClick={() => { setEditingLabelId(label.id); setLabelName(label.name); setLabelColor(label.color); }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z" /></svg></button><button type="button" aria-label={`ลบป้าย ${label.name}`} onClick={() => removeLabel(label.id)}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button></span>; })}</div>
            <div className="workspace-task-label-editor"><span>{editingLabelId ? 'แก้ไขป้าย' : 'สร้างป้ายใหม่'}</span><div className="workspace-task-label-editor-row"><label className="workspace-visually-hidden" htmlFor="workspace-task-label-name">ชื่อป้าย</label><Form.Control id="workspace-task-label-name" aria-label="ชื่อป้าย" value={labelName} onChange={(event) => setLabelName(event.target.value)} placeholder="ชื่อป้าย..." /><Button type="button" disabled={!labelName.trim()} onClick={saveLabel}>{editingLabelId ? 'อัปเดต' : 'Save Label'}</Button>{editingLabelId && <button type="button" className="workspace-task-label-cancel" onClick={() => { setEditingLabelId(''); setLabelName(''); }}>ยกเลิก</button>}</div><div role="group" aria-label="เลือกสีป้าย" className="workspace-task-label-palette">{LABEL_PALETTE.map((color) => { const selected = labelColor.toUpperCase() === color; return <button key={color} type="button" aria-label={`สี ${color}`} aria-pressed={selected} style={{ background: color, boxShadow: selected ? `0 0 0 3px #fff, 0 0 0 5px ${color}` : 'inset 0 0 0 1px rgba(15,23,42,.15)' }} onClick={() => setLabelColor(color)} />; })}</div></div>
          </section>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className="workspace-task-modal-footer"><span>{footerHint}</span><Button type="button" variant="outline-secondary" onClick={onClose}>ยกเลิก</Button><Button type="submit" disabled={cannotSave}>{task ? 'บันทึกงาน' : 'สร้างงาน'}</Button></Modal.Footer>
      </Form>
    </Modal>
  );
}
