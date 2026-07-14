# Changelog

All notable changes to `@rafters/ui` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Grid re-done on the settled behavior-layer pattern (React + WC + Astro).**
  `Grid` now carries the full three-framework surface: the score plus its
  DOM-native client `bindGrid(root)` live in `grid.behavior.ts`, the
  `<rafters-grid>` web component (`grid.element.ts`) and the Astro performance
  (`grid.astro`) both import that one client, and the React controller
  (`grid.tsx`) drops `useBehavior` for `createBehavior` + `useMemory` +
  `useBehaviorEffects`. Behavior is unchanged: presentation grids stay silent
  furniture (no role), and an honest `role="grid"` still engages the 2D
  grid-roving keyboard contract (Left/Right by 1, Up/Down by columns,
  Home/End). The `role="grid"` opt-in attribute is `grid-role` on the WC/Astro
  host (a bare `role` collides with the platform attribute and trips axe
  before the row/gridcell children exist); the binding projects the real
  `role="grid"` once the structure is present. The shared `grid-roving`
  executor now resolves the focused cell via `getRootNode()` rather than
  `document.activeElement`, so it pierces a shadow tree correctly (identical
  in light DOM).
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
