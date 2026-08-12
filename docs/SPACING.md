# Spacing

Spacing is the reason one interface feels calm and another feels claustrophobic. It's not padding values. It's rhythm.

## Two Numbers Control Everything

`baseSpacingUnit` is 4px. `progressionRatio` is minor-third (1.2). Change either one and every measurement in the system recalculates.

The base sets where every scale starts. The ratio sets how every scale grows. Spacing, typography, radius and shadow all read the same ratio, which is what keeps them from drifting apart -- a system whose spacing says one thing and whose type says another is incoherent, and one source every namespace reads is the only thing that prevents it.

We chose minor-third because it produces steps that feel connected without feeling repetitive. The jumps are large enough to create hierarchy, small enough to maintain cohesion. Perfect-fourth (1.333) spreads further. Major-second (1.125) compresses tighter. The ratio is a design decision, not a default.

<!-- VENEER: Interactive slider for baseSpacingUnit and progressionRatio. As you drag, show a layout (card with heading, paragraph, button) reflowing in real time. The user sees what 4px base feels like vs 5px vs 6px. Show the progression curve alongside -- how the ratio shapes the scale. -->

## The Scale Is A Progression

Every position is `base * ratio^n`, counting up from position 0. There is no multiplier table -- nothing to pick from, because nothing is picked.

At the shipped default that is 21 rungs:

```
multiplier   1   2   3   4   5   6   7   9  11  13  15  18  22  27  32  38  46  55  66  79  95
px           4   8  12  16  20  24  28  36  44  52  60  72  88 108 128 152 184 220 264 316 380
```

Three rules shape it, and none of them is arithmetic.

**Position 0 is the floor.** Nothing exists below it. A step below the base is a value smaller than the unit everything is built from, and it cannot mean anything. Hairlines and focus rings are not small spacing -- they belong to their own namespaces, which carry their own floors.

**Values round, and it is the multiplier that rounds.** A raster has no fractional pixel. Rounding the *pixel* and dividing back out by the base manufactures quarters -- 17px on a 4px base is multiplier 4.25 -- and a token named `spacing-4.25` breaks anything that reads a name as a number. Rounding the multiplier keeps every name an integer and every value a clean multiple of the base.

**Colliding positions are dropped.** A tight ratio rounds several early positions onto the same value. The scale offers each value once, so it yields fewer rungs than positions. That loss is real and shows up in the token count rather than being papered over with duplicates.

The name is still the multiplier: `spacing-4` means `base * 4`, and `p-4` still reads as "four units."

## Why Not Linear

A linear ladder -- 4, 8, 12, 16, 20 -- looks principled. It is the scale almost every system ships, and it is wrong for what a scale is for.

Measure the step in the only unit that matters, which is how much bigger the next step *looks*:

| linear step | change |
|---|---|
| 4 -> 6px | 50% |
| 8 -> 10px | 25% |
| 32 -> 36px | 12.5% |
| 44 -> 48px | 9.1% |
| 240 -> 256px | 6.7% |

Non-monotonic. A fifty-percent chasm at the bottom with nothing in between; six-percent distinctions at the top, where choosing between two adjacent positions is choosing nothing. A designer working that scale is handed decisions that do not exist and denied ones that do.

The progression is uniform -- the same perceptual step everywhere. It is also *shorter*: 21 positions where the linear ladder needed 34. That density was never generosity. It was compensation for a step size that is wrong at both ends.

## Where The Scale Starts And Stops

Floors and ceilings are decisions, so they are data rather than constants inside a generator. `DEFAULT_SPACING_BOUNDS` lives in `defaults.ts` beside every other default and is passed in, the same way shadow definitions always were. A value buried in a generator is a value no designer can reach.

Shadow carries its own bounds and its own floor at 1px, deliberately below spacing's: a blur thinner than a device pixel does not render, and anchoring shadow where spacing starts would make the smallest shadow heavier than the default one.

## Container and Grid. That's It.

Developers never write padding or margin. Container sets boundaries. Grid sets arrangement.

Container handles the page: max-width, horizontal padding, vertical rhythm, centering. Grid handles the content: sidebar-main, form, cards, row, stack, split.

<!-- VENEER: Side-by-side. Left: a page with raw padding/margin (messy, inconsistent gaps). Right: the same content in Container + Grid (uniform, rhythmic). No code. Just the visual difference. -->

## The Cascade Is Live

Every spacing token is a `calc()` expression referencing the base:

```
spacing-4  = calc(var(--rafters-spacing-base) * 4)
spacing-11 = calc(var(--rafters-spacing-base) * 11)
```

Override the base in a theme and every token updates through CSS custom property resolution. No rebuild. No regeneration. The math is live in the browser.

The ratio is a build-time input rather than a runtime variable, so changing it regenerates. That split is correct: the base scales what exists, the ratio changes *which* positions exist, and a set of tokens cannot appear or disappear through the cascade.

Studio writes values into the `--rafters-*` layer that every theme token points at. That indirection is why applying an intent needs no regeneration -- it is a batch of custom-property writes, not a build.

<!-- VENEER: An editable base value input. Below it, a stack of elements at different scale positions. Changing the base visually reflows everything. The user understands cascade by watching it happen. -->

## Why This Matters

Twenty developers making "looks right" spacing decisions produces twenty different values where there should be six. The system has opinions about which values exist. If the value you need isn't in the scale, the answer is usually that you need a different value, not a new token.

A scale earns that authority only if every step in it means something. That is why the progression is not decoration on top of a multiplier table -- for two years it was exactly that, and every token claimed otherwise (#2031).

<!-- VENEER: Show a "before" layout with 14px, 18px, 22px, 11px scattered spacing values (highlighted in red). Then the "after" with everything snapped to the scale (highlighted in green). The visual noise disappears. -->

## Open

**Scale naming, and the migration under it.** The name is the multiplier today, and the progression's rungs are no longer consecutive -- seventeen positions the component library uses no longer exist. `docs/migration/spacing-2031.md` has the mapping and what each option costs.
