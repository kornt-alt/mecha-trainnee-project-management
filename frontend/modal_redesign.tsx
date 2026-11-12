import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  LayoutGrid,
  List,
  Kanban,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  FolderPlus,
  Calendar,
  User,
  Users,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  Edit3,
  Trash2,
  MoreVertical,
  Sparkles,
  Layers,
  Tag,
  Sliders,
  ArrowUpDown,
  CheckSquare,
  FileText,
  Info,
  ExternalLink,
  ShieldCheck,
  Eye,
  RotateCcw,
  Maximize2
} from 'lucide-react';

// --- Sample Initial Data matching exact screenshot details ---
const INITIAL_PROJECTS = [
  {
    id: 'PRJ-001',
    name: 'คู่มือความปลอดภัยสองภาษา',
    category: 'เอกสารและการฝึกอบรม',
    priority: 'ปกติ (Medium)',
    priorityLevel: 'normal',
    status: 'เสร็จแล้ว',
    statusCode: 'done',
    owner: {
      name: 'Supachai Meesuk',
      email: 'supachai.m@mecha.local',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=faces'
    },
    team: [
      { name: 'Kittipat', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces' }
    ],
    teamCount: 1,
    progress: 100,
    completedTasks: 2,
    totalTasks: 2,
    startDate: '2026/07/06',
    endDate: '2026/08/14',
    durationDays: 40,
    description: 'เอกสารและคู่มือมาตรฐานความปลอดภัยในการทำงาน 2 ภาษา (ไทย-อังกฤษ) สำหรับพนักงานใหม่และผู้เข้าเยี่ยมชมโรงงาน'
  },
  {
    id: 'PRJ-002',
    name: 'รายงานสรุปปริมาณการผลิตรายวัน',
    category: 'ระบบองค์กร',
    priority: 'สูง (High)',
    priorityLevel: 'high',
    status: 'เสร็จแล้ว',
    statusCode: 'done',
    owner: {
      name: 'Supachai Meesuk',
      email: 'supachai.m@mecha.local',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=faces'
    },
    team: [
      { name: 'Napat', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=faces' }
    ],
    teamCount: 1,
    progress: 100,
    completedTasks: 2,
    totalTasks: 2,
    startDate: '2026/07/13',
    endDate: '2026/08/28',
    durationDays: 47,
    description: 'ระบบแดชบอร์ดสรุปยอดการผลิตรายวันอัตโนมัติ รวบรวมข้อมูลจากเครื่องจักรเข้าสู่ฐานข้อมูลส่วนกลาง'
  },
  {
    id: 'PRJ-003',
    name: 'ระบบจองห้องประชุม',
    category: 'ระบบซอฟต์แวร์',
    priority: 'ปกติ (Medium)',
    priorityLevel: 'normal',
    status: 'เสร็จแล้ว',
    statusCode: 'done',
    owner: {
      name: 'Supachai Meesuk',
      email: 'supachai.m@mecha.local',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=faces'
    },
    team: [
      { name: 'Korn', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=120&h=120&fit=crop&crop=faces' }
    ],
    teamCount: 1,
    progress: 100,
    completedTasks: 4,
    totalTasks: 4,
    startDate: '2026/07/06',
    endDate: '2026/08/31',
    durationDays: 57,
    description: 'เว็บแอปพลิเคชันจองห้องประชุมออนไลน์ พร้อมระบบแจ้งเตือนผ่านอีเมลและการเชื่อมต่อ Google Calendar'
  },
  {
    id: 'PRJ-004',
    name: 'ระบบสำรองข้อมูลอัตโนมัติ',
    category: 'ระบบซอฟต์แวร์',
    priority: 'สูง (High)',
    priorityLevel: 'high',
    status: 'กำลังดำเนินการ',
    statusCode: 'in_progress',
    owner: {
      name: 'Kittipat Samran',
      email: 'kittipat.s@mecha.local',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces'
    },
    team: [
      { name: 'Napat', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=faces' },
      { name: 'Supachai', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=faces' }
    ],
    teamCount: 2,
    progress: 65,
    completedTasks: 13,
    totalTasks: 20,
    startDate: '2026/09/01',
    endDate: '2026/10/01',
    durationDays: 30,
    description: 'พัฒนาระบบ Auto-Backup ข้อมูลเซิร์ฟเวอร์หลักไปยัง Cloud Storage รายคืน พร้อมแจ้งเตือนเมื่อเกิดข้อผิดพลาด'
  },
  {
    id: 'PRJ-005',
    name: 'ระบบสอบเทียบเครื่องมือวัด',
    category: 'คุณภาพและทดสอบ',
    priority: 'สูง (High)',
    priorityLevel: 'high',
    status: 'กำลังดำเนินการ',
    statusCode: 'in_progress',
    owner: {
      name: 'Napat Chaivaphon',
      email: 'napat.c@mecha.local',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=faces'
    },
    team: [
      { name: 'Wichai', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&h=120&fit=crop&crop=faces' }
    ],
    teamCount: 1,
    progress: 40,
    completedTasks: 4,
    totalTasks: 10,
    startDate: '2026/08/15',
    endDate: '2026/10/15',
    durationDays: 60,
    description: 'ระบบติดตามการสอบเทียบเครื่องมือวัดในแผนกการผลิต พร้อมแจ้งเตือนล่วงหน้าเมื่อครบรอบการตรวจสอบ'
  },
  {
    id: 'PRJ-006',
    name: 'ระบบแจ้งเตือนสต็อกใกล้หมด',
    category: 'ระบบซอฟต์แวร์',
    priority: 'สูง (High)',
    priorityLevel: 'high',
    status: 'รอตรวจสอบ',
    statusCode: 'review',
    owner: {
      name: 'Korn Tawonphon',
      email: 'korn.t@mecha.local',
      avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=120&h=120&fit=crop&crop=faces'
    },
    team: [
      { name: 'Kittipat', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces' },
      { name: 'Siriporn', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop&crop=faces' }
    ],
    teamCount: 2,
    progress: 85,
    completedTasks: 17,
    totalTasks: 20,
    startDate: '2026/10/01',
    endDate: '2026/10/15',
    durationDays: 15,
    description: 'ระบบแจ้งเตือนผ่าน Line Notify & Email เมื่อวัตถุดิบในคลังสินค้ามีจำนวนต่ำกว่า Minimum Safety Stock'
  },
  {
    id: 'PRJ-007',
    name: 'ปรับปรุงกระบวนการ QC บอร์ดอิเล็กทรอนิกส์',
    category: 'คุณภาพและทดสอบ',
    priority: 'ด่วนที่สุด (Urgent)',
    priorityLevel: 'urgent',
    status: 'ล่าช้า',
    statusCode: 'delayed',
    owner: {
      name: 'Siriporn Wongpradu',
      email: 'siriporn.w@mecha.local',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop&crop=faces'
    },
    team: [
      { name: 'Napat', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=faces' }
    ],
    teamCount: 1,
    progress: 30,
    completedTasks: 3,
    totalTasks: 10,
    startDate: '2026/09/10',
    endDate: '2026/10/20',
    durationDays: 40,
    description: 'โครงการปรับปรุงขั้นตอนตรวจสอบคุณภาพบอร์ดวงจร ลดเวลาในการตรวจลง 25% ด้วยกล้องจุลทรรศน์ดิจิทัล'
  },
  {
    id: 'PRJ-008',
    name: 'คู่มือการใช้งานเครื่องซอฟต์แวร์ CNC V3',
    category: 'เอกสารและการฝึกอบรม',
    priority: 'ปกติ (Medium)',
    priorityLevel: 'normal',
    status: 'ยังไม่เริ่ม',
    statusCode: 'todo',
    owner: {
      name: 'Thanawat Suwan',
      email: 'thanawat.s@mecha.local',
      avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&h=120&fit=crop&crop=faces'
    },
    team: [],
    teamCount: 0,
    progress: 0,
    completedTasks: 0,
    totalTasks: 5,
    startDate: '2026/11/15',
    endDate: '2026/12/15',
    durationDays: 30,
    description: 'จัดทำวิดีโอสาธิตและคู่มือ PDF สำหรับการใช้งานโปรแกรมควบคุมเครื่อง CNC รุ่นใหม่'
  }
];

const CATEGORIES = [
  'ทั้งหมด',
  'ระบบซอฟต์แวร์',
  'ระบบองค์กร',
  'คุณภาพและทดสอบ',
  'เอกสารและการฝึกอบรม'
];

const STATUS_LIST = [
  { id: 'all', label: 'ทุกสถานะ' },
  { id: 'done', label: 'เสร็จแล้ว', color: 'emerald' },
  { id: 'in_progress', label: 'กำลังดำเนินการ', color: 'indigo' },
  { id: 'review', label: 'รอตรวจสอบ', color: 'amber' },
  { id: 'todo', label: 'ยังไม่เริ่ม', color: 'slate' },
  { id: 'delayed', label: 'ล่าช้า', color: 'rose' }
];

export default function App() {
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // View Mode: 'grid' (Compact Cards), 'table' (High-density list), 'kanban' (Kanban board)
  const [viewMode, setViewMode] = useState('grid');
  
  // Compact density toggle
  const [isCompact, setIsCompact] = useState(true);

  // Selected project for detail modal drawer
  const [selectedProjectDetail, setSelectedProjectDetail] = useState(null);

  // Add / Edit Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'ระบบซอฟต์แวร์',
    priority: 'ปกติ (Medium)',
    status: 'กำลังดำเนินการ',
    ownerName: 'Supachai Meesuk',
    ownerEmail: 'supachai.m@mecha.local',
    totalTasks: 5,
    completedTasks: 0,
    startDate: '2026-11-12',
    endDate: '2026-12-12',
    description: ''
  });

  // Calculate Quick Summary Stats
  const stats = useMemo(() => {
    const total = projects.length;
    const completed = projects.filter(p => p.statusCode === 'done').length;
    const inProgress = projects.filter(p => p.statusCode === 'in_progress').length;
    const review = projects.filter(p => p.statusCode === 'review').length;
    const delayed = projects.filter(p => p.statusCode === 'delayed').length;
    return { total: 36, activeInList: total, completed, inProgress, review, delayed };
  }, [projects]);

  // Filter & Sort Projects
  const filteredProjects = useMemo(() => {
    return projects
      .filter(p => {
        const matchesSearch =
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.owner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.owner.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.category.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCat = selectedCategory === 'ทั้งหมด' || p.category === selectedCategory;
        const matchesStat = selectedStatus === 'all' || p.statusCode === selectedStatus;

        return matchesSearch && matchesCat && matchesStat;
      })
      .sort((a, b) => {
        if (sortBy === 'progress_desc') return b.progress - a.progress;
        if (sortBy === 'progress_asc') return a.progress - b.progress;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return 0; // Default order
      });
  }, [projects, searchQuery, selectedCategory, selectedStatus, sortBy]);

  // Helper for Status Badge Styling
  const getStatusBadge = (statusCode, label) => {
    switch (statusCode) {
      case 'done':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            {label || 'เสร็จแล้ว'}
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
            {label || 'กำลังดำเนินการ'}
          </span>
        );
      case 'review':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            {label || 'รอตรวจสอบ'}
          </span>
        );
      case 'delayed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            {label || 'ล่าช้า'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            {label || 'ยังไม่เริ่ม'}
          </span>
        );
    }
  };

  // Helper for Priority Badge Styling
  const getPriorityBadge = (priority) => {
    if (priority.includes('สูง') || priority.includes('High')) {
      return <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">สูง</span>;
    }
    if (priority.includes('ด่วน') || priority.includes('Urgent')) {
      return <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">ด่วนที่สุด</span>;
    }
    return <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">ปกติ (Medium)</span>;
  };

  // Delete project handler
  const handleDelete = (id, e) => {
    if (e) e.stopPropagation();
    setProjects(projects.filter(p => p.id !== id));
  };

  // Open Edit modal
  const handleOpenEdit = (project, e) => {
    if (e) e.stopPropagation();
    setEditingProject(project);
    setFormData({
      name: project.name,
      category: project.category,
      priority: project.priority,
      status: project.status,
      ownerName: project.owner.name,
      ownerEmail: project.owner.email,
      totalTasks: project.totalTasks,
      completedTasks: project.completedTasks,
      startDate: project.startDate.replaceAll('/', '-'),
      endDate: project.endDate.replaceAll('/', '-'),
      description: project.description
    });
    setIsFormModalOpen(true);
  };

  // Save Add/Edit
  const handleSaveForm = (e) => {
    e.preventDefault();
    const progressCalc = Math.round((formData.completedTasks / (formData.totalTasks || 1)) * 100);
    let code = 'in_progress';
    if (formData.status === 'เสร็จแล้ว') code = 'done';
    if (formData.status === 'รอตรวจสอบ') code = 'review';
    if (formData.status === 'ล่าช้า') code = 'delayed';
    if (formData.status === 'ยังไม่เริ่ม') code = 'todo';

    if (editingProject) {
      setProjects(projects.map(p => p.id === editingProject.id ? {
        ...p,
        name: formData.name,
        category: formData.category,
        priority: formData.priority,
        status: formData.status,
        statusCode: code,
        completedTasks: Number(formData.completedTasks),
        totalTasks: Number(formData.totalTasks),
        progress: progressCalc,
        description: formData.description
      } : p));
    } else {
      const newProj = {
        id: `PRJ-00${projects.length + 1}`,
        name: formData.name,
        category: formData.category,
        priority: formData.priority,
        priorityLevel: 'normal',
        status: formData.status,
        statusCode: code,
        owner: {
          name: formData.ownerName,
          email: formData.ownerEmail,
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces'
        },
        team: [],
        teamCount: 1,
        progress: progressCalc,
        completedTasks: Number(formData.completedTasks),
        totalTasks: Number(formData.totalTasks),
        startDate: formData.startDate,
        endDate: formData.endDate,
        durationDays: 30,
        description: formData.description
      };
      setProjects([newProj, ...projects]);
    }
    setIsFormModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 font-sans antialiased pb-16">
      
      {/* TOP COMPACT BRAND NAVIGATION */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-indigo-500/20">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-bold text-base text-slate-900 tracking-tight leading-none flex items-center gap-2">
                ระบบจัดการโปรเจกต์
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-semibold border border-indigo-100">
                  v2.4
                </span>
              </h1>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setEditingProject(null);
                setFormData({
                  name: '',
                  category: 'ระบบซอฟต์แวร์',
                  priority: 'ปกติ (Medium)',
                  status: 'กำลังดำเนินการ',
                  ownerName: 'Supachai Meesuk',
                  ownerEmail: 'supachai.m@mecha.local',
                  totalTasks: 5,
                  completedTasks: 0,
                  startDate: '2026-11-12',
                  endDate: '2026-12-12',
                  description: ''
                });
                setIsFormModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center space-x-1.5 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>เพิ่มโปรเจกต์ใหม่</span>
            </button>
          </div>
        </div>
      </header>

      {/* DASHBOARD CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 space-y-4">
        
        {/* SUMMARY STATS & TITLE BAR (COMPACT RENDER) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>{stats.total} โปรเจกต์</span>
              <span className="text-xs font-normal text-slate-400">
                (แสดงอยู่ {filteredProjects.length} รายการ)
              </span>
            </h2>
          </div>

          {/* Stats Badges Pill Group */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-500"></span>
              <span>ทั้งหมด <strong className="font-bold text-slate-900">{stats.total}</strong></span>
            </div>
            <div className="px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>เสร็จแล้ว <strong className="font-bold">{stats.completed}</strong></span>
            </div>
            <div className="px-3 py-1 rounded-xl bg-indigo-50 border border-indigo-200 text-xs font-medium text-indigo-800 flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>กำลังดำเนินการ <strong className="font-bold">{stats.inProgress}</strong></span>
            </div>
            <div className="px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 text-xs font-medium text-amber-800 flex items-center space-x-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>รอตรวจสอบ <strong className="font-bold">{stats.review}</strong></span>
            </div>
            <div className="px-3 py-1 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-800 flex items-center space-x-1.5">
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>ล่าช้า <strong className="font-bold">{stats.delayed}</strong></span>
            </div>
          </div>
        </div>

        {/* TOOLBAR: SEARCH, FILTERS & VIEW MODE SWITCHER */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อโปรเจกต์, ผู้รับผิดชอบ หรืออีเมล..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 bg-slate-50/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filters Group */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Dropdown */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-700 focus:ring-2 focus:ring-indigo-200"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'ทั้งหมด' ? 'หมวดหมู่ทั้งหมด' : cat}
                  </option>
                ))}
              </select>

              {/* Status Dropdown */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-700 focus:ring-2 focus:ring-indigo-200"
              >
                {STATUS_LIST.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.label}
                  </option>
                ))}
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-700 focus:ring-2 focus:ring-indigo-200"
              >
                <option value="newest">เรียงตาม: ล่าสุด</option>
                <option value="progress_desc">ความคืบหน้า: สูงสุด</option>
                <option value="progress_asc">ความคืบหน้า: น้อยสุด</option>
                <option value="name">ชื่อโปรเจกต์ (A-Z)</option>
              </select>

              {/* View Layout Switcher */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 ml-auto lg:ml-0">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                    viewMode === 'grid'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="แสดงผลแบบการ์ดกะทัดรัด (Grid View)"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">การ์ด</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                    viewMode === 'table'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="แสดงผลแบบตารางแน่นหนา (Table / List View)"
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">ตาราง (แน่น)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('kanban')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                    viewMode === 'kanban'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="แสดงผลแบบกระดานสถานะ (Kanban View)"
                >
                  <Kanban className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">คันบัง</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* LAYOUT MODE 1: COMPACT GRID VIEW (SOLVES "กินพื้นที่" HIGH SPACE EFFICIENCY) */}
        {/* ========================================================================= */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 animate-in fade-in duration-200">
            {filteredProjects.map((prj) => (
              <div
                key={prj.id}
                onClick={() => setSelectedProjectDetail(prj)}
                className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all duration-200 flex flex-col justify-between group cursor-pointer relative"
              >
                {/* Card Header: Category Tag & Priority Badge */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/80 truncate">
                      {prj.category}
                    </span>
                    {getPriorityBadge(prj.priority)}
                  </div>

                  {/* Project Title */}
                  <h3 className="font-bold text-sm text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors line-clamp-2">
                    {prj.name}
                  </h3>

                  {/* Status Badge */}
                  <div className="mt-2.5 flex items-center justify-between">
                    {getStatusBadge(prj.statusCode, prj.status)}
                    <span className="text-[11px] font-bold text-slate-500">
                      {prj.completedTasks}/{prj.totalTasks} งาน
                    </span>
                  </div>

                  {/* Sleek Line Progress Bar */}
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500 font-medium">ความคืบหน้า (Milestone)</span>
                      <span className="font-bold text-slate-800">{prj.progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          prj.progress === 100
                            ? 'bg-emerald-500'
                            : prj.statusCode === 'delayed'
                            ? 'bg-rose-500'
                            : 'bg-indigo-600'
                        }`}
                        style={{ width: `${prj.progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Bottom Info: Owner & Dates */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2.5">
                  {/* Owner & Team Inline */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 truncate">
                      <img
                        src={prj.owner.avatar}
                        alt={prj.owner.name}
                        className="w-6 h-6 rounded-full object-cover ring-2 ring-indigo-50 shrink-0"
                      />
                      <div className="truncate">
                        <p className="text-[11px] font-semibold text-slate-700 truncate leading-none">
                          {prj.owner.email}
                        </p>
                        <p className="text-[10px] text-slate-400">ผู้รับผิดชอบ</p>
                      </div>
                    </div>

                    {/* Team Members Stacking */}
                    {prj.team.length > 0 && (
                      <div className="flex items-center -space-x-1.5 shrink-0">
                        {prj.team.map((t, i) => (
                          <img
                            key={i}
                            src={t.avatar}
                            alt={t.name}
                            className="w-5 h-5 rounded-full ring-2 ring-white object-cover"
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Date Range Badge */}
                  <div className="flex items-center justify-between bg-slate-50 px-2.5 py-1.5 rounded-xl text-[11px] text-slate-600 border border-slate-100">
                    <div className="flex items-center space-x-1.5 truncate">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono text-[10px]">{prj.startDate} → {prj.endDate}</span>
                    </div>
                    <span className="font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded text-[10px] shrink-0">
                      {prj.durationDays} วัน
                    </span>
                  </div>
                </div>

                {/* Quick Action Hover Bar */}
                <div className="mt-2 flex items-center justify-end space-x-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleOpenEdit(prj, e)}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-xs font-semibold flex items-center space-x-1"
                    title="แก้ไข"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>แก้ไข</span>
                  </button>
                  <button
                    onClick={(e) => handleDelete(prj.id, e)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-xs font-semibold flex items-center space-x-1"
                    title="ลบ"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ลบ</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ========================================================================= */}
        {/* LAYOUT MODE 2: HIGH-DENSITY TABLE / LIST VIEW (EXCELLENT SPACE SAVER)     */}
        {/* ========================================================================= */}
        {viewMode === 'table' && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden animate-in fade-in duration-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                  <tr>
                    <th className="py-3 px-4">ชื่อโปรเจกต์</th>
                    <th className="py-3 px-3">หมวดหมู่</th>
                    <th className="py-3 px-3">ความสำคัญ</th>
                    <th className="py-3 px-3">ผู้รับผิดชอบ</th>
                    <th className="py-3 px-3">ความคืบหน้า</th>
                    <th className="py-3 px-3">ระยะเวลา</th>
                    <th className="py-3 px-3">สถานะ</th>
                    <th className="py-3 px-4 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredProjects.map((prj) => (
                    <tr
                      key={prj.id}
                      onClick={() => setSelectedProjectDetail(prj)}
                      className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                    >
                      {/* Title */}
                      <td className="py-3 px-4 font-bold text-slate-900 group-hover:text-indigo-600 max-w-xs">
                        <div className="truncate">{prj.name}</div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px]">
                          {prj.category}
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {getPriorityBadge(prj.priority)}
                      </td>

                      {/* Owner */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <img
                            src={prj.owner.avatar}
                            alt={prj.owner.name}
                            className="w-5 h-5 rounded-full object-cover shrink-0"
                          />
                          <span className="text-slate-700 text-[11px]">{prj.owner.email}</span>
                        </div>
                      </td>

                      {/* Progress */}
                      <td className="py-3 px-3 whitespace-nowrap min-w-[130px]">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                prj.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                              }`}
                              style={{ width: `${prj.progress}%` }}
                            />
                          </div>
                          <span className="font-bold text-slate-800 text-[11px]">
                            {prj.progress}%
                          </span>
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="py-3 px-3 whitespace-nowrap text-slate-500 text-[11px]">
                        <span className="font-mono">{prj.startDate} - {prj.endDate}</span>
                        <span className="ml-1 text-[10px] text-indigo-600 bg-indigo-50 px-1 rounded font-bold">
                          {prj.durationDays}d
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {getStatusBadge(prj.statusCode, prj.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={(e) => handleOpenEdit(prj, e)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors"
                            title="แก้ไข"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(prj.id, e)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors"
                            title="ลบ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* LAYOUT MODE 3: KANBAN BOARD VIEW                                          */}
        {/* ========================================================================= */}
        {viewMode === 'kanban' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in duration-200 items-start">
            {[
              { id: 'todo', label: 'ยังไม่เริ่ม', color: 'slate' },
              { id: 'in_progress', label: 'กำลังดำเนินการ', color: 'indigo' },
              { id: 'review', label: 'รอตรวจสอบ', color: 'amber' },
              { id: 'done', label: 'เสร็จแล้ว', color: 'emerald' }
            ].map((col) => {
              const colProjects = filteredProjects.filter(p => p.statusCode === col.id);
              return (
                <div key={col.id} className="bg-slate-200/50 p-3 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="font-bold text-xs text-slate-700 flex items-center space-x-2">
                      <span>{col.label}</span>
                      <span className="w-5 h-5 rounded-full bg-white text-slate-700 flex items-center justify-center text-[10px] font-bold shadow-sm">
                        {colProjects.length}
                      </span>
                    </h4>
                  </div>

                  <div className="space-y-2.5">
                    {colProjects.map((prj) => (
                      <div
                        key={prj.id}
                        onClick={() => setSelectedProjectDetail(prj)}
                        className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:shadow transition-all cursor-pointer space-y-2"
                      >
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {prj.category}
                        </span>
                        <h5 className="font-bold text-xs text-slate-900 leading-tight">
                          {prj.name}
                        </h5>
                        
                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                          <div className="flex items-center space-x-1.5">
                            <img src={prj.owner.avatar} className="w-4 h-4 rounded-full" />
                            <span className="truncate max-w-[100px]">{prj.owner.name.split(' ')[0]}</span>
                          </div>
                          <span className="font-bold text-indigo-600">{prj.progress}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* PROJECT DETAIL MODAL DRAWER                                               */}
      {/* ========================================================================= */}
      {selectedProjectDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={() => setSelectedProjectDetail(null)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-5 z-10 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {selectedProjectDetail.category}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  {selectedProjectDetail.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedProjectDetail(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">สถานะโปรเจกต์</span>
                {getStatusBadge(selectedProjectDetail.statusCode, selectedProjectDetail.status)}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">ผู้รับผิดชอบ (Owner)</span>
                <div className="flex items-center space-x-2">
                  <img src={selectedProjectDetail.owner.avatar} className="w-5 h-5 rounded-full" />
                  <span className="font-semibold">{selectedProjectDetail.owner.email}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">ระยะเวลาดำเนินงาน</span>
                <span className="font-semibold font-mono">{selectedProjectDetail.startDate} - {selectedProjectDetail.endDate} ({selectedProjectDetail.durationDays} วัน)</span>
              </div>
              <div className="space-y-1 pt-2">
                <div className="flex justify-between font-bold text-slate-700">
                  <span>ความคืบหน้า (Progress)</span>
                  <span>{selectedProjectDetail.progress}% ({selectedProjectDetail.completedTasks}/{selectedProjectDetail.totalTasks} งาน)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full"
                    style={{ width: `${selectedProjectDetail.progress}%` }}
                  />
                </div>
              </div>
              <div className="pt-2">
                <h4 className="font-bold text-slate-800 mb-1">คำอธิบายโปรเจกต์:</h4>
                <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {selectedProjectDetail.description}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
              <button
                onClick={() => setSelectedProjectDetail(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD / EDIT PROJECT MODAL                                                  */}
      {/* ========================================================================= */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={() => setIsFormModalOpen(false)}
          />
          <form
            onSubmit={handleSaveForm}
            className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl p-6 space-y-4 z-10 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingProject ? 'แก้ไขโปรเจกต์' : 'เพิ่มโปรเจกต์ใหม่'}
              </h3>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">ชื่อโปรเจกต์ *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ระบุชื่อโปรเจกต์..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">หมวดหมู่</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                  >
                    {CATEGORIES.filter(c => c !== 'ทั้งหมด').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">สถานะ</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                  >
                    <option value="ยังไม่เริ่ม">ยังไม่เริ่ม</option>
                    <option value="กำลังดำเนินการ">กำลังดำเนินการ</option>
                    <option value="รอตรวจสอบ">รอตรวจสอบ</option>
                    <option value="เสร็จแล้ว">เสร็จแล้ว</option>
                    <option value="ล่าช้า">ล่าช้า</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">งานที่เสร็จแล้ว</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.completedTasks}
                    onChange={(e) => setFormData({ ...formData, completedTasks: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">งานทั้งหมด</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.totalTasks}
                    onChange={(e) => setFormData({ ...formData, totalTasks: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">คำอธิบาย</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="ระบุรายละเอียดเพิ่มเติม..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/20"
              >
                บันทึกข้อมูล
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}