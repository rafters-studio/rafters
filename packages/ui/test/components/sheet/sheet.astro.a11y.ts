import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Sheet from '../../../src/components/sheet/sheet.astro';
import { bindSheet } from '../../../src/components/sheet/sheet.behavior';

async function mount(props: Record<string, unknown>): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Sheet, {
    props: { id: 's', title: 'Filters', ...props },
    slots: { trigger: 'Open filters', default: '<button type="button">Apply</button>' },
  });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  // The page <script> does this per instance; the Container never runs it.
  bindSheet(document.querySelector('rafters-sheet') as HTMLElement);
  return document;
}

const scenes: ReadonlyArray<[string, Record<string, unknown>]> = [
  ['closed', {}],
  ['open', { defaultOpen: true }],
  ['open with description', { defaultOpen: true, description: 'Refine the results.' }],
  ['open on the left', { defaultOpen: true, side: 'left' }],
  ['open on the top', { defaultOpen: true, side: 'top' }],
  ['open on the bottom', { defaultOpen: true, side: 'bottom' }],
  ['non-modal open', { defaultOpen: true, modal: false }],
];

for (const [name, props] of scenes) {
  test(`sheet.astro ${name}`, async ({ task }) => {
    const document = await mount(props);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
