# v0.3.6.1 — black-screen hotfix validation

Date: 2026-09-12. This record supersedes the inherited verification text for this
build. Tests inspect real pixels in addition to JavaScript syntax and shader text.

## Input and scope

Input: the supplied v0.3.6 HTML and source ZIP.
Input HTML SHA-256: `59b95e6716fd1cb28cc7c50290da28826f3a35b0959e7a66c651e22ca2032d68`.
The simulation, input mapping, touch implementation and generated audio retain
the original behavior; `core.js` changes only its report version. The normalized
mechanics hash and unchanged touch/audio hashes pass the existing regression tests.

## Root causes confirmed in the received source

1. **WebGPU clipping:** the old vertex shader used `-depthHeight/700` for clip Z
   with W=1. For a representative aircraft center that produces
   `-0.25142857142857145`, outside the WebGPU [0,1] normalized depth range.
2. **Floor mistaken for shadow:** `1 - step(0.051, vClass)` matched GROUND=0.02,
   as well as shadow classes. Its `base * 0.12` replacement blackened all floor tiles.
3. **Flight/scenery overlap and fog:** numeric class values were simultaneously
   used as depth offsets, shadow labels and post masks. Some tall backgrounds
   outranked the craft, while a high class also increased fog on craft.

## Fix

Both shaders now derive a depth in [0,1]. The WebGL2 shader outputs `z01*2-1`;
the WGSL shader outputs `z01`. Scenery occupies [0.56,0.94] and aircraft
[0.12,0.28], so scenery cannot overwrite craft, independent of mesh batch order.
Within each band, true transformed mesh Z is preserved monotonically. These are
render-only depth bands, not new gameplay altitude/collision rules.

Shadows have an explicit negative class. Ground receives normal lighting. Fog is
background-only, no more than 0.38; foreground aircraft use zero fog. The original
shader material parameters, lights, bloom and tone mapping remain functional.
Full-screen resampling checks a binary foreground mask, rather than treating the
height class itself as a transparency value.

## Executed tests

- `npm run check`: all listed source modules pass syntax checking.
- `npm test`: **76 passed, 0 failed**.
- The expanded mesh test checks **4,438,944 transformed vertices** in 36 fixtures
  (3 layouts x 3 stages x 2 seeds x 2 animation times). All depths are in range;
  the smallest observed scenery-to-flight depth gap is 0.4974.
- `tests/visibility_browser_test.py`: **actual WebGL2 rendering** in Chromium
  144.0.7559.96, ANGLE/SwiftShader software backend. Three viewport sizes:
  1280x800, 390x844 and 320x568. All three stages are rendered per viewport.
- Quantitative floor fixture, pre-tone-map RGBA8 render target: mean of linear
  RGB bytes for Stage 1 is 0.826 in original v0.3.6 versus 11.919 in the hotfix.
  The original fails the >4 visibility threshold; all three hotfix sectors pass.
  This measures fixture output, not monitor brightness or physical illumination.
- Aircraft mask fixture: player, five enemy types and boss remain visible after
  adding a large high-Z tower over them. **0 differing foreground-mask pixels**
  for all seven types. For the player, 1,042 foreground pixels remain unchanged.
  The same original-build tower fixture overwrites all 1,042 player pixels.
- Settings levels OFF/STANDARD/HIGH, reduced effects, RGBA8 fallback,
  context-loss/restoration, portrait rotation, unchanged simulation state during
  rendering, and no settings-screen horizontal overflow are checked.
- Browser page errors: **0**. WebGL error flags: **0**. External runtime requests:
  **0**. The exact standalone HTML is loaded in memory with the network disabled.
- Legal-input bot simulation: **9/9 desktop** and **27/27 portrait** complete.
  Bots see internal state; these are not human difficulty or fun measurements.

Boss screenshots are controlled visual fixtures. They are not campaign-completion
evidence. Campaign simulations are separately recorded without state-cheat wins.

## Not verified / not claimed

- Native WebGPU WGSL compilation, rasterization or compute dispatch on an actual
  WebGPU adapter. The numeric clip-space tests do not establish driver behavior.
- Physical iPhone/Android, Safari, hardware performance, battery/thermal behavior,
  or any 60fps target. SwiftShader screenshots are software-rendering evidence.
- File/local-URL navigation in this managed browser (administratively blocked).
  In-memory rendering was used without changing that browser policy.
- The chat client's download click. File bytes, ZIP CRC, hashes and rebuild
  identity are verified in the delivery filesystem instead.
- GitHub publication or a repository push.

## Evidence files

`hotfix-0.3.6.1/unit-tests.txt`, `browser-results.json`,
`baseline-reproduction.json`, sector screenshots, desktop/portrait simulation logs,
and root `simulation-results.json` / `portrait-simulation-results.json`.
The `history/` subdirectory is explicitly old evidence, not current QA.

## Primary specification used

W3C WebGPU, section 3.3, Coordinate Systems:
https://www.w3.org/TR/2026/CRD-webgpu-20260812/#coordinate-systems
The standard specifies normalized depth Z between 0 and 1.
