# Toy 3: can one rule reproduce all thirteen reduced-motion blocks?

Falsifiable check against the real emitted sheet, not a demo. Parses
`apps/demo/.rafters/output/rafters.css`, regenerates each `@utility`'s reduced-motion
block from a candidate rule, and diffs.

## Rule under test

```
properties -> keep non-spatial, drop spatial (transform, grid-template-rows)
duration   -> tier x one global factor
```

## Result 1: the property rule holds, 11 of 13

Reproduces `press`, `toggle`, `dropdown-in/out`, `modal-in/out`, `expand`, `collapse`,
`page`, and correctly predicts that `hover` and `focus` need no block at all (nothing
spatial to drop).

Fails on `motion-sheet-in` / `motion-sheet-out`, and in the predicted direction. Their base
is `transform` ONLY, so the rule predicts an empty property list. They ship `opacity` — a
property absent from the base. They **substitute**, they do not drop.

Consequence: a sheet slides with no fade normally, then fades with no slide under reduced
motion. Every other overlay (`dropdown`, `modal`, `page`) carries `opacity, transform`.
This reads as a missing `opacity` in the sheet's base rather than a deliberate exception —
if the base carried it, the rule would reproduce all thirteen.

## Result 2: no single factor, because they were never scaled

```
implied factors span 0.500 .. 0.833  (67% spread)
best-fit single factor 0.679, worst error +54ms
```

But the shipped values are `100, 100, 150, 150, 250, 250, 200`, and the ladder is
`micro=100  fast=150  moderate=200  normal=300`. Those are **tier values inlined as
literals**, not a scale. The reduced durations were tier references flattened to numbers.

## The stale one

`motion-sheet-in` / `-out` reduce to **250ms, which matches no tier in the current ladder.**
It was `moderate` back when moderate was 250ms. Release 0.0.78 moved moderate to 200ms and
the literal did not follow.

So the reduced-motion branch carries a value stranded by the tier change — in the branch
nobody inspects, which is why no test or review caught it.

## What this suggests

Reduced motion wants a **reference**, like the rest of the system: shift down the ladder.
The `-in` variants drop two bands, the `-out` variants drop one — the same operation the
exit pair rule performs.

A global decimal is still worth having, but for a different job: continuous user control
(`0.5` = reduced rather than eliminated), which nothing today can express. Band shift for
the system default, factor for the user preference. They compose.

## Run

```
pnpm exec tsx apps/toys/reduce-factor/toy.mts
```
