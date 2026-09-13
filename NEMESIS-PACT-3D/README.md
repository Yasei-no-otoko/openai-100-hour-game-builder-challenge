# BLAST BUSTER: NEMESIS PACT — 3D v0.3.6.1

English / portrait touch and desktop / offline runtime / black-screen hotfix.

## Play

Open `dist/NEMESIS-PACT.html` in a compatible desktop browser, or use the separately
supplied `NEMESIS-PACT-3D-EN-v0.3.6.1.html`. Runtime assets and code are embedded;
no API key, external engine, model or asset download is required.

For a local server (Node.js 18+):

```sh
npm start
# Phone on the same trusted local network:
npm run start:lan
```

WebGPU requires a supported secure context. A phone using a plain LAN HTTP URL
normally uses WebGL2. Runtime status is shown in Settings as `0.3.6.1 / <backend>`.
The renderer also accepts `?renderer=webgl2` or `?renderer=webgpu`; unsupported
WebGPU falls back to WebGL2, then Canvas 2D. The status, not the query, identifies
the backend actually in use.

## What was wrong, and what changed

v0.3.6 passed JavaScript/logic tests but had rendering bugs those tests did not
exercise. Its WebGPU vertex shader emitted a negative normalized Z for aircraft,
so they were clipped despite a successfully created render pipeline. Its shadow
heuristic also classified the ground as shadow, multiplying the entire floor
color by 0.12. Fog then washed out the remaining lit materials.

v0.3.6.1 fixes the actual renderer, not the user's monitor brightness:

- Shared normalized depth calculation; WebGPU uses 0..1 and WebGL2 uses the
  corresponding -1..1 conversion.
- Separated, nonoverlapping flight/scenery depth bands. Even the tallest scenery
  cannot overwrite player/enemy/boss pixels. X/Y controls and hitboxes are unchanged.
- Explicit negative shadow-material tag instead of a numeric threshold that also
  matched floor tiles. Shadow silhouettes are placed above the floor surface.
- Rebalanced ambient fill; fog is limited to scenery and capped, leaving craft
  crisp. Small emissive highlights and bloom remain available.
- Binary foreground mask for shockwave/chromatic offsets, with protection at
  each resampled location. Graphics OFF does not disable essential tone mapping.
- Settings are scrollable at desktop size and fit 320px portrait viewports.
- Background timing freezes with the simulation during pause. Existing effect
  settings and saved scores retain their original storage keys.

## Preserved features

Three sectors with seed-dependent architecture and stage-specific ambient colors;
boss-specific background motifs; animated rings/pillars/light routes; procedural
3D meshes, metalness/roughness/GGX shading, emissive surfaces; WebGL2 raster bloom
and tone mapping; WebGPU compute bloom and compositing. Settings retain independent
Post FX, Bloom and Background Animation OFF / STANDARD / HIGH values.

Controls: WASD/arrows move, mouse + left-click aim/fire, J automatic aim/fire,
E/right-click parry, Space/Shift dash, F Nova, Q break pact, Escape pause.
Touch: slide to move; automatic aim/fire; independent PARRY, DASH and NOVA buttons.

## Verification

```sh
npm run build
npm run check
npm test
npm run test:simulation
npm run test:portrait
# Test-only Python/Playwright/Chromium; this Linux image needs an X server:
xvfb-run -a npm run test:gpu
```

76 Node tests passed, including 4,438,944 transformed-vertex checks over the
specified scene fixtures. Actual WebGL2 raster/fragment/post processing was tested
with Chromium 144 + ANGLE/SwiftShader at 1280x800, 390x844 and 320x568. The pixel
regressions verify lit floor output and unchanged aircraft masks when a tall tower
is added. All 9 desktop and 27 portrait bot campaigns completed.

**Native WebGPU WGSL/compute execution, physical GPU/browser performance,
physical phones and Safari have not been verified for this hotfix.** WebGPU depth
math and emitted-vertex ranges are verified, which is not equivalent to native
execution. See `docs/VALIDATION.md` for the exact scope. No FPS target is claimed.

Current evidence: `docs/hotfix-0.3.6.1/`. Historical evidence: `docs/history/`.
The original v0.3.6 HTML/ZIP was the input; this is not a reconstruction from an
older unrelated source. No GitHub push was performed.
