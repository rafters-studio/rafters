import type { BehaviorSpec } from '../../lib/contract';

/**
 * Kbd: a keyboard key cap. The composition archetype at its thinnest -- a
 * static score with NO config, NO state, NO actions, NO keymap, NO effects,
 * and (like Card and Container) an EMPTY, structural aria projection. The
 * semantic `<kbd>` element carries its own native meaning (a run of keyboard
 * input), so the score projects nothing; the cap is pure decoration (a
 * bordered, muted, monospaced chip) over the consumer's key text.
 *
 * Because the projection is empty and there is nothing to react to, Kbd needs
 * NO client at all: there is no `bindKbd`, the React performance uses no
 * `useMemory`, the Astro performance ships no `<script>`, and the Web
 * Component performs no binding. The score is declared only so the conformance
 * harness can assert the one real contract (the `root` part renders and
 * projects no ARIA) identically across React, the Web Component, and Astro.
 *
 * The oracle (`src/old/ui/kbd.*`) exposes no variants, sizes, or attributes on
 * any of its three targets, so `KbdConfig` is empty by construction -- config
 * in, one class string out.
 */

export type KbdConfig = Record<never, never>;
export type KbdState = Record<never, never>;
export type KbdActions = Record<never, never>;
export type KbdPart = 'root';

export const kbd: BehaviorSpec<KbdConfig, KbdState, KbdActions, KbdPart> = {
  name: 'kbd',
  parts: { root: {} },
  initialState: () => ({}),
  actions: {},
  canDispatch: () => true,
  // The keyboard semantics are native to the `<kbd>` element; the score
  // projects nothing and the harness asserts the empty contract across every
  // framework.
  aria: () => ({ root: {} }),
  keymap: () => null,
  effects: () => [],
};
