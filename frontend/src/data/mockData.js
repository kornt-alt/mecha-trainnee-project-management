// frontend/src/data/mockData.js — ข้อมูลจำลองระบบ MECHA Project Management (Single Source of Truth)
// ⚠️ ทุก Entity ถูกนิยามครั้งเดียวและเชื่อมโยงกันด้วย stable ID
// ⚠️ MOCK_WORK_ENTRIES เป็นชั่วโมงประมาณการรายวัน (Estimated Hours) ที่กระจายตามงานจริง

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
  notificationsCount: 2,
};

// ── 2. การแจ้งเตือน (Notifications) ─────────────────────────────────────
export const NOTIFICATIONS = [
  {
    id: 'n-1',
    title: 'ได้รับมอบหมายงานใหม่',
    message: 'หัวหน้างานมอบหมายงาน "ออกแบบหน้าแรก Dashboard ตาม UI Spec"',
    time: '25 นาทีที่แล้ว',
    unread: true,
  },
  {
    id: 'n-2',
    title: 'เตือนกำหนดส่งงาน',
    message: 'งาน "แก้ไขข้อผิดพลาดการคำนวณ Due Date เลยกำหนด" ใกล้ถึงกำหนดส่งแล้ว',
    time: '1 ชั่วโมงที่แล้ว',
    unread: true,
  },
  {
    id: 'n-3',
    title: 'งานได้รับการอนุมัติ',
    message: '"กำหนด CSS Design Tokens และ Color Palette" ผ่านการตรวจสอบเรียบร้อย',
    time: '3 วันที่แล้ว',
    unread: false,
  },
];

// ── 3. แผนก (Departments) ───────────────────────────────────────────────
export const MOCK_DEPARTMENTS = [
  { id: 'dept-1', name: 'Mechanical Automation & Software', code: 'MAS' },
  { id: 'dept-2', name: 'Electrical & Control', code: 'EC' },
  { id: 'dept-3', name: 'Mechanical', code: 'MECH' },
  { id: 'dept-4', name: 'Quality Assurance', code: 'QA' },
  { id: 'dept-5', name: 'Documentation & Training', code: 'DOC' },
];

// ── 4. พนักงาน (Employees) ───────────────────────────────────────────────
// 32 คน เชื่อมโยงกับ departmentId และมีฟิลด์ department เดิมเพื่อความเข้ากันได้
export const MOCK_EMPLOYEES = [
  { id: 'emp-001', name: 'Kittipat Samran', departmentId: 'dept-1', department: 'Mechanical Automation & Software', position: 'Trainee Engineer', email: 'kittipat.s@mecha.local' },
  { id: 'emp-002', name: 'Napat Chaiyaphon', departmentId: 'dept-1', department: 'Mechanical Automation & Software', position: 'Software Developer', email: 'napat.c@mecha.local' },
  { id: 'emp-003', name: 'Sarin Numnonda', departmentId: 'dept-1', department: 'Mechanical Automation & Software', position: 'Frontend Developer', email: 'sarin.n@mecha.local' },
  { id: 'emp-004', name: 'Ployfa Waratchaya', departmentId: 'dept-5', department: 'Documentation & Training', position: 'Documentation Officer', email: 'ployfa.w@mecha.local' },
  { id: 'emp-005', name: 'Thanakorn Wiset', departmentId: 'dept-3', department: 'Mechanical', position: 'Mechanical Engineer', email: 'thanakorn.w@mecha.local' },
  { id: 'emp-006', name: 'Kanyarat Srisuk', departmentId: 'dept-4', department: 'Quality Assurance', position: 'QA Engineer', email: 'kanyarat.s@mecha.local' },
  { id: 'emp-007', name: 'Wichai Prasertkul', departmentId: 'dept-2', department: 'Electrical & Control', position: 'Control Engineer', email: 'wichai.p@mecha.local' },
  { id: 'emp-008', name: 'Supachai Meesuk', departmentId: 'dept-1', department: 'Mechanical Automation & Software', position: 'Supervisor', email: 'supachai.m@mecha.local' },
  { id: 'emp-009', name: 'Korn Tawonphon', departmentId: 'dept-1', department: 'Mechanical Automation & Software', position: 'Senior Developer', email: 'korn.t@mecha.local' },
  { id: 'emp-010', name: 'Arisa Thongkham', departmentId: 'dept-4', department: 'Quality Assurance', position: 'QA Tester', email: 'arisa.t@mecha.local' },
  { id: 'emp-011', name: 'Jirayu Phuangmalai', departmentId: 'dept-3', department: 'Mechanical', position: 'Mechanical Technician', email: 'jirayu.p@mecha.local' },
  { id: 'emp-012', name: 'Chanida Rerkpaisan', departmentId: 'dept-5', department: 'Documentation & Training', position: 'Training Coordinator', email: 'chanida.r@mecha.local' },
  { id: 'emp-013', name: 'Bodin Kittikorn', departmentId: 'dept-2', department: 'Electrical & Control', position: 'Electrical Engineer', email: 'bodin.k@mecha.local' },
  { id: 'emp-014', name: 'Malee Somsri', departmentId: 'dept-4', department: 'Quality Assurance', position: 'QC Inspector', email: 'malee.s@mecha.local' },
  { id: 'emp-015', name: 'Nattapong Vejjakiva', departmentId: 'dept-1', department: 'Mechanical Automation & Software', position: 'Backend Developer', email: 'nattapong.v@mecha.local' },
  { id: 'emp-016', name: 'Sirikwan Laotham', departmentId: 'dept-5', department: 'Documentation & Training', position: 'Technical Writer', email: 'sirikwan.l@mecha.local' },
  { id: 'emp-017', name: 'Prapat Suriyawong', departmentId: 'dept-3', department: 'Mechanical', position: 'CAD Designer', email: 'prapat.s@mecha.local' },
  { id: 'emp-018', name: 'Oranee Tantivejkul', departmentId: 'dept-4', department: 'Quality Assurance', position: 'QA Lead', email: 'oranee.t@mecha.local' },
  { id: 'emp-019', name: 'Rattanakorn Phusit', departmentId: 'dept-2', department: 'Electrical & Control', position: 'Panel Technician', email: 'rattanakorn.p@mecha.local' },
  { id: 'emp-020', name: 'Thitikan Bunserm', departmentId: 'dept-1', department: 'Mechanical Automation & Software', position: 'Full-stack Developer', email: 'thitikan.b@mecha.local' },
  { id: 'emp-021', name: 'Ekkachai Rompho', departmentId: 'dept-3', department: 'Mechanical', position: 'Maintenance Engineer', email: 'ekkachai.r@mecha.local' },
  { id: 'emp-022', name: 'Warunya Kittisak', departmentId: 'dept-4', department: 'Quality Assurance', position: 'QA Engineer', email: 'warunya.k@mecha.local' },
  { id: 'emp-023', name: 'Suthatrong Maneerat', departmentId: 'dept-5', department: 'Documentation & Training', position: 'Document Controller', email: 'suthatrong.m@mecha.local' },
  { id: 'emp-024', name: 'Phumin Jareonsuk', departmentId: 'dept-2', department: 'Electrical & Control', position: 'Instrument Technician', email: 'phumin.j@mecha.local' },
  { id: 'emp-025', name: 'Lalita Pongsakorn', departmentId: 'dept-1', department: 'Mechanical Automation & Software', position: 'UI/UX Designer', email: 'lalita.p@mecha.local' },
  { id: 'emp-026', name: 'Goragod Wannasiri', departmentId: 'dept-3', department: 'Mechanical', position: 'Mechanical Engineer', email: 'goragod.w@mecha.local' },
  { id: 'emp-027', name: 'Napassorn Teerakul', departmentId: 'dept-4', department: 'Quality Assurance', position: 'QC Inspector', email: 'napassorn.t@mecha.local' },
  { id: 'emp-028', name: 'Veerapat Chokchai', departmentId: 'dept-2', department: 'Electrical & Control', position: 'Automation Engineer', email: 'veerapat.c@mecha.local' },
  { id: 'emp-029', name: 'Rinrada Sawatdi', departmentId: 'dept-5', department: 'Documentation & Training', position: 'Training Officer', email: 'rinrada.s@mecha.local' },
  { id: 'emp-030', name: 'Chatchai Wetwitoo', departmentId: 'dept-1', department: 'Mechanical Automation & Software', position: 'DevOps Engineer', email: 'chatchai.w@mecha.local' },
  { id: 'emp-031', name: 'Benyapa Ruangrit', departmentId: 'dept-4', department: 'Quality Assurance', position: 'QA Tester', email: 'benyapa.r@mecha.local' },
  { id: 'emp-032', name: 'Sarawut Phutthinat', departmentId: 'dept-3', department: 'Mechanical', position: 'Mechanical Technician', email: 'sarawut.p@mecha.local' },
];

// ── 5. ข้อมูลโปรเจกต์ดิบ (Raw Projects) ──────────────────────────────────
// 14 โปรเจกต์หลัก ครอบคลุมทุกแผนกและสถานะตาม config.js (planning, in_progress, on_hold, done, cancelled)
const RAW_PROJECTS = [
  {
    id: 1,
    name: 'ระบบจัดการและติดตามงาน Trainee',
    departmentId: 'dept-1',
    managerId: 'emp-008',
    owner: 'Kittipat / Supachai',
    status: 'in_progress',
    startDate: '2026-10-01',
    dueDate: '2026-11-15',
    description: 'ระบบ Dashboard และติดตามงานที่ได้รับมอบหมายสำหรับ Mecha Trainee',
  },
  {
    id: 2,
    name: 'ระบบ QC Gauge Mecha',
    departmentId: 'dept-4',
    managerId: 'emp-018',
    owner: 'Kittipat / Korn',
    status: 'in_progress',
    startDate: '2026-09-15',
    dueDate: '2026-10-31',
    description: 'ระบบบันทึกและตรวจสอบค่า Gauge การวัดความแม่นยำทางกล',
  },
  {
    id: 3,
    name: 'รายงานผลการฝึกงาน Mecha',
    departmentId: 'dept-5',
    managerId: 'emp-008',
    owner: 'Kittipat / Supachai',
    status: 'planning',
    startDate: '2026-11-01',
    dueDate: '2026-11-30',
    description: 'เอกสารและระบบรวบรวมรายงานสรุปผลการฝึกงาน',
  },
  {
    id: 4,
    name: 'ระบบควบคุมหุ่นยนต์ ARMS',
    departmentId: 'dept-1',
    managerId: 'emp-009',
    owner: 'Thanakorn / Korn',
    status: 'in_progress',
    startDate: '2026-09-07',
    dueDate: '2026-11-20',
    description: 'ระบบควบคุมหุ่นยนต์แขนกล 6 แกนสำหรับหยิบวางชิ้นงานอัตโนมัติ',
  },
  {
    id: 5,
    name: 'เว็บไซต์องค์กร Mecha 2026',
    departmentId: 'dept-1',
    managerId: 'emp-008',
    owner: 'Lalita / Kittipat',
    status: 'on_hold',
    startDate: '2026-09-01',
    dueDate: '2026-11-15',
    description: 'เว็บไซต์แนะนำองค์กรและบริการ พร้อมระบบจัดการเนื้อหา',
  },
  {
    id: 6,
    name: 'ระบบบันทึกเวลาทำงานอัตโนมัติ',
    departmentId: 'dept-1',
    managerId: 'emp-009',
    owner: 'Nattapong / Korn',
    status: 'in_progress',
    startDate: '2026-09-21',
    dueDate: '2026-11-05',
    description: 'ระบบบันทึกเวลาเข้า-ออกงานและสรุปชั่วโมงทำงานอัตโนมัติ',
  },
  {
    id: 7,
    name: 'ระบบตรวจนับสต๊อกอะไหล่',
    departmentId: 'dept-3',
    managerId: 'emp-008',
    owner: 'Jirayu / Kittipat',
    status: 'in_progress',
    startDate: '2026-10-12',
    dueDate: '2026-12-10',
    description: 'ระบบสแกนนับสต๊อกอะไหล่เข้า-ออกคลังด้วย Barcode และ QR',
  },
  {
    id: 8,
    name: 'แดชบอร์ดวิเคราะห์ยอดขาย',
    departmentId: 'dept-1',
    managerId: 'emp-008',
    owner: 'Chanida / Supachai',
    status: 'planning',
    startDate: '2026-11-05',
    dueDate: '2026-12-20',
    description: 'แดชบอร์ดวิเคราะห์ยอดขายรายไตรมาสสำหรับผู้บริหาร',
  },
  {
    id: 9,
    name: 'ระบบสแกน QR เข้า-ออกงาน',
    departmentId: 'dept-2',
    managerId: 'emp-009',
    owner: 'Bodin / Korn',
    status: 'done',
    startDate: '2026-07-20',
    dueDate: '2026-09-30',
    description: 'ระบบสแกน QR ลงเวลาเข้า-ออกงานที่ทางเข้าอาคาร',
  },
  {
    id: 10,
    name: 'ระบบจองห้องประชุม',
    departmentId: 'dept-1',
    managerId: 'emp-008',
    owner: 'Lalita / Nattapong',
    status: 'done',
    startDate: '2026-07-06',
    dueDate: '2026-08-31',
    description: 'ระบบจองห้องประชุมออนไลน์พร้อมปฏิทินและการแจ้งเตือน',
  },
  {
    id: 11,
    name: 'แอปแจ้งเตือนซ่อมบำรุง',
    departmentId: 'dept-3',
    managerId: 'emp-009',
    owner: 'Chatchai / Korn',
    status: 'done',
    startDate: '2026-08-10',
    dueDate: '2026-10-15',
    description: 'แอปแจ้งเตือนทีมซ่อมบำรุงเมื่อเครื่องจักรมีอาการผิดปกติ',
  },
  {
    id: 12,
    name: 'ระบบทดสอบความแม่นยำเซนเซอร์',
    departmentId: 'dept-4',
    managerId: 'emp-018',
    owner: 'Malee / Supachai',
    status: 'in_progress',
    startDate: '2026-10-01',
    dueDate: '2026-10-30',
    description: 'ระบบเก็บและวิเคราะห์ค่าเบี่ยงเบนของเซนเซอร์วัดก่อนใช้งานจริง',
  },
  {
    id: 13,
    name: 'ระบบประเมินผลงาน Trainee',
    departmentId: 'dept-5',
    managerId: 'emp-008',
    owner: 'Chanida / Supachai',
    status: 'cancelled',
    startDate: '2026-10-05',
    dueDate: '2026-12-01',
    description: 'ระบบประเมินผลงานรายเดือนของ Trainee (ยกเลิกเนื่องจากซ้ำซ้อนกับระบบ HR)',
  },
  {
    id: 14,
    name: 'ระบบจัดการเอกสาร ISO',
    departmentId: 'dept-5',
    managerId: 'emp-008',
    owner: 'Suthatrong / Korn',
    status: 'on_hold',
    startDate: '2026-09-07',
    dueDate: '2026-11-10',
    description: 'ระบบจัดเก็บและควบคุมเวอร์ชันเอกสารมาตรฐาน ISO 9001',
  },
];

// ── 6. รายการงาน (Tasks) ─────────────────────────────────────────────────
// 40 งาน กระจายใน 14 โปรเจกต์ ทุกงานมี projectId และ assigneeId ที่ถูกต้อง
const RAW_TASKS = [
  // Project 1: ระบบจัดการและติดตามงาน Trainee (in_progress)
  {
    id: 'task-1',
    title: 'ออกแบบหน้าแรก Dashboard ตาม UI Spec',
    projectId: 1,
    assigneeId: 'emp-001',
    supervisor: 'Supachai M.',
    category: 'Frontend',
    startDate: '2026-10-01',
    dueDate: '2026-10-22',
    status: 'in_progress',
    statusLabel: 'กำลังดำเนินการ',
    progress: 75,
    priority: 'urgent',
    estimatedHours: 24,
    description: 'พัฒนาหน้าหลัก (Home) แสดงการ์ดสรุป งานที่ยังไม่เสร็จ และแผงข้อมูลเสริมตามข้อกำหนด โดยไม่มีปฏิทินและไม่ใช้ Emoji',
  },
  {
    id: 'task-3',
    title: 'เขียน Integration Test สำหรับ Projects API',
    projectId: 1,
    assigneeId: 'emp-002',
    supervisor: 'Supachai M.',
    category: 'Testing',
    startDate: '2026-10-08',
    dueDate: '2026-10-28',
    status: 'pending_review',
    statusLabel: 'รอการตรวจสอบ',
    progress: 90,
    priority: 'high',
    estimatedHours: 20,
    description: 'ทดสอบ endpoint GET, POST, PATCH สำหรับโปรเจกต์ และตรวจสอบ error handling เมื่อฐานข้อมูลไม่พร้อม',
  },
  {
    id: 'task-6',
    title: 'กำหนด CSS Design Tokens และ Color Palette',
    projectId: 1,
    assigneeId: 'emp-001',
    supervisor: 'Supachai M.',
    category: 'Frontend',
    startDate: '2026-10-12',
    dueDate: '2026-10-18',
    status: 'completed',
    statusLabel: 'เสร็จสิ้น',
    progress: 100,
    priority: 'normal',
    estimatedHours: 8,
    description: 'กำหนดค่าสี tokens.css โทนสีน้ำเงิน-ขาว ตามมาตรฐาน Mecha UI',
  },
  {
    id: 'task-30',
    title: 'เขียนคู่มือการใช้งานหน้า Dashboard',
    projectId: 1,
    assigneeId: 'emp-004',
    supervisor: 'Supachai M.',
    category: 'Documentation',
    startDate: '2026-10-14',
    dueDate: '2026-10-29',
    status: 'in_progress',
    statusLabel: 'กำลังดำเนินการ',
    progress: 40,
    priority: 'normal',
    estimatedHours: 14,
    description: 'คู่มือภาษาไทยประกอบภาพหน้าจอ ครอบคลุมการ์ดสรุป ตารางงาน และการกรองข้อมูล',
  },

  // Project 2: ระบบ QC Gauge Mecha (in_progress)
  {
    id: 'task-2',
    title: 'แก้ไขข้อผิดพลาดการคำนวณ Due Date เลยกำหนด',
    projectId: 2,
    assigneeId: 'emp-001',
    supervisor: 'Korn Tawonphon',
    category: 'Frontend',
    startDate: '2026-10-05',
    dueDate: '2026-10-20',
    status: 'in_progress',
    statusLabel: 'กำลังดำเนินการ',
    progress: 60,
    priority: 'urgent',
    estimatedHours: 16,
    description: 'ตรวจสอบ logic วันที่เลยกำหนดให้สอดคล้องกับเวลา Timezone เครื่องผู้ใช้ ไม่ให้เกิดบั๊กช่วงเช้าวันใหม่',
  },
  {
    id: 'task-4',
    title: 'ปรับปรุง Database Schema & Query Index',
    projectId: 2,
    assigneeId: 'emp-003',
    supervisor: 'Korn Tawonphon',
    category: 'Backend',
    startDate: '2026-10-19',
    dueDate: '2026-10-31',
    status: 'in_progress',
    statusLabel: 'กำลังดำเนินการ',
    progress: 50,
    priority: 'normal',
    estimatedHours: 12,
    description: 'เพิ่ม composite index สำหรับ status และ due_date เพื่อเพิ่มความเร็วในการกรองงานในตาราง',
  },
  {
    id: 'task-31',
    title: 'ทดสอบการทำงานร่วมกับเครื่อง CNC',
    projectId: 2,
    assigneeId: 'emp-006',
    supervisor: 'Korn Tawonphon',
    category: 'Testing',
    startDate: '2026-10-19',
    dueDate: '2026-11-06',
    status: 'not_started',
    statusLabel: 'รอเริ่มทำ',
    progress: 0,
    priority: 'high',
    estimatedHours: 18,
    description: 'ทดสอบการรับค่ามาตรวัดจากเครื่อง CNC ผ่านพอร์ต RS-232 และตรวจความถูกต้องของหน่วย',
  },

  // Project 3: รายงานผลการฝึกงาน Mecha (planning)
  {
    id: 'task-5',
    title: 'จัดทำรายงานสรุปความคืบหน้ารายสัปดาห์ Trainee',
    projectId: 3,
    assigneeId: 'emp-004',
    supervisor: 'Supachai M.',
    category: 'Documentation',
    startDate: '2026-11-02',
    dueDate: '2026-11-10',
    status: 'not_started',
    statusLabel: 'รอเริ่มทำ',
    progress: 0,
    priority: 'normal',
    estimatedHours: 10,
    description: 'รวบรวมชั่วโมงการทำงาน รายการงานที่เสร็จ และปัญหาที่พบเสนอหัวหน้างานประจำสัปดาห์',
  },
  {
    id: 'task-32',
    title: 'อัปเดต Drawing แจ็กเกตเครื่องจักรโซน B',
    projectId: 3,
    assigneeId: 'emp-017',
    supervisor: 'Supachai M.',
    category: 'Design',
    startDate: '2026-11-05',
    dueDate: '2026-11-20',
    status: 'not_started',
    statusLabel: 'รอเริ่มทำ',
    progress: 0,
    priority: 'normal',
    estimatedHours: 20,
    description: 'อัปเดตแบบเขียนรายละเอียด (Shop Drawing) ให้ตรงกับงานติดตั้งจริงในโซน B',
  },
  {
    id: 'task-35',
    title: 'ปรับปรุงหน้ารายงานผลการฝึกงานตามฟีดแบ็ก',
    projectId: 3,
    assigneeId: 'emp-003',
    supervisor: 'Supachai M.',
    category: 'Frontend',
    startDate: '2026-11-10',
    dueDate: '2026-11-25',
    status: 'not_started',
    statusLabel: 'รอเริ่มทำ',
    progress: 0,
    priority: 'normal',
    estimatedHours: 12,
    description: 'ปรับตารางสรุปชั่วโมงและกราฟความก้าวหน้าตามความเห็นของหัวหน้างานจากการรีวิวครั้งที่ 2',
  },

  // Project 4: ระบบควบคุมหุ่นยนต์ ARMS (in_progress)
  {
    id: 'task-7',
    title: 'ออกแบบโครงสร้าง Layout ระบบ ARMS',
    projectId: 4,
    assigneeId: 'emp-005',
    supervisor: 'Supachai M.',
    category: 'Design',
    startDate: '2026-09-14',
    dueDate: '2026-10-09',
    status: 'in_progress',
    statusLabel: 'กำลังดำเนินการ',
    progress: 55,
    priority: 'high',
    estimatedHours: 28,
    description: 'ออกแบบโครงสร้างหน้าจอควบคุมหุ่นยนต์แขนกล 6 แกน พร้อมแผงแสดงสถานะมอเตอร์แบบเรียลไทม์',
  },
  {
    id: 'task-8',
    title: 'พัฒนา WebSocket รับค่า Encoder หุ่นยนต์',
    projectId: 4,
    assigneeId: 'emp-015',
    supervisor: 'Korn Tawonphon',
    category: 'Backend',
    startDate: '2026-09-21',
    dueDate: '2026-10-30',
    status: 'in_progress',
    statusLabel: 'กำลังดำเนินการ',
    progress: 40,
    priority: 'urgent',
    estimatedHours: 36,
    description: 'เชื่อมต่อสัญญาณ Encoder จากหุ่นยนต์เข้าสู่หน้าจอควบคุมผ่าน WebSocket ความละเอียด 0.1 องศา',
  },
  {
    id: 'task-9',
    title: 'ทดสอบความแม่นยำการหยิบวางชิ้นงาน',
    projectId: 4,
    assigneeId: 'emp-006',
    supervisor: 'Korn Tawonphon',
    category: 'Testing',
    startDate: '2026-11-02',
    dueDate: '2026-11-18',
    status: 'not_started',
    statusLabel: 'รอเริ่มทำ',
    progress: 0,
    priority: 'high',
    estimatedHours: 24,
    description: 'ทดสอบ Repeat Accuracy การหยิบวางชิ้นงาน 200 รอบ บันทึกค่าเบี่ยงเบนมาตรฐาน',
  },
  {
    id: 'task-33',
    title: 'เขียนรายงานผลการทดสอบระบบ ARMS',
    projectId: 4,
    assigneeId: 'emp-016',
    supervisor: 'Korn Tawonphon',
    category: 'Documentation',
    startDate: '2026-11-16',
    dueDate: '2026-11-27',
    status: 'not_started',
    statusLabel: 'รอเริ่มทำ',
    progress: 0,
    priority: 'normal',
    estimatedHours: 10,
    description: 'สรุปผลการทดสอบความแม่นยำและข้อจำกัดของระบบ พร้อมข้อเสนอแนะการปรับปรุง',
  },

  // Project 5: เว็บไซต์องค์กร Mecha 2026 (on_hold)
  {
    id: 'task-10',
    title: 'ออกแบบหน้าเว็บองค์กรหน้าแรก (Landing Page)',
    projectId: 5,
    assigneeId: 'emp-025',
    supervisor: 'Supachai M.',
    category: 'Design',
    startDate: '2026-09-07',
    dueDate: '2026-10-16',
    status: 'pending_review',
    statusLabel: 'รอการตรวจสอบ',
    progress: 90,
    priority: 'high',
    estimatedHours: 30,
    description: 'ออกแบบ Hero Section รายละเอียดบริการ และ Portfolio ตามแนวทาง Brand Guide ของบริษัท',
  },
  {
    id: 'task-11',
    title: 'พัฒนาหน้าเว็บ CMS สำหรับแอดมิน',
    projectId: 5,
    assigneeId: 'emp-003',
    supervisor: 'Korn Tawonphon',
    category: 'Frontend',
    startDate: '2026-10-05',
    dueDate: '2026-10-27',
    status: 'in_progress',
    statusLabel: 'กำลังดำเนินการ',
    progress: 65,
    priority: 'urgent',
    estimatedHours: 32,
    description: 'ระบบจัดการเนื้อหาเว็บไซต์ให้ทีม Marketing แก้ไขข้อความและรูปภาพได้เอง',
  },
  {
    id: 'task-12',
    title: 'เขียนเนื้อหาบทความแนะนำบริการ',
    projectId: 5,
    assigneeId: 'emp-016',
    supervisor: 'Supachai M.',
    category: 'Documentation',
    startDate: '2026-10-12',
    dueDate: '2026-10-23',
    status: 'in_progress',
    statusLabel: 'กำลังดำเนินการ',
    progress: 80,
    priority: 'normal',
    estimatedHours: 14,
    description: 'เขียนบทความแนะนำบริการ 4 สายงานหลัก ภาษาไทยและอังกฤษ',
  },

  // Project 6: ระบบบันทึกเวลาทำงานอัตโนมัติ (in_progress)
  {
    id: 'task-13',
    title: 'ออกแบบฐานข้อมูลบันทึกเวลาทำงาน',
    projectId: 6,
    assigneeId: 'emp-015',
    supervisor: 'Korn Tawonphon',
    category: 'Backend',
    startDate: '2026-09-28',
    dueDate: '2026-10-14',
    status: 'completed',
    statusLabel: 'เสร็จสิ้น',
    progress: 100,
    priority: 'high',
    estimatedHours: 18,
    description: 'ออกแบบตาราง time_entries, employees และ approval flow พร้อม ER Diagram',
  },
  {
    id: 'task-14',
    title: 'พัฒนา API สรุปชั่วโมงทำงานรายเดือน',
    projectId: 6,
    assigneeId: 'emp-020',
    supervisor: 'Korn Tawonphon',
    category: 'Backend',
    startDate: '2026-10-14',
    dueDate: '2026-11-04',
    status: 'in_progress',
    statusLabel: 'กำลังดำเนินการ',
    progress: 35,
    priority: 'high',
    estimatedHours: 40,
    description: 'Endpoint รวมชั่วโมงทำงานของพนักงานแยกตามเดือน พร้อม export เป็น Excel',
  },
  {
    id: 'task-34',
    title: 'ตรวจสอบระบบไฟฟ้าแผงควบคุมใหม่',
    projectId: 6,
    assigneeId: 'emp-019',
    supervisor: 'Korn Tawonphon',
    category: 'Testing',
    startDate: '2026-10-26',
    dueDate: '2026-11-13',
    status: 'not_started',
    statusLabel: 'รอเริ่มทำ',
    progress: 0,
    priority: 'high',
    estimatedHours: 16,
    description: 'ตรวจสอบการเดินสายและการต่อแผงควบคุมเครื่องสแกนนิ้วให้เป็นไปตามมาตรฐาน IEC',
  },

  // Project 7: ระบบตรวจนับสต๊อกอะไหล่ (in_progress)
  {
    id: 'task-15',
    title: 'ติดตั้งประตูอัตโนมัติโซนคลังอะไหล่',
    projectId: 7,
    assigneeId: 'emp-011',
    supervisor: 'Supachai M.',
    category: 'Design',
    startDate: '2026-10-19',
    dueDate: '2026-11-06',
    status: 'in_progress',
    statusLabel: 'กำลังดำเนินการ',
    progress: 25,
    priority: 'normal',
    estimatedHours: 22,
    description: 'ติดตั้งประตูอัตโนมัติพร้อมเซนเซอร์นับคนเข้า-ออกโซนคลังอะไหล่',
  },
  {
    id: 'task-16',
    title: 'พัฒนาระบบสแกน Barcode อะไหล่',
    projectId: 7,
    assigneeId: 'emp-002',
    supervisor: 'Korn Tawonphon',
    category: 'Frontend',
    startDate: '2026-10-26',
    dueDate: '2026-11-27',
    status: 'in_progress',
    statusLabel: 'กำลังดำเนินการ',
    progress: 15,
    priority: 'high',
    estimatedHours: 44,
    description: 'แอปสแกน Barcode/QR นับสต๊อกเข้า-ออก พร้อมซิงค์เข้าฐานข้อมูลกลาง',
  },

  // Project 8: แดชบอร์ดวิเคราะห์ยอดขาย (planning)
  {
    id: 'task-17',
    title: 'ออกแบบ KPI Dashboard ยอดขายรายไตรมาส',
    projectId: 8,
    assigneeId: 'emp-025',
    supervisor: 'Supachai M.',
    category: 'Design',
    startDate: '2026-11-09',
    dueDate: '2026-12-04',
    status: 'not_started',
    statusLabel: 'รอเริ่มทำ',
    progress: 0,
    priority: 'normal',
    estimatedHours: 26,
    description: 'ออกแบบกราฟ KPI ยอดขาย อัตราการเติบโต และ Top Products ตามโทนสีองค์กร',
  },
  {
    id: 'task-18',
    title: 'สำรวจความต้องการข้อมูลจากทีมขาย',
    projectId: 8,
    assigneeId: 'emp-012',
    supervisor: 'Supachai M.',
    category: 'Documentation',
    startDate: '2026-11-02',
    dueDate: '2026-11-13',
    status: 'not_started',
    statusLabel: 'รอเริ่มทำ',
    progress: 0,
    priority: 'normal',
    estimatedHours: 12,
    description: 'สัมภาษณ์ทีมขาย 3 ภูมิภาค สรุป Metric สำคัญที่ต้องแสดงบนแดชบอร์ด',
  },

  // Project 9: ระบบสแกน QR เข้า-ออกงาน (done)
  {
    id: 'task-19',
    title: 'ติดตั้งเครื่องสแกน QR ทางเข้าอาคาร A',
    projectId: 9,
    assigneeId: 'emp-013',
    supervisor: 'Korn Tawonphon',
    category: 'Testing',
    startDate: '2026-08-03',
    dueDate: '2026-08-21',
    status: 'completed',
    statusLabel: 'เสร็จสิ้น',
    progress: 100,
    priority: 'normal',
    estimatedHours: 20,
    description: 'ติดตั้งเครื่องสแกน 2 จุด พร้อมทดสอบเชื่อมต่อระบบสำแดงข้อมูลกลาง',
  },
  {
    id: 'task-20',
    title: 'อบรมการใช้งานระบบสแกน QR ให้พนักงาน',
    projectId: 9,
    assigneeId: 'emp-012',
    supervisor: 'Supachai M.',
    category: 'Documentation',
    startDate: '2026-08-24',
    dueDate: '2026-09-11',
    status: 'completed',
    statusLabel: 'เสร็จสิ้น',
    progress: 100,
    priority: 'normal',
    estimatedHours: 10,
    description: 'จัดอบรม 2 รอบ ครอบคลุมพนักงานทุกแผนก พร้อมคู่มือฉบับย่อ',
  },

  // Project 10: ระบบจองห้องประชุม (done)
  {
    id: 'task-21',
    title: 'ออกแบบโมดูลจองห้องประชุม',
    projectId: 10,
    assigneeId: 'emp-025',
    supervisor: 'Supachai M.',
    category: 'Design',
    startDate: '2026-07-27',
    dueDate: '2026-08-14',
    status: 'completed',
    statusLabel: 'เสร็จสิ้น',
    progress: 100,
    priority: 'normal',
    estimatedHours: 16,
    description: 'ออกแบบ UI ตารางจองห้องประชุมแบบ Weekly View พร้อมระบบแจ้งเตือนผู้จอง',
  },
  {
    id: 'task-22',
    title: 'ทดสอบ Load ระบบจองห้องประชุม',
    projectId: 10,
    assigneeId: 'emp-010',
    supervisor: 'Korn Tawonphon',
    category: 'Testing',
    startDate: '2026-08-10',
    dueDate: '2026-08-28',
    status: 'completed',
    statusLabel: 'เสร็จสิ้น',
    progress: 100,
    priority: 'normal',
    estimatedHours: 14,
    description: 'จำลองผู้ใช้ 500 คนจองพร้อมกัน เพื่อวัด Response Time ของ API',
  },

  // Project 11: แอปแจ้งเตือนซ่อมบำรุง (done)
  {
    id: 'task-23',
    title: 'พัฒนา Notification Push แจ้งเตือนซ่อมบำรุง',
    projectId: 11,
    assigneeId: 'emp-030',
    supervisor: 'Korn Tawonphon',
    category: 'Backend',
    startDate: '2026-09-07',
    dueDate: '2026-10-02',
    status: 'completed',
    statusLabel: 'เสร็จสิ้น',
    progress: 100,
    priority: 'high',
    estimatedHours: 28,
    description: 'ระบบ Push Notification แจ้งทีมซ่อมบำรุงเมื่อเครื่องจักรรายงานอาการผิดปกติ',
  },
  {
    id: 'task-37',
    title: 'ทดสอบการส่ง SMS สำรองเมื่อ Push ไม่ตอบสนอง',
    projectId: 11,
    assigneeId: 'emp-013',
    supervisor: 'Korn Tawonphon',
    category: 'Testing',
    startDate: '2026-09-21',
    dueDate: '2026-10-09',
    status: 'completed',
    statusLabel: 'เสร็จสิ้น',
    progress: 100,
    priority: 'normal',
    estimatedHours: 12,
    description: 'ทดสอบระบบ Fallback ส่ง SMS เข้าเบอร์ช่างเวรเมื่อโทรศัพท์ไม่มีเน็ต',
  },

  // Project 12: ระบบทดสอบความแม่นยำเซนเซอร์ (in_progress, due soon)
  {
    id: 'task-24',
    title: 'ตรวจรับเครื่องเซนเซอร์ Vibration Lot แรก',
    projectId: 12,
    assigneeId: 'emp-014',
    supervisor: 'Supachai M.',
    category: 'Testing',
    startDate: '2026-10-01',
    dueDate: '2026-10-20',
    status: 'in_progress',
    statusLabel: 'กำลังดำเนินการ',
    progress: 70,
    priority: 'urgent',
    estimatedHours: 24,
    description: 'ตรวจรับเซนเซอร์ 40 ตัว ทดสอบ Calibration ก่อนนำเข้าสต๊อก',
  },
  {
    id: 'task-25',
    title: 'เขียนโปรแกรมเก็บค่าเบี่ยงเบนเซนเซอร์',
    projectId: 12,
    assigneeId: 'emp-020',
    supervisor: 'Korn Tawonphon',
    category: 'Backend',
    startDate: '2026-10-12',
    dueDate: '2026-10-27',
    status: 'in_progress',
    statusLabel: 'กำลังดำเนินการ',
    progress: 45,
    priority: 'high',
    estimatedHours: 20,
    description: 'โปรแกรม Python เก็บค่าอ่านจากเซนเซอร์ทุก 5 วินาที คำนวณ Std Dev อัตโนมัติ',
  },
  {
    id: 'task-38',
    title: 'จัดทำกราฟเปรียบเทียบความเสถียรของสัญญาณ',
    projectId: 12,
    assigneeId: 'emp-010',
    supervisor: 'Korn Tawonphon',
    category: 'Testing',
    startDate: '2026-10-20',
    dueDate: '2026-10-30',
    status: 'in_progress',
    statusLabel: 'กำลังดำเนินการ',
    progress: 30,
    priority: 'normal',
    estimatedHours: 16,
    description: 'สร้างรายงานเปรียบเทียบ Signal-to-Noise Ratio ระหว่างเซนเซอร์แต่ละรุ่น',
  },

  // Project 13: ระบบประเมินผลงาน Trainee (cancelled)
  {
    id: 'task-26',
    title: 'ออกแบบแบบฟอร์มประเมินผลงาน Trainee',
    projectId: 13,
    assigneeId: 'emp-012',
    supervisor: 'Supachai M.',
    category: 'Design',
    startDate: '2026-10-05',
    dueDate: '2026-10-25',
    status: 'not_started',
    statusLabel: 'รอเริ่มทำ',
    progress: 0,
    priority: 'low',
    estimatedHours: 12,
    description: 'ออกแบบแบบประเมิน 6 ด้าน คะแนนเต็ม 100 พร้อมเกณฑ์การผ่านของแต่ละด้าน',
  },
  {
    id: 'task-39',
    title: 'สำรวจหัวข้อเกณฑ์ประเมินจากพี่เลี้ยง',
    projectId: 13,
    assigneeId: 'emp-029',
    supervisor: 'Supachai M.',
    category: 'Documentation',
    startDate: '2026-10-08',
    dueDate: '2026-10-28',
    status: 'not_started',
    statusLabel: 'รอเริ่มทำ',
    progress: 0,
    priority: 'low',
    estimatedHours: 8,
    description: 'สัมภาษณ์หัวหน้าแผนก 5 คนเพื่อกำหนด Rubric ให้สอดคล้องกับการประเมินผล',
  },

  // Project 14: ระบบจัดการเอกสาร ISO (on_hold)
  {
    id: 'task-27',
    title: 'จัดโครงสร้างเอกสาร ISO 9001 หมวด 4-7',
    projectId: 14,
    assigneeId: 'emp-023',
    supervisor: 'Supachai M.',
    category: 'Documentation',
    startDate: '2026-09-14',
    dueDate: '2026-10-30',
    status: 'in_progress',
    statusLabel: 'กำลังดำเนินการ',
    progress: 60,
    priority: 'normal',
    estimatedHours: 30,
    description: 'จัดหมวดหมู่เอกสารคุณภาพตามโครงสร้าง ISO 9001:2015 และกำหนดรอบการทบทวน',
  },
  {
    id: 'task-28',
    title: 'พัฒนาระบบควบคุมเวอร์ชันเอกสาร',
    projectId: 14,
    assigneeId: 'emp-002',
    supervisor: 'Korn Tawonphon',
    category: 'Frontend',
    startDate: '2026-10-05',
    dueDate: '2026-11-06',
    status: 'in_progress',
    statusLabel: 'กำลังดำเนินการ',
    progress: 50,
    priority: 'high',
    estimatedHours: 36,
    description: 'ระบบ Version Control เอกสาร พร้อม Workflow ขออนุมัติก่อนเผยแพร่',
  },
  {
    id: 'task-29',
    title: 'ตรวจสอบเอกสาร ISO กับหัวหน้าแผนก QA',
    projectId: 14,
    assigneeId: 'emp-018',
    supervisor: 'Korn Tawonphon',
    category: 'Testing',
    startDate: '2026-11-02',
    dueDate: '2026-11-10',
    status: 'pending_review',
    statusLabel: 'รอการตรวจสอบ',
    progress: 90,
    priority: 'high',
    estimatedHours: 8,
    description: 'นัดตรวจทานเอกสารที่จัดหมวดแล้วกับ QA Lead ก่อนยื่นขอ Internal Audit',
  },
  {
    id: 'task-36',
    title: 'จัดทำแผน Internal Audit ISO ไตรมาสถัดไป',
    projectId: 14,
    assigneeId: 'emp-023',
    supervisor: 'Supachai M.',
    category: 'Documentation',
    startDate: '2026-11-16',
    dueDate: '2026-12-04',
    status: 'not_started',
    statusLabel: 'รอเริ่มทำ',
    progress: 0,
    priority: 'normal',
    estimatedHours: 14,
    description: 'วางแผนตรวจสอบภายใน ไตรมาส 1/2027 ครอบคลุมทุกแผนก พร้อมกำหนดผู้ตรวจและ Check List',
  },
  {
    id: 'task-40',
    title: 'จัดอบรมข้อกำหนด ISO ให้พนักงานใหม่',
    projectId: 14,
    assigneeId: 'emp-029',
    supervisor: 'Supachai M.',
    category: 'Documentation',
    startDate: '2026-11-09',
    dueDate: '2026-11-20',
    status: 'not_started',
    statusLabel: 'รอเริ่มทำ',
    progress: 0,
    priority: 'normal',
    estimatedHours: 12,
    description: 'หลักสูตรเบื้องต้นสร้างความเข้าใจนโยบายคุณภาพและขั้นตอนการควบคุมเอกสาร',
  },
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
// คำนวณ totalTasks, completedTasks, unfinishedTasks, progress จาก Tasks โดยตรง
export const MOCK_PROJECTS = RAW_PROJECTS.map((p) => {
  const relatedTasks = MOCK_TASKS.filter((t) => t.projectId === p.id);
  const totalTasks = relatedTasks.length;
  const completedTasks = relatedTasks.filter((t) => t.status === 'completed').length;
  const unfinishedTasks = totalTasks - completedTasks;
  const progress = totalTasks > 0
    ? Math.round(relatedTasks.reduce((sum, t) => sum + (t.progress || 0), 0) / totalTasks)
    : (p.status === 'done' ? 100 : 0);

  return {
    ...p,
    totalTasks,
    completedTasks,
    unfinishedTasks,
    progress,
  };
});

// Alias เพื่อความเข้ากันได้ 100% กับโค้ดเดิมที่เรียก MOCK_PROJECTS_FALLBACK
export const MOCK_PROJECTS_FALLBACK = MOCK_PROJECTS;

// ── 8. กิจกรรมล่าสุด (Recent Activities) ──────────────────────────────────
export const MOCK_ACTIVITIES = [
  {
    id: 'act-1',
    type: 'assignment',
    title: 'ได้รับมอบหมายงานใหม่',
    description: 'หัวหน้างานมอบหมายงาน "ออกแบบหน้าแรก Dashboard ตาม UI Spec"',
    time: '25 นาทีที่แล้ว',
  },
  {
    id: 'act-2',
    type: 'review',
    title: 'ส่งงานเพื่อรอการตรวจสอบ',
    description: 'ส่ง "เขียน Integration Test สำหรับ Projects API" ให้หัวหน้าตรวจ',
    time: '2 ชั่วโมงที่แล้ว',
  },
  {
    id: 'act-3',
    type: 'update',
    title: 'อัปเดตความคืบหน้าของงาน',
    description: 'ปรับความคืบหน้างาน "แก้ไขข้อผิดพลาดการคำนวณ Due Date" เป็น 60%',
    time: 'เมื่อวานนี้',
  },
  {
    id: 'act-4',
    type: 'completed',
    title: 'งานเสร็จสิ้นสมบูรณ์',
    description: '"กำหนด CSS Design Tokens และ Color Palette" ได้รับการอนุมัติแล้ว',
    time: '3 วันที่แล้ว',
  },
];

// ── 9. ชั่วโมงประมาณการ (Work Entries) ───────────────────────────────────
// บันทึก work entries จริงที่มีวันที่มีผลครอบคลุม Daily, Weekly, Monthly, Yearly
// อ้างอิง taskId, projectId, employeeId ที่ถูกต้องและตรงกันเสมอ
function createWorkEntries() {
  const entries = [];
  let counter = 1;

  const pushEntry = (empId, taskId, date, hours) => {
    const task = MOCK_TASKS.find((t) => t.id === taskId);
    if (!task) return;
    entries.push({
      id: `we-${String(counter++).padStart(3, '0')}`,
      employeeId: empId,
      taskId: taskId,
      projectId: task.projectId,
      date,
      hours: Number(hours),
    });
  };

  // วันนี้: 2026-10-27 (Daily Filter Test)
  pushEntry('emp-001', 'task-1', '2026-10-27', 4.0);
  pushEntry('emp-001', 'task-2', '2026-10-27', 2.0); // Kittipat รวม 6 ชม.
  pushEntry('emp-002', 'task-28', '2026-10-27', 5.5);
  pushEntry('emp-003', 'task-11', '2026-10-27', 6.0);
  pushEntry('emp-015', 'task-8', '2026-10-27', 4.0);
  pushEntry('emp-020', 'task-25', '2026-10-27', 3.5);
  pushEntry('emp-014', 'task-24', '2026-10-27', 4.0);

  // สัปดาห์ปัจจุบัน (2026-10-26 ถึง 2026-10-30: จันทร์-ศุกร์)
  // จันทร์ 2026-10-26
  pushEntry('emp-001', 'task-1', '2026-10-26', 4.5);
  pushEntry('emp-002', 'task-3', '2026-10-26', 4.0);
  pushEntry('emp-003', 'task-4', '2026-10-26', 3.0);
  pushEntry('emp-004', 'task-30', '2026-10-26', 3.5);
  pushEntry('emp-011', 'task-15', '2026-10-26', 4.0);
  pushEntry('emp-015', 'task-8', '2026-10-26', 5.0);

  // พุธ 2026-10-28
  pushEntry('emp-001', 'task-1', '2026-10-28', 5.0);
  pushEntry('emp-002', 'task-28', '2026-10-28', 4.5);
  pushEntry('emp-003', 'task-11', '2026-10-28', 5.0);
  pushEntry('emp-004', 'task-30', '2026-10-28', 3.0);
  pushEntry('emp-014', 'task-24', '2026-10-28', 4.5);
  pushEntry('emp-020', 'task-25', '2026-10-28', 4.0);
  pushEntry('emp-023', 'task-27', '2026-10-28', 4.0);

  // พฤหัสบดี 2026-10-29
  pushEntry('emp-001', 'task-2', '2026-10-29', 3.5);
  pushEntry('emp-002', 'task-3', '2026-10-29', 4.0);
  pushEntry('emp-015', 'task-8', '2026-10-29', 4.0);
  pushEntry('emp-020', 'task-14', '2026-10-29', 4.5);
  pushEntry('emp-025', 'task-10', '2026-10-29', 3.5);

  // ศุกร์ 2026-10-30
  pushEntry('emp-001', 'task-1', '2026-10-30', 4.0);
  pushEntry('emp-003', 'task-11', '2026-10-30', 4.5);
  pushEntry('emp-010', 'task-38', '2026-10-30', 4.0);
  pushEntry('emp-011', 'task-15', '2026-10-30', 3.5);
  pushEntry('emp-023', 'task-27', '2026-10-30', 4.0);

  // สัปดาห์ก่อนหน้าในเดือนตุลาคม 2026 (Monthly Filter Test)
  // สัปดาห์ 1 (1-2 ต.ค.)
  pushEntry('emp-001', 'task-1', '2026-10-01', 4.0);
  pushEntry('emp-001', 'task-1', '2026-10-02', 4.0);
  pushEntry('emp-014', 'task-24', '2026-10-01', 5.0);
  pushEntry('emp-014', 'task-24', '2026-10-02', 4.5);
  pushEntry('emp-030', 'task-23', '2026-10-02', 4.0);

  // สัปดาห์ 2 (5-9 ต.ค.)
  pushEntry('emp-001', 'task-2', '2026-10-05', 4.0);
  pushEntry('emp-001', 'task-2', '2026-10-06', 4.0);
  pushEntry('emp-002', 'task-28', '2026-10-05', 5.0);
  pushEntry('emp-002', 'task-28', '2026-10-07', 4.5);
  pushEntry('emp-003', 'task-11', '2026-10-06', 4.0);
  pushEntry('emp-003', 'task-11', '2026-10-08', 4.5);
  pushEntry('emp-005', 'task-7', '2026-10-07', 6.0);
  pushEntry('emp-005', 'task-7', '2026-10-08', 5.5);
  pushEntry('emp-013', 'task-37', '2026-10-09', 4.0);
  pushEntry('emp-015', 'task-8', '2026-10-08', 5.0);
  pushEntry('emp-025', 'task-10', '2026-10-06', 5.0);
  pushEntry('emp-025', 'task-10', '2026-10-09', 4.5);

  // สัปดาห์ 3 (12-16 ต.ค.)
  pushEntry('emp-001', 'task-6', '2026-10-12', 4.0);
  pushEntry('emp-001', 'task-6', '2026-10-13', 4.0);
  pushEntry('emp-002', 'task-3', '2026-10-14', 4.0);
  pushEntry('emp-004', 'task-30', '2026-10-14', 4.0);
  pushEntry('emp-015', 'task-13', '2026-10-13', 4.5);
  pushEntry('emp-015', 'task-13', '2026-10-14', 4.5);
  pushEntry('emp-016', 'task-12', '2026-10-15', 4.0);
  pushEntry('emp-016', 'task-12', '2026-10-16', 4.0);
  pushEntry('emp-020', 'task-14', '2026-10-15', 5.0);
  pushEntry('emp-020', 'task-25', '2026-10-16', 4.5);
  pushEntry('emp-023', 'task-27', '2026-10-15', 5.0);

  // สัปดาห์ 4 (19-23 ต.ค.)
  pushEntry('emp-001', 'task-1', '2026-10-19', 4.0);
  pushEntry('emp-002', 'task-3', '2026-10-20', 4.0);
  pushEntry('emp-003', 'task-4', '2026-10-21', 4.5);
  pushEntry('emp-003', 'task-4', '2026-10-22', 4.0);
  pushEntry('emp-011', 'task-15', '2026-10-20', 4.5);
  pushEntry('emp-011', 'task-15', '2026-10-22', 4.0);
  pushEntry('emp-014', 'task-24', '2026-10-21', 4.5);
  pushEntry('emp-015', 'task-8', '2026-10-22', 4.0);
  pushEntry('emp-016', 'task-12', '2026-10-20', 3.5);
  pushEntry('emp-020', 'task-14', '2026-10-21', 4.0);
  pushEntry('emp-023', 'task-27', '2026-10-22', 4.5);

  // เดือนก่อนหน้าในปี 2026 (Yearly Filter Test)
  // กรกฎาคม 2026
  pushEntry('emp-025', 'task-21', '2026-07-28', 5.0);
  pushEntry('emp-025', 'task-21', '2026-07-30', 5.0);

  // สิงหาคม 2026
  pushEntry('emp-010', 'task-22', '2026-08-11', 4.5);
  pushEntry('emp-010', 'task-22', '2026-08-14', 5.0);
  pushEntry('emp-012', 'task-20', '2026-08-25', 4.0);
  pushEntry('emp-013', 'task-19', '2026-08-05', 6.0);
  pushEntry('emp-013', 'task-19', '2026-08-12', 6.0);
  pushEntry('emp-025', 'task-21', '2026-08-04', 4.0);

  // กันยายน 2026
  pushEntry('emp-005', 'task-7', '2026-09-15', 5.0);
  pushEntry('emp-005', 'task-7', '2026-09-22', 6.0);
  pushEntry('emp-012', 'task-20', '2026-09-02', 4.0);
  pushEntry('emp-013', 'task-37', '2026-09-24', 4.0);
  pushEntry('emp-015', 'task-8', '2026-09-23', 5.0);
  pushEntry('emp-015', 'task-13', '2026-09-29', 4.5);
  pushEntry('emp-023', 'task-27', '2026-09-16', 5.0);
  pushEntry('emp-023', 'task-27', '2026-09-23', 5.0);
  pushEntry('emp-025', 'task-10', '2026-09-10', 5.0);
  pushEntry('emp-025', 'task-10', '2026-09-18', 6.0);
  pushEntry('emp-030', 'task-23', '2026-09-14', 6.0);
  pushEntry('emp-030', 'task-23', '2026-09-21', 6.0);

  return entries;
}

export const MOCK_WORK_ENTRIES = createWorkEntries();

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
