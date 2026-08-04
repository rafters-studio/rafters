import { afterEach, describe, expect, it } from 'vitest';
import { createBehavior, type PartIds } from '../../../src/lib/contract';
import {
  bindTooltip,
  isOpen,
  tooltip,
  tooltipPlacement,
  type TooltipConfig,
  type TooltipPart,
} from '../../../src/components/tooltip/tooltip.behavior';

const ids: PartIds<TooltipPart> = { trigger: 't', content: 'c' };

const closed: TooltipConfig = {};
const openUncontrolled: TooltipConfig = { defaultOpen: true };

function ariaAt(config: TooltipConfig, partIds: PartIds<TooltipPart> = ids) {
  return tooltip.aria(tooltip.initialState(config), config, partIds);
}

describe('tooltip parts', () => {
  it('declares only trigger and content', () => {
    expect(Object.keys(tooltip.parts).sort()).toEqual(['content', 'trigger']);
    expect(tooltip.parts.content.optional).toBe(true);
    expect(tooltip.parts.trigger.optional).toBeUndefined();
  });
});

describe('tooltip state: controlled vs intrinsic', () => {
  it('seeds intrinsic open from defaultOpen', () => {
    expect(tooltip.initialState({ defaultOpen: true }).open).toBe(true);
    expect(tooltip.initialState({}).open).toBe(false);
  });

  it('controlled config shadows intrinsic state', () => {
    expect(isOpen({ open: false }, { open: true })).toBe(true);
    expect(isOpen({ open: true }, { open: false })).toBe(false);
    expect(isOpen({ open: true }, {})).toBe(true);
  });
});

describe('tooltip canDispatch (idempotence gate)', () => {
  it('open only when effectively closed, close only when effectively open', () => {
    const state = tooltip.initialState(closed);
    expect(tooltip.canDispatch(state, 'open', closed)).toBe(true);
    expect(tooltip.canDispatch(state, 'close', closed)).toBe(false);

    const openState = { open: true };
    expect(tooltip.canDispatch(openState, 'open', closed)).toBe(false);
    expect(tooltip.canDispatch(openState, 'close', closed)).toBe(true);
  });

  it('gates on the CONTROLLED value when present', () => {
    const drifted = { open: false };
    expect(tooltip.canDispatch(drifted, 'close', { open: true })).toBe(true);
    expect(tooltip.canDispatch(drifted, 'open', { open: true })).toBe(false);
  });
});

describe('tooltip actions', () => {
  it('open and close move intrinsic state through dispatch', () => {
    const { memory, dispatch } = createBehavior(tooltip, closed);
    expect(dispatch('open', closed)).toBe(true);
    expect(memory.get().open).toBe(true);
    expect(dispatch('open', closed)).toBe(false);
    expect(dispatch('close', closed)).toBe(true);
    expect(memory.get().open).toBe(false);
  });
});

describe('tooltip aria projection', () => {
  it('closed: trigger is described-by nothing and never expanded', () => {
    const aria = ariaAt(closed);
    expect(aria.trigger?.['aria-describedby']).toBeUndefined();
    // A tooltip trigger is described, not expanded: the disclosure projection
    // is suppressed.
    expect(aria.trigger?.['aria-expanded']).toBeUndefined();
    expect(aria.trigger?.['aria-controls']).toBeUndefined();
    expect(aria.trigger?.['data-state']).toBe('closed');
  });

  it('open: trigger points aria-describedby at the content id', () => {
    const aria = ariaAt(openUncontrolled);
    expect(aria.trigger?.['aria-describedby']).toBe('c');
    expect(aria.trigger?.['aria-expanded']).toBeUndefined();
    expect(aria.trigger?.['data-state']).toBe('open');
  });

  it('open with an empty content id projects NO dangling describedby', () => {
    const aria = ariaAt(openUncontrolled, { trigger: 't', content: '' });
    expect(aria.trigger?.['aria-describedby']).toBeUndefined();
  });

  it('content carries role=tooltip and the open data-state', () => {
    expect(ariaAt(openUncontrolled).content).toEqual({
      role: 'tooltip',
      'data-state': 'open',
    });
    expect(ariaAt(closed).content?.['data-state']).toBe('closed');
  });
});

describe('tooltip keymap (dismiss)', () => {
  const open = { open: true };
  it('Escape on trigger or content maps to close', () => {
    expect(tooltip.keymap({ key: 'Escape' }, open, 'trigger')).toBe('close');
    expect(tooltip.keymap({ key: 'Escape' }, open, 'content')).toBe('close');
  });
  it('other keys are not claimed', () => {
    expect(tooltip.keymap({ key: 'Enter' }, open, 'trigger')).toBeNull();
    expect(tooltip.keymap({ key: 'Tab' }, open, 'content')).toBeNull();
  });
});

/**
 * bindTooltip reads sideOffset by PRESENCE (`'sideOffset' in data`), not by
 * truthiness: data-side-offset="0" is a real, flush offset and must not fall
 * back to the 4px default. The observable is the positioner's translate.
 *
 * Note which regression these actually catch: `dataset` values are always
 * STRINGS, and '0' is truthy, so a string-truthiness rewrite is not a live
 * zero-mask at this site. The mask that can really happen is numeric -- e.g.
 * `numData('sideOffset', 4) || undefined` -- and that form fails both cases
 * below.
 */
describe('bindTooltip: data-side-offset parse', () => {
  const teardowns: Array<() => void> = [];

  afterEach(() => {
    for (const teardown of teardowns.splice(0)) teardown();
    document.body.innerHTML = '';
  });

  /** Default-open so the first paint positions the content synchronously. */
  function mountOpen(sideOffset?: string): HTMLElement {
    const root = document.createElement('div');
    root.dataset['part'] = 'root';
    root.dataset['defaultOpen'] = 'true';
    root.dataset['side'] = 'bottom';
    root.dataset['align'] = 'start';
    if (sideOffset !== undefined) root.dataset['sideOffset'] = sideOffset;

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.dataset['part'] = 'trigger';
    trigger.id = 't-trigger';
    trigger.textContent = 'Help';

    const content = document.createElement('div');
    content.dataset['part'] = 'content';
    content.id = 't-content';
    content.dataset['state'] = 'open';
    content.textContent = 'More info';

    root.append(trigger, content);
    document.body.appendChild(root);
    teardowns.push(bindTooltip(root));
    return content;
  }

  /** The y translate the positioner stamped, in px. */
  function translateY(content: HTMLElement): number {
    const match = /translate\((-?\d+)px, (-?\d+)px\)/.exec(content.style.transform);
    expect(match).not.toBeNull();
    return Number(match?.[2]);
  }

  it('data-side-offset="0" is a real 0, not the 4px default', () => {
    expect(translateY(mountOpen('0'))).toBe(0);
  });

  it('an absent data-side-offset falls back to the 4px default', () => {
    expect(translateY(mountOpen())).toBe(4);
  });

  // A blank attribute is absence, not zero: `Number('')` is 0, so the empty
  // string has to be rejected explicitly or `data-side-offset=""` reads as 0px.
  it('a blank data-side-offset="" falls back to the 4px default, not 0', () => {
    expect(translateY(mountOpen(''))).toBe(4);
  });
});

/**
 * The token fallback is LAZY. The accessor fails loud on a malformed custom
 * property (#1995), so an eagerly evaluated fallback would let a broken
 * `--rafters-delay-hover-intent` anywhere on the root break a tooltip that
 * declares its own `data-delay-duration` and never consults the token. The
 * discriminator is exactly that: same malformed token, attribute present vs
 * absent.
 */
describe('bindTooltip: the token fallback is only read when the attribute is absent', () => {
  const teardowns: Array<() => void> = [];

  afterEach(() => {
    for (const teardown of teardowns.splice(0)) teardown();
    document.body.innerHTML = '';
  });

  /** Malformed on the ROOT: the accessor is called with `{ element: root }`. */
  function mountMalformed(delayDuration?: string): HTMLElement {
    const root = document.createElement('div');
    root.dataset['part'] = 'root';
    root.style.setProperty('--rafters-delay-hover-intent', 'soon');
    root.style.setProperty('--rafters-delay-linger', 'later');
    if (delayDuration !== undefined) {
      root.dataset['delayDuration'] = delayDuration;
      root.dataset['skipDelayDuration'] = delayDuration;
    }

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.dataset['part'] = 'trigger';
    trigger.id = 'lazy-trigger';

    const content = document.createElement('div');
    content.dataset['part'] = 'content';
    content.id = 'lazy-content';

    root.append(trigger, content);
    document.body.appendChild(root);
    return root;
  }

  it('binds on the attribute even when the token is malformed', () => {
    const root = mountMalformed('120');
    expect(() => teardowns.push(bindTooltip(root))).not.toThrow();
  });

  it('throws naming the token when the attribute is absent', () => {
    const root = mountMalformed();
    expect(() => bindTooltip(root)).toThrow(/rafters-delay-hover-intent" resolved to "soon"/);
  });

  // The blank attribute takes the SAME branch as the absent one -- it reaches
  // the token, which is what makes the malformed token throw here. Before the
  // fix `Number('')` was a finite 0 and this bound silently at 0ms.
  it('a blank data-delay-duration="" reads the token, exactly as absence does', () => {
    const root = mountMalformed('');
    expect(() => bindTooltip(root)).toThrow(/rafters-delay-hover-intent" resolved to "soon"/);
  });

  it('an explicit data-delay-duration="0" is still a real zero, never the token', () => {
    const root = mountMalformed('0');
    expect(() => teardowns.push(bindTooltip(root))).not.toThrow();
  });
});

describe('tooltipPlacement defaults', () => {
  it('defaults to top/center with a 4px offset', () => {
    expect(tooltipPlacement({})).toEqual({ side: 'top', align: 'center', sideOffset: 4 });
  });
  it('honors explicit placement', () => {
    expect(tooltipPlacement({ side: 'right', align: 'start', sideOffset: 8 })).toEqual({
      side: 'right',
      align: 'start',
      sideOffset: 8,
    });
  });
});
