// frontend/src/utils/workload.test.js — เทสกฎวัดภาระงานเป็นแต้มตามขนาดงาน (utils/workload.js)
import { memberWorkload, memberWorkloadSummary, remainingPoints, sortByUrgency } from './workload';

const NOW = new Date(2026, 10, 21, 9, 0, 0); // 21 พ.ย. 2026 (เวลาเครื่อง)
const people = ['a', 'b', 'c', 'd'].map((id) => ({ id, name: id.toUpperCase() }));
let seq = 0;
const task = (patch) => ({ id: `t${seq += 1}`, projectId: 1, status: 'in_progress', priority: 'medium', size: 'medium', dueDate: '2026-12-31', collaborators: [], ...patch });
const rowOf = (rows, id) => rows.find((row) => row.employee.id === id);
const checklist = (done, total) => Array.from({ length: total }, (_, i) => ({ id: `c${i}`, title: `c${i}`, completed: i < done }));

describe('แต้มของงาน', () => {
  it('เล็ก 1 · กลาง 3 · ใหญ่ 8 · ไม่มีขนาด = กลาง', () => {
    expect(remainingPoints(task({ size: 'small' }))).toBe(1);
    expect(remainingPoints(task({ size: 'large' }))).toBe(8);
    expect(remainingPoints(task({ size: undefined }))).toBe(3);
  });
  it('ติ๊กเช็กลิสต์ครึ่งหนึ่ง = แต้มเหลือครึ่ง', () => {
    expect(remainingPoints(task({ size: 'large', checklist: checklist(2, 4) }))).toBe(4);
  });
});

describe('memberWorkload', () => {
  it('งานใหญ่ 1 งานหนักกว่างานเล็ก 5 งาน', () => {
    const rows = memberWorkload(people, [
      task({ assigneeId: 'a', size: 'large' }),
      ...[1, 2, 3, 4, 5].map(() => task({ assigneeId: 'b', size: 'small' })),
    ], { now: NOW });
    expect(rowOf(rows, 'a').points).toBe(8);
    expect(rowOf(rows, 'b').points).toBe(5);
    expect(rows.findIndex((row) => row.employee.id === 'a')).toBeLessThan(rows.findIndex((row) => row.employee.id === 'b'));
  });

  it('เทียบค่ากลางทีม: 2 เท่าขึ้นไป = งานเกิน พร้อมเหตุผลแบบแต้ม', () => {
    const { rows, median } = memberWorkloadSummary(people, [
      task({ assigneeId: 'a', size: 'large' }), task({ assigneeId: 'a', size: 'large' }), // 16
      task({ assigneeId: 'b', size: 'large' }),                                          // 8
      task({ assigneeId: 'c', size: 'medium' }), task({ assigneeId: 'c', size: 'medium' }), // 6
    ], { now: NOW });
    expect(median).toBe(8);
    expect(rowOf(rows, 'a').level).toBe('over');
    expect(rowOf(rows, 'a').reasons[0]).toBe('ภาระ 16 แต้ม = 2.0 เท่าของค่ากลาง (8)');
    expect(rowOf(rows, 'b').level).toBe('normal');
    expect(rowOf(rows, 'd').level).toBe('free');
  });

  it('1.5 เท่าของค่ากลาง หรือมีงานเลยกำหนด = งานหนัก', () => {
    const rows = memberWorkload(people, [
      task({ assigneeId: 'a', size: 'large' }), task({ assigneeId: 'a', size: 'medium' }), task({ assigneeId: 'a', size: 'small' }), // 12 = 1.5 เท่า
      task({ assigneeId: 'b', size: 'large' }),                                          // 8
      task({ assigneeId: 'c', size: 'small', dueDate: '2026-11-01' }),                   // 1 เลยกำหนด
    ], { now: NOW });
    expect(rowOf(rows, 'a').level).toBe('heavy');
    expect(rowOf(rows, 'c').level).toBe('heavy');
    expect(rowOf(rows, 'c').reasons[0]).toContain('เลยกำหนด 1 งาน');
  });

  it('ร่วมทำนับครึ่ง · ส่งตรวจแล้วไม่นับให้ผู้ทำ แต่นับ ¼ ให้ผู้ตรวจ · ตรวจเองไม่นับซ้ำ', () => {
    const rows = memberWorkload(people, [
      task({ assigneeId: 'a', collaborators: ['b'], size: 'large' }),
      task({ assigneeId: 'c', reviewerId: 'd', size: 'large', status: 'pending_review' }),
      task({ assigneeId: 'd', reviewerId: 'd', size: 'small' }),
    ], { now: NOW });
    expect(rowOf(rows, 'b').points).toBe(4);
    expect(rowOf(rows, 'c').points).toBe(0);
    expect(rowOf(rows, 'd').points).toBe(3); // ตรวจ 2 (¼ ของ 8) + งานตัวเอง 1
    expect(rowOf(rows, 'd').toReview).toBe(1);
  });

  it('งานเสร็จแล้วไม่นับ · กรองตามโปรเจกต์ได้', () => {
    const tasks = [task({ assigneeId: 'a', projectId: 1 }), task({ assigneeId: 'a', projectId: 2 }), task({ assigneeId: 'a', status: 'completed' })];
    expect(rowOf(memberWorkload(people, tasks, { now: NOW }), 'a').points).toBe(6);
    expect(rowOf(memberWorkload(people, tasks, { now: NOW, projectId: '2' }), 'a').points).toBe(3);
  });
});

describe('sortByUrgency', () => {
  it('เลยกำหนดก่อน → ใกล้ส่ง → ความสำคัญ', () => {
    const later = task({ title: 'later', dueDate: '2026-12-20', priority: 'urgent' });
    const overdue = task({ title: 'overdue', dueDate: '2026-11-01' });
    const soon = task({ title: 'soon', dueDate: '2026-11-24' });
    expect(sortByUrgency([later, soon, overdue], NOW).map((item) => item.title)).toEqual(['overdue', 'soon', 'later']);
  });
});
