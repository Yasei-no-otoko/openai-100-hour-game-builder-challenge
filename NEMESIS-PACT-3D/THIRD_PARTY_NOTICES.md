# Third-party notices and development-tool disclosure

This file records identifiable formula provenance and tools actually used. It does not assign a new open-source license to project-specific code or certify ownership/timing of all earlier participant materials. The team representative must finalize that declaration for the contest.

## Included formula

The analytic filmic curve in the GLSL/WGSL renderer uses coefficients 2.51, 0.03, 2.43, 0.59 and 0.14 from **Krzysztof Narkowicz, “ACES Filmic Tone Mapping Curve” (2016)**. The author offers the fitted implementation under **CC0 or MIT**. This package records the CC0 option and credits the source. This fitted curve is not a full ACES implementation.

Primary source: https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/
CC0 reference: https://creativecommons.org/publicdomain/zero/1.0/

## Procedural content

No sampled music, soundfonts, external music files, imported 3D assets, datasets, or third-party JavaScript runtime libraries are in the game distribution. `src/score.js` contains newly authored motif/chord tables and deterministic arrangements created with ChatGPT assistance. `src/audio.js` synthesizes sound using native Web Audio nodes. The separately delivered MP3 is a render of this engine, not a dependency of the game. It was loudness-adjusted for listening.

## Development / verification tools (not redistributed)

| Tool | License / source | Use |
|---|---|---|
| Node.js | MIT; incorporated code has additional notices. https://github.com/nodejs/node/blob/main/LICENSE | Build, tests, local server |
| Python | PSF-2.0, incorporated component notices. https://docs.python.org/3/license.html | Test harness and packaging |
| Playwright for Python | Apache-2.0. https://github.com/microsoft/playwright-python | Browser automation |
| Chromium | BSD-3-Clause plus incorporated licenses. https://chromium.googlesource.com/chromium/src/+/main/LICENSE | Browser/Web Audio/GL validation |
| SwiftShader | Apache-2.0 plus component notices. https://swiftshader.googlesource.com/SwiftShader | Software graphics backend |
| Pillow | MIT-CMU. https://pillow.readthedocs.io/en/stable/about.html | Preview/screenshot handling in the development workflow |
| NumPy | BSD-3-Clause. https://numpy.org/doc/stable/license.html | Audio sample checks and sampler assembly |
| FFmpeg | The installed executable reports GPL-2.0-or-later (`ffmpeg -L`). Generic builds vary; see https://www.ffmpeg.org/legal.html | MP3 preview encoding only; executable/libraries not included |

ChatGPT, optional OpenAI API access, and optional Vercel hosting are services governed by their own terms. Their inclusion in a workflow does not amount to importing an open-source package. No OpenAI SDK is bundled; the existing server uses native HTTP requests. No new live OpenAI call or Vercel deployment was performed for this release.

All notices were checked against primary publisher/repository materials or the installed executable's own license output on 2026-09-13. This is a technical inventory, not a replacement for the representative's rights and build-period review.
