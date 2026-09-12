# Verification record — 0.3.4

Date: 2026-09-12. This record supersedes earlier v0.3.0 claims for the reconstructed delivery only.

## Provenance

The original v0.3.0 HTML/ZIP could not be found in the active filesystem or the searched sources. The attached v0.2.1 English ZIP was extracted, its simulation/input preserved, and new native GPU renderers and meshes were implemented. This delivery is therefore a **reconstruction**, not a byte-for-byte reattachment of the missing build.

## Executed checks

1. `npm run check`: JavaScript syntax checks for core, game, audio, touch, mesh and renderer modules passed.
2. `npm test`: **63 passed, 0 failed**. Includes baseline mechanics/localization, normalized core hash, exact touch/audio hashes, mesh triangle/normal validation, finite instance buffers, immutable simulation state during scene assembly, static-scene cache stability, uniform layout, compute-source structure and standalone embedding.
3. Desktop bot simulation: **9 of 9 completed** (3 difficulties × 3 seeds).
4. Portrait bot simulation: **27 of 27 completed** (3 heights × 3 difficulties × 3 seeds).
5. `tests/gpu_browser_test.py`: standalone HTML loaded in memory while offline, on Chromium 144.0.7559.96 with ANGLE/SwiftShader software rendering. Actual browser version is also recorded in JSON. Tested 1280×800 desktop, 390×844 portrait and 320×568 portrait, with rotated layouts.
6. Browser assertions: backend is genuinely WebGL2, GLSL compiles/links, 3D draws issue successfully, zero WebGL error flags, no simulation changes from rendering, ordinary 2D input works, boss render fixtures, RGBA8 fallback, context loss/restoration, and rotation.
7. Browser page errors: **0**. External HTTP/HTTPS/WebSocket requests during the in-memory runs: **0**.
8. Final packaging checks: ZIP CRC checked; standalone HTML equals the ZIP's `dist/NEMESIS-PACT.html`; all source/script/stylesheet paths resolve within the archive; rebuild is reproducible. See the delivery receipt for SHA-256 values.

Bot pilots see exact simulation state and are not evidence of human game difficulty or fun. Screenshot boss fixtures intentionally modify stage/hull state for visual coverage and are distinct from the legal-input campaign simulations. The SwiftShader runs are not hardware GPU performance measurements.

## Not executed / not claimed

- WebGPU WGSL compilation or compute execution on a real WebGPU adapter. The source contains the raster and three compute passes; source-level tests do not establish that every hardware driver/browser accepts or performs them correctly.
- Native Safari, physical iPhone/Android, physical gamepad, battery/thermal testing, frame-rate targets.
- Opening a downloaded file through the user's browser/file manager. This environment's managed Chromium blocks file and local HTTP URL navigation. We used the exact self-contained HTML in memory instead, without changing the policy.
- The user's browser download click itself. File existence, readable bytes, ZIP integrity and hashes are verified locally; the chat client is outside this filesystem test.
- Original v0.3.0 source identity, original screenshot equivalence, or a GitHub push.

## Current evidence

- `recovery-unit-tests.txt`
- `recovery-desktop-simulations.txt`, `simulation-results.json`
- `recovery-portrait-simulations.txt`, `portrait-simulation-results.json`
- `recovery-browser-results.json`, `recovery-browser-test-log.txt`
- `recovery-screenshots/`

Files under `baseline-0.2.1/` are prior evidence, explicitly not current GPU test results.
