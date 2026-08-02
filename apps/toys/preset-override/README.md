# toy 11 -- preset application vs designer pins

Run: `pnpm exec tsx apps/toys/preset-override/toy.mts`

An intent preset is a value-set over system tokens, applied by Studio.
Designer pins write the same leaves. This toy demonstrates the collision and
what the registry already records.

## Results

- The registry persists `userOverride = { previousValue, reason }` on set().
  Reason strings survive, so writes ARE attributable today -- but only by
  string convention (`designer: ...` vs `studio: ...`).
- NAIVE preset apply (set every token in the value-set) silently clobbers a
  designer pin. No error. The pinned value survives only as
  `userOverride.previousValue` under the preset's own reason -- recoverable
  in principle, attributed to nobody.
- RESPECTFUL apply (skip tokens whose override reason marks a designer
  decision) preserves the pin and moves everything else. Required and
  sufficient.

## The finding that matters downstream

Provenance currently rides a free-text reason string. Before Studio applies
presets for real, provenance wants a real field (`baseline | preset |
designer`), not a string prefix convention -- same conclusion the matrix work
reached for cell assignments (star -> provenance field in the jsonl form).
Preset values in this toy are marked FAKE (999ms) because elegant has no
measured row and inventing one indistinguishable from measured is the
forbidden move.
