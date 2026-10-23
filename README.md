# iPod

US/JP catalogs and interface languages. Switching regions stops playback;
device settings stay shared.

Native browser modules. Bun builds `dist/`; GitHub Pages deploys from `main`.

- `src/app.js`, `src/style.css` — page and region buttons.
- `src/data/`, `src/locales/`, `src/assets/` — catalogs, labels, media.
- `src/vendor/ipod.js` — adapted Apple component.
- `scripts/` — server, build, offline worker.

Menus, settings, and Brick work offline. Reloading offline requires an initial
cached visit over HTTPS or localhost. Only song previews need internet;
the offline screen appears on playback attempts.

# Sources

Extracted 2026-10-23 from Apple Music:

- [US](https://music.apple.com/us/ipod)
- [JP](https://music.apple.com/jp/ipod)

[upstream.json](upstream.json) records original URLs and checksums.
Code, assets, and catalogs come from Apple. No redistribution license was
included; this project grants no new rights to that material.

Local changes to `src/vendor/ipod.js`:

- Local catalogs via `data.js`; media moved to `src/assets/`.
- `allowPreview` / `playbackAllowed`: offline gate only for song playback.
- `Lt`: dismiss gate and return; `resetOfflineScreen`: reset on region switch.
