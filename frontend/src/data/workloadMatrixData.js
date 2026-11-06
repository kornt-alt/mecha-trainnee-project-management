// Workload Matrix — 6-month capacity planning fixtures and calculation engine.
// Matrix-only module: does not alter any data consumed by other Dashboard sections.
import { MOCK_EMPLOYEES, MOCK_PROJECTS, MOCK_TASKS } from './mockData';
import {
  getEmployeeDaySchedule,
  MOCK_APPROVED_LEAVE,
  toISODate,
  parseISODate,
} from './workloadMockData';

// ── Standard reference capacity ──────────────────────────────────────────
export const STANDARD_CAP_MO = 165; // reference hours per month, not a fixed capacity

// ── Public holidays ───────────────────────────────────────────────────────
// Holiday data is intentionally kept as an empty set until the Calendar
// system is fully configured with authoritative holiday data.
// When the Calendar is ready, populate MOCK_HOLIDAYS with confirmed dates.
// Capacity deductions for holidays will then apply automatically.
export const MOCK_HOLIDAYS = [];
// eslint-disable-next-line no-unused-vars
const HOLIDAY_SET = new Set(MOCK_HOLIDAYS);

// Re-export approved leave from the shared source of truth so external consumers
// (e.g. the drilldown modal) can still import it from this module if needed.
export { MOCK_APPROVED_LEAVE };

// Pre-index leave by employee for O(1) lookup within this module.
const LEAVE_BY_EMPLOYEE = new Map();
MOCK_APPROVED_LEAVE.forEach((leave) => {
  if (!LEAVE_BY_EMPLOYEE.has(leave.employeeId)) LEAVE_BY_EMPLOYEE.set(leave.employeeId, []);
  LEAVE_BY_EMPLOYEE.get(leave.employeeId).push(leave);
});

// ── Capacity engine ──────────────────────────────────────────────────────
// Actual capacity = employee working schedule minus approved leave.
// Weekly non-working days (weekends per company pattern) are already excluded
// by getEmployeeDaySchedule. Public holidays are NOT deducted until the
// Calendar system is fully configured; MOCK_HOLIDAYS is kept empty for now.
export function getEmployeeMonthlyCapacity(employee, year, month) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const leaveDays = LEAVE_BY_EMPLOYEE.get(employee.id) || [];
  const leaveByDate = new Map(leaveDays.map((leave) => [leave.date, leave]));

  let baseHours = 0;
  let leaveHours = 0;
  let workingDays = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const iso = toISODate(cursor);
    const schedule = getEmployeeDaySchedule(employee, iso);
    if (!schedule.dayOff && schedule.capacityHours > 0) {
      const leave = leaveByDate.get(iso);
      if (leave) {
        leaveHours += Math.min(Number(leave.hours) || 0, schedule.capacityHours);
      } else {
        workingDays += 1;
      }
      baseHours += schedule.capacityHours;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  const actualHours = Math.max(0, baseHours - leaveHours);
  return {
    year,
    month, // 0-based
    standardHours: STANDARD_CAP_MO,
    baseScheduleHours: Number(baseHours.toFixed(2)),
    // holidayHours kept for forward-compatibility when Calendar integration is added
    holidayHours: 0,
    leaveHours: Number(leaveHours.toFixed(2)),
    actualHours: Number(actualHours.toFixed(2)),
    workingDays,
  };
}

// ── Project assignments (Matrix-specific fixtures) ───────────────────────
// Traceable to existing employees and projects. Two allocation styles:
//  - monthlyAllocations: exact hours per YYYY-MM (authoritative).
//  - totalPlannedHours + date range: distributed across months in proportion
//    to the employee's working days in each overlapping month (documented method).
const ASSIGNMENT_STATUS_LABELS = {
  confirmed: 'ยืนยันแล้ว',
  in_progress: 'กำลังดำเนินงาน',
  planned: 'วางแผน',
  cancelled: 'ยกเลิก',
};
export function getAssignmentStatusLabel(status) {
  return ASSIGNMENT_STATUS_LABELS[status] || status || '-';
}

function hash(input) {
  let value = 0;
  for (let i = 0; i < input.length; i += 1) value = (value * 31 + input.charCodeAt(i)) % 99991;
  return value;
}

function buildAssignments() {
  const assignments = [];
  const projectById = new Map(MOCK_PROJECTS.map((project) => [project.id, project]));

  // Per-employee monthly load profile for OCT 2026 → MAR 2027 (deterministic,
  // designed to exercise every status scenario: available, near, over, exact 100%, N/A).
  // Values are target utilization per month index (0=Oct26 … 5=Mar27); null = unassigned.
  const profiles = {
    'emp-001': [0.55, 0.62, 0.58, 0.70, 0.64, 0.60],
    'emp-002': [0.96, 1.06, 0.88, 0.74, 0.80, 0.85],
    'emp-003': [0.78, 0.85, 0.92, 0.83, 0.71, 0.68],
    'emp-004': [0.48, 0.55, 0.50, 0.62, 0.58, 0.53],
    'emp-005': [0.68, 1.12, 0.95, 0.88, 0.76, 0.72],
    'emp-006': [0.86, 0.94, 1.00, 0.90, 0.84, 0.78],
    'emp-007': [1.08, 0.97, 0.85, 0.92, 1.02, 0.88],
    'emp-008': [0.60, 0.66, 0.72, 0.58, 0.64, 0.60],
    'emp-009': [0.92, 0.88, 0.84, 1.15, 0.90, 0.82],
    'emp-010': [0.74, 0.80, 0.86, 0.78, 0.70, 0.66],
    'emp-011': [0.58, 0.64, 0.70, 0.62, 0.55, 0.60],
    'emp-012': [0.44, 0.50, 0.46, 0.55, 0.48, 0.52],
    'emp-013': [1.02, 0.95, 1.10, 0.96, 0.88, 0.92],
    'emp-014': [0.70, 0.76, 0.68, 0.74, 0.66, 0.72],
    'emp-015': [0.88, 0.94, 0.99, 0.86, 0.80, 0.84],
    'emp-016': [0.52, 0.58, 0.00, 0.00, 0.48, 0.54], // Feb 2027 on full-month leave → N/A
    'emp-017': [0.63, 0.69, 0.75, 0.67, 0.61, 0.65],
    'emp-018': [0.98, 1.04, 0.91, 0.87, 0.94, 1.00],
    'emp-019': [0.56, 0.62, 0.57, 0.65, 0.59, 0.63],
    'emp-020': [0.84, 0.90, 0.96, 1.05, 0.82, 0.78],
    'emp-021': [0.73, 0.79, 0.71, 0.77, 0.69, 0.74],
    'emp-022': [0.94, 1.00, 0.89, 0.93, 0.85, 0.90],
    'emp-023': [0.80, 0.87, 0.83, 0.76, 0.72, 0.78],
    'emp-024': [0.62, 0.68, 0.60, 0.66, 0.58, 0.64],
    'emp-025': [0.99, 1.08, 0.93, 0.97, 0.89, 0.95],
    'emp-026': [0.77, 0.83, 0.79, 0.72, 0.68, 0.74],
    'emp-027': [0.51, 0.57, 0.53, 0.60, 0.49, 0.55],
    'emp-028': [0.91, 0.97, 1.03, 0.94, 0.86, 0.92],
    'emp-029': [0.67, 0.73, 0.69, 0.75, 0.63, 0.70],
    'emp-030': [1.00, 1.10, 0.98, 1.02, 0.92, 0.96],
    'emp-031': [0.35, 0.40, 0.38, 0.44, 0.36, 0.42],
    'emp-032': [1.18, 1.24, 1.12, 1.08, 1.15, 1.10],
  };

  const MONTH_START = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((offset) => new Date(2026, 9 + offset, 1));
  const horizonMonths = MONTH_START.length;

  MOCK_EMPLOYEES.forEach((employee) => {
    const profile = profiles[employee.id] || [0.7, 0.7, 0.7, 0.7, 0.7, 0.7];
    const pool = MOCK_TASKS.filter(
      (task) => task.assigneeId === employee.id && projectById.has(task.projectId) && projectById.get(task.projectId).status !== 'cancelled',
    );
    const fallbackPool = MOCK_TASKS.filter((task) => projectById.has(task.projectId) && projectById.get(task.projectId).status !== 'cancelled');
    const usable = pool.length ? pool : fallbackPool;

    for (let monthIndex = 0; monthIndex < horizonMonths; monthIndex += 1) {
      // Designed scenario profile for the first 6 months; deterministic
      // 40–115% utilization for the remaining forecast horizon.
      const targetUtilization = monthIndex < profile.length
        ? profile[monthIndex]
        : 0.4 + (hash(`${employee.id}-ext-${monthIndex}`) % 76) / 100;
      if (!targetUtilization || !usable.length) continue;
      const capacity = getEmployeeMonthlyCapacity(employee, MONTH_START[monthIndex].getFullYear(), MONTH_START[monthIndex].getMonth());
      if (capacity.actualHours <= 0) continue; // month fully on leave — nothing to assign
      const monthKey = `${MONTH_START[monthIndex].getFullYear()}-${String(MONTH_START[monthIndex].getMonth() + 1).padStart(2, '0')}`;

      // Split the monthly load across 1–2 projects (deterministic rotation).
      const splitIntoTwo = hash(`${employee.id}-${monthKey}`) % 3 === 0 && usable.length > 1;
      const parts = splitIntoTwo ? [0.6, 0.4] : [1];
      let taskCursor = hash(employee.id) + monthIndex * 2;
      parts.forEach((share) => {
        const task = usable[taskCursor % usable.length];
        taskCursor += 3;
        const hours = Math.round(((capacity.actualHours * targetUtilization * share) / 4) * 4);
        if (hours <= 0) return;
        const monthStart = MONTH_START[monthIndex];
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
        // Vary assignment status across the forecast horizon.
        const statusRoll = hash(`${employee.id}-status-${monthKey}`) % 10;
        const status = monthIndex === 0
          ? (statusRoll < 6 ? 'in_progress' : 'confirmed')
          : monthIndex === 1
            ? (statusRoll < 5 ? 'confirmed' : 'planned')
            : (statusRoll < 1 ? 'cancelled' : 'planned');
        const rangeStart = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1 + (hash(`${employee.id}-s-${monthKey}`) % 5));
        const rangeEnd = new Date(monthEnd.getFullYear(), monthEnd.getMonth(), Math.max(rangeStart.getDate() + 9, monthEnd.getDate() - (hash(`${employee.id}-e-${monthKey}`) % 6)));
        assignments.push({
          id: `asg-${String(assignments.length + 1).padStart(4, "0")}`,
          employeeId: employee.id,
          projectId: task.projectId,
          taskId: task.id,
          status,
          startDate: toISODate(rangeStart),
          endDate: toISODate(rangeEnd),
          allocationType: 'monthly',
          monthlyAllocations: { [monthKey]: hours },
          totalPlannedHours: hours,
        });
      });
    }

    // One multi-month "total hours" assignment per employee (spans Nov 2026 → Jan 2027),
    // demonstrating the working-day-proportional allocation method.
    if (usable.length) {
      const task = usable[(hash(`${employee.id}-multi`)) % usable.length];
      if (projectById.get(task.projectId)?.status !== 'cancelled') {
        assignments.push({
          id: `asg-${String(assignments.length + 1).padStart(4, "0")}`,
          employeeId: employee.id,
          projectId: task.projectId,
          taskId: task.id,
          status: 'confirmed',
          startDate: '2026-11-01',
          endDate: '2027-01-31',
          allocationType: 'total',
          monthlyAllocations: null,
          totalPlannedHours: 60,
        });
      }
    }
  });

  return assignments;
}

export const MOCK_PROJECT_ASSIGNMENTS = buildAssignments();

// ── Planned hours allocation ─────────────────────────────────────────────
// Counts actual working days (non-weekend, non-leave) between two ISO dates.
// HOLIDAY_SET is intentionally empty until Calendar integration is complete,
// so !isHoliday is always true for now — the check remains for forward-compat.
function getWorkingDaysBetween(employee, startISO, endISO) {
  let days = 0;
  const cursor = parseISODate(startISO);
  const end = parseISODate(endISO);
  while (cursor <= end) {
    const iso = toISODate(cursor);
    const schedule = getEmployeeDaySchedule(employee, iso);
    const isHoliday = HOLIDAY_SET.has(iso);
    const onLeave = (LEAVE_BY_EMPLOYEE.get(employee.id) || []).some((leave) => leave.date === iso);
    if (!schedule.dayOff && schedule.capacityHours > 0 && !isHoliday && !onLeave) days += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

// Hours from one assignment credited to a specific month (year: number, month: 0-based).
//
// FIX (Phase 1): For 'total'-type assignments the denominator is now the
// TOTAL working days across the ENTIRE assignment range, not the working days
// in the individual month. This ensures the sum of hours across all months
// never exceeds assignment.totalPlannedHours.
//
// Before fix: ratio = overlapWorkingDays / monthWorkingDays  → duplicates hours
// After fix:  ratio = overlapWorkingDays / totalAssignmentWorkingDays  → correct
export function getAssignmentHoursInMonth(assignment, employee, year, month) {
  if (!assignment || assignment.status === 'cancelled') return 0;
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  if (assignment.allocationType === 'monthly' && assignment.monthlyAllocations) {
    return Number(assignment.monthlyAllocations[monthKey]) || 0;
  }

  // Total-hours assignment: distribute proportionally by working-day overlap.
  const rangeStart = assignment.startDate;
  const rangeEnd = assignment.endDate || rangeStart;
  const monthStart = toISODate(new Date(year, month, 1));
  const monthEnd = toISODate(new Date(year, month + 1, 0));
  const overlapStart = rangeStart > monthStart ? rangeStart : monthStart;
  const overlapEnd = rangeEnd < monthEnd ? rangeEnd : monthEnd;
  if (!overlapStart || !overlapEnd || overlapStart > overlapEnd) return 0;

  // Denominator = total working days across the FULL assignment range.
  const totalAssignmentWorkingDays = getWorkingDaysBetween(employee, rangeStart, rangeEnd);
  if (!totalAssignmentWorkingDays) return 0;

  const overlapWorkingDays = getWorkingDaysBetween(employee, overlapStart, overlapEnd);
  if (!overlapWorkingDays) return 0;

  const total = Number(assignment.totalPlannedHours) || 0;
  if (total <= 0) return 0;

  // Final overlapping month check: absorb rounding residuals so the sum of
  // all monthly allocations equals totalPlannedHours exactly without exceeding it.
  const isFinalMonth = rangeEnd <= monthEnd;
  if (isFinalMonth) {
    let allocatedPrior = 0;
    const startDt = parseISODate(rangeStart);
    let curYear = startDt.getFullYear();
    let curMonth = startDt.getMonth();

    while (curYear < year || (curYear === year && curMonth < month)) {
      const curMonthStart = toISODate(new Date(curYear, curMonth, 1));
      const curMonthEnd = toISODate(new Date(curYear, curMonth + 1, 0));
      const oStart = rangeStart > curMonthStart ? rangeStart : curMonthStart;
      const oEnd = rangeEnd < curMonthEnd ? rangeEnd : curMonthEnd;

      if (oStart <= oEnd) {
        const oDays = getWorkingDaysBetween(employee, oStart, oEnd);
        if (oDays > 0) {
          const mHours = Number(((total * oDays) / totalAssignmentWorkingDays).toFixed(2));
          allocatedPrior += mHours;
        }
      }

      curMonth += 1;
      if (curMonth > 11) {
        curMonth = 0;
        curYear += 1;
      }
    }

    const remaining = Number((total - allocatedPrior).toFixed(2));
    return Math.max(0, remaining);
  }

  return Number(((total * overlapWorkingDays) / totalAssignmentWorkingDays).toFixed(2));
}

// ── Workload status thresholds (exact) ───────────────────────────────────
export function getWorkloadStatus(utilizationPercent, capacityHours) {
  if (!capacityHours || capacityHours <= 0) return 'na';
  if (utilizationPercent >= 100) return 'over';
  if (utilizationPercent >= 90) return 'near';
  return 'available';
}

export const WORKLOAD_STATUS_META = {
  available: { label: 'Available', th: 'ว่าง', className: 'is-available' },
  near: { label: 'Near Capacity', th: 'ใกล้เต็ม', className: 'is-near' },
  over: { label: 'Overcapacity', th: 'เกินกำลัง', className: 'is-over' },
  na: { label: 'N/A', th: 'ไม่มีข้อมูล', className: 'is-na' },
};

// ── Row calculation for one employee across the 6-month window ───────────
export function computeEmployeeMatrixRow(employee, months, assignments, projectFilter = 'all', assignmentsOverride = null) {
  const safeAssignments = assignmentsOverride || assignments;
  const ownAssignments = safeAssignments.filter(
    (assignment) => assignment
      && assignment.employeeId === employee.id
      && assignment.status !== 'cancelled'
      && (projectFilter === 'all' || String(assignment.projectId) === projectFilter),
  );

  const cells = months.map(({ year, month, key }) => {
    const capacity = getEmployeeMonthlyCapacity(employee, year, month);
    const contributing = ownAssignments
      .map((assignment) => {
        const hours = getAssignmentHoursInMonth(assignment, employee, year, month);
        return { assignment, hours };
      })
      .filter((item) => item.hours > 0);
    const planned = Number(contributing.reduce((sum, item) => sum + item.hours, 0).toFixed(2));
    const available = Number((capacity.actualHours - planned).toFixed(2));
    const utilization = capacity.actualHours > 0 ? (planned / capacity.actualHours) * 100 : null;
    return {
      key,
      year,
      month,
      capacityHours: capacity.actualHours,
      capacity,
      plannedHours: planned,
      availableHours: available,
      utilization,
      status: getWorkloadStatus(utilization, capacity.actualHours),
      contributing,
    };
  });

  return { employee, cells };
}

export function buildMatrixMonths(startYear, startMonth) {
  return Array.from({ length: 6 }, (_, offset) => {
    const date = new Date(startYear, startMonth + offset, 1);
    return {
      year: date.getFullYear(),
      month: date.getMonth(),
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
    };
  });
}
