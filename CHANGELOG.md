# Changelog

## [Unreleased]

### Fixed
- frontend build ไม่ผ่าน (`'formatThaiDateTime' is not defined` ใน `Header.js`) จากการ merge `page/login` เข้ากับ `design_frontend` — แอปเปิดไม่ได้ทั้งระบบ
- `App.js` กลับมา render `RoutedApplication` พร้อม `NotificationCenterProvider` → หน้าแจ้งเตือน / เหตุการณ์ความปลอดภัย / บันทึกการตรวจสอบ / ประวัติการส่งออก และ login modal ที่หน้าแรกใช้งานได้อีกครั้ง (เดิมเมนูเหล่านี้ตกไปหน้า 404) · หน้า Project Workspace (`/projects/:id`) ยังเป็นหน้าเต็มจอนอก Layout ตามเดิม
- กระดิ่งแจ้งเตือนใน Header รวม 2 แหล่ง: แจ้งเตือนระบบ (ลิงก์ไปหน้ารายละเอียด) + แจ้งเตือนเปลี่ยนผู้รับผิดชอบงานของผู้ใช้ปัจจุบัน (ลิงก์ไปหน้าโปรเจกต์) · "อ่านทั้งหมด" ล้างทั้ง 2 แหล่ง
- ลบโค้ดที่ไม่ได้ใช้ใน `Workload.js`, `EmployeeDetailModal.js` ที่ทำให้ `CI=true npm run build` fail (ไม่เปลี่ยนพฤติกรรม)
- เทส Playwright 16 ตัวที่พังตั้งแต่เปลี่ยน mock data: เทสที่ต้องการ workspace ว่างย้ายไปใช้โปรเจกต์ 5 / 3 แทนโปรเจกต์ 1 (ซึ่งตอนนี้มีงานตัวอย่าง 8 งาน), แก้ตำแหน่งป้ายความสำคัญในหน้าทำงาน, ปรับขั้นตอนตามกฎ checklist → "กำลังทำ" อัตโนมัติ, และให้เทส legend บนมือถือไม่ผูกกับจุดตัดบรรทัดที่ขึ้นกับฟอนต์ของเครื่อง — ผ่านครบ 67/67

### Changed
- เขียน `CLAUDE.md` ใหม่ให้ตรงกับโค้ดปัจจุบัน: phase frontend-only (mock data ผ่าน `MockDataContext`), คำสั่ง build / unit test / Playwright, โครงสร้างหลัก, ค่าที่ต้องตรงกันหลายที่ และข้อควรระวัง (routes ที่ไม่ถูก render ใน `App.js`, `*.html` ใน `.gitignore`, แบบฝึกใน README ชนกับ `Tasks.js` ที่มีแล้ว)

### Added
- โครงโปรเจกต์ตามมาตรฐาน korn-web-stack: backend Express (CommonJS) + frontend CRA (React 19, react-router 7, bootstrap)
- APP_BASE `/PROJECT-MANAGEMENT`, backend port 3011, ต่อ MariaDB ผ่าน `mysql2` (`db/pool.js`) + `npm run db:apply` สร้างตาราง
- `/api/health` บอกสถานะการต่อฐานข้อมูล (หน้าแรกแสดงว่าระบบพร้อมหรือยัง)
- หมวดตัวอย่าง `projects`: ตาราง `projects`, API GET/POST/PATCH/DELETE, หน้ารายการโปรเจกต์ (กรองสถานะ, เพิ่ม/แก้ไข, เปลี่ยนสถานะ, ลบ, เตือนเลยกำหนดส่ง)
- `README.md` เป็นคู่มือสำหรับน้องฝึกงาน: ภาพรวมระบบ, เตรียมเครื่อง, เปิดโปรเจกต์ครั้งแรก, ไฟล์ไหนทำอะไร, database + SQL เบื้องต้น, เส้นทางของ request, แบบฝึกเพิ่มหมวด tasks ทีละขั้น (โค้ดทดสอบแล้ว), กฎการเขียนโค้ด, วิธีใช้ git (branch / commit / Pull Request / conflict), ตารางแก้ปัญหา, API, deploy
- `docs/images/` ภาพหน้าจอจริง 3 ภาพ + แผนภาพประกอบ 6 ภาพ (ธีม Prompt น้ำเงิน-แดง-ขาว)
- `CLAUDE.md` สรุปโครงและกฎสำหรับ Claude
