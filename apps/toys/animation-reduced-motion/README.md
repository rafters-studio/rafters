# toy 14 -- reduced motion for animation cells: which mechanism?

Run: `pnpm exec tsx apps/toys/animation-reduced-motion/toy.mts`

Spec #2017 open question: `motion-reduce:animate-none` on the consuming class
vs zeroing `animation-duration` in the composite emission. Both are compiled
into ONE sheet through the real `@tailwindcss/cli` and read back out of the
compiled CSS -- two cells, one transition-shaped (`dialog-open`) and one loop
(`spinner`, period-backed).

Mechanism B's candidate emission mirrors what the merged exporter already does
for the five namespaces: an `@utility` block with a nested
`@media (prefers-reduced-motion: reduce)`, emitted for transition cells and
omitted for loop cells (`REDUCED_MOTION_ZEROED` omits `period`).

## Results

Compiled blocks under the media query:

```
A  @media (prefers-reduced-motion:reduce){.motion-reduce\:animate-none{animation:none}}   @idx 14430
B  @media (prefers-reduced-motion:reduce){.anim-dialog-open{animation-duration:0s}}       @idx 14195
```

- **Both mechanisms actually work**, differently. A sets `animation:none` -- the
  animation is removed, so the element never reaches the animation's end state.
  B zeroes the duration -- the animation completes instantly, keeping the end
  state. For enter/exit cells that difference is the whole argument: a dialog
  animated in by `scale-in` under A never runs the keyframe at all.
- **Period exemption: expressible under B, not under A.** B emits no
  reduced-motion block for the loop cell at all (verified: no compiled
  reduced-motion rule touches `.anim-spinner`) -- the exemption is set
  membership, data, the same shape as `REDUCED_MOTION_ZEROED`. A compiles to
  ONE cell-blind rule (`.motion-reduce\:animate-none`, naming no cell); the
  exemption exists only if the author remembers not to type that class on a
  spinner. That is consumer discipline, not a system guarantee.
- **They do not double-apply -- one silently swallows the other.** Same
  specificity (one class each), so source order in the compiled sheet decides;
  in this sheet A landed at index 14430 and B at 14195, so A won. That ordering
  is an artifact of where this toy concatenates mechanism B's `@utility` blocks,
  NOT a Tailwind property -- do not read "A always wins" out of it. What IS
  order-independent: wherever A wins, it wins destructively, because
  `animation: none` resets the whole shorthand and discards B's zeroed duration
  and the end state with it. The two never compose; applying both is never
  better than applying B alone.

**ANSWER: mechanism B.** Zero `animation-duration` in the emission. It stops the
motion while preserving the end state, it carries the period exemption as data
rather than as a rule the author has to remember, and it requires nothing of the
consumer. `motion-reduce:animate-none` should not be added alongside it -- where
both appear, A overrides B and reintroduces exactly the failure the law is
about.
