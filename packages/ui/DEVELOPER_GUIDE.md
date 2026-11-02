## Rafters UI — Developer Guide

Purpose
 - Give a concise reference for implementing primitives and components in `packages/ui`.
 - Capture the decisions made in the primitives proof-of-concept (Dialog) so future work is consistent.

Goals & Principles
 - Keep primitives framework-agnostic and SSR-safe. Primitives operate on raw DOM nodes, return a cleanup function, and are no-op on server.
 - Favor explicitness over magic: token resolution is opt-in via `createClassy({ tokenMap })`.
 - Styling is token-first. Avoid arbitrary Tailwind bracket classes by default; use tokens or known utility classes.
 - Keep component APIs small, predictable, and consistent with the shadcn/Radix patterns used in the POC.

Repository layout (relevant)
 - `packages/ui/src/primitives/` — simple DOM helpers and utilities (focus-trap, portal, outside-click, escape-keydown, preventBodyScroll, classy).
 - `packages/ui/src/components/ui/` — components built on top of primitives (Dialog POC lives here).
 - `packages/ui/test/` — unit tests for primitives and components (use `happy-dom` test environment in Vitest).

Primitives: API patterns and checklist
 - SSR-safe: always check for DOM availability and return a no-op cleanup when server-side.
 - Return cleanup: every primitive that attaches listeners or state must return a single cleanup function that removes listeners and restores state.
 - Lightweight: avoid large dependencies; primitives should be tiny wrappers around platform APIs.
 - Accept options for behavior (debounce, thresholds, etc.) and take explicit callbacks.

Existing primitives (summary)
 - `createFocusTrap(element)` — trap Tab and Shift+Tab inside a container, returns cleanup; use for modal dialogs.
 - `preventBodyScroll()` — apply overflow:hidden and restore on cleanup (supports nested locks if needed).
 - `onPointerDownOutside(target, handler)` — call handler when a pointer/touch event starts outside `target`.
 - `onEscapeKeyDown(handler)` — call handler when Escape key is pressed; returns cleanup.
 - `getPortalContainer({ container, enabled })` — SSR-safe portal container resolver.
 - `classy` — single smart class builder (explicit, synchronous, opt-in tokenMap). Use `classy('a', someVar, { active: isActive })`.

Class building and tokens
 - Use the `classy` utility to merge and deduplicate classes. `classy` splits multi-class strings, handles objects and arrays, and supports an optional `tokenMap`.
 - Token resolution must be provided explicitly with `createClassy({ tokenMap })`. Do not wire global token registries implicitly in primitives or components.
 - Example usage:

  ```ts
  import classy, { createClassy, token } from '../primitives/classy';

  // Default singleton (no tokens):
  const cls = classy('fixed inset-0', isOpen && 'open');

  // Opt-in token map:
  const c = createClassy({ tokenMap: (k) => ({ 'spacing.4': 'p-4' }[k] ?? null) });
  c('btn', token('spacing.4')) // -> 'btn p-4'
  ```

Dialog POC notes (how it uses primitives)
 - Accessibility: Dialog uses ARIA props helpers and stable ids to wire label/description relationships.
 - Focus management: `createFocusTrap` is used when the dialog opens in modal mode.
 - Body scroll lock: `preventBodyScroll()` is applied while modal is open and cleaned up on close.
 - Outside interaction: `onPointerDownOutside` closes the dialog when clicking/tapping outside unless event is prevented by consumer.
 - Escape handling: `onEscapeKeyDown` closes dialog unless prevented by consumer code.
 - Portals: `Dialog.Portal` uses `getPortalContainer` to render into a client-side container and is SSR-safe.
 - Styling: `DialogOverlay` and `DialogContent` were updated to use `classy` for class merging and to avoid Tailwind arbitrary bracket classes.

Button semantic variants and accessibility
 - Use semantic token names for colors following the pattern `bg-<name> text-<name>-foreground` (e.g. `bg-primary text-primary-foreground`). The design-system build maps token names to concrete utility classes.
 - Implement semantic variants: `primary`, `secondary`, `info`, `success`, `warning`, `alert`, `destructive`, plus `ghost`, `link`, and `outline`.
 - Ensure focus styles use `focus-visible` and include `focus-visible:ring-<token>`.
 - Motion: prefer `prefers-reduced-motion` support. Use `motion-safe:` and `motion-reduce:` utilities for animations.
 - Accessibility: every button must have an accessible name (text children or `aria-label`/`aria-labelledby`). The Button warns in dev if missing. For `asChild` anchors, the component will set `aria-disabled` and intercept activation when disabled.
 - WCAG guidance: token naming should include contrast-safe tokens (e.g. `bg-primary-contrast` or `bg-primary-hover`) to ensure AAA contrast; audit tokens in the design-system mapping.

Testing guidelines
 - Put unit tests in `packages/ui/test/` mirroring the `src/` shape to avoid duplicate test discovery.
 - Use `happy-dom` for DOM-based unit tests. Each test file should clean up DOM state after itself.
 - Test primitives for: SSR no-op behavior, returned cleanup effectiveness, and expected interactions (key, pointer, focus).

Contribution checklist for new primitives
 - Add file under `src/primitives/`, export from package index if public.
 - Implement SSR guard at top of function if needed.
 - Return a single cleanup function and document side effects clearly in a short JSDoc comment.
 - Add unit tests under `test/primitives/` covering normal behavior, cleanup, and SSR fallback.
 - Avoid coupling to `classy` token map or any global runtime features.

Where to look for examples
 - Dialog implementation: `packages/ui/src/components/ui/dialog.tsx` — a complete POC wiring primitives into a component.
 - Primitives: `packages/ui/src/primitives/*` — look at `focus-trap`, `outside-click`, `portal`, and `escape-keydown` for patterns.
 - Tests: `packages/ui/test/primitives/*` and `packages/ui/test/components/*` for unit test patterns and `happy-dom` usage.

Next steps
 - Keep the primitives list minimal and implement new ones only when a concrete component needs them.
 - If you want, I can convert this guide into a short Markdown in `docs/` or expand with code snippets for each primitive.

---
Generated by the rafters POC work to provide a concise working reference for future component and primitive development.
