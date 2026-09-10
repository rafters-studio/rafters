import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Accordion from '../../../src/components/accordion/accordion.astro';
import { bindAccordion } from '../../../src/components/accordion/accordion.behavior';

const items = [
  { value: 'a', label: 'Alpha', body: 'Body alpha' },
  { value: 'b', label: 'Beta', body: 'Body beta' },
  { value: 'c', label: 'Gamma', body: 'Body gamma' },
];

async function mount(props: Record<string, unknown>): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Accordion, { props: { id: 'faq', items, ...props } });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  // The page <script> does this per instance; the Container never runs it.
  bindAccordion(document.querySelector('[data-part="root"]') as HTMLElement);
  return document;
}

const scenes: ReadonlyArray<[string, Record<string, unknown>]> = [
  ['collapsed', {}],
  ['one section open', { value: 'b' }],
  ['collapsible single', { value: 'a', collapsible: true }],
  ['multiple with two open', { type: 'multiple', value: ['a', 'c'] }],
  ['heading level 2', { headingLevel: 2 }],
  ['one section disabled', { items: [items[0], { ...items[1], disabled: true }] }],
  ['whole accordion disabled', { disabled: true }],
];

for (const [name, props] of scenes) {
  test(`accordion.astro ${name}`, async ({ task }) => {
    const document = await mount(props);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
