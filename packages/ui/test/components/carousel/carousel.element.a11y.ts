import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/carousel/carousel.element';
import {
  canScrollNext,
  canScrollPrev,
  carouselBehavior,
  carouselInstanceAria,
  trackStyle,
  type CarouselConfig,
} from '../../../src/components/carousel/carousel.behavior';
import { carouselClasses } from '../../../src/components/carousel/carousel.classes';

type Attrs = Record<string, string | boolean | undefined>;
const attrs = (a: Attrs) =>
  Object.entries(a)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}="${String(v)}"`)
    .join(' ');

const SLIDES = ['One', 'Two', 'Three'];

function markup(config: CarouselConfig, seed?: number): string {
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
  document.body.innerHTML = `<main><rafters-carousel>${markup(config, seed)}</rafters-carousel></main>`;
  await Promise.resolve();
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, CarouselConfig, number | undefined]> = [
  ['first slide', { orientation: 'horizontal' }, undefined],
  ['middle slide', { orientation: 'horizontal' }, 1],
  ['vertical', { orientation: 'vertical' }, undefined],
];

for (const [name, config, seed] of scenes) {
  test(`rafters-carousel ${name}`, async ({ task }) => {
    const host = await mount(config, seed);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
