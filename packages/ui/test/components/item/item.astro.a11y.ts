import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Item from '../../../src/components/item/item.astro';

interface Scene {
  props?: Record<string, unknown>;
  slots: Record<string, string>;
}

/** An option needs a listbox ancestor (axe aria-required-parent), and page
 *  content needs a landmark; wrap the SSR markup in both. */
async function mount({ props = {}, slots }: Scene): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Item, { props, slots });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main><div role="listbox" aria-label="Options">${html}</div></main>`;
  // Item is a static projection: no bindItem exists, so nothing to hydrate.
  return document;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['default', { slots: { default: 'Settings' } }],
  ['selected', { props: { selected: true }, slots: { default: 'Dashboard' } }],
  ['disabled', { props: { disabled: true }, slots: { default: 'Admin Panel' } }],
  [
    'with icon and description',
    {
      props: { description: 'Manage your account' },
      slots: { default: 'Profile', icon: '<span>*</span>' },
    },
  ],
  ['size sm', { props: { size: 'sm' }, slots: { default: 'Compact' } }],
  ['size lg', { props: { size: 'lg' }, slots: { default: 'Roomy' } }],
];

for (const [name, scene] of scenes) {
  test(`item.astro ${name}`, async ({ task }) => {
    const document = await mount(scene);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
