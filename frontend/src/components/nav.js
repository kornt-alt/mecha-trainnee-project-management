// frontend/src/components/nav.js — รายการเมนูใน sidebar (เพิ่มหน้าใหม่ให้เพิ่มที่นี่ + <Route> ใน App.js)
// to = path ใต้ APP_BASE (ไม่ต้องใส่ /PROJECT-MANAGEMENT — Router basename ต่อให้)

// เมนูหลักของผู้ใช้ทุกคน (งานติดตามโปรเจกต์)
export const NAV = [
  { to: '/', label: 'หน้าหลัก', icon: 'House', end: true },
  { to: '/projects', label: 'โปรเจกต์', icon: 'Folder' },
  { to: '/tasks', label: 'ตารางงาน', icon: 'ClipboardList' },
  { to: '/workload', label: 'Workload', icon: 'Users' },
  { to: '/reports', label: 'รายงาน', icon: 'ChartNoAxesColumn' },
  { to: '/notifications', label: 'การแจ้งเตือน', icon: 'Bell' },
  // 'ตั้งค่า' (/settings) ซ่อนไว้จนกว่าจะมีหน้าจริง — route ยังอยู่ใน App.js
];

// เมนูผู้ดูแลระบบ — เรื่องความปลอดภัย / log / การส่งออก ไม่เกี่ยวกับงานประจำวันของผู้ใช้ทั่วไป
// ⚠️ ตอนนี้ยังแสดงให้ทุกคนเห็น เพราะยังไม่ได้ต่อ login จริง (POST /auth/login ใน docs/api-contract.md)
//    ต่อ login แล้วให้ Layout.js แสดงกลุ่มนี้เฉพาะ user.role === 'ADMIN' (TODO ใน Layout.js)
export const ADMIN_NAV = [
  { to: '/security/incidents', label: 'เหตุการณ์ความปลอดภัย', icon: 'CircleAlert' },
  { to: '/audit-log', label: 'บันทึกการตรวจสอบ', icon: 'Activity' },
  { to: '/exports', label: 'ประวัติการส่งออก', icon: 'FileText' },
];
