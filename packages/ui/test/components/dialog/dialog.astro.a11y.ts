import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Dialog from '../../../src/components/dialog/dialog.astro';
import { bindDialog } from '../../../src/components/dialog/dialog.behavior';

async function mount(
  props: Record<string, unknown>,
  slots: Record<string, string> = {},
): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Dialog, {
    props: { id: 'd', ...props },
    slots: { title: 'Settings', default: '<button type="button">Save</button>', ...slots },
  });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  bindDialog(document.querySelector('rafters-dialog') as HTMLElement);
  return document;
}

const scenes: ReadonlyArray<[string, Record<string, unknown>, Record<string, string>?]> = [
  ['closed', {}],
  ['closed with description', {}, { description: 'Adjust your preferences.' }],
  ['open', { defaultOpen: true }, { description: 'Adjust your preferences.' }],
  ['open without description', { defaultOpen: true }],
  ['open non-modal', { defaultOpen: true, modal: false }],
];

for (const [name, props, slots] of scenes) {
  test(`dialog.astro ${name}`, async ({ task }) => {
    const document = await mount(props, slots);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
