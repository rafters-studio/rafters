# Toy 6: must `emit` be a template rather than an ordered join?

**Yes.** Toy 2 used `emit: string[]` with a per-kind assembler, which puts CSS knowledge in
the assembler keyed on `kind` and cannot express a slot used twice in one value.

## The decisive case

```
clip-path: polygon(0 0, 100% 0, 100% calc(100% - {notch}),
                   calc(100% - {notch}) 100%, 0 100%);
```

`{notch}` appears **twice inside one value**. No slot ordering produces a polygon.

## What a template map covers

One format, no per-kind assembler, four cases:

- motion -- `transition-duration: {duration}`
- shadow -- `box-shadow: {x} {y} {blur} {spread} {color}`
- decoration -- the clip-path above
- decoration `::after` -- same format, `target: '::after'`, emits its own block

`param` slots (bound at the use site, `var(--name, default)`) reproduce the huttspawn knob
pattern. `dependsOn` correctly comes back empty for them, since they are not graph refs.

## Known limitation

This toy resolves ref slots to **values** (`slotText`, toy.mts:34-40), rendering
`transition-duration: 250ms`. The real sheet emits `var(--duration-normal)`. See
`no-registry-change` for the correct mode -- that gap was found by adversarial review and
is why the template result alone was not sufficient evidence.

## Deferred

Clip-path and `param` slots are out of scope for the first implementation (operator
ruling). The `emit`-as-template change stands on the shadow and motion cases alone.

## Run

```
pnpm exec tsx apps/toys/signature-template/toy.mts
```
