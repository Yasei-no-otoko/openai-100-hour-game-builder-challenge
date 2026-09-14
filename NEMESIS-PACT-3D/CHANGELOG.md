# 0.4.1 — 2026-09-13

- Replaced one repeated score with 17 distinct local music cues, including six sector themes and six boss arrangements.
- Added 32-bar forms, seeded arrangement variations, combat-reactive stems and beat-aligned crossfades.
- Added separate music/effects mix controls, adaptive-arrangement toggle and all-cue preview in Settings.
- Added AudioContext-clock scheduling, bounded voice/deck lifetimes, stalled-tick handling, pause/visibility/preview handling and effects ducking.
- Preserved old sound-effect event pitches/vocabulary and all combat/input logic. Kept regression fixtures rather than silently changing their hashes.
- Added real OfflineAudioContext rendering checks and desktop/portrait sound UI tests. Generated a separate MP3 sampler.
- Added technical license/provenance inventory and a separate, not-yet-submitted English form draft/storyboard pack. Live generative AI remains unverified.

# 0.4.0 — Covenant Ascent — 2026-09-12

Based on the retained v0.3.6.1 hotfix source, not the earlier broken black-screen build.

Added six-sector Expedition (18 encounters), six-boss Gauntlet with inter-boss drafts, and a Classic compatibility mode. Added three airframe loadouts, three risk/reward routes, credits and salvage, eight unique in-run relics, repairs, a local world archive, and expanded run records. Added Harrier, Prism and Carrier enemies plus Leviathan, Weaver and Unwritten boss controllers/meshes. Harrier strafe/hold windows prevent a long-range auto-aim stalemate found during simulation.

Redesigned preflight, route/outfitter and intelligence screens for English desktop and portrait touch. Added edge-weighted six-sector scenery, new palettes, faceted parts, thinner animated motifs and clearer HUD contrast. Preserved protected flight depth, floor-lighting correction and background-only fog/distortion.

Added local deterministic negotiation/director/debrief mocks with explicit provider labels and acceptance. Added a schema-validated, default-mock Vercel Node handler and private live OpenAI adapter. No paid provider call or actual deployment was performed. Added separate offline and hosted HTML builds; the development server serves only public assets.

Validation: current evidence is under docs/validation-0.4.0. Earlier test scripts and fixtures remain as baseline references; their old screenshots are not claimed as this build's evidence.
