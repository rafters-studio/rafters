import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Drawer from '../../../src/components/drawer/drawer.astro';
import { bindDrawer } from '../../../src/components/drawer/drawer.behavior';

async function mount(props: Record<string, unknown>): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Drawer, {
    props: { id: 'dr', title: 'Actions', ...props },
    slots: { default: '<button type="button">Save</button>' },
  });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  // The page <script> does this per instance; the Container never runs it.
  bindDrawer(document.querySelector('[data-part="root"][data-drawer]') as HTMLElement);
  return document;
}

const scenes: ReadonlyArray<[string, Record<string, unknown>]> = [
  ['closed', {}],
  ['closed with description', { description: 'Pick an action.' }],
  ['open from the bottom', { defaultOpen: true, description: 'Pick an action.' }],
  ['open from the right', { defaultOpen: true, side: 'right' }],
  ['open without description', { defaultOpen: true }],
  ['open non-modal', { defaultOpen: true, modal: false }],
];

for (const [name, props] of scenes) {
  test(`drawer.astro ${name}`, async ({ task }) => {
    const document = await mount(props);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
