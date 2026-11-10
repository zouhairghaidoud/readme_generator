/* Tech stack picker + custom Shields.io badges. */
(function (global) {
  'use strict';

  const RF = (global.RF = global.RF || {});
  const $ = (sel, root = document) => root.querySelector(sel);

  let groupsEl;
  let customEl;
  let customEmptyEl;
  let searchEl;
  let noMatchesEl;

  function chipMarkup(category, item, checked) {
    return `<label class="tech-chip${checked ? ' is-checked' : ''}" data-label="${RF.ui.escapeHtml(
      item.label.toLowerCase()
    )}" title="${RF.ui.escapeHtml(item.label)}">
            <input type="checkbox" class="sr-only" data-tech-cat="${category}" value="${item.id}" ${
      checked ? 'checked' : ''
    } />
            ${RF.ui.icon('check', 'tick h-3 w-3')}
            <span>${RF.ui.escapeHtml(item.label)}</span>
          </label>`;
  }

  function renderGroups(state) {
    if (!groupsEl) return;
    groupsEl.innerHTML = RF.techCatalog.categories
      .map((category) => {
        const selected = state.tech[category.id] || [];
        const chips = category.items
          .map((item) => chipMarkup(category.id, item, selected.includes(item.id)))
          .join('');
        return `<div class="tech-group" data-tech-group="${category.id}">
                  <div class="mb-2 flex items-center gap-2">
                    <h4 class="text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-400">${
                      category.label
                    }</h4>
                    <span class="count-pill" data-tech-count="${category.id}">0</span>
                  </div>
                  <div class="tech-chip-grid flex flex-wrap gap-1.5">${chips}</div>
                </div>`;
      })
      .join('');
    applyFilter(state);
  }

  function renderCustom(state) {
    if (!customEl) return;
    const custom = state.tech.custom || [];
    customEl.innerHTML = custom
      .map(
        (item) => `<span class="custom-chip" data-custom-label="${RF.ui.escapeHtml(
          item.label.toLowerCase()
        )}">
            <span class="h-2 w-2 rounded-full" style="background:#${RF.markdown.cleanColor(
              item.color
            )}"></span>
            <span>${RF.ui.escapeHtml(item.label)}</span>
            <button type="button" class="grid h-4 w-4 place-items-center rounded text-slate-500 hover:bg-rose-500/15 hover:text-rose-300" data-remove-custom="${item.id}" aria-label="Remove ${RF.ui.escapeHtml(
          item.label
        )} badge">${RF.ui.icon('close', 'h-3 w-3')}</button>
          </span>`
      )
      .join('');
    if (customEmptyEl) customEmptyEl.classList.toggle('hidden', custom.length > 0);
  }

  function updateCounts(state) {
    let total = 0;
    RF.techCatalog.categories.forEach((category) => {
      const count = (state.tech[category.id] || []).length;
      total += count;
      const el = document.querySelector(`[data-tech-count="${category.id}"]`);
      if (el) {
        el.textContent = String(count);
        el.classList.toggle('has-items', count > 0);
      }
    });
    total += (state.tech.custom || []).length;
    const totalEl = $('#tech-count');
    if (totalEl) {
      totalEl.textContent = String(total);
      totalEl.classList.toggle('hidden', total === 0);
    }
  }

  function render(state) {
    renderGroups(state);
    renderCustom(state);
    updateCounts(state);
  }

  function applyFilter(state) {
    if (!searchEl) return;
    const query = searchEl.value.trim().toLowerCase();
    let visibleGroups = 0;
    document.querySelectorAll('[data-tech-group]').forEach((group) => {
      let visible = 0;
      group.querySelectorAll('.tech-chip').forEach((chip) => {
        const haystack = `${chip.dataset.label || ''} ${chip.textContent}`.toLowerCase();
        const match = !query || haystack.includes(query);
        chip.classList.toggle('hidden', !match);
        if (match) visible += 1;
      });
      group.classList.toggle('hidden', visible === 0);
      if (visible > 0) visibleGroups += 1;
    });
    if (noMatchesEl) noMatchesEl.classList.toggle('hidden', visibleGroups > 0);
    if (customEl) {
      customEl.querySelectorAll('.custom-chip').forEach((chip) => {
        const match =
          !query || String(chip.dataset.customLabel || '').includes(query);
        chip.classList.toggle('hidden', !match);
      });
    }
    if (state) updateCounts(state);
  }

  function updateBadgePreview() {
    const label = $('#badge-label').value.trim() || 'Your Badge';
    const color = $('#badge-color').value;
    const logo = $('#badge-logo').value.trim().toLowerCase();
    const valueEl = $('#badge-color-value');
    if (valueEl) valueEl.textContent = color.toUpperCase();
    const img = $('#badge-preview');
    if (img) {
      img.src = RF.markdown.badgeUrl({ label, color, logo });
      img.alt = `${label} badge preview`;
    }
    const slugEl = $('#badge-logo-hint');
    if (slugEl) {
      slugEl.textContent = logo
        ? `logo=${logo}`
        : 'Optional — use a Simple Icons slug (e.g. laravel)';
    }
  }

  function openBadgeDialog() {
    const form = $('#badge-form');
    if (form) form.reset();
    const color = $('#badge-color');
    if (color) color.value = '#6366F1';
    updateBadgePreview();
    RF.ui.openDialog('dialog-badge');
    window.setTimeout(() => $('#badge-label')?.focus({ preventScroll: true }), 60);
  }

  function addCustomBadge(event) {
    event.preventDefault();
    const state = RF.store.getState();
    const label = $('#badge-label').value.trim();
    if (!label) {
      $('#badge-label').focus({ preventScroll: true });
      return;
    }
    const logo = $('#badge-logo').value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    state.tech.custom.push({
      id: `custom-${Date.now().toString(36)}`,
      label: label.slice(0, 40),
      color: $('#badge-color').value,
      logo,
    });
    renderCustom(state);
    updateCounts(state);
    RF.ui.closeDialog('dialog-badge');
    RF.ui.changed({ source: 'custom-badge' });
    RF.ui.toast('Custom badge added');
  }

  function init() {
    groupsEl = $('#tech-groups');
    customEl = $('#custom-chips');
    customEmptyEl = $('#custom-empty');
    searchEl = $('#tech-search');
    noMatchesEl = $('#no-tech-matches');

    if (groupsEl) {
      renderGroups(RF.store.getState());
      groupsEl.addEventListener('change', (event) => {
        const input = event.target.closest('input[data-tech-cat]');
        if (!input) return;
        const category = input.dataset.techCat;
        const state = RF.store.getState();
        const list = new Set(state.tech[category] || []);
        if (input.checked) list.add(input.value);
        else list.delete(input.value);
        state.tech[category] = [...list];
        input.closest('.tech-chip')?.classList.toggle('is-checked', input.checked);
        updateCounts(state);
        RF.ui.changed({ source: 'tech' });
      });
    }

    if (customEl) {
      renderCustom(RF.store.getState());
      customEl.addEventListener('click', (event) => {
        const remove = event.target.closest('[data-remove-custom]');
        if (!remove) return;
        const state = RF.store.getState();
        state.tech.custom = state.tech.custom.filter(
          (item) => item.id !== remove.dataset.removeCustom
        );
        renderCustom(state);
        updateCounts(state);
        RF.ui.changed({ source: 'custom-badge' });
        RF.ui.toast('Badge removed', 'info');
      });
    }

    if (searchEl) {
      searchEl.addEventListener('input', () => applyFilter(RF.store.getState()));
    }

    $('#add-badge')?.addEventListener('click', openBadgeDialog);
    $('#badge-form')?.addEventListener('submit', addCustomBadge);
    ['#badge-label', '#badge-color', '#badge-logo'].forEach((sel) => {
      $(sel)?.addEventListener('input', updateBadgePreview);
    });

    updateCounts(RF.store.getState());
  }

  RF.tech = {
    init,
    render,
    updateCounts,
    focusSearch() {
      searchEl?.focus();
    },
  };
})(window);
