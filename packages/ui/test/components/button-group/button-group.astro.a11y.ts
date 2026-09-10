import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import ButtonGroup from '../../../src/components/button-group/button-group.astro';

const TWO_BUTTONS = '<button type="button">Cancel</button><button type="button">Save</button>';
const THREE_BUTTONS =
  '<button type="button">Grid</button><button type="button">List</button><button type="button">Table</button>';
const TOGGLES =
  '<button type="button" aria-pressed="true">Grid</button><button type="button" aria-pressed="false">List</button>';

async function mount(props: Record<string, unknown>, slot: string): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(ButtonGroup, { props, slots: { default: slot } });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  // ButtonGroup is a pure static: no bindButtonGroup exists, so nothing to hydrate.
  return document;
}

const scenes: ReadonlyArray<[string, Record<string, unknown>, string]> = [
  ['horizontal', { 'aria-label': 'Document actions' }, TWO_BUTTONS],
  ['vertical', { orientation: 'vertical', 'aria-label': 'View' }, THREE_BUTTONS],
  ['with forwarded id', { id: 'group-1', 'aria-label': 'Actions' }, TWO_BUTTONS],
  ['toggle set', { 'aria-label': 'View options' }, TOGGLES],
];

for (const [name, props, slot] of scenes) {
  test(`button-group.astro ${name}`, async ({ task }) => {
    const document = await mount(props, slot);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
