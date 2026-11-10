/* Markdown compiler + Shields.io badge helpers. */
(function (global) {
  'use strict';

  const RF = (global.RF = global.RF || {});

  const esc = (value) => RF.ui.escapeHtml(value);
  const mdText = (value) =>
    String(value ?? '')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const oneLine = (value) =>
    String(value ?? '')
      .replace(/\r?\n+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

  function cleanColor(color) {
    const raw = String(color || '').replace('#', '').trim();
    if (/^[0-9a-f]{3}$/i.test(raw)) {
      return raw
        .split('')
        .map((ch) => ch + ch)
        .join('');
    }
    return /^[0-9a-f]{6}$/i.test(raw) ? raw : '6366F1';
  }

  function logoColorFor(color) {
    const hex = cleanColor(color);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.62 ? 'black' : 'white';
  }

  function encodeBadgeLabel(label) {
    const prepared = String(label || 'Badge')
      .trim()
      .replace(/-/g, '--')
      .replace(/_/g, '__')
      .replace(/\s+/g, '_');
    return encodeURIComponent(prepared);
  }

  function badgeUrl(item) {
    const color = cleanColor(item.color);
    let url = `https://img.shields.io/badge/${encodeBadgeLabel(item.label)}-${color}?style=for-the-badge`;
    if (item.logo) {
      url += `&logo=${encodeURIComponent(item.logo)}&logoColor=${logoColorFor(color)}`;
    }
    return url;
  }

  function badgeImg(item, alt) {
    return `<img src="${esc(badgeUrl(item))}" alt="${esc(alt || item.label)}" />`;
  }

  function selectedTech(state) {
    const groups = [];
    RF.techCatalog.categories.forEach((category) => {
      const chosen = (state.tech[category.id] || [])
        .map((id) => RF.techCatalog.get(category.id, id))
        .filter(Boolean);
      if (chosen.length) {
        groups.push({ id: category.id, label: category.label, items: chosen });
      }
    });
    const custom = (state.tech.custom || []).map((item) => ({
      label: item.label,
      color: item.color,
      logo: item.logo,
    }));
    if (custom.length) {
      groups.push({ id: 'custom', label: 'Other', items: custom });
    }
    return groups;
  }

  function topSkills(state, limit = 4) {
    return selectedTech(state)
      .flatMap((group) => group.items)
      .map((item) => item.label)
      .slice(0, limit);
  }

  function listSentence(items) {
    if (!items.length) return '';
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
  }

  const ACTIVITY_THEMES = {
    tokyonight: 'tokyo-night',
    radical: 'react-dark',
    dracula: 'dracula',
    dark: 'github-compact',
    default: 'github',
  };

  function widgetUrls(state, username) {
    const theme = state.widgets.theme || 'tokyonight';
    const user = encodeURIComponent(username);
    return {
      stats: `https://github-readme-stats.vercel.app/api?username=${user}&show_icons=true&theme=${theme}&hide_border=true&include_all_commits=true&count_private=true`,
      streak: `https://streak-stats.demolab.com?user=${user}&theme=${theme}&hide_border=true`,
      topLangs: `https://github-readme-stats.vercel.app/api/top-langs/?username=${user}&layout=compact&theme=${theme}&hide_border=true&langs_count=8`,
      trophies: `https://github-profile-trophy.vercel.app/?username=${user}&theme=${theme}&no-frame=true&no-bg=true&margin-w=4&row=1&column=7`,
      activity: `https://github-readme-activity-graph.vercel.app/graph?username=${user}&theme=${
        ACTIVITY_THEMES[theme] || 'tokyo-night'
      }&hide_border=true&area=true`,
      views: `https://komarev.com/ghpvc/?username=${user}&label=Profile%20views&color=6366f1&style=flat-square`,
    };
  }

  function hasContent(state) {
    const p = state.personal || {};
    const social = state.social || {};
    const hasPersonal = ['name', 'role', 'location', 'bio', 'currentWork', 'learning', 'funFact'].some(
      (key) => String(p[key] || '').trim()
    );
    const hasSocial = Object.values(social).some((value) => String(value || '').trim());
    const hasTech =
      RF.techCatalog.categories.some((category) => (state.tech[category.id] || []).length > 0) ||
      (state.tech.custom || []).length > 0;
    return hasPersonal || hasSocial || hasTech;
  }

  function build(state) {
    if (!hasContent(state)) return '';

    const p = state.personal || {};
    const social = RF.urls.socialLinks(state.social || {});
    const username = RF.urls.github((state.social || {}).github);
    const widgets = state.widgets || {};
    const groups = selectedTech(state);
    const blocks = [];

    /* ---------------------------------------------------------------- header */
    const header = [];
    const name = oneLine(p.name);
    header.push(
      name
        ? `<h1 align="center">Hi 👋, I'm ${mdText(name)}</h1>`
        : `<h1 align="center">Hi there 👋</h1>`
    );

    const role = oneLine(p.role);
    const location = oneLine(p.location);
    if (role || location) {
      header.push(
        `<h3 align="center">${role ? mdText(role) : ''}${
          role && location ? ' &nbsp;·&nbsp; ' : ''
        }${location ? `📍 ${mdText(location)}` : ''}</h3>`
      );
    }

    if (oneLine(p.bio)) {
      const bio = mdText(String(p.bio).trim()).replace(/\r?\n/g, '<br/>');
      header.push(`<p align="center"><em>${bio}</em></p>`);
    }

    if (social.length) {
      const badges = social
        .map(
          (link) =>
            `<a href="${esc(link.url)}" target="_blank" rel="noreferrer"><img src="${esc(
              badgeUrl(link)
            )}" alt="${esc(link.alt)}" /></a>`
        )
        .join('\n  ');
      header.push(`<p align="center">\n  ${badges}\n</p>`);
    }

    if (username && widgets.views) {
      header.push(
        `<p align="center">\n  <img src="${esc(
          widgetUrls(state, username).views
        )}" alt="Profile views" />\n</p>`
      );
    }

    if (header.length) blocks.push(header.join('\n\n'));

    /* -------------------------------------------------------------- about me */
    const about = [];
    if (oneLine(p.currentWork)) {
      about.push(`- 🔭 I'm currently working on **${mdText(oneLine(p.currentWork))}**`);
    }
    if (oneLine(p.learning)) {
      about.push(`- 🌱 I'm currently learning **${mdText(oneLine(p.learning))}**`);
    }
    const skills = topSkills(state, 3);
    if (skills.length) {
      about.push(`- 💬 Ask me about **${mdText(listSentence(skills))}**`);
    }
    if (oneLine(p.funFact)) {
      about.push(`- ⚡ Fun fact: ${mdText(oneLine(p.funFact))}`);
    }
    if (oneLine(state.social.portfolio)) {
      const web = RF.urls.portfolio(state.social.portfolio);
      about.push(`- 🌐 Explore my work at **[${mdText(RF.urls.domain(web))}](${esc(web)})**`);
    } else if (username) {
      about.push(`- 📫 Reach me on **[GitHub](https://github.com/${esc(username)})**`);
    }
    if (about.length) {
      blocks.push(`## 🚀 About Me\n\n${about.join('\n')}`);
    }

    /* ------------------------------------------------------------- tech stack */
    if (groups.length) {
      const techBlocks = groups.map((group) => {
        const badges = group.items.map((item) => `  ${badgeImg(item)}`).join('\n');
        return `### ${group.label}\n<p align="left">\n${badges}\n</p>`;
      });
      blocks.push(`## 🛠️ Tech Stack\n\n${techBlocks.join('\n\n')}`);
    }

    /* ------------------------------------------------------- github analytics */
    if (username) {
      const urls = widgetUrls(state, username);
      const analytics = [];

      if (widgets.stats) {
        analytics.push(
          `<p align="center">\n  <img src="${esc(
            urls.stats
          )}" alt="GitHub stats" />\n</p>`
        );
      }
      if (widgets.streak) {
        analytics.push(
          `<p align="center">\n  <img src="${esc(
            urls.streak
          )}" alt="GitHub streak" />\n</p>`
        );
      }
      if (widgets.topLangs) {
        analytics.push(
          `<p align="center">\n  <img src="${esc(
            urls.topLangs
          )}" alt="Top languages" />\n</p>`
        );
      }
      if (widgets.trophies) {
        analytics.push(
          `<p align="center">\n  <img src="${esc(
            urls.trophies
          )}" alt="GitHub trophies" />\n</p>`
        );
      }
      if (widgets.activity) {
        analytics.push(
          `<p align="center">\n  <img src="${esc(
            urls.activity
          )}" alt="Contribution activity graph" />\n</p>`
        );
      }

      if (analytics.length) {
        blocks.push(`## 📊 GitHub Analytics\n\n${analytics.join('\n\n')}`);
      }
    }

    /* ------------------------------------------------------------------ footer */
    blocks.push(
      `---\n\n<p align="center">\n  <i>Thanks for stopping by — let's build something great together. 🚀</i>\n</p>\n\n<!-- Generated with README Forge -->`
    );

    return blocks.join('\n\n') + '\n';
  }

  RF.markdown = {
    build,
    hasContent,
    badgeUrl,
    badgeImg,
    cleanColor,
    logoColorFor,
    selectedTech,
    topSkills,
    listSentence,
    widgetUrls,
    activityThemes: ACTIVITY_THEMES,
  };
})(window);
