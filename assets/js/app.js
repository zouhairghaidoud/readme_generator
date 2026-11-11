/* Application bootstrap: bindings, form sync, actions, theme. */
(function (global) {
  'use strict';

  const RF = (global.RF = global.RF || {});
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const WIDGET_KEYS = ['stats', 'streak', 'topLangs', 'views', 'trophies', 'activity'];

  const getState = () => RF.store.getState();
  let rafId = 0;
  let savedTimer = 0;
  let copyTimer = 0;

  function getPath(path) {
    return String(path)
      .split('.')
      .reduce((acc, key) => (acc == null ? undefined : acc[key]), getState());
  }

  function setPath(path, value) {
    const keys = String(path).split('.');
    const last = keys.pop();
    const target = keys.reduce((acc, key) => {
      if (!acc[key] || typeof acc[key] !== 'object') acc[key] = {};
      return acc[key];
    }, getState());
    target[last] = value;
  }

  function syncField(path) {
    $$(`[data-bind="${path}"]`).forEach((el) => {
      const value = getPath(path);
      if (el.type === 'checkbox') {
        el.checked = Boolean(value);
      } else if (el.value !== String(value ?? '')) {
        el.value = value ?? '';
      }
    });
  }

  function syncToggles() {
    $$('[data-toggle]').forEach((button) => {
      const on = Boolean(getPath(button.dataset.toggle));
      button.setAttribute('aria-checked', String(on));
    });
  }

  function syncCollapses() {
    const collapsed = getState().ui.collapsed || {};
    $$('[data-collapse]').forEach((button) => {
      const key = button.dataset.collapse;
      setCollapsedUi(key, Boolean(collapsed[key]));
    });
  }

  function setCollapsedUi(key, collapsed) {
    const button = $(`[data-collapse="${key}"]`);
    const body = document.getElementById(`section-body-${key}`);
    if (button) {
      button.setAttribute('aria-expanded', String(!collapsed));
      button.title = collapsed ? 'Expand section' : 'Collapse section';
      const label = button.querySelector('[data-collapse-label]');
      if (label) label.textContent = collapsed ? 'Show' : 'Hide';
    }
    if (body) {
      body.classList.toggle('is-collapsed', collapsed);
      if (collapsed) body.setAttribute('inert', '');
      else body.removeAttribute('inert');
    }
    updateCollapseControls();
  }

  function updateCollapseControls() {
    const button = $('#expand-all');
    if (!button) return;
    const collapsed = getState().ui.collapsed || {};
    button.classList.toggle('hidden', !Object.values(collapsed).some(Boolean));
  }

  function expandAllSections() {
    const state = getState();
    $$('[data-collapse]').forEach((button) => {
      const key = button.dataset.collapse;
      state.ui.collapsed[key] = false;
      setCollapsedUi(key, false);
    });
    RF.store.save();
  }

  function syncTabs() {
    const current = getState().ui.tab || 'preview';
    $$('[data-tab]').forEach((button) => {
      const active = button.dataset.tab === current;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });
    $('#panel-preview')?.classList.toggle('hidden', current !== 'preview');
    $('#panel-markdown')?.classList.toggle('hidden', current !== 'markdown');
  }

  function setTab(tab) {
    if (!['preview', 'markdown'].includes(tab)) return;
    getState().ui.tab = tab;
    RF.store.save();
    syncTabs();
  }

  function updateSocialHints() {
    const state = getState();
    const defaults = {
      github: 'github.com/your-handle',
      linkedin: 'linkedin.com/in/your-handle',
      twitter: 'x.com/your-handle',
      portfolio: 'your-domain.dev',
      devto: 'dev.to/your-handle',
      medium: 'medium.com/@your-handle',
      hashnode: 'hashnode.com/@your-handle',
      email: 'you@example.com',
    };
    const links = RF.urls.socialLinks(state.social);
    const byKey = new Map(links.map((link) => [link.key, link]));
    let connected = 0;

    Object.keys(defaults).forEach((key) => {
      const hint = $(`[data-hint="${key}"]`);
      if (!hint) return;
      const link = byKey.get(key);
      if (link) {
        connected += 1;
        let label = link.url.replace(/^https?:\/\//, '').replace(/^www\./, '');
        if (key === 'portfolio') label = RF.urls.domain(link.url);
        if (key === 'email') label = link.url.replace(/^mailto:/, '');
        hint.textContent = label;
        hint.title = link.url;
        hint.classList.add('is-valid');
      } else {
        hint.textContent = defaults[key];
        hint.removeAttribute('title');
        hint.classList.remove('is-valid');
      }
    });

    const countEl = $('#social-count');
    if (countEl) {
      countEl.textContent = String(connected);
      countEl.classList.toggle('hidden', connected === 0);
    }
  }

  function updateWidgetUi() {
    const state = getState();
    const enabled = WIDGET_KEYS.filter((key) => Boolean(state.widgets[key]));
    const countEl = $('#widget-count');
    if (countEl) {
      countEl.textContent = String(enabled.length);
      countEl.classList.toggle('hidden', enabled.length === 0);
    }
    const hasUsername = Boolean(RF.urls.github(state.social.github));
    const warning = $('#stats-username-warning');
    warning?.classList.toggle('hidden', !(enabled.length > 0 && !hasUsername));
    syncToggles();
  }

  function applyTheme(theme) {
    const next = theme === 'light' ? 'light' : 'dark';
    const root = document.documentElement;
    root.classList.toggle('dark', next === 'dark');
    root.style.colorScheme = next;
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', next === 'dark' ? '#0f172a' : '#f8fafc');
    const toggle = $('#theme-toggle');
    if (toggle) {
      const label = next === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
      toggle.setAttribute('aria-label', label);
      toggle.title = label;
    }
    if (getState().ui.theme !== next) {
      getState().ui.theme = next;
      RF.store.save();
    }
  }

  function afterChange(path) {
    RF.store.save();
    updateWidgetUi();
    if (!path || path.startsWith('social.')) updateSocialHints();
    RF.tech.updateCounts(getState());
    scheduleRender();
  }

  function render() {
    RF.preview.update(RF.markdown.build(getState()), getState());
  }

  function scheduleRender() {
    if (rafId) return;
    rafId = window.requestAnimationFrame(() => {
      rafId = 0;
      render();
    });
  }

  function flashSaved() {
    const indicator = $('#save-indicator');
    if (!indicator) return;
    indicator.classList.add('is-visible');
    window.clearTimeout(savedTimer);
    savedTimer = window.setTimeout(() => indicator.classList.remove('is-visible'), 1800);
  }

  /* --------------------------------------------------------------- form sync */

  function syncForm() {
    const state = getState();
    $$('[data-bind]').forEach((el) => {
      const value = getPath(el.dataset.bind);
      if (el.type === 'checkbox') el.checked = Boolean(value);
      else el.value = value ?? '';
    });
    RF.tech.render(state);
    syncToggles();
    syncCollapses();
    syncTabs();
    updateSocialHints();
    updateWidgetUi();
  }

  /* ----------------------------------------------------------------- actions */

  async function writeClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch {
        /* fall back to execCommand below */
      }
    }
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '0';
    area.style.left = '0';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.focus();
    area.select();
    try {
      const copied = document.execCommand('copy');
      if (!copied) throw new Error('Copy command rejected');
    } finally {
      area.remove();
    }
  }

  async function copyMarkdown() {
    const markdown = RF.markdown.build(getState());
    if (!markdown) return;
    const button = $('#copy-btn');
    try {
      await writeClipboard(markdown);
      if (button) {
        const label = $('#copy-label');
        const use = button.querySelector('use');
        const original = button.dataset.originalClass || button.className;
        button.dataset.originalClass = original;
        button.classList.add('btn-success');
        if (label) label.textContent = 'Copied!';
        if (use) use.setAttribute('href', '#i-check');
        window.clearTimeout(copyTimer);
        copyTimer = window.setTimeout(() => {
          button.className = original;
          if (label) label.textContent = 'Copy Markdown';
          if (use) use.setAttribute('href', '#i-copy');
        }, 1800);
      }
      RF.ui.toast('Markdown copied to clipboard');
    } catch {
      RF.ui.toast('Copy failed — select the Markdown manually.', 'error');
    }
  }

  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadMarkdown() {
    const markdown = RF.markdown.build(getState());
    if (!markdown) return;
    downloadFile('README.md', markdown, 'text/markdown;charset=utf-8');
    RF.ui.toast('README.md downloaded');
  }

  function loadSample() {
    RF.store.replace(RF.store.sample());
    syncForm();
    render();
    setTab('preview');
    RF.ui.toast('Sample profile loaded');
    if (window.matchMedia('(max-width: 1023px)').matches) {
      $('#preview-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  async function resetAll() {
    const ok = await RF.ui.confirm({
      title: 'Start from scratch?',
      message:
        'This clears every field, selected technology, and widget option stored in this browser. Your theme preference is kept.',
      confirmLabel: 'Clear workspace',
      danger: true,
    });
    if (!ok) return;
    RF.store.reset();
    syncForm();
    render();
    RF.ui.toast('Workspace cleared', 'info');
  }

  function exportJson() {
    downloadFile(
      'readme-forge-profile.json',
      JSON.stringify(getState(), null, 2),
      'application/json'
    );
    RF.ui.toast('Profile JSON exported');
  }

  async function importJson(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Invalid profile file');
      }
      RF.store.replace(parsed);
      syncForm();
      render();
      RF.ui.toast('Profile imported');
    } catch {
      RF.ui.toast('That file is not a valid README Forge profile.', 'error');
    }
  }

  function focusGithub() {
    const state = getState();
    if (state.ui.collapsed.social) {
      state.ui.collapsed.social = false;
      RF.store.save();
      setCollapsedUi('social', false);
    }
    const input = $('[data-bind="social.github"]');
    if (!input) return;
    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    input.focus({ preventScroll: true });
    input.classList.add('flash-focus');
    window.setTimeout(() => input.classList.remove('flash-focus'), 1500);
  }

  /* ------------------------------------------------------------------ bindings */

  function bindForm() {
    const form = $('#profile-form');
    if (!form) return;

    form.addEventListener('submit', (event) => event.preventDefault());

    const onFieldChange = (event) => {
      const el = event.target.closest('[data-bind]');
      if (!el) return;
      const value = el.type === 'checkbox' ? el.checked : el.value;
      const path = el.dataset.bind;
      if (getPath(path) === value) return;
      setPath(path, value);
      afterChange(path);
    };

    form.addEventListener('input', onFieldChange);
    form.addEventListener('change', onFieldChange);
  }

  function bindGlobal() {
    document.addEventListener('rf:changed', (event) => afterChange(event.detail?.source));
    document.addEventListener('rf:saved', flashSaved);

    // Keep in-page jumps working without leaving a hash that reloads into the preview.
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (!link || link.getAttribute('href') === '#') return;
      const id = link.getAttribute('href').slice(1);
      if (!id || !document.getElementById(id)) return;
      window.setTimeout(() => {
        if (location.hash) history.replaceState(null, '', location.pathname + location.search);
      }, 0);
    });

    document.addEventListener('click', (event) => {
      const toggle = event.target.closest('[data-toggle]');
      if (toggle) {
        const path = toggle.dataset.toggle;
        const next = !getPath(path);
        setPath(path, next);
        toggle.setAttribute('aria-checked', String(next));
        afterChange();
        return;
      }

      const collapse = event.target.closest('[data-collapse]');
      if (collapse) {
        const key = collapse.dataset.collapse;
        const state = getState();
        const next = !state.ui.collapsed[key];
        state.ui.collapsed[key] = next;
        RF.store.save();
        setCollapsedUi(key, next);
        return;
      }

      const tab = event.target.closest('[data-tab]');
      if (tab) {
        setTab(tab.dataset.tab);
        return;
      }

      const action = event.target.closest('[data-action]');
      if (action) {
        switch (action.dataset.action) {
          case 'focus-github':
            focusGithub();
            break;
          case 'load-sample':
            loadSample();
            break;
          case 'copy':
            copyMarkdown();
            break;
          case 'download':
            downloadMarkdown();
            break;
          case 'toggle-theme':
            applyTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark');
            break;
          default:
            break;
        }
      }
    });

    const tablist = $('[role="tablist"]');
    if (tablist) {
      tablist.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        const tabs = $$('[data-tab]', tablist);
        const index = tabs.findIndex((tab) => tab.dataset.tab === getState().ui.tab);
        const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : (index - 1 + tabs.length) % tabs.length;
        tabs[next].focus({ preventScroll: true });
        setTab(tabs[next].dataset.tab);
        event.preventDefault();
      });
    }

    $('#copy-btn')?.addEventListener('click', copyMarkdown);
    $('#download-btn')?.addEventListener('click', downloadMarkdown);
    $('#reset-btn')?.addEventListener('click', resetAll);
    $('#expand-all')?.addEventListener('click', expandAllSections);
    $('#theme-toggle')?.addEventListener('click', () =>
      applyTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark')
    );
    $('#load-sample')?.addEventListener('click', loadSample);
    $('#export-json')?.addEventListener('click', exportJson);
    $('#import-trigger')?.addEventListener('click', () => $('#import-json')?.click());
    $('#import-json')?.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      await importJson(file);
      event.target.value = '';
    });

    global.addEventListener('beforeunload', () => RF.store.saveNow());
  }

  function init() {
    RF.ui.initDialogs();
    RF.preview.init();
    RF.tech.init();
    bindForm();
    bindGlobal();
    applyTheme(getState().ui.theme || 'dark');
    syncForm();
    render();
    RF.ai.init();

    const yearEl = $('#year');
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  }

  RF.app = {
    init,
    render,
    scheduleRender,
    syncField,
    syncForm,
    syncTabs,
    setTab,
    loadSample,
    applyTheme,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})(window);
