# Toy 8: does a signature-bound token survive the file round-trip?

**Yes.** `binding` persists, reloads, and the token is `TokenSchema`-valid with no schema change.

Every earlier toy asked "does the registry accept it" -- a behaviour question at the behaviour
layer. The load-bearing question for shipping is a persistence question at a different layer:
`saveRegistryToDir` -> disk -> `loadRegistryFromDir`. If `binding` does not survive, every
earlier result is irrelevant, because the token reloads as a pass-1 leaf and never derives again.

## Result

```
1. in memory:             var(--duration-moderate) var(--ease-enter)
2. binding on disk:       {"plugin":"signature","input":{"kind":"motion",
                           "slots":{"tier":"moderate","curve":"enter"}}}
   dependsOn on disk:     ["motion-duration-moderate","motion-easing-enter"]
   value on disk:         "var(--duration-moderate) var(--ease-enter)"
3. after reload:          var(--duration-moderate) var(--ease-enter)
5. TokenSchema after RT:  VALID
```

Three things land at once, and all three were open questions:

- **`binding.input` serialises as a structured object.** It is typed `z.unknown()`, so the
  signature rides through JSON untouched -- no encoding, no flattening to a string.
- **`value` stays a plain string on disk.** No `TokenSchema` change is needed, which is the
  constraint the operator set ("we don't want to change the registry for this").
- **`dependsOn` persists alongside, unmodified.** The two names stay separated across the file
  boundary, not just in memory.

## Known flaw in this toy: step 4 does not test what it says

Step 4 is labelled "re-derives after reload?" and it does not establish that. It calls
`set()` on the semantic token itself with an explicit value. `set()` records a `userOverride`,
and `userOverride` is a hard stop for the cascade (`graph.ts:164`). So what step 4 actually
shows is narrower: **the `binding` field survives a `set()`** -- present and intact on the node
afterwards. It does not show a cascade re-deriving anything, because the override it just wrote
is precisely what would prevent one.

Worse, the printed result reads as if it did: value moves to `var(--duration-normal)` while the
surviving binding still says `tier: "moderate"`. That is the desync `no-registry-change`
documents, produced here by a different route, and it is easy to misread as successful
re-derivation.

A real re-derivation test sets the **upstream** token -- `motion-duration-moderate` -- and
observes the semantic token follow without being touched. That is the assertion this toy still
owes, and it is the one that matters for #1962.

## Note

Scratch dir is created inside this directory, not `/tmp` -- the repo forbids `/tmp` for work
files, and a persistence toy is exactly the case that reaches for it by reflex. It is removed
in a `finally`.

## Run

```
pnpm exec tsx apps/toys/persist-roundtrip/toy.mts
```
