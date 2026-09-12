# BLAST BUSTER: NEMESIS PACT — 3D recovery build

**Build: 0.3.0-recovery.1 · English · portrait touch + desktop · offline runtime**

## Why this build exists

The previously linked v0.3.0 HTML and ZIP were not present in the delivery filesystem. This is a newly reconstructed 3D build based on the preserved v0.2.1 English source, **not a bit-identical recovery of the missing v0.3.0 source**. The original v0.3.0 screenshots are not evidence for this build. Current screenshots and test results are under `docs/recovery-*`.

The 2D simulation is unchanged except for its report version. `src/touch.js` and `src/audio.js` are byte-identical to the preserved baseline. Renderer changes are confined to presentation, a read-only mesh scene builder, and visual event forwarding.

## Play

Open `dist/NEMESIS-PACT.html` in a browser, or use the separately delivered standalone HTML. No package installation, API key, model, downloaded texture, external font, or server-side game service is needed by the runtime.

For local development or testing, Node.js 18+ is sufficient:

```sh
npm start
```

Open the local URL printed by the server. `npm run start:lan` explicitly enables serving to other devices on a trusted local network. The server is otherwise bound to loopback. WebGPU generally needs a secure context: use localhost on the computer, or an HTTPS-hosted copy for a phone. Plain LAN HTTP can use WebGL2 where supported; it should not be taken as a WebGPU test.

## Controls

Desktop: WASD/arrows move; mouse + left-click aim/fire; J auto-aim/fire; E/right-click parry; Space/Shift dash; F Nova; Q break pact; Escape pause.

Touch: drag the movement pad or battlefield; aiming/firing are automatic; PARRY, DASH and NOVA buttons support a second finger. Use Pause → Break pact for the destructive pact choice. Portrait layout, left-handed mode, reduced effects and rotation pause are retained.

## Rendering

- Native WebGL2 / GLSL ES 3.00 and native WebGPU / WGSL; no engine library.
- Procedural beveled hulls, metallic boss assemblies, 3D floor tiles, rails and reactor rings. Render-only Z never participates in gameplay.
- Instanced meshes, inverse-scale normal transformation, GGX/Smith/Schlick direct-light material, roughness/metalness, analytic environment fill, emissive materials and ACES-style tone mapping. This is not a claim of measured physical lighting accuracy or a full image-based-lighting pipeline.
- WebGL2: RGBA16F scene target when `EXT_color_buffer_float` is supported; RGBA8 fallback; two bloom fragment passes and final composite.
- WebGPU: RGBA16F raster target; compute bright extraction/horizontal blur; compute vertical blur; full-resolution compute composite to an RGBA8 storage texture; presentation pass. Three compute dispatches per rendered frame, each bounded for non-multiple-of-eight resolutions.
- Nova/pact-break shockwave and WebGPU chromatic offsets are masked to background-class pixels. Collision-critical bullets, reticles and HUD use an undistorted transparent Canvas/DOM overlay.
- The orthographic gameplay plane matches the existing 2D coordinates. Local mesh depth is projected with a small oblique component to show thickness; hit centers remain marked at the simulation coordinates.

WebGPU is attempted automatically in a supported secure context; initialization/device errors fall back to WebGL2. An explicit final Canvas 2D fallback keeps the game playable when neither GPU backend works. The active backend is shown in Settings and through `NEMESIS_RENDERER.stats()` in browser developer tools.

`?renderer=webgl2` skips the WebGPU attempt. `?renderer=webgpu` requests WebGPU but still uses a fallback on failure; the status label, not the query parameter, is the source of truth.

## Build / tests

```sh
npm run build
npm run check
npm test
npm run test:simulation
npm run test:portrait
# Test-only dependencies: Python + Playwright + Chromium.
# This Linux image also needs a running X server for ANGLE:
xvfb-run -a python3 tests/gpu_browser_test.py
```

`npm run build` creates the self-contained `dist/NEMESIS-PACT.html` and exported shader inspection copies under `shaders/`. No npm runtime dependencies are used.

Current verification: 63 Node tests passed; 9 desktop and 27 portrait legal-input full-state bot runs reached the end. Those runs are correctness checks, not human difficulty studies or frame-rate measurements. WebGL2 rendering, RGBA8 fallback, context loss/restoration, portrait rotation and no-network runtime were checked in Chromium/ANGLE/SwiftShader.

**WebGPU shader compilation/dispatch on an actual WebGPU device was not verified in this sandbox. Physical iPhone/Android/Safari performance, heat, battery use, and direct file-URL navigation are also not verified.** See `docs/VALIDATION.md` for exact scope.

## Source layout

- `src/core.js`: preserved 2D simulation, only report version changed.
- `src/touch.js`, `src/audio.js`: preserved controls/audio.
- `src/game.js`: existing UI + transparent-overlay integration.
- `src/meshes3d.js`: mesh construction and read-only scene assembly.
- `src/renderer3d.js`: both GPU backends and embedded GLSL/WGSL.
- `src/renderer3d.css`: canvas stacking and backend status.
- `tests/`: original mechanics/localization tests and new mesh/GPU regression tests.
- `docs/baseline-0.2.1/`: clearly archived evidence from the earlier build, not new test results.

## References used for API/source review

- WebGL 2.0 specification: https://registry.khronos.org/webgl/specs/latest/2.0/
- WGSL specification: https://www.w3.org/TR/WGSL/
- WebGPU specification: https://www.w3.org/TR/webgpu/

No repository writes or GitHub pushes were performed as part of this recovery.
