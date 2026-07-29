# Toy 7: does the signature approach need a registry change?

**No.** One plugin plus a structured object in a field that is already unconstrained.

Built after the operator ruled out registry changes ("that cascade would be huge") and
after an adversarial review found three of the earlier toys never demonstrated the mode the
real system uses.

## Constraints tested

| | constraint | result |
|---|---|---|
| C1 | `TokenSchema` unchanged -- `value` stays `string \| ColorValue \| ColorReference` | PASS -- `safeParse` VALID |
| C2 | `TokenGraph` unchanged, no new field on `Token` | PASS -- only a plugin was added |
| C3 | `token.dependsOn` untouched through set + cascade | PASS |
| C4 | emission is `var()` NAMES, not resolved values | PASS |

The signature lives in `binding.input`, which `BindingSchema` types as `z.unknown()`.

## Result

```
INITIAL
  dropdown-in    var(--duration-moderate) var(--ease-enter)
  dropdown-out   var(--duration-fast) var(--ease-enter)

after repointing enter tier moderate -> normal
  dropdown-in    var(--duration-normal)
  dropdown-out   var(--duration-moderate)      [pair rule followed]

token.dependsOn after all of that:  unchanged
```

**The cascade derives which REFERENCE, not which value.** That is the mode the sheet
actually uses, and no earlier toy demonstrated it -- `composite-signature` and
`signature-template` both resolved refs to values and rendered `transition-duration: 250ms`
where the real sheet emits `var(--duration-normal)`.

## Why C3 matters

`registry.toToken` (`registry.ts:134-137`) deliberately preserves the persisted
`dependsOn`, because `dependsOn[1]` is the dark counterpart read at `tailwind.ts:88` and
drives the whole dark palette. Cascade edges come from `plugin.dependsOn(binding.input)`
instead. **Two names, two jobs, already separated in code.**

An earlier version of #1962 required deriving `token.dependsOn` from slots. That would have
reordered it and broken dark mode silently.

## The finding that inverts the epic

C3 passing is also the problem. After the repoint, `dropdown-in` emits
`var(--duration-normal)` while its `dependsOn` still reads `motion-duration-moderate`.
DTCG exports read that field.

Today there are **zero** blob/`dependsOn` desyncs across all 13 semantic motion tokens.
This change would create the first one. So the epic does not fix an existing desync -- it
adds derivation and pays for it with a new sync obligation. That is now an acceptance
criterion in #1962 rather than an unstated cost.

## Known flaw in this toy

`signature:exit` rewrites the duration band and **copies the curve verbatim**, so
`dropdown-out` emits `var(--ease-enter)` where it should mirror to `--ease-exit`. A bug in
the toy's rule, not in the approach -- but it is the second pair rule written here that
handled only half the pair, which is worth knowing when #1962 specifies a real one.

## Run

```
pnpm exec tsx apps/toys/no-registry-change/toy.mts
```
