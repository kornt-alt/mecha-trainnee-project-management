# API Contract — MECHA Project Management

สัญญากลางระหว่าง **frontend** (น้องฝึกงาน, ตอนนี้ใช้ mock ผ่าน `frontend/src/context/MockDataContext.js`) กับ **backend** (`backend/`)
ตอนเชื่อม API จริง ("Phase API Integration") ให้แทนที่ข้อมูลใน `MockDataContext` ด้วยเส้นในเอกสารนี้ — **shape ของ JSON = shape ของ mock data ปัจจุบัน** หน้าเว็บจึงแทบไม่ต้องแก้

- Base URL: `{API_ORIGIN}/PROJECT-MANAGEMENT/api` (เรียกผ่าน `frontend/src/utils/api.js` เท่านั้น)
- Error: HTTP status 4xx/5xx + `{ "error": "ข้อความภาษาไทย" }` เสมอ
- วันที่ (date) = `"YYYY-MM-DD"` · เวลา (timestamp) = ISO 8601 UTC เช่น `"2026-11-12T02:40:00.000Z"`
- id ของพนักงานเป็น string (`"emp-001"`) · id อื่นเป็นตัวเลข — ฝั่งหน้าเว็บเทียบด้วย `String(id)` อยู่แล้ว
- สถานะ: ✅ ทำแล้ว (Phase A) · ⏳ ยังไม่ทำ (Phase B — ตอนนี้ตอบ `501`)

---

## 1. Authentication

ส่ง token เป็น header `Authorization: Bearer <token>` · token อายุ `JWT_HOURS` ชั่วโมง (default 12)

| สถานะ | Method | Path | Body | Response |
|---|---|---|---|---|
| ✅ | POST | `/auth/login` | `{ userid, password }` | `{ token, user }` · ผิด = 401 ข้อความเดียวทุกกรณี |
| ✅ | POST | `/auth/login-card` | `{ rfid }` | `{ token, user }` · ค้นจากรหัสบัตรอย่างเดียว ไม่ใช้รหัสพนักงานแทน |
| ✅ | POST | `/auth/register` | `{ userid, password, name, position?, departmentId?, email?, rfid? }` | `201 { ok: true }` · role เป็น `USER` เสมอ · ซ้ำ = 409 |
| ✅ | GET | `/auth/me` | — | `{ user }` · ใช้ตอนเปิดแอปเช็คว่า token ยังใช้ได้ + role ล่าสุด |
| ✅ | POST | `/auth/logout` | — | `{ ok: true }` (บันทึก log — ฝั่งหน้าเว็บลบ token เอง) |

`user` = `{ userid, employeeId, name, role, position, departmentId }` — **`employeeId` คือค่าที่ใช้แทน `actorId` ใน MockDataContext** (ไม่มี password / รหัสบัตร)

rate limit: login 10 ครั้ง / 15 นาที ต่อ IP+รหัสพนักงาน · บัตร 30 ครั้ง / 15 นาที ต่อ IP · สมัคร 10 ครั้ง / ชม. → `429` + header `Retry-After`

### ผู้ใช้ (ADMIN เท่านั้น)

| สถานะ | Method | Path | หมายเหตุ |
|---|---|---|---|
| ✅ | GET | `/users` | รวม `rfid`, `email`, `isActive` |
| ✅ | PATCH | `/users/:userid` | `{ name?, role?, position?, departmentId?, email?, isActive?, rfid?, password? }` · `rfid: ""` = ถอดบัตร · ลดสิทธิ์ / ปิดบัญชีตัวเองไม่ได้ (409) |

ADMIN คนแรก: `npm run user:add` หรือ `npm run user:role -- <userid> ADMIN` บนเครื่อง server

---

## 2. ใครเห็นอะไร (visibility)

| ผู้ใช้ | เห็นโปรเจกต์ |
|---|---|
| guest (ไม่ส่ง token / token หมดอายุ) | `visibility = "public"` เท่านั้น |
| USER | public + private ที่ตัวเองเป็น Project Owner (`managerId`) / Team Lead (`teamLeadId`) / สมาชิก (`teamMemberIds`) |
| ADMIN | ทั้งหมด |

- โปรเจกต์ที่ไม่มีสิทธิ์เห็นตอบ **404** เหมือนไม่มีอยู่ (รวมเส้นลูก `/projects/:id/tasks` ฯลฯ)
- token หมดอายุบนเส้นอ่าน = กลายเป็น guest เงียบ ๆ (ไม่ 401) → หน้าเว็บควรเรียก `/auth/me` ตอนเปิดแอป
- กฎอยู่ที่ `backend/services/visibility.js` ที่เดียว

---

## 3. Entities (shape ที่ API ส่งออก)

### Employee — `GET /employees` ✅
```json
{ "id": "emp-001", "name": "Kittipat Samran", "departmentId": "dept-1",
  "department": "Mechanical Automation & Software", "position": "Trainee", "email": "kittipat.s@mecha.local" }
```
guest ไม่ได้ `email` · แทน `MOCK_EMPLOYEES` (ตอนนี้ ~25 component import ตรงจาก `data/mockData.js` — ต้องย้ายมาอ่านจาก context ก่อนต่อ API)

### Department — `GET /departments` ✅ · Team — `GET /teams` ✅ · Label — `GET /labels` ✅
```json
{ "id": "dept-1", "name": "Mechanical Automation & Software", "code": "MAS" }
{ "id": "team-001", "name": "IT", "memberEmployeeIds": ["emp-001", "emp-002"] }
{ "id": 1, "name": "ด่วนลูกค้า", "color": "#2F5BD0" }
```

### Project — `GET /projects?status=` ✅ · `GET /projects/:id` ✅
```json
{ "id": 1, "name": "แดชบอร์ดสถานะสายการผลิต", "description": "…", "category": "ระบบองค์กร",
  "status": "in_progress", "priority": "high", "visibility": "public",
  "departmentId": "dept-1", "managerId": "emp-008", "teamLeadId": "emp-009", "teamMemberIds": ["emp-008", "emp-009", "emp-002"],
  "owner": "Supachai Meesuk", "startDate": "2026-10-01", "dueDate": "2026-12-15",
  "plannedBudget": null, "requiresDeliverables": true, "deliverableDescription": "", "closure": null,
  "createdBy": "emp-008", "createdAt": "…", "updatedAt": null,
  "totalTasks": 8, "completedTasks": 3, "unfinishedTasks": 5, "progress": 38 }
```
- `status`: `planning | in_progress | on_hold | done | cancelled` (ตรง `PROJECT_STATUSES` ใน `frontend/src/utils/config.js`)
- `visibility`: **field ใหม่** — mock ยังไม่มี (หน้าเว็บต้องเพิ่มตัวเลือก public / private ในฟอร์มโปรเจกต์)
- `owner` = ชื่อของ `managerId` (คำนวณ ไม่ได้เก็บ) · metrics คำนวณจากงานตอนอ่าน สูตรเดียวกับ `calculateProjectMetrics()`
- field ของ mock ที่ไม่ส่ง: `referenceAsOfDate`, `sampleLabel`, `memberPoolIds`, `displayStatusLabel` (ไม่มี component ใช้ / ใช้เป็น fallback ได้)

### Task — `GET /projects/:id/tasks` ✅
```json
{ "id": 4, "projectId": 1, "projectName": "…", "title": "…", "description": "…", "category": null,
  "status": "pending_review", "priority": "none", "assigneeId": "emp-002", "reviewerId": "emp-009",
  "collaborators": [], "startDate": "2026-10-25", "dueDate": "2026-11-12", "progress": 0, "estimatedHours": 0,
  "plannedAllocations": [{ "employeeId": "emp-002", "hours": 6 }],
  "assignmentHistory": [], "reviewHistory": [{ "action": "submitted", "actorId": "emp-002", "reviewerId": "emp-009", "timestamp": "…" }],
  "attachments": [], "labelIds": [],
  "checklist": [{ "id": 10, "title": "หน้ารายงานหลัก", "completed": true, "createdBy": "emp-002", "ownerId": "emp-002" }],
  "reviewSubmittedBy": "emp-002", "reviewSubmittedAt": "…", "reviewLastReason": null,
  "createdBy": null, "createdAt": "…", "updatedAt": null }
```
- `status`: `not_started | in_progress | pending_review | completed`
- **ไม่ส่ง `statusLabel`** — หน้าเว็บแปลงจาก `status` เอง (`TaskBadges.js` `STATUS_LABELS`)

### Deliverable — `GET /projects/:id/deliverables` ✅
```json
{ "id": 1, "projectId": 1, "title": "คู่มือการใช้งาน", "description": "", "relatedTaskId": 7, "responsibleId": null,
  "dueDate": null, "status": "pending", "attachments": [], "createdAt": "…", "updatedAt": null }
```
`status`: `pending | in_progress | completed`

### Activity — `GET /projects/:id/activities` ✅ (ใหม่ → เก่า)
```json
{ "id": 1, "type": "task_review_submitted", "projectId": 1, "projectName": "…", "taskId": 4,
  "actorId": "emp-002", "timestamp": "…", "description": "ส่งงาน … เข้าตรวจ" }
```
field เสริมของแต่ละ type (เช่น `reason`) อยู่ระดับบนเหมือน `recordActivity()` ใน mock

### Notification (รายคน) — `GET /notifications` ✅ (ต้อง login)
```json
{ "id": 1, "employeeId": "emp-002", "title": "มีการเปลี่ยนผู้รับผิดชอบงาน", "message": "…",
  "projectId": 1, "taskId": 5, "unread": true, "createdAt": "…", "time": "20/11/2569 11:27:02" }
```
⚠️ คนละระบบกับศูนย์แจ้งเตือน (`NotificationCenterContext` — security / audit / export) ซึ่ง**ยังเป็น mock และไม่อยู่ในสัญญานี้**

---

## 4. Phase B — เส้นเขียน ⏳ (ย้ายกฎจาก MockDataContext)

กติกาทั่วไป:
- ทุกเส้นต้อง login · actor = `req.user.employeeId` (แทน `actorId` ใน mock — **ห้ามรับ actorId จาก body**)
- ตรวจสิทธิ์และข้อมูลที่ server ซ้ำทุกข้อ (mock คืน `null` เมื่อผิด → backend ตอบ `400/403/404/409` + ข้อความไทย)
- งานที่แก้หลายตาราง (งาน + checklist + activity + notification) ทำใน `withTx` (`backend/db/pool.js`) และ insert `activities` ทุกครั้งแบบที่ mock เรียก `recordActivity()`
- ตอบกลับเป็น entity ตัวเต็มหลังแก้ (หน้าเว็บเอาไปแทนใน state ได้ทันที)
- แนะนำเส้นแบบ "action" สำหรับการเปลี่ยนสถานะ แทน `PATCH` ก้อนเดียวที่ส่ง `event.type` แบบ mock — ตรวจสิทธิ์ง่ายกว่า

ตัวย่อสิทธิ์: **O** = Project Owner (`managerId`) · **L** = Team Lead · **M** = สมาชิก (O/L/teamMemberIds) · **A** = ผู้รับผิดชอบงาน (assignee) · **C** = ผู้ร่วมงาน (collaborator) · **R** = ผู้ตรวจ (reviewer) · **AD** = ADMIN

### Projects
| MockDataContext | เส้นที่แนะนำ | สิทธิ์ / กฎหลัก |
|---|---|---|
| `setProjects` (เพิ่ม) | `POST /projects` | AD (หรือกำหนดเพิ่ม) · ผู้สร้างเป็น O · `visibility` default `private` |
| `updateProject` | `PATCH /projects/:id` | O / L · `status: done` ได้เฉพาะเมื่อ `closure.status = closed` · โปรเจกต์ปิดแล้วเปลี่ยนสถานะไม่ได้ · **แก้ชื่อ / คำอธิบาย / วันที่ไม่ reset การขอปิด** (reset เฉพาะเมื่องาน / สิ่งส่งมอบเปลี่ยน) |
| `updateProject` + `closure` | `POST /projects/:id/closure/submit` · `.../approve` · `.../return` `{ reason }` | **3 เส้น (เดิม 6 — ลดตาม UX-01/07):** `submit` = O เท่านั้น เมื่อทุกงาน `completed` + สิ่งส่งมอบเสร็จครบ → `pending_approval` (ตั้ง `ownerReviewedAt` / `deliverablesReviewedAt` / `submittedAt` พร้อมกัน) · `approve` = L เท่านั้น จาก `pending_approval` → `closed` + โปรเจกต์ `status: done` ทันที (ไม่มีขั้น close แยก) · `return` = L ต้องมีเหตุผล → `returned` (O ส่งใหม่ได้) · งาน/สิ่งส่งมอบเปลี่ยนระหว่างรออนุมัติ → กลับ `draft` (ดู `updateProject` / `resetClosureReview` ใน MockDataContext) |
| `setProjects` (ลบ) | `DELETE /projects/:id` | AD / O · ลบไม่ได้ถ้ายังมีงานหรือสิ่งส่งมอบ (Policy B ใน `Projects.js`) → 409 |
| `addProjectMember` | `POST /projects/:id/members` `{ employeeId, reason? }` | O / L · **`reason` ไม่บังคับ** (UX-06) · ซ้ำ / เป็น O-L อยู่แล้ว = 409 |
| `assignTeamLeader` | `PUT /projects/:id/team-lead` `{ employeeId, reason }` | O / L · ต้องเป็นสมาชิกโปรเจกต์อยู่แล้ว · สร้างโปรเจกต์ส่ง `teamLeadId` มากับ `POST /projects` ได้เลย |
| `removeProjectMember` | `DELETE /projects/:id/members/:employeeId` `{ replacementId, reason }` | O / L · นำ O/L ออกไม่ได้ · มีงานค้างต้องมีคนรับแทน · เป็นผู้ตรวจงานค้างอยู่ = 409 · โอนงาน + notification ให้ทั้งสองคน |

### Tasks
| MockDataContext | เส้นที่แนะนำ | สิทธิ์ / กฎหลัก |
|---|---|---|
| `createTask` | `POST /projects/:id/tasks` | actor เป็น M · assignee / reviewer / collaborators ต้องเป็น M · assignee ≠ reviewer · สร้างได้แค่ `not_started` · ผลรวม `plannedAllocations` ≤ `estimatedHours` |
| `updateTask` (`task_updated`) | `PATCH /tasks/:id` | O / L / A / C · แก้ไม่ได้ระหว่าง `pending_review` และหลัง `completed` · แก้ได้ที่ฟอร์ม "แก้ไขงาน" ที่เดียว (UX-09 ตัด panel แก้ซ้ำในหน้าทำงาน) |
| checklist (`checklist_*`) | `POST /tasks/:id/checklist` · `PATCH/DELETE /tasks/:id/checklist/:itemId` | M หรือผู้เกี่ยวข้องกับงาน · แก้/ลบได้เฉพาะเจ้าของรายการหรือ O · **ติ๊กข้อแรก → `not_started` เป็น `in_progress` อัตโนมัติ · เอาติ๊กออกหมด → กลับ `not_started`** |
| `task_started` / `_by_project_lead` | `POST /tasks/:id/start` | A / C หรือ O / L |
| `task_reopened` | `POST /tasks/:id/reopen` | A / O / L (`in_progress` → `not_started`) |
| `task_review_submitted` / `_by_project_lead` | `POST /tasks/:id/submit` | A / C หรือ O / L · เพิ่ม `reviewHistory { action: "submitted" }` |
| `task_review_approved` / `_by_project_lead` | `POST /tasks/:id/approve` | R หรือ O / L → `completed` |
| `task_changes_requested` | `POST /tasks/:id/request-changes` `{ reason }` | R · ต้องมีเหตุผล → `in_progress` |
| `task_review_withdrawn` | `POST /tasks/:id/withdraw` `{ reason }` | คนที่ส่งตรวจ / O / L · ต้องมีเหตุผล |
| reassign (assignee เปลี่ยน) | `POST /tasks/:id/reassign` `{ assigneeId, reason }` | O / L · ต้องมีเหตุผล · โอน `plannedAllocations` · notification ให้คนเก่าและคนใหม่ |
| `deleteTask` | `DELETE /tasks/:id` | O / L / ผู้สร้างงาน |

### อื่น ๆ
| MockDataContext | เส้นที่แนะนำ | หมายเหตุ |
|---|---|---|
| `createDeliverable` / `updateDeliverable` / `deleteDeliverable` | `POST /projects/:id/deliverables` · `PATCH/DELETE /deliverables/:id` | `relatedTaskId` ต้องเป็นงานในโปรเจกต์เดียวกัน · เปลี่ยนแล้ว reset การตรวจปิดโปรเจกต์ |
| `createLabel` / `updateLabel` / `deleteLabel` | `POST /labels` · `PATCH/DELETE /labels/:id` | ลบป้าย = ถอดออกจากทุกงาน (`task_labels` ON DELETE CASCADE ทำให้แล้ว) |
| `markNotificationsRead` | `POST /notifications/read-all` | ของตัวเองเท่านั้น |
| `addTaskWorkEntry` (`comments` / `timeLogs`) | `POST /tasks/:id/comments` `{ text }` · `POST /tasks/:id/time-logs` `{ hours, note }` · อ่านด้วย `GET` เส้นเดียวกัน | ผู้ที่เห็นโปรเจกต์ · ยังไม่มีตาราง — ต้องเพิ่มใน schema (frontend เก็บใน `MockDataContext.taskWork` แล้ว) |

เมื่อทำเส้นเขียนของหมวดไหนเสร็จ: ลบ prefix นั้นออกจาก `PENDING_PREFIXES` ใน `backend/middleware/notImplemented.js` และเปลี่ยน ⏳ เป็น ✅ ในเอกสารนี้

---

## 5. ข้อมูลทดสอบ (dev)

`npm run db:seed` คัดข้อมูลจาก `frontend/src/data/mockData.js` ลง DB (id เดียวกับ mock) · ADMIN = `emp-009` · project 1 = public, 3 และ 5 = private (Owner `emp-008`)

| ทดสอบเป็น | userid | เห็นโปรเจกต์ |
|---|---|---|
| guest | — | 1 |
| USER ที่ไม่ใช่สมาชิก | `emp-003` | 1 |
| Project Owner | `emp-008` | 1, 3, 5 |
| ADMIN | `emp-009` | 1, 3, 5 |
