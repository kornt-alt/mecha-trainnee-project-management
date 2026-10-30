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

/** Convert hex string to HSL object { h, s, l } with integer percentages. */
export const hexToHsl = (hex) => {
  if (!hex || typeof hex !== 'string') return { h: 215, s: 16, l: 47 }; // Default fallback HSL (#64748B)
  const cleaned = hex.replace('#', '');
  const full = cleaned.length === 3 ? cleaned.split('').map((c) => c + c).join('') : cleaned;
  if (full.length !== 6) return { h: 215, s: 16, l: 47 };
  const r = parseInt(full.substring(0, 2), 16) / 255;
  const g = parseInt(full.substring(2, 4), 16) / 255;
  const b = parseInt(full.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: break;
    }
    h = Math.round(h * 60);
  }
  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
};

/** Convert HSL (h: 0..360, s: 0..100, l: 0..100) back to 6-char upper hex code (#RRGGBB). */
export const hslToHex = (h, s, l) => {
  const normL = Math.max(0, Math.min(100, l)) / 100;
  const normS = Math.max(0, Math.min(100, s)) / 100;
  const a = normS * Math.min(normL, 1 - normL);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = normL - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
};

/**
 * ขอบเขตความสว่างที่ปลอดภัย (Safe Lightness Limits)
 * ป้องกันไม่ให้สีกลายเป็นสีดำสนิท (L < 20%) หรือสีขาวโพลน (L > 80%)
 * ซึ่งจะทำให้สูญเสียค่า Hue, Saturation และความเป็นเอกลักษณ์ของหมวดหมู่
 */
export const SAFE_LIGHTNESS_LIMITS = {
  MIN: 20,
  MAX: 80,
};

/**
 * แปลงชื่อประเภท, ตัวแปร CSS หรือรหัสสี Hex ให้เป็นรหัสสี Hex มาตรฐาน
 * @param {string} categoryOrColor ชื่อประเภท, CSS variable หรือรหัสสี Hex
 * @returns {string} รหัสสี Hex (#RRGGBB)
 */
export const resolveBaseColor = (categoryOrColor) => {
  if (!categoryOrColor || typeof categoryOrColor !== 'string') {
    return UNMAPPED_CATEGORY_COLOR;
  }
  const trimmed = categoryOrColor.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) {
    const cleaned = trimmed.replace('#', '');
    const full = cleaned.length === 3 ? cleaned.split('').map((c) => c + c).join('') : cleaned;
    return `#${full}`.toUpperCase();
  }
  if (trimmed.startsWith('var(')) {
    const entry = CATEGORY_COLORS.find((c) => c.variable === trimmed);
    if (entry) return entry.hex;
  }
  const resolved = getCategoryBaseColor(trimmed);
  return resolved || UNMAPPED_CATEGORY_COLOR;
};

/**
 * คำนวณระดับความสว่างเป้าหมาย (Target Lightness) ตามเปอร์เซ็นต์อย่างแน่นอนและคงเส้นคงวา (Deterministic)
 * 
 * คุณสมบัติ:
 * 1. เปอร์เซ็นต์มากกว่า -> ความสว่างต่ำกว่า (สีเข้มขึ้น / มีน้ำหนักทางสายตามากขึ้น)
 * 2. เปอร์เซ็นต์น้อยกว่า -> ความสว่างสูงกว่า (สีสว่างขึ้น / โทนอ่อนลง)
 * 3. เปอร์เซ็นต์เท่ากัน -> ได้ระดับความสว่างเท่ากันในทุกหมวดหมู่ (Consistent across categories)
 * 4. ปลอดภัยต่อค่า input ที่ผิดพลาด (NaN, null, undefined, ค่าติดลบ, ค่าเกิน 100) โดยไม่ crash
 * 
 * @param {number} percentage เปอร์เซ็นต์ (0 - 100)
 * @param {Object} [options] ตัวเลือกเพิ่มเติม เช่น minLightness, maxLightness
 * @returns {number} ระดับความสว่างเป้าหมาย L (20 - 80)
 */
export const calculateTargetLightness = (percentage, options = {}) => {
  const minL = Math.max(SAFE_LIGHTNESS_LIMITS.MIN, Math.min(SAFE_LIGHTNESS_LIMITS.MAX, options.minLightness ?? 25));
  const maxL = Math.max(SAFE_LIGHTNESS_LIMITS.MIN, Math.min(SAFE_LIGHTNESS_LIMITS.MAX, options.maxLightness ?? 75));
  
  const num = typeof percentage === 'number' ? percentage : Number(percentage);
  const clamped = Number.isFinite(num) && !Number.isNaN(num)
    ? Math.max(0, Math.min(100, num))
    : 0;

  // ฟังก์ชันเส้นตรง: P = 0% -> maxL, P = 100% -> minL
  const target = maxL - (clamped / 100) * (maxL - minL);
  return Math.round(Math.max(SAFE_LIGHTNESS_LIMITS.MIN, Math.min(SAFE_LIGHTNESS_LIMITS.MAX, target)));
};

/**
 * แปลงสีของประเภทโครงการตามสัดส่วนเปอร์เซ็นต์ (Color Transformation Utility)
 * 
 * ข้อกำหนดตาม Requirement 12:
 * A. Consistent Lightness Across Categories: เปอร์เซ็นต์เดียวกันได้ค่าความสว่างระดับเดียวกันทุกหมวดหมู่
 * B. Preserve Original Colors at Boundary Conditions: คงค่า Hue และ Saturation เดิม ไม่เปลี่ยนเป็นสีเทาหรือสีอื่น และใช้ Safe Lightness Limits
 * C. Separate Percentage Colors from Interaction States: ผลลัพธ์เป็นสีพื้นฐาน ไม่ขึ้นกับ hover/highlight
 * D. Deterministic & Independent: ผลลัพธ์ขึ้นอยู่กับ (categoryColor, percentage) เท่านั้น ไม่ขึ้นกับลำดับการเรนเดอร์ ตัวกรอง หรือช่วงเวลา
 * 
 * @param {string} categoryColor ชื่อประเภทโครงการ, รหัสสี Hex, หรือ CSS variable
 * @param {number} percentage สัดส่วนเปอร์เซ็นต์ (0 - 100)
 * @param {Object} [options] ตัวเลือกเพิ่มเติม
 * @returns {string} รหัสสี Hex (#RRGGBB)
 */
export const transformColorByPercentage = (categoryColor, percentage, options = {}) => {
  const baseHex = resolveBaseColor(categoryColor);
  const { h, s } = hexToHsl(baseHex);
  const targetL = calculateTargetLightness(percentage, options);
  return hslToHex(h, s, targetL);
};
