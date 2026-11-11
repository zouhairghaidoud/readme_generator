/* Application state: defaults, persistence, sample profile. */
(function (global) {
  'use strict';

  const RF = (global.RF = global.RF || {});
  const STORAGE_KEY = 'readme-forge:v2';

  const SAMPLE = {
    personal: {
      name: 'Alex Moreau',
      role: 'Full-Stack Developer',
      location: 'Lyon, France',
      bio: 'I build fast, accessible web apps with a soft spot for clean APIs and thoughtful interfaces.',
      currentWork: 'a SaaS analytics platform built with Laravel and Vue',
      learning: 'Rust and event-driven architecture',
      funFact: 'I automate everything — including my morning coffee machine',
      askAbout: '',
    },
    social: {
      github: 'alexmoreau',
      linkedin: 'alexmoreau',
      twitter: 'alexmoreau_dev',
      portfolio: 'alexmoreau.dev',
      devto: 'alexmoreau',
      medium: '',
      hashnode: '',
      email: '',
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

  /* Pre-filled profile. Shown on first load and after importing nothing. */
  const PROFILE = {
    version: 4,
    personal: {
      name: 'Zouhair GHAIDOUD',
      role: 'Web Developer',
      location: 'Morocco',
      bio: 'A passionate web developer from Morocco.',
      currentWork: '',
      learning: '',
      funFact: '',
      askAbout: 'PHP, Laravel, JavaScript',
    },
    social: {
      github: 'zouhairghaidoud',
      linkedin: 'zouhair-ghaidoud',
      twitter: '',
      portfolio: '',
      devto: 'zouhairghaidoud',
      medium: '',
      hashnode: '',
      email: 'zouhairghaidoud185@gmail.com',
    },
    tech: {
      languages: ['javascript', 'php', 'html5', 'css3', 'dart', 'uml'],
      frameworks: ['laravel', 'inertia', 'vue', 'tailwindcss', 'bootstrap', 'flutter', 'chartjs'],
      databases: ['mysql', 'postgresql', 'sqlite'],
      devops: [],
      tools: ['git', 'vscode', 'gemini', 'postman'],
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

  function emptyState() {
    return {
      version: 4,
      personal: {
        name: '',
        role: '',
        location: '',
        bio: '',
        currentWork: '',
        learning: '',
        funFact: '',
        askAbout: '',
      },
      social: {
        github: '',
        linkedin: '',
        twitter: '',
        portfolio: '',
        devto: '',
        medium: '',
        hashnode: '',
        email: '',
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

  function defaults() {
    return JSON.parse(JSON.stringify(PROFILE));
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

    const personalKeys = ['name', 'role', 'location', 'bio', 'currentWork', 'learning', 'funFact', 'askAbout'];
    personalKeys.forEach((key) => {
      state.personal[key] =
        typeof state.personal[key] === 'string' ? state.personal[key].slice(0, 1200) : '';
    });
    const socialKeys = ['github', 'linkedin', 'twitter', 'portfolio', 'devto', 'medium', 'hashnode', 'email'];
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

  /* Keep saved profiles in sync with catalogue/default changes. */
  function migrate(state, fromVersion) {
    if (fromVersion < 3) {
      const frameworks = Array.isArray(state.tech.frameworks) ? state.tech.frameworks : [];
      if (!frameworks.includes('inertia')) {
        const laravel = frameworks.indexOf('laravel');
        frameworks.splice(laravel === -1 ? frameworks.length : laravel + 1, 0, 'inertia');
      }
      state.tech.frameworks = frameworks;
    }
    if (fromVersion < 4) {
      const languages = Array.isArray(state.tech.languages) ? state.tech.languages : [];
      if (!languages.includes('uml')) languages.push('uml');
      state.tech.languages = languages;

      const tools = Array.isArray(state.tech.tools) ? state.tech.tools : [];
      if (!tools.includes('vscode')) {
        const git = tools.indexOf('git');
        tools.splice(git === -1 ? tools.length : git + 1, 0, 'vscode');
      }
      if (!tools.includes('gemini')) {
        const vscode = tools.indexOf('vscode');
        tools.splice(vscode === -1 ? tools.length : vscode + 1, 0, 'gemini');
      }
      state.tech.tools = tools;
    }
    state.version = PROFILE.version;
    return state;
  }

  function load() {
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaults();
      const parsed = JSON.parse(raw);
      const version = Number(parsed.version) || 1;
      return migrate(sanitize(deepMerge(defaults(), parsed)), version);
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
    empty: emptyState,
    reset() {
      const theme = state.ui && state.ui.theme;
      state = emptyState();
      state.ui.theme = theme;
      saveNow();
      return state;
    },
  };
})(window);
