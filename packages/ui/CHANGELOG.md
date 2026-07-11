# Changelog

All notable changes to `@rafters/ui` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Badge ported to the behavior layer.** `Badge` (React) is now a static
  score (`badge.behavior.ts` + `badge.classes.ts` + `badge.tsx`), imitating
  Container: no state, no actions, no keymap, no motion block. Full oracle
  variant vocabulary preserved (`default | primary | secondary | destructive
  | success | warning | info | muted | accent | outline | ghost | link`),
  plus the `sm | default | lg` size scale. `asChild` is not carried forward
  yet -- deferred, see `docs/spec/components/badge.md`. WC/Astro bindings
  not yet written.
- **Container grid placement.** Container now accepts `colSpan` (1-12) and
  `rowSpan` (1-3), the same span vocabulary as `Grid.Item`. A Container placed
  directly inside a `Grid` can carry its own placement, so content no longer
  needs a `Grid.Item` wrapper. Available across all three render targets
  (React, Astro, and the `<rafters-container>` web component via `col-span` /
  `row-span` attributes).
