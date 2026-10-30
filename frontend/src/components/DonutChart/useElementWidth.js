// frontend/src/components/DonutChart/useElementWidth.js
// วัดความกว้างจริงของ container ด้วย ResizeObserver — ใช้สร้าง geometry ที่ viewBox เท่าขนาดเรนเดอร์จริง
// เพื่อให้ข้อความใน foreignObject เรนเดอร์ 1:1 ตาม CSS px ไม่หดตาม viewBox
import { useEffect, useRef, useState } from 'react';

export default function useElementWidth(initialWidth = 320) {
  const ref = useRef(null);
  const [width, setWidth] = useState(initialWidth);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const next = entry?.contentRect?.width;
      if (Number.isFinite(next) && next > 0) setWidth(Math.round(next));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}
