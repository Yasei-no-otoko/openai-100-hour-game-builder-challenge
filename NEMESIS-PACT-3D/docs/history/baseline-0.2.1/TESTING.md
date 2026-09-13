# Verification report / v0.2.1-en

## Build and environment

The English portrait-touch build was tested on Linux with Node.js 22.16.0, Python Playwright 1.57.0 and Chromium 144.0.7559.96. Browser suites loaded the exact standalone HTML into memory with networking disabled from the outset. Test hooks are explicitly enabled by the harness and are absent from a normal launch.

A direct `file://` launch was attempted, but the managed browser returned `ERR_BLOCKED_BY_ADMINISTRATOR`. No policy was changed or bypassed. Direct-file startup therefore remains unverified; in-memory offline startup is verified. No physical iPhone/Android, Safari/WebKit, installed-app, app-attachment-preview or phone-over-Wi-Fi test was performed.

## Results from this English build

| Check | Result |
|---|---|
| JavaScript syntax | core / game / audio / touch passed |
| Unit, portrait and localization tests | 54 passed; 0 failed |
| Gameplay-source parity with Japanese v0.2.0 | Exact normalized hash match, excluding content data and report version |
| Touch and audio source parity | Byte-identical to v0.2.0 |
| English rendered-text checks | 308 screen-state checks passed |
| English display configurations | 6 portrait, 1 touch landscape, 2 desktop configurations |
| Existing mobile browser regression | 21 checks across 6 portrait sizes passed |
| Portrait full-campaign simulation | 27 / 27 completed |
| Desktop full-campaign simulation | 9 / 9 completed |
| Full portrait campaign inside Chromium | STANDARD, PORTRAIT-BROWSER-01, all 3 bosses defeated |
| Full desktop campaign inside Chromium | STORY, BROWSER-QA, all 3 bosses defeated |
| JavaScript page errors in the successful browser suites | 0 |
| External HTTP/WebSocket requests in those suites | 0 |
| Normal offline startup without test globals | Passed |
| Direct file launch | Blocked by environment policy; not verified |

The 308 English checks are repeated screen-state inspections across layouts, not 308 independent gameplay scenarios. They cover visible text, accessible attributes, the document language and text rectangles. The checks look for horizontal viewport overflow and clipped content inside overflow-hidden controls. Intentional vertical scrolling remains allowed.

## Localization coverage

Every pact, every upgrade, all three victory endings and defeat were rendered. Coverage includes the title, run setup, daily seed, settings, help, pact preview/confirmation, active-pact HUD, pause, quit confirmation, break-pact confirmation, the broken-pact announcement, the full touch tutorial, and the unsupported-fullscreen message.

The English browser suite uses a Japanese browser-language preference to verify that the explicit English edition does not revert based on device locale. All runtime source strings and the standalone HTML are scanned for untranslated Japanese characters. Decorative symbols and mathematical operators remain intentional.

Viewport cases: **320×568, 375×667, 390×844, 393×852, 430×932, 360×800**, plus **844×390** touch landscape and **1440×900 / 960×600** desktop. The 393×852 and 430×932 cases simulate a 47-pixel top safe area and 34-pixel bottom safe area using CSS custom properties. These are not physical-device safe-area or browser-toolbar measurements.

## Touch and lifecycle regression

The inherited mobile suite was run again on the English build. It sends actual Chromium multi-touch events through CDP and observes pointer ownership: movement plus parry, movement continuing after the action finger lifts, movement plus dash, no action auto-repeat while held, independent movement release, cancellation, battlefield-relative dragging and Nova activation.

It also checks non-overlapping battlefield/control-deck placement, at least 44-pixel primary hit targets, left-handed mirroring, card scrolling without selection, preview before explicit confirmation, canceling/confirming pact breaks, rotation pause, frozen time while paused, immutable world dimensions and input release on focus/visibility loss. OS calls, phone locking and real app-switching behavior remain unverified.

## Playthrough evidence versus display fixtures

The 27 portrait simulations cover 3 arena heights × 3 difficulty settings × 3 seeds. The 9 desktop runs cover 3 difficulties × 3 seeds. The bot observes exact simulation state and supplies legal player inputs at 120Hz. These campaign runs do not override player health, enemy health, time or progression to force a clear. They do not prove human difficulty, enjoyment, real-time device performance or smartphone control comfort.

English card/ending fixtures deliberately set display states so every translation can be reviewed without relying on random offers. Boss screenshots similarly use controlled combat fixtures. They are not evidence of human wins.

- `docs/screenshots/english/01-title.png`: running English title screen.
- `docs/screenshots/english/03-pacts.png`: English pact-selection screen.
- `docs/screenshots/portrait/03-boss.png`: controlled boss display fixture.
- `docs/screenshots/portrait/04-result.png`: legal-input browser-bot completion.
- `docs/screenshots/english/07-ending.png`: controlled ending-copy fixture, not a clear.

## Reproduce

Run `npm run build`, `npm run check` and `npm test`. Browser commands are `npm run test:browser`, `npm run test:mobile` and `npm run test:english`; the Python scripts accept `--browser /path/to/chromium`. Simulation commands are `npm run test:simulation` and `npm run test:portrait`.

Evidence files are `unit-test-results.txt`, `syntax-check-results.txt`, `english-browser-results.json`, `mobile-browser-results.json`, `browser-results.json`, `portrait-simulation-results.json` and `simulation-results.json`. Read the accompanying text logs for actual command output.

## Remaining release gates

Physical iPhone Safari and Android Chrome; local-file and attachment execution routes; trusted-LAN delivery on a phone; actual safe areas and browser chrome; touch latency and thumb reach; audio unlock/recovery; OS interruption; extended play and heat; real persistent-storage reload; physical gamepads; human English comprehension and playability review. No frame-rate, memory, thermal or accessibility certification is implied.
