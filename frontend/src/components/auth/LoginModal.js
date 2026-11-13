// frontend/src/components/auth/LoginModal.js — runs the mock-only login preview and reveal sequence.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import EmployeeIdCard from './EmployeeIdCard';
import { LOGIN_DEMO_EMPLOYEES } from '../../data/loginDemoEmployees';

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

const nextFrame = (signal) => {
  if (signal?.aborted) return Promise.resolve(false);

  return new Promise((resolve) => {
    let frameId;
    const finish = (completed) => {
      window.cancelAnimationFrame(frameId);
      signal?.removeEventListener('abort', abort);
      resolve(completed);
    };
    const abort = () => finish(false);
    frameId = window.requestAnimationFrame(() => finish(true));
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

export default function LoginModal({ onBackgroundChange }) {
  const [isOpen, setIsOpen] = useState(true);
  const [employeeId, setEmployeeId] = useState('');
  const [employee, setEmployee] = useState(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({ employeeId: '', password: '' });
  const [status, setStatus] = useState('');
  const [liveMessage, setLiveMessage] = useState('');
  const [presentation, setPresentation] = useState('idle');
  const [isRunning, setIsRunning] = useState(false);
  const [isLifted, setIsLifted] = useState(false);
  const [isShining, setIsShining] = useState(false);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [previewStyle, setPreviewStyle] = useState(null);
  const [panelHeight, setPanelHeight] = useState(null);
  const [placeholderStyle, setPlaceholderStyle] = useState(null);
  const [cardTransform, setCardTransform] = useState('none');
  const [cardTransition, setCardTransition] = useState('transform .4s ease-in-out');
  const [showReopen, setShowReopen] = useState(false);
  const [showRevealNote, setShowRevealNote] = useState(false);
  const runningRef = useRef(false);
  const lastStateRef = useRef('');
  const lastTriggerRef = useRef(null);
  const employeeIdRef = useRef(null);
  const reopenRef = useRef(null);
  const modalWrapRef = useRef(null);
  const modalRef = useRef(null);
  const previewRef = useRef(null);
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
    const normalizedId = value.trim().toUpperCase();
    const match = normalizedId
      ? LOGIN_DEMO_EMPLOYEES.find((item) => item.id === normalizedId) || null
      : null;
    setEmployeeId(value);
    setEmployee(match);
    setErrors((previous) => ({ ...previous, employeeId: '' }));
    setStatus('');

    if (!normalizedId) announce('empty', '');
    else if (match) announce(`found-${match.id}`, `Employee found: ${match.name}.`);
    else announce('not-found', 'Employee not found.');
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
    setIsPreviewExpanded(false);
    setPreviewStyle(null);
    setPanelHeight(null);
    setPlaceholderStyle(null);
    setCardTransform('none');
    setCardTransition('transform .4s ease-in-out');
  };

  const closeModal = () => {
    if (runningRef.current) return;
    setIsOpen(false);
    setShowReopen(true);
    updateBackground('clear');
    window.requestAnimationFrame(() => {
      const target = lastTriggerRef.current || reopenRef.current;
      target?.focus();
    });
  };

  const openModal = () => {
    lastTriggerRef.current = document.activeElement;
    setShowReopen(false);
    setShowRevealNote(false);
    setIsOpen(true);
    updateBackground('obscured');
  };

  const runSignature = async (matchedEmployee) => {
    const controller = new AbortController();
    animationControllerRef.current = controller;
    const { signal } = controller;
    runningRef.current = true;
    setIsRunning(true);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setLiveMessage('Signing in.');
    if (!await wait(reducedMotion ? 150 : 250, signal)) return;

    const modalRect = modalRef.current.getBoundingClientRect();
    const previewRect = previewRef.current.getBoundingClientRect();
    const dx = (modalRect.left + modalRect.width / 2) - (previewRect.left + previewRect.width / 2);
    const dy = (modalRect.top + modalRect.height / 2) - (previewRect.top + previewRect.height / 2);
    setPlaceholderStyle({
      top: `${previewRect.top - modalRect.top}px`,
      left: `${previewRect.left - modalRect.left}px`,
      width: `${previewRect.width}px`,
      height: `${previewRect.height}px`,
    });
    setPanelHeight(modalRect.height);
    setPresentation('leaving');
    setIsLifted(true);
    setIsShining(true);
    setCardTransition('transform .4s ease-in-out');
    setCardTransform(`translate(${dx}px, ${dy}px)`);
    if (!reducedMotion) {
      const form = modalRef.current?.querySelector('.login-form-col');
      const cardMove = waitForTransition(cardWrapRef.current, 'transform', 400, signal);
      const formFade = waitForTransition(form, 'opacity', 350, signal);
      const formSlide = waitForTransition(form, 'transform', 450, signal);
      const completed = await Promise.all([cardMove, formFade, formSlide]);
      if (completed.some((result) => !result)) return;
    }

    setPreviewStyle({
      top: `${previewRect.top - modalRect.top}px`,
      left: `${previewRect.left - modalRect.left}px`,
      width: `${previewRect.width}px`,
      height: `${previewRect.height}px`,
    });
    setPresentation('expanding');
    setIsPreviewExpanded(true);
    if (!await nextFrame(signal)) return;
    setCardTransition('transform .55s var(--login-ease)');
    setCardTransform('translate(0, 0)');
    setPreviewStyle({ top: '0px', left: '0px', width: '100%', height: '100%' });
    if (!reducedMotion) {
      const cardCenter = waitForTransition(cardWrapRef.current, 'transform', 550, signal);
      const panelExpansion = waitForTransition(previewRef.current, 'height', 550, signal);
      const completed = await Promise.all([cardCenter, panelExpansion]);
      if (completed.some((result) => !result)) return;
    }

    setPresentation('welcomed');
    setLiveMessage(`Demo success. Welcome to MECHA, ${matchedEmployee.name}.`);
    if (!reducedMotion) {
      const checkmarkPath = modalRef.current?.querySelector('.login-check-svg path');
      if (!await waitForTransition(checkmarkPath, 'stroke-dashoffset', 750, signal)) return;
    }
    if (!await wait(reducedMotion ? 1400 : 550, signal)) return;

    setPresentation('dissolving');
    updateBackground('revealed');
    if (!reducedMotion) {
      const modalFade = waitForTransition(modalRef.current, 'opacity', 450, signal);
      const scrimFade = waitForTransition(document.querySelector('.login-scrim'), 'opacity', 600, signal);
      const completed = await Promise.all([modalFade, scrimFade]);
      if (completed.some((result) => !result)) return;
    }

    runningRef.current = false;
    animationControllerRef.current = null;
    setIsRunning(false);
    setIsOpen(false);
    setShowReopen(true);
    setShowRevealNote(true);
    resetDemo();
    window.requestAnimationFrame(() => reopenRef.current?.focus());
  };

  const submitForm = (event) => {
    event.preventDefault();
    if (runningRef.current) return;

    const nextErrors = { employeeId: '', password: '' };
    const normalizedId = employeeId.trim().toUpperCase();
    if (!normalizedId) nextErrors.employeeId = 'Enter your Employee ID.';
    else if (!employee) nextErrors.employeeId = 'Employee ID not found in the demo data.';
    if (!password) nextErrors.password = 'Enter your password.';
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
  const modalClassName = [
    'login-modal-panel',
    presentation !== 'idle' && 'is-leaving',
    presentation === 'welcomed' && 'is-welcomed',
    presentation === 'dissolving' && 'is-dissolving',
  ].filter(Boolean).join(' ');

  return (
    <div className="login-experience">
      {isOpen && (
        <>
          <div className={`login-scrim${presentation === 'dissolving' ? ' is-fading' : ''}`} aria-hidden="true" />
          <div className="login-modal-wrap" ref={modalWrapRef}>
            <div
              className={modalClassName}
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="login-title"
              onKeyDown={handleModalKeyDown}
              style={panelHeight ? { height: `${panelHeight}px` } : undefined}
            >
              <button className="login-close" type="button" aria-label="Close login" onClick={closeModal}>
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
                  <h1 id="login-title">Welcome back</h1>
                  <p className="login-lede">Sign in with your Employee ID to continue to your projects.</p>
                </div>

                <form className="login-form" noValidate onSubmit={submitForm}>
                  <div className="login-field">
                    <label htmlFor="login-employee-id">Employee ID</label>
                    <input
                      id="login-employee-id"
                      ref={employeeIdRef}
                      type="text"
                      autoComplete="username"
                      placeholder="e.g. EMP-001"
                      value={employeeId}
                      aria-describedby="login-employee-id-error"
                      aria-invalid={Boolean(errors.employeeId)}
                      onChange={changeEmployeeId}
                    />
                    <p className="login-error" id="login-employee-id-error" role="alert">{errors.employeeId}</p>
                  </div>

                  <div className="login-field">
                    <label htmlFor="login-password">Password</label>
                    <div className="login-input-wrap">
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        value={password}
                        aria-describedby="login-password-error"
                        aria-invalid={Boolean(errors.password)}
                        onChange={changePassword}
                        onFocus={() => setIsLifted(true)}
                        onBlur={() => { if (!runningRef.current) setIsLifted(false); }}
                      />
                      <button
                        type="button"
                        className="login-toggle-password"
                        aria-controls="login-password"
                        aria-pressed={showPassword}
                        onClick={() => setShowPassword((visible) => !visible)}
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <p className="login-error" id="login-password-error" role="alert">{errors.password}</p>
                  </div>

                  <div className="login-options-row">
                    <label className="login-remember">
                      <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
                      <span>Remember me</span>
                    </label>
                    <button className="login-link" type="button" onClick={() => setStatus('Password recovery is not available in this preview.')}>
                      Forgot password?
                    </button>
                  </div>

                  <button className={`login-submit${isRunning ? ' is-loading' : ''}`} type="submit" disabled={isRunning}>
                    <span className="login-spinner" aria-hidden="true" />
                    <span>{isRunning ? 'Signing in...' : 'Sign in'}</span>
                  </button>
                  <p className="login-status" id="login-status">{status}</p>
                  <p className="login-demo-banner">Demo only. Try EMP-001 to EMP-008 with any password. Nothing is checked or saved.</p>
                </form>
              </section>

              {placeholderStyle && <div className="login-preview-placeholder" style={placeholderStyle} aria-hidden="true" />}
              <aside
                className={`login-preview-col${isLifted ? ' is-lift' : ''}${isShining ? ' is-shining' : ''}${isPreviewExpanded ? ' is-lifted is-expanded' : ''}`}
                ref={previewRef}
                aria-label="Employee preview"
                style={previewStyle || undefined}
              >
                <span className="login-geo login-geo-a" aria-hidden="true" />
                <span className="login-geo login-geo-b" aria-hidden="true" />
                <div
                  className={`login-card-wrap${isLifted ? ' is-lift' : ''}${isShining ? ' is-shining' : ''}`}
                  ref={cardWrapRef}
                  style={{ transform: cardTransform, transition: cardTransition }}
                >
                  <div className="login-welcome-top" aria-hidden="true">
                    <svg className="login-check-svg" width="56" height="56" viewBox="0 0 56 56" fill="none" stroke="var(--login-success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="28" cy="28" r="22" />
                      <path d="M18 29l7 7 13-14" />
                    </svg>
                    <h2>Welcome to MECHA</h2>
                  </div>
                  <EmployeeIdCard employee={employee} notFound={cardView} />
                  <div className="login-password-row" aria-hidden="true">
                    <span>Password</span>
                    <div className="login-password-dots">
                      {Array.from({ length: password.length }, (_, index) => <span className="login-dot" key={index} />)}
                    </div>
                  </div>
                  <div className="login-welcome-bottom" aria-hidden="true">
                    {employee ? `Hello, ${employee.name}` : ''}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </>
      )}

      <div className="login-reveal-note" hidden={!showRevealNote}>
        Dashboard reveal demo. No session was created.
      </div>
      <div className="login-sr-only" role="status" aria-live="polite">{liveMessage}</div>
      <button
        className="login-reopen"
        type="button"
        ref={reopenRef}
        hidden={!showReopen}
        onClick={openModal}
      >
        {showRevealNote ? 'Replay login demo' : 'Open login'}
      </button>
    </div>
  );
}
