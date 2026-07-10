# Changelog

All notable changes to `@rafters/ui` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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
