import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import RadioGroup from '../../../src/components/radio-group/radio-group.astro';
import { bindRadioGroup } from '../../../src/components/radio-group/radio-group.behavior';

const items = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
];

async function mount(props: Record<string, unknown>): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(RadioGroup, {
    props: { id: 'rg', items, ...props },
  });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  // The page <script> does this per instance; the Container never runs it.
  bindRadioGroup(document.querySelector('[data-part="root"][role="radiogroup"]') as HTMLElement);
  return document;
}

// The Astro props carry no aria-label and the root spreads no attributes, so
// the group renders without an accessible name here (axe has no rule for a
// radiogroup name; the gap is the component's, reported with this tier).
const scenes: ReadonlyArray<[string, Record<string, unknown>]> = [
  ['nothing selected', {}],
  ['one selected', { value: 'b' }],
  ['horizontal', { value: 'a', orientation: 'horizontal' }],
  ['required', { required: true }],
  [
    'one item disabled',
    { value: 'a', items: [items[0], { ...items[1], disabled: true }, items[2]] },
  ],
  ['whole group disabled', { value: 'a', disabled: true }],
];

for (const [name, props] of scenes) {
  test(`radio-group.astro ${name}`, async ({ task }) => {
    const document = await mount(props);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
