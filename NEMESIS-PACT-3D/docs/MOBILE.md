# Portrait touch UI / English edition

The mobile system is retained from v0.2.0. This edition localizes its text and adjusts English typography only.

## Interaction

The default layout places movement on the left and PARRY, DASH and NOVA on the right. Automatic aim and fire let the player focus on movement and bullet defense. Settings can mirror the two control groups and adjust sensitivity from 70% to 140%.

Movement is a relative drag from the initial contact, either on the pad or the battlefield. It never teleports the ship to the touch point. A later finger does not take over an existing movement contact.

`TouchController` tracks the movement pointer separately from the action-pointer map. Capture, release, cancellation and lost capture are handled independently. Releasing a parry finger does not cancel movement. Actions remain pending until a simulation step consumes them once; held buttons do not auto-repeat.

Only the canvas, movement pad and action buttons suppress browser touch gestures. Menus remain vertically scrollable. Tapping a card previews it; an explicit confirmation signs the pact or equips the upgrade. Breaking a pact and ending a run use paused confirmation screens. Canceling a confirmation does not change the world.

## Layout and geometry

Touch layout activates for a coarse pointer, available touch points or a viewport below 760 CSS pixels wide. The DOM is rearranged rather than scaled down from the 1280×800 desktop interface. Primary active touch controls are at least 44 CSS pixels in each dimension in the tested configurations.

Dynamic viewport height and safe-area variables separate the HUD, battlefield and control deck. Boss information reserves additional HUD space. Tutorial cards and transient announcements intentionally overlay the battlefield; action buttons do not.

A portrait run starts at 720 logical pixels wide and a height from 520 to 1440 based on available space. That geometry stays fixed for the run. Rotation pauses gameplay; the renderer fits the entire world with uniform scaling and letterboxing, without changing entity positions or velocity. Returning upright restores the portrait presentation.

Portrait mode uses a 0.86 motion coefficient for player movement and hostile bullets. Spawn positions and boss motion bounds fit the portrait arena. Desktop geometry and shortcuts remain available. Run reports include `layout` and `arena`; scores from different dimensions are not an equal-conditions competition.

## English adjustments

English instructions refer to PARRY, DASH and NOVA consistently. Card headings, the run result, settings descriptions and confirmation buttons use English-specific wrapping rules. Short HUD summaries avoid long benefit descriptions. Movement tutorials say “movement pad,” not “left pad,” so instructions remain correct in left-handed mode.

## Remaining device checks

Physical iPhone/Android testing is still needed for thumb reach, touch latency, browser bars, real safe areas, calls/app switching, audio recovery, rotation, thermal behavior and extended play. Chromium touch emulation and simulated CSS safe areas do not replace those tests. This build includes no native app wrapper, PWA install flow or unfinished-run restoration.
