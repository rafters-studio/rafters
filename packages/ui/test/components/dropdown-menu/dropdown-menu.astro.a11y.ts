import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import DropdownMenu from '../../../src/components/dropdown-menu/dropdown-menu.astro';
import { bindDropdownMenu } from '../../../src/components/dropdown-menu/dropdown-menu.behavior';

const items = [
  { label: 'Edit' },
  { label: 'Duplicate' },
  { label: 'Archive', disabled: true },
  { label: 'Delete' },
];

interface Scene {
  items?: typeof items;
  open?: boolean;
}

async function mount({ items: menuItems = items, open = false }: Scene): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(DropdownMenu, {
    props: { id: 'dm', label: 'Options', items: menuItems },
  });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  // The page <script> does this per instance; the Container never runs it.
  bindDropdownMenu(document.querySelector('rafters-dropdown-menu') as HTMLElement);
  if (open) (document.querySelector('[data-part="trigger"]') as HTMLElement).click();
  return document;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['closed', {}],
  ['open', { open: true }],
  ['open with every item enabled', { open: true, items: items.map(({ label }) => ({ label })) }],
];

for (const [name, scene] of scenes) {
  test(`dropdown-menu.astro ${name}`, async ({ task }) => {
    const document = await mount(scene);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
