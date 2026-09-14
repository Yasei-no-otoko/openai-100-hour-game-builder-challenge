# Verification record — COVENANT ASCENT v0.4.0

Date: 2026-09-12. Source baseline: the retained **0.3.6.1 hotfix** archive. This record covers the current expansion, not earlier screenshots or historical test counts.

## Executed checks

| Check | Result | Scope |
| --- | --- | --- |
| JavaScript syntax | PASS | Runtime, build/server, API modules |
| Node unit/protocol tests | 108 passed, 0 failed | Existing mechanics/visibility tests plus expansion/AI/security tests |
| Expanded legal-input simulations | 12/12 six-boss wins | Desktop/portrait × Expedition/Gauntlet × Story/Standard/Veteran |
| Classic desktop simulations | 9/9 wins | Core baseline, 3 difficulties × 3 seeds |
| Classic portrait simulations | 27/27 wins | Core baseline, 3 geometries × 3 difficulties × 3 seeds |
| Browser sector fixtures | 18 | 6 sectors × 1280×800, 390×844, 320×568 |
| Browser errors / external requests | 0 / 0 | Exact offline HTML in memory, network disabled |
| Actual GL foreground-mask checks | PASS | Player, Harrier, Prism, Carrier and all 3 new bosses |
| Local HTTP integration | 6 checks passed | Public HTML, source/dot-file denial, mock POST, method/type/size rejection |

The unit count includes a regression for correctly formed mock/server option markup, an upgrade-cap check that prevents useless relic purchases, and a Harrier hold-window check added after the simulation found a long-range auto-aim stalemate.

## Browser and visual evidence

Executed browser: **144.0.7559.96**, Chromium on Linux under Xvfb with ANGLE/SwiftShader software rendering. Actual WebGL2 shaders compiled, meshes drew, framebuffer pixels were read back, and `gl.getError()` stayed zero. This is not a real hardware GPU benchmark or a claim of 60 fps.

The harness clicks through the hangar, Wraith selection, route screen, Director proposal/approval, negotiation proposal, exact 2.2× reflection benefit display, acceptance into actual combat, settings levels, and debrief. It checks the standalone refuses server mode before attempting a network request. Rendering does not mutate the serialized world. Portrait rotation preserves simulation state. Synthetic pointer input is a code-path check, not physical multitouch verification.

The six floor-only fixtures have an average linear framebuffer byte value above the test floor of 4; the lowest measured value was **21.07**. This detects the prior black-floor regression without relying on a shader-source string. In foreground-mask checks, a deliberately enormous tower is added on top of each aircraft position; the flight silhouette pixel count/mask is unchanged. Measured flight pixels for the seven fixtures: `{"player": 1174, "harrier": 990, "prism": 460, "carrier": 990, "boss3": 6272, "boss4": 5817, "boss5": 17163}`. The test checks foreground masks, not exact final RGB after glow blending.

Files named `desktop-sector-*` and `portrait-sector-*` are **controlled visual fixtures**: they deliberately set stage, boss phase, enemy positions and selected effects to cover rendering. They must not be mistaken for normal-input campaign completion. UI preview images also use controlled state. The final montage is composed only from these actual screenshots, not generated concept artwork.

## Campaign evidence

The expanded simulation uses ordinary move/shoot/dash/parry/Nova/route/shop/upgrade inputs. It does not edit hull to survive or force encounter completion. It sees exact simulation state and favors recovery routes; therefore it is not an estimate of human clear rate or fun. Only the recorded seeds/loadouts/routes are covered by the 12 completions; the full combination space is not exhausted.

Recorded Expedition simulated time is approximately **401–439 seconds**, and Gauntlet **157–229 seconds**. These are bot simulation times, not playtime promises. Paused menu/reading time is not included. The tests verify access to all six bosses and final results, rather than a human pacing target.

Classic mechanics are additionally checked against the retained core after reversing the two explicitly extracted virtual hooks and normalizing the version. Touch and synthesized audio implementations remain byte-identical to the baseline fixture.

## API and server evidence

No OpenAI key was loaded and no real OpenAI request was made. The live transport's tests use an injected fake fetcher. Tests cover strict input/output validation, supplied catalog limits, unknown/malicious fields, provider response/refusal/error fallback, configuration/origin/token rejection and the per-instance request brake. Structured output format is checked against the official interface; semantic model quality and cost have not been measured.

The HTTP smoke test starts the included Node server on loopback with `AI_MODE=mock`. It reads the exact hosted HTML, checks dot-file/source paths are denied, exercises the POST endpoint, and verifies rejection status codes. It does not constitute a Vercel deployment test.

## Not executed / not claimed

Native WebGPU WGSL/compute execution; physical Windows/macOS/iPhone/Android/Safari/gamepad checks; battery/thermal/load targets; public multiplayer/anti-cheat; human playtests; live model quality/latency/cost; Vercel account configuration, cloud build or public URL; GitHub push; and download-click behavior in the user's chat client. The environment's browser navigation restriction meant the self-contained HTML was loaded in memory, not opened via a file-manager double click.

The production gates are documented in `DEPLOYMENT.md` and `AI-PROTOTYPE.md`. The source contains a private live bridge, not a public-scale authenticated AI service. Its rate limiter is per-instance, not durable.

## Reproducibility and packaging

`npm run build`, `npm run check`, `npm test`, `npm run test:campaign`, `npm run test:simulation`, `npm run test:portrait`, `npm run test:server`, and `xvfb-run -a python tests/expansion_browser_test.py` reproduce the checks in the supplied environment. Browser tests need the recorded Chromium path and Python dependencies.

Final file existence, ZIP CRC, exact standalone/ZIP identity and fresh-source rebuild equality are checked in the separate delivery receipt. SHA-256 checksums are generated after packaging. Legacy scripts and fixtures are retained for regression context; older screenshot directories are omitted from this source delivery to avoid presenting stale images as current evidence.
