// frontend/src/components/common/Icons.js — Lucide-style SVG Icons (zero external dependencies)
import React from 'react';

function createIcon(svgContent, displayName) {
  const Icon = ({ size = 18, strokeWidth = 2, className = '', color = 'currentColor', style, ...props }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`lucide-icon ${className}`.trim()}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-hidden="true"
      {...props}
    >
      {svgContent}
    </svg>
  );
  Icon.displayName = displayName;
  return Icon;
}

// 1. House (หน้าหลัก)
export const House = createIcon(
  <>
    <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
    <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </>,
  'House'
);

// 2. Folder (โปรเจกต์)
export const Folder = createIcon(
  <>
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 8 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
  </>,
  'Folder'
);

// 2.1 FolderKanban (โปรเจกต์ทั้งหมด / บอร์ดโปรเจกต์)
export const FolderKanban = createIcon(
  <>
    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 8 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
    <path d="M8 10v4" />
    <path d="M12 10v2" />
    <path d="M16 10v4" />
  </>,
  'FolderKanban'
);

// 2.2 ClipboardCheck (รอการตรวจสอบ / รีวิว)
export const ClipboardCheck = createIcon(
  <>
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="m9 14 2 2 4-4" />
  </>,
  'ClipboardCheck'
);

// 2.3 CalendarClock (ใกล้ถึงกำหนดส่ง)
export const CalendarClock = createIcon(
  <>
    <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5" />
    <path d="M16 2v4" />
    <path d="M8 2v4" />
    <path d="M3 10h5" />
    <circle cx="17" cy="17" r="5" />
    <path d="M17 15v2h2" />
  </>,
  'CalendarClock'
);

// 3. ClipboardList (ตารางงาน / รายการงาน)
export const ClipboardList = createIcon(
  <>
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="M12 11h4" />
    <path d="M12 16h4" />
    <path d="M8 11h.01" />
    <path d="M8 16h.01" />
  </>,
  'ClipboardList'
);

// 4. ChartNoAxesColumn (รายงาน)
export const ChartNoAxesColumn = createIcon(
  <>
    <line x1="18" x2="18" y1="20" y2="10" />
    <line x1="12" x2="12" y1="20" y2="4" />
    <line x1="6" x2="6" y1="20" y2="14" />
  </>,
  'ChartNoAxesColumn'
);

// 5. Settings (ตั้งค่า)
export const Settings = createIcon(
  <>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </>,
  'Settings'
);

// 6. Clock (เวลา / กำหนดส่ง)
export const Clock = createIcon(
  <>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </>,
  'Clock'
);

// 7. UserRound (ผู้ใช้)
export const UserRound = createIcon(
  <>
    <circle cx="12" cy="8" r="5" />
    <path d="M20 21a8 8 0 0 0-16 0" />
  </>,
  'UserRound'
);

// 8. CalendarDays (กำหนดส่ง / วันที่)
export const CalendarDays = createIcon(
  <>
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <path d="M3 10h18" />
    <path d="M8 14h.01" />
    <path d="M12 14h.01" />
    <path d="M16 14h.01" />
    <path d="M8 18h.01" />
    <path d="M12 18h.01" />
    <path d="M16 18h.01" />
  </>,
  'CalendarDays'
);

// 9. CircleCheck (งานเสร็จแล้ว)
export const CircleCheck = createIcon(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </>,
  'CircleCheck'
);

// 10. CircleAlert (งานที่ยังไม่เสร็จ / งานเร่งด่วน)
export const CircleAlert = createIcon(
  <>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="8" y2="12" />
    <line x1="12" x2="12.01" y1="16" y2="16" />
  </>,
  'CircleAlert'
);

// 11. ChartPie (ความคืบหน้า)
export const ChartPie = createIcon(
  <>
    <path d="M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55 -.055-.997.398-.997.95V12z" />
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
  </>,
  'ChartPie'
);

// 12. Bell (การแจ้งเตือน)
export const Bell = createIcon(
  <>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </>,
  'Bell'
);

// 13. ChevronDown
export const ChevronDown = createIcon(
  <>
    <path d="m6 9 6 6 6-6" />
  </>,
  'ChevronDown'
);

// 14. ChevronRight
export const ChevronRight = createIcon(
  <>
    <path d="m9 18 6-6-6-6" />
  </>,
  'ChevronRight'
);

// ChevronLeft
export const ChevronLeft = createIcon(
  <>
    <path d="m15 18-6-6 6-6" />
  </>,
  'ChevronLeft'
);

// ChevronUp
export const ChevronUp = createIcon(
  <>
    <path d="m18 15-6-6-6 6" />
  </>,
  'ChevronUp'
);

// 15. ExternalLink
export const ExternalLink = createIcon(
  <>
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </>,
  'ExternalLink'
);

// 16. LogOut
export const LogOut = createIcon(
  <>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" x2="9" y1="12" y2="12" />
  </>,
  'LogOut'
);

// 17. Eye (ดูรายละเอียด)
export const Eye = createIcon(
  <>
    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
    <circle cx="12" cy="12" r="3" />
  </>,
  'Eye'
);

// 18. Activity (กิจกรรมล่าสุด)
export const Activity = createIcon(
  <>
    <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 3.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.48 13H2" />
  </>,
  'Activity'
);

// 19. Check
export const Check = createIcon(
  <>
    <polyline points="20 6 9 17 4 12" />
  </>,
  'Check'
);

// 19.1 Search (ค้นหา)
export const Search = createIcon(
  <>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </>,
  'Search'
);

// 20. Filter
export const Filter = createIcon(
  <>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </>,
  'Filter'
);

// 21. Layers (ระบบ / โครงสร้าง)
export const Layers = createIcon(
  <>
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </>,
  'Layers'
);

// 22. Info
export const Info = createIcon(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </>,
  'Info'
);

// 23. ArrowUpRight
export const ArrowUpRight = createIcon(
  <>
    <line x1="7" x2="17" y1="17" y2="7" />
    <polyline points="7 7 17 7 17 17" />
  </>,
  'ArrowUpRight'
);

// Aliases for common icon naming conventions
export const CheckCircle2 = CircleCheck;
export const AlertCircle = CircleAlert;
