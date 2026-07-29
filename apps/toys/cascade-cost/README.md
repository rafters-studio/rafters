# Toy 4: what does the cascade actually cost?

I claimed two performance problems from reading `graph.ts` and never measured either.
Measured here against the real default system (820 tokens), not a fixture.

## The claims

1. Construction is O(n^2) in deep clones — `takeSnapshot()` clones every node, and
   `bind()` calls it once per bound token.
2. `collectDependents` has no reverse index, so every `set()` rescans all nodes and
   re-invokes `plugin.dependsOn`.

## Measured

```
tokens: 820   bound: 414 (50%)
generateBaseSystem:  41ms
new TokenRegistry:  359ms

construction scaling
  n=205     2ms    0.009 ms/token
  n=410   125ms    0.306
  n=615   288ms    0.469
  n=820   340ms    0.414

set() cost
  primary                   2.1ms
  neutral                   7.4ms
  background                1.2ms
  radius-base               1.2ms
  motion-duration-moderate  1.2ms

scrub (repeated set on one token)
   1 set    2.1ms each
  10 sets   1.4ms each
  30 sets   1.3ms each
```

## Verdict

**Claim 2 is real but harmless.** The missing reverse index is visible — `neutral` costs
6x the others because everything derives from it and `collectDependents` rescans all nodes
per queued name. But 7.4ms is still inside a 16.7ms frame.

**Claim 1 is wrong as stated.** Construction is superlinear, not quadratic, and the scaling
shows why: cost tracks BOUND tokens, not total. The first 205 are nearly free at 2ms
because they are mostly leaves; cost appears as bindings do.

**Scrubbing is fine.** 1.3ms per set is about twelve sets per frame. The interaction I was
most worried about is the one with the most headroom.

## What survives

Construction at 359ms is one-time and invisible in Studio, where a registry is built once.
It matters only where many registries are built — rafters+ holding multiple versions would
pay it per version (~3.6s for ten).

So the issue worth filing is narrow: construction cost under multi-version load. Not an
interaction problem, and not worth optimising for Studio.

## Method note

The subset test slices `allTokens` by index, so a subset can cut a binding off from its
parent. It did not throw here, but a fair scaling test would slice by dependency closure
rather than array position.

## Run

```
pnpm exec tsx apps/toys/cascade-cost/toy.mts
```
