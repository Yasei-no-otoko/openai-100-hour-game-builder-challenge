# Validation record — 0.4.1

Prepared: 2026-09-13. Scope: soundtrack expansion of the retained v0.4.0 game. No live provider or cloud deployment was used.

## Executed in this release

- JavaScript syntax checks and both distribution builds.
- **124 Node tests passed; zero failures.** Includes classic mechanics, expansion, intelligence mock/schema, GPU/source regressions and 16 new soundtrack tests. The intentional audio rewrite is documented, not hidden by changing old fixtures.
- **88 audio/browser assertions passed.** Seventeen separate 8-second cues plus fade tails were rendered with the shipped synthesis engine through actual Chromium OfflineAudioContext, at 24 kHz stereo. All were finite, non-silent, stereo, mutually different and below clipping. RMS ranged from 0.00894 to 0.02202; peak ranged from 0.05223 to 0.19459. These are raw preview renders, not loudness-normalized samples or hardware readings.
- Audio UI/transport at **1280×800, 390×844 and 320×568**: preview all-cue selector, actual scheduling, track changes, stop, independent volume wiring, all six sector/boss routes, pause/resume, rapid-switch deck bounds, lifecycle teardown and no horizontal overflow. Zero uncaught page errors and external requests.
- Full gameplay/browser regression in Chromium 144.0.7559.96 with **ANGLE/SwiftShader software WebGL2**, across **18 sector/viewport fixtures**. Real UI interaction through hangar, route, local negotiation/director mock, acceptance, Settings, rotation and results. Floor brightness and foreground mask safety were tested; zero page/WebGL errors and external requests.
- Legal-input simulations: **9/9 classic desktop**, **27/27 classic portrait**, **12/12 expansion cases** (2 layouts × Expedition/Gauntlet × 3 difficulties), all completed. These automated pilots see exact game state and do not establish human difficulty or enjoyment.
- Local server smoke checks passed for the hosted distribution and mock API. The check records **0 upstream provider calls**. This is loopback integration, not a Vercel deployment.
- Final packaging: exact standalone/ZIP file equality, ZIP CRC and source rebuild equality recorded in DELIVERY.json after release assembly.

## Important qualifications

Audio PCM is genuinely synthesized by browser Web Audio, not fabricated from note-count tests. The mock-context Node tests are separately labelled in the source and do not replace the browser renders. The audio test was rerun under the available headed Chromium/Xvfb path after the initial headless invocation timed out during UI testing; only the completed run is the claimed result.

Native WebGPU/Compute execution, physical GPU performance, physical phone/gamepad/Safari testing, hardware sound output, perceptual music review, Bluetooth behavior and mobile power usage remain unverified. Opening a downloaded file through the user's browser and the chat client's download operation are not controlled by these tests; delivered bytes and rebuild integrity are checked locally. Browser tests load the exact standalone file in memory with network disabled.

Real OpenAI model calls and production Vercel deployment have **not** been performed. The shipped AI default remains explicitly labelled local/server mock. In particular, Track 1 runtime generative-AI readiness is still pending. No forms were submitted, no team-sheet cells were changed and no GitHub push was performed.

## Evidence

`validation-0.4.1/unit-tests.txt`, `audio-results.json`, `audio-render-results.json`, `browser-results.json`, `campaign-simulations.json`, `server-smoke.json`, simulation logs, actual screenshots and sampler cue timings. The source baseline hash is in PROVENANCE.md. Historical v0.4.0 narrative is not current verification evidence.
