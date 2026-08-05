# toy -- one generated @utility, two consumers (typography handle)

Run: `pnpm exec tsx apps/toys/typography-utility/toy.mts`

Design validation. Nothing outside `apps/toys` changes, no type system is
proposed, and the real typography components and `ARTICLE_ELEMENT_STYLES` are
read but never touched.

`typography-title` is a PROBE HANDLE, not a proposed vocabulary. The role names
are Sean's design work; nothing here proposes one.

## The question

Sean needs H1-H6 components per framework that render identically to a bare
`h1` inside article mode. The proposed mechanism is one generated
`@utility typography-<role>` carrying the whole type bundle as `var()`
references into a `--typography-*` namespace, consumed twice -- once by a
component classes file using the class directly, once by the article base layer
via `@apply`. One definition, two consumers.

Rule 019fc544: a generator-text proof does not transfer. Every answer below is
read out of a sheet the real `@tailwindcss/cli` produced. The base theme is the
real one (`registryToTailwind` over `generateBaseSystem`), compiled with the
same `source(none)` + `@source` treatment `registryToCompiled` applies, so the
probe sits next to the shipped `@theme` and the shipped article base layer
rather than in a vacuum. Minification is off -- the minifier reorders
declarations and question 2 compares declarations.

False-negative guard: under `source(none)` a utility only compiles if a scanned
file mentions it, so the fixture names the classes expected to be PRESENT and
the ones expected to be ABSENT alike. Absence is only evidence when something
asked for it.

## Results -- the mechanism holds

1. **YES, `@apply` reaches a custom `@utility` we generate.** `article h1 {
   @apply typography-title }` compiles to the utility's own declarations:
   `font-family: var(--typography-title-family); font-size:
   var(--typography-title-size); font-weight: var(--typography-title-weight);
   line-height: var(--typography-title-line-height); letter-spacing:
   var(--typography-title-tracking)`. The `var()` references survive -- the
   expansion does not inline computed values, which is what keeps retunes
   flowing. The nested `@container (min-width: 640px)` block also survives the
   expansion intact, which was the likeliest divergence point (the shipped
   typography composites already nest one).

2. **YES, identical.** Both paths produce the same six normalized declarations,
   including the `@container` entry. Diff of the two sets is empty in both
   directions.

3. **`--typography-*` is NOT a Tailwind v4 theme namespace.** The fixture asks
   for `.typography-title-size`, `.typography-title-weight`, and
   `.typography-title-family`; the compiled sheet emits zero rules for all
   three, and exactly ONE rule for `.typography-title`. The control proves the
   probe is live: a `--text-probeglyph` leaf plus an `@utility text-probeglyph`
   compiles to TWO `.text-probeglyph` rules -- `{font-size:9.99rem}` and
   `{font-size:var(--text-probeglyph)}` -- which is exactly the
   duplicate-declaration shape found on `ease-*` in PR 2027. `--text-*` collides,
   `--typography-*` does not.

4. **Retune propagates; the blocks stay byte-identical.** Moving
   `--typography-title-size` from `2.25rem` to `9.5rem` leaves BOTH the
   `.typography-title` block and the `article h1` block byte-for-byte unchanged,
   and both still read `var(--typography-title-size)`. The retune travels
   through the theme leaf, never through regenerated rules -- the toy-9
   invariant.

## The finding that shapes the rework: one handle is not enough

The mechanism works. The BUNDLE does not cover the requirement.

The shipped h1 entry is `text-4xl font-bold tracking-tight mb-4 mt-0
text-accent-foreground`. The proposed type bundle carries the first three. It
does not carry `mb-4`, `mt-0`, or `text-accent-foreground`. So the real article
entry is a MIXED `@apply typography-title mb-4 mt-0 text-accent-foreground` --
compiled here on `article h2`, and it works: every declaration of the custom
utility survives beside the built-ins, `@container` included.

But that means a component writing `class="typography-title"` renders with
DIFFERENT margins and color than a bare `h1` inside article, which is precisely
the requirement it was supposed to satisfy. One definition, two consumers is
mechanically proven and behaviourally incomplete. Either the bundle grows to
carry block spacing and color, or the components carry a second handle. That is
a design decision, not a compiler fact, and this toy does not make it.

## Reported, not resolved

- The custom utility does not speak Tailwind's guard-var protocol. The shipped
  h1 rule emits `--tw-font-weight` and `--tw-tracking` and reads
  `var(--tw-leading, var(--text-4xl--line-height))`; the probe emits plain
  longhands and reads none of them. So `typography-title leading-tight` on a
  component resolves by utility source order, where built-in
  `text-4xl leading-tight` is order-independent. A real difference between the
  two vocabularies, outside the four questions.
- Identical declarations is not identical CASCADE. Path (a) lands in
  `@layer utilities`, path (b) in `@layer base`. In this probe the shipped
  `ARTICLE_ELEMENT_STYLES` `h1` entry is still present, so the compiled sheet
  carries two `article h1` rules and the shipped one still contributes
  `margin-top`, `margin-bottom` and `color`. A real rework REPLACES the `h1`
  entry rather than adding beside it; this toy deliberately did not touch it.
  Whether the component-class path needs a matching layer or specificity story
  is a reviewer decision the compiled evidence does not settle.
