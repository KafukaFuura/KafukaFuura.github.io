(() => {
  'use strict';

  if (window.__adaptiveDetailSheetInstalled) return;
  window.__adaptiveDetailSheetInstalled = true;

  const viewportElement = document.getElementById('viewport');
  const panel = document.getElementById('detail');
  const trigger = document.getElementById('detailBtn');
  const dock = document.getElementById('contextDock');
  const questionStageElement = document.getElementById('questionStage');

  if (!viewportElement || !panel || !trigger) return;

  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', '知识点讲解');

  const backdrop = document.createElement('button');
  backdrop.type = 'button';
  backdrop.className = 'detail-backdrop';
  backdrop.tabIndex = -1;
  backdrop.setAttribute('aria-label', '关闭讲解');
  viewportElement.insertBefore(backdrop, panel);

  const setText = (element, text) => {
    if (element && element.textContent !== text) element.textContent = text;
  };

  const isOpen = () => !panel.classList.contains('hidden');

  const syncInterface = () => {
    const open = isOpen();
    const fullscreen = panel.classList.contains('fullscreen');

    viewportElement.classList.toggle('detail-open', open);
    viewportElement.classList.toggle('detail-full', fullscreen);
    trigger.classList.toggle('detail-trigger-active', open);
    trigger.setAttribute('aria-expanded', String(open));
    trigger.setAttribute('aria-controls', 'detail');
    panel.setAttribute('aria-hidden', String(!open));

    setText(trigger, open ? '关闭讲解' : '查看讲解');
    setText(panel.querySelector('#detailFullBtn'), fullscreen ? '返回抽屉' : '展开阅读');
    setText(panel.querySelector('#detailCloseBtn'), '关闭');

    if (dock) dock.style.right = '20px';
  };

  const focusPanelTitle = () => {
    const title = panel.querySelector('h2');
    if (!title) return;
    title.tabIndex = -1;
    try {
      title.focus({ preventScroll: true });
    } catch (_error) {
      title.focus();
    }
  };

  const openSheet = ({ focus = false } = {}) => {
    panel.classList.remove('hidden');
    syncInterface();
    if (focus) requestAnimationFrame(focusPanelTitle);
  };

  const closeSheet = () => {
    panel.classList.remove('fullscreen');
    panel.classList.add('hidden');
    syncInterface();
    trigger.focus({ preventScroll: true });
  };

  /* The sheet overlays the canvas, so fitting the tree no longer reserves a permanent right column. */
  try {
    detailReserve = function adaptiveDetailReserve() {
      return 28;
    };
  } catch (_error) {
    // The original page may eventually encapsulate its functions; the CSS overlay still works.
  }

  try {
    syncDetailLayout = function adaptiveSyncDetailLayout() {
      if (dock) dock.style.right = '20px';
      syncInterface();
    };
  } catch (_error) {
    // Keep the original layout function when it is not assignable.
  }

  try {
    setDetailFullscreen = function adaptiveSetDetailFullscreen(on) {
      panel.classList.remove('hidden');
      panel.classList.toggle('fullscreen', Boolean(on));
      if (typeof renderDetail === 'function') renderDetail();
      syncInterface();
    };
  } catch (_error) {
    // The delegated button handler below still updates the interface.
  }

  try {
    if (typeof selectNode === 'function') {
      const originalSelectNode = selectNode;
      selectNode = function adaptiveSelectNode(...args) {
        const result = originalSelectNode.apply(this, args);
        openSheet();
        return result;
      };
    }
  } catch (_error) {
    // Selection continues to work even if the original binding is immutable.
  }

  trigger.onclick = (event) => {
    event.preventDefault();
    if (isOpen()) closeSheet();
    else openSheet({ focus: true });
  };

  backdrop.addEventListener('click', closeSheet);

  panel.addEventListener('click', (event) => {
    const closeButton = event.target.closest('#detailCloseBtn');
    if (closeButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeSheet();
      return;
    }

    const fullscreenButton = event.target.closest('#detailFullBtn');
    if (fullscreenButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const nextState = !panel.classList.contains('fullscreen');
      try {
        setDetailFullscreen(nextState);
      } catch (_error) {
        panel.classList.toggle('fullscreen', nextState);
        syncInterface();
      }
    }
  }, true);

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (questionStageElement && questionStageElement.classList.contains('show')) return;
    if (!isOpen()) return;

    event.preventDefault();
    event.stopPropagation();
    if (panel.classList.contains('fullscreen')) {
      try {
        setDetailFullscreen(false);
      } catch (_error) {
        panel.classList.remove('fullscreen');
        syncInterface();
      }
    } else {
      closeSheet();
    }
  }, true);

  const observer = new MutationObserver(syncInterface);
  observer.observe(panel, { childList: true });

  window.addEventListener('resize', syncInterface, { passive: true });

  /* Start with an unobstructed knowledge tree; selecting a node opens the sheet. */
  panel.classList.remove('fullscreen');
  panel.classList.add('hidden');
  syncInterface();

  window.setTimeout(() => {
    try {
      if (typeof autoFocus !== 'undefined' && autoFocus && typeof focusBranch === 'function') {
        focusBranch(active);
      } else if (typeof fitAll === 'function') {
        fitAll();
      }
    } catch (_error) {
      // Initial fitting is a progressive enhancement.
    }
  }, 120);
})();
