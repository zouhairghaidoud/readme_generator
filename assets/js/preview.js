/* Rendered Markdown preview, raw source, stats and warnings. */
(function (global) {
  'use strict';

  const RF = (global.RF = global.RF || {});
  const $ = (sel) => document.querySelector(sel);

  const els = {};
  let lastMarkdown = '';

  function cache() {
    els.previewEmpty = $('#preview-empty');
    els.previewContent = $('#preview-content');
    els.article = $('#markdown-preview');
    els.warning = $('#preview-warning');
    els.code = $('#markdown-code');
    els.codeEmpty = $('#code-empty');
    els.copy = $('#copy-btn');
    els.download = $('#download-btn');
    els.stats = $('#md-stats');
    els.tabSize = $('#tab-md-size');
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  function renderSafe(markdown) {
    if (!global.marked) {
      return `<pre class="whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-300">${RF.ui.escapeHtml(
        markdown
      )}</pre><p class="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">Markdown renderer unavailable — showing plain text. Check your connection and refresh.</p>`;
    }
    let html = '';
    try {
      html = global.marked.parse(markdown, { gfm: true, breaks: false });
    } catch {
      return `<pre class="whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-300">${RF.ui.escapeHtml(
        markdown
      )}</pre>`;
    }
    if (!global.DOMPurify) {
      return `<pre class="whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-300">${RF.ui.escapeHtml(
        markdown
      )}</pre>`;
    }
    return global.DOMPurify.sanitize(html, {
      ADD_ATTR: ['target', 'align', 'rel'],
      FORBID_TAGS: ['style', 'script', 'iframe', 'form', 'input', 'button', 'select', 'textarea'],
      ALLOW_DATA_ATTR: false,
    });
  }

  function update(markdown, state) {
    if (!els.article) cache();
    lastMarkdown = markdown;
    const hasContent = Boolean(markdown && markdown.trim());

    els.previewEmpty?.classList.toggle('hidden', hasContent);
    els.previewContent?.classList.toggle('hidden', !hasContent);
    els.codeEmpty?.classList.toggle('hidden', hasContent);

    if (els.copy) els.copy.disabled = !hasContent;
    if (els.download) els.download.disabled = !hasContent;

    if (!hasContent) {
      if (els.article) els.article.innerHTML = '';
      if (els.code) els.code.textContent = '';
      if (els.warning) els.warning.classList.add('hidden');
      if (els.stats) els.stats.textContent = '0 lines · 0 words · 0 B';
      if (els.tabSize) els.tabSize.textContent = '0 B';
      return;
    }

    if (els.code) els.code.textContent = markdown;
    if (els.article) {
      els.article.innerHTML = renderSafe(markdown);
      els.article.querySelectorAll('a').forEach((anchor) => {
        anchor.target = '_blank';
        anchor.rel = 'noreferrer noopener';
      });
      els.article.querySelectorAll('img').forEach((img) => {
        img.loading = 'lazy';
        img.decoding = 'async';
      });
    }

    const widgets = state.widgets || {};
    const widgetEnabled = ['stats', 'streak', 'topLangs', 'views', 'trophies', 'activity'].some(
      (key) => Boolean(widgets[key])
    );
    const hasUsername = Boolean(RF.urls.github((state.social || {}).github));
    if (els.warning) els.warning.classList.toggle('hidden', !(widgetEnabled && !hasUsername));

    const lines = markdown.split('\n').length;
    const words = markdown.trim().split(/\s+/).filter(Boolean).length;
    const bytes =
      typeof TextEncoder !== 'undefined'
        ? new TextEncoder().encode(markdown).length
        : markdown.length;
    const summary = `${lines} lines · ${words} words · ${formatBytes(bytes)}`;
    if (els.stats) els.stats.textContent = summary;
    if (els.tabSize) els.tabSize.textContent = formatBytes(bytes);
  }

  function getMarkdown() {
    return lastMarkdown;
  }

  function init() {
    cache();
    update('', RF.store.getState());
  }

  RF.preview = {
    init,
    update,
    getMarkdown,
    renderer: renderSafe,
  };
})(window);
