# Changelog

All notable changes to `@rafters/ui` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Input ported to the behavior layer -- the text-input archetype across
  three frameworks.** `input.behavior.ts` carries the score (a VALUE-primary
  control: `config.value` controlled/shadows, `state.value` intrinsic seed
  from `defaultValue`, effective read via `effectiveValue`) plus `bindInput`,
  the DOM-native client the `<rafters-input>` web component and the Astro
  `<script>` both perform. React (`input.tsx`) is a thin, drop-in shadcn
  `<input>` surface: it spreads props, composes the consumer's `onChange`, and
  reads the projection declaratively -- no `useBehavior`. `setValue` is gated
  by `disabled`/`readonly`; `onValueChange` fires on a real change comparing
  effective-before against intrinsic-after (so a controlled field still reports
  every edit). The score projects `aria-invalid` (always `true`/`false`),
  `aria-required`, `aria-describedby` to an error id, and `data-state`; it has
  NO effects and NO keymap -- the native `<input>` owns caret, IME, and
  selection -- making this the simplest bind in the family (value-sync + aria).
  React and WC are conformance-verified against the shared harness; `input.astro`
  ships but is unverified (no Astro test harness yet). See
  `docs/spec/components/input.md`.
- **Badge ported to the behavior layer.** `Badge` (React) is now a static
  score (`badge.behavior.ts` + `badge.classes.ts` + `badge.tsx`), imitating
  Container: no state, no actions, no keymap, no motion block. Full oracle
  variant vocabulary preserved (`default | primary | secondary | destructive
  | success | warning | info | muted | accent | outline | ghost | link`),
  plus the `sm | default | lg` size scale. `asChild` is not carried forward
  yet -- deferred, see `docs/spec/components/badge.md`. WC/Astro bindings
  not yet written.
- **Alert, ported to the behavior layer.** `Alert`/`AlertTitle`/`AlertDescription`/
  `AlertAction` join the new behavior-layer tree as the second sweep static
  (imitating Container). `role="alert"` is projected unconditionally by the
  score; the nine-variant severity vocabulary carries forward from the
  oracle with one fix -- each subtle background now pairs with its OWN
  subtle-foreground token instead of the solid variant's foreground, which
  was contrast-tuned for the solid fill. shadcn's `Alert`/`AlertTitle`/
  `AlertDescription` surface is a drop-in match; `AlertAction` is an
  oracle-only addition carried forward unchanged.
- **Container grid placement.** Container now accepts `colSpan` (1-12) and
  `rowSpan` (1-3), the same span vocabulary as `Grid.Item`. A Container placed
  directly inside a `Grid` can carry its own placement, so content no longer
  needs a `Grid.Item` wrapper. Available across all three render targets
  (React, Astro, and the `<rafters-container>` web component via `col-span` /
  `row-span` attributes).
