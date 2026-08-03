# toy 12 -- var() inside a @keyframes body, both paths, compiled

Run: `pnpm exec tsx apps/toys/keyframe-extent/toy.mts`

Answers spec #2017's first open question: do var() references inside keyframe
bodies survive BOTH emission paths and Tailwind compilation identically? Rule
019fc544 says a generator-text proof does not transfer, so both sheets go
through the real `@tailwindcss/cli` -- path A via `registryToCompiled`, path B
by compiling `registryToTailwindStatic` output with the same
`source(none)` + `@source` treatment.

The keyframe token is retuned to the spec's literal proposal:
`from { transform: scale(var(--rafters-extent-pop)); opacity: 0; } to { transform: scale(1); opacity: 1; }`

False-negative guard: with `source(none)` a utility only compiles if a scanned
file mentions it, so every assertion is two-stage -- first the consuming rule
(`.animate-scale-in`), then the `@keyframes` block and the var inside it.

## Results

- YES, both paths, compiled. The emitted `@keyframes scale-in` block is
  byte-identical between `tokensToTailwind` and `registryToTailwindStatic`, and
  after minification BOTH compiled sheets carry
  `@keyframes scale-in{0%{transform:scale(var(--rafters-extent-pop));opacity:0}to{opacity:1;transform:scale(1)}}`.
  Not inlined, not stripped, not dropped. The minifier rewrites `from` to `0%`
  and reorders declarations; the var reference is untouched.
- The leaf is declared in the same sheet in both paths:
  `--rafters-extent-pop: .95`. `generateMotionNamespaceVars` runs in both
  emission paths, so the reference is not dangling.
- SEPARATE DEFECT FOUND, and it is the one that matters: the keyframe surviving
  is necessary, not sufficient. The consuming rule is
  `.animate-scale-in{animation:var(--animate-scale-in)}`, and that chain is
  DANGLING in both paths today:
  - path A: `--animate-scale-in: scale-in var(--motion-duration-normal) var(--motion-easing-spring-snappy)`
    -- neither `--motion-duration-normal` nor `--motion-easing-spring-snappy` is
    declared anywhere in the compiled sheet.
  - path B: `--animate-scale-in: var(--rafters-animate-scale-in)` -- and nothing
    declares `--rafters-animate-scale-in`.
  So every `motion-animation-*` token compiles to an animation that does not
  run. Giving extent-pop a consumer inside the keyframe works; the animation
  wrapper around it is broken independently of this spec question. Toy 13 shows
  a per-cell composite whose refs DO resolve compiled.
- NAME COLLISION, reported not resolved: the merged exporter routes extents
  through a fixed alias (`extent: '--rafters-consumed-extent'` in
  `MOTION_NAMESPACE_PROPERTY`), so `@utility extent-pop` publishes the chosen
  extent under `--rafters-consumed-extent`. The spec text names the LEAF
  directly inside the keyframe body. Both compile; they are different
  consumption contracts, and the reviewer picks one.
