# Changelog

All notable changes to `@rafters/ui` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Navigation-menu, WC performance.** `navigation-menu.element.ts` joins
  `navigation-menu.tsx` as a render target of the score -- the first
  effectful WC port, and the first to render into light DOM rather than the
  shadow root. Spec 03's `dismiss-on-outside` listens on `document` and
  reads `event.target`, which retargets to the shadow HOST for content built
  inside a shadow root, so a genuine inside click reads as outside and
  closes the menu on it; `roving-focus` and `hover-intent` likewise assume
  one un-shadowed subtree. `<rafters-navigation-menu>` carries
  `data-part="root"` on itself; its shadow root holds nothing but a
  passthrough `<slot>`; every other declared part (list/trigger/content/
  viewport/indicator) is consumer-authored light-DOM markup, discovered by
  `data-part`/`data-value` and enhanced in place -- aria projected on,
  classes merged on, dispatch and the effects runner wired over it. No part
  DOM is built or replaced. Extends the WC adapter
  (`primitives/behavior-element.ts`) with dispatch, memory subscription, and
  the effects runner -- the seam Container's port left unfilled. Conformance
  drives the WC surface directly against the shared harness
  (`test/harness/conformance.ts`): open/close/switch by click, roving arrow
  keys across real light-DOM triggers, Escape-and-refocus, hover-intent
  timing, controlled-value, and the assertion the light-DOM decision exists
  for -- a click on open content must never be misread as outside, only a
  genuinely outside click closes. Matrix line: `frameworks.behaviorLayer.wc`
  -> `verified`.
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
