/**
 * Astro performance of the carousel score, driven end to end. AstroContainer
 * renders the SSR markup with the initial projection already applied, but does
 * NOT run the <script>, so the test calls bindCarousel directly -- that IS the
 * script's job -- then drives the same score the React and WC performances
 * drive. One score, three performances.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import Carousel from '../../../src/components/carousel/carousel.astro';
import { bindCarousel, carouselBehavior } from '../../../src/components/carousel/carousel.behavior';
import {
  assertContractFulfillment,
  assertInstanceAriaFulfillment,
} from '../../harness/conformance';

const slides = ['Slide one', 'Slide two', 'Slide three'];
const config = (over: Record<string, unknown> = {}) => ({
  orientation: 'horizontal' as const,
  loop: false,
  count: 3,
  label: undefined,
  ...over,
});

afterEach(() => {
  document.body.innerHTML = '';
});

async function mount(loop = false): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Carousel, {
    props: { id: 'gallery', slides, indicators: true, loop },
  });
  document.body.innerHTML = html;
  const root = document.body.querySelector('div[data-part="root"][data-carousel]') as HTMLElement;
  bindCarousel(root); // the <script> does this per instance on the real page
  return root;
}

const item = (index: number) =>
  document.body.querySelector<HTMLElement>(`[data-part="item"][data-value="${index}"]`)!;
const indicator = (index: number) =>
  document.body.querySelector<HTMLElement>(`[data-part="indicator"][data-value="${index}"]`)!;
const previous = () => document.body.querySelector<HTMLButtonElement>('[data-part="previous"]')!;
const next = () => document.body.querySelector<HTMLButtonElement>('[data-part="next"]')!;

describe('carousel conformance [astro]', () => {
  it('SSR fulfills the contract: parts present, ARIA equals the projection', async () => {
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
  });

  it('SSR renders the slide bodies and marks the first slide active', async () => {
    await mount();
    expect(item(0).textContent).toContain('Slide one');
    expect(item(0).getAttribute('data-state')).toBe('active');
    expect(item(0).getAttribute('aria-label')).toBe('1 of 3');
    expect(previous().disabled).toBe(true);
    expect(next().disabled).toBe(false);
  });

  it('next advances the active slide after bind', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(next());
    expect(item(1).getAttribute('data-state')).toBe('active');
    expect(previous().disabled).toBe(false);
  });

  it('an indicator jumps directly to its slide', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(indicator(2));
    expect(item(2).getAttribute('data-state')).toBe('active');
    expect(indicator(2).getAttribute('aria-current')).toBe('true');
  });

  it('loop wraps past the start', async () => {
    const user = userEvent.setup();
    await mount(true);
    await user.click(previous());
    expect(item(2).getAttribute('data-state')).toBe('active');
  });
});
