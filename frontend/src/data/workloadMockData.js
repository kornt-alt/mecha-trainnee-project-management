// Mock schedule + planned allocation for Workload Dashboard.
// All schedule and allocation data in this file are frontend-only fixtures.
import { MOCK_WORK_ENTRIES } from './mockData';

// ── Approved leave ────────────────────────────────────────────────────────
// Single source of truth for all approved leave records.
// Defined here (lower-level module) so both the Dashboard capacity engine and
// the Matrix capacity engine can share the same data without circular imports.
// hours: 8 = full day, 4 = half day.
export const MOCK_APPROVED_LEAVE = [
  { id: 'lv-01', employeeId: 'emp-002', date: '2026-11-09', hours: 8, reason: 'ลากิจ' },
  { id: 'lv-02', employeeId: 'emp-002', date: '2026-12-14', hours: 4, reason: 'ลากิจ (ครึ่งวัน)' },
  { id: 'lv-03', employeeId: 'emp-005', date: '2026-11-17', hours: 8, reason: 'ลาป่วย' },
  { id: 'lv-04', employeeId: 'emp-009', date: '2027-01-11', hours: 8, reason: 'ลาพักร้อน' },
  { id: 'lv-05', employeeId: 'emp-009', date: '2027-01-12', hours: 8, reason: 'ลาพักร้อน' },
  { id: 'lv-06', employeeId: 'emp-009', date: '2027-01-13', hours: 8, reason: 'ลาพักร้อน' },
  { id: 'lv-07', employeeId: 'emp-009', date: '2027-01-14', hours: 8, reason: 'ลาพักร้อน' },
  { id: 'lv-08', employeeId: 'emp-009', date: '2027-01-15', hours: 8, reason: 'ลาพักร้อน' },
  { id: 'lv-09', employeeId: 'emp-013', date: '2026-12-21', hours: 4, reason: 'ลากิจ (ครึ่งวัน)' },
  { id: 'lv-10', employeeId: 'emp-020', date: '2027-02-08', hours: 8, reason: 'ลาพักร้อน' },
  { id: 'lv-11', employeeId: 'emp-020', date: '2027-02-09', hours: 8, reason: 'ลาพักร้อน' },
  { id: 'lv-32', employeeId: 'emp-024', date: '2027-01-25', hours: 8, reason: 'ลาป่วย' },
];

// Pre-indexed by employeeId for O(1) lookup.
const LEAVE_INDEX = new Map();
MOCK_APPROVED_LEAVE.forEach((leave) => {
  if (!LEAVE_INDEX.has(leave.employeeId)) LEAVE_INDEX.set(leave.employeeId, []);
  LEAVE_INDEX.get(leave.employeeId).push(leave);
});

/** Returns the approved leave records for a given employee. */
export function getEmployeeLeaveDays(employeeId) {
  return LEAVE_INDEX.get(employeeId) || [];
}

export const STANDARD_SHIFT = {
  start: '08:00',
  end: '17:00',
  breakMinutes: 80,
};

export const SHORT_SHIFT = {
  start: '08:00',
  end: '15:00',
  breakMinutes: 80,
};

export function getWorkloadPeriodRange(period, reference) {
  const date = parseISODate(reference);
  if (period === 'daily') return { start: reference, end: reference };
  if (period === 'weekly') {
    const start = getWeekStart(date);
    return { start: toISODate(start), end: toISODate(addDays(start, 6)) };
  }
  if (period === 'monthly') {
    return {
      start: toISODate(new Date(date.getFullYear(), date.getMonth(), 1)),
      end: toISODate(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
    };
  }
  return { start: `${date.getFullYear()}-01-01`, end: `${date.getFullYear()}-12-31` };
}

export function computeEmployeeWorkloadData(employees, entries, range, projectFilter = 'all') {
  const safeEmployees = Array.isArray(employees) ? employees : [];
  const safeEntries = Array.isArray(entries) ? entries : [];

  const filteredEntries = safeEntries.filter((entry) => (
    entry &&
    entry.date >= range.start &&
    entry.date <= range.end &&
    (projectFilter === 'all' || String(entry.projectId) === projectFilter)
  ));

  const byEmployee = safeEmployees.map((employee) => {
    const capacity = getEmployeeCapacity(employee, range.start, range.end) || { hours: 0, minutes: 0, days: [] };
    const ownEntries = filteredEntries.filter((entry) => entry && entry.employeeId === employee.id);
    const planned = ownEntries.reduce((sum, entry) => sum + Number(entry.hours || 0), 0);
    const percent = capacity.hours > 0 ? (planned / capacity.hours) * 100 : 0;
    return {
      ...employee,
      capacityHours: capacity.hours,
      capacityMinutes: capacity.minutes,
      plannedHours: planned,
      percent,
      entries: ownEntries,
      schedules: capacity.days || [],
    };
  }).sort((a, b) => b.percent - a.percent || (a.name || '').localeCompare(b.name || '', 'en'));

  const capacityHours = byEmployee.reduce((sum, e) => sum + (e.capacityHours || 0), 0);
  const plannedHours = byEmployee.reduce((sum, e) => sum + (e.plannedHours || 0), 0);

  return {
    employees: byEmployee,
    capacityHours,
    plannedHours,
    utilization: capacityHours ? (plannedHours / capacityHours) * 100 : 0,
    overCapacity: byEmployee.filter((e) => e.percent > 100).length,
    entries: filteredEntries,
  };
}

export function toISODate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function parseISODate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(value, amount) {
  const date = typeof value === 'string' ? parseISODate(value) : new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
}

export function getWeekStart(value) {
  const date = typeof value === 'string' ? parseISODate(value) : new Date(value);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  return date;
}

export function getISOWeekNumber(value) {
  const date = typeof value === 'string' ? parseISODate(value) : new Date(value);
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
}

// Company-wide weekend pattern changes by week: odd ISO weeks = Sat/Sun off;
// even ISO weeks = Sunday off (Saturday is a working day).
export function getWeekSchedulePattern(value) {
  return getISOWeekNumber(value) % 2 === 0 ? 'sunday-only' : 'weekend';
}

function hashNumber(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) hash = (hash * 31 + input.charCodeAt(i)) % 10007;
  return hash;
}

export function getEmployeeDaySchedule(employee, dateValue) {
  const date = typeof dateValue === 'string' ? parseISODate(dateValue) : new Date(dateValue);
  const day = date.getDay();
  const pattern = getWeekSchedulePattern(date);
  const isDayOff = day === 0 || (day === 6 && pattern === 'weekend');
  if (isDayOff) {
    return { date: toISODate(date), dayOff: true, start: null, end: null, breakMinutes: 0, capacityMinutes: 0, capacityHours: 0, shiftType: 'off', weekPattern: pattern };
  }

  const dayIndex = Math.floor(date.getTime() / 86400000);
  // A small minority choose the 08:00–15:00 shift on selected days only.
  const shortShift = hashNumber(`${employee.id}-${dayIndex}`) % 17 === 0;
  const shift = shortShift ? SHORT_SHIFT : STANDARD_SHIFT;
  const [startHour, startMinute] = shift.start.split(':').map(Number);
  const [endHour, endMinute] = shift.end.split(':').map(Number);
  const grossMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
  const capacityMinutes = Math.max(0, grossMinutes - shift.breakMinutes);
  return {
    date: toISODate(date),
    dayOff: false,
    start: shift.start,
    end: shift.end,
    breakMinutes: shift.breakMinutes,
    capacityMinutes,
    capacityHours: capacityMinutes / 60,
    shiftType: shortShift ? 'short' : 'standard',
    weekPattern: pattern,
  };
}

// getEmployeeCapacity: Actual capacity for a date range.
//
// Calculates net working hours by:
//   1. Iterating every calendar day in the range.
//   2. Applying the employee's shift schedule (Standard 7h40m or Short 5h40m).
//   3. Excluding weekend non-working days (via getEmployeeDaySchedule).
//   4. Deducting approved leave hours on matching dates.
//
// Public holidays are NOT deducted until the Calendar system is configured.
// The 'days' array is passed through for Schedule Overview and Daily Team Load.
export function getEmployeeCapacity(employee, startValue, endValue) {
  const leaveDays = getEmployeeLeaveDays(employee.id);
  const leaveByDate = new Map(leaveDays.map((leave) => [leave.date, leave]));

  let totalMinutes = 0;
  const days = [];
  const cursor = parseISODate(startValue);
  const end = parseISODate(endValue);
  while (cursor <= end) {
    const schedule = getEmployeeDaySchedule(employee, cursor);
    if (!schedule.dayOff && schedule.capacityMinutes > 0) {
      const iso = toISODate(cursor);
      const leave = leaveByDate.get(iso);
      if (leave) {
        // Deduct leave hours (capped at the day's net capacity to avoid negatives).
        const leaveMinutes = Math.min(Number(leave.hours) * 60 || 0, schedule.capacityMinutes);
        const netMinutes = schedule.capacityMinutes - leaveMinutes;
        totalMinutes += netMinutes;
        days.push({
          ...schedule,
          capacityMinutes: netMinutes,
          capacityHours: netMinutes / 60,
          leaveHours: Number(leave.hours) || 0,
        });
      } else {
        totalMinutes += schedule.capacityMinutes;
        days.push(schedule);
      }
    } else {
      days.push(schedule);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return { minutes: totalMinutes, hours: totalMinutes / 60, days };
}

// Workload has no allocations until real Task and work-hour records exist.
export const MOCK_PLANNED_WORK_ENTRIES = MOCK_WORK_ENTRIES.map((entry) => ({
  ...entry,
  type: entry.type || 'planned',
}));

/**
 * Filters employee records by Section (departmentId), Sub-section (position), and search query.
 * Pure helper shared between Dashboard (Workload.js) and Matrix (WorkloadMatrix.js).
 */
export function filterEmployees(employees, { department = 'all', position = 'all', search = '' } = {}) {
  if (!Array.isArray(employees)) return [];
  const searchLower = (search || '').trim().toLowerCase();
  return employees.filter((employee) => {
    const matchesDepartment = department === 'all' || employee.departmentId === department;
    const matchesPosition = position === 'all' || employee.position === position;
    const searchTarget = `${employee.name || ''} ${employee.id || ''} ${employee.position || ''} ${employee.department || ''} ${employee.email || ''} ${employee.nickname || ''}`.toLowerCase();
    const matchesSearch = !searchLower || searchTarget.includes(searchLower);
    return matchesDepartment && matchesPosition && matchesSearch;
  });
}

