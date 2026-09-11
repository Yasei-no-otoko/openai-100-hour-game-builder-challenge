# NEMESIS PACT / Game design

## The core question

What would combat feel like if you could agree its rules with your enemy before the first shot?

Negotiation is a choice with an explicit benefit and price, not an open-ended conversation. The player experiences the terms in combat, then decides whether keeping a promise is worth risking the run. Rules are finite, deterministic and inspectable. No inference SDK or API is present.

## A complete run

Pact → Wave I → Upgrade → Wave II → Upgrade → Boss. Repeat for three sectors. Each cleared regular wave grants a build choice; a defeated boss restores 2 hull. Death restarts the run, with an option to reuse the seed. There is no permanent stat grind: mastery comes from positioning, timing and build decisions.

## Skill expression

Enemy bullets are both danger and ammunition. The base parry window lasts 0.23 seconds, with a stronger reflection during its first 0.105 seconds. Dense patterns can become damage and energy opportunities rather than purely avoidance tests. Dash handles unreflectable lasers; Nova damages enemies and clears hostile bullets/lasers; breaking a pact is a once-per-sector emergency decision.

## Pact rules

| Pact | Benefit | Price |
|---|---|---|
| Slow Violence | Enemy bullet speed ×0.7 | Each normal enemy-shot emission has a 40% chance of one extra bullet |
| Return to Sender | Reflected damage ×2.2 | Normal shot damage ×0.75 |
| Glass Covenant | Enemy hull ×0.7 | Incoming damage ×2 |
| Ceasefire | Enemy bullets stop for the last 1.3 seconds of each 5-second cycle | Player firing also stops during that interval |
| No Witnesses | No boss reinforcements | Boss attack rate ×1.25 |
| Sacred Ground | Enemy bullets disappear in the central radius-76 circle | Normal shot damage ×0.78 |
| Fast & Fearless | Dash cooldown ×0.55 | Enemy bullet speed ×1.3 |

Breaking a pact removes its benefit and cost and raises enemy attack rate to ×1.25. It immediately clears hostile bullets and lasers, restores 1 hull, grants 2 seconds of player invulnerability, stuns enemies for 2 seconds and deals 20% maximum-hull damage to active bosses or 100 damage to active regular enemies. Enemies still in their spawn telegraph are not damaged. Breaking Glass Covenant also removes its enemy-hull reduction before applying the emergency damage.

## Simulation boundary

The DOM-free engine takes an input state and a fixed time step. It updates rules and emits events without reading Canvas, audio or local storage. The presentation turns real time into 120Hz simulation steps and adds graphics and sound to those events. Gameplay and decorative randomness are separate, with separate seed streams for spawn plans and upgrade offers.

Portrait geometry, controls and motion scaling are documented in [MOBILE.md](MOBILE.md). English localization does not alter any combat formula. Future network-driven content would still need to resolve into validated, finite rule IDs rather than executable free text; no such integration is included here.

## Human playtests still needed

Can a first-time player discover parrying without prompting? Are pact costs understood before the first hit? Is breaking a pact remembered and intentional? Does the first defeat lead to an immediate retry? Do the controls remain comfortable on a real phone? Automated simulation verifies progression and invariants, not enjoyment, difficulty or award-level quality.
