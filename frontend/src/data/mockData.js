// frontend/src/data/mockData.js — ข้อมูลจำลองระบบ MECHA Project Management (Single Source of Truth)
// ⚠️ ทุก Entity ถูกนิยามครั้งเดียวและเชื่อมโยงกันด้วย stable ID
// Project 1 carries the supplied Workspace reference records; other projects stay empty.

// ── 1. ผู้ใช้งานปัจจุบัน (Current User) ─────────────────────────────────
export const CURRENT_USER = {
  id: 'usr-001',
  employeeId: 'emp-001',
  name: 'Kittipat',
  fullName: 'Kittipat Samran',
  title: 'Mecha Trainee Engineer',
  departmentId: 'dept-1',
  department: 'PRODUCTION ENGINEER',
  email: 'kittipat.s@mecha.local',
  notificationsCount: 0,
};

// ── 2. การแจ้งเตือน (Notifications) ─────────────────────────────────────
export const NOTIFICATIONS = [];

// ── 3. โครงองค์กร Division → Section → Team (กฎการเห็นข้อมูลใน utils/access.js) ──
export const MOCK_DIVISIONS = [
  { id: 'div-1', name: 'MECHA1', code: 'M/P 1' },
  { id: 'div-2', name: 'MECHA2', code: 'M/P 2' },
  { id: 'div-3', name: 'MSE', code: 'MSE' },
];

// Section = แผนก (ตาราง departments ฝั่ง backend) · divisionId บอกว่าอยู่ใต้ Division ไหน
export const MOCK_DEPARTMENTS = [
  { id: 'dept-1', name: 'PRODUCTION ENGINEER', code: 'PE', divisionId: 'div-1' },
  { id: 'dept-2', name: 'Electrical & Control', code: 'EC', divisionId: 'div-1' },
  { id: 'dept-3', name: 'Mechanical', code: 'MECH', divisionId: 'div-1' },
  { id: 'dept-4', name: 'Quality Assurance', code: 'QA', divisionId: 'div-2' },
  { id: 'dept-5', name: 'Documentation & Training', code: 'DOC', divisionId: 'div-2' },
  { id: 'dept-6', name: 'Materials & Supply Chain', code: 'MSC', divisionId: 'div-3' },
];

// ── 3.1 ทีม (Teams) ─────────────────────────────────────────────────────
// Membership is independent of department and references employees by stable ID.
// sectionId = ทีมอยู่ใต้ Section ไหน · คนหนึ่งอยู่ได้หลายทีม (emp-020 อยู่ทั้ง IT และ Electrical)
export const MOCK_TEAMS = [
  { id: 'team-001', name: 'IT', sectionId: 'dept-1', memberEmployeeIds: ['emp-001', 'emp-002', 'emp-003', 'emp-008', 'emp-009', 'emp-015', 'emp-020'] },
  { id: 'team-002', name: 'AI', sectionId: 'dept-3', memberEmployeeIds: ['emp-005', 'emp-011', 'emp-017', 'emp-021', 'emp-026', 'emp-032', 'emp-033'] },
  { id: 'team-003', name: 'Electrical', sectionId: 'dept-2', memberEmployeeIds: ['emp-007', 'emp-013', 'emp-028', 'emp-019', 'emp-024', 'emp-034', 'emp-020'] },
];

// ── 4. พนักงาน (Employees) ───────────────────────────────────────────────
// คงพนักงานเดิม 20 คนและข้อมูลทุกฟิลด์ไว้ · field บัญชี (role / isActive / rfid / sectionIds / scope) เติมใน withAccount ข้างล่าง
const RAW_EMPLOYEES = [
  // IT department (7 employees: 5 regular, 2 trainees)
  { id: 'emp-001', name: 'Kittipat Samran', departmentId: 'dept-1', department: 'PRODUCTION ENGINEER', position: 'Trainee', email: 'kittipat.s@mecha.local' },
  { id: 'emp-002', name: 'Napat Chaiyaphon', departmentId: 'dept-1', department: 'PRODUCTION ENGINEER', position: 'Software Developer', email: 'napat.c@mecha.local' },
  { id: 'emp-003', name: 'Sarin Numnonda', departmentId: 'dept-1', department: 'PRODUCTION ENGINEER', position: 'Frontend Developer', email: 'sarin.n@mecha.local' },
  { id: 'emp-008', name: 'Supachai Meesuk', departmentId: 'dept-1', department: 'PRODUCTION ENGINEER', position: 'Supervisor', email: 'supachai.m@mecha.local' },
  { id: 'emp-009', name: 'Korn Tawonphon', departmentId: 'dept-1', department: 'PRODUCTION ENGINEER', position: 'Senior Developer', email: 'korn.t@mecha.local' },
  { id: 'emp-015', name: 'Nattapong Vejjakiva', departmentId: 'dept-1', department: 'PRODUCTION ENGINEER', position: 'Trainee', email: 'nattapong.v@mecha.local' },
  { id: 'emp-020', name: 'Thitikan Bunserm', departmentId: 'dept-1', department: 'PRODUCTION ENGINEER', position: 'Full-stack Developer', email: 'thitikan.b@mecha.local' },

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

// บัญชีผู้ใช้ (shape เดียวกับ GET /users ใน docs/api-contract.md)
//   role: ADMIN (เห็นทุกอย่าง + เมนูผู้ดูแล) | MANAGEMENT (เห็นและจัดการโปรเจกต์ในขอบเขต scope) | USER
//   sectionIds = สังกัดได้หลาย Section (departmentId = สังกัดหลัก อยู่ใน sectionIds เสมอ)
//   scope = ขอบเขตของ MANAGEMENT: ติ๊ก Division = ทุก Section ข้างใต้
const ACCOUNT_OVERRIDES = {
  'emp-008': { role: 'ADMIN' },
  'emp-009': { role: 'ADMIN' },
  'emp-005': { role: 'MANAGEMENT', scope: { divisionIds: ['div-1'], sectionIds: [] } }, // เห็นทั้ง Engineering
  'emp-007': { role: 'MANAGEMENT', scope: { divisionIds: [], sectionIds: ['dept-2'] } }, // เห็นเฉพาะ Electrical & Control
  'emp-020': { sectionIds: ['dept-1', 'dept-5'] }, // สังกัด 2 Section
};
const withAccount = (employee) => {
  const override = ACCOUNT_OVERRIDES[employee.id] || {};
  return {
    ...employee,
    role: 'USER',
    isActive: true,
    rfid: null,
    ...override,
    sectionIds: override.sectionIds || [employee.departmentId],
    scope: override.scope || { divisionIds: [], sectionIds: [] },
  };
};
export const MOCK_EMPLOYEES = RAW_EMPLOYEES.map(withAccount);

// ── 5. ข้อมูลโปรเจกต์ดิบ (Raw Projects) ──────────────────────────────────
// Keep the reference fixture scoped to project 1; unrelated projects remain unchanged.
const RAW_PROJECTS = [
  {
    id: 1,
    name: 'แดชบอร์ดสถานะสายการผลิต',
    category: 'ระบบองค์กร',
    displayStatusLabel: 'กำลังดำเนินการ',
    departmentId: 'dept-1',
    visibility: 'public', // โปรเจกต์ตัวอย่างเดิม 3 อันเปิดให้ทุกคนเห็น · ตัวอย่าง private ดูโปรเจกต์ 6–7
    sectionIds: ['dept-1'],
    managerId: 'emp-008',
    teamLeadId: 'emp-009',
    teamMemberIds: ['emp-008', 'emp-009', 'emp-002'],
    owner: 'Supachai Meesuk',
    status: 'in_progress',
    priority: 'high',
    startDate: '2026-10-01',
    dueDate: '2026-12-15',
    description: 'แดชบอร์ดรวมสถานะและยอดผลิตของแต่ละสายการผลิต เพื่อให้หัวหน้างานและผู้บริหารติดตามได้แบบเรียลไทม์ พร้อมแจ้งเตือนเมื่อเครื่องจักรหยุด',
    requiresDeliverables: true,
    referenceAsOfDate: '2026-11-12',
    sampleLabel: 'ข้อมูลตัวอย่าง',
    memberPoolIds: ['emp-008', 'emp-009', 'emp-002', 'emp-001'],
  },
  {
    id: 3,
    name: 'รายงานผลการฝึกงาน Mecha',
    category: 'เอกสารและการฝึกอบรม',
    departmentId: 'dept-5',
    visibility: 'public',
    sectionIds: ['dept-5'],
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
    visibility: 'public',
    sectionIds: ['dept-1'],
    managerId: 'emp-008',
    owner: 'Lalita / Kittipat',
    status: 'on_hold',
    plannedBudget: 90000,
    startDate: '2026-09-01',
    dueDate: '2026-11-15',
    description: 'เว็บไซต์แนะนำองค์กรและบริการ พร้อมระบบจัดการเนื้อหา',
  },
  // ตัวอย่างการเห็นตามโครงองค์กร: private ของ Section Electrical — emp-007 (MANAGEMENT เฉพาะ dept-2) และ emp-005 (ทั้ง div-1) เห็น
  {
    id: 6,
    name: 'ปรับปรุงตู้ควบคุมสายพาน',
    category: 'ระบบไฟฟ้า',
    departmentId: 'dept-2',
    visibility: 'private',
    sectionIds: ['dept-2'],
    managerId: 'emp-013',
    teamLeadId: 'emp-028',
    teamMemberIds: ['emp-013', 'emp-028', 'emp-019'],
    owner: 'Bodin Kittikorn',
    status: 'in_progress',
    priority: 'medium',
    plannedBudget: 60000,
    startDate: '2026-10-15',
    dueDate: '2027-01-31',
    description: 'เปลี่ยน PLC และเดินสายใหม่ในตู้ควบคุมสายพานลำเลียง',
  },
  // ไม่ติด Section — ดึงคนข้าม Division มารวม · MANAGEMENT เห็นผ่านสมาชิกที่อยู่ในขอบเขตตัวเอง
  {
    id: 7,
    name: 'คู่มือตรวจรับเครื่องจักรใหม่',
    category: 'เอกสารและการฝึกอบรม',
    departmentId: 'dept-4',
    visibility: 'private',
    sectionIds: [],
    managerId: 'emp-021',
    teamMemberIds: ['emp-021', 'emp-024'],
    owner: 'Ekkachai Rompho',
    status: 'planning',
    priority: 'low',
    startDate: '2026-12-01',
    dueDate: '2027-02-28',
    description: 'รวมขั้นตอนตรวจรับเครื่องจักรจากผู้ขาย ใช้ร่วมกันระหว่างฝ่ายช่างและ QA',
  },
];
// Project 1 uses the exact task records supplied with the Workspace reference.
const RAW_TASKS = [
  {
    id: 1, projectId: 1, title: 'ออกแบบโครงสร้างข้อมูลสายการผลิต',
    description: 'กำหนดตารางและความสัมพันธ์ของข้อมูลที่แดชบอร์ดต้องใช้',
    status: 'completed', statusLabel: 'เสร็จแล้ว', assigneeId: 'emp-002', collaborators: [], reviewerId: 'emp-009',
    startDate: '2026-10-01', dueDate: '2026-10-10', priority: 'none', progress: 100,
    checklist: [
      { id: '1-1', title: 'กำหนดตารางข้อมูล', completed: true, createdBy: 'emp-002', ownerId: 'emp-002' },
      { id: '1-2', title: 'ตรวจสอบกับฝ่ายผลิต', completed: true, createdBy: 'emp-002', ownerId: 'emp-002' },
      { id: '1-3', title: 'จัดทำเอกสารโครงสร้าง', completed: true, createdBy: 'emp-002', ownerId: 'emp-002' },
    ],
  },
  {
    id: 2, projectId: 1, title: 'เชื่อมต่อแหล่งข้อมูลเครื่องจักร',
    description: 'ดึงข้อมูลจำนวนผลิตและสถานะเครื่องจักรเข้าระบบ',
    status: 'completed', statusLabel: 'เสร็จแล้ว', assigneeId: 'emp-002', collaborators: [], reviewerId: 'emp-009',
    startDate: '2026-10-08', dueDate: '2026-10-24', priority: 'none', progress: 100,
    checklist: [
      { id: '2-1', title: 'เชื่อมต่อเครื่องจักรสายที่ 1', completed: true, createdBy: 'emp-002', ownerId: 'emp-002' },
      { id: '2-2', title: 'เชื่อมต่อเครื่องจักรสายที่ 2', completed: true, createdBy: 'emp-002', ownerId: 'emp-002' },
    ],
  },
  {
    id: 3, projectId: 1, title: 'ออกแบบหน้าจอแดชบอร์ด (UI)',
    description: 'ออกแบบหน้าจอสำหรับหัวหน้างานและผู้บริหาร',
    status: 'completed', statusLabel: 'เสร็จแล้ว', assigneeId: 'emp-009', collaborators: ['emp-002'], reviewerId: 'emp-008',
    startDate: '2026-10-12', dueDate: '2026-10-30', priority: 'none', progress: 100,
    checklist: [
      { id: '3-1', title: 'ร่างหน้าจอ', completed: true, createdBy: 'emp-009', ownerId: 'emp-009' },
      { id: '3-2', title: 'รับคอมเมนต์จากผู้ใช้', completed: true, createdBy: 'emp-009', ownerId: 'emp-009' },
      { id: '3-3', title: 'ปรับแก้ตามคอมเมนต์', completed: true, createdBy: 'emp-009', ownerId: 'emp-009' },
    ],
    reviewHistory: [{ action: 'approved', actorId: 'emp-009', reviewerId: 'emp-008', timestamp: '2026-10-30T16:05:00+07:00' }],
  },
  {
    id: 4, projectId: 1, title: 'พัฒนาหน้าสรุปยอดผลิตรายวัน',
    description: 'หน้ารวมยอดผลิตรายวันเทียบเป้าหมาย พร้อมตัวกรองตามสาย',
    status: 'pending_review', statusLabel: 'รอตรวจ', assigneeId: 'emp-002', collaborators: [], reviewerId: 'emp-009',
    startDate: '2026-10-25', dueDate: '2026-11-12', priority: 'none', progress: 0,
    reviewSubmittedBy: 'emp-002', reviewSubmittedAt: '2026-11-12T09:40:00+07:00',
    reviewHistory: [{ action: 'submitted', actorId: 'emp-002', reviewerId: 'emp-009', timestamp: '2026-11-12T09:40:00+07:00' }],
    checklist: [
      { id: '4-1', title: 'หน้ารายงานหลัก', completed: true, createdBy: 'emp-002', ownerId: 'emp-002' },
      { id: '4-2', title: 'ตัวกรองตามสาย', completed: true, createdBy: 'emp-002', ownerId: 'emp-002' },
      { id: '4-3', title: 'ส่งออกเป็นไฟล์', completed: true, createdBy: 'emp-002', ownerId: 'emp-002' },
      { id: '4-4', title: 'ทดสอบกับข้อมูลจริง', completed: true, createdBy: 'emp-002', ownerId: 'emp-002' },
    ],
  },
  {
    id: 5, projectId: 1, title: 'พัฒนาระบบแจ้งเตือนเครื่องหยุด',
    description: 'แจ้งเตือนผู้เกี่ยวข้องเมื่อเครื่องจักรหยุดเกินเวลาที่กำหนด',
    status: 'in_progress', statusLabel: 'กำลังทำ', assigneeId: 'emp-002', collaborators: ['emp-009'], reviewerId: 'emp-009',
    startDate: '2026-11-02', dueDate: '2026-11-20', priority: 'none', progress: 0,
    checklist: [
      { id: '5-1', title: 'กำหนดเงื่อนไขแจ้งเตือน', completed: true, createdBy: 'emp-002', ownerId: 'emp-002' },
      { id: '5-2', title: 'ส่งการแจ้งเตือน', completed: false, createdBy: 'emp-002', ownerId: 'emp-002' },
      { id: '5-3', title: 'หน้าตั้งค่าผู้รับ', completed: false, createdBy: 'emp-002', ownerId: 'emp-002' },
    ],
  },
  {
    id: 6, projectId: 1, title: 'ทดสอบการใช้งานร่วมกับสายการผลิตจริง',
    description: 'ทดลองใช้งานบนสายการผลิตจริงและเก็บปัญหา',
    status: 'in_progress', statusLabel: 'กำลังทำ', assigneeId: 'emp-009', collaborators: [], reviewerId: 'emp-008',
    startDate: '2026-11-05', dueDate: '2026-11-10', priority: 'none', progress: 0,
    checklist: [
      { id: '6-1', title: 'วางแผนการทดสอบ', completed: false, createdBy: 'emp-009', ownerId: 'emp-009' },
      { id: '6-2', title: 'บันทึกผลทดสอบ', completed: false, createdBy: 'emp-009', ownerId: 'emp-009' },
    ],
  },
  {
    id: 7, projectId: 1, title: 'เขียนคู่มือการใช้งาน',
    description: 'คู่มือสำหรับผู้ใช้งานทั่วไปและผู้ดูแลระบบ',
    status: 'not_started', statusLabel: 'ยังไม่เริ่ม', assigneeId: 'emp-009', collaborators: [], reviewerId: 'emp-008',
    startDate: '2026-11-25', dueDate: '2026-12-05', priority: 'none', progress: 0,
    checklist: [
      { id: '7-1', title: 'คู่มือผู้ใช้', completed: false, createdBy: 'emp-009', ownerId: 'emp-009' },
      { id: '7-2', title: 'คู่มือผู้ดูแลระบบ', completed: false, createdBy: 'emp-009', ownerId: 'emp-009' },
    ],
  },
  {
    id: 8, projectId: 1, title: 'อบรมผู้ใช้งานและส่งมอบ',
    description: 'จัดอบรมและส่งมอบระบบให้ฝ่ายผลิต',
    status: 'not_started', statusLabel: 'ยังไม่เริ่ม', assigneeId: 'emp-008', collaborators: ['emp-009'], reviewerId: 'emp-009',
    startDate: '2026-12-01', dueDate: '2026-12-15', priority: 'none', progress: 0,
    checklist: [
      { id: '8-1', title: 'นัดวันอบรม', completed: false, createdBy: 'emp-008', ownerId: 'emp-008' },
      { id: '8-2', title: 'จัดอบรม', completed: false, createdBy: 'emp-008', ownerId: 'emp-008' },
      { id: '8-3', title: 'เก็บแบบประเมิน', completed: false, createdBy: 'emp-008', ownerId: 'emp-008' },
    ],
  },
];

export const MOCK_DELIVERABLES = [
  { id: 'deliverable-reference-1', projectId: 1, title: 'ซอร์สโค้ดและเอกสารติดตั้ง', relatedTaskId: 5, status: 'pending' },
  { id: 'deliverable-reference-2', projectId: 1, title: 'คู่มือการใช้งาน', relatedTaskId: 7, status: 'pending' },
  { id: 'deliverable-reference-3', projectId: 1, title: 'รายงานผลการทดสอบ', relatedTaskId: 6, status: 'pending' },
];

export const MOCK_ACTIVITIES = [
  { id: 'activity-reference-1', projectId: 1, taskId: 4, actorId: 'emp-002', type: 'task_review_submitted', timestamp: '2026-11-12T09:40:00+07:00', description: 'ส่งงาน “พัฒนาหน้าสรุปยอดผลิตรายวัน” เข้าตรวจ' },
  { id: 'activity-reference-2', projectId: 1, taskId: 5, actorId: 'emp-002', type: 'checklist_item_completed', timestamp: '2026-11-08T15:12:00+07:00', description: 'ทำเช็กลิสต์ “กำหนดเงื่อนไขแจ้งเตือน” เสร็จ' },
  { id: 'activity-reference-3', projectId: 1, taskId: 3, actorId: 'emp-009', type: 'task_review_approved', timestamp: '2026-10-30T16:05:00+07:00', description: 'อนุมัติงาน “ออกแบบหน้าจอแดชบอร์ด (UI)”' },
  { id: 'activity-reference-4', projectId: 1, actorId: 'emp-008', type: 'project_team_leader_changed', timestamp: '2026-10-01T09:45:00+07:00', description: 'ตั้ง Korn Tawonphon เป็น Team Lead' },
  { id: 'activity-reference-5', projectId: 1, actorId: 'emp-008', type: 'project_created', timestamp: '2026-10-01T09:30:00+07:00', description: 'สร้างโปรเจกต์ และเป็น Project Owner' },
];

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

// Workload starts without planned entries or employee/task assignments.
export const MOCK_WORK_ENTRIES = [];

// Validate cross-entity references without changing or repairing the source records.
export function validateMockDataRelationships() {
  const errors = [];
  const ids = (records) => new Set(records.map((record) => String(record.id)));
  const employeeIds = ids(MOCK_EMPLOYEES);
  const departmentIds = ids(MOCK_DEPARTMENTS);
  const projectIds = ids(MOCK_PROJECTS);
  const taskIds = ids(MOCK_TASKS);
  const teamIds = ids(MOCK_TEAMS);
  const checkReference = (condition, message) => { if (!condition) errors.push(message); };

  MOCK_EMPLOYEES.forEach((employee) => {
    checkReference(departmentIds.has(String(employee.departmentId)), `Employee ${employee.id} references an unknown department`);
  });
  MOCK_TEAMS.forEach((team) => {
    checkReference(teamIds.has(String(team.id)), `Team ${team.id} has an invalid id`);
    const memberIds = (team.memberEmployeeIds || []).map(String);
    checkReference(new Set(memberIds).size === memberIds.length, `Team ${team.id} contains duplicate members`);
    memberIds.forEach((employeeId) => checkReference(employeeIds.has(employeeId), `Team ${team.id} references unknown employee ${employeeId}`));
  });
  MOCK_PROJECTS.forEach((project) => {
    checkReference(employeeIds.has(String(project.managerId)), `Project ${project.id} references unknown owner ${project.managerId}`);
    checkReference(!project.teamLeadId || employeeIds.has(String(project.teamLeadId)), `Project ${project.id} references unknown team lead ${project.teamLeadId}`);
    (project.teamMemberIds || []).map(String).forEach((employeeId) => checkReference(employeeIds.has(employeeId), `Project ${project.id} references unknown member ${employeeId}`));
  });
  MOCK_TASKS.forEach((task) => {
    checkReference(projectIds.has(String(task.projectId)), `Task ${task.id} references unknown project ${task.projectId}`);
    checkReference(employeeIds.has(String(task.assigneeId)), `Task ${task.id} references unknown assignee ${task.assigneeId}`);
    checkReference(employeeIds.has(String(task.reviewerId)), `Task ${task.id} references unknown reviewer ${task.reviewerId}`);
    (task.collaborators || []).map(String).forEach((employeeId) => checkReference(employeeIds.has(employeeId), `Task ${task.id} references unknown collaborator ${employeeId}`));
    const checklistIds = (task.checklist || []).map((item) => String(item.id));
    checkReference(new Set(checklistIds).size === checklistIds.length, `Task ${task.id} contains duplicate checklist ids`);
    (task.checklist || []).forEach((item) => {
      checkReference(employeeIds.has(String(item.createdBy)), `Checklist ${item.id} references unknown creator ${item.createdBy}`);
      checkReference(employeeIds.has(String(item.ownerId || item.createdBy)), `Checklist ${item.id} references unknown owner ${item.ownerId || item.createdBy}`);
    });
  });
  MOCK_DELIVERABLES.forEach((item) => {
    checkReference(projectIds.has(String(item.projectId)), `Deliverable ${item.id} references unknown project ${item.projectId}`);
    if (item.relatedTaskId !== undefined && item.relatedTaskId !== null) {
      const task = MOCK_TASKS.find((candidate) => String(candidate.id) === String(item.relatedTaskId));
      checkReference(Boolean(task) && String(task.projectId) === String(item.projectId), `Deliverable ${item.id} references a task from another project`);
    }
  });
  MOCK_ACTIVITIES.forEach((event) => {
    checkReference(projectIds.has(String(event.projectId)), `Activity ${event.id} references unknown project ${event.projectId}`);
    checkReference(employeeIds.has(String(event.actorId)), `Activity ${event.id} references unknown actor ${event.actorId}`);
    if (event.taskId !== undefined && event.taskId !== null) {
      const task = MOCK_TASKS.find((candidate) => String(candidate.id) === String(event.taskId));
      checkReference(Boolean(task) && String(task.projectId) === String(event.projectId), `Activity ${event.id} references a task from another project`);
    }
  });
  MOCK_WORK_ENTRIES.forEach((entry) => {
    checkReference(employeeIds.has(String(entry.employeeId)), `Work entry ${entry.id} references unknown employee ${entry.employeeId}`);
    checkReference(projectIds.has(String(entry.projectId)), `Work entry ${entry.id} references unknown project ${entry.projectId}`);
    if (entry.taskId !== undefined && entry.taskId !== null) checkReference(taskIds.has(String(entry.taskId)), `Work entry ${entry.id} references unknown task ${entry.taskId}`);
  });
  return { valid: errors.length === 0, errors };
}

export const MOCK_DATA_VALIDATION = validateMockDataRelationships();

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
