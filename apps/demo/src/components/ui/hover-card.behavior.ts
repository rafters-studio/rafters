import { compose, type GlueSlice } from '@/lib/compose';
import { createBehavior, type AriaAttrs, type BehaviorSpec, type PartIds } from '@/lib/contract';
import {
  disclosable,
  isOpen,
  type DisclosableActions,
  type DisclosableConfig,
  type DisclosablePart,
  type DisclosableState,
} from '@/lib/disclosable';
import { computePosition } from '@/lib/primitives/collision-detector';
import { createControlledHoverDelay } from '@/lib/primitives/hover-delay';
import { updateAriaAttribute } from '@/lib/primitives/aria-manager';
import type { Align, Side } from '@/lib/primitives/types';

/** The default hover-open delay, ms (matches the oracle's 700ms). */
export const DEFAULT_OPEN_DELAY = 700;
/** The default hover-close delay, ms (matches the oracle's 300ms). */
export const DEFAULT_CLOSE_DELAY = 300;

export interface HoverCardConfig extends DisclosableConfig {
  /** Delay before a hovered/focused trigger opens the card. Default 700ms. */
  openDelay?: number | undefined;
  /** Delay before an un-hovered trigger closes the card. Default 300ms. */
  closeDelay?: number | undefined;
  /** When true, moving the pointer onto the content does NOT hold it open.
   *  Default false (content is hoverable, so the pointer can travel onto it). */
  disableHoverableContent?: boolean | undefined;
  /** Preferred side of the anchor to float the content. Default 'bottom'. */
  side?: Side | undefined;
  /** Alignment along the chosen side. Default 'center'. */
  align?: Align | undefined;
  /** Gap between anchor and content, px. Default 4. */
  sideOffset?: number | undefined;
}

export type HoverCardState = DisclosableState;
export type HoverCardActions = DisclosableActions;
export type HoverCardPart = DisclosablePart;

export { isOpen };

/** Resolved placement, defaults applied. Read by both clients and the shared
 *  positioner so the placement decision lives in ONE place, never a decorator. */
export function hoverCardPlacement(config: HoverCardConfig): {
  side: Side;
  align: Align;
  sideOffset: number;
} {
  return {
    side: config.side ?? 'bottom',
    align: config.align ?? 'center',
    sideOffset: config.sideOffset ?? 4,
  };
}

/**
 * The hover-card glue: the rich-preview ARIA identity (aria-describedby linking
 * the trigger to a role=dialog panel) and the Escape dismiss contract, written
 * over the disclosable open axis.
 *
 * A hover card is a disclosure of *state* but not an ARIA disclosure *widget* --
 * the trigger describes its preview, it does not expand a controlled region --
 * so the disclosable trigger projection (aria-expanded / aria-controls) is
 * suppressed here and replaced with aria-describedby, the card's real wiring.
 * The content carries role="dialog" (the oracle's identity for the rich
 * preview surface); the consumer supplies its accessible name.
 */
const hoverCardGlue: GlueSlice<
  HoverCardConfig,
  HoverCardState,
  { close: undefined },
  HoverCardPart
> = {
  kind: 'glue',
  name: 'hover-card',
  aria: (state, config, ids) => {
    const open = isOpen(state, config);
    return {
      trigger: {
        // Suppress the disclosure projection: a hover-card trigger is described,
        // not expanded. Projected undefined => the attribute is not rendered.
        'aria-expanded': undefined,
        'aria-controls': undefined,
        // The real link: only while open and only to a real content id.
        'aria-describedby': open && ids.content ? ids.content : undefined,
      },
      content: {
        role: 'dialog',
      },
    };
  },
  // WAI-ARIA: Escape dismisses the preview. The idempotence gate makes this a
  // no-op when already closed.
  // Positioning and hover-intent timing are DOM concerns composed directly by
  // the clients (collision-detector + hover-delay), not behavior state.
  keymap: (event) => (event.key === 'Escape' ? 'close' : null),
};

export const hoverCard: BehaviorSpec<
  HoverCardConfig,
  HoverCardState,
  HoverCardActions,
  HoverCardPart
> = compose('hover-card', disclosable<HoverCardConfig>(), hoverCardGlue);

/** Apply the resolved aria projection to an element (validate:false skips the
 *  author-input coercion that would flip a projected 'false'). */
function applyProjection(el: HTMLElement, attrs: AriaAttrs): void {
  for (const [name, value] of Object.entries(attrs)) {
    updateAriaAttribute(el, name as never, value as never, { validate: false });
  }
}

/**
 * Float the content beside its anchor via the collision-detector primitive and
 * stamp the resolved side/align onto the content for motion hooks. Shared by
 * every client so the positioning composition is written exactly once.
 */
export function positionHoverCardContent(
  trigger: HTMLElement,
  content: HTMLElement,
  config: HoverCardConfig,
): void {
  const placement = hoverCardPlacement(config);
  const result = computePosition(trigger, content, {
    side: placement.side,
    align: placement.align,
    sideOffset: placement.sideOffset,
    avoidCollisions: true,
  });
  content.style.position = 'fixed';
  content.style.left = '0';
  content.style.top = '0';
  content.style.transform = `translate(${Math.round(result.x)}px, ${Math.round(result.y)}px)`;
  content.dataset['side'] = result.side;
  content.dataset['align'] = result.align;
}

/**
 * The DOM-native binding of the hover-card score -- the client the Web Component
 * and the Astro <script> both import. Only React reads the projections
 * declaratively.
 *
 * Two overlay concerns beyond the score: PRESENCE (the content is
 * present-but-hidden, toggled on the open axis, kept in light DOM so the
 * hover-delay primitive can read it) and the hover-intent TIMING, composed from
 * the hover-delay primitive rather than expressed as behavior state. The
 * primitive owns the global skip-delay coordination (a re-hover soon after a
 * close opens instantly), so no module-global timestamp lives here.
 */
export function bindHoverCard(root: HTMLElement): () => void {
  const getPart = (part: string): HTMLElement | null =>
    part === 'root' ? root : root.querySelector<HTMLElement>(`[data-part="${part}"]`);

  // Config travels as `data-*` and nothing else (#2001/#2004), so the read is
  // `dataset` by camelCase key -- `data-open-delay` is dataset.openDelay.
  const data = root.dataset;
  const numData = (key: string, fallback: number): number => {
    const raw = data[key];
    if (raw === undefined) return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const content = getPart('content');
  const config: HoverCardConfig = {
    openDelay: numData('openDelay', DEFAULT_OPEN_DELAY),
    closeDelay: numData('closeDelay', DEFAULT_CLOSE_DELAY),
    disableHoverableContent: data['disableHoverableContent'] === 'true',
    defaultOpen: data['defaultOpen'] === 'true' || content?.dataset['state'] === 'open',
    side: (data['side'] as Side | undefined) ?? undefined,
    align: (data['align'] as Align | undefined) ?? undefined,
    // Presence, not truthiness: data-side-offset="0" is a real offset.
    sideOffset: 'sideOffset' in data ? numData('sideOffset', 4) : undefined,
  };

  const { memory, dispatch } = createBehavior(hoverCard, config);
  const request = (action: keyof HoverCardActions): boolean => dispatch(action, config);

  // ids READ from the server/author markup, never generated.
  const ids = {} as PartIds<HoverCardPart>;
  for (const part of Object.keys(hoverCard.parts) as HoverCardPart[])
    ids[part] = getPart(part)?.id ?? '';

  const trigger = getPart('trigger');

  const render = () => {
    const state = memory.get();
    const open = isOpen(state, config);
    const projection = hoverCard.aria(state, config, ids);
    for (const part of Object.keys(projection) as HoverCardPart[]) {
      const attrs = projection[part];
      const el = getPart(part);
      if (el && attrs) applyProjection(el, attrs);
    }
    if (content) {
      content.hidden = !open;
      if (open && trigger) positionHoverCardContent(trigger, content, config);
    }
  };
  const unsubscribe = memory.subscribe(render); // fires immediately: first paint

  // Hover-intent timing composed from the primitive. onOpen/onClose flow
  // through the idempotent dispatch, so the score stays the single truth.
  const hover = createControlledHoverDelay({
    openDelay: config.openDelay ?? DEFAULT_OPEN_DELAY,
    closeDelay: config.closeDelay ?? DEFAULT_CLOSE_DELAY,
    onOpen: () => request('open'),
    onClose: () => request('close'),
  });

  const reposition = () => {
    if (content && trigger && isOpen(memory.get(), config)) {
      positionHoverCardContent(trigger, content, config);
    }
  };

  const onKeydown = (event: KeyboardEvent) => {
    const partEl = (event.target as HTMLElement).closest<HTMLElement>('[data-part]');
    const part = partEl?.dataset['part'] as HoverCardPart | undefined;
    if (!part) return;
    const action = hoverCard.keymap(
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
    if (action !== 'close') return;
    event.preventDefault();
    // Dismiss through the score directly. A defaultOpen card that never received
    // a hover/focus event has no pending state in the hover primitive, so
    // hover.close() alone is a no-op and the card would stay open. Dispatch
    // close, then sync the primitive so a later re-hover can reopen the card.
    request('close');
    hover.close();
  };

  if (trigger) {
    trigger.addEventListener('mouseenter', hover.onTriggerEnter);
    trigger.addEventListener('mouseleave', hover.onTriggerLeave);
    trigger.addEventListener('focus', hover.onTriggerFocus);
    trigger.addEventListener('blur', hover.onTriggerBlur);
  }
  if (content && !config.disableHoverableContent) {
    content.addEventListener('mouseenter', hover.onContentEnter);
    content.addEventListener('mouseleave', hover.onContentLeave);
  }
  root.addEventListener('keydown', onKeydown);
  window.addEventListener('scroll', reposition, { capture: true, passive: true });
  window.addEventListener('resize', reposition, { passive: true });

  return () => {
    unsubscribe();
    hover.destroy();
    if (trigger) {
      trigger.removeEventListener('mouseenter', hover.onTriggerEnter);
      trigger.removeEventListener('mouseleave', hover.onTriggerLeave);
      trigger.removeEventListener('focus', hover.onTriggerFocus);
      trigger.removeEventListener('blur', hover.onTriggerBlur);
    }
    if (content && !config.disableHoverableContent) {
      content.removeEventListener('mouseenter', hover.onContentEnter);
      content.removeEventListener('mouseleave', hover.onContentLeave);
    }
    root.removeEventListener('keydown', onKeydown);
    window.removeEventListener('scroll', reposition, { capture: true });
    window.removeEventListener('resize', reposition);
  };
}
