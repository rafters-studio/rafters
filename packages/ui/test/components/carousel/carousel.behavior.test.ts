import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBehavior } from '../../../src/lib/contract';
import {
  activeIndex,
  canScrollNext,
  canScrollPrev,
  carouselBehavior,
  carouselInstanceAria,
  clampIndex,
  composeCarouselInteractions,
  indexForKey,
  nextIndex,
  prevIndex,
  trackStyle,
  type CarouselConfig,
} from '../../../src/components/carousel/carousel.behavior';

const three: CarouselConfig = { count: 3 };
const threeLoop: CarouselConfig = { count: 3, loop: true };

describe('carousel parts', () => {
  it('declares the structural parts and the two many-instance families', () => {
    expect(Object.keys(carouselBehavior.parts).sort()).toEqual([
      'content',
      'indicator',
      'indicators',
      'item',
      'next',
      'previous',
      'root',
      'track',
    ]);
    expect(carouselBehavior.parts.item.many).toBe(true);
    expect(carouselBehavior.parts.item.role).toBe('group');
    expect(carouselBehavior.parts.indicator.many).toBe(true);
    expect(carouselBehavior.parts.indicator.optional).toBe(true);
    expect(carouselBehavior.parts.indicators.optional).toBe(true);
    expect(carouselBehavior.parts.root.role).toBe('region');
  });
});

describe('carousel state', () => {
  it('seeds from value, else defaultValue, else 0 -- clamped to the count', () => {
    expect(carouselBehavior.initialState(three).index).toBe(0);
    expect(carouselBehavior.initialState({ count: 3, defaultValue: 2 }).index).toBe(2);
    expect(carouselBehavior.initialState({ count: 3, defaultValue: 9 }).index).toBe(2);
    expect(carouselBehavior.initialState({ count: 3, value: 1 }).index).toBe(1);
  });

  it('controlled value shadows intrinsic state and clamps', () => {
    expect(activeIndex({ index: 1 }, three)).toBe(1);
    expect(activeIndex({ index: 1 }, { count: 3, value: 2 })).toBe(2);
    expect(activeIndex({ index: 1 }, { count: 3, value: 9 })).toBe(2);
  });

  it('clampIndex bounds into [0, count-1], or 0 with no slides', () => {
    expect(clampIndex(5, three)).toBe(2);
    expect(clampIndex(-1, three)).toBe(0);
    expect(clampIndex(1, { count: 0 })).toBe(0);
  });
});

describe('carousel navigation math', () => {
  it('prev clamps at 0 without loop, wraps to the end with loop', () => {
    expect(prevIndex({ index: 0 }, three)).toBe(0);
    expect(prevIndex({ index: 0 }, threeLoop)).toBe(2);
    expect(prevIndex({ index: 2 }, three)).toBe(1);
  });

  it('next clamps at the end without loop, wraps to 0 with loop', () => {
    expect(nextIndex({ index: 2 }, three)).toBe(2);
    expect(nextIndex({ index: 2 }, threeLoop)).toBe(0);
    expect(nextIndex({ index: 0 }, three)).toBe(1);
  });

  it('canScrollPrev/Next reflect the bounds and the loop flag', () => {
    expect(canScrollPrev({ index: 0 }, three)).toBe(false);
    expect(canScrollPrev({ index: 0 }, threeLoop)).toBe(true);
    expect(canScrollPrev({ index: 1 }, three)).toBe(true);
    expect(canScrollNext({ index: 2 }, three)).toBe(false);
    expect(canScrollNext({ index: 2 }, threeLoop)).toBe(true);
    expect(canScrollNext({ index: 0 }, three)).toBe(true);
    expect(canScrollPrev({ index: 0 }, { count: 0 })).toBe(false);
  });
});

describe('carousel keymap and key targeting', () => {
  it('horizontal steers with Left/Right; vertical with Up/Down', () => {
    expect(indexForKey('ArrowRight', { index: 0 }, three)).toBe(1);
    expect(indexForKey('ArrowLeft', { index: 1 }, three)).toBe(0);
    expect(indexForKey('ArrowUp', { index: 1 }, three)).toBeNull();
    expect(indexForKey('ArrowDown', { index: 0 }, { count: 3, orientation: 'vertical' })).toBe(1);
    expect(
      indexForKey('ArrowRight', { index: 0 }, { count: 3, orientation: 'vertical' }),
    ).toBeNull();
  });

  it('keymap claims the axis arrows on the root only', () => {
    expect(carouselBehavior.keymap({ key: 'ArrowRight' }, { index: 0 }, 'root', three)).toBe(
      'setIndex',
    );
    expect(
      carouselBehavior.keymap({ key: 'ArrowRight' }, { index: 0 }, 'previous', three),
    ).toBeNull();
    expect(carouselBehavior.keymap({ key: 'ArrowUp' }, { index: 0 }, 'root', three)).toBeNull();
    expect(
      carouselBehavior.keymap({ key: 'ArrowUp' }, { index: 0 }, 'root', {
        count: 3,
        orientation: 'vertical',
      }),
    ).toBe('setIndex');
  });
});

describe('carousel setIndex reducer', () => {
  it('moves the intrinsic index to the dispatched value', () => {
    const { memory, dispatch } = createBehavior(carouselBehavior, three);
    expect(memory.get().index).toBe(0);
    expect(dispatch('setIndex', three, 2)).toBe(true);
    expect(memory.get().index).toBe(2);
  });
});

describe('carousel aria projection', () => {
  const ids = {
    root: 'r',
    content: 'c',
    track: 't',
    item: '',
    previous: 'p',
    next: 'n',
    indicators: 'is',
    indicator: '',
  };

  it('root carries the carousel roledescription, label, and orientation', () => {
    const aria = carouselBehavior.aria({ index: 0 }, three, ids);
    expect(aria.root).toEqual({
      'aria-roledescription': 'carousel',
      'aria-label': 'Carousel',
      'data-orientation': 'horizontal',
    });
    expect(
      carouselBehavior.aria({ index: 0 }, { count: 3, label: 'Gallery' }, ids).root?.['aria-label'],
    ).toBe('Gallery');
  });

  it('previous/next expose data-disabled exactly at the bounds', () => {
    const atStart = carouselBehavior.aria({ index: 0 }, three, ids);
    expect(atStart.previous?.['data-disabled']).toBe('true');
    expect(atStart.next?.['data-disabled']).toBeUndefined();
    const atEnd = carouselBehavior.aria({ index: 2 }, three, ids);
    expect(atEnd.previous?.['data-disabled']).toBeUndefined();
    expect(atEnd.next?.['data-disabled']).toBe('true');
  });

  it('instance ARIA: slides are labelled "N of M"; the current dot is aria-current', () => {
    const item = carouselInstanceAria('item', '0', { index: 0 }, three);
    expect(item).toEqual({
      'aria-roledescription': 'slide',
      'aria-label': '1 of 3',
      'data-state': 'active',
    });
    expect(carouselInstanceAria('item', '1', { index: 0 }, three)['data-state']).toBe('inactive');
    const dot = carouselInstanceAria('indicator', '0', { index: 0 }, three);
    expect(dot).toEqual({
      'aria-label': 'Go to slide 1',
      'aria-current': 'true',
      'data-state': 'active',
    });
    expect(
      carouselInstanceAria('indicator', '1', { index: 0 }, three)['aria-current'],
    ).toBeUndefined();
  });
});

describe('carousel track geometry', () => {
  it('translates by 100% per index along the orientation axis', () => {
    expect(trackStyle({ index: 0 }, three).transform).toBe('translateX(-0%)');
    expect(trackStyle({ index: 2 }, three).transform).toBe('translateX(-200%)');
    expect(trackStyle({ index: 1 }, { count: 3, orientation: 'vertical' }).transform).toBe(
      'translateY(-100%)',
    );
  });
});

describe('carousel interactions composition', () => {
  const stops: Array<() => void> = [];

  afterEach(() => {
    for (const stop of stops.splice(0)) stop();
    document.body.innerHTML = '';
  });

  function mount(orientation: 'horizontal' | 'vertical' = 'horizontal'): HTMLElement {
    document.body.innerHTML = `
      <div data-part="root" data-orientation="${orientation}">
        <div data-part="track">
          <div data-part="item" data-value="0">A</div>
          <div data-part="item" data-value="1">B</div>
          <div data-part="item" data-value="2">C</div>
        </div>
      </div>`;
    return document.body.querySelector('[data-part="root"]') as HTMLElement;
  }

  it('arrow keys on the axis request the resolved neighbour index', () => {
    const root = mount('horizontal');
    let index = 0;
    const request = vi.fn((target: number) => {
      index = target;
    });
    const stop = composeCarouselInteractions({
      root,
      getState: () => ({ index }),
      getConfig: () => ({ count: 3, orientation: 'horizontal' }),
      request,
    });
    stops.push(stop);

    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(request).toHaveBeenLastCalledWith(1);
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(request).toHaveBeenLastCalledWith(2);
    // Pinned at the end without loop: no further request.
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('ignores the cross-axis arrows and detaches on cleanup', () => {
    const root = mount('horizontal');
    const request = vi.fn();
    const stop = composeCarouselInteractions({
      root,
      getState: () => ({ index: 0 }),
      getConfig: () => ({ count: 3, orientation: 'horizontal' }),
      request,
    });
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(request).not.toHaveBeenCalled();
    stop();
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(request).not.toHaveBeenCalled();
  });
});
