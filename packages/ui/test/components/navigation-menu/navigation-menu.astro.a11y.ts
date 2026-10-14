import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import NavigationMenu from '../../../src/components/navigation-menu/navigation-menu.astro';
import { bindNavigationMenu } from '../../../src/components/navigation-menu/navigation-menu.behavior';

const items = [
  {
    value: 'products',
    label: 'Products',
    links: [
      { href: '/a', label: 'Alpha' },
      { href: '/b', label: 'Beta' },
    ],
  },
  {
    value: 'company',
    label: 'Company',
    links: [{ href: '/c', label: 'Careers' }],
  },
];

interface Scene {
  props?: Record<string, unknown>;
  /** Value of the item to open by clicking its trigger after the bind. */
  open?: string;
  slots?: Record<string, string>;
}

async function mount({ props = {}, open, slots = {} }: Scene): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(NavigationMenu, {
    props: { id: 'nav', items, ...props },
    slots,
  });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  // The page <script> does this per instance; the Container never runs it.
  bindNavigationMenu(document.querySelector('nav[data-part="root"]') as HTMLElement);
  if (open !== undefined) {
    // No prop seeds an open item on the server; a click is how a page opens one.
    const trigger = document.querySelector(
      `[data-part="trigger"][data-value="${open}"]`,
    ) as HTMLElement;
    trigger.click();
  }
  return document;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['closed', {}],
  ['first item open', { open: 'products' }],
  ['second item open', { open: 'company' }],
  ['vertical closed', { props: { orientation: 'vertical' } }],
  ['vertical open', { props: { orientation: 'vertical' }, open: 'products' }],
];

for (const [name, scene] of scenes) {
  test(`navigation-menu.astro ${name}`, async ({ task }) => {
    const document = await mount(scene);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}

test('navigation-menu.astro with start and end icons, svg title does not leak into the name', async ({
  task,
}) => {
  const document = await mount({
    slots: {
      'products:start-icon': '<svg viewBox="0 0 24 24"><title>Box</title></svg>',
      'products:end-icon': '<svg viewBox="0 0 24 24"><title>Arrow</title></svg>',
      'products:0:start-icon': '<svg viewBox="0 0 24 24"><title>Dot</title></svg>',
    },
  });
  const results = await runAxe(document.body);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
  expect(document.querySelectorAll('[data-icon][aria-hidden="true"]').length).toBe(3);
});
