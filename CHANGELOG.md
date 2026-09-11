# Changelog

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
