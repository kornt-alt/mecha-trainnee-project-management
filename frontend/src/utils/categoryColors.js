// frontend/src/utils/categoryColors.js — แหล่งรวมค่าคงที่สีประเภทโครงการส่วนกลาง (Single Source of Truth)
// เพื่อให้ "Project Category Distribution" (Treemap) และ "การวิเคราะห์เปรียบเทียบงบประมาณตามหมวดหมู่" (Stacked Bar)
// อ่านค่าสีจากจุดเดียวกันอย่างสม่ำเสมอ ป้องกันปัญหาสีไม่ตรงกัน และรองรับการเปลี่ยนสีประเภทโครงการในอนาคต

/**
 * แม่สีหลักสำหรับแต่ละประเภทโครงการ (Project Category Base Colors)
 * ใช้อ้างอิงเป็น Single Source of Truth ทั่วทั้งระบบ
 * เมื่อมีการปรับปรุงชุดสีจาก Treemap Heatmap หรือกิ่ง (Branch) อื่น
 * สามารถแก้ไขค่าสีที่ Object นี้จุดเดียวเพื่ออัปเดตสีของทั้งสองกราฟพร้อมกัน
 */
export const PROJECT_CATEGORY_COLORS = {
  // แม่สีตามธีมระบบ (ตรงกับ Project Category Distribution)
  'ระบบซอฟต์แวร์': '#1B4FA0',       // var(--blue)
  'คุณภาพและทดสอบ': '#1F7A4D',      // var(--green)
  'เอกสารและการฝึกอบรม': '#D97706', // var(--amber)
  'ระบบอัตโนมัติ': '#5B6B82',       // var(--muted)
  'ระบบองค์กร': '#C42032',          // var(--red)
  'ซ่อมบำรุง': '#153E7E',           // var(--blue-hover)

  // English aliases สำหรับเรียกใช้งานในโค้ดส่วนอื่น
  software: '#1B4FA0',
  quality: '#1F7A4D',
  documentation: '#D97706',
  automation: '#5B6B82',
  corporate: '#C42032',
  maintenance: '#153E7E',
};

/**
 * ตารางแปลงชื่อและคำพ้อง (Aliases) ของประเภทโครงการทุกรูปแบบ (ไทย/อังกฤษ/ตัวพิมพ์ใหญ่-เล็ก)
 * เข้าสู่ Canonical Category Key เพื่อให้ได้สีเดียวกันอย่างสม่ำเสมอ 100%
 */
export const CATEGORY_ALIAS_MAP = {
  // ระบบอัตโนมัติ (Automation) -> #5B6B82 (var(--muted))
  'ระบบอัตโนมัติ': 'ระบบอัตโนมัติ',
  'อัตโนมัติ': 'ระบบอัตโนมัติ',
  'automation': 'ระบบอัตโนมัติ',
  'mas': 'ระบบอัตโนมัติ',
  'mechanical automation & software': 'ระบบอัตโนมัติ',

  // ระบบซอฟต์แวร์ (Software) -> #1B4FA0 (var(--blue))
  'ระบบซอฟต์แวร์': 'ระบบซอฟต์แวร์',
  'ซอฟต์แวร์': 'ระบบซอฟต์แวร์',
  'software': 'ระบบซอฟต์แวร์',

  // คุณภาพและทดสอบ (Quality & Testing) -> #1F7A4D (var(--green))
  'คุณภาพและทดสอบ': 'คุณภาพและทดสอบ',
  'คุณภาพ': 'คุณภาพและทดสอบ',
  'ทดสอบ': 'คุณภาพและทดสอบ',
  'quality': 'คุณภาพและทดสอบ',
  'testing': 'คุณภาพและทดสอบ',
  'qa': 'คุณภาพและทดสอบ',

  // เอกสารและการฝึกอบรม (Documentation & Training) -> #D97706 (var(--amber))
  'เอกสารและการฝึกอบรม': 'เอกสารและการฝึกอบรม',
  'เอกสาร': 'เอกสารและการฝึกอบรม',
  'การฝึกอบรม': 'เอกสารและการฝึกอบรม',
  'documentation': 'เอกสารและการฝึกอบรม',
  'training': 'เอกสารและการฝึกอบรม',

  // ระบบองค์กร (Corporate / Enterprise) -> #C42032 (var(--red))
  'ระบบองค์กร': 'ระบบองค์กร',
  'องค์กร': 'ระบบองค์กร',
  'corporate': 'ระบบองค์กร',
  'enterprise': 'ระบบองค์กร',

  // ซ่อมบำรุง (Maintenance) -> #153E7E (var(--blue-hover))
  'ซ่อมบำรุง': 'ซ่อมบำรุง',
  'บำรุงรักษา': 'ซ่อมบำรุง',
  'maintenance': 'ซ่อมบำรุง',
};

/** ลำดับสีสำรองกรณีพบประเภทโครงการใหม่ที่ยังไม่ได้ระบุใน PROJECT_CATEGORY_COLORS */
export const DEFAULT_CATEGORY_COLORS = [
  '#1B4FA0', // blue
  '#1F7A4D', // green
  '#D97706', // amber
  '#5B6B82', // muted
  '#C42032', // red
  '#153E7E', // blue-hover
];

/** สีหมวดหมู่กลางสำหรับกรณีที่ไม่สามารถระบุหมวดหมู่ได้ เพื่อป้องกันการแสดงสีน้ำเงินหรือเทาโดยไม่ตั้งใจ */
export const UNMAPPED_CATEGORY_COLOR = '#64748B';

/**
 * ฟังก์ชันปรับแต่งชื่อหมวดหมู่ให้เป็นมาตรฐาน (ตัดช่องว่างหัวท้าย และแปลงเป็นตัวพิมพ์เล็ก)
 * @param {string} name ชื่อประเภทโครงการ
 * @returns {string} ชื่อที่ปรับแต่งแล้ว
 */
export const normalizeCategoryName = (name) => {
  if (!name || typeof name !== 'string') return '';
  return name.trim().toLowerCase();
};

/**
 * ดึงแม่สีหลักตามชื่อประเภทโครงการ โดยรองรับทั้งชื่อตรง, ชื่อที่ตัดช่องว่าง, ชื่อภาษาอังกฤษ และคำพ้อง
 * ป้องกันปัญหาหมวดเดียวกันได้สีต่างกันเนื่องจากการสะกดหรือตัวพิมพ์
 *
 * @param {string} categoryName ชื่อประเภทโครงการ
 * @param {number|null} [fallbackIndex=null] ลำดับสำรองกรณีไม่พบชื่อประเภท
 * @returns {string} รหัสสี Hex (เช่น '#5B6B82')
 */
export const getCategoryBaseColor = (categoryName, fallbackIndex = null) => {
  if (categoryName && typeof categoryName === 'string') {
    // 1. Direct match กับ PROJECT_CATEGORY_COLORS
    if (PROJECT_CATEGORY_COLORS[categoryName]) {
      return PROJECT_CATEGORY_COLORS[categoryName];
    }
    // 2. ปรับตัวพิมพ์และตัดช่องว่าง
    const normalized = normalizeCategoryName(categoryName);
    if (PROJECT_CATEGORY_COLORS[normalized]) {
      return PROJECT_CATEGORY_COLORS[normalized];
    }
    // 3. แมปผ่าน Alias Map
    const canonical = CATEGORY_ALIAS_MAP[normalized];
    if (canonical && PROJECT_CATEGORY_COLORS[canonical]) {
      return PROJECT_CATEGORY_COLORS[canonical];
    }
  }

  // 4. หากมี fallbackIndex ที่เป็นตัวเลข และมีชุดสีสำรอง
  if (Number.isFinite(fallbackIndex) && DEFAULT_CATEGORY_COLORS.length > 0) {
    return DEFAULT_CATEGORY_COLORS[fallbackIndex % DEFAULT_CATEGORY_COLORS.length];
  }

  return UNMAPPED_CATEGORY_COLOR;
};
