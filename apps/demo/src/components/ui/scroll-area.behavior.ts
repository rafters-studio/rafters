import type { BehaviorSpec } from '@/lib/contract';

/**
 * ScrollArea: a styled scroll container. The composition archetype -- a static
 * score with NO state, NO actions, NO keymap, NO effects, and (like Container
 * and Card) an EMPTY, structural aria projection. Native scroll owns the
 * behaviour: momentum, keyboard scrolling, focus order are all the browser's,
 * untouched. The score adds only decoration -- a custom-styled scrollbar over
 * native overflow, plus the orientation switch (which axis overflows).
 *
 * Because the projection is empty and there is nothing to react to, ScrollArea
 * needs NO client at all: there is no `bindScrollArea`, the React performance
 * uses no `useBehavior`/`useMemory`, the Astro performance ships no `<script>`,
 * and the Web Component performs no binding. This is the pure-static finding
 * Card records -- the framework files are the thinnest possible: markup +
 * classes + slots, nothing more. The oracle (`src/old/ui/scroll-area.tsx`) was
 * CSS-only too: no handlers, no state, no scroll-position tracking. Porting a
 * scrolling reducer would REINVENT what the oracle deliberately left to the
 * platform, so the score stays static and faithful.
 *
 * The score is declared only so the conformance harness can assert the one
 * real contract (the `root` part renders and projects no ARIA) identically
 * across React, the Web Component, and Astro.
 *
 * The composition companion `ScrollBar` (shadcn's decorative custom-scrollbar
 * track) carries no behaviour of its own -- it is a plain framework wrapper
 * over literal class strings, composed by the consumer inside a ScrollArea.
 * Only `ScrollArea` is a declared part, because it is the only node with a
 * contract to project (boundary 5).
 */

/** Which axis (or both) overflows. `both` is the rafters extension over the
 *  shadcn base's vertical/horizontal. */
export type ScrollAreaOrientation = 'vertical' | 'horizontal' | 'both';

/** A decorative ScrollBar track is single-axis (shadcn's ScrollBar surface). */
export type ScrollBarOrientation = 'vertical' | 'horizontal';

export interface ScrollAreaConfig {
  /** Scroll direction. Default `vertical`. */
  orientation?: ScrollAreaOrientation | undefined;
}

export type ScrollAreaState = Record<never, never>;
export type ScrollAreaActions = Record<never, never>;
export type ScrollAreaPart = 'root';

export const scrollArea: BehaviorSpec<
  ScrollAreaConfig,
  ScrollAreaState,
  ScrollAreaActions,
  ScrollAreaPart
> = {
  name: 'scroll-area',
  parts: { root: {} },
  initialState: () => ({}),
  actions: {},
  canDispatch: () => true,
  // Native scroll owns every semantic; the score projects nothing and the
  // harness asserts the empty contract across every framework.
  aria: () => ({ root: {} }),
  keymap: () => null,
};
