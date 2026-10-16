import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/drawer/drawer.element';

async function mount(attrs: string): Promise<HTMLElement> {
  document.body.innerHTML = `<main>
    <rafters-drawer ${attrs}>
      <button type="button" data-part="trigger" id="dr-trigger">Open</button>
      <div data-part="overlay" id="dr-overlay"></div>
      <div data-part="content" id="dr-content" tabindex="-1">
        <div aria-hidden="true"></div>
        <h2 data-part="title" id="dr-title">Cart</h2>
        <button type="button">Checkout</button>
        <button type="button" data-part="close" id="dr-close">Close</button>
      </div>
    </rafters-drawer></main>`;
  await Promise.resolve();
  return document.body.querySelector('main') as HTMLElement;
}

const sides = ['top', 'right', 'bottom', 'left'] as const;
const scenes: Array<[string, string]> = [];
for (const side of sides) {
  scenes.push([`closed modal ${side}`, `data-side="${side}"`]);
  scenes.push([`open modal ${side}`, `data-side="${side}" data-default-open="true"`]);
  scenes.push([`closed non-modal ${side}`, `data-side="${side}" data-modal="false"`]);
  scenes.push([
    `open non-modal ${side}`,
    `data-side="${side}" data-modal="false" data-default-open="true"`,
  ]);
}

for (const [name, attrs] of scenes) {
  test(`rafters-drawer ${name}`, async ({ task }) => {
    const host = await mount(attrs);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
