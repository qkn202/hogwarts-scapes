/**
 * Modern HTML <dialog> Top-Layer Helper
 * Implements native showModal(), closedby="any" pointer fallback,
 * discrete display/overlay exit animation probing, and returnValue hygiene.
 */

let supportsDisplayTransition;

/**
 * Probes whether the browser genuinely transitions discrete `display` values.
 * @returns {boolean}
 */
export function canTransitionDisplay() {
  if (supportsDisplayTransition !== undefined) return supportsDisplayTransition;
  if (!window.CSS?.supports?.('transition-behavior', 'allow-discrete') || !document.body) {
    return false;
  }
  const probe = document.createElement('div');
  probe.style.cssText = 'transition: display 1s allow-discrete !important; display: block;';
  document.body.appendChild(probe);
  getComputedStyle(probe).display;
  probe.style.display = 'none';
  supportsDisplayTransition = getComputedStyle(probe).display === 'block';
  probe.remove();
  return supportsDisplayTransition;
}

/**
 * Checks if both `overlay` and discrete `display` transitions are supported.
 * @returns {boolean}
 */
export function supportsTopLayerExit() {
  return Boolean(window.CSS?.supports?.('overlay', 'auto') && canTransitionDisplay());
}

/**
 * Opens a <dialog> element in the top layer as a true modal.
 * Re-promotes any active manual toast popover so status messages stay visible above the modal.
 * @param {HTMLDialogElement | null} dialog
 */
export function openModal(dialog) {
  if (!dialog) return;
  dialog.removeAttribute('data-closing');
  if (!dialog.open) {
    dialog.showModal();
    const toastEl = document.getElementById('scapes-toast');
    if (toastEl && typeof toastEl.showPopover === 'function' && toastEl.matches(':popover-open')) {
      toastEl.hidePopover();
      toastEl.showPopover();
    }
  }
}

let toastDismissTimer = null;
let toastFallbackWired = false;

/**
 * Displays a non-blocking Top-Layer toast notification (`popover="manual"` with legacy fixed fallback).
 * @param {string} message
 */
export function showToastBanner(message) {
  const el = document.getElementById('scapes-toast');
  if (!el) return;
  const msgEl = document.getElementById('scapes-toast-msg');
  if (msgEl) msgEl.textContent = message;
  else el.textContent = message;

  const supportsPopover = 'popover' in HTMLElement.prototype && typeof el.showPopover === 'function';
  el.classList.remove('hidden');

  if (supportsPopover) {
    if (el.matches(':popover-open')) el.hidePopover();
    el.showPopover();
  } else {
    el.classList.add('is-fallback-open');
    if (!toastFallbackWired) {
      toastFallbackWired = true;
      el.querySelector('[popovertargetaction="hide"]')?.addEventListener('click', () => {
        el.classList.remove('is-fallback-open');
        el.classList.add('hidden');
      });
    }
  }

  clearTimeout(toastDismissTimer);
  toastDismissTimer = setTimeout(() => {
    if (supportsPopover) {
      if (el.matches(':popover-open')) el.hidePopover();
    } else {
      el.classList.remove('is-fallback-open');
      el.classList.add('hidden');
    }
  }, 3200);
}

/**
 * Animates a modal <dialog> out of the top layer safely across all browsers, then closes it.
 * @param {HTMLDialogElement | null} dialog
 * @param {string} [returnValue='']
 * @returns {Promise<void>}
 */
export async function closeModal(dialog, returnValue = '') {
  if (!dialog || !dialog.open) return;
  if (!supportsTopLayerExit()) {
    dialog.setAttribute('data-closing', '');
    const animations = dialog.getAnimations({ subtree: true });
    if (animations.length > 0) {
      await Promise.race([
        Promise.allSettled(animations.map((a) => a.finished)),
        new Promise((r) => setTimeout(r, 400)),
      ]);
    }
    if (!dialog.hasAttribute('data-closing')) return;
    dialog.removeAttribute('data-closing');
  }
  dialog.close(returnValue);
}

/**
 * Wires light-dismiss fallbacks, Esc exit animations, and returnValue cleanup on all dialogs.
 * @param {(dialog: HTMLDialogElement, value: string) => void} [onDialogAction]
 */
export function initDialogs(onDialogAction) {
  const nativeClosedBy = 'closedBy' in HTMLDialogElement.prototype;

  const isOutside = (e, dialog) => {
    const r = dialog.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  };

  for (const dialog of document.querySelectorAll('dialog')) {
    // Route Esc / close requests through animated close unless closedby="none"
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      if (dialog.getAttribute('closedby') === 'none') {
        return;
      }
      closeModal(dialog, '');
    });

    // Clean up returnValue after reading so stale values never leak
    dialog.addEventListener('close', () => {
      const val = dialog.returnValue || '';
      dialog.returnValue = '';
      dialog.removeAttribute('data-closing');
      if (onDialogAction) {
        onDialogAction(dialog, val);
      }
    });

    // Fallback for browsers where <dialog closedby="any"> is not yet supported
    if (!nativeClosedBy && dialog.getAttribute('closedby') === 'any') {
      let pressedOutside = false;
      dialog.addEventListener('pointerdown', (e) => {
        if (e.target !== dialog) {
          pressedOutside = false;
          return;
        }
        pressedOutside = isOutside(e, dialog);
      });
      dialog.addEventListener('pointerup', (e) => {
        if (pressedOutside && e.target === dialog && isOutside(e, dialog)) {
          closeModal(dialog, '');
        }
        pressedOutside = false;
      });
    }

    // Wire buttons with data-dialog-close inside the dialog
    for (const btn of dialog.querySelectorAll('[data-dialog-close]')) {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-dialog-close') || '';
        closeModal(dialog, val);
      });
    }
  }
}

