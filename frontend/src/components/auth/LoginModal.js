// frontend/src/components/auth/LoginModal.js — หน้าต่างเข้าสู่ระบบด้วยรหัสพนักงาน + animation บัตรพนักงาน
//
// ช่วงยังไม่ต่อ backend: ค้นรหัสจาก currentEmployees() (emp-001 …) รหัสผ่านอะไรก็ได้ → App.js ตั้งผู้ใช้ปัจจุบัน + เก็บ session
// ⚠️ ต่อ backend แล้วให้เรียก POST /auth/login ใน submitForm แทนการค้น mock (docs/api-contract.md)
import React, { useCallback, useEffect, useRef, useState } from 'react';
import EmployeeIdCard from './EmployeeIdCard';
import { currentEmployees } from '../../data/employeeStore';

// สีพื้นรูปบนบัตร — วนตามลำดับพนักงาน (mock ไม่มีรูปจริง)
const CARD_TONES = ['#60a5fa', '#7dd3fc', '#93c5fd', '#a5b4fc', '#67e8f9', '#818cf8', '#38bdf8', '#c4b5fd'];
// ค้นจากรายชื่อล่าสุดทุกครั้ง (ผู้ใช้ที่เพิ่ม / แก้ในหน้าจัดการผู้ใช้ login ได้ทันที)
const loginEmployees = () => currentEmployees().map((person, index) => ({
  id: person.id,
  name: person.name,
  position: person.position,
  department: person.department,
  tone: CARD_TONES[index % CARD_TONES.length],
  isActive: person.isActive !== false,
}));
const ID_PATTERN = /^emp-\d{3,}$/;
const findEmployee = (value) => loginEmployees().find((item) => item.id === String(value).trim().toLowerCase()) || null;

const wait = (duration, signal) => {
  if (signal?.aborted) return Promise.resolve(false);
  if (duration <= 0) return Promise.resolve(true);

  return new Promise((resolve) => {
    let timeoutId;
    const finish = (completed) => {
      window.clearTimeout(timeoutId);
      signal?.removeEventListener('abort', abort);
      resolve(completed);
    };
    const abort = () => finish(false);
    timeoutId = window.setTimeout(() => finish(true), duration);
    signal?.addEventListener('abort', abort, { once: true });
  });
};

const waitForTransition = (element, propertyName, fallbackDuration, signal) => {
  if (!element || signal?.aborted) return Promise.resolve(false);
  if (fallbackDuration <= 0) return Promise.resolve(true);

  return new Promise((resolve) => {
    let timeoutId;
    const cleanup = () => {
      window.clearTimeout(timeoutId);
      element.removeEventListener('transitionend', onTransitionEnd);
      signal?.removeEventListener('abort', onAbort);
    };
    const finish = (completed) => {
      cleanup();
      resolve(completed);
    };
    const onTransitionEnd = (event) => {
      if (event.target === element && event.propertyName === propertyName) finish(true);
    };
    const onAbort = () => finish(false);

    element.addEventListener('transitionend', onTransitionEnd);
    signal?.addEventListener('abort', onAbort, { once: true });
    timeoutId = window.setTimeout(() => finish(true), fallbackDuration + 120);
  });
};

const FOCUSABLE_SELECTOR = 'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

export default function LoginModal({ onBackgroundChange, onLoggedIn, onDismiss }) {
  const [isOpen, setIsOpen] = useState(true);
  const [employeeId, setEmployeeId] = useState('');
  const [employee, setEmployee] = useState(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({ employeeId: '', password: '' });
  const [status, setStatus] = useState('');
  const [liveMessage, setLiveMessage] = useState('');
  const [presentation, setPresentation] = useState('idle');
  const [isRunning, setIsRunning] = useState(false);
  const [isLifted, setIsLifted] = useState(false);
  const [isShining, setIsShining] = useState(false);
  const [isCardMoving, setIsCardMoving] = useState(false);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [cardTransform, setCardTransform] = useState('none');
  const runningRef = useRef(false);
  const lastStateRef = useRef('');
  const employeeIdRef = useRef(null);
  const modalRef = useRef(null);
  const cardWrapRef = useRef(null);
  const animationControllerRef = useRef(null);

  useEffect(() => () => animationControllerRef.current?.abort(), []);

  const updateBackground = useCallback((state) => {
    if (onBackgroundChange) onBackgroundChange(state);
  }, [onBackgroundChange]);

  useEffect(() => {
    updateBackground('obscured');
  }, [updateBackground]);

  useEffect(() => {
    document.documentElement.classList.toggle('login-overlay-open', isOpen);
    document.body.classList.toggle('login-overlay-open', isOpen);
    return () => {
      document.documentElement.classList.remove('login-overlay-open');
      document.body.classList.remove('login-overlay-open');
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const timer = window.setTimeout(() => employeeIdRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  const announce = (state, message) => {
    if (state !== lastStateRef.current) {
      lastStateRef.current = state;
      setLiveMessage(message);
    }
  };

  const changeEmployeeId = (event) => {
    const value = event.target.value;
    const normalizedId = value.trim().toLowerCase();
    const isCompleteId = ID_PATTERN.test(normalizedId);
    const match = normalizedId ? findEmployee(normalizedId) : null;
    setEmployeeId(value);
    setEmployee(match);
    setErrors((previous) => ({ ...previous, employeeId: '' }));
    setStatus('');

    if (!normalizedId) announce('empty', '');
    else if (match) announce(`found-${match.id}`, `พบพนักงาน: ${match.name}`);
    else if (isCompleteId) announce(`not-found-${normalizedId}`, `ไม่พบรหัสพนักงาน ${normalizedId}`);
    else announce(`partial-${normalizedId}`, `กำลังพิมพ์รหัสพนักงาน: ${value}`);
  };

  const changePassword = (event) => {
    setPassword(event.target.value);
    setErrors((previous) => ({ ...previous, password: '' }));
    setStatus('');
  };

  const resetDemo = () => {
    setEmployeeId('');
    setEmployee(null);
    setPassword('');
    setShowPassword(false);
    setErrors({ employeeId: '', password: '' });
    setStatus('');
    setLiveMessage('');
    lastStateRef.current = '';
    setPresentation('idle');
    setIsLifted(false);
    setIsShining(false);
    setIsCardMoving(false);
    setIsPreviewExpanded(false);
    setCardTransform('none');
  };

  // ปิดโดยไม่เข้าสู่ระบบ = ดูต่อแบบผู้เยี่ยมชม (App.js จำไว้ใน session จะไม่เด้งซ้ำจนกว่าจะออกจากระบบ)
  const closeModal = () => {
    if (runningRef.current) return;
    setIsOpen(false);
    updateBackground('clear');
    if (onDismiss) onDismiss();
  };

  const runSignature = async (matchedEmployee) => {
    const controller = new AbortController();
    animationControllerRef.current = controller;
    const { signal } = controller;
    runningRef.current = true;
    setIsRunning(true);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setLiveMessage('กำลังเข้าสู่ระบบ');
    if (!await wait(490, signal)) return;

    const modalRect = modalRef.current.getBoundingClientRect();
    const cardRect = cardWrapRef.current.getBoundingClientRect();
    const dx = (modalRect.left + modalRect.width / 2) - (cardRect.left + cardRect.width / 2);
    const dy = (modalRect.top + modalRect.height / 2) - (cardRect.top + cardRect.height / 2);
    setPresentation('leaving');
    setIsLifted(true);
    setIsShining(true);
    setIsCardMoving(true);
    setCardTransform(`translate3d(${dx}px, ${dy}px, 0)`);
    if (!reducedMotion) {
      const form = modalRef.current?.querySelector('.login-form-col');
      const cardMove = waitForTransition(cardWrapRef.current, 'transform', 700, signal);
      const formFade = waitForTransition(form, 'opacity', 620, signal);
      const formSlide = waitForTransition(form, 'transform', 620, signal);
      const completed = await Promise.all([cardMove, formFade, formSlide]);
      if (completed.some((result) => !result)) return;
    }
    setIsCardMoving(false);

    setPresentation('expanding');
    setIsPreviewExpanded(true);
    if (!reducedMotion) {
      if (!await waitForTransition(modalRef.current, 'opacity', 440, signal)) return;
    }

    setPresentation('welcomed');
    setLiveMessage(`ยินดีต้อนรับ ${matchedEmployee.name}`);
    if (!await wait(reducedMotion ? 120 : 700, signal)) return;

    setPresentation('dissolving');
    updateBackground('revealed');
    if (!reducedMotion) {
      const modalFade = waitForTransition(modalRef.current, 'opacity', 620, signal);
      const scrimFade = waitForTransition(document.querySelector('.login-scrim'), 'opacity', 600, signal);
      const completed = await Promise.all([modalFade, scrimFade]);
      if (completed.some((result) => !result)) return;
    }

    runningRef.current = false;
    animationControllerRef.current = null;
    setIsRunning(false);
    setIsOpen(false);
    resetDemo();
    if (onLoggedIn) onLoggedIn(matchedEmployee);
  };

  const submitForm = (event) => {
    event.preventDefault();
    if (runningRef.current) return;

    const nextErrors = { employeeId: '', password: '' };
    const normalizedId = employeeId.trim().toLowerCase();
    const isCompleteId = ID_PATTERN.test(normalizedId);
    if (!normalizedId) nextErrors.employeeId = 'กรอกรหัสพนักงาน';
    else if (!employee) {
      nextErrors.employeeId = isCompleteId
        ? 'ไม่พบรหัสพนักงานนี้'
        : 'กรอกรหัสพนักงานให้ครบ เช่น emp-001';
    } else if (!employee.isActive) {
      nextErrors.employeeId = 'บัญชีนี้ถูกปิดใช้งาน ติดต่อผู้ดูแลระบบ';
    }
    if (!password) nextErrors.password = 'กรอกรหัสผ่าน';
    setErrors(nextErrors);

    if (nextErrors.employeeId || nextErrors.password) {
      setStatus('');
      (nextErrors.employeeId ? employeeIdRef : null)?.current?.focus();
      if (!nextErrors.employeeId && nextErrors.password) {
        modalRef.current?.querySelector('#login-password')?.focus();
      }
      return;
    }

    setStatus('');
    runSignature(employee);
  };

  const handleModalKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
      return;
    }
    if (event.key !== 'Tab' || !modalRef.current) return;

    const focusable = [...modalRef.current.querySelectorAll(FOCUSABLE_SELECTOR)]
      .filter((element) => !element.closest('[inert]') && element.getClientRects().length > 0);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const cardView = !employee && Boolean(employeeId.trim());
  const isCompleteId = ID_PATTERN.test(employeeId.trim().toLowerCase());
  const isNotFound = cardView && isCompleteId;
  const partialId = cardView && !isCompleteId ? employeeId : '';
  const modalClassName = [
    'login-modal-panel',
    presentation !== 'idle' && 'is-leaving',
    ['expanding', 'welcomed', 'dissolving'].includes(presentation) && 'is-cinematic',
    presentation === 'welcomed' && 'is-welcomed',
    presentation === 'dissolving' && 'is-dissolving',
  ].filter(Boolean).join(' ');

  return (
    <div className="login-experience">
      {isOpen && (
        <>
          <div className={`login-scrim${presentation === 'dissolving' ? ' is-fading' : ''}`} aria-hidden="true" />
          <div className="login-modal-wrap">
            <div
              className={modalClassName}
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="login-title"
              onKeyDown={handleModalKeyDown}
            >
              <button className="login-close" type="button" aria-label="ปิดหน้าต่างเข้าสู่ระบบ" onClick={closeModal}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>

              <section
                className="login-form-col"
                inert={presentation === 'leaving' || presentation === 'expanding' || presentation === 'welcomed' || presentation === 'dissolving'}
                aria-hidden={presentation !== 'idle'}
              >
                <div className="login-brand">
                  <div className="login-logo" aria-hidden="true">M</div>
                  <div className="login-wordmark">MECHA<small>Project Management</small></div>
                </div>
                <div className="login-heading">
                  <h1 id="login-title">เข้าสู่ระบบ</h1>
                  <p className="login-lede">ใช้รหัสพนักงานเพื่อดูงานและโปรเจกต์ของคุณ</p>
                </div>

                <form className="login-form" noValidate onSubmit={submitForm}>
                  <div className="login-field">
                    <label htmlFor="login-employee-id">รหัสพนักงาน</label>
                    <input
                      id="login-employee-id"
                      ref={employeeIdRef}
                      type="text"
                      autoComplete="username"
                      placeholder="เช่น emp-001"
                      value={employeeId}
                      aria-describedby="login-employee-id-error"
                      aria-invalid={Boolean(errors.employeeId)}
                      onChange={changeEmployeeId}
                    />
                    <p className="login-error" id="login-employee-id-error" role="alert">{errors.employeeId}</p>
                  </div>

                  <div className="login-field">
                    <label htmlFor="login-password">รหัสผ่าน</label>
                    <div className="login-input-wrap">
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="กรอกรหัสผ่าน"
                        value={password}
                        aria-describedby="login-password-error"
                        aria-invalid={Boolean(errors.password)}
                        onChange={changePassword}
                      />
                      <button
                        type="button"
                        className="login-toggle-password"
                        aria-controls="login-password"
                        aria-pressed={showPassword}
                        onClick={() => setShowPassword((visible) => !visible)}
                      >
                        {showPassword ? 'ซ่อน' : 'แสดง'}
                      </button>
                    </div>
                    <p className="login-error" id="login-password-error" role="alert">{errors.password}</p>
                  </div>

                  <button className={`login-submit${isRunning ? ' is-loading' : ''}`} type="submit" disabled={isRunning} aria-busy={isRunning}>
                    <span className="login-spinner" aria-hidden="true" />
                    <span>{isRunning ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}</span>
                  </button>
                  <p className="login-status" id="login-status">{status}</p>
                  <p className="login-demo-banner">ช่วงทดลอง: ใช้รหัสพนักงาน เช่น emp-001 กับรหัสผ่านอะไรก็ได้ (ยังไม่ได้เชื่อมระบบจริง)</p>
                </form>
              </section>

              <aside
                className={`login-preview-col${isLifted ? ' is-lift' : ''}${isShining ? ' is-shining' : ''}${isPreviewExpanded ? ' is-lifted is-expanded' : ''}`}
                aria-label="ตัวอย่างบัตรพนักงาน"
              >
                <div
                  className={`login-card-wrap${isLifted ? ' is-lift' : ''}${isShining ? ' is-shining' : ''}${isCardMoving ? ' is-moving' : ''}`}
                  ref={cardWrapRef}
                  style={{ transform: cardTransform }}
                >
                  <div className="login-welcome-top" aria-hidden="true">
                    <svg className="login-check-svg" width="56" height="56" viewBox="0 0 56 56" fill="none" stroke="var(--login-success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="28" cy="28" r="22" />
                      <path d="M18 29l7 7 13-14" />
                    </svg>
                    <h2>ยินดีต้อนรับ</h2>
                  </div>
                  <EmployeeIdCard employee={employee} notFound={isNotFound} partialId={partialId} />
                  <div className="login-password-row" aria-hidden="true">
                    <span>รหัสผ่าน</span>
                    <div className="login-password-dots">
                      {Array.from({ length: password.length }, (_, index) => <span className="login-dot" key={index} />)}
                    </div>
                  </div>
                  <div className="login-welcome-bottom" aria-hidden="true">
                    {employee ? `สวัสดี ${employee.name}` : ''}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </>
      )}

      <div className="login-sr-only" role="status" aria-live="polite">{liveMessage}</div>
    </div>
  );
}
