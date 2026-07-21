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

/** The edge the drawer is anchored to. The plain, stated case is `bottom`
 *  (a touch drawer that slides up); top/left/right are position-only parity
 *  with the old surface -- see the component doc's motion dispositions. */
export type DrawerSide = 'top' | 'right' | 'bottom' | 'left';

export interface DrawerConfig extends DisclosableConfig {
  /** Modal drawers trap focus, lock scroll, and dismiss on outside
   *  pointerdown. Default: true. */
  modal?: boolean | undefined;
  /** The edge the drawer is anchored to. Drives position classes only; the
   *  score's ARIA and keymap are edge-independent. Default: 'bottom'. */
  side?: DrawerSide | undefined;
}

export type DrawerState = DisclosableState;
export type DrawerActions = DisclosableActions;

export type DrawerSurfacePart = 'overlay' | 'title' | 'description' | 'close';
export type DrawerPart = DisclosablePart | DrawerSurfacePart;

export { isOpen };

function isModal(config: DrawerConfig): boolean {
  return config.modal !== false;
}

/** The edge the drawer defaults to when none is configured. */
export function drawerSide(config: DrawerConfig): DrawerSide {
  return config.side ?? 'bottom';
}

/** Structure-only slice: the parts a drawer has beyond the disclosable
 *  trigger/content pair. Contributes no state and no actions -- identical to
 *  the dialog surface, because a drawer is an edge-anchored dialog. */
const drawerSurface: Slice<
  DrawerConfig,
  Record<never, never>,
  Record<never, never>,
  DrawerSurfacePart
> = {
  name: 'drawer-surface',
  parts: {
    overlay: { optional: true },
    title: { optional: true },
    description: { optional: true },
    close: { optional: true },
  },
  initialState: () => ({}),
};

/** The drawer glue: ARIA identity and the Escape contract, written over the
 *  merged state. Same dialog role/modal semantics dialog proves; the modal
 *  overlay concerns (focus-trap, scroll-lock, outside-dismiss) are composed
 *  directly by the bindings, not declared here. The `side` config never
 *  reaches this projection -- an anchored panel is still a `role="dialog"`. */
const drawerGlue: GlueSlice<DrawerConfig, DrawerState, { close: undefined }, DrawerPart> = {
  kind: 'glue',
  name: 'drawer',
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
};

/** The parts and dispatch the modal overlay trio composes against. */
export interface DrawerModalPorts {
  /** The drawer surface: focus is trapped inside it and a pointerdown landing
   *  outside it dismisses. */
  content: HTMLElement;
  /** Resolves the trigger so the opening gesture's pointerdown is spared --
   *  otherwise it would both dismiss the layer and re-open it. */
  getTrigger: () => HTMLElement | null;
  /** Outside-pointerdown handler, already spared of the trigger. Receives the
   *  native event so a boundary can offer a consumer veto before closing. */
  onDismiss: (event: Event) => void;
}

/**
 * The modal overlay trio, composed directly (the same shape dialog proves):
 * trap Tab focus inside `content`, lock body scroll, and dismiss on a
 * pointerdown outside `content` -- sparing the trigger. Level-triggered:
 * BOTH the DOM-native bindDrawer and the React Drawer start this on the
 * open+modal transition and call the returned cleanup on close/unmount.
 * Focus restore rides the trap teardown, so the cleanup releases LIFO.
 */
export function startDrawerModalEffects({
  content,
  getTrigger,
  onDismiss,
}: DrawerModalPorts): () => void {
  const releaseTrap = createFocusTrap(content);
  const releaseScroll = preventBodyScroll();
  const releaseDismiss = onPointerDownOutside(content, (event) => {
    const target = event.target as Node;
    if (getTrigger()?.contains(target)) return;
    onDismiss(event);
  });
  return () => {
    releaseDismiss();
    releaseScroll();
    releaseTrap();
  };
}

export const drawer: BehaviorSpec<DrawerConfig, DrawerState, DrawerActions, DrawerPart> = compose(
  'drawer',
  disclosable<DrawerConfig>(),
  drawerSurface,
  drawerGlue,
);

/**
 * The DOM-native binding of the drawer score -- the client. The Web Component
 * and the Astro <script> both import THIS; only React reads the projections
 * declaratively. Same shape as bindDialog: PRESENCE (content/overlay are
 * present-but-hidden, toggled on the open axis -- the trapped/dismissable
 * parts must be light DOM so focus-trap's activeElement read and dismiss's
 * document .contains work) and the modal overlay trio (focus-trap,
 * scroll-lock, dismiss-on-outside), composed directly and level-triggered:
 * started on the open+modal transition and torn down on close/unbind.
 * Enter-only; exit/drag animation waits on Presence (wave 0-B).
 */
export function bindDrawer(root: HTMLElement): () => void {
  const config: DrawerConfig = {
    modal: root.getAttribute('modal') !== 'false',
    defaultOpen:
      root.getAttribute('default-open') === 'true' ||
      root.querySelector<HTMLElement>('[data-part="content"]')?.dataset['state'] === 'open',
  };

  const getPart = (part: string): HTMLElement | null =>
    part === 'root' ? root : root.querySelector<HTMLElement>(`[data-part="${part}"]`);

  const { memory, dispatch } = createBehavior(drawer, config);

  const request = (action: keyof DrawerActions): boolean => dispatch(action, config);

  // The modal overlay trio is level-triggered: present only while open+modal.
  // render() starts it on the transition and this cleanup stops it on close.
  let modalCleanup: (() => void) | null = null;

  // ids READ from the server/author markup, never generated.
  const ids = {} as PartIds<DrawerPart>;
  for (const part of Object.keys(drawer.parts) as DrawerPart[]) ids[part] = getPart(part)?.id ?? '';

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
    const projection = drawer.aria(state, config, ids);
    for (const part of Object.keys(projection) as DrawerPart[]) {
      const attrs = projection[part];
      const el = getPart(part);
      if (el && attrs) applyProjection(el, attrs);
    }
    // Presence: the overlay and the content panel hide off the open axis.
    // The parts stay in light DOM (crawlable, and effects can read them).
    for (const part of ['overlay', 'content'] as const) {
      const el = getPart(part);
      if (el) el.hidden = !open;
    }
    // Compose the modal overlay trio directly, level-triggered: start it once
    // on the open+modal transition (content is now un-hidden above so the trap
    // can read its focusables), tear it down when it should no longer be present.
    const wantModal = open && isModal(config);
    if (wantModal && !modalCleanup) {
      const content = getPart('content');
      if (content) {
        modalCleanup = startDrawerModalEffects({
          content,
          getTrigger: () => getPart('trigger'),
          onDismiss: () => {
            request('close');
          },
        });
      }
    } else if (!wantModal && modalCleanup) {
      modalCleanup();
      modalCleanup = null;
    }
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
    const target = event.target as HTMLElement;
    // Any keydown landing inside the content surface is content-scoped -- this
    // mirrors the React decorator, which hardcodes 'content'. Without it, when
    // the focus-trap's initial focus lands on a focusable descendant (e.g. the
    // close button, data-part="close", the only focusable in a bare drawer),
    // closest('[data-part]') would resolve that part and the content-only
    // Escape keymap would silently fail (WCAG 2.1.1). Same class as the merged
    // alert-dialog fix.
    const content = getPart('content');
    const partEl = target.closest<HTMLElement>('[data-part]');
    const part: DrawerPart | undefined =
      content && content.contains(target)
        ? 'content'
        : (partEl?.dataset['part'] as DrawerPart | undefined);
    if (!part) return;
    const action = drawer.keymap(
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
    modalCleanup?.();
    modalCleanup = null;
    root.removeEventListener('click', onClick);
    root.removeEventListener('keydown', onKeydown);
  };
}
