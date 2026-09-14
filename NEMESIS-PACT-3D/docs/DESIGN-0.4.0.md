# COVENANT ASCENT — design decisions and next playtest

## Brief

Extend the retained NEMESIS PACT v0.3.6.1 source and its visual target, preserving English UI, portrait touch play, two-dimensional collision, local-first combat and the repaired rendering visibility. The goal is more expressive moment-to-moment decisions and a world with stronger sector identities. An award is a target, not a property an implementation or automated test can certify.

The Product Design plugin was explicitly requested, but its dedicated workflow is for Work mode. This delivery used the normal code/build/browser environment and the existing project target; it does not claim a completed Product Design plugin workflow or professional human UX study.

## What changed in the experience

The previous loop was pact → wave → upgrade → wave → upgrade → boss, repeated three times. The expansion adds a preflight identity, a risk/reward decision between sectors, a small resource economy, and three further bosses. The sequence is now:

**Airframe → route + outfitter → pact (or negotiation prototype) → combat + salvage → build choices → boss → next route.**

Each added screen has a mechanical purpose. A recovery route trades income for safety. A salvage route helps buy a relic. An elite route asks whether the current build can handle stronger units. Credits can go into repairs or a distinctive build effect. Relic rewards are unique in a run; capped upgrade relics cannot charge the player for no benefit.

Expedition supplies the long arc, Gauntlet offers concentrated boss practice, and Classic preserves the baseline. This avoids requiring every player to commit to the expanded campaign just to reach later attack patterns. The three routes converge on the next authored sector; they are not a claim of dozens of independent levels.

## Visual hierarchy

The flight field is the foreground: player, enemy silhouettes, bullets and telegraphs are more important than ornament. Architecture was moved toward the edges, oversized bright central geometry reduced, and the HUD given controlled contrast. Depth remains divided into non-overlapping scenery and flight ranges. Fog cannot hide flight meshes. Distortion tests use the explicit foreground mask, not only mesh instance counts.

Six palettes are paired with silhouettes: citadel shoulders, factory ribs, terraced ziggurats, pearl vaults, crystalline groves and orbital shells. Small moving conduit segments and asymmetric ring marks communicate motion without requiring fast screen-wide movement. Airframe additions and new boss silhouettes separate combat roles. Stylized shadows establish a visual separation from the floor but are not a physical lighting simulation.

## Why the AI prototype is bounded

The distinctive idea is not 'a chat window next to a shooter'. The request must become a visible, approved combat term. A generated sentence is not allowed to set arbitrary damage, spawn unlimited enemies or replace game code. The current mock and the future model adapter use the same catalog-constrained protocol. An accepted pact invokes the same mechanical function as a card selection; an accepted director response invokes a validated local template.

This is deliberately narrower than an unconstrained AI director. It makes the promise testable: the user can see that a requested reflection build selects a 2.2x reflection pact and accepts its weaker-gun price. The model could later improve interpretation and characterization without becoming the authority over fairness.

## What is not proven

A six-boss completion by an automated pilot is evidence that the content is reachable under those exact inputs, not evidence of good pacing, difficulty, enjoyment or GOTY-level polish. The bot sees exact state and favors safe routes. Screenshots are controlled fixtures; they are not player research. Native phones and WebGPU still need testing.

## Next human validation gate

Recruit a small initial set of first-time players across desktop and portrait touch. Observe without explaining the mechanic first. Record time to first move, first successful reflection, first intentional Nova, and first correct description of a pact's price. Ask whether players can name a decision they would change on another run. Compare deaths caused by unreadable projectiles against deaths caused by a understood risk.

For the longer arc, inspect abandonment at the hangar/route/negotiation screens, time spent deciding versus fighting, which relics are ignored, and whether sectors four through six feel structurally distinct rather than merely harder. Treat any numerical targets as proposed criteria, not achieved metrics. Remove a screen or reduce a choice before adding more content if the first run stalls in menus.

For the AI pilot, separately evaluate semantic correctness, fallback clarity, latency and spend. Keep a mock-vs-live label visible. A useful model integration should improve intentional decision-making, not simply increase text volume.
