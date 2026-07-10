# Changelog

All notable changes to `@rafters/ui` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Grid, WC performance.** `grid.element.ts` joins `grid.tsx` as a render
  target of the static score: `<rafters-grid>` is a thin wrapper over
  `grid.behavior.ts` + `grid.classes.ts`, config assembled from attributes
  in, `gridClasses` out. `<rafters-grid-item>` joins it in the same file
  (one performance, two elements, mirroring `grid.tsx`'s `Grid` +
  `Grid.Item`), projecting `data-priority` and the span classes onto its
  OWN host element rather than an inner shadow node -- a parent's
  structural selectors, and any plain ancestor query, cannot see across a
  second shadow boundary. Extends `primitives/behavior-element.ts` (Spec 00
  boundary 3) to wire the effects runner -- Spec 03's documented seam ("WC:
  apply after each patch, stop on disconnect. Not yet written."), earned by
  the conditional `grid-roving` effect (wired when `role="grid"`); the
  first WC performance whose score returns anything from `effects()`.
  `role="grid"` mode is always the linear preset with fixed columns
  (type-gated in `grid.tsx`): each light-DOM child gets a `slot`
  attribute pointing at a named `<slot>` inside a `role=row` > `role=
  gridcell` shadow structure -- the child is never reparented, so the host
  keeps real light-DOM children (an empty host with a literal `role="grid"`
  attribute is a real axe violation, not a shadow-DOM artifact) and the
  round trip between interactive and non-interactive renders is a plain
  attribute flip. The config-input attribute is `grid-role`, not `role`:
  a literal `role` on the light-DOM host is a real, globally-recognized
  ARIA attribute, and leaving `role="grid"` there (with plain slotted
  children, no row wrappers) makes a false structural claim; the real
  `role="grid"` lands on the shadow-root part via the existing aria
  projection. Also fixes `lib/effects.ts`'s `grid-roving` executor to
  resolve the focused element via the queried part's OWN root
  (`getRootNode()`) instead of `document.activeElement`, which does not
  pierce shadow roots -- a latent bug invisible until a WC target existed
  to expose it; verified against React's existing keyboard conformance
  test (unaffected, since `getRootNode()` is `document` for light-DOM
  targets) plus a new WC-specific shadow-root-scoped equivalent. Matrix
  line: `frameworks.behaviorLayer.wc` -> `verified`.
- **Container, WC performance.** `container.element.ts` joins `container.tsx`
  as a render target of the static score -- a thin wrapper with no decisions
  of its own: config assembled from attributes in, `container.classes.ts`
  (the same decoration React uses) out. Carries the WC framework adapter
  (`primitives/behavior-element.ts`, Spec 00 boundary 3: one per framework,
  system-wide -- instance memory, id supply, aria application over
  `RaftersElement`'s lifecycle), the first WC performance in the new grain.
  Custom elements cannot change their own tag, so the semantic element `as`
  chooses (main/header/footer/section/article/aside/div) is built inside the
  shadow root with a default `<slot>` passing light-DOM children through --
  the same landmark-is-the-contract shape React uses, one node removed. No
  client runtime beyond the element itself, no effects (Spec 03); Container
  declares no motion (Spec 04 statics). Conformance runs the shared harness
  (`test/harness/conformance.ts`) against a WC render adapter, sharing its
  scenario suite with the React adapter (`test/components/container/
  conformance-suite.ts`). Matrix line: `frameworks.behaviorLayer.wc` ->
  `verified`.
- **Container grid placement.** Container now accepts `colSpan` (1-12) and
  `rowSpan` (1-3), the same span vocabulary as `Grid.Item`. A Container placed
  directly inside a `Grid` can carry its own placement, so content no longer
  needs a `Grid.Item` wrapper. Available across all three render targets
  (React, Astro, and the `<rafters-container>` web component via `col-span` /
  `row-span` attributes).
