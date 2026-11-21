// frontend/src/utils/access.js — ใครเห็น / จัดการโปรเจกต์ไหน ตามโครงองค์กร Division → Section → Team (ที่เดียวในหน้าเว็บ)
//
//   guest (ไม่ login)  → เฉพาะ visibility = 'public'
//   USER              → public + โปรเจกต์ที่ตัวเองเป็น Owner (managerId) / Team Lead / สมาชิก
//   MANAGEMENT        → แบบ USER + โปรเจกต์ใน "ขอบเขต" (scope) — ติ๊ก Division = ทุก Section ข้างใต้ หรือติ๊กเฉพาะ Section
//                       โปรเจกต์อยู่ในขอบเขตเมื่อ (ก) project.sectionIds ตรงกับขอบเขต หรือ
//                       (ข) Owner / Lead / สมาชิกคนใดสังกัด Section ในขอบเขต (โปรเจกต์ที่ดึงคนข้ามแผนกมารวม ไม่ได้ติด Section)
//                       ในขอบเขต = สิทธิ์เท่า Owner (แก้ไข / จัดการสมาชิก / คอมเมนต์)
//   ADMIN             → ทั้งหมด
//
// ⚠️ ต้องตรงกับ backend/services/visibility.js (กฎใหม่เขียนไว้ใน docs/api-contract.md — ⏳ backend ยังเป็นกฎเดิม)
// ⚠️ MockDataContext กรองข้อมูลด้วยไฟล์นี้ก่อนส่งให้หน้าเว็บแล้ว — หน้าใหม่ไม่ต้องกรองซ้ำ

export const USER_ROLES = ['ADMIN', 'MANAGEMENT', 'USER'];

const ids = (list) => (Array.isArray(list) ? list.map(String) : []);
const findById = (list, id) => (list || []).find((item) => String(item.id) === String(id));

// org = { divisions, sections, teams } · sections = แผนก (MOCK_DEPARTMENTS) ที่มี divisionId
export function orgOf(employee, org) {
  if (!employee) return { divisionIds: [], sectionIds: [], teamIds: [] };
  const id = String(employee.id);
  const teams = (org.teams || []).filter((team) => ids(team.memberEmployeeIds).includes(id));
  const sectionIds = new Set([...ids(employee.sectionIds), ...(employee.departmentId ? [String(employee.departmentId)] : [])]);
  teams.forEach((team) => { if (team.sectionId) sectionIds.add(String(team.sectionId)); });
  const divisionIds = new Set();
  sectionIds.forEach((sectionId) => {
    const section = findById(org.sections, sectionId);
    if (section?.divisionId) divisionIds.add(String(section.divisionId));
  });
  return { divisionIds: [...divisionIds], sectionIds: [...sectionIds], teamIds: teams.map((team) => String(team.id)) };
}

// Section ทั้งหมดที่ MANAGEMENT เห็น (ติ๊ก Division = ทุก Section ใน Division นั้น)
export function scopeSectionIds(employee, org) {
  if (employee?.role !== 'MANAGEMENT') return [];
  const scope = employee.scope || {};
  const divisions = new Set(ids(scope.divisionIds));
  const result = new Set(ids(scope.sectionIds));
  (org.sections || []).forEach((section) => { if (divisions.has(String(section.divisionId))) result.add(String(section.id)); });
  return [...result];
}

export const projectPeopleIds = (project) => [
  ...ids(project?.teamMemberIds), project?.managerId, project?.teamLeadId,
].filter(Boolean).map(String);

const isActive = (employee) => employee && employee.isActive !== false;

// ctx = { employees, org }
function inManagementScope(project, viewer, ctx) {
  const scope = new Set(scopeSectionIds(viewer, ctx.org));
  if (!scope.size) return false;
  if (ids(project.sectionIds).some((sectionId) => scope.has(sectionId))) return true;
  return projectPeopleIds(project).some((personId) => {
    const person = findById(ctx.employees, personId);
    return orgOf(person, ctx.org).sectionIds.some((sectionId) => scope.has(sectionId));
  });
}

export function canSeeProject(project, viewer, ctx) {
  if (!project) return false;
  if (isActive(viewer) && viewer.role === 'ADMIN') return true;
  if (project.visibility !== 'private') return true; // ไม่มีค่า = public (ข้อมูลเก่า)
  if (!isActive(viewer)) return false;
  if (projectPeopleIds(project).includes(String(viewer.id))) return true;
  return viewer.role === 'MANAGEMENT' && inManagementScope(project, viewer, ctx);
}

export function canManageProject(project, viewer, ctx) {
  if (!project || !isActive(viewer)) return false;
  if (viewer.role === 'ADMIN') return true;
  if ([project.managerId, project.teamLeadId].some((id) => id && String(id) === String(viewer.id))) return true;
  return viewer.role === 'MANAGEMENT' && inManagementScope(project, viewer, ctx);
}

// บทบาทของผู้ชมในโปรเจกต์ (แสดง "คุณ: …" ในหัวโปรเจกต์)
export function projectRoleOf(project, viewer, ctx) {
  if (!project || !viewer) return '';
  const id = String(viewer.id);
  if (String(project.managerId) === id) return 'Project Owner';
  if (String(project.teamLeadId || '') === id) return 'Team Leader';
  if (ids(project.teamMemberIds).includes(id)) return 'สมาชิก';
  if (viewer.role === 'ADMIN') return 'ผู้ดูแลระบบ';
  if (viewer.role === 'MANAGEMENT' && inManagementScope(project, viewer, ctx)) return 'Management';
  return 'ผู้ชม';
}

// คนที่ผู้ชมเห็นภาระงาน (หน้า Workload / กล่องหน้าหลัก / หน้ารายงาน)
//   ADMIN = ทุกคน · MANAGEMENT = คนที่สังกัด Section ในขอบเขต + คนในโปรเจกต์ที่เห็น · USER = คนในโปรเจกต์ที่เห็น (รวมตัวเอง)
export function peopleInView(viewer, ctx, visibleProjects) {
  const employees = ctx.employees || [];
  if (viewer?.role === 'ADMIN' && isActive(viewer)) return employees;
  const ids = new Set(viewer ? [String(viewer.id)] : []);
  (visibleProjects || []).forEach((project) => projectPeopleIds(project).forEach((id) => ids.add(id)));
  const scope = new Set(scopeSectionIds(viewer, ctx.org));
  return employees.filter((person) => ids.has(String(person.id))
    || (scope.size > 0 && orgOf(person, ctx.org).sectionIds.some((sectionId) => scope.has(sectionId))));
}
