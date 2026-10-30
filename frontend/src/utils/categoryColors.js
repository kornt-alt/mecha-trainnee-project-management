// frontend/src/utils/categoryColors.js — แหล่งรวมค่าคงที่สีประเภทโครงการส่วนกลาง (Single Source of Truth)
// เพื่อให้ "Project Category Distribution" (Treemap) และ "การวิเคราะห์เปรียบเทียบงบประมาณตามหมวดหมู่" (Stacked Bar)
// อ่านค่าสีจากจุดเดียวกัน และรองรับการเปลี่ยนสีประเภทโครงการในอนาคตได้จากตัวแปรนี้เพียงจุดเดียว

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

/** ลำดับสีสำรองกรณีพบประเภทโครงการใหม่ที่ยังไม่ได้ระบุใน PROJECT_CATEGORY_COLORS */
export const DEFAULT_CATEGORY_COLORS = [
  '#1B4FA0', // blue
  '#1F7A4D', // green
  '#D97706', // amber
  '#5B6B82', // muted
  '#C42032', // red
  '#153E7E', // blue-hover
];

/**
 * ดึงแม่สีหลักตามชื่อประเภทโครงการ
 * @param {string} categoryName ชื่อประเภทโครงการ
 * @param {number} [fallbackIndex=0] ลำดับสำรองกรณีไม่พบชื่อประเภท
 * @returns {string} รหัสสี Hex (เช่น '#1B4FA0')
 */
export const getCategoryBaseColor = (categoryName, fallbackIndex = 0) => {
  if (categoryName && PROJECT_CATEGORY_COLORS[categoryName]) {
    return PROJECT_CATEGORY_COLORS[categoryName];
  }
  return DEFAULT_CATEGORY_COLORS[fallbackIndex % DEFAULT_CATEGORY_COLORS.length];
};
