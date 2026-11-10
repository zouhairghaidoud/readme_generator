# README Forge

A local-first, single-page builder for **GitHub profile READMEs**. Fill in a form, watch the Markdown compile live, and copy or download a polished `README.md` — complete with Shields.io badges, GitHub stats widgets, and AI-written bios.

No account, no backend, no build step. Everything runs in your browser.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)

---

## Features

- **Live dual view** — sanitized GitHub-style preview and raw Markdown, side by side with your form on desktop.
- **Guided form** — collapsible sections for personal details, tech stack, social links, and analytics widgets.
- **137 tech badges** — curated catalogue across languages, frameworks, databases, DevOps/cloud, and tools, plus unlimited custom Shields.io badges.
- **Social badges** — GitHub, LinkedIn, X/Twitter, portfolio, Dev.to, Medium, and Hashnode, with automatic handle-to-URL normalization.
- **GitHub widgets** — stats, streak, top languages, profile views, trophies, and contribution activity graph.
- **AI bio generator** — three distinct drafts (Professional, Creative, Concise) through any OpenAI-compatible API, with an offline template fallback.
- **Copy & download** — one-click clipboard copy with "Copied!" feedback, or download `README.md` directly.
- **Light / dark themes** — slate + indigo/emerald dark palette, with a full light theme.
- **Auto-save** — every field, badge, widget, and preference is persisted to `localStorage`.
- **Import / export** — back up your profile as JSON and restore it later.
- **Sample profile** — load a complete example in one click to explore the app.

## Quick start

The app is fully static.

```bash
# Option 1 — open it directly
start index.html        # Windows
open index.html         # macOS
xdg-open index.html     # Linux

# Option 2 — serve it locally (recommended)
python -m http.server 8123
# then visit http://localhost:8123/
```

> A local server is recommended because some browsers restrict clipboard access on `file://` pages. The clipboard fallback still works, but the native path is smoother over HTTP.

There is nothing to install and nothing to build.

## Usage

1. **Personal details** — name, role, location, tagline, current work, learning goals, and a fun fact.
2. **Tech stack** — search or browse the catalogue and click chips to toggle badges. Use **Add badge** for anything not in the catalogue.
3. **Social links** — paste a full URL or just a handle; labels and badge links are generated for you.
4. **Widgets** — enable the GitHub cards you want. Widgets require a GitHub username and are omitted without one.
5. **AI bio** *(optional)* — open **AI settings**, pick a provider, and generate. You can insert any draft into the Bio field.
6. **Export** — copy the Markdown or download `README.md`, then paste it into a repository named exactly like your GitHub username.

On smaller screens, use **Edit** in the preview toolbar to jump back to the form after checking the preview.

Each section can be collapsed with its header (**Hide** / **Show**). If any section is collapsed, an **Expand all sections** link appears above the form.

### Publish your profile README

1. Create a public repository named `<your-username>` (for example, `octocat/octocat`).
2. Add the generated `README.md` at the repository root.
3. GitHub renders it at the top of your profile.

## AI bio setup

The generator talks directly to any endpoint that implements the OpenAI **chat completions** API. Open **AI settings** and choose a preset:

| Preset | Default endpoint | Default model |
| --- | --- | --- |
| OpenAI | `https://api.openai.com/v1/chat/completions` | `gpt-4o-mini` |
| OpenRouter | `https://openrouter.ai/api/v1/chat/completions` | `openai/gpt-4o-mini` |
| Groq | `https://api.groq.com/openai/v1/chat/completions` | `llama-3.3-70b-versatile` |
| Ollama | `http://localhost:11434/v1/chat/completions` | `llama3.2` |
| Custom | Any OpenAI-compatible URL | Any model ID |

Endpoint and model are editable, so LM Studio, vLLM, llama.cpp, and other compatible servers work too.

**No API key?** The **Generate AI Bio** button still produces three solid drafts from your profile using local templates. They are clearly labeled as local drafts and never leave your browser.

### Privacy and key storage

- Your API key is stored in `localStorage` under `readme-forge:ai` and is sent **only** to the endpoint you configure.
- The app has no server, analytics, or telemetry.
- Use a scoped or disposable key, and press **Clear stored key** when you are done on a shared machine.
- Some local servers (Ollama, LM Studio) need CORS origins enabled before browser requests succeed.

## Project structure

```
readme_generator/
├─ index.html                 # Markup, dialogs, icon sprite, CDN includes
├─ README.md
└─ assets/
   ├─ css/
   │  └─ styles.css           # Theme tokens, components, preview styles
   └─ js/
      ├─ ui.js                # Toasts, dialogs, confirmations, escaping
      ├─ store.js             # Defaults, sample profile, merge/sanitize, persistence
      ├─ urls.js              # Social handle/URL normalization
      ├─ tech-catalog.js      # Curated Shields.io badge catalogue
      ├─ markdown.js          # README compiler and widget URLs
      ├─ tech.js              # Tech chips, search, custom badge dialog
      ├─ preview.js           # Safe Markdown rendering and output stats
      ├─ ai.js                # AI client, presets, offline drafts
      └─ app.js               # Bootstrap, form sync, actions, theme
```

Scripts are classic IIFEs attached to a single `window.RF` namespace, loaded in dependency order at the end of `index.html`. This keeps the app working from `file://` without a bundler or module server.

## How it works

1. `store.js` holds a single state object and mirrors it into `localStorage` (debounced, with a final save on `beforeunload`).
2. Form inputs and widget switches update that state and broadcast an `rf:changed` event.
3. `markdown.js` builds the README string from state; `preview.js` renders it with **Marked** and sanitizes it with **DOMPurify**.
4. The raw tab shows the exact text that will be copied or downloaded.

### State shape (abridged)

```json
{
  "personal": { "name": "", "role": "", "location": "", "bio": "", "currentWork": "", "learning": "", "funFact": "" },
  "tech": { "languages": [], "frameworks": [], "databases": [], "devops": [], "tools": [], "custom": [] },
  "social": { "github": "", "linkedin": "", "twitter": "", "portfolio": "", "devto": "", "medium": "", "hashnode": "" },
  "widgets": { "stats": true, "streak": true, "topLangs": true, "views": true, "trophies": false, "activity": false },
  "ui": { "theme": "dark", "collapsed": {} }
}
```

Export JSON produces this structure; import merges and sanitizes it, so older or hand-edited files are safe to load.

## External services

The preview and generated Markdown reference community-run image services:

- [Shields.io](https://shields.io/) — badges
- [github-readme-stats](https://github.com/anuraghazra/github-readme-stats) — stats and top languages
- [Streak Stats](https://github.com/DenverCoder1/github-readme-streak-stats) — streak card
- [GitHub Profile Trophy](https://github.com/ryo-ma/github-profile-trophy) — trophies
- [GitHub Readme Activity Graph](https://github.com/Ashutosh00710/github-readme-activity-graph) — contribution graph
- [Komarev Profile Views](https://github.com/antonkomarev/github-profile-views-counter) — visitor counter

These are third-party services and can occasionally rate-limit or return errors. Your README is still valid; the cards simply render once the services respond.

## Tech notes

- **Tailwind CSS** via the Play CDN, with a small custom layer in `styles.css` for themed components and Markdown styling.
- **Marked** for Markdown parsing and **DOMPurify** for sanitization before preview.
- **Inter** and **JetBrains Mono** from Google Fonts.
- No framework, no bundler, no node_modules.

Because the CDN dependencies are loaded over the network, a fully offline session needs those scripts vendored locally. The Markdown compiler and form still run without them, but preview rendering depends on Marked and DOMPurify.

## Browser support

Current versions of Chrome, Edge, Firefox, and Safari. The app uses native `<dialog>`, CSS custom properties, `localStorage`, and the Clipboard API with an `execCommand` fallback.

## Customization

- **Colors and components** — design tokens live at the top of `assets/css/styles.css`.
- **Tech catalogue** — add entries to `assets/js/tech-catalog.js` (`id`, `label`, `color`, optional `logo`).
- **Widget URLs** — adjust themes, layouts, and card options in `widgetUrls()` inside `assets/js/markdown.js`.
- **AI presets** — extend the `PRESETS` map in `assets/js/ai.js`.

## License

This project is provided as-is for personal and commercial use. The bundled third-party libraries and badge services retain their own licenses.
