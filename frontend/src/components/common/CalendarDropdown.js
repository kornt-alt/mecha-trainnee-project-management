// frontend/src/components/common/CalendarDropdown.js — ปฏิทินแบบเต็ม (Full Calendar) แบบ Dropdown พร้อมแอนิเมชันที่นุ่มนวล
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CircleAlert,
  CircleCheck,
} from './Icons';
import { MOCK_TASKS } from '../../data/mockData';

const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
  'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
  'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const THAI_DAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

const THAI_DAYS_FULL = [
  'วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ',
  'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'
];

export default function CalendarDropdown({
  isOpen,
  onClose,
  currentTime = new Date(),
  tasks = MOCK_TASKS,
}) {
  const containerRef = useRef(null);

  // วันและเดือนที่กำลังเปิดดูในปฏิทิน
  const [viewDate, setViewDate] = useState(() => new Date(currentTime));
  // วันที่ผู้ใช้คลิกเลือกดูรายละเอียด
  const [selectedDate, setSelectedDate] = useState(() => new Date(currentTime));
  // โหมดเลือกเดือน/ปีแบบเร็ว (Quick Select)
  const [isMonthSelectOpen, setIsMonthSelectOpen] = useState(false);

  // เมื่อเปิด dropdown มา ให้เริ่มต้นที่เดือนของวันที่เลือก
  useEffect(() => {
    if (isOpen) {
      setViewDate(new Date(selectedDate));
    }
  }, [isOpen, selectedDate]);

  // ปิดเมื่อคลิกนอกพื้นที่ (Click Outside)
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  // ฟังก์ชันเลื่อนเดือน
  const handlePrevMonth = () => {
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  // ฟังก์ชันกระโดดกลับมา "วันนี้"
  const handleGoToday = () => {
    const today = new Date(currentTime);
    setViewDate(new Date(today));
    setSelectedDate(new Date(today));
    setIsMonthSelectOpen(false);
  };

  // แมปงานตาม dueDate (รูปแบบ 'YYYY-MM-DD')
  const tasksByDueDate = useMemo(() => {
    const map = {};
    if (!tasks || !Array.isArray(tasks)) return map;
    tasks.forEach((t) => {
      if (t.dueDate) {
        if (!map[t.dueDate]) {
          map[t.dueDate] = [];
        }
        map[t.dueDate].push(t);
      }
    });
    return map;
  }, [tasks]);

  // คำนวณตารางวันในเดือน
  const calendarCells = useMemo(() => {
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells = [];

    // วันของเดือนก่อนหน้า (Leading Days)
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const dateObj = new Date(viewYear, viewMonth - 1, dayNum);
      const isoStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      cells.push({
        day: dayNum,
        date: dateObj,
        isoStr,
        isCurrentMonth: false,
        isPrevMonth: true,
      });
    }

    // วันของเดือนปัจจุบัน
    for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
      const dateObj = new Date(viewYear, viewMonth, dayNum);
      const isoStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      cells.push({
        day: dayNum,
        date: dateObj,
        isoStr,
        isCurrentMonth: true,
      });
    }

    // วันของเดือนถัดไป (Trailing Days) ให้เต็มสัปดาห์ (42 ช่อง หรือ 35 ช่อง)
    const remainingCells = (cells.length > 35 ? 42 : 35) - cells.length;
    for (let dayNum = 1; dayNum <= remainingCells; dayNum++) {
      const dateObj = new Date(viewYear, viewMonth + 1, dayNum);
      const isoStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      cells.push({
        day: dayNum,
        date: dateObj,
        isoStr,
        isCurrentMonth: false,
        isNextMonth: true,
      });
    }

    return cells;
  }, [viewYear, viewMonth]);

  // เช็กว่าเป็น "วันนี้" หรือไม่
  const isToday = (dateObj) => {
    return (
      dateObj.getFullYear() === currentTime.getFullYear() &&
      dateObj.getMonth() === currentTime.getMonth() &&
      dateObj.getDate() === currentTime.getDate()
    );
  };

  // เช็กว่าเป็น "วันที่เลือก" หรือไม่
  const isSelected = (dateObj) => {
    return (
      dateObj.getFullYear() === selectedDate.getFullYear() &&
      dateObj.getMonth() === selectedDate.getMonth() &&
      dateObj.getDate() === selectedDate.getDate()
    );
  };

  // วันที่เลือกในรูปแบบ YYYY-MM-DD
  const selectedDateIso = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
  const selectedDayTasks = tasksByDueDate[selectedDateIso] || [];

  // การแสดงผลวันที่เลือกแบบทางการ
  const selectedDayName = THAI_DAYS_FULL[selectedDate.getDay()];
  const selectedDateNumber = selectedDate.getDate();
  const selectedMonthName = THAI_MONTHS_FULL[selectedDate.getMonth()];
  const selectedYearBE = selectedDate.getFullYear() + 543;
  const isSelectedToday = isToday(selectedDate);

  // แปลงเวลาปัจจุบันเป็นตัวเลขสองหลัก
  const curHours = String(currentTime.getHours()).padStart(2, '0');
  const curMinutes = String(currentTime.getMinutes()).padStart(2, '0');
  const curSeconds = String(currentTime.getSeconds()).padStart(2, '0');

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className={`calendar-dropdown-menu ${isOpen ? 'show' : ''}`}
      role="dialog"
      aria-label="ปฏิทินระบุวันและเวลา"
    >
      {/* ── ส่วนหัวปฏิทิน: นาฬิกาดิจิทัลแบบเรียลไทม์ ── */}
      <div className="calendar-clock-banner">
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <span className="live-clock-dot" title="อัปเดตแบบเรียลไทม์" />
            <span className="live-clock-digits">
              {curHours}:{curMinutes}:{curSeconds} <small className="live-clock-unit">น.</small>
            </span>
          </div>
          <span className="live-clock-tz text-muted">เวลามาตรฐาน ICT (GMT+7)</span>
        </div>
        <div className="live-clock-subtext mt-1 text-muted">
          {THAI_DAYS_FULL[currentTime.getDay()]}ที่ {currentTime.getDate()} {THAI_MONTHS_FULL[currentTime.getMonth()]} พ.ศ. {currentTime.getFullYear() + 543}
        </div>
      </div>

      {/* ── แถบนำทางเดือนและปี ── */}
      <div className="calendar-header-nav">
        <div className="d-flex align-items-center gap-1">
          <button
            type="button"
            className="calendar-nav-btn"
            onClick={handlePrevMonth}
            title="เดือนก่อนหน้า"
            aria-label="เดือนก่อนหน้า"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className="calendar-nav-btn"
            onClick={handleNextMonth}
            title="เดือนถัดไป"
            aria-label="เดือนถัดไป"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="calendar-month-title-wrap">
          <button
            type="button"
            className="calendar-month-title-btn"
            onClick={() => setIsMonthSelectOpen(!isMonthSelectOpen)}
            title="คลิกเพื่อเลือกเดือน/ปีอย่างรวดเร็ว"
          >
            <span className="calendar-month-name">{THAI_MONTHS_FULL[viewMonth]}</span>
            <span className="calendar-year-be">{viewYear + 543}</span>
            <span className="calendar-year-ce text-muted">({viewYear})</span>
          </button>
        </div>

        <button
          type="button"
          className="calendar-today-btn"
          onClick={handleGoToday}
          title="กลับไปที่วันปัจจุบัน"
        >
          <CalendarDays size={13} className="me-1" />
          วันนี้
        </button>
      </div>

      {/* เมนูเลือกเดือน/ปีแบบเร็ว (Quick Month Selector) */}
      {isMonthSelectOpen && (
        <div className="calendar-quick-selector animate-fade-in">
          <div className="quick-selector-header d-flex justify-content-between align-items-center mb-2 px-1">
            <span className="fw-semibold small text-ink">เลือกเดือน</span>
            <div className="d-flex align-items-center gap-1">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary py-0 px-2"
                style={{ fontSize: '0.75rem' }}
                onClick={() => setViewDate(new Date(viewYear - 1, viewMonth, 1))}
              >
                -1 ปี
              </button>
              <span className="fw-bold small text-primary">{viewYear + 543}</span>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary py-0 px-2"
                style={{ fontSize: '0.75rem' }}
                onClick={() => setViewDate(new Date(viewYear + 1, viewMonth, 1))}
              >
                +1 ปี
              </button>
            </div>
          </div>
          <div className="quick-months-grid">
            {THAI_MONTHS_FULL.map((mName, mIdx) => (
              <button
                key={mName}
                type="button"
                className={`quick-month-btn ${mIdx === viewMonth ? 'active' : ''}`}
                onClick={() => {
                  setViewDate(new Date(viewYear, mIdx, 1));
                  setIsMonthSelectOpen(false);
                }}
              >
                {mName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── หัวตารางวันในสัปดาห์ (อา - ส) ── */}
      <div className="calendar-weekdays-row">
        {THAI_DAYS.map((dayLabel, idx) => (
          <div
            key={dayLabel}
            className={`calendar-weekday-cell ${idx === 0 ? 'weekend-sun' : idx === 6 ? 'weekend-sat' : ''}`}
          >
            {dayLabel}
          </div>
        ))}
      </div>

      {/* ── ตารางวัน (Grid) ── */}
      <div className="calendar-days-grid">
        {calendarCells.map((cell) => {
          const isCellToday = isToday(cell.date);
          const isCellSelected = isSelected(cell.date);
          const cellTasks = tasksByDueDate[cell.isoStr] || [];
          const hasTasks = cellTasks.length > 0;
          const hasUrgentTask = cellTasks.some((t) => t.priority === 'urgent' || t.status === 'in_progress');

          return (
            <button
              key={cell.isoStr + (cell.isPrevMonth ? '-prev' : cell.isNextMonth ? '-next' : '')}
              type="button"
              className={`calendar-day-btn ${!cell.isCurrentMonth ? 'other-month' : ''} ${isCellToday ? 'is-today' : ''} ${isCellSelected ? 'is-selected' : ''} ${hasTasks ? 'has-tasks' : ''}`}
              onClick={() => {
                setSelectedDate(new Date(cell.date));
                // ถ้าคลิกวันของเดือนก่อนหน้าหรือถัดไป ให้เลื่อนหน้าจอไปยังเดือนนั้นด้วย
                if (!cell.isCurrentMonth) {
                  setViewDate(new Date(cell.date.getFullYear(), cell.date.getMonth(), 1));
                }
              }}
              title={`${cell.day} ${THAI_MONTHS_FULL[cell.date.getMonth()]} ${cell.date.getFullYear() + 543}${hasTasks ? ` (${cellTasks.length} งาน)` : ''}`}
            >
              <span className="day-number">{cell.day}</span>
              {hasTasks && (
                <span
                  className={`task-indicator-dot ${hasUrgentTask ? 'dot-urgent' : 'dot-normal'}`}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── แถบรายละเอียดวันที่ถูกเลือก (Selected Date Details) ── */}
      <div className="calendar-footer-panel">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div className="d-flex align-items-center gap-2">
            <span className="selected-date-badge">
              {selectedDayName}ที่ {selectedDateNumber} {selectedMonthName} {selectedYearBE}
            </span>
            {isSelectedToday && <span className="today-chip">วันนี้</span>}
          </div>
          {!isSelectedToday && (
            <button
              type="button"
              className="btn btn-link btn-sm p-0 text-decoration-none selected-today-link"
              onClick={handleGoToday}
            >
              ไปที่วันนี้
            </button>
          )}
        </div>

        {/* รายการงานในวันที่เลือก */}
        <div className="selected-tasks-container">
          {selectedDayTasks.length > 0 ? (
            <div className="d-flex flex-column gap-1">
              <div className="text-muted small fw-medium d-flex align-items-center gap-1 mb-1">
                <CircleAlert size={13} className="text-primary" />
                <span>งานที่มีกำหนดส่งในวันนี้ ({selectedDayTasks.length} รายการ):</span>
              </div>
              {selectedDayTasks.map((task) => (
                <div key={task.id} className="calendar-task-item d-flex justify-content-between align-items-center">
                  <div className="d-flex flex-column text-truncate me-2">
                    <span className="calendar-task-title text-truncate">{task.title}</span>
                    <span className="calendar-task-project text-muted small text-truncate">
                      {task.projectName}
                    </span>
                  </div>
                  <span
                    className={`badge ${task.priority === 'urgent' ? 'bg-danger' : task.status === 'completed' ? 'bg-success' : 'bg-primary'} calendar-task-badge`}
                  >
                    {task.statusLabel || (task.status === 'completed' ? 'เสร็จสิ้น' : 'กำลังดำเนินการ')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-tasks-state text-muted small py-1 d-flex align-items-center gap-2">
              <CircleCheck size={14} className="text-success" />
              <span>ไม่มีกำหนดส่งงานในวันนี้</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
