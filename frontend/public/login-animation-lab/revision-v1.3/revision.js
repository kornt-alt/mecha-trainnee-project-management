// Runs the local-only employee preview and Concept A animation demo.
(() => {
  const employees = [
    { id: 'EMP-001', name: 'Mock Employee 01', position: 'Project Engineer', department: 'PE', tone: '#60a5fa' },
    { id: 'EMP-002', name: 'Mock Employee 02', position: 'Production Planner', department: 'PD', tone: '#7dd3fc' },
    { id: 'EMP-003', name: 'Mock Employee 03', position: 'Mechanical Engineer', department: 'ENG', tone: '#93c5fd' },
    { id: 'EMP-004', name: 'Mock Employee 04', position: 'Project Manager', department: 'PE', tone: '#a5b4fc' },
    { id: 'EMP-005', name: 'Mock Employee 05', position: 'Systems Analyst', department: 'IT', tone: '#67e8f9' },
    { id: 'EMP-006', name: 'Mock Employee 06', position: 'ML Engineer', department: 'AI', tone: '#99f6e4' },
    { id: 'EMP-007', name: 'Mock Employee 07', position: 'Production Supervisor', department: 'PD', tone: '#bfdbfe' },
    { id: 'EMP-008', name: 'Mock Employee 08', position: 'Design Engineer', department: 'ENG', tone: '#c4b5fd' },
  ];

  const byId = (id) => document.getElementById(id);
  const modalWrap = byId('modal-wrap');
  const modal = byId('login-modal');
  const form = byId('login-form');
  const idInput = byId('employee-id');
  const passwordInput = byId('password');
  const employeeCard = byId('employee-card');
  const cardWrap = byId('card-wrap');
  const previewPanel = byId('preview-panel');
  const submitButton = byId('sign-in');
  const submitLabel = byId('sign-in-label');
  const status = byId('form-status');
  const idError = byId('employee-id-error');
  const passwordError = byId('password-error');
  const liveCardStatus = byId('card-announcement');
  const passwordDots = byId('password-dots');
  const passwordPreview = byId('password-preview');
  const completeNote = byId('demo-complete-note');
  const replayButton = byId('replay-demo');
  let currentEmployee = null;
  let running = false;
  let lastAnnouncement = '';

  window.__revisionStages = [];

  function stage(name) {
    document.body.dataset.animationStage = name;
    const record = { stage: name, time: performance.now() };
    if (name === 'card-arrived') {
      const card = cardWrap.getBoundingClientRect();
      const modalRect = modal.getBoundingClientRect();
      record.cardCenterOffset = +(card.left + card.width / 2 - modalRect.left - modalRect.width / 2).toFixed(2);
      record.cardCenterOffsetY = +(card.top + card.height / 2 - modalRect.top - modalRect.height / 2).toFixed(2);
      record.cardAspectRatio = +(card.width / card.height).toFixed(3);
      record.previewOverflow = getComputedStyle(previewPanel).overflow;
    }
    window.__revisionStages.push(record);
  }

  function announce(key, message) {
    if (key === lastAnnouncement) return;
    lastAnnouncement = key;
    liveCardStatus.textContent = message;
  }

  function makePhoto(employee) {
    return `<svg viewBox="0 0 84 130" aria-hidden="true"><rect width="84" height="130" fill="${employee.tone}"/><circle cx="42" cy="50" r="20" fill="#fff" opacity=".92"/><path d="M6 130C6 98 24 86 42 86s36 12 36 44z" fill="#fff" opacity=".92"/></svg>`;
  }

  function makeQr(id) {
    let seed = 0;
    for (const character of id) seed = (seed * 31 + character.charCodeAt(0)) >>> 0;
    let cells = '';
    for (let row = 0; row < 11; row += 1) {
      for (let column = 0; column < 11; column += 1) {
        const finder = (row < 3 && column < 3) || (row < 3 && column > 7) || (row > 7 && column < 3);
        let enabled;
        if (finder) enabled = !((row === 1 && column === 1) || (row === 1 && column === 9) || (row === 9 && column === 1));
        else {
          seed = (seed * 1103515245 + 12345) >>> 0;
          enabled = Boolean((seed >>> 16) & 1);
        }
        if (enabled) cells += `<rect x="${column * 5}" y="${row * 5}" width="4.4" height="4.4" rx=".8"/>`;
      }
    }
    return `<svg viewBox="0 0 55 55" fill="var(--color-navy-900)" aria-hidden="true">${cells}</svg>`;
  }

  function renderPasswordDots() {
    passwordDots.replaceChildren();
    const count = Math.min(passwordInput.value.length, 32);
    for (let index = 0; index < count; index += 1) {
      const dot = document.createElement('span');
      dot.className = 'password-dot';
      passwordDots.append(dot);
    }
    passwordPreview.hidden = count === 0;
  }

  function setCardState(state, value = '', employee = null) {
    employeeCard.dataset.state = state;
    employeeCard.classList.toggle('empty-head', state === 'empty');
    employeeCard.classList.remove('is-reflecting');
    byId('employee-id-value').textContent = value;
    byId('employee-id-row').hidden = state === 'empty' || state === 'not-found';
    byId('employee-details').hidden = state !== 'valid';
    byId('empty-skeleton').hidden = state === 'valid' || state === 'not-found';
    byId('card-empty-hint').hidden = state !== 'empty';
    byId('card-message').hidden = state !== 'not-found';
    byId('employee-photo').hidden = state === 'not-found';
    byId('employee-qr').hidden = state !== 'valid';

    if (state === 'valid' && employee) {
      byId('employee-name').textContent = employee.name;
      byId('employee-position').textContent = employee.position;
      byId('employee-department').textContent = employee.department;
      byId('employee-photo').innerHTML = makePhoto(employee);
      byId('employee-qr').innerHTML = makeQr(employee.id);
    } else {
      byId('employee-name').textContent = '';
      byId('employee-position').textContent = '';
      byId('employee-department').textContent = '';
      byId('employee-photo').textContent = '?';
      byId('employee-qr').replaceChildren();
    }
  }

  function updateCard() {
    const raw = idInput.value;
    const normalized = raw.trim().toUpperCase();
    idError.textContent = '';
    idInput.removeAttribute('aria-invalid');
    currentEmployee = employees.find((employee) => employee.id === normalized) || null;

    if (!normalized) {
      setCardState('empty');
      announce('empty', 'Enter an Employee ID to preview its card.');
      return;
    }
    if (currentEmployee) {
      setCardState('valid', currentEmployee.id, currentEmployee);
      announce(`valid-${currentEmployee.id}`, `Employee found: ${currentEmployee.name}.`);
      return;
    }
    if (/^EMP-\d{3}$/i.test(normalized)) {
      currentEmployee = null;
      setCardState('not-found', normalized);
      announce(`not-found-${normalized}`, `Employee ${normalized} was not found.`);
      return;
    }

    setCardState('partial', raw);
    announce(`partial-${raw}`, `Employee ID preview: ${raw}. Keep typing to complete the ID.`);
  }

  function wait(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  function waitForTransition(element, property, fallbackMs) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return Promise.resolve();
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        element.removeEventListener('transitionend', onEnd);
        resolve();
      };
      const onEnd = (event) => {
        if (event.target === element && event.propertyName === property) finish();
      };
      const timer = window.setTimeout(finish, fallbackMs + 180);
      element.addEventListener('transitionend', onEnd);
    });
  }

  async function playDemo(employee) {
    if (running) return;
    running = true;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    submitButton.disabled = true;
    submitButton.setAttribute('aria-busy', 'true');
    submitButton.classList.add('is-loading');
    submitLabel.textContent = 'Signing in...';
    status.textContent = 'Visual demo running. No session will be created.';
    stage('button-response');
    await wait(280);

    const modalRect = modal.getBoundingClientRect();
    const cardRect = cardWrap.getBoundingClientRect();
    const shiftX = modalRect.left + modalRect.width / 2 - (cardRect.left + cardRect.width / 2);
    const shiftY = modalRect.top + modalRect.height / 2 - (cardRect.top + cardRect.height / 2);
    modal.classList.add('is-leaving');
    stage('form-and-card-motion');
    if (!reduced) {
      cardWrap.classList.add('is-moving');
      employeeCard.classList.add('is-reflecting');
      cardWrap.style.transform = `translate3d(${shiftX}px, ${shiftY}px, 0)`;
      await waitForTransition(cardWrap, 'transform', 620);
      cardWrap.classList.remove('is-moving');
    }
    stage('card-arrived');

    previewPanel.classList.add('is-expanding');
    modal.classList.add('is-cinematic');
    stage('preview-expand');
    await wait(reduced ? 0 : 440);

    byId('welcome-name').textContent = employee.name;
    modal.classList.add('is-welcomed');
    stage('welcome-overlay');
    status.textContent = `Welcome to MECHA, ${employee.name}. Visual demo only.`;
    await wait(reduced ? 120 : 700);

    document.body.classList.add('is-dashboard-revealed');
    modal.classList.add('is-dissolving');
    stage('dashboard-reveal');
    await wait(reduced ? 0 : 620);

    modalWrap.hidden = true;
    modal.classList.remove('is-leaving', 'is-cinematic', 'is-welcomed', 'is-dissolving');
    modal.classList.remove('is-welcomed');
    previewPanel.classList.remove('is-expanding');
    cardWrap.removeAttribute('style');
    employeeCard.classList.remove('is-reflecting');
    submitButton.disabled = false;
    submitButton.removeAttribute('aria-busy');
    submitButton.classList.remove('is-loading');
    submitLabel.textContent = 'Sign in';
    running = false;
    completeNote.hidden = false;
    replayButton.textContent = 'Replay login demo';
    replayButton.hidden = false;
    stage('complete');
    replayButton.focus();
  }

  function resetDemo() {
    running = false;
    currentEmployee = null;
    lastAnnouncement = '';
    modal.classList.remove('is-leaving', 'is-cinematic', 'is-welcomed', 'is-dissolving');
    previewPanel.classList.remove('is-expanding');
    cardWrap.removeAttribute('style');
    cardWrap.classList.remove('is-moving');
    employeeCard.classList.remove('is-reflecting');
    document.body.classList.remove('is-dashboard-revealed');
    modalWrap.hidden = false;
    completeNote.hidden = true;
    replayButton.hidden = true;
    submitButton.disabled = false;
    submitButton.removeAttribute('aria-busy');
    submitButton.classList.remove('is-loading');
    submitLabel.textContent = 'Sign in';
    idInput.value = '';
    passwordInput.value = '';
    passwordInput.type = 'password';
    byId('password-toggle').textContent = 'Show';
    byId('password-toggle').setAttribute('aria-pressed', 'false');
    byId('remember').checked = false;
    idError.textContent = '';
    passwordError.textContent = '';
    idInput.removeAttribute('aria-invalid');
    passwordInput.removeAttribute('aria-invalid');
    status.textContent = '';
    liveCardStatus.textContent = '';
    updateCard();
    renderPasswordDots();
    window.__revisionStages = [];
    stage('initial');
  }

  function openDemo() {
    resetDemo();
    window.setTimeout(() => idInput.focus(), 0);
  }

  function closeDemo() {
    if (running) return;
    modalWrap.hidden = true;
    replayButton.textContent = 'Open login';
    replayButton.hidden = false;
    replayButton.focus();
  }

  idInput.addEventListener('input', updateCard);
  passwordInput.addEventListener('input', () => {
    passwordError.textContent = '';
    passwordInput.removeAttribute('aria-invalid');
    renderPasswordDots();
  });
  byId('password-toggle').addEventListener('click', (event) => {
    const show = passwordInput.type === 'password';
    passwordInput.type = show ? 'text' : 'password';
    event.currentTarget.textContent = show ? 'Hide' : 'Show';
    event.currentTarget.setAttribute('aria-pressed', String(show));
  });
  byId('forgot-password').addEventListener('click', () => {
    status.textContent = 'Password recovery is not available in this visual demo.';
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (running) return;
    updateCard();
    let valid = true;
    if (!currentEmployee) {
      idError.textContent = 'Enter a complete Employee ID from the demo list.';
      idInput.setAttribute('aria-invalid', 'true');
      idInput.focus();
      valid = false;
    }
    if (!passwordInput.value) {
      passwordError.textContent = 'Enter any password to play the demo.';
      passwordInput.setAttribute('aria-invalid', 'true');
      if (valid) passwordInput.focus();
      valid = false;
    }
    if (valid) void playDemo(currentEmployee);
  });
  byId('close-login').addEventListener('click', closeDemo);
  replayButton.addEventListener('click', openDemo);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modalWrap.hidden) closeDemo();
    if (event.key !== 'Tab' || modalWrap.hidden) return;
    const controls = [...modal.querySelectorAll('button, input')].filter((element) => !element.disabled && element.offsetParent !== null);
    if (!controls.length) return;
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  updateCard();
  renderPasswordDots();
  idInput.focus();
})();
