import { compose, type GlueSlice, type Slice } from '../../lib/compose';
import {
  createBehavior,
  type AriaAttrs,
  type BehaviorSpec,
  type PartIds,
} from '../../lib/contract';
import { updateAriaAttribute } from '../../primitives/aria-manager';
import { createFocusTrap, preventBodyScroll } from '../../primitives/focus-trap';
import { onPointerDownOutside } from '../../primitives/outside-click';
import {
  disclosable,
  isOpen,
  type DisclosableActions,
  type DisclosableConfig,
  type DisclosablePart,
  type DisclosableState,
} from '../../lib/disclosable';

export interface DialogConfig extends DisclosableConfig {
  /** Modal dialogs trap focus, lock scroll, and dismiss on outside
   *  pointerdown. Default: true. */
  modal?: boolean | undefined;
}

export type DialogState = DisclosableState;
export type DialogActions = DisclosableActions;

export type DialogSurfacePart = 'overlay' | 'title' | 'description' | 'close';
export type DialogPart = DisclosablePart | DialogSurfacePart;

export { isOpen };

function isModal(config: DialogConfig): boolean {
  return config.modal !== false;
}

/** Structure-only slice: the parts a dialog has beyond the disclosable
 *  trigger/content pair. Contributes no state and no actions. */
const dialogSurface: Slice<
  DialogConfig,
  Record<never, never>,
  Record<never, never>,
  DialogSurfacePart
> = {
  name: 'dialog-surface',
  parts: {
    overlay: { optional: true },
    title: { optional: true },
    description: { optional: true },
    close: { optional: true },
  },
  initialState: () => ({}),
};

/** The dialog glue: ARIA identity, the Escape contract, and the modal
 *  effect set, written over the merged state. */
const dialogGlue: GlueSlice<DialogConfig, DialogState, { close: undefined }, DialogPart> = {
  kind: 'glue',
  name: 'dialog',
  aria: (state, config, ids) => {
    const open = isOpen(state, config);
    return {
      trigger: {
        'aria-haspopup': 'dialog',
      },
      content: {
        role: 'dialog',
        'aria-modal': isModal(config) ? 'true' : undefined,
        // An empty id means the binding did not render that part; a
        // reference to a missing id is an axe violation, so project absence.
        'aria-labelledby': ids.title || undefined,
        'aria-describedby': ids.description || undefined,
      },
      overlay: {
        'aria-hidden': 'true',
        'data-state': open ? 'open' : 'closed',
      },
      close: {
        'aria-label': 'Close',
      },
    };
  },
  keymap: (event, _state, part) => (part === 'content' && event.key === 'Escape' ? 'close' : null),
  effects: (state, config) => {
    if (!isOpen(state, config) || !isModal(config)) return [];
    return [
      { type: 'focus-trap', part: 'content' },
      { type: 'scroll-lock' },
      {
        type: 'dismiss-on-outside',
        part: 'content',
        action: 'close',
        // Without this, pointerdown on the trigger dismisses the layer and
        // the same gesture's click re-opens it (live defect in the oracle).
        exceptParts: ['trigger'],
      },
    ];
  },
};

export const dialog: BehaviorSpec<DialogConfig, DialogState, DialogActions, DialogPart> = compose(
  'dialog',
  disclosable<DialogConfig>(),
  dialogSurface,
  dialogGlue,
);

/**
 * The DOM-native binding of the dialog score -- the client. The Web Component
 * and the Astro <script> both import THIS; only React reads the projections
 * declaratively. Same shape as bindNavigationMenu, plus the two overlay
 * concerns: PRESENCE (content/overlay are present-but-hidden, toggled on the
 * open axis -- the trapped/dismiss-observed parts must be light DOM so focus-trap's
 * activeElement read and dismiss's document .contains work) and the ONGOING
 * overlay lifecycle. The bind OWNS that lifecycle directly: on the open(+modal)
 * transition it starts the trio -- createFocusTrap(content), preventBodyScroll(),
 * onPointerDownOutside(content) sparing the trigger -- and tears all three down
 * on close/unbind (focus restore rides on the trap's teardown). Level-triggered:
 * started once when it should be active, stopped once when it should not, so the
 * render tick (which fires on every state change) never re-arms a live trap.
 * Enter-only; exit animation waits on Presence.
 */
export function bindDialog(root: HTMLElement): () => void {
  const config: DialogConfig = {
    modal: root.getAttribute('modal') !== 'false',
    defaultOpen:
      root.getAttribute('default-open') === 'true' ||
      root.querySelector<HTMLElement>('[data-part="content"]')?.dataset['state'] === 'open',
  };

  const getPart = (part: string): HTMLElement | null =>
    part === 'root' ? root : root.querySelector<HTMLElement>(`[data-part="${part}"]`);

  const { memory, dispatch } = createBehavior(dialog, config);

  const request = (action: keyof DialogActions): boolean => dispatch(action, config);

  // The modal overlay lifecycle, composed directly from the primitives (no
  // effect runner). While open+modal the trio is live; its cleanups are held
  // here so the level-triggered guard in render() starts it exactly once and
  // stops it exactly once. Teardown runs the cleanups in start order, so the
  // focus-trap's focus restore fires first -- matching the runner it replaces.
  let overlay: Array<() => void> | null = null;
  const startOverlay = () => {
    const content = getPart('content');
    if (!content) return;
    overlay = [
      createFocusTrap(content),
      preventBodyScroll(),
      onPointerDownOutside(content, (event) => {
        const target = event.target as Node;
        // Spare the trigger: without this, pointerdown on it dismisses the
        // layer and the same gesture's click re-opens it (exceptParts).
        if (getPart('trigger')?.contains(target)) return;
        // The native event is in hand here so a binding could veto BEFORE the
        // close dispatch (React's dismissVetoRef path); the DOM-native bind has
        // no veto consumer, so it dispatches close directly -- as it did when
        // the dismiss executor's host.dispatch dropped the event.
        request('close');
      }),
    ];
  };
  const stopOverlay = () => {
    if (!overlay) return;
    for (const cleanup of overlay) cleanup();
    overlay = null;
  };

  // ids READ from the server/author markup, never generated.
  const ids = {} as PartIds<DialogPart>;
  for (const part of Object.keys(dialog.parts) as DialogPart[]) ids[part] = getPart(part)?.id ?? '';

  // The projection is already resolved, so apply it raw (validate:false skips
  // aria-manager's author-input coercion that flips the string 'false').
  const applyProjection = (el: HTMLElement, attrs: AriaAttrs) => {
    for (const [name, value] of Object.entries(attrs)) {
      updateAriaAttribute(el, name as never, value as never, { validate: false });
    }
  };

  const render = () => {
    const state = memory.get();
    const open = isOpen(state, config);
    const projection = dialog.aria(state, config, ids);
    for (const part of Object.keys(projection) as DialogPart[]) {
      const attrs = projection[part];
      const el = getPart(part);
      if (el && attrs) applyProjection(el, attrs);
    }
    // Presence: the overlay and the content container hide off the open axis.
    // The parts stay in light DOM (crawlable, and effects can read them).
    for (const part of ['overlay', 'content'] as const) {
      const el = getPart(part);
      if (el) el.hidden = !open;
    }
    // Level-triggered: present only while open+modal. Start on the false->true
    // transition (after content is un-hidden, so focus-trap can focus into it),
    // tear down on true->false. The overlay handle is the transition guard.
    const shouldBeActive = open && isModal(config);
    if (shouldBeActive && !overlay) startOverlay();
    else if (!shouldBeActive && overlay) stopOverlay();
  };
  const unsubscribe = memory.subscribe(render); // fires immediately: first paint

  const onClick = (event: Event) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-part="close"]')) {
      request('close');
      return;
    }
    if (target.closest('[data-part="trigger"]')) {
      request(isOpen(memory.get(), config) ? 'close' : 'open');
    }
  };
  root.addEventListener('click', onClick);

  const onKeydown = (event: KeyboardEvent) => {
    const partEl = (event.target as HTMLElement).closest<HTMLElement>('[data-part]');
    const part = partEl?.dataset['part'] as DialogPart | undefined;
    if (!part) return;
    const action = dialog.keymap(
      {
        key: event.key,
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
      },
      memory.get(),
      part,
      config,
    );
    if (!action) return;
    event.preventDefault();
    const trigger = getPart('trigger');
    request(action);
    if (action === 'close') trigger?.focus();
  };
  root.addEventListener('keydown', onKeydown);

  return () => {
    unsubscribe();
    stopOverlay();
    root.removeEventListener('click', onClick);
    root.removeEventListener('keydown', onKeydown);
  };
}
