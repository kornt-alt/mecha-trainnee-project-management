# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# PROJECT_MANAGEMENT ("MECHA — Project Management") — โปรเจกต์น้องฝึกงาน

เว็บจัดการและติดตามสถานะโปรเจกต์ โครงตาม skill `korn-web-stack` (ต้นแบบ `D:\SCRIPT\WEB\MECHA2_QC_GAUGE_SYSTEM`) — Korn ทำโครง, น้องฝึกงานพัฒนาต่อผ่าน branch + Pull Request บน GitHub (`kornt-alt`)

**อ่านก่อนแก้โค้ด:** `AGENTS.md` (กฎ agent: Superpowers workflow บังคับ, protected areas, git safety) · `coding-rules.md` (กฎทีม + Reuse First) · `README.md` (คู่มือน้อง) · notes ของ feature เช่น `frontend/WORKLOAD_IMPLEMENTATION_NOTES.md`, `frontend/workspace-changes.md`

## ⚠️ Phase ปัจจุบัน: frontend = mock (น้อง) · backend = Phase A เสร็จ (Korn)

- **สัญญากลาง frontend ↔ backend: `docs/api-contract.md`** — shape JSON = shape mock data, ตารางสิทธิ์, รายการเส้น ✅/⏳ · แก้ API ต้องแก้เอกสารนี้ด้วย
- backend Phase A (2026-11-20): schema ครบ, login (รหัสพนักงาน / บัตร / สมัคร), ADMIN จัดการผู้ใช้, GET ทุกหมวด + visibility (guest = public เท่านั้น) · **Phase B = เส้นเขียน** ย้ายกฎจาก `MockDataContext.js` ตามตารางในสัญญา (ตอนนี้ตอบ 501 จาก `middleware/notImplemented.js`)
- Korn อนุญาตให้ agent แตะ `backend/` เมื่อสั่งงาน backend (ยกเว้นจากข้อห้ามใน `AGENTS.md`) · ห้ามแตะ `frontend/src` ตอนทำงาน backend

- หน้าเกือบทั้งหมดอ่าน/เขียนข้อมูลผ่าน `frontend/src/context/MockDataContext.js` (`useMockData()`) ซึ่งเก็บ state ใน memory จาก `frontend/src/data/*.js` — รีเฟรชแล้วรีเซ็ต · การเชื่อม API จริงเลื่อนไป "Phase API Integration"
- ข้อยกเว้น: `Home.js`, `About.js` เรียก `useLoad('/health')` · `Projects.js` เรียก `/projects` จริงแต่ **ใช้ผล API ก็ต่อเมื่อได้ array ไม่ว่าง** ไม่งั้น fallback เป็น mock (`isApiConnected`) — อย่าทำให้ฟีเจอร์ mock พึ่ง API
- ตาม `AGENTS.md`: ห้ามแตะ `backend/`, `backend/db/` (schema/migration), `frontend/build/`, `.env` / config, และห้ามเพิ่ม/อัปเดต dependency — เว้นแต่ได้รับอนุญาตชัดเจนในเทิร์นนั้น

## Commands

```bash
# frontend (ใช้งานหลักใน phase นี้)
cd frontend
npm start                                   # http://localhost:3000/PROJECT-MANAGEMENT
CI=true npm run build                       # ตรวจ build — warning = error
CI=true npx react-scripts test --watchAll=false                               # unit test ทั้งหมด (Jest, *.test.js ใน src/)
CI=true npx react-scripts test --watchAll=false src/utils/notificationCenterUtils.test.js   # ไฟล์เดียว
npx playwright test                         # e2e ใน frontend/tests/ (เปิด npm start ให้เองถ้ายังไม่รัน)
npx playwright test tests/projects.spec.js  # ไฟล์เดียว

# backend
cd backend
npm run dev          # nodemon, port 3011 · API ที่ /PROJECT-MANAGEMENT/api
npm run db:apply     # รัน db/schema.sql ผ่าน mysql2 (เครื่อง server ไม่มี mysql CLI) — รันซ้ำได้
npm run db:seed      # ⚠️ ล้างทุกตาราง แล้วใส่ข้อมูลจาก frontend/src/data/mockData.js (dev เท่านั้น) · SEED_PASSWORD=… -- --yes ไม่ถาม
npm run user:add -- <userid> "<ชื่อ>" [ADMIN|USER]   # + user:passwd | user:disable | user:card | user:role | user:list
```

`package.json` ฝั่ง frontend ไม่มี script `test` — เรียก `react-scripts test` ตรงตามข้างบน · Playwright spec ดัก `**/api/projects**` ให้ abort เพื่อบังคับ mock mode

## Architecture

**Frontend** (CRA 5, React 19, react-router 7, react-bootstrap, ไฟล์ `.js`)
- `src/index.js` — ที่เดียวที่ import CSS ระดับแอป: bootstrap → `styles/tokens.css` → `index.css` → `styles/*.css` อื่น (ลำดับสำคัญ — tokens ต้อง override bootstrap) · component บางตัว import CSS ของตัวเอง (`Workload.js`, `ProjectCard.js`, `project-detail/ProjectDetail.js`, `DonutChart/`, `BudgetBarChart/`)
- `src/App.js` — `<Router basename={APP_BASE}>` → `NotificationCenterProvider` → `MockDataProvider` → routes ใต้ `<Layout>` (sidebar `components/nav.js` + `Header.js`) · `projects/:projectId` (`project-detail/ProjectDetail.js`, workspace หลายแท็บ) อยู่นอก Layout
  - `App` → providers → `RoutedApplication` (login modal + routes ทั้งหมด) — merge 2 ครั้ง (`7bf7dd1`, `0fbda44`) เคยทำให้ส่วนนี้หลุดจนเมนูตกไป 404 (แก้แล้ว 2026-11-19) ระวังตอน resolve conflict ใน `App.js` / `Header.js`
- login (mock): `utils/session.js` เก็บ `{ employeeId }` / `{ guest: true }` ใน sessionStorage (`mecha.session`) — modal เด้งครั้งเดียวต่อแท็บ (ไม่เด้งบน `/projects/:id`), login ด้วยรหัสพนักงานใน `MOCK_EMPLOYEES` แล้ว `setActorId()` · Playwright ข้าม modal ด้วย `tests/helpers/session.js loginAs()` (ยกเว้น `login.spec.js`) · ต่อ `POST /auth/login` จริงให้เก็บ token ที่ไฟล์นี้ที่เดียว
- เมนู: `components/nav.js` `NAV` + `ADMIN_NAV` (กลุ่ม "ผู้ดูแลระบบ" ใน `Layout.js`, `canSeeAdminMenu()` ยังคืน `true` — รอ role จาก login จริง)
- `context/MockDataContext.js` — แหล่งข้อมูลกลาง (projects, tasks, deliverables, employees, activities, `taskWork` = ความคิดเห็น/บันทึกเวลาต่องาน) + validation + การสร้าง activity log เมื่อ task เปลี่ยน · หน้าใหม่ต้องใช้ context นี้ ห้ามสร้าง state ข้อมูลซ้ำ (Reuse First)
- ชื่อสถานะงาน / ความสำคัญ: `utils/labels.js` ที่เดียว (ห้ามประกาศ map ใน component, ห้ามเก็บ `statusLabel` ใน task)
- รายละเอียดงานมีที่เดียวคือใน workspace — หน้าอื่น (ตารางงาน, หน้าหลัก "งานของฉัน") เปิดงานด้วย `navigate('/projects/:id', { state: { openTaskId } })` · แก้รายละเอียดงานผ่าน `TaskFormModal` เท่านั้น
- กฎ UX ที่ตั้งใจไว้ (ฟอร์มสั้น, กดครั้งเดียว, ปิดโปรเจกต์ 2 ขั้น) และเหตุผล: `docs/ux-review.md` — อ่านก่อนเพิ่มฟิลด์บังคับหรือขั้นยืนยัน
- `context/NotificationCenterContext.js` + `data/notificationCenterMockData.js` + `utils/notificationCenterUtils.js` — ระบบแจ้งเตือน · กระดิ่งใน `Header.js` รวมแจ้งเตือนนี้กับ `useMockData().notifications` (แจ้งเปลี่ยนผู้รับผิดชอบงาน กรองตาม `actorId`)
- `utils/api.js` — ตัวเรียก backend ตัวเดียว (`api.*`, `useLoad` กัน response เก่าทับใหม่ด้วย requestId) · `utils/config.js` — `API_ORIGIN`, `APP_BASE`, `PROJECT_STATUSES`, `PROJECT_CATEGORIES`, `TASK_CATEGORIES`
- สี: ตัวแปรใน `styles/tokens.css` เท่านั้น (`--blue`, `--workspace-*`, `--chart-*`, `--task-urgent-*`) · สีกราฟผ่าน `utils/categoryColors.js`

**Backend** (Express 4 CommonJS + mysql2/MariaDB 10.3) — ไม่มี test framework, ทดสอบด้วยสคริปต์ fetch กับ DB dev จริง
- ชั้นละไฟล์: `routes/<หมวด>.js` (`wrap` + `res.json`, `AppError`) → `services/<หมวด>.js` (กฎ + `view()` snake→camel; entity เล็กรวมใน `services/views.js`) → `db/<หมวด>.js` (SQL parameterize ที่เดียว)
- auth ลอกจาก `MECHA2_QC_GAUGE_SYSTEM`: `services/auth.js` (bcryptjs, JWT, `publicUser` ไม่มี password/rfid), `middleware/auth.js` (`requireLogin` / `requireAdmin` / `optionalLogin` = guest ได้ `req.user = null` — ค้น DB ทุก request), `middleware/rateLimit.js`, `routes/auth.js`, `routes/users.js` (ADMIN), `scripts/user.js` · login ด้วย `userid` (รหัสพนักงาน = `employeeId` ฝั่ง frontend) ไม่มีคอลัมน์ username
- **visibility ที่เดียว `services/visibility.js`** (`visibleWhere(user, alias)`) — ทุก query ที่อ่านโปรเจกต์ต้องผ่าน · ข้อมูลลูก (`db/tasks.js`, `db/workspace.js`) ไม่เช็คสิทธิ์เอง → `routes/projects.js` เรียก `mustSee()` ก่อนเสมอ · ไม่มีสิทธิ์ = 404
- metrics โปรเจกต์คำนวณตอนอ่าน (subquery ใน `db/projects.js` + `services/projects.js metrics()`) สูตรเดียวกับ `calculateProjectMetrics()` ฝั่ง frontend
- คอลัมน์ JSON (history, allocations, attachments, closure, activity meta) parse ที่ `utils/json.js` · `GROUP_CONCAT` → array ด้วย `splitList`
- `config/env.js` อ่าน `.env` ที่เดียว · REQUIRED: `DB_HOST/DB_USER/DB_NAME/JWT_SECRET` (ขาด = exit 1) · `/health` ตอบ `db: up|down` · กฎ backend ละเอียดใน `coding-rules.md`

## ⚠️ ค่าที่ต้องตรงกันหลายที่

- `APP_BASE = /PROJECT-MANAGEMENT`: `backend/config/env.js` (+ `.env`) · `frontend/src/utils/config.js` · `homepage` ใน `frontend/package.json` · config Apache (นอก repo) · URL ใน `frontend/tests/*.spec.js`
- สถานะโปรเจกต์ (`planning | in_progress | on_hold | done | cancelled`): `backend/db/schema.sql` · `backend/services/projects.js` · `frontend/src/utils/config.js` · สี `.status-<key>` ใน `frontend/src/index.css`
- สถานะ task (`not_started | in_progress | pending_review | completed`): `MockDataContext.js` · `backend/db/schema.sql` · `backend/services/tasks.js`
- role (`ADMIN | USER`): `backend/db/schema.sql` · `backend/services/auth.js`
- shape ของ entity: `frontend/src/data/mockData.js` ↔ `backend/services/*.js view()` ↔ `docs/api-contract.md`

## Gotchas

- root `.gitignore` มี `*.html` — ไฟล์ HTML **ใหม่** จะไม่ขึ้น git (`frontend/public/index.html` ถูก track ไว้ก่อนแล้วจึงยังขึ้น) · `frontend/build/` ถูก track อยู่ (ทั้งที่ skill บอกให้ ignore) — ห้ามแก้ตาม `AGENTS.md`
- **DB user ของระบบไม่มีสิทธิ์ DROP** (มีแค่ SELECT/INSERT/UPDATE/DELETE/CREATE/ALTER) → ห้ามใช้ `DROP` / `TRUNCATE` ใน schema หรือสคริปต์ · เปลี่ยนโครงตารางด้วย `ALTER TABLE … ADD/DROP COLUMN IF EXISTS` (ดูบล็อกอัปเกรด `projects` ใน schema.sql) · seed ใช้ `DELETE` + `ALTER … AUTO_INCREMENT`
- รัน backend + `db:seed` บนเครื่องไหน `Projects.js` บนเครื่องนั้นจะสลับไปใช้ข้อมูล API (array ไม่ว่าง) ขณะหน้าอื่นยังเป็น mock — เป็นเรื่องปกติช่วง dev
- คอลัมน์ DATE ฝั่ง backend อ่านด้วย `DATE_FORMAT(…, '%Y-%m-%d')` — ไม่งั้น mysql2 แปลงเป็น Date แล้ว timezone เลื่อนวัน
- Playwright: โปรเจกต์ 1 ใน mock data มีงานตัวอย่าง 8 งาน — เทสที่ต้องการ workspace ว่างใช้โปรเจกต์ 5 / 3 · `npm run build` จะล้าง `frontend/build/` (ถูก track) ก่อน compile — ตรวจ build ด้วย `BUILD_PATH=<นอก repo>` แทน
- `README.md` หัวข้อ 7 (แบบฝึก "เพิ่มหมวด tasks") เขียนตอนโครงเปล่า — ตอนนี้มี `components/Tasks.js` + route `/tasks` (mock) แล้ว ทำตามตรง ๆ จะชนไฟล์เดิม
- `docs/images/*.png` ใน README แคปจากโครงเปล่า (2026-10-20) — หน้าตาปัจจุบันเปลี่ยนไปแล้ว

## กฎของ Korn

- คอมเมนต์ภาษาไทย บรรทัดแรกของไฟล์บอก path + หน้าที่ · UI / ข้อความ error ไทย · โค้ด / ตัวแปร / commit อังกฤษ
- **ห้าม git add / commit / push / switch / stash / reset เอง** — จบงานสรุปไฟล์ใหม่ / แก้ / ลบ · อัปเดต `CHANGELOG.md` (`## [Unreleased]`, ภาษาไทย) ทุกครั้งที่แก้
- หยุด dev server ให้ kill เฉพาะ PID ที่ตัวเองเปิด ห้าม `taskkill /IM node.exe`
