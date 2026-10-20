-- Project Management — MariaDB schema
--
-- รันด้วย: npm run db:apply (db/migrate.js — ต่อ DB ตาม backend/.env แล้วรันทั้งไฟล์)
-- รันซ้ำได้ปลอดภัย (IF NOT EXISTS ทุกตาราง) — เพิ่มคอลัมน์ทีหลังให้ใช้ ALTER TABLE … ADD COLUMN IF NOT EXISTS
-- ต้องมี database ก่อน (ไฟล์นี้ไม่ CREATE DATABASE ให้ เพราะชื่อมาจาก DB_NAME ใน .env):
--   CREATE DATABASE project_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── projects (ตัวอย่างหมวดแรก) ──────────────────────────────────────────────

-- ⚠️ status ต้องตรงกับ STATUSES ใน backend/services/projects.js และ PROJECT_STATUSES ใน frontend/src/utils/config.js
-- ⚠️ ความยาว VARCHAR ต้องตรงกับ MAX ใน backend/services/projects.js
CREATE TABLE IF NOT EXISTS projects (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(200) NOT NULL,
  description  TEXT         NULL,
  owner        VARCHAR(100) NULL,
  status       ENUM('planning','in_progress','on_hold','done','cancelled') NOT NULL DEFAULT 'planning',
  start_date   DATE         NULL,
  due_date     DATE         NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NULL,
  INDEX idx_projects_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
