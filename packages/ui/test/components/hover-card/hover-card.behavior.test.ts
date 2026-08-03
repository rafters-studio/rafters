import { afterEach, describe, expect, it } from 'vitest';
import { createBehavior, type PartIds } from '../../../src/lib/contract';
import {
  bindHoverCard,
  hoverCard,
  hoverCardPlacement,
  isOpen,
  type HoverCardConfig,
  type HoverCardPart,
} from '../../../src/components/hover-card/hover-card.behavior';

const ids: PartIds<HoverCardPart> = { trigger: 't', content: 'c' };

const closed: HoverCardConfig = {};
const openUncontrolled: HoverCardConfig = { defaultOpen: true };

function ariaAt(config: HoverCardConfig, partIds: PartIds<HoverCardPart> = ids) {
  return hoverCard.aria(hoverCard.initialState(config), config, partIds);
}

describe('hover-card parts', () => {
  it('declares only trigger and content', () => {
    expect(Object.keys(hoverCard.parts).sort()).toEqual(['content', 'trigger']);
    expect(hoverCard.parts.content.optional).toBe(true);
    expect(hoverCard.parts.trigger.optional).toBeUndefined();
  });
});

describe('hover-card state: controlled vs intrinsic', () => {
  it('seeds intrinsic open from defaultOpen', () => {
    expect(hoverCard.initialState({ defaultOpen: true }).open).toBe(true);
    expect(hoverCard.initialState({}).open).toBe(false);
  });

  it('controlled config shadows intrinsic state', () => {
    expect(isOpen({ open: false }, { open: true })).toBe(true);
    expect(isOpen({ open: true }, { open: false })).toBe(false);
    expect(isOpen({ open: true }, {})).toBe(true);
  });
});

describe('hover-card canDispatch (idempotence gate)', () => {
  it('open only when effectively closed, close only when effectively open', () => {
    const state = hoverCard.initialState(closed);
    expect(hoverCard.canDispatch(state, 'open', closed)).toBe(true);
    expect(hoverCard.canDispatch(state, 'close', closed)).toBe(false);

    const openState = { open: true };
    expect(hoverCard.canDispatch(openState, 'open', closed)).toBe(false);
    expect(hoverCard.canDispatch(openState, 'close', closed)).toBe(true);
  });

  it('gates on the CONTROLLED value when present', () => {
    const drifted = { open: false };
    expect(hoverCard.canDispatch(drifted, 'close', { open: true })).toBe(true);
    expect(hoverCard.canDispatch(drifted, 'open', { open: true })).toBe(false);
  });
});

describe('hover-card actions', () => {
  it('open and close move intrinsic state through dispatch', () => {
    const { memory, dispatch } = createBehavior(hoverCard, closed);
    expect(dispatch('open', closed)).toBe(true);
    expect(memory.get().open).toBe(true);
    expect(dispatch('open', closed)).toBe(false);
    expect(dispatch('close', closed)).toBe(true);
    expect(memory.get().open).toBe(false);
  });
});

describe('hover-card aria projection', () => {
  it('closed: trigger is described-by nothing and never expanded', () => {
    const aria = ariaAt(closed);
    expect(aria.trigger?.['aria-describedby']).toBeUndefined();
    // A hover-card trigger is described, not expanded: the disclosure
    // projection is suppressed.
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

  it('content carries role=dialog and the open data-state', () => {
    expect(ariaAt(openUncontrolled).content).toEqual({
      role: 'dialog',
      'data-state': 'open',
    });
    expect(ariaAt(closed).content?.['data-state']).toBe('closed');
  });
});

describe('hover-card keymap (dismiss)', () => {
  const open = { open: true };
  it('Escape on trigger or content maps to close', () => {
    expect(hoverCard.keymap({ key: 'Escape' }, open, 'trigger')).toBe('close');
    expect(hoverCard.keymap({ key: 'Escape' }, open, 'content')).toBe('close');
  });
  it('other keys are not claimed', () => {
    expect(hoverCard.keymap({ key: 'Enter' }, open, 'trigger')).toBeNull();
    expect(hoverCard.keymap({ key: 'Tab' }, open, 'content')).toBeNull();
  });
});

describe('hoverCardPlacement defaults', () => {
  it('defaults to bottom/center with a 4px offset', () => {
    expect(hoverCardPlacement({})).toEqual({ side: 'bottom', align: 'center', sideOffset: 4 });
  });
  it('honors explicit placement', () => {
    expect(hoverCardPlacement({ side: 'right', align: 'start', sideOffset: 8 })).toEqual({
      side: 'right',
      align: 'start',
      sideOffset: 8,
    });
  });
});

/**
 * bindHoverCard reads sideOffset by PRESENCE (`'sideOffset' in data`), not by
 * truthiness: data-side-offset="0" is a real, flush offset and must not fall
 * back to the 4px default. The observable is the positioner's translate.
 *
 * Note which regression these actually catch: `dataset` values are always
 * STRINGS, and '0' is truthy, so a string-truthiness rewrite is not a live
 * zero-mask at this site. The mask that can really happen is numeric -- e.g.
 * `numData('sideOffset', 4) || undefined` -- and that form fails both cases
 * below.
 */
describe('bindHoverCard: data-side-offset parse', () => {
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

    const trigger = document.createElement('a');
    trigger.href = '#';
    trigger.dataset['part'] = 'trigger';
    trigger.id = 'hc-trigger';
    trigger.textContent = '@john';

    const content = document.createElement('div');
    content.dataset['part'] = 'content';
    content.id = 'hc-content';
    content.dataset['state'] = 'open';
    content.textContent = 'Software Engineer';

    root.append(trigger, content);
    document.body.appendChild(root);
    teardowns.push(bindHoverCard(root));
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
});
