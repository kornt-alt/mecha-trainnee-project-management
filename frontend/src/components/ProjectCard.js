// frontend/src/components/ProjectCard.js — แสดงข้อมูลโปรเจกต์เดี่ยวในรูปแบบการ์ด (Card View)
// ประกอบด้วย: ป้ายหมวดหมู่, ป้ายลำดับความสำคัญ, ชื่อโปรเจกต์, ป้ายสถานะ, ผู้รับผิดชอบ,
// ความคืบหน้า Milestone, ทีมงาน, วันที่เริ่ม-สิ้นสุด + จำนวนวัน (duration), ปุ่มแก้ไขและลบ
import React, { useMemo } from 'react';
import { Badge, ProgressBar } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useMockData } from '../context/MockDataContext';
import { MOCK_EMPLOYEES } from '../data/mockData';
import { statusLabel } from '../utils/config';
import {
  isDelayed,
  ownerOf,
  initials,
  priorityOf,
  statsFrom,
  ymd,
} from '../utils/projectTrackingUtils';
import { Calendar, Pencil, Trash2 } from './common/Icons';
import '../styles/project-card.css';

// สีพาสเทลสำหรับ Avatar Stack
const AVATAR_TINTS = [
  { bg: '#DBEAFE', fg: '#1E3A8A' },
  { bg: '#D5F5E3', fg: '#14532D' },
  { bg: '#FEE9B8', fg: '#78350F' },
  { bg: '#FBD5E6', fg: '#831843' },
  { bg: '#EDE9FE', fg: '#5B21B6' },
  { bg: '#E0F2FE', fg: '#075985' },
];

const getAvatarStyle = (idx, size = 28, fontSize = 11) => {
  const tint = AVATAR_TINTS[idx % AVATAR_TINTS.length];
  return {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '999px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: `${fontSize}px`,
    fontWeight: '700',
    background: tint.bg,
    color: tint.fg,
    flexShrink: 0,
  };
};

export default function ProjectCard({ project, onEdit, onDelete }) {
  const { tasks } = useMockData();

  // งานที่เกี่ยวข้องกับโปรเจกต์นี้
  const relatedTasks = useMemo(() => {
    return tasks.filter((t) => String(t.projectId) === String(project.id));
  }, [tasks, project.id]);

  // คำนวณสถิติ Milestone และลำดับความสำคัญตาม logic เดียวกับ ProjectsTrackingTable
  const stats = useMemo(() => {
    return statsFrom(relatedTasks, project.status);
  }, [relatedTasks, project.status]);

  const priority = useMemo(() => {
    return priorityOf(relatedTasks, project);
  }, [relatedTasks, project]);

  const delayed = useMemo(() => {
    return isDelayed(project);
  }, [project]);

  // ค้นหา Owner (ใช้ helper เดียวกับ Table View)
  const owner = useMemo(() => {
    return ownerOf(project);
  }, [project]);

  // สมาชิกทีมงาน
  const teamMemberIds = useMemo(() => {
    if (Array.isArray(project.teamMemberIds) && project.teamMemberIds.length > 0) {
      return project.teamMemberIds;
    }
    // Fallback ถ้าไม่มี teamMemberIds แต่มี managerId
    if (project.managerId) {
      return [String(project.managerId)];
    }
    return [];
  }, [project.teamMemberIds, project.managerId]);

  // คำนวณระยะเวลา (Duration)
  const duration = useMemo(() => {
    if (!project.startDate || !project.dueDate) return null;
    const start = new Date(project.startDate);
    const end = new Date(project.dueDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null;
    const diffTime = end.getTime() - start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [project.startDate, project.dueDate]);

  // มีข้อมูล Milestone หรือไม่ (มี tasks ผูกอยู่ หรือสถานะ done)
  const hasMilestoneData = relatedTasks.length > 0 || project.status === 'done';

  return (
    <div className="project-card-item h-100">
      <Link
        to={`/projects/${project.id}`}
        className="project-card-navigation-link"
        aria-label={`เปิดโปรเจกต์ ${project.name}`}
      />
      {/* ── 1. Top Bar: Category & Priority Badge ── */}
      <div className="project-card-header">
        <span className="project-card-category" title={project.category || 'ทั่วไป'}>
          {project.category || 'ทั่วไป'}
        </span>
        {/* ลำดับความสำคัญใช้คลาสเดียวกับ tracking-pill-priority ของ Table View */}
        <Badge
          bg=""
          className={`tracking-pill tracking-pill-priority variant-${priority.variant} text-nowrap`}
        >
          {priority.label}
        </Badge>
      </div>

      {/* ── 2. Project Name ── */}
      <h3 className="project-card-title mb-2" title={project.name}>
        {project.name}
      </h3>

      {/* ── 3. Project Status Badge ── */}
      <div className="project-card-status-row mb-3">
        <Badge
          bg=""
          className={`tracking-pill tracking-pill-status status-${project.status} ${delayed ? 'is-delayed' : ''} text-nowrap`}
        >
          {statusLabel(project.status)}
        </Badge>
      </div>

      <div className="project-card-divider" />

      {/* ── 4. Project Owner ── */}
      <div className="project-card-owner-sec">
        <span className="project-card-sec-label">ผู้รับผิดชอบ</span>
        <div className="project-card-owner-row">
          <div style={getAvatarStyle(0, 28, 11)} className="project-card-avatar">
            {owner ? initials(owner.name) : project.owner ? initials(project.owner) : '?'}
          </div>
          <span className="project-card-owner-name text-truncate">
            {owner ? owner.name : (project.owner || 'ยังไม่ได้เลือก')}
          </span>
        </div>
      </div>

      {/* ── 5. Milestone Progress Section ── */}
      <div className="project-card-progress-sec mb-3">
        <div className="d-flex justify-content-between align-items-center mb-1">
          <span className="project-card-sec-label mb-0">ความคืบหน้า (Milestone)</span>
          <span className="small text-muted tracking-progress-label">
            {hasMilestoneData
              ? `${stats.progress}% · ${stats.completed}/${stats.total} งาน`
              : 'ไม่มีข้อมูล Milestone'}
          </span>
        </div>
        {hasMilestoneData ? (
          <ProgressBar
            now={stats.progress}
            style={{ height: 6 }}
            className="tracking-progress-bar w-100"
            variant={stats.progress === 100 ? 'success' : 'primary'}
            aria-label={`ความคืบหน้า ${stats.progress}%`}
          />
        ) : (
          <div className="project-card-no-milestone text-muted small">
            -
          </div>
        )}
      </div>

      {/* ── 6. Team Members ── */}
      <div className="project-card-team-sec">
        <span className="project-card-sec-label">
          ทีมงาน · {teamMemberIds.length} คน
        </span>
        <div className="project-card-team-avatars">
          {teamMemberIds.length === 0 ? (
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ยังไม่ได้เลือกสมาชิก</span>
          ) : (
            <>
              {teamMemberIds.slice(0, 5).map((mId, idx) => {
                const member = MOCK_EMPLOYEES.find((e) => String(e.id) === String(mId));
                return (
                  <span
                    key={mId}
                    style={{
                      ...getAvatarStyle(idx, 28, 11),
                      marginLeft: idx === 0 ? 0 : '-7px',
                    }}
                    className="project-card-avatar"
                    title={member ? member.name : mId}
                  >
                    {member ? initials(member.name) : mId}
                  </span>
                );
              })}
              {teamMemberIds.length > 5 && (
                <span
                  style={{
                    ...getAvatarStyle(6, 28, 10),
                    marginLeft: '-7px',
                    background: '#cbd5e1',
                    color: '#334155',
                  }}
                  className="project-card-avatar"
                  title={`+${teamMemberIds.length - 5} คน`}
                >
                  +{teamMemberIds.length - 5}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── 7. Footer: Dates + Action Buttons on same row ── */}
      <div className={`project-card-footer ${delayed ? 'is-overdue' : ''}`}>
        {/* วันที่เริ่ม → สิ้นสุด · จำนวนวัน */}
        <div className="project-card-date-info">
          <Calendar size={14} className="project-card-date-icon" />
          <span className="project-card-date-text">
            {project.startDate && project.dueDate
              ? `${ymd(project.startDate)} → ${ymd(project.dueDate)}${duration ? ` · ${duration} วัน` : ''}`
              : project.startDate
              ? `เริ่ม ${ymd(project.startDate)}`
              : project.dueDate
              ? `ส่ง ${ymd(project.dueDate)}`
              : 'ยังไม่ได้กำหนดวัน'}
          </span>
        </div>

        {/* ปุ่ม icon-only สำหรับแก้ไขและลบ */}
        {(onEdit || onDelete) && (
          <div className="project-card-action-btns">
            {onEdit && (
              <button
                type="button"
                className="project-card-icon-btn"
                onClick={() => onEdit(project)}
                aria-label={`แก้ไข ${project.name}`}
                title={`แก้ไข ${project.name}`}
              >
                <Pencil size={14} />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                className="project-card-icon-btn project-card-icon-btn--danger"
                onClick={() => onDelete(project)}
                aria-label={`ลบ ${project.name}`}
                title={`ลบ ${project.name}`}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
