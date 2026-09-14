# Source provenance — 0.4.1

This release extends the retained user-provided `NEMESIS-PACT-3D-EN-v0.4.0-source.zip`.
Baseline ZIP SHA-256: `0a13b98e05ade0526f986b0687db7dbc16c73c884d77a59aa71ec237e942b945`.

The classic simulation and all expansion mechanics are unchanged; only report/build version labels change outside the audio/UI scope. `src/score.js` is new; `src/audio.js` is intentionally rewritten to add 17 cues, synthesis voices, transport, mixing and previews. `src/game.js` and `index.html` wire audio context and Settings controls. `src/audio.css` styles the new subsection. The renderer change is a provenance comment and build label, not a graphics change.

The old audio implementation is preserved verbatim in `tests/fixtures/audio-v0.4.0.js`. Its SHA-256 is checked against the original v0.2.0 fixture; its sound-effect event switch is compared byte-for-byte with the new runtime. We do not change the old hash to pretend that BGM is unchanged. Touch input retains its original exact hash. The two virtual core-hook normalizations remain checked.

Current evidence lives in `docs/validation-0.4.1/`. The former validation narrative is explicitly archived as `BASELINE-0.4.0-VALIDATION.md`; former screenshots are not copied into this release. The contest build-period split still requires the participant's confirmation using the supplied provenance ledger and actual development history. Filesystem timestamps alone do not certify it. No commit history was invented or backdated.

No credentials, font files, dependency binaries, node_modules or external model/music assets are shipped. Participant contact details and the private submission checklist are in a separate submission pack, not this game source tree.
