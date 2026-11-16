import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  CheckSquare,
  Layers,
  Users,
  PackageCheck,
  CalendarRange,
  History,
  Edit3,
  Search,
  X,
  UserPlus,
  FileText,
  Sparkles,
  Check,
  Plus,
  Trash2,
  Paperclip,
  Tag,
  ListOrdered,
  List,
  FolderPlus,
  Award,
  AlertCircle,
  UploadCloud,
  FileSpreadsheet,
  BookOpen,
  FolderKanban,
  ArrowRight
} from 'lucide-react';

// ============================================================================
// 1. THAI FORMATTING & DOMAIN CONSTANTS
// ============================================================================

const THAI_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.'
];

function formatThaiShortDate(isoDate) {
  if (!isoDate) return '—';
  const datePart = isoDate.split('T')[0];
  const parts = datePart.split('-');
  if (parts.length !== 3) return isoDate;
  const year = Number(parts[0]);
  const monthIdx = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  if (Number.isNaN(year) || monthIdx < 0 || monthIdx > 11 || Number.isNaN(day)) {
    return isoDate;
  }
  return `${day} ${THAI_MONTHS_SHORT[monthIdx]} ${year}`;
}

function calculateDurationDays(startDate, dueDate) {
  if (!startDate || !dueDate) return null;
  const sPart = startDate.split('T')[0];
  const ePart = dueDate.split('T')[0];
  const start = new Date(`${sPart}T00:00:00`).getTime();
  const end = new Date(`${ePart}T00:00:00`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return Math.round((end - start) / (24 * 60 * 60 * 1000)) + 1;
}

function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '240 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MECHA_STAFF = [
  {
    id: 'EMP001',
    empNo: 'EMP001',
    initials: 'SM',
    name: 'Supachai Meesuk',
    email: 'supachai.m@mecha.local',
    role: 'Supervisor',
    department: 'Mechanical Automation & Software'
  },
  {
    id: 'EMP014',
    empNo: 'EMP014',
    initials: 'NC',
    name: 'Napat Chaivaphon',
    email: 'napat.c@mecha.local',
    role: 'Software Developer',
    department: 'Mechanical Automation & Software'
  },
  {
    id: 'EMP008',
    empNo: 'EMP008',
    initials: 'KT',
    name: 'Korn Tawonphon',
    email: 'korn.t@mecha.local',
    role: 'Senior Developer',
    department: 'Mechanical Automation & Software'
  },
  {
    id: 'EMP023',
    empNo: 'EMP023',
    initials: 'KS',
    name: 'Kittipat Samran',
    email: 'kittipat.s@mecha.local',
    role: 'Trainee',
    department: 'Mechanical Automation & Software'
  },
  {
    id: 'EMP019',
    empNo: 'EMP019',
    initials: 'KW',
    name: 'Kanokwan Srisai',
    email: 'kanokwan.s@mecha.local',
    role: 'QA & Safety Engineer',
    department: 'Quality Assurance'
  }
];

const LABEL_COLOR_SWATCHES = [
  { id: 'rose', hex: '#F43F5E', bg: 'bg-rose-500', softBg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  { id: 'orange', hex: '#F97316', bg: 'bg-orange-500', softBg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  { id: 'amber', hex: '#F59E0B', bg: 'bg-amber-500', softBg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  { id: 'lime', hex: '#84CC16', bg: 'bg-lime-500', softBg: 'bg-lime-50', text: 'text-lime-800', border: 'border-lime-200' },
  { id: 'emerald', hex: '#10B981', bg: 'bg-emerald-500', softBg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  { id: 'teal', hex: '#14B8A6', bg: 'bg-teal-500', softBg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  { id: 'cyan', hex: '#06B6D4', bg: 'bg-cyan-500', softBg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  { id: 'sky', hex: '#0EA5E9', bg: 'bg-sky-500', softBg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  { id: 'blue', hex: '#3B82F6', bg: 'bg-blue-500', softBg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  { id: 'indigo', hex: '#6366F1', bg: 'bg-indigo-500', softBg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  { id: 'violet', hex: '#8B5CF6', bg: 'bg-violet-500', softBg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  { id: 'purple', hex: '#A855F7', bg: 'bg-purple-500', softBg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  { id: 'fuchsia', hex: '#D946EF', bg: 'bg-fuchsia-500', softBg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-200' },
  { id: 'pink', hex: '#EC4899', bg: 'bg-pink-500', softBg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  { id: 'slate', hex: '#64748B', bg: 'bg-slate-500', softBg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  { id: 'stone', hex: '#78716C', bg: 'bg-stone-600', softBg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-300' }
];

const INITIAL_SAVED_LABELS = [
  { id: 'LBL-1', name: 'DOGE', colorId: 'pink' },
  { id: 'LBL-2', name: 'FPCA', colorId: 'violet' },
  { id: 'LBL-3', name: 'General', colorId: 'amber' },
  { id: 'LBL-4', name: 'MMS', colorId: 'emerald' },
  { id: 'LBL-5', name: 'PCBA', colorId: 'rose' },
  { id: 'LBL-6', name: 'PCMC', colorId: 'blue' },
  { id: 'LBL-7', name: 'Shipment', colorId: 'fuchsia' },
  { id: 'LBL-8', name: 'SMART', colorId: 'orange' },
  { id: 'LBL-9', name: 'Training', colorId: 'lime' }
];

const TASK_PRIORITY_OPTIONS = [
  { id: 'none', label: 'None', dotClass: 'bg-slate-400', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' },
  { id: 'low', label: 'ต่ำ (Low)', dotClass: 'bg-sky-500', badgeClass: 'bg-sky-50 text-sky-700 border-sky-200' },
  { id: 'medium', label: 'ปกติ (Medium)', dotClass: 'bg-indigo-500', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'high', label: 'สูง (High)', dotClass: 'bg-amber-500', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200' },
  { id: 'urgent', label: 'ด่วนมาก (Urgent)', dotClass: 'bg-rose-500', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' }
];

const PROJECT_STATUS_CONFIG = {
  done: {
    label: 'เสร็จแล้ว',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/90',
    dotClass: 'bg-emerald-500'
  },
  in_progress: {
    label: 'กำลังดำเนินการ',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/90',
    dotClass: 'bg-blue-600'
  },
  not_started: {
    label: 'ยังไม่เริ่ม',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    dotClass: 'bg-slate-400'
  }
};

const PROJECT_PRIORITY_CONFIG = {
  low: {
    label: 'ต่ำ (Low)',
    headerLabel: 'ความสำคัญ: ต่ำ (Low)',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200'
  },
  medium: {
    label: 'ปกติ (Medium)',
    headerLabel: 'ความสำคัญ: ปกติ (Medium)',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200/90'
  },
  high: {
    label: 'สูง (High)',
    headerLabel: 'ความสำคัญ: สูง (High)',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/90'
  },
  urgent: {
    label: 'ด่วนที่สุด (Urgent)',
    headerLabel: 'ความสำคัญ: ด่วนที่สุด (Urgent)',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/90'
  }
};

const ATTACHMENT_CATEGORIES = [
  {
    id: 'File Upload',
    buttonLabel: '+ File Upload',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: Paperclip
  },
  {
    id: 'Production Plan',
    buttonLabel: '+ Production Plan',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: FileSpreadsheet
  },
  {
    id: 'E-SOP',
    buttonLabel: '+ E-SOP',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: BookOpen
  }
];

// ============================================================================
// 2. INITIAL PROJECTS & TASKS DATA
// ============================================================================

const INITIAL_PROJECTS = [
  {
    id: 'PRJ-001',
    name: 'คู่มือความปลอดภัยสองภาษา',
    description: 'คู่มือความปลอดภัยในการทำงานภาษาไทย-อังกฤษสำหรับพนักงานและผู้เยี่ยมชม',
    status: 'done',
    priority: 'medium',
    category: 'เอกสารและการฝึกอบรม',
    owner: MECHA_STAFF[0],
    startDate: '2026-07-06',
    dueDate: '2026-08-14',
    timelineElapsedPercent: 100,
    deliverableSummary: 'คู่มือความปลอดภัยฉบับสมบูรณ์ภาษาไทย-อังกฤษ (PDF & E-SOP)'
  },
  {
    id: 'PRJ-002',
    name: 'ระบบติดตามสายการผลิตอัจฉริยะ (SMART Line)',
    description: 'พัฒนาระบบแดชบอร์ดแสดงผลประสิทธิภาพเครื่องจักรแบบเรียลไทม์สำหรับสายการประกอบ PCBA',
    status: 'in_progress',
    priority: 'high',
    category: 'ระบบซอฟต์แวร์',
    owner: MECHA_STAFF[2],
    startDate: '2026-11-01',
    dueDate: '2026-12-20',
    timelineElapsedPercent: 35,
    deliverableSummary: 'Web Dashboard และระบบแจ้งเตือนสถานะเครื่องจักรอัตโนมัติ'
  }
];

const INITIAL_TASKS = [
  {
    id: 'TSK-101',
    projectId: 'PRJ-001',
    title: 'แปลคู่มือความปลอดภัยฉบับภาษาอังกฤษ',
    status: 'completed',
    statusLabel: 'เสร็จสิ้น',
    priority: 'medium',
    assignees: [MECHA_STAFF[0]],
    labels: ['Training', 'General'],
    startDate: '2026-07-06',
    dueDate: '2026-07-29',
    description:
      '1. แปลเนื้อหามาตรฐานความปลอดภัยในการปฏิบัติงานและข้อบังคับสำหรับผู้เยี่ยมชมโรงงานจากภาษาไทยเป็นภาษาอังกฤษ\n2. ตรวจสอบคำศัพท์เฉพาะทางด้านวิศวกรรมและความปลอดภัย',
    checklist: [
      { id: 'CHK-1', text: 'แปลหมวดข้อบังคับพื้นที่การผลิต', done: true },
      { id: 'CHK-2', text: 'ตรวจสอบคำศัพท์อุปกรณ์ป้องกันส่วนบุคคล (PPE)', done: true }
    ],
    attachments: [
      {
        id: 'ATT-1',
        name: 'Safety_Manual_Bilingual_Draft_v1.pdf',
        size: '1.4 MB',
        category: 'E-SOP'
      }
    ],
    benefitDetails: 'พนักงานต่างชาติและผู้เยี่ยมชมเข้าใจกฎความปลอดภัยได้ตรงกัน 100%'
  },
  {
    id: 'TSK-102',
    projectId: 'PRJ-001',
    title: 'ตรวจทานคู่มือความปลอดภัยกับฝ่ายความปลอดภัย',
    status: 'completed',
    statusLabel: 'เสร็จสิ้น',
    priority: 'medium',
    assignees: [MECHA_STAFF[0]],
    labels: ['Training'],
    startDate: '2026-07-30',
    dueDate: '2026-08-14',
    description:
      '1. ส่งร่างคู่มือความปลอดภัยสองภาษาให้เจ้าหน้าที่ความปลอดภัยในการทำงาน (จป.) ตรวจสอบ\n2. ปรับปรุงสัญลักษณ์เตือนและขั้นตอนปฏิบัติฉุกเฉินก่อนเผยแพร่',
    checklist: [
      { id: 'CHK-3', text: 'ตรวจทานสัญลักษณ์ป้ายเตือนมาตรฐานสากล', done: true },
      { id: 'CHK-4', text: 'ลงนามอนุมัติเผยแพร่ฉบับจริง', done: true }
    ],
    attachments: [
      {
        id: 'ATT-2',
        name: 'Safety_Approval_SignOff_2026.pdf',
        size: '620 KB',
        category: 'File Upload'
      }
    ],
    benefitDetails: 'ผ่านการตรวจประเมินมาตรฐานความปลอดภัยประจำปีโดยไม่มีข้อบกพร่อง'
  },
  {
    id: 'TSK-201',
    projectId: 'PRJ-002',
    title: 'ออกแบบโครงสร้างฐานข้อมูล Telemetry เครื่องจักร',
    status: 'in_progress',
    statusLabel: 'กำลังทำ',
    priority: 'high',
    assignees: [MECHA_STAFF[1], MECHA_STAFF[2]],
    labels: ['SMART', 'PCBA'],
    startDate: '2026-11-02',
    dueDate: '2026-11-25',
    description:
      '1. ออกแบบ Schema สำหรับจัดเก็บข้อมูล Cycle Time และสถานะเซ็นเซอร์\n2. ทดสอบการเชื่อมต่อกับ PLC หลักในสายการผลิต',
    checklist: [
      { id: 'CHK-5', text: 'กำหนดโครงสร้างตาราง Time-series', done: true },
      { id: 'CHK-6', text: 'ทดสอบ Stress Test การรับข้อมูลพร้อมกัน', done: false }
    ],
    attachments: [
      {
        id: 'ATT-3',
        name: 'PCBA_Line1_Production_Plan_Q4.xlsx',
        size: '890 KB',
        category: 'Production Plan'
      }
    ],
    benefitDetails: ''
  }
];

const INITIAL_NOTIFICATIONS = [
  {
    id: 'NTF-01',
    title: 'งานทั้งหมดในโปรเจกต์เสร็จสมบูรณ์แล้ว',
    detail: 'คู่มือความปลอดภัยสองภาษา ดำเนินการครบ 2 จาก 2 งาน (100%)',
    time: '14 ส.ค. 2026',
    unread: true
  },
  {
    id: 'NTF-02',
    title: 'อนุมัติตรวจทานคู่มือความปลอดภัยเรียบร้อย',
    detail: 'Supachai Meesuk บันทึกสถานะเสร็จสิ้นในงาน TSK-102',
    time: '14 ส.ค. 2026',
    unread: true
  }
];

const INITIAL_ACTIVITIES = [
  {
    id: 'ACT-01',
    projectId: 'PRJ-001',
    actor: MECHA_STAFF[0],
    action: 'บันทึกสถานะเสร็จสิ้นในงาน "ตรวจทานคู่มือความปลอดภัยกับฝ่ายความปลอดภัย"',
    time: '14 ส.ค. 2026 · 16:20 น.'
  },
  {
    id: 'ACT-02',
    projectId: 'PRJ-001',
    actor: MECHA_STAFF[0],
    action: 'แนบเอกสาร E-SOP "Safety_Manual_Bilingual_Draft_v1.pdf"',
    time: '29 ก.ค. 2026 · 11:05 น.'
  }
];

const WORKSPACE_TABS = [
  { id: 'overview', label: 'ภาพรวม', enLabel: 'Overview', icon: Compass },
  { id: 'tasks', label: 'งาน', enLabel: 'Tasks', icon: CheckSquare, countKey: 'tasks' },
  { id: 'board', label: 'บอร์ด', enLabel: 'Board', icon: Layers },
  { id: 'team', label: 'ทีม', enLabel: 'Team', icon: Users },
  { id: 'deliverables', label: 'สิ่งที่ส่งมอบ', enLabel: 'Deliverables', icon: PackageCheck },
  { id: 'timeline', label: 'ไทม์ไลน์', enLabel: 'Timeline', icon: CalendarRange },
  { id: 'activity', label: 'ประวัติ', enLabel: 'Activity', icon: History }
];

// ============================================================================
// 3. CIRCULAR PROGRESS RING COMPONENT
// ============================================================================

function CircularProgressRing({ percentage = 100, size = 64, strokeWidth = 6 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percentage));
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90 transform">
        <defs>
          <linearGradient id="mechaProgressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#4F46E5" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="url(#mechaProgressGrad)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <span className="absolute text-sm font-extrabold text-slate-900 tracking-tight font-num">
        {clamped}%
      </span>
    </div>
  );
}

// ============================================================================
// 4. REDESIGNED "สร้างงานใหม่ (NEW TASK)" MODAL COMPONENT
// ============================================================================

function NewTaskModal({
  isOpen,
  onClose,
  onCreateTask,
  activeProject,
  savedLabels,
  onAddSavedLabel,
  onDeleteSavedLabel
}) {
  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState(false);
  const [description, setDescription] = useState('');

  // Checklist state
  const [checklist, setChecklist] = useState([]);
  const [newCheckText, setNewCheckText] = useState('');

  // Attachments state
  const [selectedAttachmentCategory, setSelectedAttachmentCategory] = useState('File Upload');
  const [attachments, setAttachments] = useState([]);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef(null);

  // Assignees search & selection state
  const [assigneeQuery, setAssigneeQuery] = useState('');
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
  const [selectedAssignees, setSelectedAssignees] = useState([]);

  // Dates state
  const [startDate, setStartDate] = useState('2026-11-12T09:00');
  const [dueDate, setDueDate] = useState('2026-11-15T17:00');

  // Priority state
  const [priority, setPriority] = useState('none');

  // Labels selection & creator state
  const [selectedLabelNames, setSelectedLabelNames] = useState([]);
  const [labelCreatorOpen, setLabelCreatorOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColorId, setNewLabelColorId] = useState('indigo');
  const [manageDeleteLabels, setManageDeleteLabels] = useState(false);

  // Task status & Benefit Details
  const [isDone, setIsDone] = useState(false);
  const [benefitDetails, setBenefitDetails] = useState('');

  const descriptionRef = useRef(null);

  // Filtered MECHA staff for autocomplete
  const filteredStaff = useMemo(() => {
    const q = assigneeQuery.trim().toLowerCase();
    return MECHA_STAFF.filter((staff) => {
      const alreadySelected = selectedAssignees.some((s) => s.id === staff.id);
      if (alreadySelected) return false;
      if (!q) return true;
      return (
        staff.name.toLowerCase().includes(q) ||
        staff.empNo.toLowerCase().includes(q) ||
        staff.department.toLowerCase().includes(q) ||
        staff.role.toLowerCase().includes(q)
      );
    });
  }, [assigneeQuery, selectedAssignees]);

  // Checklist progress calculation
  const checklistStats = useMemo(() => {
    const total = checklist.length;
    const completed = checklist.filter((item) => item.done).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, percent };
  }, [checklist]);

  // Duration calculation
  const taskDurationDays = useMemo(
    () => calculateDurationDays(startDate, dueDate),
    [startDate, dueDate]
  );

  if (!isOpen) return null;

  // Quick-fill realistic Thai/English demo data
  const handleQuickFillExample = () => {
    setTitle('Present โปรเจค Do it & สรุปแผนงานทีม');
    setTitleError(false);
    setDescription(
      '1. สรุปภาพรวมความคืบหน้าและผลลัพธ์สำคัญของโปรเจกต์\n2. นำเสนอแผนการส่งมอบเอกสาร E-SOP และตารางฝึกอบรมพนักงาน\n3. เปิดรับข้อเสนอแนะจากหัวหน้างานและทีมที่เกี่ยวข้อง'
    );
    setChecklist([
      { id: 'DEMO-C1', text: 'เตรียมสไลด์นำเสนอภาพรวมโปรเจกต์ (10 หน้า)', done: true },
      { id: 'DEMO-C2', text: 'ตรวจสอบตัวเลขความคืบหน้าและไฟล์แนบ E-SOP', done: false },
      { id: 'DEMO-C3', text: 'ซ้อมนำเสนอและจับเวลา 15 นาที', done: false }
    ]);
    setSelectedAssignees([MECHA_STAFF[0], MECHA_STAFF[1]]);
    setSelectedLabelNames(['SMART', 'Training', 'General']);
    setPriority('high');
    setAttachments([
      {
        id: 'DEMO-A1',
        name: 'Do_It_Project_Presentation_v2.pdf',
        size: '2.4 MB',
        category: 'E-SOP'
      },
      {
        id: 'DEMO-A2',
        name: 'Line_Schedule_Production_Plan.xlsx',
        size: '540 KB',
        category: 'Production Plan'
      }
    ]);
  };

  // Description formatting helpers
  const insertNumberedLine = () => {
    const lines = description ? description.split('\n') : [];
    const nextNum = lines.length + 1;
    const prefix = description && !description.endsWith('\n') ? '\n' : '';
    setDescription(`${description}${prefix}${nextNum}. `);
    descriptionRef.current?.focus();
  };

  const insertBulletLine = () => {
    const prefix = description && !description.endsWith('\n') ? '\n' : '';
    setDescription(`${description}${prefix}• `);
    descriptionRef.current?.focus();
  };

  // Checklist handlers
  const handleAddChecklistItem = () => {
    const trimmed = newCheckText.trim();
    if (!trimmed) return;
    setChecklist((prev) => [
      ...prev,
      { id: `CHK-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text: trimmed, done: false }
    ]);
    setNewCheckText('');
  };

  const toggleChecklistItem = (id) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    );
  };

  const removeChecklistItem = (id) => {
    setChecklist((prev) => prev.filter((item) => item.id !== id));
  };

  // Attachment handlers
  const handleFilesAdded = (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const newItems = Array.from(fileList).map((file, idx) => ({
      id: `ATT-${Date.now()}-${idx}`,
      name: file.name,
      size: formatFileSize(file.size),
      category: selectedAttachmentCategory
    }));
    setAttachments((prev) => [...prev, ...newItems]);
  };

  const handleAttachSampleFile = () => {
    const sampleMap = {
      'File Upload': { name: 'Meeting_Notes_Summary.pdf', size: '380 KB' },
      'Production Plan': { name: 'Production_Plan_W46_2026.xlsx', size: '740 KB' },
      'E-SOP': { name: 'E-SOP_Safety_Standard_Rev04.pdf', size: '1.8 MB' }
    };
    const chosen = sampleMap[selectedAttachmentCategory] || sampleMap['File Upload'];
    setAttachments((prev) => [
      ...prev,
      {
        id: `ATT-${Date.now()}`,
        name: chosen.name,
        size: chosen.size,
        category: selectedAttachmentCategory
      }
    ]);
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Quick date duration pills
  const applyQuickDatePreset = (offsetDays) => {
    const base = new Date('2026-11-12T09:00:00');
    const startStr = '2026-11-12T09:00';
    const target = new Date(base.getTime() + offsetDays * 24 * 60 * 60 * 1000);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    setStartDate(startStr);
    setDueDate(`${yyyy}-${mm}-${dd}T17:00`);
  };

  // Label toggle & creation
  const toggleLabelSelection = (labelName) => {
    setSelectedLabelNames((prev) =>
      prev.includes(labelName)
        ? prev.filter((n) => n !== labelName)
        : [...prev, labelName]
    );
  };

  const handleSaveNewLabel = () => {
    const trimmed = newLabelName.trim();
    if (!trimmed) return;
    onAddSavedLabel(trimmed, newLabelColorId);
    if (!selectedLabelNames.includes(trimmed)) {
      setSelectedLabelNames((prev) => [...prev, trimmed]);
    }
    setNewLabelName('');
  };

  // Submit Task
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setTitleError(true);
      return;
    }

    const createdTask = {
      id: `TSK-${Math.floor(300 + Math.random() * 699)}`,
      projectId: activeProject.id,
      title: title.trim(),
      status: isDone ? 'completed' : 'not_started',
      statusLabel: isDone ? 'เสร็จสิ้น' : 'ยังไม่เริ่ม',
      priority,
      assignees: selectedAssignees.length > 0 ? selectedAssignees : [activeProject.owner],
      labels: selectedLabelNames,
      startDate: startDate ? startDate.split('T')[0] : activeProject.startDate,
      dueDate: dueDate ? dueDate.split('T')[0] : activeProject.dueDate,
      description:
        description.trim() || 'สร้างรายการงานใหม่ในพื้นที่ทำงานโปรเจกต์',
      checklist,
      attachments,
      benefitDetails: isDone ? benefitDetails.trim() : ''
    };

    onCreateTask(createdTask);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 lg:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-task-modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Centered Spacious Modal Container */}
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col max-h-[94vh] overflow-hidden"
      >
        {/* Top Subtle Accent Bar */}
        <div className="h-1 w-full bg-gradient-to-r from-indigo-600 via-blue-600 to-emerald-500 shrink-0" />

        {/* STICKY MODAL HEADER */}
        <div className="px-5 sm:px-7 py-4 bg-white border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="new-task-modal-title"
                  className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight"
                >
                  สร้างงานใหม่ (New Task)
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 max-w-[260px] truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                  <span className="truncate">โปรเจกต์: {activeProject.name}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block mt-0.5">
                กำหนดรายละเอียดงาน ผู้รับผิดชอบ ป้ายกำกับ รายการย่อย และไฟล์แนบ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleQuickFillExample}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 text-xs font-bold transition-colors"
              title="เติมข้อมูลตัวอย่างเพื่อทดสอบ"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>เติมตัวอย่าง</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="ปิดหน้าต่างสร้างงานใหม่"
              className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* SCROLLABLE BODY — TWO-COLUMN LAYOUT (7 Cols Left / 5 Cols Right) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 bg-[#F8FAFC]/60">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ==============================================================
                LEFT COLUMN (7 Cols): TITLE, DESCRIPTION, CHECKLIST, ATTACHMENTS
               ============================================================== */}
            <div className="lg:col-span-7 space-y-5">
              {/* 1. TITLE (หัวข้องาน) */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="new-task-title"
                      className="text-xs font-bold text-slate-800 flex items-center gap-1"
                    >
                      <span>TITLE (หัวข้องาน)</span>
                      <span className="text-rose-500 font-extrabold">*</span>
                    </label>
                    {titleError && (
                      <span className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        กรุณาระบุหัวข้องาน
                      </span>
                    )}
                  </div>
                  <input
                    id="new-task-title"
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (e.target.value.trim()) setTitleError(false);
                    }}
                    placeholder="เช่น Present โปรเจค Do it..."
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 transition-all ${
                      titleError
                        ? 'border-rose-300 bg-rose-50/30 focus:ring-rose-500'
                        : 'border-slate-200 bg-white focus:border-indigo-500 focus:ring-indigo-500/20'
                    }`}
                  />
                </div>

                {/* 2. DESCRIPTION (รายละเอียดงาน) */}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <label
                      htmlFor="new-task-desc"
                      className="text-xs font-bold text-slate-800"
                    >
                      DESCRIPTION (รายละเอียดงาน)
                    </label>
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={insertNumberedLine}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-[11px] font-semibold transition-colors"
                      >
                        <ListOrdered className="w-3 h-3 text-indigo-600" />
                        <span>เพิ่มเลขข้อ 1. 2.</span>
                      </button>
                      <button
                        type="button"
                        onClick={insertBulletLine}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-[11px] font-semibold transition-colors"
                      >
                        <List className="w-3 h-3 text-indigo-600" />
                        <span>เพิ่ม Bullet •</span>
                      </button>
                    </div>
                  </div>
                  <textarea
                    id="new-task-desc"
                    ref={descriptionRef}
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="ระบุขั้นตอนการทำงาน เป้าหมาย หรือขอบเขตของงานนี้..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 leading-relaxed focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
              </div>

              {/* 3. CHECKLIST (รายการย่อย) */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-xs font-bold text-slate-800">
                      CHECKLIST (รายการย่อย)
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 font-num">
                    {checklistStats.percent}% ({checklistStats.completed}/{checklistStats.total})
                  </span>
                </div>

                {/* Live Checklist Progress Bar */}
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${checklistStats.percent}%` }}
                  />
                </div>

                {/* Inline Add Checklist Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCheckText}
                    onChange={(e) => setNewCheckText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddChecklistItem();
                      }
                    }}
                    placeholder="เพิ่มรายการย่อยใหม่ แล้วกด Enter..."
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button
                    type="button"
                    onClick={handleAddChecklistItem}
                    className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่ม</span>
                  </button>
                </div>

                {/* Checklist Items List */}
                {checklist.length > 0 ? (
                  <ul className="space-y-1.5 pt-1">
                    {checklist.map((item) => (
                      <li
                        key={item.id}
                        className="group flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 border border-slate-100 transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => toggleChecklistItem(item.id)}
                          className="flex items-center gap-2.5 text-left flex-1 min-w-0"
                        >
                          <span
                            className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                              item.done
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'bg-white border-slate-300 group-hover:border-indigo-400'
                            }`}
                          >
                            {item.done && <Check className="w-3 h-3 stroke-[3]" />}
                          </span>
                          <span
                            className={`text-xs truncate ${
                              item.done
                                ? 'line-through text-slate-400'
                                : 'text-slate-800 font-medium'
                            }`}
                          >
                            {item.text}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeChecklistItem(item.id)}
                          aria-label="ลบรายการย่อย"
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-slate-400 text-center py-1">
                    ยังไม่มีรายการย่อย — พิมพ์ด้านบนเพื่อแบ่งขั้นตอนงานย่อย
                  </p>
                )}
              </div>

              {/* 4. ATTACHMENTS (ไฟล์แนบ) */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-xs font-bold text-slate-800">
                      ATTACHMENTS (ไฟล์แนบ)
                    </h3>
                  </div>

                  {/* Segmented Attachment Category Selector */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {ATTACHMENT_CATEGORIES.map((cat) => {
                      const active = selectedAttachmentCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedAttachmentCategory(cat.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                            active
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {cat.buttonLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Drag-and-Drop / Click-to-Attach Dropzone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(false);
                    handleFilesAdded(e.dataTransfer.files);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  className={`rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-all ${
                    isDraggingFile
                      ? 'border-indigo-500 bg-indigo-50/70'
                      : 'border-slate-200 hover:border-indigo-400 bg-slate-50/60 hover:bg-indigo-50/30'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      handleFilesAdded(e.target.files);
                      e.target.value = '';
                    }}
                  />
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-indigo-600 flex items-center justify-center shadow-2xs shrink-0">
                      <UploadCloud className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-800">
                        เลือกไฟล์ หรือคลิกเพื่อแนบเอกสารตามประเภทที่เลือก (
                        <span className="text-indigo-600">{selectedAttachmentCategory}</span>)
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        รองรับ PDF, XLSX, DOCX, PNG หรือ{' '}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAttachSampleFile();
                          }}
                          className="font-bold text-indigo-600 hover:underline"
                        >
                          + แนบไฟล์ตัวอย่าง ({selectedAttachmentCategory})
                        </button>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Attached File Cards */}
                {attachments.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {attachments.map((file) => {
                      const catMeta =
                        ATTACHMENT_CATEGORIES.find((c) => c.id === file.category) ||
                        ATTACHMENT_CATEGORIES[0];
                      const CatIcon = catMeta.icon;
                      return (
                        <div
                          key={file.id}
                          className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-indigo-600 flex items-center justify-center shrink-0">
                              <CatIcon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">
                                {file.name}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${catMeta.badgeClass}`}
                                >
                                  {file.category}
                                </span>
                                <span className="text-[10px] text-slate-400 font-num">
                                  {file.size}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(file.id)}
                            aria-label="ลบไฟล์แนบ"
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ==============================================================
                RIGHT COLUMN (5 Cols): DETAILS, ASSIGNEE, DATES, PRIORITY, LABELS, STATUS
               ============================================================== */}
            <div className="lg:col-span-5 space-y-5">
              {/* 1. DETAILS: ASSIGNED TO + START/DUE DATES */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  DETAILS (กำหนดเป้าหมายและผู้รับผิดชอบ)
                </h3>

                {/* Assigned To Autocomplete */}
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Assigned To (ผู้รับผิดชอบ)
                  </label>

                  {/* Selected Assignee Chips */}
                  {selectedAssignees.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {selectedAssignees.map((person) => (
                        <span
                          key={person.id}
                          className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200/90 text-xs font-semibold"
                        >
                          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                            {person.initials}
                          </span>
                          <span>{person.name}</span>
                          <span className="text-[10px] text-indigo-500 font-mono">
                            {person.empNo}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedAssignees((prev) =>
                                prev.filter((p) => p.id !== person.id)
                              )
                            }
                            aria-label={`นำ ${person.name} ออก`}
                            className="ml-0.5 text-indigo-400 hover:text-rose-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={assigneeQuery}
                      onFocus={() => setAssigneeDropdownOpen(true)}
                      onChange={(e) => {
                        setAssigneeQuery(e.target.value);
                        setAssigneeDropdownOpen(true);
                      }}
                      placeholder="ค้นหาชื่อพนักงาน หรือรหัสพนักงาน (Emp No)..."
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  {/* Autocomplete Dropdown */}
                  {assigneeDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setAssigneeDropdownOpen(false)}
                      />
                      <div className="absolute left-0 right-0 mt-1.5 bg-white rounded-xl border border-slate-200 shadow-xl z-20 max-h-52 overflow-y-auto divide-y divide-slate-100">
                        {filteredStaff.length === 0 ? (
                          <div className="p-3 text-center text-xs text-slate-400">
                            ไม่พบรายชื่อพนักงานเพิ่มเติม
                          </div>
                        ) : (
                          filteredStaff.map((staff) => (
                            <button
                              key={staff.id}
                              type="button"
                              onClick={() => {
                                setSelectedAssignees((prev) => [...prev, staff]);
                                setAssigneeQuery('');
                                setAssigneeDropdownOpen(false);
                              }}
                              className="w-full px-3.5 py-2.5 text-left hover:bg-indigo-50/70 flex items-center justify-between gap-2 transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                                  {staff.initials}
                                </span>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-slate-900 truncate">
                                    {staff.name}
                                  </div>
                                  <div className="text-[11px] text-slate-500 truncate">
                                    {staff.role} · {staff.department}
                                  </div>
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-[10px] font-bold shrink-0">
                                {staff.empNo}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Start Date & Due Date Side-by-Side */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <span className="text-xs font-bold text-slate-700">
                      ช่วงเวลาดำเนินงาน
                    </span>
                    <div className="flex items-center gap-1">
                      {[
                        { label: 'วันนี้', days: 0 },
                        { label: 'พรุ่งนี้', days: 1 },
                        { label: '+3 วัน', days: 3 },
                        { label: '+7 วัน', days: 7 }
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => applyQuickDatePreset(preset.days)}
                          className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-[10px] font-bold text-slate-600 transition-colors"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Start Date (วันที่เริ่มต้น)
                      </label>
                      <input
                        type="datetime-local"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 font-num focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Due Date (วันที่สิ้นสุด)
                      </label>
                      <input
                        type="datetime-local"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 font-num focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {taskDurationDays !== null && (
                    <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 font-num">
                      <span>
                        {formatThaiShortDate(startDate)} → {formatThaiShortDate(dueDate)}
                      </span>
                      <span className="font-bold text-indigo-700">
                        ระยะเวลา {taskDurationDays} วัน
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. PRIORITY (ระดับความสำคัญ) — Visual Pill Selector */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-2.5">
                <label className="block text-xs font-bold text-slate-800">
                  Priority (ระดับความสำคัญ)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {TASK_PRIORITY_OPTIONS.map((opt) => {
                    const selected = priority === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPriority(opt.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          selected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${opt.dotClass}`} />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. LABELS (ป้ายกำกับ) — Deduplicated & Clean Toggle Pills */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-600" />
                    <h3 className="text-xs font-bold text-slate-800">LABELS (ป้ายกำกับ)</h3>
                    {selectedLabelNames.length > 0 && (
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 font-num">
                        เลือก {selectedLabelNames.length}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setLabelCreatorOpen((prev) => !prev)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700"
                  >
                    <span>+ สร้าง / จัดการป้ายกำกับ</span>
                    {labelCreatorOpen ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Clean Deduplicated Saved Label Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {savedLabels.map((lbl) => {
                    const swatch =
                      LABEL_COLOR_SWATCHES.find((c) => c.id === lbl.colorId) ||
                      LABEL_COLOR_SWATCHES[0];
                    const isSelected = selectedLabelNames.includes(lbl.name);
                    return (
                      <div key={lbl.id} className="relative inline-flex items-center">
                        <button
                          type="button"
                          onClick={() => toggleLabelSelection(lbl.name)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                            isSelected
                              ? `${swatch.bg} text-white border-transparent shadow-2xs ring-2 ring-offset-1 ring-slate-300`
                              : `${swatch.softBg} ${swatch.text} ${swatch.border} hover:opacity-90`
                          }`}
                        >
                          {isSelected ? (
                            <Check className="w-3 h-3 stroke-[3]" />
                          ) : (
                            <span className={`w-2 h-2 rounded-full ${swatch.bg}`} />
                          )}
                          <span>{lbl.name}</span>
                        </button>

                        {manageDeleteLabels && (
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteSavedLabel(lbl.id, lbl.name);
                              setSelectedLabelNames((prev) =>
                                prev.filter((n) => n !== lbl.name)
                              );
                            }}
                            aria-label={`ลบป้าย ${lbl.name}`}
                            className="ml-1 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Collapsible Create / Manage Label Drawer */}
                {labelCreatorOpen && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700">
                        สร้างป้ายกำกับใหม่
                      </span>
                      <button
                        type="button"
                        onClick={() => setManageDeleteLabels((prev) => !prev)}
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-md transition-colors ${
                          manageDeleteLabels
                            ? 'bg-rose-100 text-rose-700'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {manageDeleteLabels ? 'เสร็จสิ้นการลบ' : 'จัดการลบป้าย'}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newLabelName}
                        onChange={(e) => setNewLabelName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveNewLabel();
                          }
                        }}
                        placeholder="ชื่อป้ายกำกับ..."
                        className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={handleSaveNewLabel}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shrink-0"
                      >
                        บันทึกป้าย
                      </button>
                    </div>

                    {/* 16 Harmonious Circular Color Swatches */}
                    <div className="grid grid-cols-8 gap-2 pt-0.5">
                      {LABEL_COLOR_SWATCHES.map((swatch) => {
                        const active = newLabelColorId === swatch.id;
                        return (
                          <button
                            key={swatch.id}
                            type="button"
                            onClick={() => setNewLabelColorId(swatch.id)}
                            aria-label={`เลือกสี ${swatch.id}`}
                            className={`w-6 h-6 rounded-full ${swatch.bg} flex items-center justify-center transition-transform ${
                              active
                                ? 'ring-2 ring-offset-2 ring-slate-900 scale-110'
                                : 'hover:scale-105 opacity-90'
                            }`}
                          >
                            {active && <Check className="w-3 h-3 text-white stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 4. TASK STATUS & BENEFIT DETAILS */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800">สถานะงาน (Status)</span>
                  <div className="inline-flex p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setIsDone(false)}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        !isDone
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      ยังไม่เริ่ม (Not Done)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsDone(true)}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        isDone
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      เสร็จแล้ว (Done)
                    </button>
                  </div>
                </div>

                {!isDone ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500">
                    <Award className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>เปลี่ยนสถานะเป็น &apos;เสร็จแล้ว&apos; เพื่อกรอกรายละเอียด Benefit</span>
                  </div>
                ) : (
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-xs font-bold text-emerald-800">
                      Benefit Details (รายละเอียดผลประโยชน์ / ผลลัพธ์)
                    </label>
                    <input
                      type="text"
                      value={benefitDetails}
                      onChange={(e) => setBenefitDetails(e.target.value)}
                      placeholder="เช่น ลดเวลาการทำงานลง 30% หรือลดความผิดพลาดในการผลิต..."
                      className="w-full px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50/40 focus:bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* UNIFIED STICKY FOOTER */}
        <div className="px-5 sm:px-7 py-3.5 bg-white border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 text-[11px] text-slate-500 font-num">
            <span>
              ผู้รับผิดชอบ:{' '}
              <strong className="text-slate-800">
                {selectedAssignees.length > 0
                  ? `${selectedAssignees.length} คน`
                  : `${activeProject.owner.name} (อัตโนมัติ)`}
              </strong>
            </span>
            <span>·</span>
            <span>
              รายการย่อย: <strong className="text-slate-800">{checklist.length}</strong>
            </span>
            <span>·</span>
            <span>
              ไฟล์แนบ: <strong className="text-slate-800">{attachments.length}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
            >
              ยกเลิก (Cancel)
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-sm shadow-indigo-200 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>สร้างงาน (Create Task)</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// 5. COHESIVE "สร้างโปรเจกต์ใหม่ (CREATE NEW PROJECT)" MODAL COMPONENT
// ============================================================================

function CreateProjectModal({ isOpen, onClose, onCreateProject }) {
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState(false);
  const [category, setCategory] = useState('เอกสารและการฝึกอบรม');
  const [priority, setPriority] = useState('medium');
  const [ownerId, setOwnerId] = useState(MECHA_STAFF[0].id);
  const [startDate, setStartDate] = useState('2026-11-12');
  const [dueDate, setDueDate] = useState('2026-12-15');
  const [hasDeliverable, setHasDeliverable] = useState(true);
  const [deliverableSummary, setDeliverableSummary] = useState('');
  const [description, setDescription] = useState('');

  const durationDays = useMemo(
    () => calculateDurationDays(startDate, dueDate),
    [startDate, dueDate]
  );

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError(true);
      return;
    }
    const chosenOwner =
      MECHA_STAFF.find((s) => s.id === ownerId) || MECHA_STAFF[0];

    const newProj = {
      id: `PRJ-${Math.floor(100 + Math.random() * 899)}`,
      name: name.trim(),
      description:
        description.trim() ||
        'โปรเจกต์ใหม่ในระบบบริหารจัดการงาน Mecha Project Management',
      status: 'in_progress',
      priority,
      category,
      owner: chosenOwner,
      startDate,
      dueDate,
      timelineElapsedPercent: 10,
      deliverableSummary: hasDeliverable ? deliverableSummary.trim() : ''
    };

    onCreateProject(newProj);
    setName('');
    setDescription('');
    setDeliverableSummary('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 lg:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-project-title"
    >
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden"
      >
        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 shrink-0" />

        {/* Sticky Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="create-project-title"
                className="text-base sm:text-lg font-extrabold text-slate-900"
              >
                สร้างโปรเจกต์ใหม่ (Create New Project)
              </h2>
              <p className="text-xs text-slate-500">
                สร้างพื้นที่ทำงานใหม่และกำหนดผู้รับผิดชอบหลักของโปรเจกต์
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่างสร้างโปรเจกต์"
            className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#F8FAFC]/60 space-y-4 text-xs">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-slate-800">
                  ชื่อโปรเจกต์ <span className="text-rose-500">*</span>
                </label>
                {nameError && (
                  <span className="text-rose-600 font-semibold">กรุณาระบุชื่อโปรเจกต์</span>
                )}
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (e.target.value.trim()) setNameError(false);
                }}
                placeholder="เช่น ระบบตรวจสอบคุณภาพอัตโนมัติสายการผลิต B..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  หมวดหมู่โปรเจกต์
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
                >
                  <option value="เอกสารและการฝึกอบรม">เอกสารและการฝึกอบรม</option>
                  <option value="ระบบซอฟต์แวร์">ระบบซอฟต์แวร์</option>
                  <option value="ระบบองค์กร">ระบบองค์กร</option>
                  <option value="คุณภาพและทดสอบ">คุณภาพและทดสอบ</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  Project Owner (ผู้รับผิดชอบหลัก)
                </label>
                <select
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
                >
                  {MECHA_STAFF.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.empNo})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1.5">
                ระดับความสำคัญ (Priority)
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(PROJECT_PRIORITY_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPriority(key)}
                    className={`px-3.5 py-1.5 rounded-xl font-bold border transition-all ${
                      priority === key
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">วันเริ่มต้น</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-num"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-800">กำหนดส่ง</label>
                  {durationDays !== null && (
                    <span className="text-[11px] font-bold text-indigo-600 font-num">
                      ระยะเวลา {durationDays} วัน
                    </span>
                  )}
                </div>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-num"
                />
              </div>
            </div>

            <div className="pt-1 border-t border-slate-100 space-y-2">
              <label className="inline-flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={hasDeliverable}
                  onChange={(e) => setHasDeliverable(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>โปรเจกต์นี้มีสิ่งที่ต้องส่งมอบ (Deliverables)</span>
              </label>
              {hasDeliverable && (
                <input
                  type="text"
                  value={deliverableSummary}
                  onChange={(e) => setDeliverableSummary(e.target.value)}
                  placeholder="ระบุสิ่งที่ต้องส่งมอบ เช่น เอกสาร E-SOP, ระบบต้นแบบ..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white"
                />
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1.5">
                รายละเอียดโปรเจกต์
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ระบุวัตถุประสงค์ ขอบเขต หรือรายละเอียดเพิ่มเติม..."
                className="w-full p-3.5 rounded-xl border border-slate-200 leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm"
          >
            <FolderPlus className="w-4 h-4" />
            <span>สร้างโปรเจกต์</span>
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// 6. MAIN APPLICATION COMPONENT
// ============================================================================

export default function App() {
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [activeProjectId, setActiveProjectId] = useState('PRJ-001');
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [savedLabels, setSavedLabels] = useState(INITIAL_SAVED_LABELS);
  const [activities, setActivities] = useState(INITIAL_ACTIVITIES);

  // Navigation & Modal States
  const [viewScreen, setViewScreen] = useState('detail'); // 'detail' | 'projects-list'
  const [activeTab, setActiveTab] = useState('overview');

  // Open Redesigned "สร้างงานใหม่ (New Task)" modal by default on load!
  const [newTaskModalOpen, setNewTaskModalOpen] = useState(true);
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState(false);

  // Overview task filter pill
  const [overviewTaskFilter, setOverviewTaskFilter] = useState('all');

  // Tasks tab search & filter
  const [taskSearch, setTaskSearch] = useState('');
  const [taskTabFilter, setTaskTabFilter] = useState('all');

  // Notifications popover state
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [notifOpen, setNotifOpen] = useState(false);

  // Task Detail inspection drawer
  const [selectedTask, setSelectedTask] = useState(null);

  // Edit Project slide-over drawer
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Active Project Resolution
  const project = useMemo(
    () => projects.find((p) => p.id === activeProjectId) || projects[0],
    [projects, activeProjectId]
  );

  const [editForm, setEditForm] = useState({
    name: project.name,
    description: project.description,
    category: project.category,
    priority: project.priority,
    status: project.status,
    startDate: project.startDate,
    dueDate: project.dueDate
  });

  // Live formatted clock string (starts at 14:35:00 น.)
  const [clockSeconds, setClockSeconds] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setClockSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedClock = useMemo(() => {
    const baseSeconds = 14 * 3600 + 35 * 60 + clockSeconds;
    const hrs = Math.floor(baseSeconds / 3600) % 24;
    const mins = Math.floor((baseSeconds % 3600) / 60);
    const secs = baseSeconds % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)} น.`;
  }, [clockSeconds]);

  // Scoped tasks for active project
  const projectTasks = useMemo(
    () => tasks.filter((t) => t.projectId === project.id),
    [tasks, project.id]
  );

  // Derived task statistics
  const taskStats = useMemo(() => {
    const total = projectTasks.length;
    const notStarted = projectTasks.filter((t) => t.status === 'not_started').length;
    const inProgress = projectTasks.filter((t) => t.status === 'in_progress').length;
    const pendingReview = projectTasks.filter((t) => t.status === 'pending_review').length;
    const completed = projectTasks.filter((t) => t.status === 'completed').length;
    const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, notStarted, inProgress, pendingReview, completed, progressPercent };
  }, [projectTasks]);

  // Derived unique team members working on this project (excluding owner for additional count)
  const additionalTeamMembers = useMemo(() => {
    const map = new Map();
    projectTasks.forEach((t) => {
      (t.assignees || []).forEach((person) => {
        if (person.id !== project.owner.id) {
          map.set(person.id, person);
        }
      });
    });
    return Array.from(map.values());
  }, [projectTasks, project.owner.id]);

  // Derived all attachments across project tasks
  const projectAttachments = useMemo(() => {
    const list = [];
    projectTasks.forEach((t) => {
      (t.attachments || []).forEach((att) => {
        list.push({ ...att, taskTitle: t.title, taskId: t.id });
      });
    });
    return list;
  }, [projectTasks]);

  const durationDays = useMemo(
    () => calculateDurationDays(project.startDate, project.dueDate),
    [project.startDate, project.dueDate]
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.unread).length,
    [notifications]
  );

  const filteredOverviewTasks = useMemo(() => {
    if (overviewTaskFilter === 'completed') {
      return projectTasks.filter((t) => t.status === 'completed');
    }
    if (overviewTaskFilter === 'open') {
      return projectTasks.filter((t) => t.status !== 'completed');
    }
    return projectTasks;
  }, [projectTasks, overviewTaskFilter]);

  const filteredTabTasks = useMemo(() => {
    return projectTasks.filter((t) => {
      const matchesStatus =
        taskTabFilter === 'all' ||
        (taskTabFilter === 'completed' && t.status === 'completed') ||
        (taskTabFilter === 'open' && t.status !== 'completed');
      const q = taskSearch.trim().toLowerCase();
      const matchesQuery =
        !q || t.title.toLowerCase().includes(q) || t.id.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [projectTasks, taskTabFilter, taskSearch]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3400);
  };

  // Handlers for Creating Task, Toggling Task Status, Labels, and Projects
  const handleCreateTask = (newTask) => {
    setTasks((prev) => [newTask, ...prev]);

    // Update project status if an uncompleted task was added to a completed project
    if (newTask.status !== 'completed' && project.status === 'done') {
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? { ...p, status: 'in_progress' } : p))
      );
    }

    setActivities((prev) => [
      {
        id: `ACT-${Date.now()}`,
        projectId: project.id,
        actor: newTask.assignees[0] || project.owner,
        action: `สร้างงานใหม่ "${newTask.title}" (${newTask.id})`,
        time: `12 พ.ย. 2569 · ${formattedClock}`
      },
      ...prev
    ]);

    setNotifications((prev) => [
      {
        id: `NTF-${Date.now()}`,
        title: 'เพิ่มงานใหม่ในโปรเจกต์สำเร็จ',
        detail: `${newTask.title} ถูกเพิ่มใน ${project.name}`,
        time: 'เมื่อสักครู่',
        unread: true
      },
      ...prev
    ]);

    showToast(`สร้างงาน "${newTask.title}" เรียบร้อยแล้ว`);
  };

  const handleToggleTaskStatus = (taskId) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const nextDone = t.status !== 'completed';
        return {
          ...t,
          status: nextDone ? 'completed' : 'in_progress',
          statusLabel: nextDone ? 'เสร็จสิ้น' : 'กำลังทำ'
        };
      })
    );
  };

  const handleChangeTaskStatus = (taskId, nextStatus) => {
    const labelMap = {
      not_started: 'ยังไม่เริ่ม',
      in_progress: 'กำลังทำ',
      completed: 'เสร็จสิ้น'
    };
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: nextStatus, statusLabel: labelMap[nextStatus] || 'กำลังทำ' }
          : t
      )
    );
  };

  const handleAddSavedLabel = (name, colorId) => {
    setSavedLabels((prev) => {
      const exists = prev.find((l) => l.name.toLowerCase() === name.toLowerCase());
      if (exists) {
        return prev.map((l) => (l.id === exists.id ? { ...l, colorId } : l));
      }
      return [...prev, { id: `LBL-${Date.now()}`, name, colorId }];
    });
  };

  const handleDeleteSavedLabel = (id) => {
    setSavedLabels((prev) => prev.filter((l) => l.id !== id));
  };

  const handleCreateProject = (newProj) => {
    setProjects((prev) => [newProj, ...prev]);
    setActiveProjectId(newProj.id);
    setViewScreen('detail');
    setActiveTab('overview');
    showToast(`สร้างโปรเจกต์ "${newProj.name}" เรียบร้อยแล้ว`);
  };

  const openEditProject = () => {
    setEditForm({
      name: project.name,
      description: project.description,
      category: project.category,
      priority: project.priority,
      status: project.status,
      startDate: project.startDate,
      dueDate: project.dueDate
    });
    setEditDrawerOpen(true);
  };

  const handleSaveProject = (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) return;
    setProjects((prev) =>
      prev.map((p) =>
        p.id === project.id
          ? {
              ...p,
              name: editForm.name.trim(),
              description: editForm.description.trim(),
              category: editForm.category,
              priority: editForm.priority,
              status: editForm.status,
              startDate: editForm.startDate,
              dueDate: editForm.dueDate
            }
          : p
      )
    );
    setEditDrawerOpen(false);
    showToast('บันทึกการแก้ไขข้อมูลโปรเจกต์เรียบร้อยแล้ว');
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  // Effective status display (done if all tasks done & project status is done, else in_progress)
  const effectiveStatusKey =
    taskStats.total > 0 && taskStats.completed === taskStats.total
      ? 'done'
      : project.status === 'done'
      ? 'in_progress'
      : project.status;

  const statusMeta =
    PROJECT_STATUS_CONFIG[effectiveStatusKey] || PROJECT_STATUS_CONFIG.done;
  const priorityMeta =
    PROJECT_PRIORITY_CONFIG[project.priority] || PROJECT_PRIORITY_CONFIG.medium;

  const projectActivities = useMemo(
    () => activities.filter((a) => a.projectId === project.id),
    [activities, project.id]
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 antialiased selection:bg-indigo-100 selection:text-indigo-900">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+Thai:wght@400;500;600;700;800&display=swap');
        body {
          font-family: 'Noto Sans Thai', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .font-num {
          font-variant-numeric: tabular-nums;
        }
      `}</style>

      {/* ====================================================================
          1. TOP NAVIGATION BAR
         ==================================================================== */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-3">
          {/* Left: Back Button + Breadcrumb + Brand Badge */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() =>
                setViewScreen((prev) => (prev === 'detail' ? 'projects-list' : 'detail'))
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-xs font-semibold transition-colors shrink-0 shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
              <span>{viewScreen === 'detail' ? 'หน้ารวมโปรเจกต์' : 'กลับสู่โปรเจกต์'}</span>
            </button>

            <nav
              aria-label="Breadcrumb"
              className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 min-w-0"
            >
              <button
                type="button"
                onClick={() => setViewScreen('projects-list')}
                className="hover:text-indigo-600 font-medium transition-colors shrink-0"
              >
                โปรเจกต์
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-800 truncate max-w-[210px]">
                {project.name}
              </span>
            </nav>

            <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100/90 border border-slate-200/80 text-[11px] font-semibold text-slate-600 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
              Mecha Project Management
            </span>
          </div>

          {/* Right: Create Project + Add New Task + Thai Clock + Notification Bell */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setCreateProjectModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 text-xs font-bold transition-all shadow-2xs"
            >
              <FolderPlus className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">+ สร้างโปรเจกต์</span>
            </button>

            <button
              type="button"
              onClick={() => setNewTaskModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มงานใหม่</span>
            </button>

            <div className="hidden lg:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200/90 text-xs text-slate-600 font-num">
              <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="font-medium text-slate-700">12 พ.ย. 2569</span>
              <span className="text-slate-300">|</span>
              <span className="font-bold text-indigo-700">{formattedClock}</span>
            </div>

            {/* Notification Bell + Interactive Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((prev) => !prev)}
                aria-label="การแจ้งเตือน"
                aria-expanded={notifOpen}
                className="relative w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors shadow-2xs"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white font-num">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setNotifOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-xl z-40 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">การแจ้งเตือน</span>
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                            ใหม่ {unreadCount}
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllNotificationsRead}
                          className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
                        >
                          ทำเครื่องหมายว่าอ่านแล้ว
                        </button>
                      )}
                    </div>
                    <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                      {notifications.map((item) => (
                        <div
                          key={item.id}
                          className={`p-3.5 text-xs transition-colors ${
                            item.unread ? 'bg-indigo-50/30' : 'bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-bold text-slate-900">{item.title}</p>
                            {item.unread && (
                              <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="text-slate-600 mt-0.5 leading-relaxed">{item.detail}</p>
                          <p className="text-[11px] text-slate-400 mt-1.5">{item.time}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Live Toast Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs font-semibold shadow-lg border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ====================================================================
          MAIN VIEWPORT (Project Workspace vs Projects Directory)
         ==================================================================== */}
      {viewScreen === 'projects-list' ? (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                หน้ารวมโปรเจกต์ทั้งหมด ({projects.length})
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                เลือกการ์ดโปรเจกต์เพื่อเข้าสู่พื้นที่ทำงาน (Project Workspace) หรือสร้างโปรเจกต์ใหม่
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCreateProjectModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold self-start sm:self-auto"
            >
              <FolderPlus className="w-4 h-4" />
              <span>+ สร้างโปรเจกต์ใหม่</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((item) => {
              const itemTasks = tasks.filter((t) => t.projectId === item.id);
              const itemCompleted = itemTasks.filter((t) => t.status === 'completed').length;
              const itemProgress =
                itemTasks.length > 0
                  ? Math.round((itemCompleted / itemTasks.length) * 100)
                  : 0;
              const pMeta =
                PROJECT_PRIORITY_CONFIG[item.priority] || PROJECT_PRIORITY_CONFIG.medium;
              const sMeta =
                itemTasks.length > 0 && itemCompleted === itemTasks.length
                  ? PROJECT_STATUS_CONFIG.done
                  : PROJECT_STATUS_CONFIG[item.status] || PROJECT_STATUS_CONFIG.in_progress;

              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setActiveProjectId(item.id);
                    setViewScreen('detail');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActiveProjectId(item.id);
                      setViewScreen('detail');
                    }
                  }}
                  className="bg-white rounded-2xl border border-[#E2E8F0] hover:border-indigo-400 p-5 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                        {item.category}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${pMeta.badgeClass}`}
                      >
                        {pMeta.label}
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-slate-900">{item.name}</h2>
                    <p className="text-xs text-slate-500 line-clamp-2">{item.description}</p>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">
                        ความคืบหน้า ({itemCompleted}/{itemTasks.length} งาน)
                      </span>
                      <span className="font-bold text-slate-900 font-num">{itemProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-indigo-600 rounded-full"
                        style={{ width: `${itemProgress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                        <span className={`w-2 h-2 rounded-full ${sMeta.dotClass}`} />
                        {sMeta.label}
                      </span>
                      <span className="font-bold text-indigo-600">เปิด Workspace →</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
          {/* ================================================================
              2. UNIFIED PROJECT HERO HEADER CARD
             ================================================================ */}
          <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600" />

            <div className="p-5 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Left Cluster: Badges, Main Title, Description & Metadata Strip */}
              <div className="space-y-3.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusMeta.badgeClass}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${statusMeta.dotClass}`} />
                    <span>{statusMeta.label}</span>
                  </span>

                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${priorityMeta.badgeClass}`}
                  >
                    {priorityMeta.headerLabel}
                  </span>

                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
                    {project.category}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h1 className="text-2xl sm:text-[26px] font-extrabold text-slate-900 tracking-tight leading-snug">
                    {project.name}
                  </h1>
                  <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
                    {project.description}
                  </p>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-y-3 gap-x-5">
                  {/* Project Owner */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-bold text-xs flex items-center justify-center shrink-0">
                      {project.owner.initials}
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-slate-400 leading-tight">
                        Project Owner
                      </div>
                      <div className="text-xs font-bold text-slate-800 leading-tight mt-0.5">
                        {project.owner.name}
                      </div>
                    </div>
                  </div>

                  <div className="hidden sm:block h-8 w-px bg-slate-200" />

                  {/* Project Period */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-600 border border-rose-200/70 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-slate-400 leading-tight">
                        ช่วงโปรเจกต์
                      </div>
                      <div className="text-xs font-bold text-slate-800 leading-tight mt-0.5 font-num">
                        {formatThaiShortDate(project.startDate)} →{' '}
                        {formatThaiShortDate(project.dueDate)}
                        {durationDays !== null && (
                          <span className="ml-1.5 font-semibold text-slate-500">
                            ({durationDays} วัน)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Cluster: Circular Progress Ring + Action Buttons */}
              <div className="flex sm:flex-row lg:flex-col xl:flex-row items-center justify-between lg:justify-end gap-3.5 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
                <div className="flex items-center gap-3.5 bg-slate-50/90 px-4 py-3 rounded-2xl border border-slate-200/80">
                  <CircularProgressRing percentage={taskStats.progressPercent} />
                  <div>
                    <div className="text-xs font-bold text-slate-900">ความคืบหน้า</div>
                    <div className="text-xs text-slate-600 mt-0.5 font-num">
                      เสร็จ {taskStats.completed} จาก {taskStats.total} งาน
                    </div>
                    <div className="text-[11px] font-semibold text-emerald-600 mt-0.5">
                      {statusMeta.label}
                    </div>
                  </div>
                </div>

                <div className="flex flex-row lg:flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTaskModalOpen(true)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ เพิ่มงานใหม่</span>
                  </button>

                  <button
                    type="button"
                    onClick={openEditProject}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 text-xs font-bold transition-all shadow-2xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>แก้ไขโปรเจกต์</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ================================================================
              3. WORKSPACE NAVIGATION TABS (7 Tabs)
             ================================================================ */}
          <nav
            aria-label="เมนูพื้นที่ทำงานโปรเจกต์"
            className="bg-white rounded-2xl border border-[#E2E8F0] p-1.5 shadow-2xs overflow-x-auto"
          >
            <div className="flex items-center gap-1 min-w-max">
              {WORKSPACE_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                    {tab.countKey === 'tasks' && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold font-num ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {taskStats.total}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* ================================================================
              4. TAB 1: OVERVIEW ("ภาพรวม")
             ================================================================ */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* TOP 3-CARD SUMMARY GRID */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Card 1: สรุปสถานะงาน (Task Summary) */}
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h2 className="text-xs font-bold text-slate-500">
                        สรุปสถานะงาน (Task Summary)
                      </h2>
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full font-num">
                        {taskStats.total} งานทั้งหมด
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between mt-2">
                      <span className="text-2xl font-extrabold text-slate-900 font-num">
                        {taskStats.progressPercent}%
                      </span>
                      <span className="text-xs font-semibold text-emerald-600">
                        {taskStats.completed === taskStats.total && taskStats.total > 0
                          ? 'เสร็จสมบูรณ์'
                          : 'กำลังดำเนินงาน'}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-2.5">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500"
                        style={{ width: `${taskStats.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <span className="inline-flex items-center gap-1.5 text-slate-600">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        ยังไม่เริ่ม
                      </span>
                      <span className="font-bold text-slate-800 font-num">
                        {taskStats.notStarted}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <span className="inline-flex items-center gap-1.5 text-slate-600">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        กำลังทำ
                      </span>
                      <span className="font-bold text-slate-800 font-num">
                        {taskStats.inProgress}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <span className="inline-flex items-center gap-1.5 text-slate-600">
                        <span className="w-2 h-2 rounded-full bg-violet-500" />
                        รอตรวจ
                      </span>
                      <span className="font-bold text-slate-800 font-num">
                        {taskStats.pendingReview}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-xs">
                      <span className="inline-flex items-center gap-1.5 text-emerald-800 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        เสร็จแล้ว
                      </span>
                      <span className="font-bold text-emerald-700 font-num">
                        {taskStats.completed}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card 2: กำหนดส่งและระยะเวลา */}
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-xs font-bold text-slate-500">กำหนดส่งและระยะเวลา</h2>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                        <Check className="w-3 h-3" />
                        {effectiveStatusKey === 'done' ? 'ปิดแล้ว' : 'ตามแผนงาน'}
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-baseline gap-2">
                      <span className="text-2xl font-extrabold text-slate-900">
                        {effectiveStatusKey === 'done' ? 'ปิดแล้ว' : 'กำลังดำเนินการ'}
                      </span>
                      <span className="text-xs font-medium text-slate-500 font-num">
                        · ครบกำหนด {formatThaiShortDate(project.dueDate)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 bg-slate-50/90 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 font-num">
                      <span>{formatThaiShortDate(project.startDate)}</span>
                      <span>{formatThaiShortDate(project.dueDate)}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full"
                        style={{ width: `${project.timelineElapsedPercent}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-500 text-center font-medium">
                      ผ่านไปแล้ว {project.timelineElapsedPercent}% ของระยะเวลา
                      {durationDays !== null ? ` (${durationDays} วัน)` : ''}
                    </div>
                  </div>
                </div>

                {/* Card 3: รายการต้องจับตา (Attention) */}
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-xs font-bold text-slate-500">
                        รายการต้องจับตา (Attention)
                      </h2>
                      <span className="text-xs font-extrabold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-full font-num">
                        {taskStats.notStarted + taskStats.inProgress} รายการ
                      </span>
                    </div>

                    {taskStats.notStarted + taskStats.inProgress === 0 ? (
                      <div className="mt-3 flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/80">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-emerald-900">
                            ไม่มีงานที่ต้องจับตาในตอนนี้
                          </div>
                          <div className="text-[11px] text-emerald-700/90 mt-0.5">
                            ทุกงานดำเนินการเรียบร้อยตามกำหนด
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 flex items-center gap-2.5 p-3 rounded-xl bg-amber-50/80 border border-amber-200/80">
                        <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-amber-900">
                            มีงานที่กำลังดำเนินการ {taskStats.notStarted + taskStats.inProgress} รายการ
                          </div>
                          <div className="text-[11px] text-amber-700/90 mt-0.5">
                            คลิกที่รายการงานด้านล่างเพื่ออัปเดตสถานะ
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 text-[11px] font-semibold text-slate-500 font-num">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100">
                      เลยกำหนด 0
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100">
                      รอตรวจ {taskStats.pendingReview}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100">
                      เปิดอยู่ {taskStats.notStarted + taskStats.inProgress}
                    </span>
                  </div>
                </div>
              </div>

              {/* MAIN 2-COLUMN WORKSPACE GRID (8 Cols Left / 4 Cols Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* LEFT COLUMN (8 Cols): งานในโปรเจกต์ */}
                <section className="lg:col-span-8 bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-sm font-bold text-slate-900">
                        งานในโปรเจกต์ ({taskStats.total})
                      </h2>

                      <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200/80 text-[11px] font-bold">
                        <button
                          type="button"
                          onClick={() => setOverviewTaskFilter('all')}
                          className={`px-2.5 py-1 rounded-lg transition-all font-num ${
                            overviewTaskFilter === 'all'
                              ? 'bg-white text-indigo-700 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          ทั้งหมด {taskStats.total}
                        </button>
                        <button
                          type="button"
                          onClick={() => setOverviewTaskFilter('completed')}
                          className={`px-2.5 py-1 rounded-lg transition-all font-num ${
                            overviewTaskFilter === 'completed'
                              ? 'bg-white text-emerald-700 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          เสร็จแล้ว {taskStats.completed}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setNewTaskModalOpen(true)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>เพิ่มงาน</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('tasks')}
                        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                      >
                        <span>ดูทั้งหมด ({taskStats.total})</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Task Rows */}
                  <div className="divide-y divide-slate-100">
                    {filteredOverviewTasks.map((task) => {
                      const isTaskDone = task.status === 'completed';
                      const primaryPerson = task.assignees?.[0] || project.owner;
                      return (
                        <div
                          key={task.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedTask(task)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedTask(task);
                            }
                          }}
                          className="group px-5 py-4 hover:bg-slate-50/90 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-start sm:items-center gap-3 min-w-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleTaskStatus(task.id);
                              }}
                              aria-label="สลับสถานะงาน"
                              className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 transition-colors ${
                                isTaskDone
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200/80'
                                  : 'bg-white text-slate-400 border-slate-300 hover:border-indigo-500'
                              }`}
                            >
                              {isTaskDone ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : (
                                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                              )}
                            </button>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">
                                  {task.title}
                                </p>
                                {(task.labels || []).slice(0, 3).map((lblName) => {
                                  const found = savedLabels.find((l) => l.name === lblName);
                                  const sw =
                                    LABEL_COLOR_SWATCHES.find((c) => c.id === found?.colorId) ||
                                    LABEL_COLOR_SWATCHES[9];
                                  return (
                                    <span
                                      key={lblName}
                                      className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${sw.softBg} ${sw.text} ${sw.border}`}
                                    >
                                      {lblName}
                                    </span>
                                  );
                                })}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500">
                                <span className="font-mono text-slate-400">{task.id}</span>
                                <span>·</span>
                                <span>ผู้รับผิดชอบ: {primaryPerson.name}</span>
                                <span>·</span>
                                <span className="font-num">
                                  กำหนดส่ง {formatThaiShortDate(task.dueDate)}
                                </span>
                                {task.checklist?.length > 0 && (
                                  <>
                                    <span>·</span>
                                    <span className="font-num text-indigo-600 font-semibold">
                                      รายการย่อย{' '}
                                      {task.checklist.filter((c) => c.done).length}/
                                      {task.checklist.length}
                                    </span>
                                  </>
                                )}
                                {task.attachments?.length > 0 && (
                                  <>
                                    <span>·</span>
                                    <span className="font-num text-slate-600">
                                      ไฟล์แนบ {task.attachments.length}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                                isTaskDone
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                                  : 'bg-amber-50 text-amber-800 border-amber-200/80'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isTaskDone ? 'bg-emerald-500' : 'bg-amber-500'
                                }`}
                              />
                              {task.statusLabel}
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* RIGHT COLUMN (4 Cols): ข้อมูลโปรเจกต์ + ทีมงาน */}
                <div className="lg:col-span-4 space-y-4">
                  <section className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs space-y-3.5">
                    <h2 className="text-sm font-bold text-slate-900 pb-2.5 border-b border-slate-100">
                      ข้อมูลโปรเจกต์
                    </h2>

                    <dl className="divide-y divide-slate-100 text-xs">
                      <div className="py-2.5 flex items-center justify-between gap-3">
                        <dt className="text-slate-500 font-medium shrink-0">หมวดหมู่</dt>
                        <dd className="font-bold text-slate-900 text-right">
                          {project.category}
                        </dd>
                      </div>

                      <div className="py-2.5 flex items-center justify-between gap-3">
                        <dt className="text-slate-500 font-medium shrink-0">ระดับความสำคัญ</dt>
                        <dd>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${priorityMeta.badgeClass}`}
                          >
                            {priorityMeta.label}
                          </span>
                        </dd>
                      </div>

                      <div className="py-2.5 flex items-center justify-between gap-3">
                        <dt className="text-slate-500 font-medium shrink-0">วันเริ่มต้น</dt>
                        <dd className="font-bold text-slate-900 font-num">
                          {formatThaiShortDate(project.startDate)}
                        </dd>
                      </div>

                      <div className="py-2.5 flex items-center justify-between gap-3">
                        <dt className="text-slate-500 font-medium shrink-0">กำหนดส่ง</dt>
                        <dd className="font-bold text-slate-900 font-num">
                          {formatThaiShortDate(project.dueDate)}
                        </dd>
                      </div>

                      <div className="pt-3 flex items-center justify-between gap-3">
                        <dt className="text-slate-500 font-medium shrink-0">Project Owner</dt>
                        <dd className="flex items-center gap-2 min-w-0">
                          <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {project.owner.initials}
                          </span>
                          <span className="font-bold text-slate-900 truncate">
                            {project.owner.name}
                          </span>
                        </dd>
                      </div>
                    </dl>
                  </section>

                  {/* ทีมงาน Card */}
                  <section className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold text-slate-900 font-num">
                        ทีมงาน · {additionalTeamMembers.length} คน
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveTab('team')}
                        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
                      >
                        <span>ดูทีม</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {additionalTeamMembers.length === 0 ? (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/90 border border-slate-100">
                        <div className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-400 flex items-center justify-center shrink-0">
                          <UserPlus className="w-4 h-4" />
                        </div>
                        <p className="text-xs text-slate-500 font-medium">
                          ยังไม่มีสมาชิกเพิ่มเติมในทีม
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {additionalTeamMembers.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                                {member.initials}
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate">
                                  {member.name}
                                </p>
                                <p className="text-[10px] text-slate-500 truncate">
                                  {member.role}
                                </p>
                              </div>
                            </div>
                            <span className="font-mono text-[10px] text-slate-400">
                              {member.empNo}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              5. TAB 2: TASKS ("งาน")
             ================================================================ */}
          {activeTab === 'tasks' && (
            <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    รายการงานทั้งหมดในโปรเจกต์ ({taskStats.total})
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    คลิกที่รายการงานเพื่อดูรายละเอียด หรือเพิ่มงานใหม่ได้ทันที
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={taskSearch}
                      onChange={(e) => setTaskSearch(e.target.value)}
                      placeholder="ค้นหาชื่องาน..."
                      className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                  </div>

                  <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setTaskTabFilter('all')}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        taskTabFilter === 'all'
                          ? 'bg-white text-indigo-700 shadow-2xs'
                          : 'text-slate-600'
                      }`}
                    >
                      ทั้งหมด ({taskStats.total})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaskTabFilter('completed')}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        taskTabFilter === 'completed'
                          ? 'bg-white text-emerald-700 shadow-2xs'
                          : 'text-slate-600'
                      }`}
                    >
                      เสร็จสิ้น ({taskStats.completed})
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setNewTaskModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มงานใหม่</span>
                  </button>
                </div>
              </div>

              {filteredTabTasks.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-500">
                  ไม่พบรายการงานที่ตรงกับเงื่อนไข
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredTabTasks.map((task) => {
                    const isTaskDone = task.status === 'completed';
                    const primaryPerson = task.assignees?.[0] || project.owner;
                    return (
                      <div
                        key={task.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedTask(task)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedTask(task);
                          }
                        }}
                        className="group px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${
                              isTaskDone
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200/80'
                                : 'bg-amber-50 text-amber-600 border-amber-200/80'
                            }`}
                          >
                            {isTaskDone ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <Clock className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-[11px] font-semibold text-slate-400">
                                {task.id}
                              </span>
                              <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                                {task.title}
                              </h3>
                              {(task.labels || []).map((lblName) => {
                                const found = savedLabels.find((l) => l.name === lblName);
                                const sw =
                                  LABEL_COLOR_SWATCHES.find((c) => c.id === found?.colorId) ||
                                  LABEL_COLOR_SWATCHES[9];
                                return (
                                  <span
                                    key={lblName}
                                    className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${sw.softBg} ${sw.text} ${sw.border}`}
                                  >
                                    {lblName}
                                  </span>
                                );
                              })}
                            </div>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                              {task.description}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-500">
                              <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                                <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[9px] flex items-center justify-center">
                                  {primaryPerson.initials}
                                </span>
                                {primaryPerson.name}
                              </span>
                              <span className="font-num">
                                ช่วงเวลา: {formatThaiShortDate(task.startDate)} →{' '}
                                {formatThaiShortDate(task.dueDate)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                              isTaskDone
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                                : 'bg-amber-50 text-amber-800 border-amber-200/80'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isTaskDone ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                            />
                            {task.statusLabel}
                          </span>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ================================================================
              6. TAB 3: KANBAN BOARD ("บอร์ด")
             ================================================================ */}
          {activeTab === 'board' && (
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  key: 'not_started',
                  title: 'ยังไม่เริ่ม (Not Started)',
                  dot: 'bg-slate-400',
                  nextStatus: 'in_progress',
                  nextLabel: 'เริ่มทำงาน →'
                },
                {
                  key: 'in_progress',
                  title: 'กำลังดำเนินการ (In Progress)',
                  dot: 'bg-blue-500',
                  nextStatus: 'completed',
                  nextLabel: 'เสร็จสิ้น ✓'
                },
                {
                  key: 'completed',
                  title: 'เสร็จสิ้น (Done)',
                  dot: 'bg-emerald-500',
                  nextStatus: 'in_progress',
                  nextLabel: 'เปิดอีกครั้ง'
                }
              ].map((col) => {
                const colTasks = projectTasks.filter((t) => t.status === col.key);
                return (
                  <div
                    key={col.key}
                    className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                        <h3 className="text-xs font-extrabold text-slate-800">{col.title}</h3>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 font-num">
                        {colTasks.length}
                      </span>
                    </div>

                    {colTasks.length === 0 ? (
                      <div className="p-6 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-[11px] text-slate-400">
                        ไม่มีงานในคอลัมน์นี้
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {colTasks.map((task) => (
                          <div
                            key={task.id}
                            onClick={() => setSelectedTask(task)}
                            className="p-3.5 rounded-xl bg-slate-50/80 hover:bg-white border border-slate-200/80 hover:border-indigo-300 shadow-2xs transition-all cursor-pointer space-y-2.5"
                          >
                            <div className="flex flex-wrap gap-1">
                              {(task.labels || []).map((lblName) => {
                                const found = savedLabels.find((l) => l.name === lblName);
                                const sw =
                                  LABEL_COLOR_SWATCHES.find((c) => c.id === found?.colorId) ||
                                  LABEL_COLOR_SWATCHES[9];
                                return (
                                  <span
                                    key={lblName}
                                    className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${sw.softBg} ${sw.text} ${sw.border}`}
                                  >
                                    {lblName}
                                  </span>
                                );
                              })}
                            </div>
                            <p className="text-xs font-bold text-slate-900 leading-snug">
                              {task.title}
                            </p>
                            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                              <span className="font-num">
                                {formatThaiShortDate(task.dueDate)}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleChangeTaskStatus(task.id, col.nextStatus);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-50 border border-slate-200 text-indigo-700 font-bold text-[10px]"
                              >
                                {col.nextLabel}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          )}

          {/* ================================================================
              7. TAB 4: TEAM ("ทีม")
             ================================================================ */}
          {activeTab === 'team' && (
            <section className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    ทีมงานในโปรเจกต์ ({1 + additionalTeamMembers.length} คน)
                  </h2>
                  <p className="text-xs text-slate-500">
                    ผู้รับผิดชอบหลักและสมาชิกที่ได้รับมอบหมายงานในโปรเจกต์นี้
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setNewTaskModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>มอบหมายงานให้สมาชิก</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[project.owner, ...additionalTeamMembers].map((member, idx) => {
                  const assignedCount = projectTasks.filter((t) =>
                    (t.assignees || []).some((a) => a.id === member.id)
                  ).length;
                  return (
                    <div
                      key={member.id}
                      className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-extrabold text-xs flex items-center justify-center shrink-0">
                          {member.initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {member.name}
                            </p>
                            {idx === 0 && (
                              <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                                Owner
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {member.role}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                            {member.empNo}
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 font-num shrink-0">
                        {assignedCount} งาน
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ================================================================
              8. TAB 5: DELIVERABLES ("สิ่งที่ส่งมอบ")
             ================================================================ */}
          {activeTab === 'deliverables' && (
            <section className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    สิ่งที่ต้องส่งมอบและเอกสารแนบ ({projectAttachments.length} รายการ)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {project.deliverableSummary || 'เอกสารและไฟล์ส่งมอบทั้งหมดในโปรเจกต์'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {projectAttachments.map((att) => {
                  const catMeta =
                    ATTACHMENT_CATEGORIES.find((c) => c.id === att.category) ||
                    ATTACHMENT_CATEGORIES[0];
                  const CatIcon = catMeta.icon;
                  return (
                    <div
                      key={att.id}
                      className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-indigo-600 flex items-center justify-center shrink-0">
                          <CatIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {att.name}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            จากงาน: {att.taskTitle}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 space-y-1">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${catMeta.badgeClass}`}
                        >
                          {att.category}
                        </span>
                        <div className="text-[11px] text-slate-400 font-num">{att.size}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ================================================================
              9. TAB 6: TIMELINE ("ไทม์ไลน์")
             ================================================================ */}
          {activeTab === 'timeline' && (
            <section className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  ไทม์ไลน์การดำเนินงาน ({formatThaiShortDate(project.startDate)} →{' '}
                  {formatThaiShortDate(project.dueDate)})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  ภาพรวมช่วงเวลาของแต่ละงานภายในโปรเจกต์
                </p>
              </div>

              <div className="space-y-3">
                {projectTasks.map((task) => {
                  const isTaskDone = task.status === 'completed';
                  return (
                    <div
                      key={task.id}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">{task.title}</span>
                        <span className="font-num text-slate-500">
                          {formatThaiShortDate(task.startDate)} →{' '}
                          {formatThaiShortDate(task.dueDate)}
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-200/70 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isTaskDone ? 'bg-emerald-500 w-full' : 'bg-indigo-600 w-2/3'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ================================================================
              10. TAB 7: ACTIVITY ("ประวัติ")
             ================================================================ */}
          {activeTab === 'activity' && (
            <section className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs space-y-4">
              <h2 className="text-base font-bold text-slate-900">
                ประวัติการดำเนินงาน (Activity Log)
              </h2>
              <div className="divide-y divide-slate-100">
                {projectActivities.map((act) => (
                  <div key={act.id} className="py-3.5 flex items-start gap-3 text-xs">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                      {act.actor.initials}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">
                        {act.actor.name}{' '}
                        <span className="font-normal text-slate-600">{act.action}</span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-num">{act.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      )}

      {/* ====================================================================
          REDESIGNED "สร้างงานใหม่ (NEW TASK)" MODAL
         ==================================================================== */}
      <NewTaskModal
        isOpen={newTaskModalOpen}
        onClose={() => setNewTaskModalOpen(false)}
        onCreateTask={handleCreateTask}
        activeProject={project}
        savedLabels={savedLabels}
        onAddSavedLabel={handleAddSavedLabel}
        onDeleteSavedLabel={handleDeleteSavedLabel}
      />

      {/* ====================================================================
          INTEGRATED "สร้างโปรเจกต์ใหม่ (CREATE NEW PROJECT)" MODAL
         ==================================================================== */}
      <CreateProjectModal
        isOpen={createProjectModalOpen}
        onClose={() => setCreateProjectModalOpen(false)}
        onCreateProject={handleCreateProject}
      />

      {/* ====================================================================
          TASK SUMMARY DRAWER
         ==================================================================== */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs"
            onClick={() => setSelectedTask(null)}
          />
          <aside className="relative z-10 w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between overflow-y-auto">
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    {selectedTask.id}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      selectedTask.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        selectedTask.status === 'completed'
                          ? 'bg-emerald-500'
                          : 'bg-amber-500'
                      }`}
                    />
                    {selectedTask.statusLabel}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  aria-label="ปิดหน้าต่างรายละเอียดงาน"
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-indigo-600 mb-1">
                  {project.name}
                </div>
                <h3 className="text-lg font-bold text-slate-900 leading-snug">
                  {selectedTask.title}
                </h3>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                {selectedTask.description}
              </div>

              {selectedTask.benefitDetails && (
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-xs">
                  <div className="font-bold text-emerald-900 mb-0.5">
                    Benefit Details (ผลประโยชน์ที่ได้รับ)
                  </div>
                  <p className="text-emerald-800">{selectedTask.benefitDetails}</p>
                </div>
              )}

              <dl className="divide-y divide-slate-100 text-xs">
                <div className="py-3 flex items-center justify-between">
                  <dt className="text-slate-500 font-medium">ผู้รับผิดชอบ</dt>
                  <dd className="flex flex-wrap justify-end gap-1.5 font-bold text-slate-900">
                    {(selectedTask.assignees || [project.owner]).map((person) => (
                      <span
                        key={person.id}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800"
                      >
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">
                          {person.initials}
                        </span>
                        <span>{person.name}</span>
                      </span>
                    ))}
                  </dd>
                </div>
                <div className="py-3 flex items-center justify-between">
                  <dt className="text-slate-500 font-medium">วันเริ่มต้น</dt>
                  <dd className="font-bold text-slate-900 font-num">
                    {formatThaiShortDate(selectedTask.startDate)}
                  </dd>
                </div>
                <div className="py-3 flex items-center justify-between">
                  <dt className="text-slate-500 font-medium">กำหนดส่ง</dt>
                  <dd className="font-bold text-slate-900 font-num">
                    {formatThaiShortDate(selectedTask.dueDate)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  handleToggleTaskStatus(selectedTask.id);
                  setSelectedTask(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800"
              >
                {selectedTask.status === 'completed'
                  ? 'เปลี่ยนเป็นกำลังทำ'
                  : 'ทำเครื่องหมายว่าเสร็จสิ้น'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ====================================================================
          EDIT PROJECT SLIDE-OVER DRAWER
         ==================================================================== */}
      {editDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs"
            onClick={() => setEditDrawerOpen(false)}
          />
          <form
            onSubmit={handleSaveProject}
            className="relative z-10 w-full max-w-lg bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between overflow-y-auto"
          >
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">แก้ไขข้อมูลโปรเจกต์</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ปรับปรุงรายละเอียด หมวดหมู่ ระดับความสำคัญ หรือช่วงเวลาโปรเจกต์
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditDrawerOpen(false)}
                  aria-label="ปิดหน้าต่างแก้ไขโปรเจกต์"
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    ชื่อโปรเจกต์ *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    คำอธิบายโปรเจกต์
                  </label>
                  <textarea
                    rows={3}
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm({ ...editForm, description: e.target.value })
                    }
                    className="w-full p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">หมวดหมู่</label>
                    <select
                      value={editForm.category}
                      onChange={(e) =>
                        setEditForm({ ...editForm, category: e.target.value })
                      }
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white font-medium"
                    >
                      <option value="เอกสารและการฝึกอบรม">เอกสารและการฝึกอบรม</option>
                      <option value="ระบบซอฟต์แวร์">ระบบซอฟต์แวร์</option>
                      <option value="ระบบองค์กร">ระบบองค์กร</option>
                      <option value="คุณภาพและทดสอบ">คุณภาพและทดสอบ</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">
                      ระดับความสำคัญ
                    </label>
                    <select
                      value={editForm.priority}
                      onChange={(e) =>
                        setEditForm({ ...editForm, priority: e.target.value })
                      }
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white font-medium"
                    >
                      <option value="low">ต่ำ (Low)</option>
                      <option value="medium">ปกติ (Medium)</option>
                      <option value="high">สูง (High)</option>
                      <option value="urgent">ด่วนที่สุด (Urgent)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">วันเริ่มต้น</label>
                    <input
                      type="date"
                      value={editForm.startDate}
                      onChange={(e) =>
                        setEditForm({ ...editForm, startDate: e.target.value })
                      }
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-num"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">กำหนดส่ง</label>
                    <input
                      type="date"
                      value={editForm.dueDate}
                      onChange={(e) =>
                        setEditForm({ ...editForm, dueDate: e.target.value })
                      }
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-num"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">สถานะโปรเจกต์</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white font-medium"
                  >
                    <option value="done">เสร็จแล้ว (Done)</option>
                    <option value="in_progress">กำลังดำเนินการ (In Progress)</option>
                    <option value="not_started">ยังไม่เริ่ม (Not Started)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditDrawerOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs"
              >
                บันทึกการเปลี่ยนแปลง
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}