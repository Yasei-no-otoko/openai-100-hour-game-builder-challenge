# English localization / v0.2.1-en

This standalone English edition is based on the Japanese portrait-touch v0.2.0 source archive. It changes copy and English-specific layout, not combat rules or controls.

## Terminology

| Term | Usage |
|---|---|
| Pact | A sector-wide agreement with a benefit and a cost |
| Break pact | Deliberately discard the agreement for an emergency recovery |
| Hull | The player's or an enemy's hit points; numerical values are unchanged |
| PARRY | Reflect nearby enemy bullets, including a stronger perfect-parry window |
| DASH | Brief invincible movement; not a teleport to a touch position |
| NOVA / Supernova | The energy-powered attack and enemy-fire clear |
| Graze | Pass close to an enemy bullet without being hit to gain energy |
| Cooldown | Time until an action can be used again |
| STORY | The visible name for the internal `assist` difficulty ID |

Touch buttons use short uppercase action labels. Help and tutorial text refer to those exact labels. Desktop instructions retain their keyboard and mouse shortcuts. Mobile tutorials do not assume the movement pad is on the left, because the player can swap hands.

## Content mapping

Pact names follow the existing English identities: Slow Violence, Return to Sender, Glass Covenant, Ceasefire, No Witnesses, Sacred Ground and Fast & Fearless. Compact category labels replace the otherwise duplicated English-name eyebrow on cards. Numeric effects and stable IDs have not changed.

The three sectors are Faded Signatures, Silent Cathedral and Kingless Dawn. The boss identities remain The Notary, The Choir and The Sovereign. Their dialogue and each pact's flavor line are localized in `src/core.js`.

The victory branches are **A promise. A new dawn.** (all pacts kept), **No chains. No masters.** (all three broken) and **Scarred. Still flying.** (mixed history). Defeat uses **One more run. One step further.** These are adaptations of tone rather than word-for-word translations.

## Implementation boundaries

`index.html` contains English static screens, metadata and accessible labels. `src/core.js` contains English game-content strings and concise `hud` summaries. `src/game.js` contains English dynamic messages, tutorial steps, confirmation copy and ending prose. `src/english.css` contains typography and wrapping adjustments, including English headings, settings descriptions and button labels.

There is no runtime language switch or locale fetch. No translation service, AI model or network dependency has been added. The build script still inlines every script and stylesheet in the single HTML. Source, UI and documentation are English; decorative symbols such as arrows and mathematical operators are retained.

## Integrity and review

`tests/english.test.js` checks the language declaration, untranslated-character absence, content completeness, saved-state identifiers, report version and standalone dependencies. It also compares a SHA-256 of normalized gameplay source against the v0.2.0 baseline and verifies unchanged touch/audio source hashes.

`tests/english_browser_test.py` checks rendered text and accessible attributes, including clipping within overflow-hidden controls. It renders all pacts, all upgrades and each ending branch using explicitly labeled display fixtures. It also exercises the complete touch tutorial and normal startup without test globals. These fixtures are not evidence of player wins; separate legal-input simulations test campaign progression.

Native-speaker player testing, comprehension under combat pressure, physical-phone readability and platform accessibility testing remain open gates.
