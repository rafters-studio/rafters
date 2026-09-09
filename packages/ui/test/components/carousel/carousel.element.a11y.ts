import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/carousel/carousel.element';

interface Scene {
  orientation?: 'horizontal' | 'vertical';
  loop?: boolean;
  activeIndex?: number;
  label?: string;
  indicators?: boolean;
}

async function mount({
  orientation = 'horizontal',
  loop = false,
  activeIndex = 0,
  label,
  indicators = true,
}: Scene): Promise<HTMLElement> {
  const rootAttrs = [
    `data-orientation="${orientation}"`,
    `data-loop="${loop}"`,
    `data-active-index="${activeIndex}"`,
    label ? `aria-label="${label}"` : '',
  ].join(' ');
  const picker = indicators
    ? `<div role="group" data-part="indicators">
        <button type="button" data-part="indicator" data-value="0"></button>
        <button type="button" data-part="indicator" data-value="1"></button>
        <button type="button" data-part="indicator" data-value="2"></button>
      </div>`
    : '';
  document.body.innerHTML = `
    <main>
      <rafters-carousel ${rootAttrs}>
        <button type="button" data-part="previous">prev</button>
        <div data-part="content">
          <div data-part="track">
            <div role="group" data-part="item" data-value="0">Slide one</div>
            <div role="group" data-part="item" data-value="1">Slide two</div>
            <div role="group" data-part="item" data-value="2">Slide three</div>
          </div>
        </div>
        <button type="button" data-part="next">next</button>
        ${picker}
      </rafters-carousel>
    </main>`;
  await Promise.resolve(); // the element binds one microtask after connecting
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['first slide, horizontal', {}],
  ['vertical', { orientation: 'vertical' }],
  ['loop', { loop: true }],
  ['middle slide', { activeIndex: 1 }],
  ['last slide', { activeIndex: 2 }],
  ['custom label', { label: 'Product gallery' }],
  ['without indicators', { indicators: false }],
];

for (const [name, scene] of scenes) {
  test(`rafters-carousel ${name}`, async ({ task }) => {
    const host = await mount(scene);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
