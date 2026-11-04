# Primitives — API Reference (Proof of Concept)

This folder contains small, framework-agnostic primitives used by `@rafters/ui` components.

Each primitive is SSR-safe and returns cleanup functions where applicable.

Quick reference

- `createFocusTrap(element: HTMLElement): CleanupFunction`
  - Traps focus inside `element`. Restores previous focus when cleaned up.

- `preventBodyScroll(): CleanupFunction`
  - Locks body scroll and preserves scrollbar width; returns cleanup.

- `getPortalContainer(options?: PortalOptions): HTMLElement | null`
  - Returns portal container (or `null` in SSR). Use `isPortalSupported()` to guard.

- `onOutsideClick(element, handler): CleanupFunction`
  - Calls `handler` when a click/touch occurs outside `element`.

- `onPointerDownOutside(element, handler): CleanupFunction`
  - Pointer-aware outside-down handler with touch fallback.

- `onEscapeKeyDown(handler): CleanupFunction`
  - Calls `handler` for `Escape` key presses.

Notes

- All primitives check `typeof window`/`typeof document` and are no-ops during SSR.
- Prefer `onPointerDownOutside` in modern browsers; `onOutsideClick` is preserved for compatibility and simpler tests.
- Types are exported from `./types.ts` for consistency (`CleanupFunction`, etc.).

Examples

```ts
import { createFocusTrap, preventBodyScroll } from './focus-trap';

const cleanup = createFocusTrap(dialogElement);
// later
cleanup();
```

Class helper

This package provides `classy`, which combines classes and does nothing else. It flattens arrays, drops falsy inputs, takes the keys of an object whose value is truthy, splits on whitespace, removes exact duplicates keeping first position, and joins with one space. Every class it receives comes out, in development and in production, and it never warns.

```ts
import classy from './classy';

// Basic usage
classy('flex items-center', isActive && 'bg-primary');

// With conditionals
classy('btn', { 'btn-disabled': disabled, 'btn-loading': loading });

// Exact duplicates go; everything else stays
classy('a b', 'b c'); // 'a b c'
```

Bracket values are reported by `rafters check`, not by `classy`.

Why no tailwind-merge?

`classy` intentionally does NOT resolve Tailwind utility conflicts. If you have `p-4 p-8`, both stay - making overrides explicit and debuggable in the DOM.

The design system should be the source of truth. If you're frequently fighting it with utility conflicts, that's a signal to fix the design system, not paper over it with merge logic.

surface

What a component paints, resolved at render. It imports nothing, so `FILL_SHAPE` can be compiled and run from this one file.

- `resolveFill(value, base)` — the `fill` prop's merge. A value that is exactly one `bg-fill-*` token is returned on its own and replaces `base`; an empty or absent value returns `base`; anything else is dropped with a warning and `base` is returned. It checks the shape only: the registry decides which fills exist.
- `resolveSurface(name, base)` — the `surface` prop's merge. A known surface name returns its literal `bg-surface-<name>` class from `SURFACE_CLASSES`; an unknown name returns `base`, with no warning.
- `FILL_SHAPE` — the shape a fill must match.
