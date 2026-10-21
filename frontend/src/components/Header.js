// frontend/src/components/Header.js — แถบ Header ด้านบน แสดงเวลา/วันที่ปัจจุบัน และการแจ้งเตือนของระบบ
import React, { useState, useEffect } from 'react';
import { Dropdown } from 'react-bootstrap';
import { Clock, Bell, Check, ChevronDown } from './common/Icons';
import CalendarDropdown from './common/CalendarDropdown';
import { NOTIFICATIONS } from '../data/mockData';

export default function Header() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    // อัปเดตเวลานาฬิกาทุกวินาทีเพื่อให้เวลาตรงกับปัจจุบันเสมอ
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // จัดรูปแบบวันที่และเวลาแบบภาษาไทยที่เป็นทางการ สบายตา
  const formatDateTime = (date) => {
    const thaiMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    const day = date.getDate();
    const month = thaiMonths[date.getMonth()];
    const year = date.getFullYear() + 543; // แปลงปีเป็น พ.ศ. ตามมาตรฐานเอกสารไทย
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return {
      dateStr: `${day} ${month} ${year}`,
      timeStr: `${hours}:${minutes}:${seconds}`,
    };
  };

  const { dateStr, timeStr } = formatDateTime(currentTime);
  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <span className="system-pill">Mecha Project Management</span>
      </div>

      <div className="header-right">
        {/* วันที่และเวลาปัจจุบัน พร้อมปุ่มเปิดปฏิทินแบบเต็ม */}
        <div className="header-clock-container position-relative">
          <button
            type="button"
            className={`header-clock-btn ${isCalendarOpen ? 'active' : ''}`}
            onClick={() => setIsCalendarOpen((prev) => !prev)}
            aria-expanded={isCalendarOpen}
            aria-haspopup="dialog"
            title="คลิกเพื่อเปิดดูปฏิทินแบบเต็มและรายการกำหนดส่ง"
          >
            <Clock size={16} className="clock-icon" />
            <span className="clock-date">{dateStr}</span>
            <span className="clock-divider">|</span>
            <span className="clock-time">{timeStr} น.</span>
            <ChevronDown
              size={14}
              className={`clock-chevron ${isCalendarOpen ? 'rotate-180' : ''}`}
            />
          </button>

          <CalendarDropdown
            isOpen={isCalendarOpen}
            onClose={() => setIsCalendarOpen(false)}
            currentTime={currentTime}
          />
        </div>

        {/* กระดิ่งแจ้งเตือน (Notifications) */}
        <Dropdown align="end" className="header-dropdown">
          <Dropdown.Toggle variant="light" className="header-icon-btn position-relative" id="dropdown-notifications">
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="notification-badge" aria-label={`มี ${unreadCount} การแจ้งเตือนที่ยังไม่ได้อ่าน`}>
                {unreadCount}
              </span>
            )}
          </Dropdown.Toggle>

          <Dropdown.Menu className="notifications-menu shadow-sm">
            <div className="notifications-header d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
              <span className="fw-semibold text-ink">การแจ้งเตือน</span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 text-decoration-none mark-read-btn"
                  onClick={markAllAsRead}
                >
                  <Check size={14} className="me-1" />
                  อ่านทั้งหมด
                </button>
              )}
            </div>
            <div className="notifications-list">
              {notifications.map((item) => (
                <div key={item.id} className={`notification-item px-3 py-2 border-bottom ${item.unread ? 'unread' : ''}`}>
                  <div className="d-flex justify-content-between align-items-baseline">
                    <span className="notification-title fw-medium">{item.title}</span>
                    <span className="notification-time">{item.time}</span>
                  </div>
                  <p className="notification-desc mb-0 small text-muted">{item.message}</p>
                </div>
              ))}
            </div>
          </Dropdown.Menu>
        </Dropdown>
      </div>
    </header>
  );
}
