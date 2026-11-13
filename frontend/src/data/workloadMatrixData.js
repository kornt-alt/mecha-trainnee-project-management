// Workload Matrix — 6-month capacity planning fixtures and calculation engine.
// Matrix-only module: does not alter any data consumed by other Dashboard sections.
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

// No project assignments are seeded; workload must come from real records.
export const MOCK_PROJECT_ASSIGNMENTS = [];

const ASSIGNMENT_STATUS_LABELS = {
  confirmed: 'ยืนยันแล้ว',
  in_progress: 'กำลังดำเนินงาน',
  planned: 'วางแผน',
  cancelled: 'ยกเลิก',
};
export function getAssignmentStatusLabel(status) {
  return ASSIGNMENT_STATUS_LABELS[status] || status || '-';
}

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
