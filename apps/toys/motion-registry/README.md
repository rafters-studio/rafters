# Toy: motion in the token registry

Question: can motion tokens participate in the registry cascade the way colour does?

Answer: **yes, and the registry needs no changes.** Ran against the real `TokenRegistry`,
the real `definePlugin`, the real graph. Nothing mocked.

## The blocker is the token shape, not the machinery

Today all 70 motion tokens have `binding: null`, so the constructor seeds every one as a
pass-1 leaf and pass 2 never touches them. The 13 semantic tokens carry `dependsOn` arrays,
but re-derivation is keyed on `binding` — `dependsOn` is documentation the graph never
traverses.

The cause is that a semantic motion token's value is a serialized blob:

```
value:     "{\"properties\":[...],\"durationTier\":\"moderate\",\"curve\":\"enter\"}"
binding:   null
dependsOn: ["motion-duration-moderate","motion-easing-enter"]
```

`durationTier: "moderate"` inside the string and `"motion-duration-moderate"` in
`dependsOn` are two hand-maintained copies of one fact, and nothing checks they agree.

Decomposing into scalar parts — the shape shadow already uses, 5 parts plus a composite
via `var()` — makes each part bindable and deletes the second copy.

## What ran

Three plugins, all satisfying the existing `Plugin` contract unchanged:

| plugin | kind | input | depends on | does |
|---|---|---|---|---|
| `motion:tier` | magnitude | `{tier}` | `motion-duration-<tier>` | resolves a tier name to ms |
| `motion:curve` | character | `{role}` | `motion-intent` | **snaps** to one of six anchors |
| `motion:exit` | pair rule | `{enterTier, shortenBy}` | the shorter tier | "greet warmly, leave quietly" |

## Results

```
INITIAL (intent=efficient)
  motion-dropdown-in-duration    250ms
  motion-dropdown-in-curve       cubic-bezier(0, 0, 0.2, 1)
  motion-dropdown-out-duration   150ms
  motion-dropdown-out-curve      cubic-bezier(0.4, 0, 1, 1)

A. set motion-duration-moderate 250ms -> 240ms
  => motion-dropdown-in-duration    250ms  ->  240ms

B. set motion-intent
  => motion-dropdown-in-curve       cubic-bezier(0, 0, 0.2, 1)  ->  cubic-bezier(0.2, 0, 0, 1)
  => motion-dropdown-out-curve      cubic-bezier(0.4, 0, 1, 1)  ->  cubic-bezier(0.6, 0, 1, 1)
     (both durations unmoved)

D. pin dropdown-in-curve, then move intent back
     motion-dropdown-in-curve       cubic-bezier(0.9, 0, 0.1, 1)   [pinned, did not move]
  => motion-dropdown-out-curve      cubic-bezier(0.6, 0, 1, 1)  ->  cubic-bezier(0.4, 0, 1, 1)

  userOverride: {"previousValue":"cubic-bezier(0.2, 0, 0, 1)","reason":"designer pins this one curve"}
```

## Findings

1. **No registry change needed.** The `Plugin` contract, the graph, and the two-pass
   constructor already do this. Motion has been excluded by its own data shape.
2. **Magnitude and character are genuinely independent axes.** In B the curves re-snapped
   and neither duration moved. That separation falls out of having two plugins; it does not
   need enforcing.
3. **Override anchoring works at part granularity.** A designer can pin one curve and keep
   deriving everything else — "everything is editable" holds without losing the cascade,
   because pass 1 seeds an overridden token as an anchor and pass 2 skips it.
4. **One leaf moves the whole system.** `motion-intent` as a single token is enough; one
   `set` re-snapped every bound curve.

## Non-obvious semantics worth a ruling

`motion:exit` binds to the **resolved exit tier**, not to the enter's value. So in A, moving
`moderate` 250 -> 240 moved the enter and left the exit on `fast`/150ms. That is what
"one band shorter" means — the exit tracks a ladder POSITION, not a ratio of the enter.

The alternative reading is that exit should be some proportion of the enter's actual ms, in
which case overriding `moderate` should drag the exit with it. The two diverge as soon as a
designer overrides a tier, which is the normal case rather than the edge case.

## Fabricated data, called out

`__fabricated_second_intent`'s curve values are invented for the mechanism demo. Elegant has
not been designed — the research names it as the next delta and explicitly undecided. The
`efficient` curve set is the researched baseline (legion `019f956f`), and the tier ladder
uses the AGREED values (250/350/500), not the drifted emitted ones (200/300/400).

## Run

```
pnpm exec tsx apps/toys/motion-registry/toy.mts
```

## Lifecycle

CAPTURE (this file) -> MIGRATE (the three plugins and the decomposed token shape, if the
approach is accepted) -> DESTROY (this directory).
