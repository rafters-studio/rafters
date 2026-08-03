# toy 13 -- per-cell animation composites, in the real token graph

Run: `pnpm exec tsx apps/toys/cell-composite/toy.mts`

Spec #2017 claim 2: each animated matrix cell gets a composite def referencing
ITS assigned tokens. Built on the real `TokenRegistry` with the real
base-system leaves and one plugin (`cell-animation`) whose `binding.input`
carries `{keyframe, tier, curve}` -- the toy-7 shape: no schema change, no
registry change, the composite is an ordinary bound token.

The four cells the spec names, emitted:

```
motion-animation-dialog-content-open    scale-in  var(--rafters-duration-normal)   var(--rafters-ease-enter)
motion-animation-dialog-content-close   scale-out var(--rafters-duration-moderate) var(--rafters-ease-exit)
motion-animation-popover-content-open   scale-in  var(--rafters-duration-moderate) var(--rafters-ease-enter)
motion-animation-popover-content-close  scale-out var(--rafters-duration-fast)     var(--rafters-ease-exit)
```

## Results

**(a) CASCADE.** Retuning `rafters-duration-normal` 350ms -> 220ms re-ran the
composite's transform (1 -> 2) without the composite being touched, and moved
exactly ONE line of the emitted sheet: `--rafters-duration-normal: 350ms` ->
`220ms`. The composite STRING is unchanged, because it is a reference -- that
is the point, not a miss. A separate `registry.bind()` is what moves WHICH var
the cell points at (tier normal -> moderate), so the graph gives both kinds of
change: retune the value, or repoint the reference.

**(b) OVERRIDE -- the one-way door (019fc593).** `registry.set` on the
composite pinned it to a hand literal; the next leaf retune (220ms -> 400ms)
did not reach it -- transform count frozen at 3, value still the pin, while the
unpinned sibling cell cascaded normally. The mechanism, stated plainly:
`TokenGraph.cascadeFrom` SKIPS any node carrying a `userOverride`
(`if (!node || node.userOverride || !node.binding) continue`). It does not
recompute-then-repin; the derivation stops reaching the node. **A pinned
composite stays pinned** -- every later system-wide motion change flows past it
silently. That is the cost of pinning a cell.

MEASURED CAVEAT the reviewer should know: the door has exactly one handle. An
explicit `registry.bind()` writes a fresh node with no `userOverride` and the
cell re-enters the cascade. Verified in the output. Nothing else clears a pin.

**(c) NO SECOND FAST.** Byte-level, every unpinned cell: 2 `var()` references
and zero matches for `/\d+\s*ms/`, `/\b\d+(\.\d+)?s\b/`, `/cubic-bezier|linear\(|steps\(/`,
or a bare number. No cell mints a second copy of a tier or a curve.

**Compiled, and alive.** `.animate-popover-content-open{animation:var(--animate-popover-content-open)}`
with `--animate-popover-content-open: scale-in var(--rafters-duration-moderate) var(--rafters-ease-enter)`,
and both refs resolve in the same sheet (`.25s`, `cubic-bezier(0,0,.2,1)`).
Contrast toy 12: the SHIPPED `motion-animation-*` tokens compile to dangling
`var(--motion-duration-*)` / `var(--rafters-animate-*)` chains. Pointing cell
composites at the five-namespace leaves fixes that as a side effect.

**Naming**, the spec's second open question, is NOT answered here -- this toy
uses cell-keyed names (`dialog-content-open`) because that is what the spec
proposes, and it demonstrates only that such names cost nothing mechanically:
the composites reference shared tiers, so no second `fast` is created. Whether
named cells are permitted for composites remains the operator's word.
