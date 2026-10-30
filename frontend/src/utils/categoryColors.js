// frontend/src/utils/categoryColors.js — สีของ project category ที่ใช้ร่วมกันทั้งระบบ (ไฟล์เดียวเท่านั้น)
//
// Treemap (ProjectCategoryTreemap.js) และ Stacked Bar Graph (BudgetBarChart) ต้องเรียกผ่านไฟล์นี้
// เพื่อให้ category เดียวกันได้สีเดียวกันในทุกกราฟ — ห้าม define palette ซ้ำใน component
//
// ⚠️ ค่าทั้งหมดอ้างอิง CSS variables จาก styles/tokens.css (ห้ามใส่สีตรงตามกติกาของ repo)
// ลำดับใน CATEGORY_COLORS = ลำดับการ assign สี (วนตาม index ของ category หลัง sort)

export const CATEGORY_COLORS = [
  { variable: 'var(--blue)', hex: '#1B4FA0' },
  { variable: 'var(--green)', hex: '#1F7A4D' },
  { variable: 'var(--amber)', hex: '#D97706' },
  { variable: 'var(--muted)', hex: '#5B6B82' },
  { variable: 'var(--red)', hex: '#C42032' },
  { variable: 'var(--blue-hover)', hex: '#153E7E' },
];

/** สี (CSS variable) ของ category ที่อยู่ลำดับ index หลัง sort — วนกลับเมื่อเกินจำนวนสี */
export const categoryColorByIndex = (index) => CATEGORY_COLORS[index % CATEGORY_COLORS.length].variable;

/** สีพร้อม HEX จริง (สำหรับ component ที่ต้องคำนวณ tonal variation เช่น Stacked Bar) */
export const categoryColorEntry = (index) => CATEGORY_COLORS[index % CATEGORY_COLORS.length];

/** ลำดับสีสำรองกรณีพบประเภทโครงการใหม่ที่ยังไม่ได้ระบุใน PROJECT_CATEGORY_COLORS (อ้างอิงจาก CATEGORY_COLORS) */
export const DEFAULT_CATEGORY_COLORS = CATEGORY_COLORS.map((c) => c.hex);

/**
 * แม่สีหลักสำหรับแต่ละประเภทโครงการ (Project Category Base Colors)
 * เชื่อมโยงโดยตรงกับแม่สีใน CATEGORY_COLORS เพื่อเป็น Single Source of Truth ร่วมกัน
 */
export const PROJECT_CATEGORY_COLORS = {
  'ระบบซอฟต์แวร์': CATEGORY_COLORS[0].hex,       // #1B4FA0 var(--blue)
  'คุณภาพและทดสอบ': CATEGORY_COLORS[1].hex,      // #1F7A4D var(--green)
  'เอกสารและการฝึกอบรม': CATEGORY_COLORS[2].hex, // #D97706 var(--amber)
  'ระบบอัตโนมัติ': CATEGORY_COLORS[3].hex,       // #5B6B82 var(--muted)
  'ระบบองค์กร': CATEGORY_COLORS[4].hex,          // #C42032 var(--red)
  'ซ่อมบำรุง': CATEGORY_COLORS[5].hex,           // #153E7E var(--blue-hover)

  // English aliases สำหรับเรียกใช้งานในโค้ดส่วนอื่น
  software: CATEGORY_COLORS[0].hex,
  quality: CATEGORY_COLORS[1].hex,
  documentation: CATEGORY_COLORS[2].hex,
  automation: CATEGORY_COLORS[3].hex,
  corporate: CATEGORY_COLORS[4].hex,
  maintenance: CATEGORY_COLORS[5].hex,
};

/**
 * ตารางแปลงชื่อและคำพ้อง (Aliases) ของประเภทโครงการทุกรูปแบบ (ไทย/อังกฤษ/ตัวพิมพ์ใหญ่-เล็ก)
 * เข้าสู่ Canonical Category Key เพื่อให้ได้สีเดียวกันอย่างสม่ำเสมอ 100%
 */
export const CATEGORY_ALIAS_MAP = {
  // ระบบอัตโนมัติ (Automation) -> var(--muted) #5B6B82
  'ระบบอัตโนมัติ': 'ระบบอัตโนมัติ',
  'อัตโนมัติ': 'ระบบอัตโนมัติ',
  'automation': 'ระบบอัตโนมัติ',
  'mas': 'ระบบอัตโนมัติ',
  'mechanical automation & software': 'ระบบอัตโนมัติ',

  // ระบบซอฟต์แวร์ (Software) -> var(--blue) #1B4FA0
  'ระบบซอฟต์แวร์': 'ระบบซอฟต์แวร์',
  'ซอฟต์แวร์': 'ระบบซอฟต์แวร์',
  'software': 'ระบบซอฟต์แวร์',

  // คุณภาพและทดสอบ (Quality & Testing) -> var(--green) #1F7A4D
  'คุณภาพและทดสอบ': 'คุณภาพและทดสอบ',
  'คุณภาพ': 'คุณภาพและทดสอบ',
  'ทดสอบ': 'คุณภาพและทดสอบ',
  'quality': 'คุณภาพและทดสอบ',
  'testing': 'คุณภาพและทดสอบ',
  'qa': 'คุณภาพและทดสอบ',

  // เอกสารและการฝึกอบรม (Documentation & Training) -> var(--amber) #D97706
  'เอกสารและการฝึกอบรม': 'เอกสารและการฝึกอบรม',
  'เอกสาร': 'เอกสารและการฝึกอบรม',
  'การฝึกอบรม': 'เอกสารและการฝึกอบรม',
  'documentation': 'เอกสารและการฝึกอบรม',
  'training': 'เอกสารและการฝึกอบรม',

  // ระบบองค์กร (Corporate / Enterprise) -> var(--red) #C42032
  'ระบบองค์กร': 'ระบบองค์กร',
  'องค์กร': 'ระบบองค์กร',
  'corporate': 'ระบบองค์กร',
  'enterprise': 'ระบบองค์กร',

  // ซ่อมบำรุง (Maintenance) -> var(--blue-hover) #153E7E
  'ซ่อมบำรุง': 'ซ่อมบำรุง',
  'บำรุงรักษา': 'ซ่อมบำรุง',
  'maintenance': 'ซ่อมบำรุง',
};

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
