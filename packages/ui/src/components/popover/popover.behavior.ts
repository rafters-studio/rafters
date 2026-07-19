import { compose, type GlueSlice, type Slice } from '../../lib/compose';
import {
  createBehavior,
  type AriaAttrs,
  type BehaviorSpec,
  type PartIds,
} from '../../lib/contract';
import {
  disclosable,
  isOpen,
  type DisclosableActions,
  type DisclosableConfig,
  type DisclosablePart,
  type DisclosableState,
} from '../../lib/disclosable';
import { updateAriaAttribute } from '../../primitives/aria-manager';
import { computePosition } from '../../primitives/collision-detector';
import { onPointerDownOutside } from '../../primitives/outside-click';
import type { Align, Side } from '../../primitives/types';

/**
 * Popover: an anchored, non-modal floating panel. It shares the disclosable
 * open/close axis with dialog, but it does NOT trap focus, lock scroll, or
 * cover the page -- it is a light-dismiss overlay positioned against its
 * trigger (or a distinct anchor).
 */
export type PopoverConfig = DisclosableConfig;

export type PopoverState = DisclosableState;
export type PopoverActions = DisclosableActions;

export type PopoverSurfacePart = 'anchor' | 'close';
export type PopoverPart = DisclosablePart | PopoverSurfacePart;

export { isOpen };

export const DEFAULT_SIDE: Side = 'bottom';
export const DEFAULT_ALIGN: Align = 'center';
export const DEFAULT_SIDE_OFFSET = 4;
export const DEFAULT_ALIGN_OFFSET = 0;

/** The anchor/align intent for positioning. This is decorator/view config --
 *  NOT score config: the resolved side is post-collision ephemeral DOM state,
 *  so the pure score never projects data-side/data-align. */
export interface PopoverPositionOptions {
  side?: Side | undefined;
  align?: Align | undefined;
  sideOffset?: number | undefined;
  alignOffset?: number | undefined;
}

/** Structure-only slice: the parts a popover has beyond the disclosable
 *  trigger/content pair. Contributes no state and no actions. The anchor is
 *  the optional positioning reference (defaults to the trigger); close is the
 *  optional in-panel dismiss control. */
const popoverSurface: Slice<
  PopoverConfig,
  Record<never, never>,
  Record<never, never>,
  PopoverSurfacePart
> = {
  name: 'popover-surface',
  parts: {
    anchor: { optional: true },
    close: { optional: true },
  },
  initialState: () => ({}),
};

/** The popover glue: the dialog-role identity and the Escape contract. No
 *  focus-trap and no scroll-lock -- popover is deliberately non-modal. The
 *  light-dismiss (outside-pointerdown) is composed directly by the bindings,
 *  not declared here. */
const popoverGlue: GlueSlice<PopoverConfig, PopoverState, { close: undefined }, PopoverPart> = {
  kind: 'glue',
  name: 'popover',
  aria: () => ({
    // aria-expanded / aria-controls / data-state come from disclosable.
    trigger: { 'aria-haspopup': 'dialog' },
    content: { role: 'dialog' },
  }),
  keymap: (event, _state, part) => (part === 'content' && event.key === 'Escape' ? 'close' : null),
};

export const popover: BehaviorSpec<PopoverConfig, PopoverState, PopoverActions, PopoverPart> =
  compose('popover', disclosable<PopoverConfig>(), popoverSurface, popoverGlue);

/**
 * Position the content against the anchor -- a framework-affordance shared by
 * every decorator. Composes the collision-detector primitive (the positioning
 * math) and applies the result with fixed positioning, exactly as the old
 * Float substrate did. The resolved side/align land as data-side/data-align on
 * the content so the enter/exit slide variants key off the real placement.
 */
export function positionPopover(
  anchor: HTMLElement | null,
  content: HTMLElement | null,
  options: PopoverPositionOptions = {},
): void {
  if (!anchor || !content) return;
  const result = computePosition(anchor, content, {
    side: options.side ?? DEFAULT_SIDE,
    align: options.align ?? DEFAULT_ALIGN,
    sideOffset: options.sideOffset ?? DEFAULT_SIDE_OFFSET,
    alignOffset: options.alignOffset ?? DEFAULT_ALIGN_OFFSET,
  });
  content.style.position = 'fixed';
  content.style.left = '0';
  content.style.top = '0';
  content.style.transform = `translate(${Math.round(result.x)}px, ${Math.round(result.y)}px)`;
  content.setAttribute('data-side', result.side);
  content.setAttribute('data-align', result.align);
}

/** Move focus to the first focusable descendant of the content -- a
 *  framework-affordance (non-modal, so no trap). Edge-triggered on open. */
export function focusFirst(content: HTMLElement | null): void {
  if (!content) return;
  const focusable = content.querySelector<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  focusable?.focus();
}

function numberAttribute(root: HTMLElement, name: string): number | undefined {
  const raw = root.getAttribute(name);
  if (raw === null) return undefined;
  const value = Number(raw);
  return Number.isNaN(value) ? undefined : value;
}

/**
 * The DOM-native binding of the popover score -- the client the Web Component
 * and the Astro <script> both import. Only React reads the projections
 * declaratively. Two overlay concerns beyond the pure score: PRESENCE (content
 * is present-but-hidden, toggled on the open axis) and the framework
 * affordances (positioning + focus-first, edge-triggered on open; reposition
 * on scroll/resize while open). Non-modal, so the only composed primitive is
 * the outside-pointerdown light-dismiss (onPointerDownOutside), started on the
 * open edge and torn down on close/unbind -- sparing the trigger and anchor so
 * a toggle gesture does not dismiss then re-open. Enter-only; exit animation
 * waits on Presence.
 */
export function bindPopover(root: HTMLElement): () => void {
  const contentEl = root.querySelector<HTMLElement>('[data-part="content"]');
  const config: PopoverConfig = {
    defaultOpen:
      root.getAttribute('default-open') === 'true' || contentEl?.dataset['state'] === 'open',
  };
  const positionOptions: PopoverPositionOptions = {
    side: (root.getAttribute('side') as Side | null) ?? undefined,
    align: (root.getAttribute('align') as Align | null) ?? undefined,
    sideOffset: numberAttribute(root, 'side-offset'),
    alignOffset: numberAttribute(root, 'align-offset'),
  };

  const getPart = (part: string): HTMLElement | null =>
    part === 'root' ? root : root.querySelector<HTMLElement>(`[data-part="${part}"]`);

  const { memory, dispatch } = createBehavior(popover, config);

  const request = (action: keyof PopoverActions): boolean => dispatch(action, config);

  // The light-dismiss is level-triggered: present only while open. render()
  // starts it on the open edge and this cleanup stops it on close.
  let dismissCleanup: (() => void) | null = null;

  // ids READ from the server/author markup, never generated.
  const ids = {} as PartIds<PopoverPart>;
  for (const part of Object.keys(popover.parts) as PopoverPart[])
    ids[part] = getPart(part)?.id ?? '';

  const applyProjection = (el: HTMLElement, attrs: AriaAttrs) => {
    for (const [name, value] of Object.entries(attrs)) {
      updateAriaAttribute(el, name as never, value as never, { validate: false });
    }
  };

  // Positioning follows the anchor while the panel is open (scroll/resize).
  let repositionCleanup: (() => void) | null = null;
  const stopPositioning = () => {
    repositionCleanup?.();
    repositionCleanup = null;
  };
  const startPositioning = () => {
    stopPositioning();
    const anchor = getPart('anchor') ?? getPart('trigger');
    const content = getPart('content');
    const reposition = () => positionPopover(anchor, content, positionOptions);
    reposition();
    window.addEventListener('scroll', reposition, { capture: true, passive: true });
    window.addEventListener('resize', reposition, { passive: true });
    repositionCleanup = () => {
      window.removeEventListener('scroll', reposition, { capture: true } as EventListenerOptions);
      window.removeEventListener('resize', reposition);
    };
  };

  let wasOpen = false;
  const render = () => {
    const state = memory.get();
    const open = isOpen(state, config);
    const projection = popover.aria(state, config, ids);
    for (const part of Object.keys(projection) as PopoverPart[]) {
      const attrs = projection[part];
      const el = getPart(part);
      if (el && attrs) applyProjection(el, attrs);
    }
    // Presence: content hides off the open axis, staying in light DOM so the
    // dismiss listener can read it via document .contains.
    const content = getPart('content');
    if (content) content.hidden = !open;
    // Edge-triggered affordances: on the closed->open edge position + focus and
    // start the outside-pointerdown light-dismiss; on the open->closed edge stop
    // repositioning and tear the dismiss listener down.
    if (open && !wasOpen) {
      startPositioning();
      focusFirst(content);
      if (content) {
        dismissCleanup = onPointerDownOutside(content, (event) => {
          const target = event.target as Node;
          // Spare BOTH the trigger (so a toggle gesture does not dismiss then
          // re-open) and the anchor (which can be a distinct element).
          if (getPart('trigger')?.contains(target)) return;
          if (getPart('anchor')?.contains(target)) return;
          request('close');
        });
      }
    } else if (!open && wasOpen) {
      stopPositioning();
      dismissCleanup?.();
      dismissCleanup = null;
    }
    wasOpen = open;
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
    const part = partEl?.dataset['part'] as PopoverPart | undefined;
    if (!part) return;
    const action = popover.keymap(
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
    request(action);
  };
  root.addEventListener('keydown', onKeydown);

  return () => {
    unsubscribe();
    dismissCleanup?.();
    dismissCleanup = null;
    stopPositioning();
    root.removeEventListener('click', onClick);
    root.removeEventListener('keydown', onKeydown);
  };
}
