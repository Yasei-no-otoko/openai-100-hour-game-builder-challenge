# 0.3.6.1 — 2026-09-12

Black-screen hotfix, based directly on the received v0.3.6 source.

- Fix WebGPU near-plane clipping of aircraft/architecture by using valid normalized Z.
- Separate scenery and aircraft depth bands; towers cannot overwrite aircraft.
- Fix floor being classified and shaded as shadow; explicitly tag shadow silhouettes.
- Restore readable ambient lighting and keep excessive haze off aircraft.
- Protect every post-process resample with a binary foreground mask.
- Keep essential tone mapping independent of the optional Post FX setting.
- Constrain the enlarged settings panel on desktop/narrow portrait screens.
- Freeze background animation with paused simulation and honor static ambience.
- Add emitted-vertex and actual-framebuffer regression tests; archive old evidence.

The four-component version is the requested game build identifier, not an npm
registry release. There are no npm runtime dependencies to resolve.
