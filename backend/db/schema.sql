-- Project Management — MariaDB schema (MariaDB 10.3+)
--
-- รันด้วย: npm run db:apply (db/migrate.js — ต่อ DB ตาม backend/.env แล้วรันทั้งไฟล์)
-- รันซ้ำได้ปลอดภัย (IF NOT EXISTS ทุกตาราง) — เพิ่มคอลัมน์ทีหลังให้ใช้ ALTER TABLE … ADD COLUMN IF NOT EXISTS ต่อท้ายไฟล์
-- ต้องมี database ก่อน (ไฟล์นี้ไม่ CREATE DATABASE ให้ เพราะชื่อมาจาก DB_NAME ใน .env):
--   CREATE DATABASE project_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- ข้อมูลตัวอย่างสำหรับ dev: npm run db:seed (คัดจาก frontend/src/data/mockData.js)
--
-- ⚠️ shape ที่ API ส่งออกต้องตรงกับ docs/api-contract.md (= shape ของ mock data ฝั่ง frontend)
--    ชื่อคอลัมน์เป็น snake_case · services/<entity>.js แปลงเป็น camelCase
-- ⚠️ คอลัมน์ JSON (MariaDB = LONGTEXT + CHECK JSON_VALID) mysql2 คืนเป็น string — parse ที่ utils/json.js ที่เดียว

-- ── ผู้ใช้ = พนักงาน + log ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS departments (
  id    VARCHAR(20)  NOT NULL PRIMARY KEY,
  name  VARCHAR(100) NOT NULL,
  code  VARCHAR(20)  NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- userid   = รหัสพนักงาน (ใช้ login + เป็น id ของ employee ใน API เช่น emp-001)
-- rfid     = รหัสบัตร (login ด้วยบัตรค้นคอลัมน์นี้อย่างเดียว ไม่ fallback ไป userid)
--            ⚠️ เก็บเป็น text โดยตั้งใจ — เลขบัตรมี 0 นำหน้าได้ · NULL = ยังไม่ผูกบัตร
-- password = bcrypt hash ($2a$/$2b$)
-- ⚠️ role ต้องตรงกับ ROLES ใน backend/services/auth.js
CREATE TABLE IF NOT EXISTS users (
  userid         VARCHAR(20)  NOT NULL PRIMARY KEY,
  rfid           VARCHAR(50)  NULL,
  password       VARCHAR(100) NOT NULL,
  name           VARCHAR(100) NOT NULL,
  position       VARCHAR(100) NULL,
  department_id  VARCHAR(20)  NULL,
  email          VARCHAR(150) NULL,
  role           ENUM('ADMIN','USER') NOT NULL DEFAULT 'USER',
  is_active      TINYINT(1)   NOT NULL DEFAULT 1,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NULL,
  UNIQUE KEY uq_users_rfid (rfid),
  CONSTRAINT fk_users_department FOREIGN KEY (department_id) REFERENCES departments(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- LOGIN_SUCCESS / LOGIN_CARD_SUCCESS / REGISTER / LOGOUT / USER_UPDATE
CREATE TABLE IF NOT EXISTS logs (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  action       VARCHAR(50)  NOT NULL,
  target_id    VARCHAR(50)  NULL,
  target_type  VARCHAR(30)  NOT NULL,
  comment      TEXT         NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ทีม (สังกัดไม่ขึ้นกับแผนก)
CREATE TABLE IF NOT EXISTS teams (
  id    VARCHAR(20)  NOT NULL PRIMARY KEY,
  name  VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS team_members (
  team_id  VARCHAR(20) NOT NULL,
  userid   VARCHAR(20) NOT NULL,
  sort     INT         NOT NULL DEFAULT 0,
  PRIMARY KEY (team_id, userid),
  CONSTRAINT fk_team_members_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_team_members_user FOREIGN KEY (userid) REFERENCES users(userid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── โปรเจกต์ ──────────────────────────────────────────────────────────────

-- manager_id   = Project Owner (managerId ใน frontend) · team_lead_id = Team Lead
-- visibility   = public → guest (ไม่ login) ดูได้ · private → เห็นเฉพาะ owner / lead / member / ADMIN (services/visibility.js)
-- closure      = สถานะการปิดโปรเจกต์ (JSON ตาม MockDataContext: status, ownerReviewedAt, deliverablesReviewedAt, submittedAt, approvedAt, returnReason …)
-- ⚠️ status ต้องตรงกับ PROJECT_STATUSES ใน frontend/src/utils/config.js · priority ตาม mock (low/medium/high/urgent)
CREATE TABLE IF NOT EXISTS projects (
  id                       INT AUTO_INCREMENT PRIMARY KEY,
  name                     VARCHAR(200) NOT NULL,
  description              TEXT         NULL,
  category                 VARCHAR(100) NULL,
  status                   ENUM('planning','in_progress','on_hold','done','cancelled') NOT NULL DEFAULT 'planning',
  priority                 VARCHAR(20)  NULL,
  visibility               ENUM('public','private') NOT NULL DEFAULT 'private',
  department_id            VARCHAR(20)  NULL,
  manager_id               VARCHAR(20)  NULL,
  team_lead_id             VARCHAR(20)  NULL,
  start_date               DATE         NULL,
  due_date                 DATE         NULL,
  planned_budget           DECIMAL(14,2) NULL,
  requires_deliverables    TINYINT(1)   NOT NULL DEFAULT 0,
  deliverable_description  TEXT         NULL,
  closure                  JSON         NULL,
  created_by               VARCHAR(20)  NULL,
  created_at               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               DATETIME     NULL,
  INDEX idx_projects_status (status),
  INDEX idx_projects_visibility (visibility),
  CONSTRAINT fk_projects_department FOREIGN KEY (department_id) REFERENCES departments(id),
  CONSTRAINT fk_projects_manager FOREIGN KEY (manager_id) REFERENCES users(userid),
  CONSTRAINT fk_projects_lead FOREIGN KEY (team_lead_id) REFERENCES users(userid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- อัปเกรดตาราง projects ของโครงตัวอย่างเดิม (id, name, description, owner, status, start_date, due_date)
-- ⚠️ DB user ของระบบไม่มีสิทธิ์ DROP จึงอัปเกรดด้วย ALTER แทนการลบสร้างใหม่ — บน DB ใหม่บล็อกนี้ไม่ทำอะไร
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS category                VARCHAR(100)  NULL AFTER description,
  ADD COLUMN IF NOT EXISTS priority                VARCHAR(20)   NULL AFTER status,
  ADD COLUMN IF NOT EXISTS visibility              ENUM('public','private') NOT NULL DEFAULT 'private' AFTER priority,
  ADD COLUMN IF NOT EXISTS department_id           VARCHAR(20)   NULL AFTER visibility,
  ADD COLUMN IF NOT EXISTS manager_id              VARCHAR(20)   NULL AFTER department_id,
  ADD COLUMN IF NOT EXISTS team_lead_id            VARCHAR(20)   NULL AFTER manager_id,
  ADD COLUMN IF NOT EXISTS planned_budget          DECIMAL(14,2) NULL AFTER due_date,
  ADD COLUMN IF NOT EXISTS requires_deliverables   TINYINT(1)    NOT NULL DEFAULT 0 AFTER planned_budget,
  ADD COLUMN IF NOT EXISTS deliverable_description TEXT          NULL AFTER requires_deliverables,
  ADD COLUMN IF NOT EXISTS closure                 JSON          NULL AFTER deliverable_description,
  ADD COLUMN IF NOT EXISTS created_by              VARCHAR(20)   NULL AFTER closure,
  DROP COLUMN IF EXISTS owner,
  ADD INDEX IF NOT EXISTS idx_projects_visibility (visibility),
  ADD CONSTRAINT fk_projects_department FOREIGN KEY IF NOT EXISTS (department_id) REFERENCES departments(id),
  ADD CONSTRAINT fk_projects_manager FOREIGN KEY IF NOT EXISTS (manager_id) REFERENCES users(userid),
  ADD CONSTRAINT fk_projects_lead FOREIGN KEY IF NOT EXISTS (team_lead_id) REFERENCES users(userid);

-- สมาชิกทีมโปรเจกต์ (teamMemberIds) — ไม่รวม manager / lead ซึ่งอยู่ในคอลัมน์ของ projects
CREATE TABLE IF NOT EXISTS project_members (
  project_id  INT          NOT NULL,
  userid      VARCHAR(20)  NOT NULL,
  sort        INT          NOT NULL DEFAULT 0,
  added_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (project_id, userid),
  CONSTRAINT fk_project_members_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_project_members_user FOREIGN KEY (userid) REFERENCES users(userid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── งาน ───────────────────────────────────────────────────────────────────

-- ⚠️ status ต้องตรงกับ taskStatuses ใน frontend/src/context/MockDataContext.js
-- history / allocation / attachment เก็บเป็น JSON ตาม shape ใน mock (อ่านพร้อม task เสมอ ไม่ได้ query แยก)
CREATE TABLE IF NOT EXISTS tasks (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  project_id           INT          NOT NULL,
  title                VARCHAR(200) NOT NULL,
  description          TEXT         NULL,
  category             VARCHAR(50)  NULL,
  status               ENUM('not_started','in_progress','pending_review','completed') NOT NULL DEFAULT 'not_started',
  priority             VARCHAR(20)  NULL,
  assignee_id          VARCHAR(20)  NULL,
  reviewer_id          VARCHAR(20)  NULL,
  start_date           DATE         NULL,
  due_date             DATE         NULL,
  progress             TINYINT UNSIGNED NOT NULL DEFAULT 0,
  estimated_hours      DECIMAL(7,2) NOT NULL DEFAULT 0,
  planned_allocations  JSON         NULL,
  assignment_history   JSON         NULL,
  review_history       JSON         NULL,
  attachments          JSON         NULL,
  review_submitted_by  VARCHAR(20)  NULL,
  review_submitted_at  DATETIME     NULL,
  review_last_reason   TEXT         NULL,
  created_by           VARCHAR(20)  NULL,
  created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME     NULL,
  INDEX idx_tasks_project (project_id),
  INDEX idx_tasks_assignee (assignee_id),
  CONSTRAINT fk_tasks_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_tasks_assignee FOREIGN KEY (assignee_id) REFERENCES users(userid),
  CONSTRAINT fk_tasks_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(userid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS task_collaborators (
  task_id  INT         NOT NULL,
  userid   VARCHAR(20) NOT NULL,
  sort     INT         NOT NULL DEFAULT 0,
  PRIMARY KEY (task_id, userid),
  CONSTRAINT fk_task_collab_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_task_collab_user FOREIGN KEY (userid) REFERENCES users(userid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- owner_id = เจ้าของรายการ (แก้/ลบได้) · created_by = คนสร้าง
CREATE TABLE IF NOT EXISTS task_checklist_items (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  task_id     INT          NOT NULL,
  title       VARCHAR(300) NOT NULL,
  completed   TINYINT(1)   NOT NULL DEFAULT 0,
  created_by  VARCHAR(20)  NULL,
  owner_id    VARCHAR(20)  NULL,
  sort        INT          NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_checklist_task (task_id),
  CONSTRAINT fk_checklist_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS labels (
  id     INT AUTO_INCREMENT PRIMARY KEY,
  name   VARCHAR(100) NOT NULL,
  color  VARCHAR(20)  NOT NULL DEFAULT '#2F5BD0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS task_labels (
  task_id   INT NOT NULL,
  label_id  INT NOT NULL,
  PRIMARY KEY (task_id, label_id),
  CONSTRAINT fk_task_labels_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_task_labels_label FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── สิ่งที่ส่งมอบ / ประวัติ / แจ้งเตือน ─────────────────────────────────────

-- ⚠️ status ต้องตรงกับ deliverableStatuses ใน MockDataContext.js
CREATE TABLE IF NOT EXISTS deliverables (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  project_id       INT          NOT NULL,
  title            VARCHAR(200) NOT NULL,
  description      TEXT         NULL,
  related_task_id  INT          NULL,
  responsible_id   VARCHAR(20)  NULL,
  due_date         DATE         NULL,
  status           ENUM('pending','in_progress','completed') NOT NULL DEFAULT 'pending',
  attachments      JSON         NULL,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NULL,
  INDEX idx_deliverables_project (project_id),
  CONSTRAINT fk_deliverables_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_deliverables_task FOREIGN KEY (related_task_id) REFERENCES tasks(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- type เช่น task_created / task_status_changed / project_closure_submitted (ดู MockDataContext.recordActivity)
-- meta = field เสริมของแต่ละ type (reason, previousStatus …) — API แผ่ออกเป็น field ระดับบนเหมือน mock
CREATE TABLE IF NOT EXISTS activities (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  project_id      INT          NOT NULL,
  task_id         INT          NULL,
  deliverable_id  INT          NULL,
  actor_id        VARCHAR(20)  NULL,
  type            VARCHAR(60)  NOT NULL,
  description     TEXT         NULL,
  meta            JSON         NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activities_project (project_id, created_at),
  CONSTRAINT fk_activities_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- แจ้งเตือนรายคน (useMockData().notifications — เช่น เปลี่ยนผู้รับผิดชอบงาน)
-- ⚠️ ไม่ใช่ศูนย์แจ้งเตือนระบบ (NotificationCenterContext: security / audit / export) ซึ่งยังเป็น mock
CREATE TABLE IF NOT EXISTS notifications (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  userid       VARCHAR(20)  NOT NULL,
  title        VARCHAR(200) NOT NULL,
  message      TEXT         NULL,
  project_id   INT          NULL,
  task_id      INT          NULL,
  is_read      TINYINT(1)   NOT NULL DEFAULT 0,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notifications_user (userid, is_read),
  CONSTRAINT fk_notifications_user FOREIGN KEY (userid) REFERENCES users(userid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
