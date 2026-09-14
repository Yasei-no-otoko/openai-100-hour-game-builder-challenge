# BLAST BUSTER: NEMESIS PACT — COVENANT ASCENT

**v0.4.1 · English · portrait touch + desktop · local-first · WebGL2 / WebGPU**

The 0.4.1 soundtrack update to the playable v0.4.0 expansion, not a visual mockup. Negotiate a rule, build a ship around it, and decide what you are willing to break. The complete game and the default intelligence mock run without an API key or network connection. No commercial-quality or award claim is implied by this build.

## Play

Open `dist/NEMESIS-PACT.html` in a desktop browser, or serve the hosted build:

```sh
npm run build
npm start
```

Node.js 22 is the development/server target. There are no npm runtime dependencies. `npm run start:lan` exposes the development server to your trusted local network and prints a phone URL; stop it with Ctrl+C. `public/index.html` is the server-capable build; `dist/NEMESIS-PACT.html` deliberately refuses server mode. Do not expose the project directory through a generic file server with real `.env` files in it.

**First run:** Play → Expedition → Vanguard → Ready → Story difficulty → Launch → The Forgotten Way → choose a pact. For a short test of all bosses, choose Gauntlet. Training remains damage-free.

## Content and modes

| Mode | Content | Progression |
| --- | --- | --- |
| Expedition | 6 sectors, 12 ordinary waves, 6 boss encounters | Route → pact → two upgrade drafts → boss → next sector |
| Gauntlet | 6 consecutive bosses | Route/pact before each; 5 upgrade drafts between bosses |
| Classic | Original 3-sector, 9-encounter campaign | Original combat rules and starting ship statistics |

All three existing difficulties are available: Story, Standard, Veteran. Three airframes affect Expedition/Gauntlet mechanics: Vanguard starts with piercing, Wraith trades hull for parry/mobility, and Bastion trades dash recovery for hull and an escort satellite. Classic ignores airframe bonuses.

Eight unique, in-run relics add piercing, energy, a one-use revive, dash damage, echoes, slower enemy bullets, cheaper Nova, and satellites. Spend earned credits or repair between encounters. Credits are game resources, not real money. Relics do not carry over to the next run.

At each sector choose a recovery, salvage, or elite route. These are **risk/reward branches to the next authored sector**, not three separate geography campaigns. The selected route changes enemy counts, elite hull and credit rewards. The six-sector world archive stores discoveries on this browser; run reports include route, relic and airframe choices.

The new enemies are Harrier, Prism and Carrier, joining the five original ordinary types. The new bosses are the Leviathan, the Weaver and the Unwritten, each with its own mesh silhouette, attack controller and phased patterns. The original seven pacts and thirteen upgrade choices remain.

## New in 0.4.1: soundtrack

Seventeen local cues: six sector themes, six boss arrangements, title, hangar, interlude, victory and defeat. Themes differ in motif, harmony, rhythm, tempo and synthesized timbre. Context-based transitions crossfade near a beat; the adaptive arrangement adds layers during intense fights. Ceasefire thins the rhythm, and major sound effects briefly duck the music.

Open **Settings → Soundtrack preview** to hear every cue. Music/effects levels are independent. All synthesis is local; no sampled songs, streaming or music API is required. The cue sheet, scheduling details and verification limits are in [AUDIO.md](docs/AUDIO.md).

## Controls

Desktop: WASD/arrows move; mouse aims; hold left-click to shoot; hold J for auto-aim/fire; Space/Shift dash; E/right-click parry; F Nova; Q break a pact; Escape pause. Laser attacks cannot be parried.

Touch: slide the movement pad or battlefield, with automatic aim/fire. Use PARRY, DASH and NOVA with the other thumb. The pause menu contains pact breaking. Left-handed layout and sensitivity remain in Settings. Portrait is supported without squeezing the arena sideways. Rotation pauses the run and preserves its logical geometry.

## Visual direction

Six sector identities: a verdigris bastion, violet foundry, amber ziggurats, blue pearl archives, rose-quartz groves, and a final orbital sanctuary. Seeded variations change scenic layout. Architecture is concentrated toward the edges, leaving the central flight field more readable. Segmented rings, lift components and energy conduits animate gently.

Materials use the existing GGX/metalness/roughness/emission raster path. Bloom, tone mapping and bounded background distortion remain; WebGPU contains compute bloom/composite passes. Shadows are stylized flattened meshes, **not ray-traced or shadow-map lighting**. Fog is an authored atmospheric approximation, not volumetric ray marching.

The v0.3.6.1 fixes are retained: valid WebGPU depth, separate scenery/flight depth ranges, shadow-only classification, foreground protection from fog and distortion. A tall scenic mesh cannot overwrite a flight pixel in the depth test. This does not add 3D collision or altitude controls.

## Intelligence prototypes

Default badge: **LOCAL MOCK / NO AI CALLS**. This is an authored keyword/template provider, not a local language model.

- **Negotiate terms:** inspect a proposed current pact, its exact benefit and price, then accept to launch. The actual contract modifier is applied only after approval.
- **Director lab:** inspect and approve one of three authored formation templates. The chosen template changes the next ordinary wave. This is not arbitrary AI-generated level code; Gauntlet has no ordinary waves to modify.
- **Flight debrief:** request a summary of six aggregate counters after a run. Advice is a mock until live server mode is deliberately enabled.

The same validated protocol is implemented by `api/intelligence.mjs` for Vercel. Local/server mocks require no key. Live mode is fail-closed and private-pilot only. Read [AI-PROTOTYPE.md](docs/AI-PROTOTYPE.md) and [DEPLOYMENT.md](docs/DEPLOYMENT.md). **No real OpenAI call or Vercel deployment was executed while preparing this build.**

## Build and test

```sh
npm run build
npm run check
npm test
npm run test:campaign
npm run test:simulation
npm run test:portrait
npm run test:server
```

Browser fixtures need Python Playwright and a Chromium executable. On this Linux environment:

```sh
pip install -r requirements-test.txt
xvfb-run -a python tests/expansion_browser_test.py
```

The browser harness explicitly chooses `/usr/bin/chromium` and ANGLE/SwiftShader software rendering. Adapt that executable for a different test host. It is not a hardware performance benchmark. Tests do not constitute human difficulty, enjoyment or accessibility certification. See [VALIDATION.md](docs/VALIDATION.md) for exactly what ran.

## Layout

`src/score.js` is the pure cue/arrangement planner and `src/audio.js` is the Web Audio engine. `src/core.js` is the classic simulation with two overridable hooks. `src/expansion.js` implements campaign content. `src/scenery040.js` supplies six scenic identities and new meshes. `src/game.js` owns screen transitions. `src/intelligence.js` is the shared schema/mock/client. `server/intelligence.mjs` validates requests and handles the private live provider. `tools/build.js` emits both distributions and shader source files. `public/` is the only static serving root.

## Known limits

No physical-phone/Safari/gamepad verification, no native WebGPU runtime verification, no cloud save, no authenticated leaderboard, no multiplayer, no persistent progression power, no procedural narrative beyond the described mock, and no runtime-generated code. Public live launch still needs real user authentication, durable quotas, a global spending budget, provider evaluation and platform testing. The current per-instance request brake is not a production cost control.

## Credits and submission

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for formula attribution and development-tool licenses. The project-specific code has no public open-source license declared. The separate submission pack contains private team-field placeholders and draft English text, not a completed or submitted entry.
