// frontend/src/utils/projectTrackingUtils.test.js — regression for task dueDate safety.
// Confirms that tasks with missing/null/empty dueDate no longer crash the renderer
// (the old code called dueDate.slice(5) / dueDate.replace(...) with no null guard),
// and that valid dueDate values are still formatted identically.
import { ymd, dueDateShort } from './projectTrackingUtils';

describe('task dueDate formatting with missing or invalid dueDate', () => {
  // Confirms the actual crash: the old renderer called .slice(5) / .replace() directly
  // on dueDate, which throws TypeError when dueDate is null or undefined.
  it('reproduces the unsafe access crash on missing dueDate', () => {
    const task = { dueDate: null };
    expect(() => task.dueDate.slice(5)).toThrow(TypeError);
    expect(() => task.dueDate.replace(/-/g, '/')).toThrow(TypeError);
  });

  it('ymd returns a fallback instead of crashing for missing/null/empty dueDate', () => {
    expect(ymd(null)).toBe('-');
    expect(ymd(undefined)).toBe('-');
    expect(ymd('')).toBe('-');
  });

  it('ymd formats a valid dueDate exactly as before', () => {
    expect(ymd('2026-12-15')).toBe('2026/12/15');
    expect(ymd('2026-11-30')).toBe('2026/11/30');
  });

  it('dueDateShort returns a fallback instead of crashing for missing/null/empty dueDate', () => {
    expect(dueDateShort(null)).toBe('—');
    expect(dueDateShort(undefined)).toBe('—');
    expect(dueDateShort('')).toBe('—');
  });

  it('dueDateShort formats a valid dueDate as MM/DD exactly as before', () => {
    expect(dueDateShort('2026-12-15')).toBe('12/15');
    expect(dueDateShort('2026-11-30')).toBe('11/30');
  });
});
