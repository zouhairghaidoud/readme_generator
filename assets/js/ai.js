/* AI bio assistant: OpenAI-compatible API + offline fallback drafts. */
(function (global) {
  'use strict';

  const RF = (global.RF = global.RF || {});
  const $ = (sel) => document.querySelector(sel);
  const esc = (value) => RF.ui.escapeHtml(value);
  const AI_KEY = 'readme-forge:ai';

  const PRESETS = {
    openai: {
      endpoint: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-4o-mini',
      keyPlaceholder: 'sk-...',
    },
    openrouter: {
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      model: 'openai/gpt-4o-mini',
      keyPlaceholder: 'sk-or-v1-...',
    },
    groq: {
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      model: 'llama-3.3-70b-versatile',
      keyPlaceholder: 'gsk_...',
    },
    ollama: {
      endpoint: 'http://localhost:11434/v1/chat/completions',
      model: 'llama3.2',
      keyPlaceholder: 'Not required for local Ollama',
    },
    custom: {
      endpoint: '',
      model: '',
      keyPlaceholder: 'Optional API key',
    },
  };

  const DEFAULT_SETTINGS = {
    preset: 'openai',
    endpoint: PRESETS.openai.endpoint,
    model: PRESETS.openai.model,
    apiKey: '',
  };

  let settings = loadSettings();
  let lastBios = [];
  let generating = false;

  function loadSettings() {
    try {
      const raw = global.localStorage.getItem(AI_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(raw);
      return {
        preset: PRESETS[parsed.preset] ? parsed.preset : 'custom',
        endpoint: String(parsed.endpoint || DEFAULT_SETTINGS.endpoint),
        model: String(parsed.model || DEFAULT_SETTINGS.model),
        apiKey: String(parsed.apiKey || ''),
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function persistSettings() {
    try {
      global.localStorage.setItem(AI_KEY, JSON.stringify(settings));
    } catch {
      /* ignore quota errors */
    }
  }

  const isLocal = (endpoint) => /localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]/i.test(endpoint);
  const trimPeriod = (text) => String(text || '').trim().replace(/[.!?]+$/, '');

  /* --------------------------------------------------------------- local drafts */

  function localBios(state) {
    const p = state.personal || {};
    const skills = RF.markdown.topSkills(state, 5);
    const role = trimPeriod(p.role) || 'developer';
    const location = trimPeriod(p.location);
    const project = trimPeriod(p.currentWork);
    const learning = trimPeriod(p.learning);
    const fun = trimPeriod(p.funFact);
    const top = skills.slice(0, 3);
    const skillSentence = RF.markdown.listSentence(top);

    const professional = [
      `I'm a ${role}${location ? ` based in ${location}` : ''}, focused on building reliable, user-first software${
        skillSentence ? ` with ${skillSentence}` : ''
      }.`,
      project ? `Right now I'm building ${project}.` : '',
      'I care about clean architecture, accessibility, and shipping work that lasts.',
    ]
      .filter(Boolean)
      .join(' ');

    const creative = [
      `I'm a ${role}${location ? ` in ${location}` : ''} who turns fuzzy ideas into products people actually enjoy using${
        top.length
          ? ` — usually with ${RF.markdown.listSentence(top.slice(0, 2))} close at hand`
          : ''
      }.`,
      project ? `Right now that means ${project}.` : '',
      fun
        ? `Off the clock: ${fun}.`
        : learning
          ? `Currently exploring ${learning}.`
          : 'Always learning, always shipping.',
    ]
      .filter(Boolean)
      .join(' ');

    const concise = [
      role,
      location ? `· ${location}` : '',
      top.length ? `· ${top.join(' · ')}` : '',
      project ? `· Building ${project}` : '',
    ]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    return [
      { style: 'Professional', text: professional },
      { style: 'Creative', text: creative },
      { style: 'Concise', text: concise.endsWith('.') ? concise : `${concise}.` },
    ];
  }

  /* ---------------------------------------------------------------------- API */

  function profilePayload(state) {
    const p = state.personal || {};
    return {
      name: p.name || '',
      role: p.role || '',
      location: p.location || '',
      skills: RF.markdown.topSkills(state, 8),
      currentWork: p.currentWork || '',
      learning: p.learning || '',
      funFact: p.funFact || '',
      portfolio: RF.urls.portfolio((state.social || {}).portfolio) || '',
    };
  }

  async function requestBios(state) {
    const endpoint = settings.endpoint.trim();
    if (!/^https?:\/\//i.test(endpoint)) {
      throw new Error('The API endpoint must start with http:// or https://.');
    }
    if (!settings.model.trim()) {
      throw new Error('Add a model name in the AI settings.');
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 35000);
    let response;

    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: settings.model.trim(),
          temperature: 0.85,
          max_tokens: 700,
          messages: [
            {
              role: 'system',
              content:
                'You are an expert GitHub profile copywriter. Write three first-person developer bios labelled Professional, Creative and Concise. Rules: 1-3 sentences each, max 280 characters, no hashtags, no invented facts (employers, years of experience, metrics, achievements). No emoji in Professional or Concise; at most one emoji in Creative. Return ONLY valid JSON in this exact shape: {"bios":[{"style":"Professional","text":"..."},{"style":"Creative","text":"..."},{"style":"Concise","text":"..."}]}',
            },
            {
              role: 'user',
              content: `Developer profile (JSON):\n${JSON.stringify(
                profilePayload(state),
                null,
                2
              )}\n\nWrite the three bios now.`,
            },
          ],
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('The AI request timed out. Try again or use the local drafts.');
      }
      throw new Error(
        'Could not reach the AI endpoint. Check the URL, your connection, or the provider CORS settings.'
      );
    } finally {
      window.clearTimeout(timer);
    }

    if (!response.ok) {
      let detail = '';
      try {
        const body = await response.text();
        const parsed = JSON.parse(body);
        detail = parsed.error?.message || parsed.message || body;
      } catch {
        detail = '';
      }
      throw new Error(
        `API error ${response.status}${detail ? `: ${String(detail).slice(0, 180)}` : ''}`
      );
    }

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error('The API response was not valid JSON.');
    }

    const content = extractContent(data);
    if (!content) throw new Error('The API returned an empty response.');
    return parseBios(content);
  }

  function extractContent(data) {
    const raw =
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.text ??
      data?.message?.content ??
      data?.response ??
      data?.content ??
      '';
    if (Array.isArray(raw)) {
      return raw.map((part) => (typeof part === 'string' ? part : part?.text || '')).join('\n');
    }
    return String(raw || '');
  }

  function parseBios(content) {
    let text = String(content).trim();
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const start = text.search(/[[{]/);
    if (start === -1) throw new Error('The AI response did not contain JSON.');

    let parsed = null;
    for (let end = text.length; end > start; end -= 1) {
      const char = text[end - 1];
      if (char !== ']' && char !== '}') continue;
      try {
        parsed = JSON.parse(text.slice(start, end));
        break;
      } catch {
        /* keep shrinking */
      }
    }
    if (!parsed) throw new Error('Could not parse the AI response. Try regenerating.');

    let items = [];
    if (Array.isArray(parsed)) {
      items = parsed;
    } else if (Array.isArray(parsed.bios)) {
      items = parsed.bios;
    } else if (Array.isArray(parsed.choices)) {
      items = parsed.choices;
    } else {
      const arrayValue = Object.values(parsed).find(Array.isArray);
      items = arrayValue || [];
    }

    const labels = ['Professional', 'Creative', 'Concise'];
    const bios = items
      .slice(0, 3)
      .map((item, index) => {
        if (typeof item === 'string') return { style: labels[index], text: item.trim() };
        const text = String(item?.text || item?.bio || item?.summary || item?.content || '').trim();
        const style = String(item?.style || item?.tone || item?.type || labels[index] || 'Bio')
          .trim()
          .slice(0, 30);
        return { style, text };
      })
      .filter((bio) => bio.text.length > 0);

    if (!bios.length) throw new Error('The AI response contained no usable bios.');
    return bios;
  }

  /* ---------------------------------------------------------------------- UI */

  function setGenerating(value) {
    generating = value;
    const button = $('#ai-generate');
    if (!button) return;
    button.disabled = value;
    button.setAttribute('aria-busy', value ? 'true' : 'false');
    button.querySelector('svg')?.classList.toggle('spinner', value);
  }

  function setSource(text) {
    const el = $('#bio-source');
    if (el) el.textContent = text;
  }

  function showLoading() {
    const container = $('#bio-results');
    if (!container) return;
    container.innerHTML = Array.from({ length: 3 })
      .map(
        () => `<div class="rounded-xl border border-slate-700/70 bg-slate-900/40 p-4">
                <div class="mb-3 h-3 w-24 rounded-full bg-slate-700/70"></div>
                <div class="loading-bar mb-2"></div>
                <div class="loading-bar mb-2 w-11/12"></div>
                <div class="loading-bar w-2/3"></div>
              </div>`
      )
      .join('');
    setSource('Drafting three options…');
  }

  function showBios(bios, source) {
    lastBios = bios;
    const container = $('#bio-results');
    if (!container) return;
    container.innerHTML = '';

    bios.forEach((bio, index) => {
      const card = document.createElement('div');
      card.className =
        'rounded-xl border border-slate-700/70 bg-slate-900/40 p-4 transition-colors hover:border-indigo-400/40';
      const head = document.createElement('div');
      head.className = 'mb-2 flex items-center justify-between gap-3';
      head.innerHTML = `<span class="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-300">${esc(
        bio.style
      )}</span><span class="text-[10px] text-slate-500">${bio.text.length} chars</span>`;

      const text = document.createElement('p');
      text.className = 'text-[13px] leading-relaxed text-slate-200';
      text.textContent = bio.text;

      const actions = document.createElement('div');
      actions.className = 'mt-3 flex items-center gap-2';
      actions.innerHTML = `<button type="button" class="btn btn-ghost !py-1.5 !text-[11px]" data-copy-bio="${index}">${RF.ui.icon(
        'copy',
        'h-3 w-3'
      )}Copy</button><button type="button" class="btn btn-primary !py-1.5 !text-[11px]" data-use-bio="${index}">${RF.ui.icon(
        'check',
        'h-3 w-3'
      )}Use this bio</button>`;

      card.append(head, text, actions);
      container.appendChild(card);
    });

    setSource(source);
    container.querySelectorAll('[data-use-bio]').forEach((button) => {
      button.addEventListener('click', () => {
        const bio = lastBios[Number(button.dataset.useBio)];
        if (bio) applyBio(bio.text);
      });
    });
    container.querySelectorAll('[data-copy-bio]').forEach((button) => {
      button.addEventListener('click', async () => {
        const bio = lastBios[Number(button.dataset.copyBio)];
        if (!bio) return;
        try {
          await navigator.clipboard.writeText(bio.text);
          RF.ui.toast('Bio copied to clipboard');
        } catch {
          RF.ui.toast('Could not copy — select the text manually.', 'error');
        }
      });
    });
  }

  function showError(message, state) {
    const container = $('#bio-results');
    if (!container) return;
    container.innerHTML = `<div class="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
        <div class="flex items-start gap-2 text-rose-200">
          ${RF.ui.icon('alert', 'h-4 w-4 mt-0.5 shrink-0')}
          <div>
            <p class="text-xs font-semibold">The AI request could not be completed</p>
            <p class="mt-1 text-[11px] leading-relaxed text-rose-200/80" id="bio-error-message"></p>
          </div>
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <button type="button" class="btn btn-ghost !py-1.5 !text-[11px]" id="bio-open-settings">${RF.ui.icon(
            'settings',
            'h-3 w-3'
          )}API settings</button>
          <button type="button" class="btn btn-ai !py-1.5 !text-[11px]" id="bio-use-local">${RF.ui.icon(
            'sparkles',
            'h-3 w-3'
          )}Use local drafts</button>
          <button type="button" class="btn btn-ghost !py-1.5 !text-[11px]" id="bio-retry">Retry</button>
        </div>
      </div>`;
    const messageEl = $('#bio-error-message');
    if (messageEl) messageEl.textContent = message;
    setSource('Request failed');

    $('#bio-open-settings')?.addEventListener('click', () => {
      RF.ui.closeDialog('dialog-bios');
      openSettings();
    });
    $('#bio-use-local')?.addEventListener('click', () => {
      showBios(localBios(state), 'Local drafts · no API call was made');
    });
    $('#bio-retry')?.addEventListener('click', generate);
  }

  function applyBio(text) {
    const state = RF.store.getState();
    state.personal.bio = text;
    RF.ui.closeDialog('dialog-bios');
    RF.ui.changed({ source: 'ai-bio' });
    RF.app.syncField('personal.bio');
    RF.app.render();
    RF.ui.toast('Bio added to your README');
  }

  async function generate() {
    if (generating) return;
    const state = RF.store.getState();
    RF.ui.openDialog('dialog-bios');
    showLoading();
    setGenerating(true);

    try {
      if (!settings.apiKey && !isLocal(settings.endpoint)) {
        await new Promise((resolve) => window.setTimeout(resolve, 550));
        showBios(
          localBios(state),
          'Local drafts — add an API key in AI settings for tailored bios'
        );
      } else {
        const bios = await requestBios(state);
        showBios(bios, `Generated with ${settings.model}`);
      }
    } catch (error) {
      showError(error.message || 'Something went wrong.', state);
    } finally {
      setGenerating(false);
    }
  }

  /* ------------------------------------------------------------------ settings */

  function openSettings() {
    const preset = $('#ai-preset');
    const endpoint = $('#ai-endpoint');
    const model = $('#ai-model');
    const key = $('#ai-key');
    if (!preset || !endpoint || !model || !key) return;

    preset.value = settings.preset;
    endpoint.value = settings.endpoint;
    model.value = settings.model;
    key.value = settings.apiKey;
    key.type = 'password';
    updateKeyPlaceholder();
    updateModeNote();
    RF.ui.openDialog('dialog-ai-settings');
  }

  function updateKeyPlaceholder() {
    const preset = $('#ai-preset')?.value;
    const key = $('#ai-key');
    if (!key) return;
    key.placeholder = PRESETS[preset]?.keyPlaceholder || PRESETS.custom.keyPlaceholder;
  }

  function updateModeNote() {
    const endpoint = $('#ai-endpoint')?.value.trim() || '';
    const key = $('#ai-key')?.value.trim() || '';
    const note = $('#ai-mode-note');
    if (!note) return;
    if (endpoint && !key && !isLocal(endpoint)) {
      note.textContent = 'No key yet — the built-in local drafts will be used instead of an API call.';
      note.className = 'field-hint text-amber-400/90';
    } else if (isLocal(endpoint)) {
      note.textContent = 'Local endpoint — no key required. Make sure Ollama allows this origin (OLLAMA_ORIGINS).';
      note.className = 'field-hint';
    } else {
      note.textContent = 'Requests are sent directly from your browser to this endpoint.';
      note.className = 'field-hint';
    }
  }

  function saveSettings(event) {
    event.preventDefault();
    const endpoint = $('#ai-endpoint').value.trim();
    const model = $('#ai-model').value.trim();
    if (!/^https?:\/\//i.test(endpoint)) {
      RF.ui.toast('The endpoint must start with http:// or https://', 'error');
      $('#ai-endpoint').focus({ preventScroll: true });
      return;
    }
    if (!model) {
      RF.ui.toast('Add a model name', 'error');
      $('#ai-model').focus({ preventScroll: true });
      return;
    }
    settings = {
      preset: $('#ai-preset').value,
      endpoint,
      model,
      apiKey: $('#ai-key').value.trim(),
    };
    persistSettings();
    RF.ui.closeDialog('dialog-ai-settings');
    RF.ui.toast('AI settings saved');
  }

  function init() {
    $('#ai-generate')?.addEventListener('click', generate);
    $('#ai-settings-btn')?.addEventListener('click', openSettings);
    $('#bio-settings')?.addEventListener('click', () => {
      RF.ui.closeDialog('dialog-bios');
      openSettings();
    });
    $('#bio-regenerate')?.addEventListener('click', generate);
    $('#ai-settings-form')?.addEventListener('submit', saveSettings);

    $('#ai-preset')?.addEventListener('change', (event) => {
      const preset = PRESETS[event.target.value];
      if (!preset) return;
      if (event.target.value !== 'custom') {
        $('#ai-endpoint').value = preset.endpoint;
        $('#ai-model').value = preset.model;
      }
      $('#ai-key').placeholder = preset.keyPlaceholder;
      updateModeNote();
    });

    ['#ai-endpoint', '#ai-key'].forEach((sel) => {
      $(sel)?.addEventListener('input', updateModeNote);
    });

    $('#ai-key-toggle')?.addEventListener('click', () => {
      const key = $('#ai-key');
      if (!key) return;
      const show = key.type === 'password';
      key.type = show ? 'text' : 'password';
      const use = $('#ai-key-toggle use');
      if (use) use.setAttribute('href', show ? '#i-eye-off' : '#i-eye');
      $('#ai-key-toggle').setAttribute('aria-label', show ? 'Hide API key' : 'Show API key');
    });

    $('#ai-clear-key')?.addEventListener('click', () => {
      const key = $('#ai-key');
      if (key) key.value = '';
      settings.apiKey = '';
      persistSettings();
      updateModeNote();
      RF.ui.toast('Stored API key cleared', 'info');
    });
  }

  RF.ai = { init, generate, openSettings, localBios };
})(window);
