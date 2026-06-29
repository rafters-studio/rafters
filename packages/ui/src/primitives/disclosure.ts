/**
 * disclosure.ts - framework-agnostic single open/close boolean cell.
 *
 * Nine components (dialog, alert-dialog, drawer, sheet, collapsible,
 * dropdown-menu, context-menu, hover-card, tooltip) hand-roll the identical
 * `useState(defaultOpen)` + controlled/uncontrolled dance. This writes that
 * open/close state ONCE on createMemory, parallel to createSelectionGroup, so
 * every framework wrapper stays thin:
 *
 *   - React:  useMemory(disclosure.memory) + disclosure.toggle/open/close
 *   - Astro:  a small <script> that imports this and disclosure.subscribe(...)
 *   - WC/Vue: the same import
 *
 * The cell is the single source of truth. createDisclosure takes NO `controlled`
 * flag and fires NO `onOpenChange`: the controlled/uncontrolled dual-mode lives
 * at the React boundary (the wrapper reflects a controlled prop in via `setOpen`,
 * and fires `onOpenChange` on user actions) - the same split tabs uses
 * (`setValue` programmatic vs `select` + onChange).
 *
 * Visibility / forceMount is NOT disclosure's concern - components reflect open
 * onto the DOM and keep content mounted+hidden (matching the selection family).
 *
 * @example
 * ```ts
 * const d = createDisclosure({ initialOpen: false });
 * const stop = d.subscribe((open) => {
 *   // reflect onto the DOM
 * });
 * d.toggle();
 * stop();
 * ```
 */
import { createMemory, type Memory } from './memory';

export interface DisclosureState {
  open: boolean;
}

export interface DisclosureOptions {
  /** Initial open state. Default false. */
  initialOpen?: boolean;
}

export interface Disclosure {
  /** The reactive cell - for useMemory, select, derive. */
  readonly memory: Memory<DisclosureState>;
  /** Current open state. */
  isOpen(): boolean;
  /** Open. */
  open(): void;
  /** Close. */
  close(): void;
  /** Toggle (reads the live cell). */
  toggle(): void;
  /** Set open to an explicit value (programmatic reflect - the controlled-sync path). */
  setOpen(open: boolean): void;
  /** Subscribe to open changes (fires immediately with current value). */
  subscribe(listener: (open: boolean) => void): () => void;
}

export function createDisclosure(options: DisclosureOptions = {}): Disclosure {
  const { initialOpen = false } = options;
  const memory = createMemory<DisclosureState>(() => ({ open: initialOpen }));

  return {
    memory,
    isOpen: () => memory.get().open,
    open: () => {
      memory.set({ open: true });
    },
    close: () => {
      memory.set({ open: false });
    },
    toggle: () => {
      memory.set({ open: !memory.get().open });
    },
    setOpen: (open) => {
      memory.set({ open });
    },
    subscribe: (listener) => memory.subscribe((state) => listener(state.open)),
  };
}
