# Changelog

All notable changes to `@rafters/ui` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Card ported to the behavior layer -- the composition archetype, three
  frameworks.** `Card`/`CardHeader`/`CardTitle`/`CardDescription`/
  `CardContent`/`CardFooter`/`CardAction` land across React, the
  `<rafters-card>` web component, and Astro. Card is a pure static: its score
  (`card.behavior.ts`) projects no ARIA, holds no state, runs no effects --
  so there is nothing to bind. There is no `bindCard`, the React controller
  uses no `useBehavior`/`useMemory`, the Astro performance ships no `<script>`,
  and the web component performs no binding. The finding: a pure static's
  framework files are the thinnest possible -- markup + classes + slots. The
  `fill` signature replaces the default `bg-card` surface (colour vocabulary,
  #1637); the deprecated `background` prop and all editor/block/interactive
  props from the oracle are dropped. shadcn's Card family is a drop-in match.
  Conformance runs across React + WC via the shared harness; the Astro file
  SSRs the same `cardClasses` projection.
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
