// frontend/src/utils/executiveMetrics.test.js — เทสสูตรตัวเลขผู้บริหาร (สุขภาพโปรเจกต์ / งบ / ระยะเวลาแต่ละสถานะ / รอตัดสินใจ)
import { averageCycle, formatDuration, pendingDecisions, projectHealth, projectSpend, statusDurations } from './executiveMetrics';

const TODAY = '2026-11-21';
const project = (patch = {}) => ({ id: 1, name: 'P', status: 'in_progress', startDate: '2026-11-01', dueDate: '2026-12-31', ...patch });
const task = (patch = {}) => ({ id: Math.random(), projectId: 1, status: 'in_progress', priority: 'medium', dueDate: '2026-12-20', ...patch });

describe('projectHealth', () => {
  it('โปรเจกต์ปิดแล้ว = done', () => {
    expect(projectHealth(project({ status: 'done' }), [], { today: TODAY }).level).toBe('done');
  });
  it('งานทันเวลา = on_track', () => {
    const tasks = [task({ status: 'completed' }), task()];
    expect(projectHealth(project(), tasks, { today: TODAY })).toEqual({ level: 'on_track', reasons: [] });
  });
  it('เลยวันส่งโปรเจกต์ = late', () => {
    expect(projectHealth(project({ dueDate: '2026-11-20' }), [task()], { today: TODAY }).level).toBe('late');
  });
  it('งานความสำคัญสูงเลยกำหนด = late · งานปกติเลยกำหนด = at_risk', () => {
    expect(projectHealth(project(), [task({ priority: 'urgent', dueDate: '2026-11-10' })], { today: TODAY }).level).toBe('late');
    expect(projectHealth(project(), [task({ dueDate: '2026-11-10' })], { today: TODAY }).level).toBe('at_risk');
  });
  it('งานตามหลังเวลาเกิน 15 จุด = at_risk', () => {
    // เวลาผ่านไป ~66% (1 ต.ค. → 31 ธ.ค.) แต่งานเสร็จ 0%
    const health = projectHealth(project({ startDate: '2026-10-01' }), [task(), task()], { today: TODAY });
    expect(health.level).toBe('at_risk');
    expect(health.reasons[0]).toMatch(/เวลาผ่านไป/);
  });
  it('มีงานติดปัญหา หรือใช้งบเกิน 90% = at_risk', () => {
    expect(projectHealth(project(), [task({ blocked: { reason: 'x' } })], { today: TODAY }).level).toBe('at_risk');
    const costs = [{ projectId: 1, month: '2026-11', amount: 95 }];
    expect(projectHealth(project({ plannedBudget: 100 }), [task()], { today: TODAY, costs }).level).toBe('at_risk');
  });
});

describe('projectSpend', () => {
  it('รวมยอดจ่ายเฉพาะโปรเจกต์นั้น', () => {
    const costs = [{ projectId: 1, month: '2026-10', amount: 300 }, { projectId: 1, month: '2026-11', amount: 200 }, { projectId: 2, month: '2026-11', amount: 999 }];
    expect(projectSpend(project({ plannedBudget: 1000 }), costs)).toEqual({ budget: 1000, spent: 500, remaining: 500, percent: 50 });
    expect(projectSpend(project(), costs).percent).toBeNull();
  });
});

describe('statusDurations / averageCycle / formatDuration', () => {
  const H = 3600000;
  const at = (hours) => new Date(Date.UTC(2026, 10, 1) + hours * H).toISOString();
  const finishedTask = {
    statusHistory: [
      { status: 'not_started', at: at(0) },
      { status: 'in_progress', at: at(24) },
      { status: 'pending_review', at: at(72) },
      { status: 'in_progress', at: at(80) }, // ขอแก้
      { status: 'pending_review', at: at(90) },
      { status: 'completed', at: at(96) },
    ],
  };
  it('รวมเวลาแต่ละสถานะทุกรอบ และนับรอบส่งตรวจ', () => {
    const result = statusDurations(finishedTask);
    expect(result.segments).toEqual({ not_started: 24 * H, in_progress: 58 * H, pending_review: 14 * H });
    expect(result.total).toBe(96 * H);
    expect(result.reviewRounds).toBe(2);
    expect(result.finished).toBe(true);
  });
  it('งานที่ยังไม่เสร็จนับสถานะปัจจุบันถึง now', () => {
    const result = statusDurations({ statusHistory: [{ status: 'not_started', at: at(0) }, { status: 'in_progress', at: at(5) }] }, new Date(at(8)));
    expect(result.finished).toBe(false);
    expect(result.currentStatus).toBe('in_progress');
    expect(result.segments.in_progress).toBe(3 * H);
  });
  it('ไม่มีประวัติ = null', () => {
    expect(statusDurations({})).toBeNull();
  });
  it('เฉลี่ยเฉพาะงานที่เสร็จแล้ว', () => {
    const cycle = averageCycle([finishedTask, { statusHistory: [{ status: 'not_started', at: at(0) }] }, {}]);
    expect(cycle).toEqual({ count: 1, total: 96 * H, review: 14 * H });
    expect(averageCycle([]).count).toBe(0);
  });
  it('แสดงเป็น ชม. / วัน', () => {
    expect(formatDuration(30 * 60000)).toBe('ไม่ถึง 1 ชม.');
    expect(formatDuration(5 * H)).toBe('5 ชม.');
    expect(formatDuration(36 * H)).toBe('1.5 วัน');
  });
});

describe('pendingDecisions', () => {
  it('รวมคำขอปิดโปรเจกต์ งานติดปัญหา และงานรอตรวจนานเกิน 3 วัน', () => {
    const now = new Date('2026-11-21T09:00:00Z');
    const items = pendingDecisions(
      [project({ closure: { status: 'pending_approval' } })],
      [
        task({ id: 'b', blocked: { reason: 'รออะไหล่' } }),
        task({ id: 'r-old', status: 'pending_review', reviewSubmittedAt: '2026-11-15T09:00:00Z' }),
        task({ id: 'r-new', status: 'pending_review', reviewSubmittedAt: '2026-11-20T09:00:00Z' }),
        task({ id: 'done', status: 'completed', blocked: { reason: 'old' } }),
      ],
      { now },
    );
    expect(items.map((item) => item.kind)).toEqual(['closure', 'blocked', 'stale_review']);
    expect(items[1].detail).toContain('รออะไหล่');
  });
});
