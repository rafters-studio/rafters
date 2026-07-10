# Changelog

All notable changes to `@rafters/ui` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Dialog, Astro performance.** `dialog.astro` joins `dialog.tsx` as the
  static score's fifth render target -- but renders only the CLOSED state,
  never the open one. The `open` state is not a static fact: it is the
  `content`/`overlay`/`close` parts held up by `focus-trap`, `scroll-lock`,
  and `dismiss-on-outside` (all effects, Spec 03) plus an Escape `keymap`
  dispatched through a loop this tier does not have. Rendering that
  structure anyway -- `role="dialog" aria-modal="true"` with no real trap
  and no way out -- would be the same 4.1.2 lie `grid.md`'s dropped
  `role="grid"` was ruled against, so `content`, `overlay`, `title`,
  `description`, and `close` are dropped for this tier, not merely
  un-rendered. `open`/`defaultOpen`/`modal` are not exposed as props since
  none of them changes this tier's one renderable state -- a knob with no
  observable effect is its own dishonesty -- but `dialog.initialState({})`
  and `dialog.aria` still run for real, so the closed-state trigger aria
  (`aria-haspopup="dialog"`, `aria-expanded="false"`, `data-state="closed"`,
  no dangling `aria-controls`) is score-derived, not hand-authored. There is
  no base trigger class in `dialog.classes.ts` (the React `DialogTrigger`
  ships unstyled), so the consumer's `class` passes straight through with no
  decoration to merge. Conformance (`dialog.astro.conformance.test.ts`,
  container's standalone `AstroContainer` pattern) ports only the React
  suite's "closed" scenario; open/trap/Escape/dismiss/veto scenarios drop
  along with the state, not skip-registered. Documented in
  `docs/spec/components/dialog.md`'s new Astro-performance section. Matrix
  line: `frameworks.behaviorLayer.astro` -> `verified`.
- **Grid, Astro performance.** `grid.astro` (plus `grid-item.astro`) joins
  `grid.tsx` as the second render target of the score (`grid.behavior.ts`):
  config in, `gridClasses` and `grid.aria`'s `data-preset`/`data-columns`
  projection out, server-rendered once. `GridItem`'s placement channel
  (`gridItemAttrs` -- items declare `data-priority`, the stock layouts place
  by that projection) ports unchanged. `role="grid"` is dropped for this
  tier, not merely un-rendered: the ARIA grid pattern needs the row/gridcell
  chunking React does via `React.Children.toArray` (Astro's slot model has
  no child-enumeration primitive to chunk by) and the `grid-roving` keyboard
  contract, which is an effect ("Astro: no client runtime, no effects" --
  Spec 03). `grid.md` rules `role="grid"` "honest or absent"; rendering the
  role with no row structure and no keyboard behind it is the exact defect
  the oracle (`src/old/ui/grid.astro`) was flagged for, so absent is the
  only honest choice -- `Props` omits `role`
  (`Omit<HTMLAttributes<'div'>, 'role'>`, mirroring `grid.tsx`'s own
  `Omit`) so the attribute passthrough cannot reopen it. Presets, patterns,
  columns, gap/padding, and spans are unaffected: they are config, and
  config is exactly what a static render can honor.
  Conformance ports the layout-grid/reordering/span scenarios from the
  React suite (`grid.astro.conformance.test.ts`, container's standalone
  `AstroContainer` pattern since grid has no shared adapter suite); the
  role=grid row/gridcell/roving scenarios are dropped along with the
  feature. Matrix line: `frameworks.behaviorLayer.astro` -> `verified`.
- **Button, Astro performance.** `button.astro` joins `button.tsx` as the
  second render target of the score (`button.behavior.ts`), server-rendered
  and static: it computes the initial contract from config --
  `button.initialState`, `buttonClasses`, `button.aria` -- and renders it
  once, with no client runtime, no effects (Spec 03: the `announce` effect
  needs an executor a static render doesn't have), and no keyboard branches
  (a native `<button>` already fires click on Enter/Space). `toggle` +
  `defaultPressed` still render correctly since they're config, not
  interaction. Ids are inputs the behavior never generates (Spec 01 rule 3);
  this tier has no id-supplying adapter and pressable's `aria` projection
  never reads them, so empty strings satisfy the signature without inventing
  machinery. Conformance reuses the button suite (`conformance-suite.ts`)
  through a new `supportsInteraction` adapter flag: the static/axe/contract
  assertions run for every scenario, the three keyboard/click assertions
  (which assume a dispatch loop this tier doesn't have) are opted out.
  Matrix line: `frameworks.behaviorLayer.astro` -> `verified`.
- **Container, Astro performance.** `container.astro` joins `container.tsx`
  as the second render target of the static score -- a thin wrapper with no
  decisions of its own: config in, `container.classes.ts` (the same
  decoration React uses) out. The `as` element switch is resolved through
  Astro's dynamic-tag support (one capitalized variable) instead of the
  oracle's one-branch-per-element repetition. No client runtime, no effects
  (Spec 03); Container declares no motion (Spec 04 statics). Conformance
  runs the shared harness (`test/harness/conformance.ts`) against Astro's
  Container API unmodified, in its own vitest project
  (`vitest.config.astro.ts`, via `astro/config`'s `getViteConfig`) since
  importing `.astro` needs Astro's Vite transform, which the React
  project's plugin set does not provide -- `pnpm test:unit` now runs both
  projects. Matrix line: `frameworks.behaviorLayer.astro` -> `verified`.
- **Container grid placement.** Container now accepts `colSpan` (1-12) and
  `rowSpan` (1-3), the same span vocabulary as `Grid.Item`. A Container placed
  directly inside a `Grid` can carry its own placement, so content no longer
  needs a `Grid.Item` wrapper. Available across all three render targets
  (React, Astro, and the `<rafters-container>` web component via `col-span` /
  `row-span` attributes).
