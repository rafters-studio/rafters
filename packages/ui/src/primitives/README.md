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

This package provides `classy`, a lean class builder with:

- Deterministic `cn`-like merging
- Automatic deduplication
- Blocks Tailwind arbitrary bracket syntax by default (enforces design tokens)
- Optional token resolution via `tokenMap`

```ts
import classy from './classy';

// Basic usage
classy('flex items-center', isActive && 'bg-primary');

// With conditionals
classy('btn', { 'btn-disabled': disabled, 'btn-loading': loading });

// Blocks arbitrary values by default
classy('w-[100px]'); // warns and skips
```

API

- `classy(...inputs)` — default instance (no tokenMap, arbitrary classes blocked)
- `createClassy({ tokenMap, allowArbitrary, warn })` — create custom instance
- `token(key)` — mark token references for resolution
- `classy.fill(value, surface)` — the `fill` prop's merge. A value that is exactly one `bg-fill-*` token is returned on its own and replaces `surface`; an empty or absent value returns `surface`; anything else is dropped with a warning and `surface` is returned. It checks the shape only: the registry decides which fills exist.
- `classy.surface(name, base)` — the `surface` prop's merge. A known surface name returns its literal `bg-surface-<name>` class from `SURFACE_CLASSES`; an unknown name returns `base`, with no warning.

Why no tailwind-merge?

`classy` intentionally does NOT resolve Tailwind utility conflicts. If you have `p-4 p-8`, both stay - making overrides explicit and debuggable in the DOM.

The design system should be the source of truth. If you're frequently fighting it with utility conflicts, that's a signal to fix the design system, not paper over it with merge logic.
