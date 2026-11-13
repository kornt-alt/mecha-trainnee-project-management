// frontend/src/data/mockData.js — ข้อมูลจำลองระบบ MECHA Project Management (Single Source of Truth)
// ⚠️ ทุก Entity ถูกนิยามครั้งเดียวและเชื่อมโยงกันด้วย stable ID
// ข้อมูลปฏิบัติงานเริ่มว่าง; Project ด้านล่างใช้แสดงหน้าจอเท่านั้น

// ── 1. ผู้ใช้งานปัจจุบัน (Current User) ─────────────────────────────────
export const CURRENT_USER = {
  id: 'usr-001',
  employeeId: 'emp-001',
  name: 'Kittipat',
  fullName: 'Kittipat Samran',
  title: 'Mecha Trainee Engineer',
  departmentId: 'dept-1',
  department: 'Mechanical Automation & Software',
  email: 'kittipat.s@mecha.local',
  notificationsCount: 0,
};

// ── 2. การแจ้งเตือน (Notifications) ─────────────────────────────────────
export const NOTIFICATIONS = [];

// ── 3. แผนก (Departments) ───────────────────────────────────────────────
export const MOCK_DEPARTMENTS = [
  { id: 'dept-1', name: 'Mechanical Automation & Software', code: 'MAS' },
  { id: 'dept-2', name: 'Electrical & Control', code: 'EC' },
  { id: 'dept-3', name: 'Mechanical', code: 'MECH' },
  { id: 'dept-4', name: 'Quality Assurance', code: 'QA' },
  { id: 'dept-5', name: 'Documentation & Training', code: 'DOC' },
];

// ── 4. พนักงาน (Employees) ───────────────────────────────────────────────
// คงพนักงานเดิม 20 คนและข้อมูลทุกฟิลด์ไว้
export const MOCK_EMPLOYEES = [
  // IT department (7 employees: 5 regular, 2 trainees)
  { id: 'emp-001', name: 'Kittipat Samran', departmentId: 'dept-1', department: 'Mechanical Automation & Software', position: 'Trainee', email: 'kittipat.s@mecha.local' },
  { id: 'emp-002', name: 'Napat Chaiyaphon', departmentId: 'dept-1', department: 'Mechanical Automation & Software', position: 'Software Developer', email: 'napat.c@mecha.local' },
  { id: 'emp-003', name: 'Sarin Numnonda', departmentId: 'dept-1', department: 'Mechanical Automation & Software', position: 'Frontend Developer', email: 'sarin.n@mecha.local' },
  { id: 'emp-008', name: 'Supachai Meesuk', departmentId: 'dept-1', department: 'Mechanical Automation & Software', position: 'Supervisor', email: 'supachai.m@mecha.local' },
  { id: 'emp-009', name: 'Korn Tawonphon', departmentId: 'dept-1', department: 'Mechanical Automation & Software', position: 'Senior Developer', email: 'korn.t@mecha.local' },
  { id: 'emp-015', name: 'Nattapong Vejjakiva', departmentId: 'dept-1', department: 'Mechanical Automation & Software', position: 'Trainee', email: 'nattapong.v@mecha.local' },
  { id: 'emp-020', name: 'Thitikan Bunserm', departmentId: 'dept-1', department: 'Mechanical Automation & Software', position: 'Full-stack Developer', email: 'thitikan.b@mecha.local' },

  // AI department (7 regular employees)
  { id: 'emp-005', name: 'Thanakorn Wiset', departmentId: 'dept-3', department: 'Mechanical', position: 'Mechanical Engineer', email: 'thanakorn.w@mecha.local' },
  { id: 'emp-011', name: 'Jirayu Phuangmalai', departmentId: 'dept-3', department: 'Mechanical', position: 'Mechanical Technician', email: 'jirayu.p@mecha.local' },
  { id: 'emp-017', name: 'Prapat Suriyawong', departmentId: 'dept-3', department: 'Mechanical', position: 'CAD Designer', email: 'prapat.s@mecha.local' },
  { id: 'emp-021', name: 'Ekkachai Rompho', departmentId: 'dept-3', department: 'Mechanical', position: 'Maintenance Engineer', email: 'ekkachai.r@mecha.local' },
  { id: 'emp-026', name: 'Goragod Wannasiri', departmentId: 'dept-3', department: 'Mechanical', position: 'Mechanical Engineer', email: 'goragod.w@mecha.local' },
  { id: 'emp-032', name: 'Sarawut Phutthinat', departmentId: 'dept-3', department: 'Mechanical', position: 'Mechanical Technician', email: 'sarawut.p@mecha.local' },
  { id: 'emp-033', name: 'New AI Engineer', departmentId: 'dept-3', department: 'Mechanical', position: 'Software Engineer', email: 'newai@mecha.local' },

  // Electrical department (6 employees: 3 regular, 3 trainees)
  { id: 'emp-007', name: 'Wichai Prasertkul', departmentId: 'dept-2', department: 'Electrical & Control', position: 'Control Engineer', email: 'wichai.p@mecha.local' },
  { id: 'emp-013', name: 'Bodin Kittikorn', departmentId: 'dept-2', department: 'Electrical & Control', position: 'Electrical Engineer', email: 'bodin.k@mecha.local' },
  { id: 'emp-028', name: 'Veerapat Chokchai', departmentId: 'dept-2', department: 'Electrical & Control', position: 'Automation Engineer', email: 'veerapat.c@mecha.local' },
  { id: 'emp-019', name: 'Rattanakorn Phusit', departmentId: 'dept-2', department: 'Electrical & Control', position: 'Trainee', email: 'rattanakorn.p@mecha.local' },
  { id: 'emp-024', name: 'Phumin Jareonsuk', departmentId: 'dept-2', department: 'Electrical & Control', position: 'Trainee', email: 'phumin.j@mecha.local' },
  { id: 'emp-034', name: 'New Electrical Trainee', departmentId: 'dept-2', department: 'Electrical & Control', position: 'Trainee', email: 'newelectra@mecha.local' },
];

// ── 5. ข้อมูลโปรเจกต์ดิบ (Raw Projects) ──────────────────────────────────
// 3 โปรเจกต์เดิมสำหรับแสดง UI โดยไม่มีข้อมูลปฏิบัติงานตั้งต้น
const RAW_PROJECTS = [
  {
    id: 1,
    name: 'ระบบจัดการและติดตามงาน Trainee',
    category: 'ระบบซอฟต์แวร์',
    departmentId: 'dept-1',
    managerId: 'emp-008',
    owner: 'Kittipat / Supachai',
    status: 'in_progress',
    plannedBudget: 180000,
    startDate: '2026-10-01',
    dueDate: '2026-11-15',
    description: 'ระบบ Dashboard และติดตามงานที่ได้รับมอบหมายสำหรับ Mecha Trainee',
  },
  {
    id: 3,
    name: 'รายงานผลการฝึกงาน Mecha',
    category: 'เอกสารและการฝึกอบรม',
    departmentId: 'dept-5',
    managerId: 'emp-008',
    owner: 'Kittipat / Supachai',
    status: 'planning',
    plannedBudget: 45000,
    startDate: '2026-11-01',
    dueDate: '2026-11-30',
    description: 'เอกสารและระบบรวบรวมรายงานสรุปผลการฝึกงาน',
  },
  {
    id: 5,
    name: 'เว็บไซต์องค์กร Mecha 2026',
    category: 'ระบบองค์กร',
    departmentId: 'dept-1',
    managerId: 'emp-008',
    owner: 'Lalita / Kittipat',
    status: 'on_hold',
    plannedBudget: 90000,
    startDate: '2026-09-01',
    dueDate: '2026-11-15',
    description: 'เว็บไซต์แนะนำองค์กรและบริการ พร้อมระบบจัดการเนื้อหา',
  },
];
// ไม่มี Task ตั้งต้น; ผู้ใช้สร้างงานผ่านหน้าเว็บ
const RAW_TASKS = [];

// เชื่อมโยง projectName ให้ Tasks อัตโนมัติจาก RAW_PROJECTS (ป้องกันความขัดแย้งของชื่อ)
const projectLookup = new Map(RAW_PROJECTS.map((p) => [p.id, p]));
export const MOCK_TASKS = RAW_TASKS.map((t) => {
  const p = projectLookup.get(t.projectId);
  return {
    ...t,
    projectName: p ? p.name : '',
  };
});

// ── 7. โปรเจกต์ที่คำนวณสถิติจาก Tasks (Projects with Calculated Metrics) ──
// สูตร metrics อยู่ที่เดียว (calculateProjectMetrics) เพื่อให้ MockDataContext sync ตอน task เปลี่ยน
// ได้ผลสูตรเดียวกับ dataset เริ่มต้น — กันนิยามซ้ำขัดแย้งกัน
export function calculateProjectMetrics(project, relatedTasks) {
  const totalTasks = relatedTasks.length;
  const completedTasks = relatedTasks.filter((t) => t.status === 'completed').length;
  const unfinishedTasks = totalTasks - completedTasks;
  // progress = ค่าเฉลี่ย progress ของ task ทั้งหมด (โปรเจกต์ done แต่ไม่มี task ให้ถือ 100% ตามของเดิม)
  const progress = totalTasks > 0
    ? Math.round(relatedTasks.reduce((sum, t) => sum + (t.progress || 0), 0) / totalTasks)
    : (project.status === 'done' ? 100 : 0);

  return {
    ...project,
    totalTasks,
    completedTasks,
    unfinishedTasks,
    progress,
  };
}

// คำนวณ metrics ใหม่เฉพาะโปรเจกต์ที่ระบุ จากชุด tasks ล่าสุด (immutable) —
// โปรเจกต์ที่ไม่เกี่ยวข้องเก็บ object เดิมไว้ ไม่ render ใหม่โดยไม่จำเป็น
export function syncProjectsWithTasks(prevProjects, nextTasks, projectIds) {
  const ids = new Set(projectIds.map(Number).filter((n) => Number.isFinite(n)));
  return prevProjects.map((p) => (
    ids.has(Number(p.id))
      ? calculateProjectMetrics(p, nextTasks.filter((t) => Number(t.projectId) === Number(p.id)))
      : p
  ));
}

// Core รวมอัปเดต task + metrics โปรเจกต์ให้เหลื่อมกันเสมอ (pure) —
// Provider แค่วาง setState ผลลัพธ์; คำนวณจาก collection ตรง ๆ ไม่ increment นับเอง
export function applyTaskSync(prev, mutateTasks, projectIds) {
  const nextTasks = mutateTasks(prev.tasks);
  const nextProjects = Array.isArray(projectIds) && projectIds.length > 0
    ? syncProjectsWithTasks(prev.projects, nextTasks, projectIds)
    : prev.projects;
  return { tasks: nextTasks, projects: nextProjects };
}

export const MOCK_PROJECTS = RAW_PROJECTS.map((p) =>
  calculateProjectMetrics(p, MOCK_TASKS.filter((t) => t.projectId === p.id))
);

// Alias เพื่อความเข้ากันได้ 100% กับโค้ดเดิมที่เรียก MOCK_PROJECTS_FALLBACK
export const MOCK_PROJECTS_FALLBACK = MOCK_PROJECTS;

// ── 8. กิจกรรมล่าสุด (Recent Activities) ──────────────────────────────────
export const MOCK_ACTIVITIES = [];

// Workload starts without planned entries or employee/task assignments.
export const MOCK_WORK_ENTRIES = [];

// ── 10. ฟังก์ชันช่วยค้นหาและคำนวณ (Helper Utilities) ─────────────────────

/** ค้นหางานทั้งหมดของโปรเจกต์ */
export function getProjectTasks(projectId) {
  return MOCK_TASKS.filter((t) => t.projectId === Number(projectId));
}

/** ค้นหางานทั้งหมดของพนักงาน */
export function getEmployeeTasks(employeeId) {
  return MOCK_TASKS.filter((t) => t.assigneeId === employeeId);
}

/** ค้นหาบันทึกชั่วโมงของพนักงาน */
export function getEmployeeWorkEntries(employeeId) {
  return MOCK_WORK_ENTRIES.filter((w) => w.employeeId === employeeId);
}

/** งานที่ยังไม่เสร็จทั้งหมด */
export function getUnfinishedTasks() {
  return MOCK_TASKS.filter((t) => t.status !== 'completed');
}

/** สรุปจำนวนโปรเจกต์ตามสถานะ */
export function getProjectStatusCounts(projects = MOCK_PROJECTS) {
  return projects.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});
}
