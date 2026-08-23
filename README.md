# Rummikub Score

Scoreboard and turn timer for Rummikub. A static, client-side PWA: no backend, all data lives in the browser's `localStorage`.

**Live app:** https://grabtom.github.io/rummikub-score/

## Features

- **Scoreboard** – run many games at once, 2–6 players, standard Rummikub scoring (enter tiles left in hand; the winner scores the sum). Swipe a game left to archive, export or delete it; start and last-edit timestamps are kept. Tap a round row to edit or delete it. Export copies a share link to the clipboard.
- **Timer** – floating button on every screen, 30–120 s (default 60 s), warning beep at 15 s and "pi – pi – piiii" for the last 3 seconds.
- **Export / import** – share all games or a single game as a long URL. Opening the link on another device lets you pick which games to merge into local storage (newer copy wins).
- **Settings** – language (auto-detected from the device, override to EN/PL) and colour theme (light, dark, paper, ocean, forest, midnight, or follow system).
- **PWA** – installable on a phone, works offline.

## Project layout

```
index.html            app shell
manifest.webmanifest  PWA manifest
sw.js                 service worker (app-shell cache)
css/style.css
js/app.js             hash router + bootstrap
js/storage.js         localStorage database
js/share.js           URL export/import codec
js/timer.js           countdown logic + audio cues
js/timer-ui.js        floating button + dialog
js/util.js            helpers, scoring
js/i18n.js            translations, language detection
js/settings-ui.js     settings dialog, theme switching
js/swipe.js           swipe-to-reveal row actions
js/views/*.js         one file per screen
test.mjs              self-check (node test.mjs)
```

No build step, no dependencies. Plain ES modules.

## Run locally

Any static server, e.g. `python3 -m http.server` then open http://localhost:8000.

## Deploy to GitHub Pages

1. Push to GitHub.
2. Settings → Pages → Source: *GitHub Actions*. `.github/workflows/pages.yml` then deploys every push to `main` (after running `node test.mjs`).
3. Open `https://<user>.github.io/<repo>/`. On a phone use "Add to Home Screen" to install.

Bump `CACHE` in `sw.js` when deploying changes so installed clients refresh.

Alternatives that work equally well with zero config: Cloudflare Pages, Netlify Drop, Vercel.

## Data

Single `localStorage` key `rummikub-score`:

```
{ version, games: { [id]: { id, players, rounds, createdAt, updatedAt, archived } }, settings: { timerSeconds, lang, theme } }
```

`rounds` is an array of per-player score arrays. Export URLs carry `#import=<base64url(deflate-raw(json))>`.
