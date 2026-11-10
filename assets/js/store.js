/* Application state: defaults, persistence, sample profile. */
(function (global) {
  'use strict';

  const RF = (global.RF = global.RF || {});
  const STORAGE_KEY = 'readme-forge:v1';

  const SAMPLE = {
    personal: {
      name: 'Alex Moreau',
      role: 'Full-Stack Developer',
      location: 'Lyon, France',
      bio: 'I build fast, accessible web apps with a soft spot for clean APIs and thoughtful interfaces.',
      currentWork: 'a SaaS analytics platform built with Laravel and Vue',
      learning: 'Rust and event-driven architecture',
      funFact: 'I automate everything — including my morning coffee machine',
    },
    social: {
      github: 'alexmoreau',
      linkedin: 'alexmoreau',
      twitter: 'alexmoreau_dev',
      portfolio: 'alexmoreau.dev',
      devto: 'alexmoreau',
      medium: '',
      hashnode: '',
    },
    tech: {
      languages: ['javascript', 'typescript', 'php', 'python'],
      frameworks: ['laravel', 'vue', 'tailwindcss', 'nodejs'],
      databases: ['mysql', 'postgresql', 'redis'],
      devops: ['docker', 'githubactions', 'aws', 'linux'],
      tools: ['git', 'vscode', 'postman', 'figma'],
      custom: [],
    },
    widgets: {
      theme: 'tokyonight',
      stats: true,
      streak: true,
      topLangs: true,
      views: true,
      trophies: true,
      activity: false,
    },
    ui: {
      tab: 'preview',
      theme: null,
      collapsed: {},
    },
  };

  function defaults() {
    return {
      version: 1,
      personal: {
        name: '',
        role: '',
        location: '',
        bio: '',
        currentWork: '',
        learning: '',
        funFact: '',
      },
      social: {
        github: '',
        linkedin: '',
        twitter: '',
        portfolio: '',
        devto: '',
        medium: '',
        hashnode: '',
      },
      tech: {
        languages: [],
        frameworks: [],
        databases: [],
        devops: [],
        tools: [],
        custom: [],
      },
      widgets: {
        theme: 'tokyonight',
        stats: true,
        streak: true,
        topLangs: true,
        views: true,
        trophies: false,
        activity: false,
      },
      ui: {
        tab: 'preview',
        theme: null,
        collapsed: {},
      },
    };
  }

  const isPlainObject = (value) =>
    value !== null && typeof value === 'object' && !Array.isArray(value);

  function deepMerge(base, patch) {
    if (!isPlainObject(patch)) return base;
    const out = Array.isArray(base) ? [...base] : { ...base };
    Object.keys(patch).forEach((key) => {
      const baseValue = base ? base[key] : undefined;
      const patchValue = patch[key];
      if (isPlainObject(baseValue) && isPlainObject(patchValue)) {
        out[key] = deepMerge(baseValue, patchValue);
      } else if (Array.isArray(patchValue)) {
        out[key] = [...patchValue];
      } else if (patchValue !== undefined) {
        out[key] = patchValue;
      }
    });
    return out;
  }

  function sanitize(state) {
    if (!state.personal) state.personal = {};
    if (!state.social) state.social = {};
    if (!state.widgets) state.widgets = {};
    if (!state.ui) state.ui = {};

    const personalKeys = ['name', 'role', 'location', 'bio', 'currentWork', 'learning', 'funFact'];
    personalKeys.forEach((key) => {
      state.personal[key] =
        typeof state.personal[key] === 'string' ? state.personal[key].slice(0, 1200) : '';
    });
    const socialKeys = ['github', 'linkedin', 'twitter', 'portfolio', 'devto', 'medium', 'hashnode'];
    socialKeys.forEach((key) => {
      state.social[key] = typeof state.social[key] === 'string' ? state.social[key].slice(0, 300) : '';
    });

    const techKeys = ['languages', 'frameworks', 'databases', 'devops', 'tools'];
    techKeys.forEach((key) => {
      const value = state.tech && state.tech[key];
      state.tech[key] = Array.isArray(value)
        ? [...new Set(value.filter((item) => typeof item === 'string'))]
        : [];
    });
    const custom = state.tech && state.tech.custom;
    state.tech.custom = Array.isArray(custom)
      ? custom
          .filter((item) => item && typeof item.label === 'string' && item.label.trim())
          .slice(0, 24)
          .map((item, index) => ({
            id:
              String(item.id || '')
                .replace(/[^a-zA-Z0-9_-]/g, '')
                .slice(0, 40) || `custom-${index}-${Date.now()}`,
            label: item.label.trim().slice(0, 40),
            color: String(item.color || '#6366F1').slice(0, 9),
            logo: String(item.logo || '').replace(/[^a-z0-9]/gi, '').slice(0, 40),
          }))
      : [];
    ['stats', 'streak', 'topLangs', 'views', 'trophies', 'activity'].forEach((key) => {
      state.widgets[key] = Boolean(state.widgets[key]);
    });
    if (!['tokyonight', 'radical', 'dracula', 'dark', 'default'].includes(state.widgets.theme)) {
      state.widgets.theme = 'tokyonight';
    }
    if (!['light', 'dark'].includes(state.ui.theme)) state.ui.theme = null;
    if (!state.ui.collapsed || typeof state.ui.collapsed !== 'object') state.ui.collapsed = {};
    if (!['preview', 'markdown'].includes(state.ui.tab)) state.ui.tab = 'preview';
    return state;
  }

  function load() {
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaults();
      const parsed = JSON.parse(raw);
      return sanitize(deepMerge(defaults(), parsed));
    } catch {
      return defaults();
    }
  }

  let state = load();
  let saveTimer = 0;

  function saveNow() {
    window.clearTimeout(saveTimer);
    saveTimer = 0;
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      document.dispatchEvent(new CustomEvent('rf:saved'));
    } catch {
      /* Storage may be unavailable (private mode / quota). */
    }
  }

  function save() {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveNow, 320);
  }

  RF.store = {
    key: STORAGE_KEY,
    defaults,
    sample: () => JSON.parse(JSON.stringify(SAMPLE)),
    getState: () => state,
    save,
    saveNow,
    replace(next) {
      state = sanitize(deepMerge(defaults(), next || {}));
      saveNow();
      return state;
    },
    reset() {
      const theme = state.ui && state.ui.theme;
      state = defaults();
      state.ui.theme = theme;
      saveNow();
      return state;
    },
  };
})(window);
