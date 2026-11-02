// frontend/src/utils/scrollbarActivity.js — ทำให้ scrollbar ทั้งเว็บแสดงเฉพาะ "ระหว่างเลื่อนจริง"
// ทำงานร่วมกับส่วน Scrollbar ใน index.css: ตอนกำลังเลื่อนจะใส่ class .is-scrolling
// ให้ element ที่เลื่อน (document ใช้ <html>) แล้วลบออกหลังหยุดเลื่อน ~1 วินาที
// จึงเป็น global โดยไม่ต้องแก้ component แต่ละตัว และครอบคลุม container ที่เรนเดอร์ทีหลังด้วย

const SCROLLING_CLASS = 'is-scrolling';
const HIDE_DELAY_MS = 1000;

// เก็บ timer ต่อ element — WeakMap ให้ GC เก็บกวาด element ที่ถูกถอดออกจาก DOM ได้ ไม่มี memory leak
const hideTimers = new WeakMap();

function showScrollbar(el) {
  el.classList.add(SCROLLING_CLASS);
  clearTimeout(hideTimers.get(el));
  hideTimers.set(
    el,
    setTimeout(() => el.classList.remove(SCROLLING_CLASS), HIDE_DELAY_MS),
  );
}

// เริ่มฟังเพียงจุดเดียวต่อหน้า (capture รับ scroll ของทุก element รวมถึง document)
let started = false;

export function startScrollbarActivity() {
  if (started) return;
  started = true;

  document.addEventListener(
    'scroll',
    (event) => {
      // scroll event ของ document มี target เป็น document — ใช้ <html> แทน
      showScrollbar(event.target === document ? document.documentElement : event.target);
    },
    { capture: true, passive: true },
  );
}
