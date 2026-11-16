/* Controls isolated A/B/C motion previews without touching production Login code. */
(() => {
  const frame = document.getElementById('dashboardFrame');
  const body = document.body;
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration));
  const queryConcept = new URLSearchParams(window.location.search).get('concept');
  const concept = ['a', 'b', 'c'].includes((queryConcept || '').toLowerCase())
    ? queryConcept.toLowerCase()
    : 'a';
  let overlayFrame = null;
  let readyPromise = null;

  body.dataset.concept = concept;

  function setStage(stage) {
    body.dataset.stage = stage;
    const marker = `login-lab-stage:${stage}`;
    performance.mark(marker);
    if (console.timeStamp) console.timeStamp(marker);
    if (new URLSearchParams(window.location.search).get('capture') === '1' && window.loginLabStageSignal) {
      const detail = { stage, time: performance.now() };
      if (stage === 'welcome-overlay') {
        const card = document.getElementById('cardWrap').getBoundingClientRect();
        const preview = document.getElementById('previewCol').getBoundingClientRect();
        const modal = document.getElementById('modal').getBoundingClientRect();
        detail.centers = {
          card: card.left + card.width / 2,
          preview: preview.left + preview.width / 2,
          modal: modal.left + modal.width / 2,
        };
      }
      window.loginLabStageSignal(JSON.stringify(detail));
    }
    window.dispatchEvent(new CustomEvent('login-lab-stage', { detail: { stage, concept } }));
  }

  function waitForTransition(element, property, duration) {
    return new Promise((resolve) => {
      let timer;
      const finish = () => {
        window.clearTimeout(timer);
        element.removeEventListener('transitionend', onEnd);
        resolve();
      };
      const onEnd = (event) => {
        if (event.target === element && event.propertyName === property) finish();
      };
      element.addEventListener('transitionend', onEnd);
      timer = window.setTimeout(finish, duration + 220);
    });
  }

  function hideDashboardLogin(targetFrame) {
    try {
      const doc = targetFrame.contentDocument;
      if (!doc?.head || doc.getElementById('login-lab-dashboard-style')) return Boolean(doc?.head);
      const style = doc.createElement('style');
      style.id = 'login-lab-dashboard-style';
      style.textContent = `
        html, body, #root { height: 100%; margin: 0; overflow: hidden !important; }
        .login-experience, .login-scrim, .login-modal-wrap, .login-reopen, .login-reveal-note { display: none !important; }
        .login-app-background, .login-app-background.is-obscured, .login-app-background.is-revealed {
          max-height: 100vh !important; overflow: clip !important; filter: none !important; transform: none !important;
        }
      `;
      doc.head.appendChild(style);
      return true;
    } catch (_) {
      return false;
    }
  }

  function waitForFrame(targetFrame, timeout = 12000) {
    return new Promise((resolve) => {
      let settled = false;
      const hasExpectedDocument = () => {
        try {
          return targetFrame.contentDocument?.readyState === 'complete'
            && targetFrame.contentDocument.location.href === targetFrame.src;
        } catch (_) {
          return false;
        }
      };
      const finish = (loaded) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        targetFrame.removeEventListener('load', onLoad);
        resolve(loaded);
      };
      const onLoad = () => {
        if (hasExpectedDocument()) finish(true);
      };
      const timer = window.setTimeout(() => finish(false), timeout);
      targetFrame.addEventListener('load', onLoad);
      if (hasExpectedDocument()) finish(true);
    });
  }

  function addOverlayLayer() {
    const layer = document.createElement('div');
    layer.className = 'dashboard-overlay';
    layer.setAttribute('aria-hidden', 'true');
    document.querySelector('.dashboard-stage').appendChild(layer);
    return layer;
  }

  function initialize() {
    if (!readyPromise) {
      if (concept === 'b' || concept === 'c') overlayFrame = addOverlayLayer();
      readyPromise = waitForFrame(frame).then((loaded) => {
        if (!loaded) throw new Error('The Dashboard preview frame did not finish loading.');
        hideDashboardLogin(frame);
        frame.classList.add('is-ready');
        return true;
      });
    }
    return readyPromise;
  }

  function reset() {
    delete body.dataset.dashboardReveal;
    delete body.dataset.stage;
    if (overlayFrame) overlayFrame.classList.remove('is-clearing', 'is-revealing');
    if (concept === 'c') {
      body.style.removeProperty('--focus-x');
      body.style.removeProperty('--focus-y');
      body.style.removeProperty('--reveal-radius');
    }
    setStage('initial');
  }

  async function moveCard(cardWrap, modal) {
    const modalRect = modal.getBoundingClientRect();
    const cardRect = cardWrap.getBoundingClientRect();
    const dx = modalRect.left + modalRect.width / 2 - (cardRect.left + cardRect.width / 2);
    const dy = modalRect.top + modalRect.height / 2 - (cardRect.top + cardRect.height / 2);
    cardWrap.classList.add('is-moving', 'lift', 'shine');
    const movement = waitForTransition(cardWrap, 'transform', 620);
    cardWrap.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    await movement;
    cardWrap.classList.remove('is-moving');
    return { x: cardRect.left + cardRect.width / 2 + dx, y: cardRect.top + cardRect.height / 2 + dy };
  }

  async function play({ employee, reducedMotion: requestedReduced, elements }) {
    const rm = Boolean(requestedReduced || reducedMotion());
    const { modal, modalWrap, cardWrap, formCol, revealNote, reopenBtn, srLive } = elements;
    await initialize();
    body.dataset.dashboardReveal = 'false';
    await sleep(rm ? 0 : 120);

    if (rm) {
      modal.classList.add('leaving', 'welcomed');
      srLive.textContent = `Demo success. Welcome to MECHA, ${employee.name}.`;
      setStage('welcome-overlay');
      await sleep(450);
      setStage('dashboard-reveal');
      body.dataset.dashboardReveal = 'true';
      if (concept === 'b' && overlayFrame) overlayFrame.classList.add('is-clearing');
      if (concept === 'c' && overlayFrame) overlayFrame.classList.add('is-revealing');
      modal.classList.add('dissolving');
      await sleep(40);
      body.dataset.dashboardReveal = 'complete';
      setStage('dashboard-complete');
      return;
    }

    const movement = concept === 'b' ? Promise.resolve(null) : moveCard(cardWrap, modal);
    setStage(concept === 'b' ? 'form-fade' : 'form-and-card-motion');
    modal.classList.add('leaving');
    await Promise.all([movement, sleep(540)]);
    const focus = concept === 'b' ? null : await movement;

    if (concept === 'c' && focus) {
      body.style.setProperty('--focus-x', `${focus.x}px`);
      body.style.setProperty('--focus-y', `${focus.y}px`);
    }
    setStage('welcome-overlay');
    modal.classList.add('welcomed');
    srLive.textContent = `Demo success. Welcome to MECHA, ${employee.name}. No session was created.`;
    await sleep(760);

    setStage('dashboard-reveal');
    body.dataset.dashboardReveal = 'true';
    if (concept === 'b' && overlayFrame) overlayFrame.classList.add('is-clearing');
    if (concept === 'c' && overlayFrame) {
      overlayFrame.classList.add('is-revealing');
      if (CSS.supports('transition', '--reveal-radius 1s')) {
        overlayFrame.style.setProperty('--reveal-radius', '150vmax');
      } else {
        overlayFrame.classList.add('is-clearing');
      }
    }
    if (concept === 'a') modal.classList.add('dissolving');
    else {
      await sleep(220);
      modal.classList.add('dissolving');
    }
    await sleep(concept === 'c' ? 1120 : 620);

    body.dataset.dashboardReveal = 'complete';
    setStage('dashboard-complete');
    if (revealNote) revealNote.hidden = false;
    if (reopenBtn) {
      reopenBtn.textContent = 'Replay login demo';
      reopenBtn.hidden = false;
    }
    if (formCol) formCol.inert = true;
    return { concept, modalHiddenByCaller: Boolean(modalWrap) };
  }

  window.loginAnimationLab = { concept, initialize, play, reset, setStage };
})();
