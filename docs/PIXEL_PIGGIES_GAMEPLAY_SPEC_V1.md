# Pixel Piggies — Gameplay Specification V1

Status: Prototype-ready  
Purpose: Remove ambiguity before Unity development begins

## Player objective

Clear every colored pixel cube by launching piggies in a solvable order. Each piggie attacks cubes matching its color until its ammo reaches zero or no exposed matching target remains.

## Locked prototype rules

1. The board contains colored cubes and optional blockers.
2. The visible queue shows the next six piggies; later piggies remain hidden.
3. Tapping an available piggie sends it to the Bloom Conveyor.
4. Each piggie has one color and a positive integer ammo value.
5. A piggie automatically fires at exposed cubes of its own color.
6. Each successful hit removes one standard cube and consumes one ammo.
7. If ammo reaches zero, the piggie exits successfully.
8. If no valid target remains while ammo is still positive, the piggie moves into one of five Flower Pods.
9. A waiting piggie can be relaunched when a target of its color becomes exposed.
10. A Flower Pod remains occupied until that piggie exits or relaunches.
11. The player loses when a piggie needs a Flower Pod and all five are occupied.
12. The player wins when the board contains no remaining target cubes.
13. Levels are deterministic. The same actions produce the same outcome.
14. Every normal level must be solvable without a booster or purchase.

## Exposed-target rule

For the MVP, a cube is exposed if it is not covered by another cube layer. Piggies may target any exposed matching cube. The game chooses targets using a consistent visual order: lowest layer first, then nearest to the Bloom Conveyor entrance.

This order must remain predictable and visually communicated. Random targeting is prohibited.

## Bloom Conveyor

- Prototype capacity: one active firing piggie at a time
- Later capacity: up to three active positions for advanced levels
- The launch animation cannot delay input longer than necessary
- The player may tap the next piggie while the current attack resolves only after testing confirms readability
- Conveyor congestion must be visible through a capacity meter, not discovered through surprise failure

## Flower Pods

- Maximum: five
- Slots fill left to right
- Tap an eligible waiting piggie to relaunch it
- Ineligible piggies show why they cannot fire
- A full fifth pod triggers warning effects but not immediate loss
- Loss occurs only when another unmatched piggie attempts to enter

## Perfect Flow

- Starts after two piggies exit without entering a Flower Pod
- Increases by one for each consecutive clean exit
- Breaks when a piggie enters a Flower Pod or the player uses a rescue booster
- Visual tiers: x2, x4, x8, x12+
- Prototype reward: extra Bloom Coins at level completion
- Perfect Flow must reward mastery without making normal completion feel bad

## Bloom Burst

When the last cube clears:

1. Freeze gameplay for 100–150 ms.
2. Pull camera toward the completed art.
3. Convert remaining particles into a flower-shaped burst.
4. Animate the finished pixel picture.
5. Show piggie celebration.
6. Award stars, coins, fragments, and Perfect Flow bonus.

Target total celebration: 2.0–2.8 seconds, skippable after first view.

## Stars

- 1 star: complete the level
- 2 stars: finish with no more than three occupied pods
- 3 stars: reach the level’s Perfect Flow target

Stars unlock cosmetic milestones, not mandatory progression gates during the first 30 levels.

## Failure communication

Every failure screen must state the cause:

- Flower Pods Full
- No Space for This Piggie
- Try a Different Color Order

The board remains visible behind the failure panel. Offer in this order:

1. Retry
2. Optional earned/free rescue when appropriate
3. Rewarded rescue after the tutorial period
4. Purchase offer only for qualified returning players

## Prototype boosters

### Pod Pop

Remove one selected waiting piggie and return it to the front of the queue. It does not damage cubes.

### Piggie Swap

Swap the positions of two visible queued piggies.

### Bloom Shuffle

Reorder only the visible queue using a deterministic solvable arrangement. Never claim randomness if the result is curated.

Boosters are disabled for levels 1–7 and introduced through free demonstrations.

## Tutorial philosophy

- Show one instruction at a time
- Require the real action instead of a fake tutorial animation
- Never dim the whole screen longer than necessary
- Use a pulsing piggie and matching cube symbol
- Remove guidance as soon as the player demonstrates understanding
- First failure must teach, not monetize

## Prototype content budget

- Six colors: coral, aqua, sunshine, lime, violet, pearl
- Standard cube
- Covered/layered cube
- Vine lock
- Stone blocker
- Five Flower Pods
- Three boosters
- Twelve collectible piggies

## Questions to answer through testing

1. Should players select from the visible queue or only tap the front piggie?
2. Does one active conveyor position feel strategic enough?
3. How much future queue visibility creates fairness without removing challenge?
4. Is ammo understood without explanation?
5. Is automatic target order predictable?
6. Does the Flower Pod loss condition feel earned?
7. Is Bloom Burst satisfying enough to drive another level?

## Prototype acceptance gates

- 4/5 new testers launch the correct first piggie without coaching
- 4/5 can explain ammo after level 2
- 4/5 understand Flower Pods by level 5
- 80% complete level 7
- Median player voluntarily begins level 8
- No tester describes a deterministic failure as random or unfair

