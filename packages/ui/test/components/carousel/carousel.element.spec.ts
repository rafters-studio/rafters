import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import '../../../src/components/carousel/carousel.element';
import {
  canScrollNext,
  canScrollPrev,
  carouselBehavior,
  carouselInstanceAria,
  trackStyle,
  type CarouselConfig,
  type CarouselState,
} from '../../../src/components/carousel/carousel.behavior';
import { carouselClasses } from '../../../src/components/carousel/carousel.classes';

type Attrs = Record<string, string | boolean | undefined>;
const attrs = (a: Attrs) =>
  Object.entries(a)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}="${String(v)}"`)
    .join(' ');

const SLIDES = ['One', 'Two', 'Three'];

// The markup carousel.astro:83-145 renders for this config (indicators on), plus an
// optional data-active-index seed on the root (carousel.behavior.ts:307).
function astroMarkup(config: CarouselConfig, seed?: number): string {
  const full = { ...config, count: SLIDES.length };
  const state = carouselBehavior.initialState(full);
  const classes = carouselClasses(full);
  const aria = carouselBehavior.aria(state, full, {} as never);
  const seedAttr = seed === undefined ? '' : ` data-active-index="${seed}"`;
  const items = SLIDES.map(
    (body, i) =>
      `<div role="group" data-part="item" data-value="${i}" class="${classes.item}" ${attrs(carouselInstanceAria('item', String(i), state, full))}>${body}</div>`,
  ).join('');
  const dots = SLIDES.map(
    (_, i) =>
      `<button type="button" data-part="indicator" data-value="${i}" class="${classes.indicator}" ${attrs(carouselInstanceAria('indicator', String(i), state, full))}></button>`,
  ).join('');
  return `<div data-part="root" data-carousel id="c-root" role="region" data-orientation="${full.orientation ?? 'horizontal'}"
      data-loop="${String(Boolean(full.loop))}" class="${classes.root}" ${attrs(aria.root ?? {})}${seedAttr}>
    <button type="button" data-part="previous" class="${classes.previous}" ${canScrollPrev(state, full) ? '' : 'disabled'} ${attrs(aria.previous ?? {})}></button>
    <div data-part="content" class="${classes.content}" ${attrs(aria.content ?? {})}>
      <div data-part="track" class="${classes.track}" style="transform: ${trackStyle(state, full).transform}">${items}</div>
    </div>
    <button type="button" data-part="next" class="${classes.next}" ${canScrollNext(state, full) ? '' : 'disabled'} ${attrs(aria.next ?? {})}></button>
    <div data-part="indicators" role="group" class="${classes.indicators}" ${attrs(aria.indicators ?? {})}>${dots}</div>
  </div>`;
}

async function mount(config: CarouselConfig, seed?: number): Promise<HTMLElement> {
  document.body.innerHTML = `<rafters-carousel>${astroMarkup(config, seed)}</rafters-carousel>`;
  await Promise.resolve(); // 05-authoring.md:210-211
  const el = document.querySelector('rafters-carousel');
  if (!(el instanceof HTMLElement)) throw new Error('rafters-carousel did not mount');
  return el;
}

function q(el: HTMLElement, selector: string): HTMLElement {
  const found = el.querySelector(selector);
  if (!(found instanceof HTMLElement)) throw new Error(`missing ${selector}`);
  return found;
}

function expectAttrs(node: HTMLElement, a: Attrs): void {
  for (const [name, value] of Object.entries(a)) {
    expect(node.getAttribute(name)).toBe(value === undefined ? null : String(value));
  }
}

function expectIndex(el: HTMLElement, config: CarouselConfig, index: number): void {
  const full = { ...config, count: SLIDES.length };
  const state: CarouselState = { index };
  const classes = carouselClasses(full);
  // Round-trip through a style declaration so the browser's own serialisation of
  // "-0%" is compared like for like.
  const probe = document.createElement('div');
  probe.style.transform = trackStyle(state, full).transform;
  expect(q(el, '[data-part="track"]').style.transform).toBe(probe.style.transform);
  expect(q(el, '[data-part="track"]').className).toBe(classes.track);
  for (const [i, item] of [...el.querySelectorAll<HTMLElement>('[data-part="item"]')].entries()) {
    expectAttrs(item, carouselInstanceAria('item', String(i), state, full));
  }
  for (const [i, dot] of [
    ...el.querySelectorAll<HTMLElement>('[data-part="indicator"]'),
  ].entries()) {
    expectAttrs(dot, carouselInstanceAria('indicator', String(i), state, full));
  }
  expect((q(el, '[data-part="previous"]') as HTMLButtonElement).disabled).toBe(
    !canScrollPrev(state, full),
  );
  expect((q(el, '[data-part="next"]') as HTMLButtonElement).disabled).toBe(
    !canScrollNext(state, full),
  );
  expectAttrs(
    q(el, '[data-part="previous"]'),
    carouselBehavior.aria(state, full, {} as never).previous ?? {},
  );
}

afterEach(() => {
  document.body.innerHTML = '';
});

it('binds the astro markup at index 0', async () => {
  const el = await mount({ orientation: 'horizontal' });
  expectIndex(el, { orientation: 'horizontal' }, 0);
  expect(el.shadowRoot).toBeNull();
  expect(q(el, '[data-part="root"]').hasAttribute('tabindex')).toBe(false);
});

it('next and an indicator move the index', async () => {
  const el = await mount({ orientation: 'horizontal' });
  await userEvent.click(q(el, '[data-part="next"]'));
  expectIndex(el, { orientation: 'horizontal' }, 1);
  await userEvent.click(q(el, '[data-part="indicator"][data-value="2"]'));
  expectIndex(el, { orientation: 'horizontal' }, 2);
  expect((q(el, '[data-part="next"]') as HTMLButtonElement).disabled).toBe(true);
});

it('data-active-index seeds the index', async () => {
  const el = await mount({ orientation: 'horizontal' }, 1);
  expectIndex(el, { orientation: 'horizontal' }, 1);
});

it('aria-label names the region', async () => {
  document.body.innerHTML = `<rafters-carousel>${astroMarkup({ orientation: 'horizontal' }).replace('data-part="root"', 'data-part="root" aria-label="Featured"')}</rafters-carousel>`;
  await Promise.resolve();
  const el = document.querySelector('rafters-carousel') as HTMLElement;
  expect(q(el, '[data-part="root"]').getAttribute('aria-label')).toBe('Featured');
});

it('loop wraps from the first slide to the last', async () => {
  const config: CarouselConfig = { orientation: 'horizontal', loop: true };
  const el = await mount(config);
  expect((q(el, '[data-part="previous"]') as HTMLButtonElement).disabled).toBe(false);
  await userEvent.click(q(el, '[data-part="previous"]'));
  expectIndex(el, config, 2);
});

it('horizontal arrows steer along the axis only', async () => {
  const config: CarouselConfig = { orientation: 'horizontal' };
  const el = await mount(config);
  q(el, '[data-part="next"]').focus();
  await userEvent.keyboard('{ArrowRight}');
  expectIndex(el, config, 1);
  await userEvent.keyboard('{ArrowDown}');
  expectIndex(el, config, 1);
  await userEvent.keyboard('{ArrowLeft}');
  expectIndex(el, config, 0);
});

it('vertical arrows steer along the axis only', async () => {
  const config: CarouselConfig = { orientation: 'vertical' };
  const el = await mount(config);
  q(el, '[data-part="indicator"][data-value="0"]').focus();
  await userEvent.keyboard('{ArrowDown}');
  expectIndex(el, config, 1);
  await userEvent.keyboard('{ArrowRight}');
  expectIndex(el, config, 1);
  await userEvent.keyboard('{ArrowUp}');
  expectIndex(el, config, 0);
});

it('removal tears the binding down', async () => {
  const el = await mount({ orientation: 'horizontal' });
  const next = q(el, '[data-part="next"]');
  el.remove();
  await userEvent.click(next);
  for (const [i, item] of [...el.querySelectorAll<HTMLElement>('[data-part="item"]')].entries()) {
    expect(item.getAttribute('data-state')).toBe(i === 0 ? 'active' : 'inactive');
  }
});

it('binds nothing and throws nothing without a root part', async () => {
  document.body.innerHTML = '<rafters-carousel></rafters-carousel>';
  await Promise.resolve();
  expect(document.querySelector('rafters-carousel')).not.toBeNull();
});
