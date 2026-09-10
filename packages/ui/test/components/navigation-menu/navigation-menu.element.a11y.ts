import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/navigation-menu/navigation-menu.element';

interface Scene {
  open?: string;
  orientation?: 'horizontal' | 'vertical';
}

const ITEMS: ReadonlyArray<[string, string, string]> = [
  ['products', 'Products', '<a href="/one">One</a><a href="/two">Two</a>'],
  ['docs', 'Docs', '<a href="/docs">Docs home</a>'],
];

function item(value: string, label: string, links: string, open: boolean): string {
  // bindNavigationMenu reads the initial open item from a trigger carrying
  // data-state="open", so the open scene is markup, not a gesture.
  const state = open ? ' data-state="open"' : '';
  return `
    <li>
      <button type="button" data-part="trigger" data-value="${value}" data-roving-item id="t-${value}"${state}>${label}</button>
      <div data-part="content" data-value="${value}" id="c-${value}">${links}</div>
    </li>`;
}

async function mount({ open, orientation = 'horizontal' }: Scene): Promise<HTMLElement> {
  const items = ITEMS.map(([value, label, links]) =>
    item(value, label, links, open === value),
  ).join('');
  document.body.innerHTML = `
    <main>
      <rafters-navigation-menu data-orientation="${orientation}">
        <ul data-part="list">${items}</ul>
      </rafters-navigation-menu>
    </main>`;
  await Promise.resolve(); // the element binds one microtask after connecting
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['closed', {}],
  ['first item open', { open: 'products' }],
  ['second item open', { open: 'docs' }],
  ['vertical closed', { orientation: 'vertical' }],
  ['vertical open', { orientation: 'vertical', open: 'products' }],
];

for (const [name, scene] of scenes) {
  test(`rafters-navigation-menu ${name}`, async ({ task }) => {
    const host = await mount(scene);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
