/**
 * WC performance of the carousel score, driven end to end against light-DOM
 * markup. Same score as the React conformance test -- the only difference is the
 * controller applies the projection imperatively.
 */
import { cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { carouselBehavior } from '../../../src/components/carousel/carousel.behavior';
import { RaftersCarousel } from '../../../src/components/carousel/carousel.element';
import {
  assertAxeClean,
  assertContractFulfillment,
  assertInstanceAriaFulfillment,
} from '../../harness/conformance';

beforeAll(() => {
  if (!customElements.get('rafters-carousel')) {
    customElements.define('rafters-carousel', RaftersCarousel);
  }
});

async function mount(loop = false): Promise<HTMLElement> {
  document.body.innerHTML = `
    <rafters-carousel data-loop="${loop}">
      <button type="button" data-part="previous">prev</button>
      <div data-part="content">
        <div data-part="track">
          <div role="group" data-part="item" data-value="0">Slide one</div>
          <div role="group" data-part="item" data-value="1">Slide two</div>
          <div role="group" data-part="item" data-value="2">Slide three</div>
        </div>
      </div>
      <button type="button" data-part="next">next</button>
      <div role="group" data-part="indicators">
        <button type="button" data-part="indicator" data-value="0"></button>
        <button type="button" data-part="indicator" data-value="1"></button>
        <button type="button" data-part="indicator" data-value="2"></button>
      </div>
    </rafters-carousel>`;
  await Promise.resolve(); // let the element's deferred bind run
  return document.body.querySelector('rafters-carousel') as HTMLElement;
}

const item = (index: number) =>
  document.body.querySelector<HTMLElement>(`[data-part="item"][data-value="${index}"]`)!;
const indicator = (index: number) =>
  document.body.querySelector<HTMLElement>(`[data-part="indicator"][data-value="${index}"]`)!;
const previous = () => document.body.querySelector<HTMLButtonElement>('[data-part="previous"]')!;
const next = () => document.body.querySelector<HTMLButtonElement>('[data-part="next"]')!;
const config = (over: Record<string, unknown> = {}) => ({
  orientation: 'horizontal' as const,
  loop: false,
  count: 3,
  label: undefined,
  defaultValue: 0,
  ...over,
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('carousel conformance [wc]', () => {
  it('fulfills the contract after the deferred bind', async () => {
    const root = await mount();
    assertContractFulfillment(carouselBehavior, root, { index: 0 }, config(), [
      'root',
      'content',
      'track',
      'item',
      'previous',
      'next',
      'indicators',
      'indicator',
    ]);
    assertInstanceAriaFulfillment(carouselBehavior, root, { index: 0 }, config());
    await assertAxeClean(document.body);
  });

  it('first slide active, previous disabled, next enabled', async () => {
    await mount();
    expect(item(0).getAttribute('data-state')).toBe('active');
    expect(item(0).getAttribute('aria-label')).toBe('1 of 3');
    expect(previous().disabled).toBe(true);
    expect(next().disabled).toBe(false);
    expect(indicator(0).getAttribute('aria-current')).toBe('true');
  });

  it('next advances and disables at the last slide', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(next());
    expect(item(1).getAttribute('data-state')).toBe('active');
    await user.click(next());
    expect(item(2).getAttribute('data-state')).toBe('active');
    expect(next().disabled).toBe(true);
  });

  it('an indicator jumps directly to its slide', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(indicator(2));
    expect(item(2).getAttribute('data-state')).toBe('active');
    expect(indicator(2).getAttribute('aria-current')).toBe('true');
  });

  it('arrow keys steer along the horizontal axis', async () => {
    const user = userEvent.setup();
    await mount();
    next().focus();
    await user.keyboard('{ArrowRight}');
    expect(item(1).getAttribute('data-state')).toBe('active');
    await user.keyboard('{ArrowLeft}');
    expect(item(0).getAttribute('data-state')).toBe('active');
  });

  it('loop wraps past the ends', async () => {
    const user = userEvent.setup();
    await mount(true);
    expect(previous().disabled).toBe(false);
    await user.click(previous());
    expect(item(2).getAttribute('data-state')).toBe('active');
  });
});
