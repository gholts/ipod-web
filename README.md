# iPod

US/JP catalogs and interface languages. Switching regions stops playback;
device settings stay shared.

TypeScript source. Bun checks types and builds `dist/`; GitHub Pages deploys from `main`.

- `src/app.ts`, `src/style.css` — page and region buttons.
- `src/data/`, `src/locales/`, `src/assets/` — catalogs, labels, media.
- `src/vendor/` — typed device logic, component views, and rendering runtime.
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

Local changes:

- Local catalogs via `data.ts`; media moved to `src/assets/`.
- Offline gate only for song playback; MENU returns to browsing.
- Named modules and typed component boundaries.
