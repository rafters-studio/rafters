import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import ToggleGroup from '../../../src/components/toggle-group/toggle-group.astro';
import { bindToggleGroup } from '../../../src/components/toggle-group/toggle-group.behavior';

const items = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
];

async function mount(
  props: Record<string, unknown>,
  slots: Record<string, string> = {},
): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(ToggleGroup, {
    props: { id: 'tg', items, ...props },
    slots,
  });
  const window = new Window();
  const document = window.document as unknown as Document;
  // A group is not a landmark; the page around it supplies the region.
  document.body.innerHTML = `<main>${html}</main>`;
  // The page <script> does this per instance; the Container never runs it.
  bindToggleGroup(document.querySelector('[data-part="root"][role="group"]') as HTMLElement);
  return document;
}

const scenes: ReadonlyArray<[string, Record<string, unknown>]> = [
  ['single nothing selected', {}],
  ['single one selected', { value: 'b' }],
  ['multiple two selected', { type: 'multiple', value: ['a', 'c'] }],
  ['vertical orientation', { value: 'b', orientation: 'vertical' }],
  ['one item disabled', { items: [items[0], { ...items[1], disabled: true }, items[2]] }],
  ['whole group disabled', { disabled: true }],
  ['outline lg', { variant: 'outline', size: 'lg', value: 'a' }],
];

for (const [name, props] of scenes) {
  test(`toggle-group.astro ${name}`, async ({ task }) => {
    const document = await mount(props);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}

test('toggle-group.astro with start and end icon slots, svg title does not leak into the name', async ({
  task,
}) => {
  const document = await mount(
    {},
    {
      'start-icon-a': '<svg viewBox="0 0 24 24"><title>Mail</title></svg>',
      'end-icon-a': '<svg viewBox="0 0 24 24"><title>Arrow</title></svg>',
    },
  );
  const results = await runAxe(document.body);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
  expect(document.querySelectorAll('[data-icon][aria-hidden="true"]').length).toBe(2);
});
