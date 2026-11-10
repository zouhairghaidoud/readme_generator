/* UI helpers: toasts, dialogs, confirmations, inline icons. */
(function (global) {
  'use strict';

  const RF = (global.RF = global.RF || {});
  const $ = (sel, root = document) => root.querySelector(sel);

  function icon(name, className = 'h-4 w-4') {
    return `<svg class="${className}" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  let toastTimer = 0;

  function toast(message, type = 'success', duration = 2800) {
    const container = $('#toasts');
    if (!container) return;

    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.setAttribute('role', 'status');
    const iconName = type === 'error' ? 'alert' : type === 'info' ? 'info' : 'check';
    el.innerHTML = `
      <span class="toast-icon">${icon(iconName, 'h-3 w-3')}</span>
      <span class="leading-snug">${escapeHtml(message)}</span>`;
    container.appendChild(el);

    window.setTimeout(() => {
      el.classList.add('is-leaving');
      window.setTimeout(() => el.remove(), 260);
    }, duration);

    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {}, duration);
  }

  function openDialog(id) {
    const dialog = typeof id === 'string' ? document.getElementById(id) : id;
    if (!dialog) return null;
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
    return dialog;
  }

  function closeDialog(id) {
    const dialog = typeof id === 'string' ? document.getElementById(id) : id;
    if (!dialog) return;
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else dialog.removeAttribute('open');
  }

  function initDialogs() {
    document.querySelectorAll('dialog.modal').forEach((dialog) => {
      dialog.addEventListener('click', (event) => {
        if (event.target === dialog) dialog.close();
      });
    });
    document.addEventListener('click', (event) => {
      const closer = event.target.closest('[data-close-dialog]');
      if (closer) {
        const id = closer.getAttribute('data-close-dialog');
        closeDialog(id || closer.closest('dialog')?.id);
      }
    });
  }

  function confirmAction({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false }) {
    return new Promise((resolve) => {
      const dialog = $('#dialog-confirm');
      if (!dialog) return resolve(window.confirm(message));

      const titleEl = $('#confirm-title');
      const messageEl = $('#confirm-message');
      const okBtn = $('#confirm-ok');
      const cancelBtn = $('#confirm-cancel');

      titleEl.textContent = title;
      messageEl.textContent = message;
      okBtn.textContent = confirmLabel;
      cancelBtn.textContent = cancelLabel;
      okBtn.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;

      const finish = (value) => {
        dialog.removeEventListener('close', onClose);
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        closeDialog(dialog);
        resolve(value);
      };

      const onClose = () => finish(false);
      const onOk = () => finish(true);
      const onCancel = () => finish(false);

      dialog.addEventListener('close', onClose, { once: true });
      okBtn.addEventListener('click', onOk, { once: true });
      cancelBtn.addEventListener('click', onCancel, { once: true });

      openDialog(dialog);
      okBtn.focus({ preventScroll: true });
    });
  }

  function changed(detail = {}) {
    document.dispatchEvent(new CustomEvent('rf:changed', { detail }));
  }

  RF.ui = {
    icon,
    escapeHtml,
    toast,
    openDialog,
    closeDialog,
    initDialogs,
    confirm: confirmAction,
    changed,
  };
})(window);
