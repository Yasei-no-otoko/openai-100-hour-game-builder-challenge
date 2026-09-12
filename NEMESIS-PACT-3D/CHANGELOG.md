# 0.3.2 — 2026-09-12

Reconstructed missing 3D delivery from the retained English v0.2.1 source. Added native WebGL2 and WebGPU backends, procedural 3D meshes, metallic/emissive materials, bloom, background-masked shockwave and WebGPU compute composite. Preserved 2D game mechanics and touch/audio source. This is not identical to the missing original v0.3.0.

---

# Changelog

## 0.2.1-en — English edition

- Localized static UI, dynamic HUD, both tutorials, all seven pacts, thirteen upgrade options, boss dialogue, sectors, confirmations, endings, errors and accessible labels.
- Declared the English document language and unified PARRY / DASH / NOVA terminology.
- Added compact English HUD summaries, distinct card categories, one-time-upgrade wording and English-specific wrapping styles.
- Clarified that hull and existing builds can affect seeded upgrade offers.
- Preserved gameplay IDs, saved-state keys, all combat formulas, touch input and synthesized audio.
- Added eight localization unit checks, including baseline mechanics/source hashes.
- Added 308 browser text-layout checks over six portrait viewports, one touch-landscape viewport and two desktop viewports, plus touch-tutorial and fallback checks.
- Re-ran mobile/desktop regressions and all 36 legal-input campaign simulations on the English build.
- Supplied English README, localization notes, mobile/game design notes and current test evidence.

This is a standalone English build, not a language-switch feature or a GitHub push. Physical-phone/Safari checks remain pending.

## 0.2.0 — Portrait / touch edition

- Unscaled responsive DOM: full-height portrait menu, vertically stacked contracts and upgrades, scrollable settings/help/results.
- Dedicated HUD / playable arena / thumb-control deck. Major controls have 44 CSS px or larger touch areas.
- Multi-pointer relative movement with capture and independent action ownership. Automatic aim and fire in touch layout.
- One-shot parry, dash, and nova action buttons with cooldown/energy indicators. Stationary dash follows the last movement direction.
- Left-handed control layout and sensitivity setting.
- Card selection followed by explicit confirmation; contract breach and quit moved behind paused confirmation screens.
- Touch-specific interactive training and help. Automatic pause and input release on orientation changes, focus loss, and visibility loss.
- `100dvh`, safe-area insets, responsive canvas resizing, uniform fit, immutable per-run geometry.
- Portrait spawn positions, boss motion limits, and modest portrait movement/projectile-speed adjustment.
- Optional `npm run start:lan` for testing the HTML from a phone on a trusted local network.
- 46 unit tests, 6 portrait viewport cases, 21 mobile browser checks, 27 portrait simulation runs.
- Desktop keyboard/mouse path and existing game content retained.

This version is a local source/bundle delivery, not a GitHub push or a native mobile app release.
