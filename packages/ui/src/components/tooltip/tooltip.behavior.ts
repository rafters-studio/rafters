import { compose, type GlueSlice } from '../../lib/compose';
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
import { computePosition } from '../../primitives/collision-detector';
import { createControlledHoverDelay } from '../../primitives/hover-delay';
import { motionDelayMs } from '../../primitives/motion-tokens';
import { updateAriaAttribute } from '../../primitives/aria-manager';
import type { Align, Side } from '../../primitives/types';

/**
 * The hover-open delay, read from `--rafters-delay-hover-intent`.
 *
 * The tooltip used to carry its own 700ms literal. The motion matrix assigns
 * this cell the `hover-intent` delay generic (motion.jsonl, tooltip/content/
 * "closed -> open"), so the value now comes from the system token like every
 * other motion decision -- one fast, everywhere, always. Under reduced motion
 * the accessor resolves it to zero.
 */
export function tooltipOpenDelay(element?: Element | null): number {
  return motionDelayMs('hover-intent', { element });
}

/**
 * The close delay, read from `--rafters-delay-linger`.
 *
 * NOT `delay-skip`, despite the prop being named `skipDelayDuration` after the
 * oracle. What this delay actually governs is how long the tip stays after the
 * pointer leaves, so a near-miss on the way to the content is forgiven -- which
 * is `linger`, verbatim. `skip` is the warm-reopen grace: reopen inside it and
 * the ENTRANCE delay is skipped. `hover-delay` has no warm-reopen mechanism to
 * hang that on (`skipDelays` there is an unconditional boolean, not a window),
 * so `delay-skip` stays without a consumer rather than being mislabelled onto
 * this one. Both members happen to sit at 300ms today, which is exactly why the
 * confusion would have gone unnoticed.
 */
export function tooltipCloseDelay(element?: Element | null): number {
  return motionDelayMs('linger', { element });
}

export interface TooltipConfig extends DisclosableConfig {
  /** Delay before a hovered/focused trigger opens the tip. Unset reads
   *  `--rafters-delay-hover-intent` via {@link tooltipOpenDelay}. */
  delayDuration?: number | undefined;
  /** Delay before an un-hovered trigger closes the tip. Unset reads
   *  `--rafters-delay-linger` via {@link tooltipCloseDelay}. */
  skipDelayDuration?: number | undefined;
  /** When true, moving the pointer onto the content does NOT hold it open.
   *  Default false (content is hoverable). */
  disableHoverableContent?: boolean | undefined;
  /** Preferred side of the anchor to float the content. Default 'top'. */
  side?: Side | undefined;
  /** Alignment along the chosen side. Default 'center'. */
  align?: Align | undefined;
  /** Gap between anchor and content, px. Default 4. */
  sideOffset?: number | undefined;
}

export type TooltipState = DisclosableState;
export type TooltipActions = DisclosableActions;
export type TooltipPart = DisclosablePart;

export { isOpen };

/** Resolved placement, defaults applied. Read by both clients and the shared
 *  positioner so the placement decision lives in ONE place, never a decorator. */
export function tooltipPlacement(config: TooltipConfig): {
  side: Side;
  align: Align;
  sideOffset: number;
} {
  return {
    side: config.side ?? 'top',
    align: config.align ?? 'center',
    sideOffset: config.sideOffset ?? 4,
  };
}

/**
 * The tooltip glue: the tooltip ARIA identity (aria-describedby, role=tooltip)
 * and the Escape dismiss contract, written over the disclosable open axis.
 *
 * A tooltip is NOT a disclosure widget -- it describes, it does not expand --
 * so the disclosable trigger projection (aria-expanded / aria-controls) is
 * suppressed here and replaced with aria-describedby, the tooltip's real wiring.
 */
const tooltipGlue: GlueSlice<TooltipConfig, TooltipState, { close: undefined }, TooltipPart> = {
  kind: 'glue',
  name: 'tooltip',
  aria: (state, config, ids) => {
    const open = isOpen(state, config);
    return {
      trigger: {
        // Suppress the disclosure projection: a tooltip trigger is described,
        // not expanded. Projected undefined => the attribute is not rendered.
        'aria-expanded': undefined,
        'aria-controls': undefined,
        // The tooltip's real link: only while open and only to a real id.
        'aria-describedby': open && ids.content ? ids.content : undefined,
      },
      content: {
        role: 'tooltip',
      },
    };
  },
  // WAI-ARIA tooltip pattern: Escape dismisses the tip. The idempotence gate
  // makes this a no-op when already closed.
  // Positioning and hover-intent timing are DOM concerns composed directly by
  // the clients (collision-detector + hover-delay), not behavior state.
  keymap: (event) => (event.key === 'Escape' ? 'close' : null),
};

export const tooltip: BehaviorSpec<TooltipConfig, TooltipState, TooltipActions, TooltipPart> =
  compose('tooltip', disclosable<TooltipConfig>(), tooltipGlue);

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
export function positionTooltipContent(
  trigger: HTMLElement,
  content: HTMLElement,
  config: TooltipConfig,
): void {
  const placement = tooltipPlacement(config);
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
 * The DOM-native binding of the tooltip score -- the client the Web Component
 * and the Astro <script> both import. Only React reads the projections
 * declaratively.
 *
 * Two overlay concerns beyond the score: PRESENCE (the content is
 * present-but-hidden, toggled on the open axis, kept in light DOM so the
 * hover-delay primitive can read it) and the hover-intent TIMING, composed
 * from the hover-delay primitive rather than expressed as a vocabulary effect.
 */
export function bindTooltip(root: HTMLElement): () => void {
  const getPart = (part: string): HTMLElement | null =>
    part === 'root' ? root : root.querySelector<HTMLElement>(`[data-part="${part}"]`);

  // Config travels as `data-*` and nothing else (#2001/#2004), so the read is
  // `dataset` by camelCase key -- `data-delay-duration` is dataset.delayDuration.
  const data = root.dataset;
  const numData = (key: string, fallback: number): number => {
    const raw = data[key];
    if (raw === undefined) return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const content = getPart('content');
  const config: TooltipConfig = {
    delayDuration: numData('delayDuration', tooltipOpenDelay(root)),
    skipDelayDuration: numData('skipDelayDuration', tooltipCloseDelay(root)),
    disableHoverableContent: data['disableHoverableContent'] === 'true',
    defaultOpen: data['defaultOpen'] === 'true' || content?.dataset['state'] === 'open',
    side: (data['side'] as Side | undefined) ?? undefined,
    align: (data['align'] as Align | undefined) ?? undefined,
    // Presence, not truthiness: data-side-offset="0" is a real offset.
    sideOffset: 'sideOffset' in data ? numData('sideOffset', 4) : undefined,
  };

  const { memory, dispatch } = createBehavior(tooltip, config);
  const request = (action: keyof TooltipActions): boolean => dispatch(action, config);

  // ids READ from the server/author markup, never generated.
  const ids = {} as PartIds<TooltipPart>;
  for (const part of Object.keys(tooltip.parts) as TooltipPart[])
    ids[part] = getPart(part)?.id ?? '';

  const trigger = getPart('trigger');

  const render = () => {
    const state = memory.get();
    const open = isOpen(state, config);
    const projection = tooltip.aria(state, config, ids);
    for (const part of Object.keys(projection) as TooltipPart[]) {
      const attrs = projection[part];
      const el = getPart(part);
      if (el && attrs) applyProjection(el, attrs);
    }
    if (content) {
      content.hidden = !open;
      if (open && trigger) positionTooltipContent(trigger, content, config);
    }
  };
  const unsubscribe = memory.subscribe(render); // fires immediately: first paint

  // Hover-intent timing composed from the primitive. onOpen/onClose flow
  // through the idempotent dispatch, so the score stays the single truth.
  const hover = createControlledHoverDelay({
    openDelay: config.delayDuration ?? tooltipOpenDelay(root),
    closeDelay: config.skipDelayDuration ?? tooltipCloseDelay(root),
    onOpen: () => request('open'),
    onClose: () => request('close'),
  });

  const reposition = () => {
    if (content && trigger && isOpen(memory.get(), config)) {
      positionTooltipContent(trigger, content, config);
    }
  };

  const onKeydown = (event: KeyboardEvent) => {
    const partEl = (event.target as HTMLElement).closest<HTMLElement>('[data-part]');
    const part = partEl?.dataset['part'] as TooltipPart | undefined;
    if (!part) return;
    const action = tooltip.keymap(
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
    // Dismiss through the score directly. A defaultOpen tip that never received
    // a hover/focus event has no pending state in the hover primitive, so
    // hover.close() alone is a no-op and the tip would stay open. Dispatch close,
    // then sync the primitive so a later re-hover can reopen the tip.
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
