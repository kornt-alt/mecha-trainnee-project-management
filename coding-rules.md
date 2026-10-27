# 8. กฎการเขียนโค้ดของทีม

## Backend

- ทุก route ครอบด้วย `wrap(...)` และต้องเรียก `res.json(...)` เอง
- error ที่ให้ผู้ใช้เห็น → `throw new AppError('ข้อความภาษาไทย', 400)`
  - `400` ข้อมูลผิด · `404` ไม่พบ · `409` ซ้ำ
  - error อื่น ๆ ระบบจะตอบ "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" ให้เอง ไม่ให้ข้อความ SQL หลุดไปหน้าเว็บ
- SQL อยู่ในโฟลเดอร์ `db/` เท่านั้น และใช้ `?` เสมอ
- ไม่เชื่อข้อมูลจากหน้าเว็บ — ตรวจซ้ำที่ backend ทุกครั้ง (คนยิง API ตรงได้โดยไม่ผ่านฟอร์ม)
- อ่านค่า `.env` ผ่าน `config/env.js` เท่านั้น — เพิ่มค่าใหม่ใน `.env` ต้องเพิ่มใน `.env.example` ด้วย

## Frontend

- เรียก backend ผ่าน `api.get/post/patch/del` จาก `utils/api.js` เท่านั้น (ไม่เขียน `fetch` เอง)
- ไฟล์เป็น `.js` · ใช้ component ของ `react-bootstrap` · สีใช้ `var(--blue)` ฯลฯ จาก `styles/tokens.css`
- ข้อความบนหน้าจอเป็นภาษาไทย · ชื่อตัวแปร / ฟังก์ชันเป็นภาษาอังกฤษ

## ทั่วไป

- บรรทัดแรกของไฟล์เขียนคอมเมนต์บอกว่าไฟล์นี้ทำอะไร
- คอมเมนต์อธิบาย "ทำไม" ไม่ใช่ "ทำอะไร" (โค้ดบอกอยู่แล้ว)
- ก่อนส่งงานรัน `npm run build` ใน `frontend/` ให้ผ่าน

## ค่าที่ต้องตรงกันหลายที่ (แก้ที่เดียวแล้วพัง)

| ค่า | ต้องแก้พร้อมกันที่ |
| --- | --- |
| `/PROJECT-MANAGEMENT` | `backend/.env` (`APP_BASE`) · `frontend/src/utils/config.js` · `homepage` ใน `frontend/package.json` · config Apache |
| สถานะโปรเจกต์ | `backend/db/schema.sql` · `backend/services/projects.js` · `frontend/src/utils/config.js` · สีใน `frontend/src/index.css` |
