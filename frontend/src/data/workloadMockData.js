// Mock schedule + planned allocation for Workload Dashboard.
// All schedule and allocation data in this file are frontend-only fixtures.
import { MOCK_EMPLOYEES, MOCK_TASKS, MOCK_PROJECTS, MOCK_WORK_ENTRIES } from './mockData';

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

export function getEmployeeCapacity(employee, startValue, endValue) {
  let totalMinutes = 0;
  const days = [];
  const cursor = parseISODate(startValue);
  const end = parseISODate(endValue);
  while (cursor <= end) {
    const schedule = getEmployeeDaySchedule(employee, cursor);
    totalMinutes += schedule.capacityMinutes;
    days.push(schedule);
    cursor.setDate(cursor.getDate() + 1);
  }
  return { minutes: totalMinutes, hours: totalMinutes / 60, days };
}

const activeProjectIds = new Set(MOCK_PROJECTS.filter((project) => !['done', 'cancelled'].includes(project.status)).map((project) => project.id));
const taskPools = new Map();
MOCK_EMPLOYEES.forEach((employee) => {
  let pool = MOCK_TASKS.filter((task) => task.assigneeId === employee.id && activeProjectIds.has(task.projectId) && task.status !== 'completed');
  if (!pool.length) pool = MOCK_TASKS.filter((task) => task.departmentId === employee.departmentId && activeProjectIds.has(task.projectId) && task.status !== 'completed');
  if (!pool.length) pool = MOCK_TASKS.filter((task) => activeProjectIds.has(task.projectId));
  taskPools.set(employee.id, pool);
});

function createPlannedEntries() {
  const entries = [];
  let sequence = 1;
  // Generate deterministic fixtures across 2026 so all timeframe controls have data.
  const cursor = new Date(2026, 0, 1);
  const finish = new Date(2026, 11, 31);
  while (cursor <= finish) {
    const dateString = toISODate(cursor);
    const dayNumber = Math.floor(cursor.getTime() / 86400000);
    for (let employeeIndex = 0; employeeIndex < MOCK_EMPLOYEES.length; employeeIndex += 1) {
      const employee = MOCK_EMPLOYEES[employeeIndex];
      const schedule = getEmployeeDaySchedule(employee, dateString);
      if (schedule.dayOff || schedule.capacityMinutes <= 0) continue;
      const pool = taskPools.get(employee.id) || [];
      if (!pool.length) continue;

      // Deterministic utilization between roughly 42% and 118%, with a few peaks.
      const loadHash = hashNumber(`${employee.id}-load-${dayNumber}`);
      let utilization = 0.42 + ((loadHash % 66) / 100);
      if (employeeIndex % 9 === 3 && loadHash % 4 === 0) utilization = 1.04 + ((loadHash % 15) / 100);
      const plannedMinutes = Math.round(schedule.capacityMinutes * utilization / 15) * 15;
      const taskCount = plannedMinutes > 300 && loadHash % 3 === 0 ? 2 : 1;
      let remainingMinutes = plannedMinutes;
      for (let taskIndex = 0; taskIndex < taskCount; taskIndex += 1) {
        const task = pool[(dayNumber + employeeIndex * 3 + taskIndex * 5) % pool.length];
        const minutes = taskIndex === taskCount - 1
          ? remainingMinutes
          : Math.round((plannedMinutes * 0.58) / 15) * 15;
        remainingMinutes -= minutes;
        entries.push({
          id: `planned-${String(sequence++).padStart(6, '0')}`,
          employeeId: employee.id,
          taskId: task.id,
          projectId: task.projectId,
          date: dateString,
          hours: Number((minutes / 60).toFixed(2)),
          type: 'planned',
        });
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return entries;
}

// Transform and extend existing MOCK_WORK_ENTRIES as the primary source of truth.
// Preserves 100% of existing employee records, project relationships, and 6,540 original work entries.
function getPlannedWorkEntries() {
  if (Array.isArray(MOCK_WORK_ENTRIES) && MOCK_WORK_ENTRIES.length > 0) {
    return MOCK_WORK_ENTRIES.map((entry) => ({
      ...entry,
      type: entry.type || 'planned',
    }));
  }
  return createPlannedEntries();
}

export const MOCK_PLANNED_WORK_ENTRIES = getPlannedWorkEntries();
