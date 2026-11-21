// frontend/src/utils/access.test.js — เทสกฎการเห็น / จัดการโปรเจกต์ตามโครงองค์กร (utils/access.js)
import { canManageProject, canSeeProject, orgOf, projectRoleOf, scopeSectionIds } from './access';

const org = {
  divisions: [{ id: 'div-1' }, { id: 'div-2' }],
  sections: [{ id: 's-a', divisionId: 'div-1' }, { id: 's-b', divisionId: 'div-1' }, { id: 's-c', divisionId: 'div-2' }],
  teams: [{ id: 't-1', sectionId: 's-a', memberEmployeeIds: ['u-multi'] }, { id: 't-2', sectionId: 's-c', memberEmployeeIds: ['u-multi'] }],
};
const person = (id, patch = {}) => ({ id, role: 'USER', isActive: true, departmentId: null, sectionIds: [], ...patch });
const employees = [
  person('admin', { role: 'ADMIN' }),
  person('u-a', { departmentId: 's-a', sectionIds: ['s-a'] }),
  person('u-b', { departmentId: 's-b', sectionIds: ['s-b'] }),
  person('u-c'),
  person('u-multi', { departmentId: 's-b', sectionIds: ['s-b'] }),
  person('mgr-a', { role: 'MANAGEMENT', scope: { divisionIds: [], sectionIds: ['s-a'] } }),
  person('mgr-div1', { role: 'MANAGEMENT', scope: { divisionIds: ['div-1'], sectionIds: [] } }),
  person('mgr-c', { role: 'MANAGEMENT', scope: { divisionIds: [], sectionIds: ['s-c'] } }),
];
const ctx = { employees, org };
const who = (id) => employees.find((item) => item.id === id);
const project = (patch) => ({ id: 1, visibility: 'private', sectionIds: [], managerId: 'u-b', teamLeadId: null, teamMemberIds: [], ...patch });

describe('orgOf', () => {
  it('คนเดียวสังกัดหลาย Section / หลายทีม / หลาย Division — ไล่ขึ้นจากทีม', () => {
    const result = orgOf(who('u-multi'), org);
    expect(result.teamIds.sort()).toEqual(['t-1', 't-2']);
    expect(result.sectionIds.sort()).toEqual(['s-a', 's-b', 's-c']);
    expect(result.divisionIds.sort()).toEqual(['div-1', 'div-2']);
  });
});

describe('scopeSectionIds', () => {
  it('ติ๊ก Division = ทุก Section ข้างใต้ · ติ๊ก Section = เฉพาะ Section นั้น · USER ไม่มีขอบเขต', () => {
    expect(scopeSectionIds(who('mgr-div1'), org).sort()).toEqual(['s-a', 's-b']);
    expect(scopeSectionIds(who('mgr-a'), org)).toEqual(['s-a']);
    expect(scopeSectionIds(who('u-a'), org)).toEqual([]);
  });
});

describe('canSeeProject', () => {
  it('ADMIN เห็นทั้งหมด · guest เห็นแค่ public', () => {
    expect(canSeeProject(project(), who('admin'), ctx)).toBe(true);
    expect(canSeeProject(project(), null, ctx)).toBe(false);
    expect(canSeeProject(project({ visibility: 'public' }), null, ctx)).toBe(true);
  });

  it('USER เห็นเฉพาะที่เป็นสมาชิก / Owner / Lead + public', () => {
    expect(canSeeProject(project({ teamMemberIds: ['u-a'] }), who('u-a'), ctx)).toBe(true);
    expect(canSeeProject(project({ teamLeadId: 'u-a' }), who('u-a'), ctx)).toBe(true);
    expect(canSeeProject(project({ sectionIds: ['s-a'] }), who('u-a'), ctx)).toBe(false); // อยู่ Section เดียวกันแต่ไม่ใช่สมาชิก
  });

  it('MANAGEMENT เห็นโปรเจกต์ที่ติด Section ในขอบเขต', () => {
    const inA = project({ sectionIds: ['s-a'], managerId: 'u-c' });
    expect(canSeeProject(inA, who('mgr-a'), ctx)).toBe(true);
    expect(canSeeProject(inA, who('mgr-div1'), ctx)).toBe(true);
    expect(canSeeProject(inA, who('mgr-c'), ctx)).toBe(false);
  });

  it('MANAGEMENT เห็นโปรเจกต์ดึงคนข้ามแผนก (ไม่ติด Section) ผ่านสมาชิกที่อยู่ในขอบเขต', () => {
    const adHoc = project({ managerId: 'u-c', teamMemberIds: ['u-c', 'u-a'] });
    expect(canSeeProject(adHoc, who('mgr-a'), ctx)).toBe(true);
    expect(canSeeProject(adHoc, who('mgr-c'), ctx)).toBe(false); // u-c ไม่มีสังกัด
    // คนสังกัดหลาย Section ถูกนับทุก Section — u-multi อยู่ทีม t-2 (s-c)
    expect(canSeeProject(project({ managerId: 'u-multi' }), who('mgr-c'), ctx)).toBe(true);
  });

  it('บัญชีที่ปิดเห็นแค่ public', () => {
    const closed = { ...who('admin'), isActive: false };
    expect(canSeeProject(project(), closed, ctx)).toBe(false);
  });
});

describe('canManageProject / projectRoleOf', () => {
  it('Owner / Lead / ADMIN / MANAGEMENT ในขอบเขต จัดการได้ · สมาชิกธรรมดาไม่ได้', () => {
    const p = project({ sectionIds: ['s-a'], managerId: 'u-b', teamLeadId: 'u-a', teamMemberIds: ['u-c'] });
    expect(canManageProject(p, who('u-b'), ctx)).toBe(true);
    expect(canManageProject(p, who('u-a'), ctx)).toBe(true);
    expect(canManageProject(p, who('admin'), ctx)).toBe(true);
    expect(canManageProject(p, who('mgr-a'), ctx)).toBe(true);
    expect(canManageProject(p, who('u-c'), ctx)).toBe(false);
    expect(canManageProject(p, who('mgr-c'), ctx)).toBe(false);
    expect(projectRoleOf(p, who('mgr-a'), ctx)).toBe('Management');
  });
});
