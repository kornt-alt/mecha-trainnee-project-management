// frontend/src/components/admin/UserManagement.js — หน้าจัดการผู้ใช้ (ADMIN): เพิ่ม / แก้ข้อมูล / สิทธิ์ / สังกัด / บัตร / รหัสผ่าน / ปิด-เปิดบัญชี
//
// ข้อมูลและกฎอยู่ที่ MockDataContext (createUser / updateUser — กฎเดียวกับ backend/routes/users.js) · หน้านี้แสดงผลอย่างเดียว
// สังกัด = Division → Section → Team (คนหนึ่งอยู่ได้หลายที่) · role MANAGEMENT ติ๊กขอบเขตที่เห็น (กฎการเห็นใน utils/access.js)
// ⚠️ ต่อ API จริง: GET /users, PATCH /users/:userid, ⏳ POST /users (docs/api-contract.md) — ตอนนี้ยังเป็น mock
import React, { useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Form, Modal, Row } from 'react-bootstrap';
import { useMockData } from '../../context/MockDataContext';
import { USER_ROLE_LABELS, USER_ROLE_HINTS } from '../../utils/labels';
import { USER_ROLES, orgOf } from '../../utils/access';
import './userManagement.css';

const EMPTY_SCOPE = { divisionIds: [], sectionIds: [] };

function RoleBadge({ role }) {
  return <span className={`user-role-badge user-role-${String(role).toLowerCase()}`}>{USER_ROLE_LABELS[role] || role}</span>;
}

const toggle = (list, id) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);

// ต้นไม้สังกัด: Division → Section (ติ๊กเป็นสมาชิก) → Team (ติ๊กเป็นสมาชิกทีม)
function MembershipTree({ org, sectionIds, teamIds, onChange }) {
  return (
    <div className="user-org-tree" role="group" aria-label="สังกัด">
      {org.divisions.map((division) => (
        <fieldset key={division.id} className="user-org-division">
          <legend>{division.name}</legend>
          {org.sections.filter((section) => section.divisionId === division.id).map((section) => {
            const teams = org.teams.filter((team) => String(team.sectionId) === section.id);
            return (
              <div key={section.id} className="user-org-section">
                <Form.Check
                  id={`user-section-${section.id}`}
                  label={section.name}
                  checked={sectionIds.includes(section.id)}
                  onChange={() => onChange({ sectionIds: toggle(sectionIds, section.id), teamIds })}
                />
                {teams.length > 0 && (
                  <div className="user-org-teams">
                    {teams.map((team) => (
                      <Form.Check
                        key={team.id}
                        id={`user-team-${team.id}`}
                        label={`ทีม ${team.name}`}
                        checked={teamIds.includes(String(team.id))}
                        onChange={() => {
                          const nextTeams = toggle(teamIds, String(team.id));
                          // อยู่ทีมไหน = อยู่ Section ของทีมนั้นด้วย
                          const nextSections = nextTeams.includes(String(team.id)) && !sectionIds.includes(section.id) ? [...sectionIds, section.id] : sectionIds;
                          onChange({ sectionIds: nextSections, teamIds: nextTeams });
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </fieldset>
      ))}
    </div>
  );
}

// ขอบเขตที่ MANAGEMENT เห็น: ติ๊ก Division = ทุก Section ข้างใต้ (ล็อกไว้) หรือติ๊กเฉพาะ Section
function ScopeTree({ org, scope, onChange }) {
  return (
    <div className="user-org-tree" role="group" aria-label="ขอบเขตที่เห็น">
      {org.divisions.map((division) => {
        const wholeDivision = scope.divisionIds.includes(division.id);
        const sections = org.sections.filter((section) => section.divisionId === division.id);
        return (
          <fieldset key={division.id} className="user-org-division">
            <Form.Check
              id={`scope-division-${division.id}`}
              className="user-scope-division"
              label={<strong>ทั้ง {division.name}</strong>}
              checked={wholeDivision}
              onChange={() => onChange({
                divisionIds: toggle(scope.divisionIds, division.id),
                // ติ๊กทั้ง Division แล้วไม่ต้องเก็บ Section ข้างใต้ซ้ำ
                sectionIds: scope.sectionIds.filter((id) => !sections.some((section) => section.id === id)),
              })}
            />
            <div className="user-org-teams">
              {sections.map((section) => (
                <Form.Check
                  key={section.id}
                  id={`scope-section-${section.id}`}
                  label={section.name}
                  checked={wholeDivision || scope.sectionIds.includes(section.id)}
                  disabled={wholeDivision}
                  onChange={() => onChange({ ...scope, sectionIds: toggle(scope.sectionIds, section.id) })}
                />
              ))}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

function UserFormModal({ user, onClose }) {
  const { org, tasks, actorId, createUser, updateUser } = useMockData();
  const isCreate = !user;
  const isSelf = Boolean(user) && String(user.id) === String(actorId);
  const [form, setForm] = useState(() => ({
    id: user?.id || '',
    name: user?.name || '',
    position: user?.position || '',
    email: user?.email || '',
    role: user?.role || 'USER',
    sectionIds: user ? orgOf(user, { ...org, teams: [] }).sectionIds : [],
    departmentId: user?.departmentId || '',
    teamIds: user ? org.teams.filter((team) => (team.memberEmployeeIds || []).map(String).includes(String(user.id))).map((team) => String(team.id)) : [],
    scope: user?.scope || EMPTY_SCOPE,
    rfid: user?.rfid || '',
    isActive: user ? user.isActive !== false : true,
    password: '',
  }));
  const [showPassword, setShowPassword] = useState(isCreate);
  const [error, setError] = useState('');
  const set = (key) => (event) => setForm((previous) => ({ ...previous, [key]: event.target.value }));
  const deactivating = Boolean(user) && user.isActive !== false && !form.isActive;
  const openTasks = useMemo(() => (user ? tasks.filter((task) => task.status !== 'completed' && String(task.assigneeId) === String(user.id)).length : 0), [tasks, user]);
  const primaryOptions = org.sections.filter((section) => form.sectionIds.includes(section.id));

  const submit = (event) => {
    event.preventDefault();
    const departmentId = form.sectionIds.includes(form.departmentId) ? form.departmentId : form.sectionIds[0];
    const values = {
      name: form.name, position: form.position, email: form.email, role: form.role,
      sectionIds: form.sectionIds, departmentId, teamIds: form.teamIds, scope: form.scope,
      rfid: form.rfid, isActive: form.isActive,
      ...(showPassword ? { password: form.password } : {}),
    };
    const result = isCreate ? createUser({ ...values, id: form.id }) : updateUser(user.id, values);
    if (result.error) { setError(result.error); return; }
    onClose(result.user);
  };

  return (
    <Modal show onHide={() => onClose(null)} centered size="lg" className="user-form-modal" aria-labelledby="user-form-title">
      <Form onSubmit={submit} noValidate>
        <Modal.Header closeButton>
          <Modal.Title id="user-form-title" className="fs-5 fw-bold">{isCreate ? 'เพิ่มผู้ใช้' : `แก้ไขผู้ใช้ · ${user.id}`}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col md={4}>
              <Form.Label htmlFor="user-id">รหัสพนักงาน</Form.Label>
              <Form.Control id="user-id" value={form.id} onChange={set('id')} readOnly={!isCreate} placeholder={isCreate ? 'ว่าง = ออกให้อัตโนมัติ' : ''} />
            </Col>
            <Col md={8}>
              <Form.Label htmlFor="user-name">ชื่อ-นามสกุล <span aria-hidden="true">*</span></Form.Label>
              <Form.Control id="user-name" value={form.name} onChange={set('name')} required maxLength={120} />
            </Col>
            <Col md={6}>
              <Form.Label htmlFor="user-position">ตำแหน่ง</Form.Label>
              <Form.Control id="user-position" value={form.position} onChange={set('position')} maxLength={80} />
            </Col>
            <Col md={6}>
              <Form.Label htmlFor="user-email">อีเมล</Form.Label>
              <Form.Control id="user-email" type="email" value={form.email} onChange={set('email')} maxLength={120} />
            </Col>

            <Col xs={12}>
              <span id="user-role-label" className="form-label d-block">สิทธิ์</span>
              <div role="group" aria-labelledby="user-role-label" className="user-role-picker">
                {USER_ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    aria-pressed={form.role === role}
                    className={form.role === role ? 'is-selected' : ''}
                    disabled={isSelf && role !== 'ADMIN'}
                    onClick={() => setForm((previous) => ({ ...previous, role }))}
                  >
                    <span>{USER_ROLE_LABELS[role]}</span>
                    <small>{USER_ROLE_HINTS[role]}</small>
                  </button>
                ))}
              </div>
              {isSelf && <Form.Text>ลดสิทธิ์ของตัวเองไม่ได้ — ให้ผู้ดูแลคนอื่นทำแทน</Form.Text>}
            </Col>

            {form.role === 'MANAGEMENT' && (
              <Col xs={12}>
                <span className="form-label d-block">เห็นข้อมูลของ <span className="text-muted fw-normal small">· ติ๊กทั้ง Division หรือเฉพาะ Section · ได้สิทธิ์เท่า Project Owner ในโปรเจกต์ที่เห็น</span></span>
                <ScopeTree org={org} scope={form.scope} onChange={(scope) => setForm((previous) => ({ ...previous, scope }))} />
              </Col>
            )}

            <Col xs={12}>
              <span className="form-label d-block">สังกัด <span aria-hidden="true">*</span> <span className="text-muted fw-normal small">· อยู่ได้หลาย Section / หลายทีม</span></span>
              <MembershipTree org={org} sectionIds={form.sectionIds} teamIds={form.teamIds} onChange={(next) => setForm((previous) => ({ ...previous, ...next }))} />
              {primaryOptions.length > 1 && (
                <div className="mt-2 user-primary-section">
                  <Form.Label htmlFor="user-primary-section" className="small mb-1">Section หลัก</Form.Label>
                  <Form.Select id="user-primary-section" size="sm" value={form.sectionIds.includes(form.departmentId) ? form.departmentId : form.sectionIds[0]} onChange={set('departmentId')}>
                    {primaryOptions.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
                  </Form.Select>
                </div>
              )}
            </Col>

            <Col md={6}>
              <Form.Label htmlFor="user-rfid">รหัสบัตรพนักงาน (RFID)</Form.Label>
              <div className="d-flex gap-2">
                <Form.Control id="user-rfid" value={form.rfid} onChange={set('rfid')} placeholder="แตะบัตรหรือพิมพ์รหัส" maxLength={50} />
                {form.rfid && <Button type="button" variant="outline-secondary" onClick={() => setForm((previous) => ({ ...previous, rfid: '' }))}>ถอดบัตร</Button>}
              </div>
            </Col>
            <Col md={6}>
              {showPassword ? (
                <>
                  <Form.Label htmlFor="user-password">{isCreate ? 'รหัสผ่านเริ่มต้น' : 'รหัสผ่านใหม่'} <span aria-hidden="true">*</span></Form.Label>
                  <Form.Control id="user-password" type="password" value={form.password} onChange={set('password')} autoComplete="new-password" placeholder="อย่างน้อย 6 ตัวอักษร" />
                </>
              ) : (
                <>
                  <span className="form-label d-block">รหัสผ่าน</span>
                  <Button type="button" variant="outline-primary" onClick={() => setShowPassword(true)}>ตั้งรหัสผ่านใหม่</Button>
                </>
              )}
            </Col>

            {!isCreate && (
              <Col xs={12}>
                <Form.Check
                  type="switch"
                  id="user-active"
                  label="เปิดใช้งานบัญชี"
                  checked={form.isActive}
                  disabled={isSelf}
                  onChange={(event) => setForm((previous) => ({ ...previous, isActive: event.target.checked }))}
                />
                {isSelf && <Form.Text>ปิดบัญชีของตัวเองไม่ได้</Form.Text>}
                {deactivating && (
                  <Alert variant="warning" className="mt-2 mb-0 py-2 small">
                    ปิดบัญชีแล้ว {user.name} จะ login ไม่ได้ และไม่ขึ้นในรายชื่อให้มอบงานใหม่ (งานเดิมยังแสดงชื่อ)
                    {openTasks > 0 && <> · <strong>มีงานค้าง {openTasks} งาน</strong> ควรเปลี่ยนผู้รับผิดชอบก่อน</>}
                  </Alert>
                )}
              </Col>
            )}
          </Row>
          {error && <Alert variant="danger" className="mt-3 mb-0 py-2" role="alert">{error}</Alert>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => onClose(null)}>ยกเลิก</Button>
          <Button type="submit" variant={deactivating ? 'danger' : 'primary'}>{isCreate ? 'เพิ่มผู้ใช้' : deactivating ? 'ยืนยันปิดบัญชีและบันทึก' : 'บันทึก'}</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

export default function UserManagement() {
  const { employees, org, actorId } = useMockData();
  const [search, setSearch] = useState('');
  const [divisionId, setDivisionId] = useState('all');
  const [sectionId, setSectionId] = useState('all');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [editing, setEditing] = useState(null); // null | { user } (user = null → เพิ่มใหม่)
  const [message, setMessage] = useState('');

  const rows = useMemo(() => employees.map((employee) => ({ employee, org: orgOf(employee, org) })), [employees, org]);
  const filtered = rows.filter(({ employee, org: memberOf }) => {
    const query = search.trim().toLowerCase();
    if (query && ![employee.name, employee.id, employee.email].some((value) => String(value || '').toLowerCase().includes(query))) return false;
    if (divisionId !== 'all' && !memberOf.divisionIds.includes(divisionId)) return false;
    if (sectionId !== 'all' && !memberOf.sectionIds.includes(sectionId)) return false;
    if (role !== 'all' && employee.role !== role) return false;
    if (status === 'active' && employee.isActive === false) return false;
    if (status === 'inactive' && employee.isActive !== false) return false;
    return true;
  });
  const sectionName = (id) => org.sections.find((section) => section.id === id)?.name || id;
  const teamName = (id) => org.teams.find((team) => String(team.id) === String(id))?.name || id;
  const divisionName = (id) => org.divisions.find((division) => division.id === id)?.name || id;
  const sectionOptions = org.sections.filter((section) => divisionId === 'all' || section.divisionId === divisionId);

  const closeForm = (saved) => {
    if (saved) setMessage(`บันทึก ${saved.name} (${saved.id}) แล้ว`);
    setEditing(null);
  };

  return (
    <div className="user-admin-page">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <div>
          <h1 className="page-title mb-1">จัดการผู้ใช้</h1>
          <p className="text-muted small mb-0">สิทธิ์ · สังกัด Division → Section → ทีม · ขอบเขตที่ Management เห็น · บัตรพนักงาน · เปิด/ปิดบัญชี</p>
        </div>
        <Button onClick={() => { setMessage(''); setEditing({ user: null }); }}>+ เพิ่มผู้ใช้</Button>
      </div>

      <Row className="g-3 mb-3">
        {[
          ['ผู้ใช้ทั้งหมด', employees.length],
          [USER_ROLE_LABELS.ADMIN, employees.filter((item) => item.role === 'ADMIN').length],
          [USER_ROLE_LABELS.MANAGEMENT, employees.filter((item) => item.role === 'MANAGEMENT').length],
          ['ปิดใช้งาน', employees.filter((item) => item.isActive === false).length],
        ].map(([label, value]) => (
          <Col xs={6} lg={3} key={label}>
            <Card className="border-0 shadow-sm p-3 h-100 user-admin-kpi" data-kpi={label}>
              <span className="small text-muted fw-medium">{label}</span>
              <span className="h3 fw-bold mb-0 text-ink">{value}</span>
            </Card>
          </Col>
        ))}
      </Row>

      {message && <Alert variant="success" className="py-2" onClose={() => setMessage('')} dismissible>{message}</Alert>}

      <Card className="border-0 shadow-sm">
        <Card.Body>
          <div className="user-admin-toolbar">
            <Form.Control size="sm" placeholder="ค้นหาชื่อ / รหัส / อีเมล..." value={search} onChange={(event) => setSearch(event.target.value)} aria-label="ค้นหาผู้ใช้" />
            <Form.Select size="sm" value={divisionId} onChange={(event) => { setDivisionId(event.target.value); setSectionId('all'); }} aria-label="กรอง Division">
              <option value="all">ทุก Division</option>
              {org.divisions.map((division) => <option key={division.id} value={division.id}>{division.name}</option>)}
            </Form.Select>
            <Form.Select size="sm" value={sectionId} onChange={(event) => setSectionId(event.target.value)} aria-label="กรอง Section">
              <option value="all">ทุก Section</option>
              {sectionOptions.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
            </Form.Select>
            <Form.Select size="sm" value={role} onChange={(event) => setRole(event.target.value)} aria-label="กรองสิทธิ์">
              <option value="all">ทุกสิทธิ์</option>
              {USER_ROLES.map((item) => <option key={item} value={item}>{USER_ROLE_LABELS[item]}</option>)}
            </Form.Select>
            <Form.Select size="sm" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="กรองสถานะ">
              <option value="all">ทุกสถานะ</option>
              <option value="active">ใช้งาน</option>
              <option value="inactive">ปิดใช้งาน</option>
            </Form.Select>
          </div>

          {filtered.length === 0 ? <p className="text-muted small mb-0">ไม่พบผู้ใช้ตามตัวกรอง</p> : (
            <div className="user-admin-table" role="table" aria-label="รายชื่อผู้ใช้">
              <div className="user-admin-head" role="row">
                <span role="columnheader">ผู้ใช้</span>
                <span role="columnheader">สังกัด</span>
                <span role="columnheader">สิทธิ์</span>
                <span role="columnheader">บัตร</span>
                <span role="columnheader">สถานะ</span>
                <span role="columnheader" className="visually-hidden">จัดการ</span>
              </div>
              {filtered.map(({ employee, org: memberOf }) => (
                <div key={employee.id} className={`user-admin-row${employee.isActive === false ? ' is-inactive' : ''}`} role="row" data-user-id={employee.id}>
                  <span role="cell" className="user-admin-name">
                    <strong>{employee.name} {String(employee.id) === String(actorId) && <span className="user-self-badge">คุณ</span>}</strong>
                    <small>{employee.id}{employee.position ? ` · ${employee.position}` : ''}</small>
                  </span>
                  <span role="cell" className="user-admin-org" data-label="สังกัด">
                    {memberOf.sectionIds.map((id) => <span key={id} className={`user-chip${id === employee.departmentId ? ' is-primary' : ''}`} title={id === employee.departmentId ? 'Section หลัก' : 'Section'}>{sectionName(id)}</span>)}
                    {memberOf.teamIds.map((id) => <span key={id} className="user-chip is-team">ทีม {teamName(id)}</span>)}
                  </span>
                  <span role="cell" className="user-admin-role" data-label="สิทธิ์">
                    <RoleBadge role={employee.role} />
                    {employee.role === 'MANAGEMENT' && (
                      <small>เห็น: {[...(employee.scope?.divisionIds || []).map((id) => `ทั้ง ${divisionName(id)}`), ...(employee.scope?.sectionIds || []).map(sectionName)].join(', ') || '—'}</small>
                    )}
                  </span>
                  <span role="cell" data-label="บัตร">{employee.rfid ? <span className="text-success fw-semibold">ผูกแล้ว</span> : <span className="text-muted">ไม่มี</span>}</span>
                  <span role="cell" data-label="สถานะ">{employee.isActive === false ? <span className="user-status is-off">ปิดใช้งาน</span> : <span className="user-status">ใช้งาน</span>}</span>
                  <span role="cell" className="user-admin-actions">
                    <Button size="sm" variant="outline-primary" onClick={() => { setMessage(''); setEditing({ user: employee }); }} aria-label={`แก้ไข ${employee.name}`}>แก้ไข</Button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>

      {editing && <UserFormModal user={editing.user} onClose={closeForm} />}
    </div>
  );
}
