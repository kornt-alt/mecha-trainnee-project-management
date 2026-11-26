// frontend/src/components/nav.js — รายการเมนูใน sidebar (เพิ่มหน้าใหม่ให้เพิ่มที่นี่ + <Route> ใน App.js)
// to = path ใต้ APP_BASE (ไม่ต้องใส่ /PROJECT-MANAGEMENT — Router basename ต่อให้)

// เมนูหลักของผู้ใช้ทุกคน (งานติดตามโปรเจกต์)
export const NAV = [
  { to: '/', label: 'หน้าหลัก', icon: 'House', end: true },
  { to: '/projects', label: 'โปรเจกต์', icon: 'Folder' },
  { to: '/tasks', label: 'ตารางงาน', icon: 'ClipboardList' },
  { to: '/workload', label: 'Workload', icon: 'Users' },
  { to: '/boards', label: 'บอร์ด', icon: 'Layers' },
  { to: '/reports', label: 'รายงาน', icon: 'ChartNoAxesColumn' },
  { to: '/notifications', label: 'การแจ้งเตือน', icon: 'Bell' },
  // 'ตั้งค่า' (/settings) ซ่อนไว้จนกว่าจะมีหน้าจริง — route ยังอยู่ใน App.js
];

// เมนูผู้ดูแลระบบ — เรื่องความปลอดภัย / log / การส่งออก ไม่เกี่ยวกับงานประจำวันของผู้ใช้ทั่วไป
// แสดงเฉพาะ role ADMIN (Layout.js ใช้ useMockData().access.isAdmin) · หน้าเหล่านี้ห่อด้วย admin/RequireAdmin.js ใน App.js
export const ADMIN_NAV = [
  { to: '/admin/users', label: 'จัดการผู้ใช้', icon: 'Users' },
  { to: '/security/incidents', label: 'เหตุการณ์ความปลอดภัย', icon: 'CircleAlert' },
  { to: '/audit-log', label: 'บันทึกการตรวจสอบ', icon: 'Activity' },
  { to: '/exports', label: 'ประวัติการส่งออก', icon: 'FileText' },
];
