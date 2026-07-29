# Toy 5: can a designer-authored custom token exist and survive?

Tests the `h2-special` case -- a variant the designer creates, not an override of a shipped
token. Operator ruling: custom tokens get an override by default.

## Result

```
1. userOverride = {"previousValue":"3rem","reason":"designer: custom h2 variant"}
2. validates against TokenSchema:  VALID
3. backed up by --reset:           true
4. pinned against re-derivation:   true
```

Rows 2 and 3 are what override-by-default buys. `--reset` filters on `t.userOverride`
(`init.ts:641`), so without one a designer's token is destroyed silently -- the tokens
directory is replaced and the `reset-<timestamp>.json` beside it does not contain it.

## The cost, row 4

`cascadeFrom` skips any node carrying a `userOverride` (`graph.ts:164`). So a custom token
built from slots -- `h2-special` referencing `font-size-5xl` -- never re-derives. Change
the upstream token and every shipped composite follows while the designer's own variant
silently does not.

One field is carrying two jobs:

- **provenance** -- this is the designer's, preserve it across reset
- **pinning** -- the value was set directly, do not re-derive

A designer-authored composite wants the first without the second, and that is currently
inexpressible.

## Corrected while running

I expected `previousValue` to be `undefined` for a token that never existed, failing
`TokenSchema` (which requires it). Wrong: `define()` seeds a value first, so the subsequent
`set()` always has a real previous value. No round-trip bug.

## Run

```
pnpm exec tsx apps/toys/custom-token/toy.mts
```
