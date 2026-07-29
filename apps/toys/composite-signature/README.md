# Toy 2: one composite format, one plugin

Question: are motion, focus, shadow and fill four different problems, or one?

Answer: **one.** They are all a value assembled from SLOTS, where a slot is either a
reference to another token or a literal. Ran against the real `TokenRegistry`, real
`definePlugin`, real graph.

## The four encodings today

| namespace | encoding | dependsOn |
|---|---|---|
| fill | string + parser (`fill-signature.ts`) | n/a |
| shadow | 5 decomposed part tokens + composite via `var()` | n/a |
| motion | JSON blob in `value` | hand-written |
| focus | JSON blob in `value` | hand-written |

Four answers to one question, and the two that use a blob both carry a hand-maintained
`dependsOn` alongside it — two copies of the same fact with nothing checking they agree.
That is the seam `motion-sheet-out` drifted through.

## The format

```ts
Slot      = { ref: string } | { literal: string | number }
Signature = { kind, slots: Record<string, Slot>, emit: string[] }
```

`slots` names the parts. `emit` gives their order — anything omitted is metadata rather
than output. `kind` discriminates so the assembler formats per namespace without slots
carrying CSS knowledge.

One plugin. `dependsOn` is **derived**:

```ts
dependsOn: (input) => Object.values(input.slots).filter(isRef).map(s => s.ref)
```

## Results

```
INITIAL -- three namespaces, one format, one plugin
  motion-dropdown-in     250ms cubic-bezier(0, 0, 0.2, 1)
  focus-ring             0.125rem solid oklch(0.6 0.2 250)
  shadow-sm              0 1px 2px 0 oklch(0 0 0 / 0.1)

A. dependsOn derived from ref slots
  motion-dropdown-in     ["duration-moderate","ease-enter"]
  focus-ring             ["focus-ring-width","ring"]
  shadow-sm              ["shadow-color"]

C. set ring        -> only focus-ring moved
C. set duration-moderate -> only motion-dropdown-in moved

D. dangling ref
  threw: signature: slot "color" -> "ring-that-does-not-exist" missing
  control (real ref): focus-ring-ok = oklch(0.7 0.25 20)
```

## Findings

1. **`dependsOn` stops being data.** It is a projection of the ref slots. The blob and the
   edge list cannot disagree because there is only one of them.
2. **One plugin covers every composite namespace.** Three kinds here; fill and typography
   are the same shape.
3. **Cascade is precise across namespaces.** Editing `ring` moved focus and left motion and
   shadow alone; editing `duration-moderate` did the reverse.
4. **A dangling reference throws at bind time.** Today a bad `var(--ease-typo)` renders
   nothing and no build step notices. Here it cannot be bound.

## Corrections made while running this

The first version of test D threw `Token not registered: focus-ring-broken` and I nearly
recorded that as a pass. It was the registry refusing to bind an undefined token — a
different guard entirely. `registry.bind` requires `define` first. Fixed by defining the
token, then binding with the bad ref, and adding a control with a good ref so the guard is
shown to discriminate rather than reject everything.

## Open

- `emit` ordering is per-kind CSS knowledge sitting in the signature. It may belong in the
  assembler instead, keyed on `kind`.
- Nested structure: motion's `reducedMotion` block is a signature inside a signature. Flat
  slots do not express that yet.
- Whether `kind` should be the existing `namespace` field rather than a new discriminator.

## Run

```
pnpm exec tsx apps/toys/composite-signature/toy.mts
```
