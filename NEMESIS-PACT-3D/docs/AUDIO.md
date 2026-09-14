# Adaptive soundtrack — 0.4.1

## Listen in the game

Settings → Soundtrack preview → choose a cue → Play preview. AudioContext is unlocked by a user action. Music and effects have independent volume controls under the existing master volume. Music OFF does not disable gameplay sound effects; M mutes the master. Preview does not alter the stage, ship, seed, score or campaign. Leaving Settings stops preview. Normal music resumes according to the screen; pause/help/settings/confirm overlays keep the phrase position and silence the music unless explicitly previewing.

## Cue sheet

| ID | Title | Context | BPM |
|---|---|---|---|
| title | Before the First Signature | Main menu | 76 |
| hangar | Ready the Wings | Hangar / loadout | 96 |
| interlude | Terms in the Quiet | Pacts / route / intelligence | 84 |
| verdigris | Verdigris Oath | Faded Signatures | 112 |
| verdigris-boss | Final Clause | The Notary | 132 |
| foundry | Foundry Pulse | Silent Cathedral | 126 |
| foundry-boss | Dissonant Engine | The Choir | 146 |
| crown | Crown of Dawn | Kingless Dawn | 104 |
| crown-boss | Crownfall | The Sovereign | 128 |
| tidal | Tidal Memory | Tidal Archive | 96 |
| tidal-boss | Undertow | The Leviathan | 120 |
| roseglass | Roseglass Run | Prism Orchard | 138 |
| roseglass-boss | Threadbreaker | The Weaver | 158 |
| horizon | Unwritten Horizon | The Unwritten Sky | 118 |
| horizon-boss | The Last Signature | The Unwritten | 148 |
| victory | A Sky Unbound | Victory | 102 |
| defeat | Ink in the Rain | Run lost | 64 |

Six ordinary-sector themes have six corresponding boss arrangements with different rhythmic/voicing material, not just renamed identical loops. The other five cues cover title/archive, hangar/loadout, routes/pacts/intelligence, victory and defeat. A 32-bar A/B/breakdown/finale vocabulary gives sustained development. Boss arrangements retain rhythmic drive in the third section rather than taking a full breakdown.

## Behavior and implementation

`PactScore.resolve` selects cues from the actual screen and alive boss presence. `PactScore.energy` observes hostile-bullet density, combo and boss phase without mutating world state. The adaptive switch controls additional rhythmic/decorative layers. Ceasefire drops newly scheduled drum/bass notes, retaining harmony and melody; short already-scheduled tails may finish. Breaking a pact can add a low threat accent. Score variation uses its own seed hash and never advances the game's RNG.

`PactSound` schedules against AudioContext time with a 25 ms timer and a 115 ms look-ahead. The timer is independent of the render loop, but still runs on the browser's JavaScript thread; this is not a real-time scheduling guarantee. A long stall drops missed steps instead of firing them in a burst. Track switches begin near the next beat, with roughly half-second fades. Retiring music decks are capped at two. Live music voices are capped at 128 and effects at 48. Ended nodes are disconnected. Disposing the engine cancels the scheduler and releases resources.

Synthesis uses oscillators, deterministic noise, filters, envelopes and stereo placement. Timbres include plucked triangle leads, metallic/bell partials, soft keys, glass tones, wide leads, pads, round/driven bass and six percussion types. Two filtered stereo echoes add space. Important parry, hurt, Nova and breach effects briefly duck the music. A master compressor provides headroom; this is not a mastering guarantee for every device/speaker combination.

## Verification and preview

`tests/audio.test.js` checks cues, deterministic notes, state selection, counters, caps, pause, stale-tick handling and exact retention of the old sound-effect event vocabulary. `tests/audio_browser_test.py` renders every cue through the same actual synthesis engine in Chromium's OfflineAudioContext, checks finite/non-silent stereo PCM and peak headroom, and exercises Settings and transport on desktop and portrait viewports.

Run on a Linux headless test host with Chromium and Xvfb:

```sh
pip install -r requirements-test.txt
xvfb-run -a npm run test:audio
```

The test writes optional WAVs under the validation directory; set `NEMESIS_AUDIO_WAV_DIR` to a separate directory to keep them outside source packages. The delivered MP3 sampler is a separate 98.8-second listening preview, with preview-only loudness normalization. It is not the required one-minute submission video and is never loaded by the game.

No physical audio-device, Bluetooth-latency, Safari, iOS/Android thermal or perceptual listening certification is claimed. The soundtrack is locally authored procedural synthesis, not runtime generative AI and not a paid API feature.

Implementation reference: W3C Web Audio API 1.1, https://www.w3.org/TR/webaudio/ .
